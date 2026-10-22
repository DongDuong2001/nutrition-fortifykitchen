package daytemplates

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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

// List handles GET /api/v1/day-templates: the user's live templates, newest first.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	list, err := h.service.List(r.Context(), userID)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to list day templates")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load day templates")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"items": list})
}

// Put handles PUT /api/v1/day-templates/{id}: create or replace, the same result when sent again.
func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.FieldErrors(w, http.StatusBadRequest, "id must be a UUID", map[string]string{"id": "id must be a UUID"})
		return
	}

	var req PutRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, MaxBodyBytes)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body")
		return
	}

	t, err := h.service.Put(r.Context(), userID, id, req)
	if err != nil {
		var fieldErrs FieldErrors
		switch {
		case errors.As(err, &fieldErrs):
			response.FieldErrors(w, http.StatusBadRequest, fieldErrs.Error(), fieldErrs)
		case errors.Is(err, ErrIDConflict):
			response.Error(w, http.StatusConflict, response.CodeIDConflict, "This id is already used")
		case errors.Is(err, ErrLimit):
			response.Error(w, http.StatusConflict, response.CodeConflict, "At most 50 day templates")
		default:
			logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to save day template")
			response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to save day template")
		}
		return
	}

	response.JSON(w, http.StatusOK, t)
}

// Delete handles DELETE /api/v1/day-templates/{id}: a soft delete, 200 again when sent again (or for an id that is
// not the user's: nothing about other users' ids is told).
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.FieldErrors(w, http.StatusBadRequest, "id must be a UUID", map[string]string{"id": "id must be a UUID"})
		return
	}

	if err := h.service.Delete(r.Context(), userID, id); err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to delete day template")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to delete day template")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}
