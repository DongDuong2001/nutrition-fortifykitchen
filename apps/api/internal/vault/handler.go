package vault

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/logger"
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
		response.Error(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	if err := h.service.ProcessGitHubPush(r.Context(), payload); err != nil {
		logger.Log.Error().Err(err).Str("ref", payload.Ref).Str("commit", payload.After).Msg("failed to process vault push")
		response.Error(w, http.StatusInternalServerError, "Failed to process vault push")
		return
	}

	response.Success(w, http.StatusOK, "Vault push processed successfully", nil)
}

// ListDrafts handles GET /api/v1/admin/drafts (Admin only)
func (h *Handler) ListDrafts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	drafts, err := h.service.ListDrafts(r.Context(), status)
	if err != nil {
		logger.Log.Error().Err(err).Str("status", status).Msg("failed to list vault drafts")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load drafts")
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
		if errors.Is(err, ErrInvalidDraftStatus) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		if errors.Is(err, ErrDraftNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("draft_id", id.String()).Msg("failed to update vault draft status")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to update draft")
		return
	}

	response.Success(w, http.StatusOK, "Draft status updated", draft)
}
