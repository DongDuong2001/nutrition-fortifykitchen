package courses

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository is what the service needs from the database (nutrition.courses and the tables of migration 000022).
type Repository interface {
	Viewer(ctx context.Context, id uuid.UUID) (Viewer, error)

	Summaries(ctx context.Context, viewer uuid.UUID) ([]Summary, error)
	Course(ctx context.Context, id uuid.UUID) (*Course, error)
	CodeUnlocked(ctx context.Context, viewer, course uuid.UUID) (bool, error)
	CreateCourse(ctx context.Context, by uuid.UUID, title, subtitle string, tone int, access Access, level *int) (*Course, error)
	UpdateCourse(ctx context.Context, id uuid.UUID, title, subtitle string, tone int, access Access, level *int) (*Course, error)
	DeleteCourse(ctx context.Context, id uuid.UUID) error

	Parts(ctx context.Context, course uuid.UUID) ([]Part, error)
	Lessons(ctx context.Context, course, viewer uuid.UUID, withUnready bool) ([]Lesson, error)
	CreatePart(ctx context.Context, course uuid.UUID, title string) (*Part, error)
	RenamePart(ctx context.Context, course, part uuid.UUID, title string) (*Part, error)
	// DeletePart returns the ids of the lessons that went with it (their page files go too).
	DeletePart(ctx context.Context, course, part uuid.UUID) ([]uuid.UUID, error)
	ReorderParts(ctx context.Context, course uuid.UUID, ids []uuid.UUID) error

	Lesson(ctx context.Context, course, lesson, viewer uuid.UUID, withUnready bool) (*LessonDetail, error)
	CreateLesson(ctx context.Context, course uuid.UUID, in LessonInput, minutes int) (*Lesson, error)
	UpdateLesson(ctx context.Context, course, lesson uuid.UUID, p LessonPatch, minutes *int) (*Lesson, error)
	DeleteLesson(ctx context.Context, course, lesson uuid.UUID) error
	ReorderLessons(ctx context.Context, course, part uuid.UUID, ids []uuid.UUID) error
	AddPage(ctx context.Context, course, lesson uuid.UUID, page, bytes int) error
	FinishLesson(ctx context.Context, course, lesson uuid.UUID) (*Lesson, error)
	// PageBytes: the size of a page that is on disk and may be read (a lesson of that course; ready unless withUnready), or ErrNotFound.
	PageBytes(ctx context.Context, course, lesson uuid.UUID, page int, withUnready bool) (int, error)
	PutProgress(ctx context.Context, viewer, course, lesson uuid.UUID, lastPage int, completed *bool) error

	InsertCode(ctx context.Context, course uuid.UUID, hash string, by uuid.UUID, expires time.Time) (*Code, error)
	ListCodes(ctx context.Context, course uuid.UUID) ([]Code, error)
	RevokeCode(ctx context.Context, course, id uuid.UUID) (bool, error)
	// UseCode: the hash is a live code of this course (not revoked, not lapsed): the viewer's unlock is recorded. ErrBadCode otherwise.
	UseCode(ctx context.Context, viewer, course uuid.UUID, hash string) error
}

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) *PostgresRepository { return &PostgresRepository{pool: pool} }

var _ Repository = (*PostgresRepository)(nil)

const courseCols = `c.id, c.title, c.subtitle, c.tone, c.access, c.min_level, c.created_at, c.updated_at`

