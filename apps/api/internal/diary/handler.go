package diary

import (
	"context"
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

// madeAtContext reads the optional made_at (body value first, then ?made_at=) and carries it in the
// context so the date rule judges the write by when the user made it. A bad value is a 400.
func madeAtContext(w http.ResponseWriter, r *http.Request, bodyValue string) (context.Context, bool) {
	raw := bodyValue
	if raw == "" {
		raw = r.URL.Query().Get("made_at")
	}
	madeAt, err := ParseMadeAt(raw)
	if err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		return nil, false
	}
	if madeAt == nil {
		return r.Context(), true
	}
	return WithMadeAt(r.Context(), *madeAt), true
}

// GetDays handles GET /api/v1/days?from=YYYY-MM-DD&to=YYYY-MM-DD
func (h *Handler) GetDays(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "from and to parameters are required")
		return
	}

	days, err := h.service.GetDaysRange(r.Context(), userID, from, to)
	if err != nil {
		if errors.Is(err, ErrInvalidDateFormat) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid date format, expected YYYY-MM-DD")
			return
		}
		if errors.Is(err, ErrInvalidDateRange) || errors.Is(err, ErrRangeTooLarge) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("from", from).Str("to", to).Msg("failed to load days range")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load days")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"days": days,
	})
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
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", date).Msg("failed to load day")
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

	ctx, ok := madeAtContext(w, r, req.MadeAt)
	if !ok {
		return
	}
	entry, daySummary, err := h.service.CreateEntry(ctx, userID, date, req)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrFoodIDRequired) || errors.Is(err, ErrInvalidDateFormat) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		if errors.Is(err, ErrIDConflict) {
			response.Error(w, http.StatusConflict, response.CodeIDConflict, "Entry ID conflict")
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", date).Msg("failed to create diary entry")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to create diary entry")
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

	ctx, ok := madeAtContext(w, r, req.MadeAt)
	if !ok {
		return
	}
	entry, daySummary, err := h.service.UpdateEntry(ctx, userID, entryID, req)
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
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("entry_id", entryID.String()).Msg("failed to update diary entry")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to update diary entry")
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

	ctx, ok := madeAtContext(w, r, "")
	if !ok {
		return
	}
	entry, daySummary, err := h.service.RestoreEntry(ctx, userID, entryID)
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
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("entry_id", entryID.String()).Msg("failed to restore diary entry")
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

	ctx, ok := madeAtContext(w, r, "")
	if !ok {
		return
	}
	err = h.service.DeleteEntry(ctx, userID, entryID)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrEntryNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Entry not found")
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("entry_id", entryID.String()).Msg("failed to delete diary entry")
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

	ctx, ok := madeAtContext(w, r, req.MadeAt)
	if !ok {
		return
	}
	res, err := h.service.CopyYesterday(ctx, userID, date, req)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", date).Msg("failed to copy yesterday")
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

	ctx, ok := madeAtContext(w, r, "")
	if !ok {
		return
	}
	err = h.service.DeleteMeal(ctx, userID, date, meal)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", date).Str("meal", meal).Msg("failed to delete meal")
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

	ctx, ok := madeAtContext(w, r, req.MadeAt)
	if !ok {
		return
	}
	res, err := h.service.SetTraining(ctx, userID, date, req.TrainingMinutes)
	if err != nil {
		if errors.Is(err, ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrInvalidTrainingMinutes) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", date).Msg("failed to set training")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to set training")
		return
	}

	response.JSON(w, http.StatusOK, res)
}
