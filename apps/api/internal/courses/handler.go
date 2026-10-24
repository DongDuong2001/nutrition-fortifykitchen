package courses

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/logger"
	"nutrition-api/pkg/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// failed maps a service error to its answer. A course, part, lesson or page that is not there, or not the course's, is a plain 404.
func (h *Handler) failed(w http.ResponseWriter, err error, msg string) {
	var locked *LockedError
	var field *FieldError
	switch {
	case errors.As(err, &locked):
		fields := map[string]string{"lock": string(locked.Lock)}
		if locked.Lock == LockLevel {
			fields["minLevel"] = strconv.Itoa(locked.MinLevel)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(response.ErrorEnvelope{Error: response.ErrorDetail{Code: "COURSE_LOCKED", Message: "Course is locked", Fields: fields}})
	case errors.Is(err, ErrBadCode):
		response.Error(w, http.StatusForbidden, "BAD_CODE", "Access code is wrong, expired, revoked or for another course")
	case errors.As(err, &field):
		response.FieldErrors(w, http.StatusBadRequest, "invalid request", map[string]string{field.Field: field.Msg})
	case errors.Is(err, ErrInvalid), errors.Is(err, ErrPageNumber):
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request")
	case errors.Is(err, ErrTooLarge):
		response.Error(w, http.StatusRequestEntityTooLarge, response.CodeValidationFailed, "Body too large")
	case errors.Is(err, ErrStorageFull):
		// 507: the server cannot keep the page. The web says so in words ("Máy chủ đã hết chỗ lưu bài. Báo cho HLV nhé.")
		response.Error(w, http.StatusInsufficientStorage, "STORAGE_FULL", "Not enough room left to store the lesson")
	case errors.Is(err, ErrNotReady):
		response.Error(w, http.StatusConflict, response.CodeConflict, "The lesson does not have all its pages yet")
	case errors.Is(err, ErrNotFound):
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Not found")
	default:
		logger.Log.Error().Err(err).Msg(msg)
		response.Error(w, http.StatusInternalServerError, response.CodeInternalServerError, msg)
	}
}

func uid(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := auth.GetUserID(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "Sign in required")
		return uuid.Nil, false
	}
	return id, true
}

// param is an id from the URL; one that is not a UUID is a 404, never a 400, so ids do not leak.
func param(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Not found")
		return uuid.Nil, false
	}
	return id, true
}

// decode reads a JSON body of at most max bytes (413 past it, 400 when it is not JSON of that shape).
func (h *Handler) decode(w http.ResponseWriter, r *http.Request, max int64, into any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, max)
	if err := json.NewDecoder(r.Body).Decode(into); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			h.failed(w, ErrTooLarge, "")
			return false
		}
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body")
		return false
	}
	return true
}

// ---- learner ----

// List handles GET /courses: the library. Needs no access to any course.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	list, err := h.service.List(r.Context(), u)
	if err != nil {
		h.failed(w, err, "Failed to list courses")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"items": list})
}

// Get handles GET /courses/{id}: the parts and lessons with the caller's progress; 403 COURSE_LOCKED (with the reason) when it does not open.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	id, ok := param(w, r, "id")
	if !ok {
		return
	}
	d, err := h.service.Detail(r.Context(), u, id)
	if err != nil {
		h.failed(w, err, "Failed to read course")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	response.JSON(w, http.StatusOK, d)
}

