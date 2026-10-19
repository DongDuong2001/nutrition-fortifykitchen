package nutrition

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
