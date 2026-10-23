package library

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/diary"
	"nutrition-api/internal/logger"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// GetFavourites handles GET /api/v1/favourites
func (h *Handler) GetFavourites(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	items, err := h.service.GetFavourites(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to get favourites")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"items": items})
}

// AddFavourite handles POST /api/v1/favourites
func (h *Handler) AddFavourite(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	var req struct {
		FoodID uuid.UUID `json:"food_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	if err := h.service.AddFavourite(r.Context(), userID, req.FoodID); err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to add favourite")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]any{"success": true, "food_id": req.FoodID})
}

// RemoveFavourite handles DELETE /api/v1/favourites/{food_id}
func (h *Handler) RemoveFavourite(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "food_id")
	foodID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Food not found")
		return
	}

	if err := h.service.RemoveFavourite(r.Context(), userID, foodID); err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to remove favourite")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// GetRecents handles GET /api/v1/recents
func (h *Handler) GetRecents(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.service.GetRecents(r.Context(), userID, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to get recents")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetSavedMeals handles GET /api/v1/saved-meals
func (h *Handler) GetSavedMeals(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	meals, err := h.service.GetSavedMeals(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to get saved meals")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"items": meals})
}

// CreateSavedMeal handles POST /api/v1/saved-meals
func (h *Handler) CreateSavedMeal(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	var req CreateSavedMealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	meal, err := h.service.CreateSavedMeal(r.Context(), userID, req)
	if err != nil {
		if errors.Is(err, ErrSavedMealNameRequired) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to create saved meal")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to create saved meal")
		return
	}

	response.JSON(w, http.StatusCreated, meal)
}

// DeleteSavedMeal handles DELETE /api/v1/saved-meals/{id}
// PutSavedMeal handles PUT /api/v1/saved-meals/{id}: create or replace (name and items) by the client's id, the same result when sent again.
func (h *Handler) PutSavedMeal(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}
	mealID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.FieldErrors(w, http.StatusBadRequest, "id must be a UUID", map[string]string{"id": "id must be a UUID"})
		return
	}
	var req CreateSavedMealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}
	meal, err := h.service.PutSavedMeal(r.Context(), userID, mealID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrSavedMealNameRequired):
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		case errors.Is(err, ErrSavedMealIDConflict):
			response.Error(w, http.StatusConflict, response.CodeIDConflict, "This id is already used")
		default:
			logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to save saved meal")
			response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to save saved meal")
		}
		return
	}
	response.JSON(w, http.StatusOK, meal)
}

func (h *Handler) DeleteSavedMeal(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "id")
	mealID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Saved meal not found")
		return
	}

	if err := h.service.DeleteSavedMeal(r.Context(), userID, mealID); err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Saved meal not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// AddFromSaved handles POST /api/v1/days/{date}/entries/from-saved/{id}
func (h *Handler) AddFromSaved(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	date := chi.URLParam(r, "date")
	idStr := chi.URLParam(r, "id")
	mealSlot := r.URL.Query().Get("meal")

	mealID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Saved meal not found")
		return
	}

	entries, err := h.service.AddFromSaved(r.Context(), userID, date, mealID, mealSlot)
	if err != nil {
		if errors.Is(err, diary.ErrPastDayReadOnly) {
			response.Error(w, http.StatusConflict, response.CodePastDayReadOnly, "Cannot write to past dates")
			return
		}
		if errors.Is(err, ErrSavedMealNotFound) {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Saved meal not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to add from saved meal")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]any{
		"added_count": len(entries),
		"entries":     entries,
	})
}
