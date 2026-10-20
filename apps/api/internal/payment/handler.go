package payment

import (
	"encoding/json"
	"net/http"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/logger"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// HandleWebhook handles POST /api/v1/payments/webhook
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	var payload PayOSWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if !h.service.VerifySignature(payload) {
		response.Error(w, http.StatusUnauthorized, "invalid payment signature")
		return
	}

	if err := h.service.ProcessPaymentWebhook(r.Context(), payload); err != nil {
		logger.Log.Error().Err(err).Int64("order_code", payload.Data.OrderCode).Msg("failed to process payment webhook")
		response.Error(w, http.StatusInternalServerError, "Failed to process payment")
		return
	}

	response.Success(w, http.StatusOK, "Payment webhook received successfully", map[string]any{
		"orderCode": payload.Data.OrderCode,
	})
}

// CreatePaymentLink handles POST /api/v1/payments/create-link
func (h *Handler) CreatePaymentLink(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Sign in required")
		return
	}

	var req CreatePaymentLinkRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	res, err := h.service.CreatePaymentLink(r.Context(), userID, req)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to create payment link")
		response.Error(w, http.StatusInternalServerError, "Failed to create payment link")
		return
	}

	response.JSON(w, http.StatusCreated, res)
}
