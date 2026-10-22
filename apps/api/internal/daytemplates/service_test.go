package daytemplates_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/daytemplates"
)

var now = time.Date(2026, 10, 22, 10, 0, 0, 0, time.UTC)

const oneMeal = `[{"slot":"breakfast","items":[{"foodId":"f-1","servingLabel":"1 tô","grams":500}]}]`

func body(name, tag, meals string) daytemplates.PutRequest {
	return daytemplates.PutRequest{Name: name, Tag: tag, Meals: json.RawMessage(meals)}
}

func TestValidate_Valid(t *testing.T) {
	id := uuid.New()
	tpl, errs := daytemplates.Validate(id, body("  Ngày tập  ", "tap", `[
		{"slot":"breakfast","items":[{"foodId":"f-1","servingLabel":"1 tô","grams":500}]},
		{"slot":"pre_workout","items":[{"foodId":"f-2","servingLabel":"","grams":0},{"foodId":"f-3","servingLabel":"100 g","grams":5000}]}
	]`), now)
	if errs != nil {
		t.Fatal(errs)
	}
	if tpl.ID != id || tpl.Name != "Ngày tập" || tpl.Tag != "tap" || len(tpl.Meals) != 2 || len(tpl.Meals[1].Items) != 2 {
		t.Fatalf("got %+v", tpl)
	}
	if !tpl.CreatedAt.Equal(now) {
		t.Errorf("createdAt left out: want the server time, got %v", tpl.CreatedAt)
	}
}

func TestValidate_CreatedAt(t *testing.T) {
	past := "2026-10-01T08:30:00.123Z"
	req := body("A", "nghi", oneMeal)
	req.CreatedAt = &past
	tpl, errs := daytemplates.Validate(uuid.New(), req, now)
	if errs != nil || tpl.CreatedAt.Format(time.RFC3339Nano) != past {
		t.Fatalf("a past createdAt is kept: %v %v", tpl.CreatedAt, errs)
	}

	future := now.Add(time.Hour).Format(time.RFC3339)
	req.CreatedAt = &future
	if tpl, _ := daytemplates.Validate(uuid.New(), req, now); !tpl.CreatedAt.Equal(now) {
		t.Errorf("a createdAt ahead of the server becomes the server time, got %v", tpl.CreatedAt)
	}

	bad := "yesterday"
	req.CreatedAt = &bad
	if _, errs := daytemplates.Validate(uuid.New(), req, now); errs["createdAt"] == "" {
		t.Errorf("a createdAt that is not RFC 3339 is refused")
	}
}

func TestValidate_Limits(t *testing.T) {
	items := func(n int, grams float64) string {
		parts := make([]string, n)
		for i := range parts {
			parts[i] = fmt.Sprintf(`{"foodId":"f-%d","servingLabel":"1","grams":%v}`, i, grams)
		}
		return "[" + strings.Join(parts, ",") + "]"
	}
	allSlots := `[{"slot":"breakfast","items":[{"foodId":"a","servingLabel":"","grams":1}]},
		{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":1}]},
		{"slot":"pre_workout","items":[{"foodId":"a","servingLabel":"","grams":1}]},
		{"slot":"snack","items":[{"foodId":"a","servingLabel":"","grams":1}]},
		{"slot":"dinner","items":[{"foodId":"a","servingLabel":"","grams":1}]}]`
	ok := []daytemplates.PutRequest{
		body(strings.Repeat("ă", 60), "khac", oneMeal),
		body("A", "tap", allSlots),
		body("A", "tap", `[{"slot":"lunch","items":`+items(40, 5000)+`}]`),
	}
	for _, req := range ok {
		if _, errs := daytemplates.Validate(uuid.New(), req, now); errs != nil {
			t.Errorf("%s / %s: refused: %v", req.Name, req.Meals, errs)
		}
	}

	cases := []struct {
		req           daytemplates.PutRequest
		field, saying string
	}{
		{body("", "tap", oneMeal), "name", "1–60"},
		{body("   ", "tap", oneMeal), "name", "1–60"},
		{body(strings.Repeat("ă", 61), "tap", oneMeal), "name", "1–60"},
		{body("A", "gym", oneMeal), "tag", "tap, nghi, khac"},
		{body("A", "tap", ``), "meals", "1–5"},
		{body("A", "tap", `null`), "meals", "1–5"},
		{body("A", "tap", `[]`), "meals", "1–5"},
		{body("A", "tap", `{"slot":"lunch"}`), "meals", "1–5"},
		{body("A", "tap", strings.Replace(allSlots, "]", `]},{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":1}]`, 1)), "meals", ""},
		{body("A", "tap", `[{"slot":"brunch","items":[{"foodId":"a","servingLabel":"","grams":1}]}]`), "meals", "meals[0].slot"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":1}]},{"slot":"lunch","items":[{"foodId":"b","servingLabel":"","grams":1}]}]`), "meals", "already"},
		{body("A", "tap", `[{"slot":"lunch","items":[]}]`), "meals", "1–40"},
		{body("A", "tap", `[{"slot":"lunch","items":`+items(41, 1)+`}]`), "meals", "1–40"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"servingLabel":"","grams":1}]}]`), "meals", "foodId"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":" ","servingLabel":"","grams":1}]}]`), "meals", "foodId"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":"a","grams":1}]}]`), "meals", "servingLabel"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":-1}]}]`), "meals", "0 and 5000"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":5001}]}]`), "meals", "0 and 5000"},
		{body("A", "tap", `[{"slot":"lunch","items":[{"foodId":"a","servingLabel":"","grams":"100"}]}]`), "meals", "1–5"},
	}
	for _, tc := range cases {
		_, errs := daytemplates.Validate(uuid.New(), tc.req, now)
		if !strings.Contains(errs[tc.field], tc.saying) || errs[tc.field] == "" {
			t.Errorf("%q %q %s: want an error on %s saying %q, got %v", tc.req.Name, tc.req.Tag, tc.req.Meals, tc.field, tc.saying, errs)
		}
	}
}

