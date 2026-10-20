package library

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/auth"
)

// createErrService embeds the Service interface so only CreateSavedMeal needs a body.
type createErrService struct {
	Service
	err error
}

func (s createErrService) CreateSavedMeal(ctx context.Context, userID uuid.UUID, req CreateSavedMealRequest) (*SavedMeal, error) {
	return nil, s.err
}

func postSavedMeal(h *Handler) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/saved-meals", strings.NewReader(`{"name":"x"}`))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, uuid.New()))
	rec := httptest.NewRecorder()
	h.CreateSavedMeal(rec, req)
	return rec
}

func TestCreateSavedMeal_InternalErrorIsNotLeaked(t *testing.T) {
	rec := postSavedMeal(NewHandler(createErrService{err: errors.New("pq: duplicate key saved_meals_pkey")}))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "pq:") || strings.Contains(body, "saved_meals_pkey") {
		t.Errorf("response leaks internal error: %s", body)
	}
	if !strings.Contains(body, "Failed to create saved meal") {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestCreateSavedMeal_ValidationStays400(t *testing.T) {
	rec := postSavedMeal(NewHandler(createErrService{err: ErrSavedMealNameRequired}))
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), ErrSavedMealNameRequired.Error()) {
		t.Fatalf("expected 400 with sentinel message, got %d: %s", rec.Code, rec.Body.String())
	}
}
