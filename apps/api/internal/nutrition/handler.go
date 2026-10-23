package nutrition

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

// SearchFoods handles GET /api/v1/foods
func (h *Handler) SearchFoods(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	limit = ClampFoodsLimit(q, limit)
	if page <= 0 {
		page = 1
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(r.Context()); err == nil {
		userID = &uid
	}

	filter := FoodSearchFilter{
		Query:    q,
		Category: category,
		Page:     page,
		Limit:    limit,
		UserID:   userID,
	}

	result, err := h.service.SearchFoods(r.Context(), filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to search foods")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// GetFoodByID handles GET /api/v1/foods/{id}
func (h *Handler) GetFoodByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Food not found")
		return
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(r.Context()); err == nil {
		userID = &uid
	}

	food, err := h.service.GetFoodByID(r.Context(), id, userID)
	if err != nil {
		if err == ErrFoodNotFound {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Food not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to get food")
		return
	}

	response.JSON(w, http.StatusOK, food)
}

// GetFoodsRichIn handles GET /api/v1/foods/rich-in/{nutrient}
func (h *Handler) GetFoodsRichIn(w http.ResponseWriter, r *http.Request) {
	nutrient := chi.URLParam(r, "nutrient")
	if nutrient == "" {
		nutrient = r.URL.Query().Get("nutrient")
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(r.Context()); err == nil {
		userID = &uid
	}

	result, err := h.service.GetFoodsRichIn(r.Context(), nutrient, limit, userID)
	if err != nil {
		if errors.Is(err, ErrInvalidNutrient) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid nutrient key")
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to get rich-in foods")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// isCustomFoodInvalid is a refused body (400), as opposed to a food that is not there (404) or a failure of ours (500).
func isCustomFoodInvalid(err error) bool {
	return errors.Is(err, ErrNameRequired) || errors.Is(err, ErrInvalidServingSize) || errors.Is(err, ErrNegativeMacronutrients)
}

// CreateCustomFood handles POST /api/v1/foods/custom
func (h *Handler) CreateCustomFood(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	var req CreateCustomFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	food, err := h.service.CreateCustomFood(r.Context(), userID, req)
	if err != nil {
		if isCustomFoodInvalid(err) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		logger.Log.Error().Err(err).Str("user_id", userID.String()).Msg("failed to create custom food")
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to create custom food")
		return
	}

	response.JSON(w, http.StatusCreated, food)
}

// UpdateCustomFood handles PUT /api/v1/foods/custom/{id}: the body of POST, the same food id. A food that is not the caller's,
// is archived or is a catalogue food is a 404, never a 403, so ids do not leak.
func (h *Handler) UpdateCustomFood(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	foodID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Custom food not found")
		return
	}

	var req CreateCustomFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return
	}

	food, err := h.service.UpdateCustomFood(r.Context(), userID, foodID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrFoodNotFound):
			response.Error(w, http.StatusNotFound, response.CodeNotFound, "Custom food not found")
		case isCustomFoodInvalid(err):
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		default:
			logger.Log.Error().Err(err).Str("user_id", userID.String()).Str("food_id", foodID.String()).Msg("failed to update custom food")
			response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to update custom food")
		}
		return
	}

	response.JSON(w, http.StatusOK, food)
}

// DeleteCustomFood handles DELETE /api/v1/foods/custom/{id}
func (h *Handler) DeleteCustomFood(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	idStr := chi.URLParam(r, "id")
	foodID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Custom food not found")
		return
	}

	if err := h.service.DeleteCustomFood(r.Context(), userID, foodID); err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Custom food not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}
