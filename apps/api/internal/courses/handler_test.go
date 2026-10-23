package courses

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"nutrition-api/internal/auth"
)

// The handler's caps and error shapes, with no database: every request here is refused before the repository is asked.

func call(h http.HandlerFunc, method, body string, params map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/x", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rc := chi.NewRouteContext()
	for k, v := range params {
		rc.URLParams.Add(k, v)
	}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rc)
	ctx = context.WithValue(ctx, auth.UserIDKey, uuid.New())
	rec := httptest.NewRecorder()
	h(rec, req.WithContext(ctx))
	return rec
}

func noDB() *Handler { return NewHandler(NewService(nil, nil)) }

func TestJSONBodiesAreCappedAt4KB(t *testing.T) {
	h := noDB()
	big := `{"title":"x","subtitle":"` + strings.Repeat("a", MaxJSONBytes) + `"}`
	for name, fn := range map[string]http.HandlerFunc{"create course": h.CreateCourse, "rename part": h.RenamePart, "reorder": h.ReorderParts, "progress": h.Progress, "open": h.Open} {
		rec := call(fn, "POST", big, map[string]string{"id": uuid.NewString(), "pid": uuid.NewString(), "lid": uuid.NewString()})
		if rec.Code != http.StatusRequestEntityTooLarge {
			t.Errorf("%s: %d, want 413", name, rec.Code)
		}
	}
}

func TestTextLessonBodyCapAndTextCap(t *testing.T) {
	h := noDB()
	params := map[string]string{"id": uuid.NewString()}
	lesson := func(content string) string {
		b, _ := json.Marshal(LessonInput{PartID: uuid.New(), Title: "Bài", Kind: "text", Content: content})
		return string(b)
	}
	// 1,000,001 bytes of text fits the body but not the lesson
	if rec := call(h.CreateLesson, "POST", lesson(strings.Repeat("a", MaxTextBytes+1)), params); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("text of 1,000,001 bytes: %d", rec.Code)
	}
	// 1.2 MB is past the body cap itself
	if rec := call(h.CreateLesson, "POST", lesson(strings.Repeat("a", 1_200_000)), params); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a 1.2 MB body: %d", rec.Code)
	}
	patch := `{"content":"` + strings.Repeat("a", MaxTextBytes+1) + `"}`
	if rec := call(h.UpdateLesson, "PATCH", patch, map[string]string{"id": uuid.NewString(), "lid": uuid.NewString()}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a patch with too much text: %d", rec.Code)
	}
}

func TestPageUploadCapsAndShape(t *testing.T) {
	h := noDB()
	params := func(n string) map[string]string {
		return map[string]string{"id": uuid.NewString(), "lid": uuid.NewString(), "n": n}
	}
	img := func(size int) string {
		b := append([]byte("RIFF\x20\x00\x00\x00WEBPVP8 "), make([]byte, size)...)
		out, _ := json.Marshal(PageInput{Data: base64.StdEncoding.EncodeToString(b)})
		return string(out)
	}
	// 1 MiB of image is 1.4 MB of base64: the body cap leaves room for it, the image cap does not allow more than 1 MiB
	if rec := call(h.UploadPage, "PUT", img(MaxPageBytes), params("1")); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a page just over 1 MiB (with its header): %d", rec.Code)
	}
	if rec := call(h.UploadPage, "PUT", `{"data":"`+strings.Repeat("A", MaxPageBodyBytes)+`"}`, params("1")); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a body past the cap: %d", rec.Code)
	}
	// not base64, not a WebP, a page that cannot exist: 400, before any file or row
	if rec := call(h.UploadPage, "PUT", `{"data":"!!!"}`, params("1")); rec.Code != http.StatusBadRequest {
		t.Errorf("not base64: %d", rec.Code)
	}
	png, _ := json.Marshal(PageInput{Data: base64.StdEncoding.EncodeToString([]byte("\x89PNG\r\n\x1a\n0000"))})
	if rec := call(h.UploadPage, "PUT", string(png), params("1")); rec.Code != http.StatusBadRequest {
		t.Errorf("a PNG: %d", rec.Code)
	}
	for _, n := range []string{"0", "61", "-1"} {
		if rec := call(h.UploadPage, "PUT", img(8), params(n)); rec.Code != http.StatusBadRequest {
			t.Errorf("page %s: %d", n, rec.Code)
		}
	}
	// an id or a page that is not a number is a plain 404
	if rec := call(h.UploadPage, "PUT", img(8), params("x")); rec.Code != http.StatusNotFound {
		t.Errorf("page x: %d", rec.Code)
	}
	if rec := call(h.UploadPage, "PUT", img(8), map[string]string{"id": "nope", "lid": uuid.NewString(), "n": "1"}); rec.Code != http.StatusNotFound {
		t.Errorf("a course id that is not an id: %d", rec.Code)
	}
}