func scanCourse(row pgx.Row) (*Course, error) {
	var c Course
	var level *int16
	if err := row.Scan(&c.ID, &c.Title, &c.Subtitle, &c.Tone, &c.Access, &level, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	if level != nil {
		n := int(*level)
		c.MinLevel = &n
	}
	return &c, nil
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *PostgresRepository) Viewer(ctx context.Context, id uuid.UUID) (Viewer, error) {
	v := Viewer{ID: id, Role: "user"}
	var role string
	var level int16
	err := r.pool.QueryRow(ctx, `SELECT role, level FROM nutrition.profiles WHERE user_id = $1`, id).Scan(&role, &level)
	if errors.Is(err, pgx.ErrNoRows) {
		return v, nil
	}
	if err != nil {
		return v, err
	}
	v.Role, v.Level = role, int(level)
	return v, nil
}

const liveUnlock = `EXISTS (SELECT 1 FROM nutrition.course_unlocks u JOIN nutrition.course_codes k ON k.id = u.code_id
	WHERE u.user_id = $1 AND u.course_id = c.id AND k.revoked_at IS NULL AND k.expires_at > now())`

func (r *PostgresRepository) Summaries(ctx context.Context, viewer uuid.UUID) ([]Summary, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+courseCols+`,
			(SELECT count(*) FROM nutrition.course_lessons l WHERE l.course_id = c.id AND l.ready),
			(SELECT count(*) FROM nutrition.course_progress p JOIN nutrition.course_lessons l ON l.id = p.lesson_id
				WHERE l.course_id = c.id AND l.ready AND p.user_id = $1 AND p.completed_at IS NOT NULL),
			`+liveUnlock+`
		FROM nutrition.courses c ORDER BY c.created_at DESC, c.title`, viewer)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Summary{}
	for rows.Next() {
		var s Summary
		var level *int16
		if err := rows.Scan(&s.ID, &s.Title, &s.Subtitle, &s.Tone, &s.Access, &level, &s.CreatedAt, &s.UpdatedAt, &s.LessonCount, &s.DoneCount, &s.Unlocked); err != nil {
			return nil, err
		}
		if level != nil {
			n := int(*level)
			s.MinLevel = &n
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) Course(ctx context.Context, id uuid.UUID) (*Course, error) {
	c, err := scanCourse(r.pool.QueryRow(ctx, `SELECT `+courseCols+` FROM nutrition.courses c WHERE c.id = $1`, id))
	return c, notFound(err)
}

func (r *PostgresRepository) CodeUnlocked(ctx context.Context, viewer, course uuid.UUID) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM nutrition.course_unlocks u JOIN nutrition.course_codes k ON k.id = u.code_id
		WHERE u.user_id = $1 AND u.course_id = $2 AND k.revoked_at IS NULL AND k.expires_at > now())`, viewer, course).Scan(&ok)
	return ok, err
}

func (r *PostgresRepository) CreateCourse(ctx context.Context, by uuid.UUID, title, subtitle string, tone int, access Access, level *int) (*Course, error) {
	c, err := scanCourse(r.pool.QueryRow(ctx, `
		INSERT INTO nutrition.courses AS c (title, subtitle, tone, access, min_level, created_by) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+courseCols, title, subtitle, tone, access, level, by))
	return c, err
}

func (r *PostgresRepository) UpdateCourse(ctx context.Context, id uuid.UUID, title, subtitle string, tone int, access Access, level *int) (*Course, error) {
	c, err := scanCourse(r.pool.QueryRow(ctx, `
		UPDATE nutrition.courses AS c SET title = $2, subtitle = $3, tone = $4, access = $5, min_level = $6 WHERE c.id = $1
		RETURNING `+courseCols, id, title, subtitle, tone, access, level))
	return c, notFound(err)
}

func (r *PostgresRepository) DeleteCourse(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM nutrition.courses WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) Parts(ctx context.Context, course uuid.UUID) ([]Part, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, title, sort FROM nutrition.course_parts WHERE course_id = $1 ORDER BY sort, created_at`, course)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Part{}
	for rows.Next() {
		p := Part{Lessons: []Lesson{}}
		if err := rows.Scan(&p.ID, &p.Title, &p.Sort); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

const lessonCols = `l.id, l.part_id, l.title, l.kind, l.page_count, l.minutes, l.ready, l.sort, l.updated_at,
	COALESCE(p.completed_at IS NOT NULL, false), COALESCE(p.last_page, 1)`

func scanLesson(row pgx.Row) (*Lesson, error) {
	var l Lesson
	var pages, minutes, last int16
	if err := row.Scan(&l.ID, &l.PartID, &l.Title, &l.Kind, &pages, &minutes, &l.Ready, &l.Sort, &l.UpdatedAt, &l.Done, &last); err != nil {
		return nil, err
	}
	l.PageCount, l.Minutes, l.LastPage = int(pages), int(minutes), int(last)
	return &l, nil
}

func (r *PostgresRepository) Lessons(ctx context.Context, course, viewer uuid.UUID, withUnready bool) ([]Lesson, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+lessonCols+` FROM nutrition.course_lessons l
		LEFT JOIN nutrition.course_progress p ON p.lesson_id = l.id AND p.user_id = $2
		WHERE l.course_id = $1 AND ($3 OR l.ready) ORDER BY l.sort, l.created_at`, course, viewer, withUnready)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Lesson{}
	for rows.Next() {
		l, err := scanLesson(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) CreatePart(ctx context.Context, course uuid.UUID, title string) (*Part, error) {
	p := Part{Lessons: []Lesson{}}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO nutrition.course_parts (course_id, title, sort)
		SELECT $1, $2, COALESCE(MAX(sort), 0) + 1 FROM nutrition.course_parts WHERE course_id = $1
		RETURNING id, title, sort`, course, title).Scan(&p.ID, &p.Title, &p.Sort)
	return &p, err
}