// ---- handler: status codes ----

type stubRepo struct {
	upsertErr error
	deleted   []uuid.UUID
}

func (s *stubRepo) List(ctx context.Context, userID uuid.UUID) ([]daytemplates.Template, error) {
	return []daytemplates.Template{}, nil
}

func (s *stubRepo) Upsert(ctx context.Context, userID uuid.UUID, t daytemplates.Template) (*daytemplates.Template, error) {
	if s.upsertErr != nil {
		return nil, s.upsertErr
	}
	return &t, nil
}

func (s *stubRepo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	s.deleted = append(s.deleted, id)
	return nil
}

func serve(h http.HandlerFunc, method, id, payload string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/api/v1/day-templates/"+id, strings.NewReader(payload))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

func TestHandler_Statuses(t *testing.T) {
	valid := `{"name":"Ngày tập","tag":"tap","meals":` + oneMeal + `}`
	cases := []struct {
		name    string
		repoErr error
		id      string
		payload string
		status  int
		code    string
	}{
		{"saved", nil, uuid.NewString(), valid, http.StatusOK, ""},
		{"id not a uuid", nil, "dt-123", valid, http.StatusBadRequest, "VALIDATION_FAILED"},
		{"bad body", nil, uuid.NewString(), `{`, http.StatusBadRequest, "VALIDATION_FAILED"},
		{"bad field", nil, uuid.NewString(), `{"name":"","tag":"tap","meals":` + oneMeal + `}`, http.StatusBadRequest, "VALIDATION_FAILED"},
		{"another user's id", daytemplates.ErrIDConflict, uuid.NewString(), valid, http.StatusConflict, "ID_CONFLICT"},
		{"limit", daytemplates.ErrLimit, uuid.NewString(), valid, http.StatusConflict, "CONFLICT"},
		{"internal error not leaked", errors.New("pq: secret detail"), uuid.NewString(), valid, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h := daytemplates.NewHandler(daytemplates.NewService(&stubRepo{upsertErr: tc.repoErr}))
			rec := serve(h.Put, "PUT", tc.id, tc.payload)
			if rec.Code != tc.status {
				t.Fatalf("status %d, want %d: %s", rec.Code, tc.status, rec.Body.String())
			}
			if strings.Contains(rec.Body.String(), "secret") {
				t.Fatalf("internal error leaked: %s", rec.Body.String())
			}
			if tc.code != "" && !strings.Contains(rec.Body.String(), `"code":"`+tc.code+`"`) {
				t.Fatalf("want code %s: %s", tc.code, rec.Body.String())
			}
		})
	}
}

func TestHandler_DeleteIsIdempotent(t *testing.T) {
	repo := &stubRepo{}
	h := daytemplates.NewHandler(daytemplates.NewService(repo))
	id := uuid.NewString()
	for i := 0; i < 2; i++ {
		if rec := serve(h.Delete, "DELETE", id, ""); rec.Code != http.StatusOK {
			t.Fatalf("delete %d: status %d", i+1, rec.Code)
		}
	}
	if rec := serve(h.Delete, "DELETE", "nope", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("delete of a non-uuid: status %d", rec.Code)
	}
}