// Open handles POST /courses/{id}/open {code}: unlocks a code course for the caller and returns it. The code is in the body, never the URL.
func (h *Handler) Open(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	id, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in OpenInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	d, err := h.service.Open(r.Context(), u, id, in.Code)
	if err != nil {
		h.failed(w, err, "Failed to open course")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	response.JSON(w, http.StatusOK, d)
}

// Lesson handles GET /courses/{id}/lessons/{lid}: one lesson (a text lesson with its markdown).
func (h *Handler) Lesson(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	l, err := h.service.Lesson(r.Context(), u, cid, lid)
	if err != nil {
		h.failed(w, err, "Failed to read lesson")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	response.JSON(w, http.StatusOK, l)
}

// Page handles GET /courses/{id}/lessons/{lid}/pages/{n}: the page image, after the lesson's own access check. Never cached, never static.
func (h *Handler) Page(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	n, err := strconv.Atoi(chi.URLParam(r, "n"))
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Not found")
		return
	}
	f, size, err := h.service.Page(r.Context(), u, cid, lid, n)
	if err != nil {
		h.failed(w, err, "Failed to read page")
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, f)
}

// Progress handles PUT /courses/{id}/lessons/{lid}/progress {lastPage, completed?}: the caller's own, the same call again changes nothing.
func (h *Handler) Progress(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	var in ProgressInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	if err := h.service.Progress(r.Context(), u, cid, lid, in); err != nil {
		h.failed(w, err, "Failed to save progress")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// ---- coach and admin ----

func (h *Handler) CreateCourse(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	var in CourseInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	c, err := h.service.CreateCourse(r.Context(), u, in)
	if err != nil {
		h.failed(w, err, "Failed to create course")
		return
	}
	response.JSON(w, http.StatusCreated, c)
}

func (h *Handler) UpdateCourse(w http.ResponseWriter, r *http.Request) {
	id, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in CoursePatch
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	c, err := h.service.UpdateCourse(r.Context(), id, in)
	if err != nil {
		h.failed(w, err, "Failed to update course")
		return
	}
	response.JSON(w, http.StatusOK, c)
}

func (h *Handler) DeleteCourse(w http.ResponseWriter, r *http.Request) {
	id, ok := param(w, r, "id")
	if !ok {
		return
	}
	if err := h.service.DeleteCourse(r.Context(), id); err != nil {
		h.failed(w, err, "Failed to delete course")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) CreatePart(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in TitleInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	p, err := h.service.CreatePart(r.Context(), cid, in)
	if err != nil {
		h.failed(w, err, "Failed to create part")
		return
	}
	response.JSON(w, http.StatusCreated, p)
}

func (h *Handler) RenamePart(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	pid, ok := param(w, r, "pid")
	if !ok {
		return
	}
	var in TitleInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	p, err := h.service.RenamePart(r.Context(), cid, pid, in)
	if err != nil {
		h.failed(w, err, "Failed to rename part")
		return
	}
	response.JSON(w, http.StatusOK, p)
}

func (h *Handler) DeletePart(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	pid, ok := param(w, r, "pid")
	if !ok {
		return
	}
	if err := h.service.DeletePart(r.Context(), cid, pid); err != nil {
		h.failed(w, err, "Failed to delete part")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) ReorderParts(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in ReorderInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	if err := h.service.ReorderParts(r.Context(), cid, in); err != nil {
		h.failed(w, err, "Failed to reorder parts")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// CreateLesson handles POST /courses/{id}/lessons: a text lesson with its markdown (1 MB at most), or the shell of a PDF lesson
// ({kind: "pdf", pageCount}) whose pages are uploaded next; the lesson stays hidden from learners until FinishLesson.
func (h *Handler) CreateLesson(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in LessonInput
	if !h.decode(w, r, MaxTextBodyBytes, &in) {
		return
	}
	l, err := h.service.CreateLesson(r.Context(), cid, in)
	if err != nil {
		h.failed(w, err, "Failed to create lesson")
		return
	}
	response.JSON(w, http.StatusCreated, l)
}

func (h *Handler) UpdateLesson(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	var in LessonPatch
	if !h.decode(w, r, MaxTextBodyBytes, &in) {
		return
	}
	l, err := h.service.UpdateLesson(r.Context(), cid, lid, in)
	if err != nil {
		h.failed(w, err, "Failed to update lesson")
		return
	}
	response.JSON(w, http.StatusOK, l)
}

func (h *Handler) DeleteLesson(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	if err := h.service.DeleteLesson(r.Context(), cid, lid); err != nil {
		h.failed(w, err, "Failed to delete lesson")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) ReorderLessons(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	var in ReorderInput
	if !h.decode(w, r, MaxJSONBytes, &in) {
		return
	}
	if err := h.service.ReorderLessons(r.Context(), cid, in); err != nil {
		h.failed(w, err, "Failed to reorder lessons")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// UploadPage handles PUT /courses/{id}/lessons/{lid}/pages/{n} {data}: one page image (WebP, 1 MiB at most) as base64 in JSON.
func (h *Handler) UploadPage(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	n, err := strconv.Atoi(chi.URLParam(r, "n"))
	if err != nil {
		response.Error(w, http.StatusNotFound, response.CodeNotFound, "Not found")
		return
	}
	var in PageInput
	if !h.decode(w, r, MaxPageBodyBytes, &in) {
		return
	}
	if err := h.service.UploadPage(r.Context(), cid, lid, n, in); err != nil {
		h.failed(w, err, "Failed to store page")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// FinishLesson handles POST /courses/{id}/lessons/{lid}/finish: every page is there, so learners see the lesson (409 until then).
func (h *Handler) FinishLesson(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	lid, ok := param(w, r, "lid")
	if !ok {
		return
	}
	l, err := h.service.FinishLesson(r.Context(), cid, lid)
	if err != nil {
		h.failed(w, err, "Failed to finish lesson")
		return
	}
	response.JSON(w, http.StatusOK, l)
}

func (h *Handler) CreateCode(w http.ResponseWriter, r *http.Request) {
	u, ok := uid(w, r)
	if !ok {
		return
	}
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	code, err := h.service.CreateCode(r.Context(), cid, u)
	if err != nil {
		h.failed(w, err, "Failed to create access code")
		return
	}
	response.JSON(w, http.StatusCreated, code)
}

func (h *Handler) ListCodes(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	list, err := h.service.ListCodes(r.Context(), cid)
	if err != nil {
		h.failed(w, err, "Failed to list access codes")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"items": list})
}

func (h *Handler) RevokeCode(w http.ResponseWriter, r *http.Request) {
	cid, ok := param(w, r, "id")
	if !ok {
		return
	}
	id, ok := param(w, r, "codeId")
	if !ok {
		return
	}
	if err := h.service.RevokeCode(r.Context(), cid, id); err != nil {
		h.failed(w, err, "Failed to revoke access code")
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"success": true})
}
