package payment

import (
	"encoding/json"
	"net/http"

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
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if !h.service.VerifySignature(payload) {
		response.Error(w, http.StatusUnauthorized, "invalid payment signature")
		return
	}

	if err := h.service.ProcessPaymentWebhook(r.Context(), payload); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to process payment: "+err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Payment webhook received successfully", map[string]any{
		"orderCode": payload.Data.OrderCode,
	})
}
