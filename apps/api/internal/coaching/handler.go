package coaching

import (
	"encoding/json"
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

// Apply handles POST /api/v1/coaches/apply
func (h *Handler) Apply(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	var req ApplyCoachRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body: "+err.Error())
		return
	}

	app, err := h.service.Apply(r.Context(), userID, req)
	if err != nil {
		if err == ErrAlreadyApplied {
			response.Error(w, http.StatusConflict, response.CodeConflict, err.Error())
			return
		}
		if err == ErrInvalidFullName || err == ErrInvalidEmail {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, app)
}

// GetMyApplication handles GET /api/v1/coaches/my-application
func (h *Handler) GetMyApplication(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	app, err := h.service.GetMyApplication(r.Context(), userID)
	if err != nil {
		if err == ErrApplicationNotFound {
			response.JSON(w, http.StatusOK, nil)
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, app)
}

// ListApplications handles GET /api/v1/admin/coach-applications (Admin only)
func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	apps, err := h.service.ListApplications(r.Context(), status)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, apps)
}

// UpdateStatus handles PATCH /api/v1/admin/coach-applications/{id}/status (Admin only)
func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	reviewerID, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid application id")
		return
	}

	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body: "+err.Error())
		return
	}

	app, err := h.service.UpdateStatus(r.Context(), appID, req.Status, reviewerID)
	if err != nil {
		if err == ErrApplicationNotFound {
			response.Error(w, http.StatusNotFound, response.CodeNotFound, err.Error())
			return
		}
		if err == ErrInvalidStatus {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, app)
}
