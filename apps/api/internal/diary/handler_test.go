package diary

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
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

	t.Run("Database error maps to 500 without leaking error text", func(t *testing.T) {
		repoWithErr := newMockDiaryRepo()
		repoWithErr.dbError = errors.New("raw postgres error pq: relation does not exist")
		hErr := NewHandler(NewService(repoWithErr))

		req := httptest.NewRequest(http.MethodGet, "/api/v1/days?from=2026-10-15&to=2026-10-18", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		rec := httptest.NewRecorder()

		hErr.GetDays(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("expected 500 for DB error, got %d: %s", rec.Code, rec.Body.String())
		}
		if strings.Contains(rec.Body.String(), "postgres") || strings.Contains(rec.Body.String(), "relation") {
			t.Errorf("DB error leaked to response body: %s", rec.Body.String())
		}
	})
}

func TestHandler_CreateEntry_IDConflict(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)
	h := NewHandler(svc)

	userID := uuid.New()
	conflictID := uuid.New()
	repo.conflictIDs[conflictID] = true
	foodID := uuid.New()

	body, _ := json.Marshal(map[string]any{
		"id":        conflictID,
		"kind":      "food",
		"food_id":   foodID,
		"meal_slot": "lunch",
		"grams":     100,
	})

	today := GetServerToday()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/days/"+today+"/entries", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("date", today)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rec := httptest.NewRecorder()
	h.CreateEntry(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Error.Code != "ID_CONFLICT" {
		t.Errorf("expected error code ID_CONFLICT, got %s", resp.Error.Code)
	}
}

func TestHandler_RestoreEntry_Replay(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)
	h := NewHandler(svc)

	userID := uuid.New()
	entryID := uuid.New()
	foodID := uuid.New()

	repo.entries[entryID] = &DiaryEntryItem{
		ID:           entryID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		ServingLabel: "100 g",
		Grams:        100,
	}
	repo.entryDates[entryID] = GetServerToday()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/entries/"+entryID.String()+"/restore", nil)
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", entryID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rec := httptest.NewRecorder()
	h.RestoreEntry(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on replayed restore, got %d: %s", rec.Code, rec.Body.String())
	}
}
