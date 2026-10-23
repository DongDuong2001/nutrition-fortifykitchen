package nutrition

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
)

// createErrService embeds the Service interface so only CreateCustomFood needs a body.
type createErrService struct {
	Service
	err error
}

func (s createErrService) CreateCustomFood(ctx context.Context, userID uuid.UUID, req CreateCustomFoodRequest) (*FoodDetail, error) {
	return nil, s.err
}

func postCustomFood(h *Handler) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/foods/custom", strings.NewReader(`{"name_vi":"x"}`))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
	rec := httptest.NewRecorder()
	h.CreateCustomFood(rec, req)
	return rec
}

func TestCreateCustomFood_InternalErrorIsNotLeaked(t *testing.T) {
	rec := postCustomFood(NewHandler(createErrService{err: errors.New("pq: deadlock detected on foods")}))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "pq:") || strings.Contains(body, "deadlock") {
		t.Errorf("response leaks internal error: %s", body)
	}
	if !strings.Contains(body, "Failed to create custom food") {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestCreateCustomFood_ValidationStays400(t *testing.T) {
	for _, sentinel := range []error{ErrNameRequired, ErrInvalidServingSize, ErrNegativeMacronutrients} {
		rec := postCustomFood(NewHandler(createErrService{err: sentinel}))
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), sentinel.Error()) {
			t.Errorf("%v: expected 400 with sentinel message, got %d: %s", sentinel, rec.Code, rec.Body.String())
		}
	}
}

// searchSpy records the filter SearchFoods was called with.
type searchSpy struct {
	Service
	got FoodSearchFilter
}

func (s *searchSpy) SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error) {
	s.got = filter
	return &FoodSearchResponse{Items: []FoodDetail{}, Total: 0, Page: filter.Page, Limit: filter.Limit}, nil
}

func TestClampFoodsLimit(t *testing.T) {
	tests := []struct {
		name  string
		query string
		limit int
		want  int
	}{
		{"none sent", "", 0, 20},
		{"negative", "", -5, 20},
		{"old paging", "", 500, 500},
		{"catalogue page", "", 5000, 5000},
		{"above the catalogue cap", "", 100000, 5000},
		{"search keeps its cap", "gạo", 5000, 500},
		{"search under its cap", "gạo", 50, 50},
		{"search with none sent", "gạo", 0, 20},
		{"a blank query is still a query", " ", 5000, 500},
	}
	for _, tt := range tests {
		if got := ClampFoodsLimit(tt.query, tt.limit); got != tt.want {
			t.Errorf("%s: ClampFoodsLimit(%q, %d) = %d, want %d", tt.name, tt.query, tt.limit, got, tt.want)
		}
	}
}

func TestSearchFoods_PassesClampedLimit(t *testing.T) {
	tests := []struct {
		target    string
		wantLimit int
		wantPage  int
	}{
		{"/foods?limit=5000&page=2", 5000, 2},
		{"/foods?limit=9999", 5000, 1},
		{"/foods?limit=500&page=3", 500, 3},
		{"/foods?q=g%E1%BA%A1o&limit=5000", 500, 1},
		{"/foods", 20, 1},
	}
	for _, tt := range tests {
		spy := &searchSpy{}
		rec := httptest.NewRecorder()
		NewHandler(spy).SearchFoods(rec, httptest.NewRequest(http.MethodGet, tt.target, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status %d", tt.target, rec.Code)
		}
		if spy.got.Limit != tt.wantLimit || spy.got.Page != tt.wantPage {
			t.Errorf("%s: limit/page = %d/%d, want %d/%d", tt.target, spy.got.Limit, spy.got.Page, tt.wantLimit, tt.wantPage)
		}
		if !strings.Contains(rec.Body.String(), `"limit":`+strconv.Itoa(tt.wantLimit)) {
			t.Errorf("%s: response does not echo limit %d: %s", tt.target, tt.wantLimit, rec.Body.String())
		}
	}
}

// PUT /foods/custom/{id} (Job B)
type updateSpy struct {
	Service
	err     error
	gotUser uuid.UUID
	gotFood uuid.UUID
	gotReq  CreateCustomFoodRequest
	calls   int
}

func (s *updateSpy) UpdateCustomFood(ctx context.Context, userID, foodID uuid.UUID, req CreateCustomFoodRequest) (*FoodDetail, error) {
	s.calls++
	s.gotUser, s.gotFood, s.gotReq = userID, foodID, req
	if s.err != nil {
		return nil, s.err
	}
	return &FoodDetail{ID: foodID, NameVi: req.NameVi, IsCustom: true, Source: "custom"}, nil
}

func putCustomFood(h *Handler, id, body string, signedIn bool) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPut, "/foods/custom/"+id, strings.NewReader(body))
	rc := chi.NewRouteContext()
	rc.URLParams.Add("id", id)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rc)
	if signedIn {
		ctx = context.WithValue(ctx, auth.UserIDKey, uuid.New())
	}
	rec := httptest.NewRecorder()
	h.UpdateCustomFood(rec, req.WithContext(ctx))
	return rec
}

