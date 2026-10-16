package nutrition

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

// SearchFoods handles GET /api/v1/foods
func (h *Handler) SearchFoods(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	} else if limit > 50 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}

	filter := FoodSearchFilter{
		Query:    q,
		Category: category,
		Page:     page,
		Limit:    limit,
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

	food, err := h.service.GetFoodByID(r.Context(), id)
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

	result, err := h.service.GetFoodsRichIn(r.Context(), nutrient, limit)
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
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, food)
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
