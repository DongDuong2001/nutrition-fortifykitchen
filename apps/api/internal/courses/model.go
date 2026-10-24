// Package courses is Tài liệu as courses (migration 000022): Khoá -> Phần -> Bài, a lesson being a PDF (page images on the API's disk)
// or markdown text. Who may open a course is the coach's choice (open, code, level); a coach or an admin sees everything.
package courses

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Access says who may open a course.
type Access string

const (
	AccessOpen  Access = "open"
	AccessCode  Access = "code"
	AccessLevel Access = "level"
)

// Lock is why a viewer cannot open a course: "" (they can), a code, or a Level.
type Lock string

const (
	LockNone  Lock = ""
	LockCode  Lock = "code"
	LockLevel Lock = "level"
)

const (
	MaxTitleLen    = 100
	MaxSubtitleLen = 200
	MaxPages       = 60
	// MaxPageBytes is the size of one page image (WebP, about 1600 px wide: 100 to 300 KB in practice).
	MaxPageBytes = 1 << 20
	// MaxJSONBytes caps every small JSON body (create, rename, reorder, progress, open with a code).
	MaxJSONBytes = 4 << 10
	// MaxTextBytes is a text lesson's markdown; the JSON body has room for escaping.
	MaxTextBytes     = 1_000_000
	MaxTextBodyBytes = 1_100_000
	// MaxPageBodyBytes is a page upload: the image as base64 in JSON (the API only takes JSON bodies from the browser, see internal/csrf).
	MaxPageBodyBytes = 1_450_000
	MaxLevel         = 5
	ToneCount        = 8
	// MinFreeBytes is the room the disk must still have before a page is written: below it an upload is refused (507 STORAGE_FULL),
	// so a 60 MB lesson can never fill the VPS (its disk is near its limit). COURSES_MIN_FREE_BYTES changes it.
	MinFreeBytes uint64 = 2 << 30
	// StaleUnready is how long a PDF lesson may stay unfinished: after that its pages are not coming (the coach's tab died) and they go.
	StaleUnready = 24 * time.Hour
)

var (
	ErrNotFound   = errors.New("not found")
	ErrLocked     = errors.New("course is locked")
	ErrBadCode    = errors.New("access code is wrong, expired, revoked or for another course")
	ErrInvalid    = errors.New("invalid request")
	ErrTooLarge   = errors.New("body too large")
	ErrNotReady   = errors.New("lesson is not finished uploading")
	ErrPageNumber = errors.New("page number is outside the lesson's pages")
	// ErrStorageFull: the disk has less than MinFreeBytes left, so nothing is written (answered 507 STORAGE_FULL).
	ErrStorageFull = errors.New("not enough room left to store the page")
)

// FieldError is ErrInvalid with the field that was wrong.
type FieldError struct {
	Field string
	Msg   string
}

func (e *FieldError) Error() string { return e.Field + ": " + e.Msg }
func (e *FieldError) Unwrap() error { return ErrInvalid }

// LockedError is ErrLocked with the reason, for the response (the web says "Cần mã" or "Mở ở Level n").
type LockedError struct {
	Lock     Lock
	MinLevel int
}

func (e *LockedError) Error() string { return ErrLocked.Error() }
func (e *LockedError) Unwrap() error { return ErrLocked }

// Viewer is who is asking: their role and Level (profiles.role, profiles.level; a user with no profile row is a user at Level 0).
type Viewer struct {
	ID    uuid.UUID
	Role  string
	Level int
}

func (v Viewer) IsStaff() bool { return v.Role == "coach" || v.Role == "admin" }

type Course struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Subtitle  string    `json:"subtitle"`
	Tone      int       `json:"tone"`
	Access    Access    `json:"access"`
	MinLevel  *int      `json:"minLevel,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Summary is a course in the library: the course, how many lessons it has and how many the viewer finished, and whether it opens for them.
type Summary struct {
	Course
	LessonCount int  `json:"lessonCount"`
	DoneCount   int  `json:"doneCount"`
	Unlocked    bool `json:"unlocked"`
	// Lock is why it does not open ("code" or "level"); empty when it does.
	Lock Lock `json:"lock,omitempty"`
}

type Lesson struct {
	ID        uuid.UUID `json:"id"`
	PartID    uuid.UUID `json:"partId"`
	Title     string    `json:"title"`
	Kind      string    `json:"kind"`
	PageCount int       `json:"pageCount"`
	Minutes   int       `json:"minutes"`
	Ready     bool      `json:"ready"`
	Sort      int       `json:"sort"`
	UpdatedAt time.Time `json:"updatedAt"`
	// The viewer's own progress
	Done     bool `json:"done"`
	LastPage int  `json:"lastPage"`
}

// LessonDetail is one lesson to read: a text lesson carries its markdown; a PDF's pages come from the page route.
type LessonDetail struct {
	Lesson
	CourseID uuid.UUID `json:"courseId"`
	Content  *string   `json:"content,omitempty"`
}

type Part struct {
	ID      uuid.UUID `json:"id"`
	Title   string    `json:"title"`
	Sort    int       `json:"sort"`
	Lessons []Lesson  `json:"lessons"`
}

// Resume is where "Học tiếp" goes: the first lesson the viewer has not finished, at the page they stopped on.
type Resume struct {
	LessonID uuid.UUID `json:"lessonId"`
	Page     int       `json:"page"`
}

type Detail struct {
	Course
	Parts       []Part  `json:"parts"`
	LessonCount int     `json:"lessonCount"`
	DoneCount   int     `json:"doneCount"`
	Resume      *Resume `json:"resume,omitempty"`
}

type Code struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type NewCode struct {
	Code
	Value string `json:"code"`
}

// Request bodies

type CourseInput struct {
	Title    string  `json:"title"`
	Subtitle *string `json:"subtitle"`
	Tone     *int    `json:"tone"`
	Access   Access  `json:"access"`
	MinLevel *int    `json:"minLevel"`
}

type CoursePatch struct {
	Title    *string `json:"title"`
	Subtitle *string `json:"subtitle"`
	Tone     *int    `json:"tone"`
	Access   *Access `json:"access"`
	// MinLevel is read with Access: a level course needs it, any other access clears it
	MinLevel *int `json:"minLevel"`
}

type TitleInput struct {
	Title string `json:"title"`
}

type LessonInput struct {
	PartID    uuid.UUID `json:"partId"`
	Title     string    `json:"title"`
	Kind      string    `json:"kind"`
	Content   string    `json:"content"`
	PageCount int       `json:"pageCount"`
}

type LessonPatch struct {
	Title   *string    `json:"title"`
	PartID  *uuid.UUID `json:"partId"`
	Content *string    `json:"content"`
}

type ReorderInput struct {
	IDs []uuid.UUID `json:"ids"`
	// PartID: the part whose lessons are put in this order
	PartID *uuid.UUID `json:"partId"`
}

type OpenInput struct {
	Code string `json:"code"`
}

type PageInput struct {
	// Data is the page image (WebP) as standard base64
	Data string `json:"data"`
}

type ProgressInput struct {
	LastPage  int   `json:"lastPage"`
	Completed *bool `json:"completed"`
}
