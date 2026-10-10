package nutrition

import (
	"encoding/json"
	"net/http"
	"strconv"

	"nutrition-api/internal/auth"
	"nutrition-api/pkg/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SearchFoods handles GET /api/v1/foods?q=...&limit=...&offset=...
func (h *Handler) SearchFoods(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	foods, err := h.service.SearchFoods(r.Context(), query, limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, foods)
}

// CreateCustomFood handles POST /api/v1/foods/custom
func (h *Handler) CreateCustomFood(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateCustomFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	food, err := h.service.CreateCustomFood(r.Context(), userID, req)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, "Custom food created successfully", food)
}

// SyncFortifyMenu handles POST /api/v1/admin/menu/sync (Admin only)
func (h *Handler) SyncFortifyMenu(w http.ResponseWriter, r *http.Request) {
	count, err := h.service.SyncFortifyMenu(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "sync failed: "+err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Menu synchronized successfully", map[string]int{
		"synced_count": count,
	})
}
