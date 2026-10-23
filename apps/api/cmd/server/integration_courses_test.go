//go:build integration

// Khoá học (migration 000022) end to end through the real router against Postgres: every access rule, the caps, the coach flows.
package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// A tiny WebP header: what the API checks (RIFF, size, WEBP) plus some bytes
func webp(tag string) []byte {
	return append([]byte("RIFF\x20\x00\x00\x00WEBPVP8 "), []byte(tag+strings.Repeat("-", 16))...)
}

func b64(b []byte) map[string]any {
	return map[string]any{"data": base64.StdEncoding.EncodeToString(b)}
}

// raw sends a request and returns the whole answer (the page route is an image, not an envelope).
func (c *apiClient) raw(method, path string, body any) *httptest.ResponseRecorder {
	c.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			c.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	rec := httptest.NewRecorder()
	c.router.ServeHTTP(rec, req)
	return rec
}

// errCode is the error envelope's code and fields of an answer.
func errOf(rec *httptest.ResponseRecorder) (string, map[string]any) {
	var env struct {
		Error struct {
			Code   string         `json:"code"`
			Fields map[string]any `json:"fields"`
		} `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &env)
	return env.Error.Code, env.Error.Fields
}

func asRole(t *testing.T, pool *pgxpool.Pool, user uuid.UUID, role string, level int) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), `UPDATE nutrition.profiles SET role = $2, level = $3 WHERE user_id = $1`, user, role, level); err != nil {
		t.Fatal(err)
	}
}

type courseFixture struct {
	coach, a, b          *apiClient
	pool                 *pgxpool.Pool
	aID, bID             uuid.UUID
	openC, codeC, levelC string
	codeP, levelP        string // a part of the code course and of the level course
}

func idOf(v any) string { return fmt.Sprint(m(v)["id"]) }

// Three courses (open, code, level 3), each with a part and a written lesson; the code course also has a 2-page PDF lesson.
func newCourseFixture(t *testing.T) *courseFixture {
	t.Helper()
	coach, pool, coachID := setup(t)
	a, _, aID := setup(t)
	b, _, bID := setup(t)
	asRole(t, pool, coachID, "coach", 0)
	asRole(t, pool, aID, "user", 2)
	asRole(t, pool, bID, "user", 0)
	f := &courseFixture{coach: coach, a: a, b: b, pool: pool, aID: aID, bID: bID}
	mk := func(body map[string]any) (string, string) {
		cid := idOf(coach.must(http.StatusCreated, "POST", "/api/v1/courses", body))
		pid := idOf(coach.must(http.StatusCreated, "POST", "/api/v1/courses/"+cid+"/parts", map[string]any{"title": "Phần 1"}))
		coach.must(http.StatusCreated, "POST", "/api/v1/courses/"+cid+"/lessons", map[string]any{"partId": pid, "title": "Bài viết", "kind": "text", "content": "Xin chào mọi người"})
		return cid, pid
	}
	f.openC, _ = mk(map[string]any{"title": "Mở cho mọi người", "access": "open", "tone": 1})
	f.codeC, f.codeP = mk(map[string]any{"title": "Cần mã", "access": "code", "tone": 2})
	f.levelC, f.levelP = mk(map[string]any{"title": "Mở ở Level 3", "access": "level", "minLevel": 3, "tone": 3})
	return f
}

func (f *courseFixture) newCode(course string) string {
	return fmt.Sprint(m(f.coach.must(http.StatusCreated, "POST", "/api/v1/courses/"+course+"/codes", nil))["code"])
}

func summaries(c *apiClient) map[string]map[string]any {
	out := map[string]map[string]any{}
	for _, it := range list(c.must(http.StatusOK, "GET", "/api/v1/courses", nil), "items") {
		out[idOf(it)] = m(it)
	}
	return out
}

func TestCoursesAccessRules(t *testing.T) {
	f := newCourseFixture(t)

	// The library never needs access: every course is listed, with why it is shut (other courses in a reused test database are not ours, so look up ours by id)
	l := summaries(f.b)
	if l[f.openC] == nil || l[f.codeC] == nil || l[f.levelC] == nil || l[f.openC]["unlocked"] != true || l[f.codeC]["lock"] != "code" || l[f.levelC]["lock"] != "level" || l[f.levelC]["minLevel"] != 3.0 {
		t.Fatalf("library for a Level 0 user: %v", l)
	}
	if l[f.codeC]["lessonCount"] != 1.0 {
		t.Fatalf("lesson count: %v", l[f.codeC])
	}

	// open: every signed-in user
	f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.openC, nil)

	// code: no code, a wrong code, an unknown course's code are all refused with the reason
	if code, fields := errOf(f.b.raw("GET", "/api/v1/courses/"+f.codeC, nil)); code != "COURSE_LOCKED" || fields["lock"] != "code" {
		t.Fatalf("code course without a code: %s %v", code, fields)
	}
	if rec := f.b.raw("POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": "ABCDEFGH23"}); rec.Code != http.StatusForbidden {
		t.Fatalf("a wrong code: %d", rec.Code)
	}
	if rec := f.b.raw("POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": "short"}); rec.Code != http.StatusForbidden {
		t.Fatalf("a code of the wrong shape: %d", rec.Code)
	}
	// a code made for another code course does not open this one
	other := idOf(f.coach.must(http.StatusCreated, "POST", "/api/v1/courses", map[string]any{"title": "Khoá khác", "access": "code"}))
	otherCode := f.newCode(other)
	if rec := f.b.raw("POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": otherCode}); rec.Code != http.StatusForbidden {
		t.Fatalf("another course's code: %d", rec.Code)
	}
	// the right code opens it, and stays open for later requests (the lesson, the library)
	code := f.newCode(f.codeC)
	d := m(f.b.must(http.StatusOK, "POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": strings.ToLower(code[:4]) + " " + code[4:]}))
	if d["lessonCount"] != 1.0 || len(list(d, "parts")) != 1 {
		t.Fatalf("opened course: %v", d)
	}
	f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC, nil)
	if summaries(f.b)[f.codeC]["unlocked"] != true {
		t.Fatal("the library says it is still shut")
	}
	// another user is not unlocked by it
	if rec := f.a.raw("GET", "/api/v1/courses/"+f.codeC, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("a different user: %d", rec.Code)
	}

	// revoked: the course shuts again for the one who used it
	codes := list(f.coach.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC+"/codes", nil), "items")
	if len(codes) != 1 || m(codes[0])["code"] != nil {
		t.Fatalf("the list shows codes without their values: %v", codes)
	}
	f.coach.must(http.StatusOK, "DELETE", "/api/v1/courses/"+f.codeC+"/codes/"+idOf(codes[0]), nil)
	if rec := f.b.raw("GET", "/api/v1/courses/"+f.codeC, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("after the code was revoked: %d", rec.Code)
	}
	if rec := f.coach.raw("DELETE", "/api/v1/courses/"+f.codeC+"/codes/"+idOf(codes[0]), nil); rec.Code != http.StatusNotFound {
		t.Fatalf("revoking again: %d", rec.Code)
	}
	if rec := f.a.raw("POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": code}); rec.Code != http.StatusForbidden {
		t.Fatalf("a revoked code: %d", rec.Code)
	}

	// expired: a code past its 30 days opens nothing, and closes the course again for who used it
	fresh := f.newCode(f.codeC)
	f.b.must(http.StatusOK, "POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": fresh})
	if _, err := f.pool.Exec(context.Background(), `UPDATE nutrition.course_codes SET expires_at = now() - interval '1 minute' WHERE course_id = $1`, f.codeC); err != nil {
		t.Fatal(err)
	}
	if rec := f.b.raw("GET", "/api/v1/courses/"+f.codeC, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("after the code lapsed: %d", rec.Code)
	}
	if rec := f.a.raw("POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": fresh}); rec.Code != http.StatusForbidden {
		t.Fatalf("a lapsed code: %d", rec.Code)
	}

	// level 3: Level 0 and Level 2 are below, Level 3 is at, Level 5 above
	if code, fields := errOf(f.b.raw("GET", "/api/v1/courses/"+f.levelC, nil)); code != "COURSE_LOCKED" || fields["lock"] != "level" || fields["minLevel"] != "3" {
		t.Fatalf("level 0: %s %v", code, fields)
	}
	if rec := f.a.raw("GET", "/api/v1/courses/"+f.levelC, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("level 2: %d", rec.Code)
	}
	for _, level := range []int{3, 5} {
		asRole(t, f.pool, f.aID, "user", level)
		f.a.must(http.StatusOK, "GET", "/api/v1/courses/"+f.levelC, nil)
	}
	asRole(t, f.pool, f.aID, "user", 2)
	// a code does not open a Level course
	if rec := f.a.raw("POST", "/api/v1/courses/"+f.levelC+"/open", map[string]any{"code": otherCode}); rec.Code != http.StatusForbidden {
		t.Fatalf("a code on a level course: %d", rec.Code)
	}

	// a coach (and an admin) sees every course whatever its access
	for _, id := range []string{f.codeC, f.levelC, f.openC} {
		f.coach.must(http.StatusOK, "GET", "/api/v1/courses/"+id, nil)
	}
	// an id that is no course, or not an id, is a plain 404
	for _, path := range []string{"/api/v1/courses/" + uuid.NewString(), "/api/v1/courses/not-an-id"} {
		if rec := f.a.raw("GET", path, nil); rec.Code != http.StatusNotFound {
			t.Fatalf("%s: %d", path, rec.Code)
		}
	}
}

func TestCoursesPagesAndProgress(t *testing.T) {
	f := newCourseFixture(t)
	// a 2-page PDF lesson in the code course and one in the open course
	pdf := func(course, part string) string {
		lid := idOf(f.coach.must(http.StatusCreated, "POST", "/api/v1/courses/"+course+"/lessons", map[string]any{"partId": part, "title": "PDF", "kind": "pdf", "pageCount": 2}))
		return lid
	}
	openPart := idOf(list(f.coach.must(http.StatusOK, "GET", "/api/v1/courses/"+f.openC, nil), "parts")[0])
	lessonCode := pdf(f.codeC, f.codeP)
	lessonOpen := pdf(f.openC, openPart)

	// hidden from learners until every page is there; 409 until then
	if len(lessonsOf(f.b, f.openC)) != 1 {
		t.Fatalf("a PDF still being uploaded must not show: %v", lessonsOf(f.b, f.openC))
	}
	if rec := f.coach.raw("POST", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/finish", nil); rec.Code != http.StatusConflict {
		t.Fatalf("finish with no pages: %d", rec.Code)
	}
	f.coach.must(http.StatusOK, "PUT", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/pages/1", b64(webp("open-1")))
	if rec := f.coach.raw("POST", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/finish", nil); rec.Code != http.StatusConflict {
		t.Fatalf("finish with one page of two: %d", rec.Code)
	}
	f.coach.must(http.StatusOK, "PUT", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/pages/2", b64(webp("open-2")))
	f.coach.must(http.StatusOK, "POST", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/finish", nil)
	if len(lessonsOf(f.b, f.openC)) != 2 {
		t.Fatalf("the finished PDF shows: %v", lessonsOf(f.b, f.openC))
	}
	for p := 1; p <= 2; p++ {
		f.coach.must(http.StatusOK, "PUT", fmt.Sprintf("/api/v1/courses/%s/lessons/%s/pages/%d", f.codeC, lessonCode, p), b64(webp(fmt.Sprintf("code-%d", p))))
	}
	f.coach.must(http.StatusOK, "POST", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode+"/finish", nil)

	// a page streams after the lesson's access check, never cached, as an image
	rec := f.b.raw("GET", "/api/v1/courses/"+f.openC+"/lessons/"+lessonOpen+"/pages/2", nil)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("open-2")) || rec.Header().Get("Content-Type") != "image/webp" ||
		!strings.Contains(rec.Header().Get("Cache-Control"), "no-store") || !strings.Contains(rec.Header().Get("Cache-Control"), "private") {
		t.Fatalf("open page: %d %v %q", rec.Code, rec.Header(), rec.Body.String())
	}
	// a learner never gets another course's pages: without a code, the locked course's page is refused
	if rec := f.b.raw("GET", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode+"/pages/1", nil); rec.Code != http.StatusForbidden {
		t.Fatalf("a code course's page without the code: %d", rec.Code)
	}
	// …and with a code for course Q, the lesson of course P asked through Q's path is a 404, never the page
	code := f.newCode(f.codeC)
	f.b.must(http.StatusOK, "POST", "/api/v1/courses/"+f.codeC+"/open", map[string]any{"code": code})
	if rec := f.b.raw("GET", "/api/v1/courses/"+f.openC+"/lessons/"+lessonCode+"/pages/1", nil); rec.Code != http.StatusNotFound {
		t.Fatalf("a lesson asked through another course's path: %d", rec.Code)
	}
	if rec := f.b.raw("GET", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode+"/pages/1", nil); rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("code-1")) {
		t.Fatalf("a code course's page with the code: %d", rec.Code)
	}
	// pages outside the lesson
	for _, n := range []string{"0", "3", "61", "x"} {
		if rec := f.b.raw("GET", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode+"/pages/"+n, nil); rec.Code != http.StatusNotFound {
			t.Fatalf("page %s: %d", n, rec.Code)
		}
	}
	// a locked course's text lesson is shut as well
	if rec := f.a.raw("GET", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("lesson of a locked course: %d", rec.Code)
	}
	var textLesson string
	for _, l := range lessonsOf(f.coach, f.codeC) {
		if m(l)["kind"] == "text" {
			textLesson = idOf(l)
		}
	}
	read := m(f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC+"/lessons/"+textLesson, nil))
	if read["content"] != "Xin chào mọi người" || read["minutes"] != 1.0 {
		t.Fatalf("text lesson: %v", read)
	}

	// progress: the user's own, idempotent, remembers the page, resume picks the next unfinished lesson
	put := func(c *apiClient, course, lesson string, body map[string]any) {
		c.must(http.StatusOK, "PUT", "/api/v1/courses/"+course+"/lessons/"+lesson+"/progress", body)
	}
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 2})
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 2})
	d := m(f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC, nil))
	if res := m(d["resume"]); res["lessonId"] == nil || d["doneCount"] != 0.0 {
		t.Fatalf("resume: %v", d)
	}
	var lastPage any
	for _, l := range lessonsOf(f.b, f.codeC) {
		if idOf(l) == lessonCode {
			lastPage = m(l)["lastPage"]
		}
	}
	if lastPage != 2.0 {
		t.Fatalf("remembered page: %v", lastPage)
	}
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 2, "completed": true})
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 1}) // reading on, completion stays
	if summaries(f.b)[f.codeC]["doneCount"] != 1.0 {
		t.Fatalf("done count: %v", summaries(f.b)[f.codeC])
	}
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 1, "completed": false}) // the toggle unmarks
	if summaries(f.b)[f.codeC]["doneCount"] != 0.0 {
		t.Fatal("unmarking did not work")
	}
	put(f.b, f.codeC, lessonCode, map[string]any{"lastPage": 60})
	// A page past the end is stored as the last page (the PDF has 2); resume is the first lesson not finished in reading order, the written one
	for _, l := range lessonsOf(f.b, f.codeC) {
		if idOf(l) == lessonCode && m(l)["lastPage"] != 2.0 {
			t.Fatalf("a page past the end is the last page: %v", l)
		}
	}
	if res := m(m(f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC, nil))["resume"]); res["lessonId"] != textLesson || res["page"] != 1.0 {
		t.Fatalf("resume: %v", res)
	}
	put(f.b, f.codeC, textLesson, map[string]any{"lastPage": 1, "completed": true})
	if res := m(m(f.b.must(http.StatusOK, "GET", "/api/v1/courses/"+f.codeC, nil))["resume"]); res["lessonId"] != lessonCode || res["page"] != 2.0 {
		t.Fatalf("resume after the text lesson is done: opens the PDF at the page it stopped on: %v", res)
	}
	// only for oneself: another user's progress on the same open course is untouched, and a lesson of a locked course cannot be marked
	put(f.b, f.openC, lessonOpen, map[string]any{"lastPage": 2, "completed": true})
	if summaries(f.a)[f.openC]["doneCount"] != 0.0 || summaries(f.b)[f.openC]["doneCount"] != 1.0 {
		t.Fatalf("progress leaked between users: a %v, b %v", summaries(f.a)[f.openC], summaries(f.b)[f.openC])
	}
	if rec := f.a.raw("PUT", "/api/v1/courses/"+f.codeC+"/lessons/"+lessonCode+"/progress", map[string]any{"lastPage": 1}); rec.Code != http.StatusForbidden {
		t.Fatalf("progress on a locked course: %d", rec.Code)
	}
	if rec := f.b.raw("PUT", "/api/v1/courses/"+f.openC+"/lessons/"+lessonCode+"/progress", map[string]any{"lastPage": 1}); rec.Code != http.StatusNotFound {
		t.Fatalf("progress on a lesson of another course: %d", rec.Code)
	}
}

func lessonsOf(c *apiClient, course string) []any {
	var out []any
	for _, p := range list(c.must(http.StatusOK, "GET", "/api/v1/courses/"+course, nil), "parts") {
		out = append(out, list(p, "lessons")...)
	}
	return out
}

func TestCoursesCoachFlowsAndCaps(t *testing.T) {
	f := newCourseFixture(t)
	co := f.coach

	// a learner cannot reach any coach route
	for _, rq := range []struct{ method, path string }{
		{"POST", "/api/v1/courses"}, {"PATCH", "/api/v1/courses/" + f.openC}, {"DELETE", "/api/v1/courses/" + f.openC},
		{"POST", "/api/v1/courses/" + f.openC + "/parts"}, {"POST", "/api/v1/courses/" + f.openC + "/lessons"},
		{"GET", "/api/v1/courses/" + f.openC + "/codes"}, {"POST", "/api/v1/courses/" + f.codeC + "/codes"},
		{"PUT", "/api/v1/courses/" + f.openC + "/lessons/" + uuid.NewString() + "/pages/1"},
	} {
		if rec := f.b.raw(rq.method, rq.path, map[string]any{"title": "x"}); rec.Code != http.StatusForbidden {
			t.Errorf("%s %s as a learner: %d", rq.method, rq.path, rec.Code)
		}
	}

	// validation of a course
	for name, body := range map[string]map[string]any{
		"no title":          {"access": "open"},
		"long title":        {"title": strings.Repeat("a", 101), "access": "open"},
		"bad access":        {"title": "x", "access": "secret"},
		"level, no level":   {"title": "x", "access": "level"},
		"level out of 1..5": {"title": "x", "access": "level", "minLevel": 6},
		"bad tone":          {"title": "x", "access": "open", "tone": 8},
	} {
		if rec := co.raw("POST", "/api/v1/courses", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, rec.Code)
		}
	}
	// a patch that changes the access keeps the rule: level needs its Level, a switch away clears it
	if rec := co.raw("PATCH", "/api/v1/courses/"+f.openC, map[string]any{"access": "level"}); rec.Code != http.StatusBadRequest {
		t.Errorf("open -> level without a Level: %d", rec.Code)
	}
	patched := m(co.must(http.StatusOK, "PATCH", "/api/v1/courses/"+f.levelC, map[string]any{"access": "code", "title": "  Đổi tên  "}))
	if patched["access"] != "code" || patched["minLevel"] != nil || patched["title"] != "Đổi tên" {
		t.Fatalf("patch: %v", patched)
	}
	co.must(http.StatusOK, "PATCH", "/api/v1/courses/"+f.levelC, map[string]any{"access": "level", "minLevel": 4})

	// the body caps: 4 KB for JSON, 1 MB of text (the body has room for escaping), 1 MiB per page (as base64, 1.45 MB of body)
	if rec := co.raw("POST", "/api/v1/courses", map[string]any{"title": "x", "subtitle": strings.Repeat("a", 5000)}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a 5 KB JSON body: %d", rec.Code)
	}
	part := idOf(co.must(http.StatusCreated, "POST", "/api/v1/courses/"+f.openC+"/parts", map[string]any{"title": "Phần 2"}))
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "To", "kind": "text", "content": strings.Repeat("a", 1_000_001)}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("text lesson of 1,000,001 bytes: %d", rec.Code)
	}
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "To", "kind": "text", "content": strings.Repeat("a", 1_200_000)}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("text lesson body of 1.2 MB: %d", rec.Code)
	}
	co.must(http.StatusCreated, "POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "Vừa", "kind": "text", "content": strings.Repeat("a", 1_000_000)})
	pdfID := idOf(co.must(http.StatusCreated, "POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "PDF", "kind": "pdf", "pageCount": 3}))
	pagePath := func(n int) string { return fmt.Sprintf("/api/v1/courses/%s/lessons/%s/pages/%d", f.openC, pdfID, n) }
	big := append(webp("big"), bytes.Repeat([]byte{1}, 1<<20)...)
	if rec := co.raw("PUT", pagePath(1), b64(big)); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a page over 1 MiB: %d", rec.Code)
	}
	if rec := co.raw("PUT", pagePath(1), map[string]any{"data": strings.Repeat("A", 1_500_000)}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("a page body over the cap: %d", rec.Code)
	}
	if rec := co.raw("PUT", pagePath(1), b64([]byte("%PDF-1.7 not an image"))); rec.Code != http.StatusBadRequest {
		t.Errorf("not a WebP: %d", rec.Code)
	}
	if rec := co.raw("PUT", pagePath(1), map[string]any{"data": "!!!not base64"}); rec.Code != http.StatusBadRequest {
		t.Errorf("not base64: %d", rec.Code)
	}
	if rec := co.raw("PUT", pagePath(4), b64(webp("p4"))); rec.Code != http.StatusBadRequest {
		t.Errorf("page 4 of a 3-page lesson: %d", rec.Code)
	}
	if rec := co.raw("PUT", pagePath(0), b64(webp("p0"))); rec.Code != http.StatusBadRequest && rec.Code != http.StatusNotFound {
		t.Errorf("page 0: %d", rec.Code)
	}
	co.must(http.StatusOK, "PUT", pagePath(1), b64(append(webp("ok"), bytes.Repeat([]byte{1}, 1<<19)...)))
	// at most 60 pages in a lesson, 1 to 60
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "61", "kind": "pdf", "pageCount": 61}); rec.Code != http.StatusBadRequest {
		t.Errorf("a 61-page PDF: %d", rec.Code)
	}
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "0", "kind": "pdf", "pageCount": 0}); rec.Code != http.StatusBadRequest {
		t.Errorf("a 0-page PDF: %d", rec.Code)
	}
	co.must(http.StatusCreated, "POST", "/api/v1/courses/"+f.openC+"/lessons", map[string]any{"partId": part, "title": "60", "kind": "pdf", "pageCount": 60})

	// parts and lessons: rename, reorder (every item once), move a lesson to another part, no foreign ids
	parts := list(co.must(http.StatusOK, "GET", "/api/v1/courses/"+f.openC, nil), "parts")
	if len(parts) != 2 {
		t.Fatalf("parts: %v", parts)
	}
	p1, p2 := idOf(parts[0]), idOf(parts[1])
	co.must(http.StatusOK, "PATCH", "/api/v1/courses/"+f.openC+"/parts/"+p2, map[string]any{"title": "Phần hai"})
	co.must(http.StatusOK, "POST", "/api/v1/courses/"+f.openC+"/parts/reorder", map[string]any{"ids": []string{p2, p1}})
	after := list(co.must(http.StatusOK, "GET", "/api/v1/courses/"+f.openC, nil), "parts")
	if idOf(after[0]) != p2 || m(after[0])["title"] != "Phần hai" {
		t.Fatalf("reordered parts: %v", after)
	}
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/parts/reorder", map[string]any{"ids": []string{p1}}); rec.Code != http.StatusBadRequest {
		t.Errorf("a reorder that leaves a part out: %d", rec.Code)
	}
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/parts/reorder", map[string]any{"ids": []string{p1, p1}}); rec.Code != http.StatusBadRequest {
		t.Errorf("a reorder with a part twice: %d", rec.Code)
	}
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/parts/reorder", map[string]any{"ids": []string{p1, uuid.NewString()}}); rec.Code != http.StatusBadRequest {
		t.Errorf("a reorder with a part of nobody's: %d", rec.Code)
	}
	lessons := list(after[1], "lessons")
	if len(lessons) == 0 {
		t.Fatal("part 1 has its lesson")
	}
	moved := idOf(lessons[0])
	co.must(http.StatusOK, "PATCH", "/api/v1/courses/"+f.openC+"/lessons/"+moved, map[string]any{"partId": p2, "title": "Chuyển"})
	if rec := co.raw("PATCH", "/api/v1/courses/"+f.openC+"/lessons/"+moved, map[string]any{"partId": f.codeP}); rec.Code != http.StatusBadRequest {
		t.Errorf("moving a lesson into another course's part: %d", rec.Code)
	}
	if rec := co.raw("PATCH", "/api/v1/courses/"+f.openC+"/lessons/"+pdfID, map[string]any{"content": "text in a PDF"}); rec.Code != http.StatusBadRequest {
		t.Errorf("text on a PDF lesson: %d", rec.Code)
	}
	ids := []string{}
	for _, l := range list(list(co.must(http.StatusOK, "GET", "/api/v1/courses/"+f.openC, nil), "parts")[1], "lessons") {
		ids = append(ids, idOf(l))
	}
	rev := make([]string, len(ids))
	for i, id := range ids {
		rev[len(ids)-1-i] = id
	}
	co.must(http.StatusOK, "POST", "/api/v1/courses/"+f.openC+"/lessons/reorder", map[string]any{"partId": p1, "ids": rev})

	// codes only for a course that opens with a code; the value is shown once
	if rec := co.raw("POST", "/api/v1/courses/"+f.openC+"/codes", nil); rec.Code != http.StatusBadRequest {
		t.Errorf("a code for an open course: %d", rec.Code)
	}
	nc := m(co.must(http.StatusCreated, "POST", "/api/v1/courses/"+f.codeC+"/codes", nil))
	if len(fmt.Sprint(nc["code"])) != 10 || nc["expiresAt"] == nil {
		t.Fatalf("new code: %v", nc)
	}

	// deleting a lesson, a part and a course removes their rows and their files
	co.must(http.StatusOK, "DELETE", "/api/v1/courses/"+f.openC+"/lessons/"+pdfID, nil)
	if rec := co.raw("GET", pagePath(1), nil); rec.Code != http.StatusNotFound {
		t.Errorf("page of a deleted lesson: %d", rec.Code)
	}
	co.must(http.StatusOK, "DELETE", "/api/v1/courses/"+f.openC+"/parts/"+p2, nil)
	co.must(http.StatusOK, "DELETE", "/api/v1/courses/"+f.codeC, nil)
	if rec := co.raw("GET", "/api/v1/courses/"+f.codeC, nil); rec.Code != http.StatusNotFound {
		t.Errorf("a deleted course: %d", rec.Code)
	}
	var left int
	if err := f.pool.QueryRow(context.Background(), `SELECT (SELECT count(*) FROM nutrition.course_parts WHERE course_id = $1) + (SELECT count(*) FROM nutrition.course_codes WHERE course_id = $1)
		+ (SELECT count(*) FROM nutrition.course_lessons WHERE course_id = $1)`, f.codeC).Scan(&left); err != nil || left != 0 {
		t.Errorf("rows left after a course was deleted: %d %v", left, err)
	}
}
