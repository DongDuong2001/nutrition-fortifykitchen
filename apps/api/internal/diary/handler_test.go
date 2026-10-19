package diary

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/auth"
)

func TestHandler_GetDays(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)
	h := NewHandler(svc)

	userID := uuid.New()

	t.Run("Missing from or to parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/days?from=2026-10-15", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		rec := httptest.NewRecorder()

		h.GetDays(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for missing param, got %d", rec.Code)
		}
	})

	t.Run("Valid range", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/days?from=2026-10-15&to=2026-10-18", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		rec := httptest.NewRecorder()

		h.GetDays(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}

		var resp struct {
			Data struct {
				Days []DaySummaryResponse `json:"days"`
			} `json:"data"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if len(resp.Data.Days) != 4 {
			t.Errorf("expected 4 days, got %d", len(resp.Data.Days))
		}
	})

	t.Run("Unauthorized without user", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/days?from=2026-10-15&to=2026-10-18", nil)
		rec := httptest.NewRecorder()

		h.GetDays(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})
}