func (r *PostgresRepository) RenamePart(ctx context.Context, course, part uuid.UUID, title string) (*Part, error) {
	p := Part{Lessons: []Lesson{}}
	err := r.pool.QueryRow(ctx, `UPDATE nutrition.course_parts SET title = $3 WHERE id = $2 AND course_id = $1 RETURNING id, title, sort`,
		course, part, title).Scan(&p.ID, &p.Title, &p.Sort)
	return &p, notFound(err)
}

func (r *PostgresRepository) DeletePart(ctx context.Context, course, part uuid.UUID) ([]uuid.UUID, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `SELECT l.id FROM nutrition.course_lessons l JOIN nutrition.course_parts p ON p.id = l.part_id WHERE p.id = $2 AND p.course_id = $1`, course, part)
	if err != nil {
		return nil, err
	}
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM nutrition.course_parts WHERE id = $2 AND course_id = $1`, course, part)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return ids, tx.Commit(ctx)
}

// reorder sets sort = position for exactly the rows of `table` that match `scope`; ids must be all of them, each once.
func (r *PostgresRepository) reorder(ctx context.Context, table, scopeCol string, scope uuid.UUID, ids []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var have int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM nutrition.`+table+` WHERE `+scopeCol+` = $1`, scope).Scan(&have); err != nil {
		return err
	}
	seen := map[uuid.UUID]bool{}
	for _, id := range ids {
		seen[id] = true
	}
	if have != len(ids) || len(seen) != len(ids) {
		return &FieldError{Field: "ids", Msg: "every item once, no others"}
	}
	tag, err := tx.Exec(ctx, `UPDATE nutrition.`+table+` t SET sort = u.ord FROM unnest($2::uuid[]) WITH ORDINALITY AS u(id, ord)
		WHERE t.id = u.id AND t.`+scopeCol+` = $1`, scope, ids)
	if err != nil {
		return err
	}
	if int(tag.RowsAffected()) != len(ids) {
		return &FieldError{Field: "ids", Msg: "every item once, no others"}
	}
	return tx.Commit(ctx)
}

func (r *PostgresRepository) ReorderParts(ctx context.Context, course uuid.UUID, ids []uuid.UUID) error {
	return r.reorder(ctx, "course_parts", "course_id", course, ids)
}

func (r *PostgresRepository) ReorderLessons(ctx context.Context, course, part uuid.UUID, ids []uuid.UUID) error {
	var ok bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM nutrition.course_parts WHERE id = $2 AND course_id = $1)`, course, part).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return ErrNotFound
	}
	return r.reorder(ctx, "course_lessons", "part_id", part, ids)
}

func (r *PostgresRepository) Lesson(ctx context.Context, course, lesson, viewer uuid.UUID, withUnready bool) (*LessonDetail, error) {
	var d LessonDetail
	var pages, minutes, last int16
	err := r.pool.QueryRow(ctx, `
		SELECT `+lessonCols+`, l.course_id, l.content FROM nutrition.course_lessons l
		LEFT JOIN nutrition.course_progress p ON p.lesson_id = l.id AND p.user_id = $3
		WHERE l.id = $2 AND l.course_id = $1 AND ($4 OR l.ready)`, course, lesson, viewer, withUnready).
		Scan(&d.ID, &d.PartID, &d.Title, &d.Kind, &pages, &minutes, &d.Ready, &d.Sort, &d.UpdatedAt, &d.Done, &last, &d.CourseID, &d.Content)
	if err != nil {
		return nil, notFound(err)
	}
	d.PageCount, d.Minutes, d.LastPage = int(pages), int(minutes), int(last)
	return &d, nil
}

func (r *PostgresRepository) CreateLesson(ctx context.Context, course uuid.UUID, in LessonInput, minutes int) (*Lesson, error) {
	var ok bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM nutrition.course_parts WHERE id = $2 AND course_id = $1)`, course, in.PartID).Scan(&ok); err != nil {
		return nil, err
	}
	if !ok {
		return nil, &FieldError{Field: "partId", Msg: "a part of this course"}
	}
	var content *string
	ready := true
	if in.Kind == "text" {
		content = &in.Content
	} else {
		ready = false
	}
	l, err := scanLesson(r.pool.QueryRow(ctx, `
		WITH ins AS (
			INSERT INTO nutrition.course_lessons (course_id, part_id, title, kind, content, page_count, minutes, ready, sort)
			SELECT $1, $2, $3, $4, $5, $6, $7, $8, COALESCE(MAX(sort), 0) + 1 FROM nutrition.course_lessons WHERE part_id = $2
			RETURNING *)
		SELECT `+lessonCols+` FROM ins l LEFT JOIN nutrition.course_progress p ON false`,
		course, in.PartID, in.Title, in.Kind, content, in.PageCount, minutes, ready))
	return l, err
}

