package payment

import (
	"encoding/json"
	"net/http"

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
