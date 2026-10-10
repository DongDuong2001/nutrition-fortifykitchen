package vault

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// HandleWebhook handles POST /api/v1/vault/webhook
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	sig := r.Header.Get("X-Hub-Signature-256")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "failed to read webhook body")
		return
	}

	if !h.service.VerifyGitHubSignature(sig, body) {
		response.Error(w, http.StatusUnauthorized, "invalid webhook signature")
		return
	}

	var payload GitHubWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid github payload: "+err.Error())
		return
	}

	if err := h.service.ProcessGitHubPush(r.Context(), payload); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to process vault push: "+err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Vault push processed successfully", nil)
}

// ListDrafts handles GET /api/v1/admin/drafts (Admin only)
func (h *Handler) ListDrafts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	drafts, err := h.service.ListDrafts(r.Context(), status)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, drafts)
}

// UpdateDraftStatus handles PATCH /api/v1/admin/drafts/{id}/status (Admin only)
func (h *Handler) UpdateDraftStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid draft id")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	draft, err := h.service.UpdateDraftStatus(r.Context(), id, req.Status)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Draft status updated", draft)
}
