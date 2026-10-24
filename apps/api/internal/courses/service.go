package courses

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/google/uuid"

	"nutrition-api/internal/documents"
	"nutrition-api/internal/logger"
)

type Service struct {
	repo  Repository
	store Store
	now   func() time.Time
	// minFree is the room the disk must keep before a page is written (MinFreeBytes unless COURSES_MIN_FREE_BYTES says otherwise)
	minFree uint64
	// newCode is documents.NewCode (the coach join code's format); a test swaps it
	newCode func() (string, error)
}

func NewService(repo Repository, store Store) *Service {
	return &Service{repo: repo, store: store, now: time.Now, minFree: MinFreeBytes, newCode: documents.NewCode}
}

// SetMinFree changes how much room the disk must keep before a page is written.
func (s *Service) SetMinFree(n uint64) { s.minFree = n }

// access is the one check behind every read: the course's lock for this viewer. A course that is not there is ErrNotFound.
func (s *Service) access(ctx context.Context, uid, courseID uuid.UUID) (Viewer, *Course, error) {
	v, err := s.repo.Viewer(ctx, uid)
	if err != nil {
		return v, nil, err
	}
	c, err := s.repo.Course(ctx, courseID)
	if err != nil {
		return v, nil, err
	}
	unlocked := false
	if c.Access == AccessCode && !v.IsStaff() {
		if unlocked, err = s.repo.CodeUnlocked(ctx, uid, courseID); err != nil {
			return v, nil, err
		}
	}
	if lock := Decide(v, *c, unlocked); lock != LockNone {
		return v, c, lockedError(*c, lock)
	}
	return v, c, nil
}

// ---- learner ----

// List is the library: every course with its lock and the viewer's progress. It never needs access.
func (s *Service) List(ctx context.Context, uid uuid.UUID) ([]Summary, error) {
	v, err := s.repo.Viewer(ctx, uid)
	if err != nil {
		return nil, err
	}
	list, err := s.repo.Summaries(ctx, uid)
	if err != nil {
		return nil, err
	}
	for i := range list {
		list[i].Lock = Decide(v, list[i].Course, list[i].Unlocked)
		list[i].Unlocked = list[i].Lock == LockNone
	}
	return list, nil
}

// Detail is one course with its parts and lessons, when the viewer may open it.
func (s *Service) Detail(ctx context.Context, uid, courseID uuid.UUID) (*Detail, error) {
	v, c, err := s.access(ctx, uid, courseID)
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, v, c)
}

