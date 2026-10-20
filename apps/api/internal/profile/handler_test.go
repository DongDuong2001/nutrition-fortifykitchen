package profile_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/profile"
)

const secretDBError = "pq: connection to 10.0.0.5:5432 refused (password=hunter2)"

type stubService struct {
	err error
}

func (s stubService) GetProfile(ctx context.Context, userID uuid.UUID) (*profile.Profile, error) {
	return nil, s.err
}

func (s stubService) UpsertProfile(ctx context.Context, userID uuid.UUID, req profile.UpsertProfileRequest) (*profile.Profile, error) {
	return nil, s.err
}

func (s stubService) GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]profile.WeightLog, error) {
	return nil, s.err
}

func (s stubService) UpsertWeight(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error {
	return s.err
}

func (s stubService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	return s.err
}

const validProfileBody = `{"sex":"male","goal":"cut","weight_kg":70,"birth_year":1990}`

func call(h http.HandlerFunc, method, target, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("date", "2026-10-20")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

func TestHandler_InternalErrorsAreNotLeaked(t *testing.T) {
	h := profile.NewHandler(stubService{err: errors.New(secretDBError)})

	tests := []struct {
		name    string
		method  string
		target  string
		body    string
		handler http.HandlerFunc
		want    string
	}{
		{"get me", http.MethodGet, "/me", "", h.GetMe, "Failed to load profile"},
		{"update profile", http.MethodPut, "/me/profile", validProfileBody, h.UpdateProfile, "Failed to save profile"},
		{"weight logs", http.MethodGet, "/me/weight", "", h.GetWeightLogs, "Failed to load weight logs"},
		{"upsert weight", http.MethodPut, "/me/weight/2026-10-20", `{"weight_kg":70}`, h.UpsertWeight, "Failed to save weight"},
		{"delete me", http.MethodDelete, "/me", "", h.DeleteMe, "Failed to delete account"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := call(tt.handler, tt.method, tt.target, tt.body)

			if rec.Code != http.StatusInternalServerError {
				t.Fatalf("expected 500, got %d: %s", rec.Code, rec.Body.String())
			}
			body := rec.Body.String()
			if strings.Contains(body, "hunter2") || strings.Contains(body, "10.0.0.5") {
				t.Errorf("response leaks internal error: %s", body)
			}
			if !strings.Contains(body, tt.want) {
				t.Errorf("expected message %q in %s", tt.want, body)
			}
			if !strings.Contains(body, `"code":"INTERNAL_SERVER_ERROR"`) {
				t.Errorf("expected INTERNAL_SERVER_ERROR code in %s", body)
			}
		})
	}
}

func TestHandler_ValidationSentinelsStay400(t *testing.T) {
	h := profile.NewHandler(stubService{err: profile.ErrInvalidWeight})

	rec := call(h.UpdateProfile, http.MethodPut, "/me/profile", validProfileBody)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), profile.ErrInvalidWeight.Error()) {
		t.Errorf("expected sentinel message, got %s", rec.Body.String())
	}

	rec = call(h.UpsertWeight, http.MethodPut, "/me/weight/2026-10-20", `{"weight_kg":70}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestHandler_NotFoundStays404(t *testing.T) {
	h := profile.NewHandler(stubService{err: profile.ErrProfileNotFound})
	rec := call(h.GetMe, http.MethodGet, "/me", "")
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), `"code":"PROFILE_MISSING"`) {
		t.Fatalf("expected 404 PROFILE_MISSING, got %d: %s", rec.Code, rec.Body.String())
	}
}
