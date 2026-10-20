package coaching

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
)

const secretDBError = "pq: connection to 10.0.0.5:5432 refused (password=hunter2)"

// stubService returns a fixed error from every method.
type stubService struct {
	err error
}

func (s stubService) Apply(ctx context.Context, userID uuid.UUID, req ApplyCoachRequest) (*CoachApplication, error) {
	return nil, s.err
}

func (s stubService) GetMyApplication(ctx context.Context, userID uuid.UUID) (*CoachApplication, error) {
	return nil, s.err
}

func (s stubService) ListApplications(ctx context.Context, status string) ([]CoachApplication, error) {
	return nil, s.err
}

func (s stubService) UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) (*CoachApplication, error) {
	return nil, s.err
}

func authed(req *http.Request) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
}

func TestHandler_InternalErrorsAreNotLeaked(t *testing.T) {
	h := NewHandler(stubService{err: errors.New(secretDBError)})
	appID := uuid.New().String()

	tests := []struct {
		name    string
		method  string
		target  string
		body    string
		handler http.HandlerFunc
		want    string
	}{
		{"apply", http.MethodPost, "/coaches/apply", `{"name":"A","email":"a@b.c"}`, h.Apply, "Failed to submit application"},
		{"my application", http.MethodGet, "/coaches/my-application", "", h.GetMyApplication, "Failed to load application"},
		{"list", http.MethodGet, "/admin/coach-applications", "", h.ListApplications, "Failed to load applications"},
		{"update status", http.MethodPatch, "/admin/coach-applications/" + appID + "/status", `{"status":"approved"}`, h.UpdateStatus, "Failed to update application"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := authed(httptest.NewRequest(tt.method, tt.target, strings.NewReader(tt.body)))
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", appID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			rec := httptest.NewRecorder()

			tt.handler(rec, req)

			if rec.Code != http.StatusInternalServerError {
				t.Fatalf("expected 500, got %d", rec.Code)
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

func TestHandler_BadJSONDoesNotEchoDecoderError(t *testing.T) {
	h := NewHandler(stubService{})
	appID := uuid.New().String()

	for name, call := range map[string]func(http.ResponseWriter, *http.Request){
		"apply":         h.Apply,
		"update status": h.UpdateStatus,
	} {
		t.Run(name, func(t *testing.T) {
			req := authed(httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"name": 12`)))
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", appID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			rec := httptest.NewRecorder()

			call(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d", rec.Code)
			}
			body := rec.Body.String()
			if strings.Contains(body, "unexpected") || strings.Contains(body, "EOF") || strings.Contains(body, "json") {
				t.Errorf("response echoes decoder error: %s", body)
			}
			if !strings.Contains(body, "Invalid request body") || !strings.Contains(body, `"code":"VALIDATION_FAILED"`) {
				t.Errorf("unexpected body: %s", body)
			}
		})
	}
}

func TestHandler_SentinelErrorsKeepTheirMessages(t *testing.T) {
	h := NewHandler(stubService{err: ErrInvalidEmail})
	req := authed(httptest.NewRequest(http.MethodPost, "/coaches/apply", strings.NewReader(`{}`)))
	rec := httptest.NewRecorder()

	h.Apply(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), ErrInvalidEmail.Error()) {
		t.Errorf("expected sentinel message, got %s", rec.Body.String())
	}
}
