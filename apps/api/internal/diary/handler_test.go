package diary

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

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

func postEntry(t *testing.T, h *Handler, userID uuid.UUID, date string, payload map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/days/"+date+"/entries", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("date", date)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()
	h.CreateEntry(rec, req)
	return rec
}

func TestHandler_CreateEntry_MadeAt(t *testing.T) {
	ict := hoChiMinhLocation
	daysAgo := func(n int) time.Time { return time.Now().In(ict).AddDate(0, 0, -n) }
	dateOf := func(tm time.Time) string { return tm.Format("2006-01-02") }
	entry := func(extra map[string]any) map[string]any {
		m := map[string]any{"id": uuid.New(), "kind": "food", "food_id": uuid.New(), "meal_slot": "lunch", "grams": 100}
		for k, v := range extra {
			m[k] = v
		}
		return m
	}
	code := func(rec *httptest.ResponseRecorder) string {
		var resp struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		return resp.Error.Code
	}

	cases := []struct {
		name     string
		dayAgo   int
		extra    func() map[string]any
		wantHTTP int
		wantCode string
	}{
		{"3 days back, made then (17/10 case)", 3, func() map[string]any { return map[string]any{"made_at": daysAgo(3).Format(time.RFC3339)} }, http.StatusCreated, ""},
		{"3 days back, no made_at", 3, func() map[string]any { return nil }, http.StatusConflict, "PAST_DAY_READ_ONLY"},
		{"made 15 days ago", 15, func() map[string]any { return map[string]any{"made_at": daysAgo(15).Format(time.RFC3339)} }, http.StatusConflict, "PAST_DAY_READ_ONLY"},
		{"made in the future", 0, func() map[string]any {
			return map[string]any{"made_at": time.Now().Add(time.Hour).Format(time.RFC3339)}
		}, http.StatusConflict, "PAST_DAY_READ_ONLY"},
		{"malformed made_at", 0, func() map[string]any { return map[string]any{"made_at": "last night"} }, http.StatusBadRequest, "VALIDATION_FAILED"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			h := NewHandler(NewService(newMockDiaryRepo()))
			rec := postEntry(t, h, uuid.New(), dateOf(daysAgo(c.dayAgo)), entry(c.extra()))
			if rec.Code != c.wantHTTP {
				t.Fatalf("want %d, got %d: %s", c.wantHTTP, rec.Code, rec.Body.String())
			}
			if c.wantCode != "" && code(rec) != c.wantCode {
				t.Fatalf("want code %s, got %s", c.wantCode, code(rec))
			}
		})
	}
}

func TestHandler_DeleteEntry_MadeAtQuery(t *testing.T) {
	old := time.Now().In(hoChiMinhLocation).AddDate(0, 0, -3)
	run := func(query string) int {
		repo := newMockDiaryRepo()
		h := NewHandler(NewService(repo))
		entryID := uuid.New()
		foodID := uuid.New()
		repo.entries[entryID] = &DiaryEntryItem{ID: entryID, Kind: "food", FoodID: &foodID, MealSlot: "lunch", Grams: 100}
		repo.entryDates[entryID] = old.Format("2006-01-02")
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/entries/"+entryID.String()+query, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", entryID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rec := httptest.NewRecorder()
		h.DeleteEntry(rec, req)
		return rec.Code
	}
	if got := run(""); got != http.StatusConflict {
		t.Fatalf("delete of a 3-day-old entry without made_at: want 409, got %d", got)
	}
	if got := run("?made_at=" + url.QueryEscape(old.Format(time.RFC3339))); got != http.StatusOK {
		t.Fatalf("delete with made_at from that day: want 200, got %d", got)
	}
}
