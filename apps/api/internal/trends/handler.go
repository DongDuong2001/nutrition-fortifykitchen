package trends

import (
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

// GetTrends handles GET /api/v1/trends?days=7|30&offset=0
func (h *Handler) GetTrends(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return
	}

	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days == 0 {
		days, _ = strconv.Atoi(r.URL.Query().Get("window"))
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	res, err := h.service.GetTrends(r.Context(), userID, days, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, "Failed to calculate trends")
		return
	}

	response.JSON(w, http.StatusOK, res)
}
