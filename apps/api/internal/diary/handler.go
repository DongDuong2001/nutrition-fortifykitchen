package diary

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// GetDay handles GET /api/v1/days/{date}
func (h *Handler) GetDay(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	if date == "" {
		date = GetServerToday()
	}

	res, err := h.service.GetDay(r.Context(), userID, date)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load day")
		return
	}

	response.JSON(w, http.StatusOK, res)
}

// CreateEntry handles POST /api/v1/days/{date}/entries
func (h *Handler) CreateEntry(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	if date == "" {
		date = GetServerToday()
	}

	var req CreateEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	entry, daySummary, err := h.service.CreateEntry(r.Context(), userID, date, req)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, map[string]any{
		"entry":       entry,
		"day_summary": daySummary,
	})
}

// UpdateEntry handles PATCH /api/v1/entries/{id}
func (h *Handler) UpdateEntry(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
		return
	}

	var req UpdateEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	entry, daySummary, err := h.service.UpdateEntry(r.Context(), userID, entryID, req)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrEntryNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
			return
		}
		if errors.Is(err, ErrRestoreWindowExpired) {
			response.Error(w, http.StatusGone, response.CodeValidationFailed, "Restore window expired (must be within 10 seconds)")
			return
		}
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"entry":       entry,
		"day_summary": daySummary,
	})
}

// RestoreEntry handles POST /api/v1/entries/{id}/restore
func (h *Handler) RestoreEntry(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
		return
	}

	entry, daySummary, err := h.service.RestoreEntry(r.Context(), userID, entryID)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrEntryNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
			return
		}
		if errors.Is(err, ErrRestoreWindowExpired) {
			response.Error(w, http.StatusGone, response.CodeValidationFailed, "Restore window expired (must be within 10 seconds)")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to restore entry")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"entry":       entry,
		"day_summary": daySummary,
	})
}

// DeleteEntry handles DELETE /api/v1/entries/{id}
func (h *Handler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
		return
	}

	err = h.service.DeleteEntry(r.Context(), userID, entryID)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrEntryNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to delete entry")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"success":    true,
		"deleted_id": entryID,
	})
}

// CopyYesterday handles POST /api/v1/days/{date}/copy-yesterday
func (h *Handler) CopyYesterday(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	if date == "" {
		date = GetServerToday()
	}

	var req CopyYesterdayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	res, err := h.service.CopyYesterday(r.Context(), userID, date, req)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to copy yesterday")
		return
	}

	response.JSON(w, http.StatusCreated, res)
}

// DeleteMeal handles DELETE /api/v1/days/{date}/meals/{meal}
func (h *Handler) DeleteMeal(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	meal := chi.URLParam(r, "meal")

	err = h.service.DeleteMeal(r.Context(), userID, date, meal)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to delete meal")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// SetTraining handles PUT /api/v1/days/{date}/training
func (h *Handler) SetTraining(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	var req SetTrainingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	res, err := h.service.SetTraining(r.Context(), userID, date, req.TrainingMinutes)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrInvalidTrainingMinutes) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to set training")
		return
	}

	response.JSON(w, http.StatusOK, res)
}