func (r *PostgresRepository) UpdateLesson(ctx context.Context, course, lesson uuid.UUID, p LessonPatch, minutes *int) (*Lesson, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var kind string
	if err := tx.QueryRow(ctx, `SELECT kind FROM nutrition.course_lessons WHERE id = $2 AND course_id = $1 FOR UPDATE`, course, lesson).Scan(&kind); err != nil {
		return nil, notFound(err)
	}
	if p.Title != nil {
		if _, err := tx.Exec(ctx, `UPDATE nutrition.course_lessons SET title = $2 WHERE id = $1`, lesson, *p.Title); err != nil {
			return nil, err
		}
	}
	if p.Content != nil {
		if kind != "text" {
			return nil, &FieldError{Field: "content", Msg: "only a written lesson has text"}
		}
		if _, err := tx.Exec(ctx, `UPDATE nutrition.course_lessons SET content = $2, minutes = $3 WHERE id = $1`, lesson, *p.Content, *minutes); err != nil {
			return nil, err
		}
	}
	if p.PartID != nil {
		var ok bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM nutrition.course_parts WHERE id = $2 AND course_id = $1)`, course, *p.PartID).Scan(&ok); err != nil {
			return nil, err
		}
		if !ok {
			return nil, &FieldError{Field: "partId", Msg: "a part of this course"}
		}
		if _, err := tx.Exec(ctx, `UPDATE nutrition.course_lessons SET part_id = $2,
			sort = (SELECT COALESCE(MAX(sort), 0) + 1 FROM nutrition.course_lessons WHERE part_id = $2) WHERE id = $1 AND part_id <> $2`, lesson, *p.PartID); err != nil {
			return nil, err
		}
	}
	l, err := scanLesson(tx.QueryRow(ctx, `SELECT `+lessonCols+` FROM nutrition.course_lessons l LEFT JOIN nutrition.course_progress p ON false WHERE l.id = $1`, lesson))
	if err != nil {
		return nil, err
	}
	return l, tx.Commit(ctx)
}

func (r *PostgresRepository) DeleteLesson(ctx context.Context, course, lesson uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM nutrition.course_lessons WHERE id = $2 AND course_id = $1`, course, lesson)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) AddPage(ctx context.Context, course, lesson uuid.UUID, page, bytes int) error {
	var kind string
	var pages int16
	if err := r.pool.QueryRow(ctx, `SELECT kind, page_count FROM nutrition.course_lessons WHERE id = $2 AND course_id = $1`, course, lesson).Scan(&kind, &pages); err != nil {
		return notFound(err)
	}
	if kind != "pdf" || page < 1 || page > int(pages) {
		return ErrPageNumber
	}
	_, err := r.pool.Exec(ctx, `INSERT INTO nutrition.course_lesson_pages (lesson_id, page, bytes) VALUES ($1, $2, $3)
		ON CONFLICT (lesson_id, page) DO UPDATE SET bytes = EXCLUDED.bytes`, lesson, page, bytes)
	return err
}

