package documents

import (
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
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) failed(w http.ResponseWriter, err error, msg string) {
	switch {
	case errors.Is(err, ErrBadName):
		response.FieldErrors(w, http.StatusBadRequest, "invalid document name", map[string]string{"name": "letters, digits, _ - . only, at most 100"})
	case errors.Is(err, ErrTooLarge):
		response.Error(w, http.StatusRequestEntityTooLarge, response.CodeValidationFailed, "Document larger than 1 MB")
	case errors.Is(err, ErrNotFound):
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Document not found")
	case errors.Is(err, ErrChanged):
		response.Error(w, http.StatusConflict, response.CodeConflict, "Document changed since it was loaded")
	case errors.Is(err, ErrBadCode):
		response.Error(w, http.StatusForbidden, response.CodeForbidden, "Access code is wrong, expired or revoked")
	default:
		logger.Log.Error().Err(err).Msg(msg)
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, msg)
	}
}

func userID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return uuid.Nil, false
	}
	return id, true
}

// List handles GET /api/v1/documents: every document's name and last write, by name.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.List(r.Context())
	if err != nil {
		h.failed(w, err, "Failed to list documents")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"items": list})
}

// Get handles GET /api/v1/documents/{name}.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	doc, err := h.service.Get(r.Context(), chi.URLParam(r, "name"))
	if err != nil {
		h.failed(w, err, "Failed to read document")
		return
	}
	response.JSON(w, http.StatusOK, doc)
}

// Put handles PUT /api/v1/documents/{name} {content, code}: creates or replaces the document when code is a live access code.
func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(w, r)
	if !ok {
		return
	}
	var req PutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			h.failed(w, ErrTooLarge, "")
			return
		}
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body")
		return
	}
	meta, err := h.service.Put(r.Context(), uid, chi.URLParam(r, "name"), req)
	if err != nil {
		h.failed(w, err, "Failed to save document")
		return
	}
	response.JSON(w, http.StatusOK, meta)
}

// CheckCode handles POST /api/v1/document-codes/check {code}: 200 for a live code, 403 otherwise.
func (h *Handler) CheckCode(w http.ResponseWriter, r *http.Request) {
	var req CheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "invalid request body")
		return
	}
	if err := h.service.Check(r.Context(), req.Code); err != nil {
		h.failed(w, err, "Failed to check access code")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"valid": true})
}

// CreateCode handles POST /api/v1/document-codes (coach, admin): a new code, its value shown this once.
func (h *Handler) CreateCode(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(w, r)
	if !ok {
		return
	}
	code, err := h.service.CreateCode(r.Context(), uid)
	if err != nil {
		h.failed(w, err, "Failed to create access code")
		return
	}
	response.JSON(w, http.StatusCreated, code)
}

// ListCodes handles GET /api/v1/document-codes (coach, admin): the caller's live codes, without their values.
func (h *Handler) ListCodes(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(w, r)
	if !ok {
		return
	}
	list, err := h.service.ListCodes(r.Context(), uid)
	if err != nil {
		h.failed(w, err, "Failed to list access codes")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"items": list})
}

// RevokeCode handles DELETE /api/v1/document-codes/{id} (coach, admin): 200 again when sent again.
func (h *Handler) RevokeCode(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.FieldErrors(w, http.StatusBadRequest, "id must be a UUID", map[string]string{"id": "id must be a UUID"})
		return
	}
	if err := h.service.RevokeCode(r.Context(), uid, id); err != nil {
		h.failed(w, err, "Failed to revoke access code")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}
