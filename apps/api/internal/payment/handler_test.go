package payment_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/payment"
)

type stubService struct {
	verifyOK   bool
	processErr error
}

func (s stubService) VerifySignature(payload payment.PayOSWebhookPayload) bool { return s.verifyOK }

func (s stubService) ProcessPaymentWebhook(ctx context.Context, payload payment.PayOSWebhookPayload) error {
	return s.processErr
}

func (s stubService) CreatePaymentLink(ctx context.Context, userID uuid.UUID, req payment.CreatePaymentLinkRequest) (*payment.CreatePaymentLinkResponse, error) {
	return &payment.CreatePaymentLinkResponse{
		OrderCode:   12345,
		Amount:      99000,
		CheckoutURL: "https://pay.payos.vn/web/12345",
		Status:      "PENDING",
	}, nil
}

func TestWebhook_ProcessErrorIsNotLeaked(t *testing.T) {
	h := payment.NewHandler(stubService{verifyOK: true, processErr: errors.New("pq: relation payments secret_table does not exist")})
	req := httptest.NewRequest(http.MethodPost, "/payments/webhook", strings.NewReader(`{"code":"00","data":{"orderCode":42}}`))
	rec := httptest.NewRecorder()

	h.HandleWebhook(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "secret_table") || strings.Contains(body, "pq:") {
		t.Errorf("response leaks internal error: %s", body)
	}
	if !strings.Contains(body, "Failed to process payment") || !strings.Contains(body, `"code":"INTERNAL_SERVER_ERROR"`) {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestWebhook_BadJSONDoesNotEchoDecoderError(t *testing.T) {
	h := payment.NewHandler(stubService{verifyOK: true})
	req := httptest.NewRequest(http.MethodPost, "/payments/webhook", strings.NewReader(`{"code": 5`))
	rec := httptest.NewRecorder()

	h.HandleWebhook(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "EOF") || strings.Contains(body, "unexpected") || strings.Contains(body, "cannot unmarshal") {
		t.Errorf("response echoes decoder error: %s", body)
	}
	if !strings.Contains(body, "Invalid request body") {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestWebhook_BadSignatureIs401(t *testing.T) {
	h := payment.NewHandler(stubService{verifyOK: false})
	req := httptest.NewRequest(http.MethodPost, "/payments/webhook", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	h.HandleWebhook(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestCreatePaymentLink_UnauthorizedWithoutAuth(t *testing.T) {
	h := payment.NewHandler(stubService{verifyOK: true})
	req := httptest.NewRequest(http.MethodPost, "/payments/create-link", strings.NewReader(`{"plan":"pro_monthly"}`))
	rec := httptest.NewRecorder()

	h.CreatePaymentLink(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestCreatePaymentLink_SuccessWithAuth(t *testing.T) {
	h := payment.NewHandler(stubService{verifyOK: true})
	req := httptest.NewRequest(http.MethodPost, "/payments/create-link", strings.NewReader(`{"plan":"pro_yearly"}`))
	ctx := context.WithValue(req.Context(), auth.UserIDKey, uuid.New())
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.CreatePaymentLink(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "https://pay.payos.vn/web/12345") {
		t.Errorf("expected checkoutUrl in response, got %s", rec.Body.String())
	}
}
