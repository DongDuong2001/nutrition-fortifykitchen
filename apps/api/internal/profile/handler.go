package profile

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/logger"
	"nutrition-api/internal/validator"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// isProfileValidationError reports whether err is one of the service's own
// validation sentinels, whose messages are safe to show to the client.
func isProfileValidationError(err error) bool {
	for _, target := range []error{
		ErrInvalidSex,
		ErrInvalidGoal,
		ErrInvalidWeight,
		ErrInvalidBirthYear,
		ErrInvalidDisplayName,
		ErrInvalidTrainingMinutes,
	} {
		if errors.Is(err, target) {
			return true
		}
	}
	return false
}

// GetMe handles GET /api/v1/me
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	p, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrProfileNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeProfileMissing, "profile not yet completed")
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to load profile")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load profile")
		return
	}

	response.JSON(w, http.StatusOK, p)
}

// UpdateProfile handles PUT /api/v1/me/profile
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	var req UpsertProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body")
		return
	}

	v := validator.New()
	v.Required("sex", req.Sex)
	v.In("sex", req.Sex, "male", "female")
	v.In("goal", req.Goal, "build", "maintain", "cut", "deep_cut")
	v.NumberRange("weight_kg", req.WeightKg, 25.0, 300.0)
	v.IntRange("birth_year", req.BirthYear, 1920, 2015)
	if v.Respond(w) {
		return
	}

	p, err := h.service.UpsertProfile(r.Context(), userID, req)
	if err != nil {
		if isProfileValidationError(err) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to save profile")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to save profile")
		return
	}

	response.JSON(w, http.StatusOK, p)
}

// GetWeightLogs handles GET /api/v1/me/weight?from=&to=
func (h *Handler) GetWeightLogs(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	logs, err := h.service.GetWeightLogs(r.Context(), userID, from, to)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("from", from).Str("to", to).Msg("failed to load weight logs")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to load weight logs")
		return
	}

	response.JSON(w, http.StatusOK, logs)
}

// UpsertWeight handles PUT /api/v1/me/weight/{date}
func (h *Handler) UpsertWeight(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	logDate := chi.URLParam(r, "date")
	v := validator.New()
	v.Date("date", logDate)
	if v.Respond(w) {
		return
	}

	var req UpsertWeightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body")
		return
	}

	v.NumberRange("weight_kg", req.WeightKg, 25.0, 300.0)
	if v.Respond(w) {
		return
	}

	if err := h.service.UpsertWeight(r.Context(), userID, logDate, req.WeightKg); err != nil {
		if isProfileValidationError(err) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("date", logDate).Msg("failed to save weight")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to save weight")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"log_date":  logDate,
		"weight_kg": req.WeightKg,
	})
}

// DeleteMe handles DELETE /api/v1/me
func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	if err := h.service.DeleteAccount(r.Context(), userID); err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to delete account")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to delete account")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"status": "account deleted",
	})
}