func (r *PostgresRepository) FinishLesson(ctx context.Context, course, lesson uuid.UUID) (*Lesson, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var kind string
	var pages int16
	if err := tx.QueryRow(ctx, `SELECT kind, page_count FROM nutrition.course_lessons WHERE id = $2 AND course_id = $1 FOR UPDATE`, course, lesson).Scan(&kind, &pages); err != nil {
		return nil, notFound(err)
	}
	var have int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM nutrition.course_lesson_pages WHERE lesson_id = $1 AND page BETWEEN 1 AND $2`, lesson, pages).Scan(&have); err != nil {
		return nil, err
	}
	if kind != "pdf" || have != int(pages) {
		return nil, ErrNotReady
	}
	if _, err := tx.Exec(ctx, `UPDATE nutrition.course_lessons SET ready = true WHERE id = $1`, lesson); err != nil {
		return nil, err
	}
	l, err := scanLesson(tx.QueryRow(ctx, `SELECT `+lessonCols+` FROM nutrition.course_lessons l LEFT JOIN nutrition.course_progress p ON false WHERE l.id = $1`, lesson))
	if err != nil {
		return nil, err
	}
	return l, tx.Commit(ctx)
}

func (r *PostgresRepository) PageBytes(ctx context.Context, course, lesson uuid.UUID, page int, withUnready bool) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT g.bytes FROM nutrition.course_lesson_pages g JOIN nutrition.course_lessons l ON l.id = g.lesson_id
		WHERE g.lesson_id = $2 AND g.page = $3 AND l.course_id = $1 AND ($4 OR l.ready)`, course, lesson, page, withUnready).Scan(&n)
	return n, notFound(err)
}

func (r *PostgresRepository) PutProgress(ctx context.Context, viewer, course, lesson uuid.UUID, lastPage int, completed *bool) error {
	var pages int16
	if err := r.pool.QueryRow(ctx, `SELECT page_count FROM nutrition.course_lessons WHERE id = $2 AND course_id = $1 AND ready`, course, lesson).Scan(&pages); err != nil {
		return notFound(err)
	}
	if lastPage < 1 {
		lastPage = 1
	}
	if pages > 0 && lastPage > int(pages) {
		lastPage = int(pages)
	}
	if pages == 0 {
		lastPage = 1
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO nutrition.course_progress (user_id, lesson_id, last_page, completed_at)
		VALUES ($1, $2, $3, CASE WHEN $4::boolean IS TRUE THEN now() END)
		ON CONFLICT (user_id, lesson_id) DO UPDATE SET last_page = EXCLUDED.last_page,
			completed_at = CASE WHEN $4::boolean IS NULL THEN nutrition.course_progress.completed_at
				WHEN $4::boolean THEN COALESCE(nutrition.course_progress.completed_at, now()) ELSE NULL END`,
		viewer, lesson, lastPage, completed)
	return err
}

func (r *PostgresRepository) InsertCode(ctx context.Context, course uuid.UUID, hash string, by uuid.UUID, expires time.Time) (*Code, error) {
	var c Code
	err := r.pool.QueryRow(ctx, `INSERT INTO nutrition.course_codes (course_id, code_hash, created_by, expires_at) VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, expires_at`, course, hash, by, expires).Scan(&c.ID, &c.CreatedAt, &c.ExpiresAt)
	return &c, err
}

func (r *PostgresRepository) ListCodes(ctx context.Context, course uuid.UUID) ([]Code, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, created_at, expires_at FROM nutrition.course_codes
		WHERE course_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC`, course)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Code{}
	for rows.Next() {
		var c Code
		if err := rows.Scan(&c.ID, &c.CreatedAt, &c.ExpiresAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) RevokeCode(ctx context.Context, course, id uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx, `UPDATE nutrition.course_codes SET revoked_at = now() WHERE id = $2 AND course_id = $1 AND revoked_at IS NULL`, course, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *PostgresRepository) UseCode(ctx context.Context, viewer, course uuid.UUID, hash string) error {
	var codeID uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT id FROM nutrition.course_codes WHERE course_id = $1 AND code_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
		course, hash).Scan(&codeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBadCode
	}
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO nutrition.course_unlocks (user_id, course_id, code_id) VALUES ($1, $2, $3)
		ON CONFLICT (user_id, course_id) DO UPDATE SET code_id = EXCLUDED.code_id, unlocked_at = now()`, viewer, course, codeID)
	return err
}