func TestLessonShapeIsCheckedBeforeTheDatabase(t *testing.T) {
	h := noDB()
	part := uuid.New()
	for name, in := range map[string]LessonInput{
		"61 pages":     {PartID: part, Title: "x", Kind: "pdf", PageCount: 61},
		"0 pages":      {PartID: part, Title: "x", Kind: "pdf", PageCount: 0},
		"no title":     {PartID: part, Title: " ", Kind: "text"},
		"unknown kind": {PartID: part, Title: "x", Kind: "video"},
		"no part":      {Title: "x", Kind: "text"},
	} {
		b, _ := json.Marshal(in)
		if rec := call(h.CreateLesson, "POST", string(b), map[string]string{"id": uuid.NewString()}); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, rec.Code)
		}
	}
}

// fakeRepo answers only what the access check asks.
type fakeRepo struct {
	Repository
	viewer   Viewer
	course   *Course
	unlocked bool
}

func (f fakeRepo) Viewer(context.Context, uuid.UUID) (Viewer, error)  { return f.viewer, nil }
func (f fakeRepo) Course(context.Context, uuid.UUID) (*Course, error) { return f.course, nil }
func (f fakeRepo) CodeUnlocked(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return f.unlocked, nil
}

func TestLockedAnswerSaysWhy(t *testing.T) {
	level := 3
	cases := []struct {
		name   string
		repo   fakeRepo
		lock   string
		minLvl string
	}{
		{"code course", fakeRepo{viewer: Viewer{Role: "user"}, course: &Course{Access: AccessCode}}, "code", ""},
		{"level 3 at Level 2", fakeRepo{viewer: Viewer{Role: "user", Level: 2}, course: &Course{Access: AccessLevel, MinLevel: &level}}, "level", "3"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h := NewHandler(NewService(tc.repo, nil))
			rec := call(h.Get, "GET", "", map[string]string{"id": uuid.NewString()})
			var env struct {
				Error struct {
					Code   string            `json:"code"`
					Fields map[string]string `json:"fields"`
				} `json:"error"`
			}
			_ = json.Unmarshal(rec.Body.Bytes(), &env)
			if rec.Code != http.StatusForbidden || env.Error.Code != "COURSE_LOCKED" || env.Error.Fields["lock"] != tc.lock || env.Error.Fields["minLevel"] != tc.minLvl {
				t.Fatalf("%d %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestResumeOf(t *testing.T) {
	a, b, c := uuid.New(), uuid.New(), uuid.New()
	parts := []Part{
		{Lessons: []Lesson{{ID: a, Ready: true, Done: true, PageCount: 4, LastPage: 4}, {ID: b, Ready: false}}},
		{Lessons: []Lesson{{ID: c, Ready: true, PageCount: 4, LastPage: 9}}},
	}
	got := ResumeOf(parts)
	if got == nil || got.LessonID != c || got.Page != 4 {
		t.Fatalf("the first lesson that is ready and not done, its last page capped to the pages: %+v", got)
	}
	parts[1].Lessons[0].Done = true
	if ResumeOf(parts) != nil {
		t.Error("everything finished: no resume")
	}
	if r := ResumeOf([]Part{{Lessons: []Lesson{{ID: a, Ready: true, LastPage: 0}}}}); r == nil || r.Page != 1 {
		t.Errorf("page 0 is page 1: %+v", r)
	}
}