func (s *Service) detail(ctx context.Context, v Viewer, c *Course) (*Detail, error) {
	parts, err := s.repo.Parts(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	lessons, err := s.repo.Lessons(ctx, c.ID, v.ID, v.IsStaff())
	if err != nil {
		return nil, err
	}
	d := &Detail{Course: *c, Parts: parts}
	byPart := map[uuid.UUID]int{}
	for i, p := range parts {
		byPart[p.ID] = i
	}
	for _, l := range lessons {
		if i, ok := byPart[l.PartID]; ok {
			d.Parts[i].Lessons = append(d.Parts[i].Lessons, l)
		}
		if l.Ready {
			d.LessonCount++
			if l.Done {
				d.DoneCount++
			}
		}
	}
	d.Resume = ResumeOf(d.Parts)
	return d, nil
}

// ResumeOf: the first lesson, in reading order, that is ready and not finished, at the page the viewer stopped on (never past its last).
func ResumeOf(parts []Part) *Resume {
	for _, p := range parts {
		for _, l := range p.Lessons {
			if !l.Ready || l.Done {
				continue
			}
			page := l.LastPage
			if page < 1 {
				page = 1
			}
			if l.PageCount > 0 && page > l.PageCount {
				page = l.PageCount
			}
			return &Resume{LessonID: l.ID, Page: page}
		}
	}
	return nil
}

// Open unlocks a code course for the viewer with a live code of that course and returns the course. A wrong, lapsed, revoked or
// other course's code is ErrBadCode (one answer for all of them).
func (s *Service) Open(ctx context.Context, uid, courseID uuid.UUID, code string) (*Detail, error) {
	c, err := s.repo.Course(ctx, courseID)
	if err != nil {
		return nil, err
	}
	if c.Access != AccessCode {
		// Nothing to unlock: an open or level course opens as it is (or says why not)
		return s.Detail(ctx, uid, courseID)
	}
	if len(documents.NormalizeCode(code)) != documents.CodeLength {
		return nil, ErrBadCode
	}
	if err := s.repo.UseCode(ctx, uid, courseID, documents.HashCode(code)); err != nil {
		return nil, err
	}
	return s.Detail(ctx, uid, courseID)
}

func (s *Service) Lesson(ctx context.Context, uid, courseID, lessonID uuid.UUID) (*LessonDetail, error) {
	v, _, err := s.access(ctx, uid, courseID)
	if err != nil {
		return nil, err
	}
	return s.repo.Lesson(ctx, courseID, lessonID, uid, v.IsStaff())
}

// Page opens one page image of a PDF lesson after the same access check as the lesson. The caller closes the file.
func (s *Service) Page(ctx context.Context, uid, courseID, lessonID uuid.UUID, page int) (io.ReadSeekCloser, int64, error) {
	v, _, err := s.access(ctx, uid, courseID)
	if err != nil {
		return nil, 0, err
	}
	if page < 1 || page > MaxPages {
		return nil, 0, ErrNotFound
	}
	if _, err := s.repo.PageBytes(ctx, courseID, lessonID, page, v.IsStaff()); err != nil {
		return nil, 0, err
	}
	f, size, err := s.store.Open(courseID, lessonID, page)
	if errors.Is(err, os.ErrNotExist) {
		return nil, 0, ErrNotFound
	}
	return f, size, err
}

// Progress is the viewer's own: where they stopped and whether they finished (nil leaves it as it was). The same call again changes nothing.
func (s *Service) Progress(ctx context.Context, uid, courseID, lessonID uuid.UUID, in ProgressInput) error {
	if _, _, err := s.access(ctx, uid, courseID); err != nil {
		return err
	}
	if in.LastPage < 0 || in.LastPage > MaxPages {
		return &FieldError{Field: "lastPage", Msg: "1 to 60"}
	}
	return s.repo.PutProgress(ctx, uid, courseID, lessonID, in.LastPage, in.Completed)
}

// ---- coach and admin (the routes are behind RequireRole) ----

func (s *Service) CreateCourse(ctx context.Context, by uuid.UUID, in CourseInput) (*Course, error) {
	title, err := ValidTitle("title", in.Title)
	if err != nil {
		return nil, err
	}
	subtitle := ""
	if in.Subtitle != nil {
		if len([]rune(*in.Subtitle)) > MaxSubtitleLen {
			return nil, &FieldError{Field: "subtitle", Msg: "at most 200 characters"}
		}
		subtitle = *in.Subtitle
	}
	tone := 0
	if in.Tone != nil {
		tone = *in.Tone
	}
	if err := checkTone(tone); err != nil {
		return nil, err
	}
	access := in.Access
	if access == "" {
		access = AccessCode
	}
	level, err := CheckAccess(access, in.MinLevel)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateCourse(ctx, by, title, subtitle, tone, access, level)
}

func (s *Service) UpdateCourse(ctx context.Context, id uuid.UUID, p CoursePatch) (*Course, error) {
	c, err := s.repo.Course(ctx, id)
	if err != nil {
		return nil, err
	}
	title, subtitle, tone, access, level := c.Title, c.Subtitle, c.Tone, c.Access, c.MinLevel
	if p.Title != nil {
		if title, err = ValidTitle("title", *p.Title); err != nil {
			return nil, err
		}
	}
	if p.Subtitle != nil {
		if len([]rune(*p.Subtitle)) > MaxSubtitleLen {
			return nil, &FieldError{Field: "subtitle", Msg: "at most 200 characters"}
		}
		subtitle = *p.Subtitle
	}
	if p.Tone != nil {
		tone = *p.Tone
		if err := checkTone(tone); err != nil {
			return nil, err
		}
	}
	if p.Access != nil || p.MinLevel != nil {
		if p.Access != nil {
			access = *p.Access
		}
		if p.MinLevel != nil {
			level = p.MinLevel
		}
		if level, err = CheckAccess(access, level); err != nil {
			return nil, err
		}
	}
	return s.repo.UpdateCourse(ctx, id, title, subtitle, tone, access, level)
}

func (s *Service) DeleteCourse(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteCourse(ctx, id); err != nil {
		return err
	}
	return s.store.RemoveCourse(id)
}

// CoachDetail is a course as its coach sees it: every lesson, ready or not, whatever the access.
func (s *Service) CoachDetail(ctx context.Context, uid, courseID uuid.UUID) (*Detail, error) {
	return s.Detail(ctx, uid, courseID)
}

func (s *Service) CreatePart(ctx context.Context, course uuid.UUID, in TitleInput) (*Part, error) {
	title, err := ValidTitle("title", in.Title)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.Course(ctx, course); err != nil {
		return nil, err
	}
	return s.repo.CreatePart(ctx, course, title)
}

func (s *Service) RenamePart(ctx context.Context, course, part uuid.UUID, in TitleInput) (*Part, error) {
	title, err := ValidTitle("title", in.Title)
	if err != nil {
		return nil, err
	}
	return s.repo.RenamePart(ctx, course, part, title)
}

func (s *Service) DeletePart(ctx context.Context, course, part uuid.UUID) error {
	lessons, err := s.repo.DeletePart(ctx, course, part)
	if err != nil {
		return err
	}
	for _, l := range lessons {
		if err := s.store.RemoveLesson(course, l); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) ReorderParts(ctx context.Context, course uuid.UUID, in ReorderInput) error {
	if _, err := s.repo.Course(ctx, course); err != nil {
		return err
	}
	return s.repo.ReorderParts(ctx, course, in.IDs)
}

func (s *Service) CreateLesson(ctx context.Context, course uuid.UUID, in LessonInput) (*Lesson, error) {
	title, err := ValidTitle("title", in.Title)
	if err != nil {
		return nil, err
	}
	in.Title = title
	minutes := 0
	switch in.Kind {
	case "text":
		if len(in.Content) > MaxTextBytes {
			return nil, ErrTooLarge
		}
		in.PageCount = 0
		minutes = ReadMinutes(in.Content)
	case "pdf":
		if in.PageCount < 1 || in.PageCount > MaxPages {
			return nil, &FieldError{Field: "pageCount", Msg: "1 to 60 pages"}
		}
		in.Content = ""
	default:
		return nil, &FieldError{Field: "kind", Msg: "pdf or text"}
	}
	if in.PartID == uuid.Nil {
		return nil, &FieldError{Field: "partId", Msg: "a part of this course"}
	}
	if _, err := s.repo.Course(ctx, course); err != nil {
		return nil, err
	}
	if in.Kind == "pdf" {
		s.sweepUnready(ctx, course)
	}
	return s.repo.CreateLesson(ctx, course, in, minutes)
}

// sweepUnready deletes the course's PDF lessons that were never finished and are older than a day (a coach's tab died halfway: the web
// only cleans up while it is still open), with their page folders. It runs when a new PDF lesson is made, so a course that is being
// worked on cleans itself. A failure is logged, never the coach's problem: the lesson being made goes ahead, and the next one tries again.
func (s *Service) sweepUnready(ctx context.Context, course uuid.UUID) {
	ids, err := s.repo.UnreadyBefore(ctx, course, s.now().Add(-StaleUnready))
	if err != nil {
		logger.Log.Warn().Err(err).Msg("courses: could not list unfinished lessons")
		return
	}
	for _, id := range ids {
		// The row first: a folder is only removed when nothing points at it any more
		if err := s.repo.DeleteLesson(ctx, course, id); err != nil && !errors.Is(err, ErrNotFound) {
			logger.Log.Warn().Err(err).Str("lesson", id.String()).Msg("courses: could not delete an unfinished lesson")
			continue
		}
		if err := s.store.RemoveLesson(course, id); err != nil {
			logger.Log.Warn().Err(err).Str("lesson", id.String()).Msg("courses: could not remove an unfinished lesson's pages")
		}
	}
}

func (s *Service) UpdateLesson(ctx context.Context, course, lesson uuid.UUID, p LessonPatch) (*Lesson, error) {
	if p.Title != nil {
		t, err := ValidTitle("title", *p.Title)
		if err != nil {
			return nil, err
		}
		p.Title = &t
	}
	var minutes *int
	if p.Content != nil {
		if len(*p.Content) > MaxTextBytes {
			return nil, ErrTooLarge
		}
		m := ReadMinutes(*p.Content)
		minutes = &m
	}
	return s.repo.UpdateLesson(ctx, course, lesson, p, minutes)
}

func (s *Service) DeleteLesson(ctx context.Context, course, lesson uuid.UUID) error {
	if err := s.repo.DeleteLesson(ctx, course, lesson); err != nil {
		return err
	}
	return s.store.RemoveLesson(course, lesson)
}

func (s *Service) ReorderLessons(ctx context.Context, course uuid.UUID, in ReorderInput) error {
	if in.PartID == nil {
		return &FieldError{Field: "partId", Msg: "the part whose lessons these are"}
	}
	return s.repo.ReorderLessons(ctx, course, *in.PartID, in.IDs)
}

// UploadPage stores one page image of a PDF lesson (the browser made it from the PDF; the PDF itself is never sent).
func (s *Service) UploadPage(ctx context.Context, course, lesson uuid.UUID, page int, in PageInput) error {
	if page < 1 || page > MaxPages {
		return ErrPageNumber
	}
	data, err := base64.StdEncoding.DecodeString(in.Data)
	if err != nil || len(data) == 0 {
		return &FieldError{Field: "data", Msg: "the page image as base64"}
	}
	if len(data) > MaxPageBytes {
		return ErrTooLarge
	}
	if !IsWebP(data) {
		return &FieldError{Field: "data", Msg: "a WebP image"}
	}
	// Room first: below minFree nothing is written, neither the row nor the file (a lesson is up to 60 MB and the VPS disk is near its limit)
	free, err := s.store.FreeBytes()
	if err != nil {
		return fmt.Errorf("check free space: %w", err)
	}
	if free < s.minFree {
		return ErrStorageFull
	}
	// The row first: it checks that the lesson is this course's PDF and the page is one of its pages, before anything is written
	if err := s.repo.AddPage(ctx, course, lesson, page, len(data)); err != nil {
		return err
	}
	return s.store.Put(course, lesson, page, data)
}

// FinishLesson makes a PDF lesson visible to learners once every one of its pages is there (a row and a file).
func (s *Service) FinishLesson(ctx context.Context, course, lesson uuid.UUID) (*Lesson, error) {
	d, err := s.repo.Lesson(ctx, course, lesson, uuid.Nil, true)
	if err != nil {
		return nil, err
	}
	if d.Kind != "pdf" {
		return nil, ErrNotReady
	}
	for p := 1; p <= d.PageCount; p++ {
		f, _, err := s.store.Open(course, lesson, p)
		if err != nil {
			return nil, ErrNotReady
		}
		f.Close()
	}
	return s.repo.FinishLesson(ctx, course, lesson)
}

func (s *Service) CreateCode(ctx context.Context, course, by uuid.UUID) (*NewCode, error) {
	c, err := s.repo.Course(ctx, course)
	if err != nil {
		return nil, err
	}
	if c.Access != AccessCode {
		return nil, &FieldError{Field: "access", Msg: "codes are for courses that open with a code"}
	}
	value, err := s.newCode()
	if err != nil {
		return nil, err
	}
	code, err := s.repo.InsertCode(ctx, course, documents.HashCode(value), by, s.now().Add(documents.CodeTTL))
	if err != nil {
		return nil, err
	}
	return &NewCode{Code: *code, Value: value}, nil
}

func (s *Service) ListCodes(ctx context.Context, course uuid.UUID) ([]Code, error) {
	if _, err := s.repo.Course(ctx, course); err != nil {
		return nil, err
	}
	return s.repo.ListCodes(ctx, course)
}

func (s *Service) RevokeCode(ctx context.Context, course, id uuid.UUID) error {
	ok, err := s.repo.RevokeCode(ctx, course, id)
	if err != nil {
		return err
	}
	if !ok {
		return ErrNotFound
	}
	return nil
}