func TestUpdateCustomFood_OKReturnsTheFoodWithTheSameID(t *testing.T) {
	spy := &updateSpy{}
	id := uuid.New()
	rec := putCustomFood(NewHandler(spy), id.String(), `{"name_vi":"Bánh","serving_size":50,"calories":120}`, true)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if spy.gotFood != id || spy.gotReq.NameVi != "Bánh" || spy.gotReq.ServingSize != 50 {
		t.Errorf("service got id %s req %+v", spy.gotFood, spy.gotReq)
	}
	if !strings.Contains(rec.Body.String(), id.String()) {
		t.Errorf("body should carry the food: %s", rec.Body.String())
	}
}

func TestUpdateCustomFood_NotYoursOrGoneIs404Never403(t *testing.T) {
	spy := &updateSpy{err: ErrFoodNotFound}
	rec := putCustomFood(NewHandler(spy), uuid.NewString(), `{"name_vi":"x","serving_size":1}`, true)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
	rec = putCustomFood(NewHandler(&updateSpy{}), "not-a-uuid", `{"name_vi":"x","serving_size":1}`, true)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("a bad id: expected 404, got %d", rec.Code)
	}
}

func TestUpdateCustomFood_ValidationIs400AndInternalErrorIsNotLeaked(t *testing.T) {
	for _, sentinel := range []error{ErrNameRequired, ErrInvalidServingSize, ErrNegativeMacronutrients} {
		rec := putCustomFood(NewHandler(&updateSpy{err: sentinel}), uuid.NewString(), `{"name_vi":"x"}`, true)
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), sentinel.Error()) {
			t.Errorf("%v: expected 400 with sentinel message, got %d: %s", sentinel, rec.Code, rec.Body.String())
		}
	}
	rec := putCustomFood(NewHandler(&updateSpy{err: errors.New("pq: deadlock detected on foods")}), uuid.NewString(), `{"name_vi":"x"}`, true)
	if rec.Code != http.StatusInternalServerError || strings.Contains(rec.Body.String(), "pq:") {
		t.Errorf("expected a clean 500, got %d: %s", rec.Code, rec.Body.String())
	}
	spy := &updateSpy{}
	if rec := putCustomFood(NewHandler(spy), uuid.NewString(), `{not json`, true); rec.Code != http.StatusBadRequest || spy.calls != 0 {
		t.Errorf("a broken body: expected 400 and no service call, got %d (%d calls)", rec.Code, spy.calls)
	}
}

func TestUpdateCustomFood_NeedsSignIn(t *testing.T) {
	spy := &updateSpy{}
	rec := putCustomFood(NewHandler(spy), uuid.NewString(), `{"name_vi":"x","serving_size":1}`, false)
	if rec.Code != http.StatusUnauthorized || spy.calls != 0 {
		t.Fatalf("expected 401 and no service call, got %d (%d calls)", rec.Code, spy.calls)
	}
}
