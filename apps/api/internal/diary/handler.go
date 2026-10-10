package diary

import (
	"encoding/json"
	"net/http"
	"time"

	"nutrition-api/internal/auth"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// LogMeal handles POST /api/v1/diary/logs
func (h *Handler) LogMeal(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req LogMealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	res, err := h.service.LogMeal(r.Context(), userID, req)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, "Meal logged successfully", res)
}

// GetDailyProgress handles GET /api/v1/diary/daily?date=YYYY-MM-DD
func (h *Handler) GetDailyProgress(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	dateStr := r.URL.Query().Get("date")
	targetDate := time.Now().UTC().Truncate(24 * time.Hour)
	if dateStr != "" {
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			targetDate = parsed
		}
	}

	progress, logs, err := h.service.GetDailyProgress(r.Context(), userID, targetDate)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	data := map[string]any{
		"progress": progress,
		"logs":     logs,
	}

	response.JSON(w, http.StatusOK, data)
}
