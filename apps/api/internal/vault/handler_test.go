package vault_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/vault"
)

const secretDBError = "pq: connection to 10.0.0.5:5432 refused (password=hunter2)"

type stubService struct {
	processErr error
	listErr    error
	updateErr  error
}

func (s stubService) VerifyGitHubSignature(signatureHeader string, body []byte) bool { return true }

func (s stubService) ProcessGitHubPush(ctx context.Context, payload vault.GitHubWebhookPayload) error {
	return s.processErr
}

func (s stubService) ListDrafts(ctx context.Context, status string) ([]vault.CoachDraft, error) {
	return nil, s.listErr
}

func (s stubService) UpdateDraftStatus(ctx context.Context, id uuid.UUID, newStatus string) (*vault.CoachDraft, error) {
	return nil, s.updateErr
}

func assertNoLeak(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantMsg string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("expected %d, got %d: %s", wantStatus, rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	if strings.Contains(body, "hunter2") || strings.Contains(body, "10.0.0.5") {
		t.Errorf("response leaks internal error: %s", body)
	}
	if !strings.Contains(body, wantMsg) {
		t.Errorf("expected %q in %s", wantMsg, body)
	}
}

func TestHandler_WebhookErrors(t *testing.T) {
	h := vault.NewHandler(stubService{processErr: errors.New(secretDBError)})

	rec := httptest.NewRecorder()
	h.HandleWebhook(rec, httptest.NewRequest(http.MethodPost, "/vault/webhook", strings.NewReader(`{}`)))
	assertNoLeak(t, rec, http.StatusInternalServerError, "Failed to process vault push")

	rec = httptest.NewRecorder()
	h.HandleWebhook(rec, httptest.NewRequest(http.MethodPost, "/vault/webhook", strings.NewReader(`{"ref": `)))
	assertNoLeak(t, rec, http.StatusBadRequest, "Invalid webhook payload")
	if strings.Contains(rec.Body.String(), "EOF") {
		t.Errorf("response echoes decoder error: %s", rec.Body.String())
	}
}

func TestHandler_ListDraftsErrorIsNotLeaked(t *testing.T) {
	h := vault.NewHandler(stubService{listErr: errors.New(secretDBError)})
	rec := httptest.NewRecorder()
	h.ListDrafts(rec, httptest.NewRequest(http.MethodGet, "/admin/drafts", nil))
	assertNoLeak(t, rec, http.StatusInternalServerError, "Failed to load drafts")
}

func updateDraft(h *vault.Handler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPatch, "/admin/drafts/x/status", strings.NewReader(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", uuid.New().String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()
	h.UpdateDraftStatus(rec, req)
	return rec
}

func TestHandler_UpdateDraftStatusErrors(t *testing.T) {
	rec := updateDraft(vault.NewHandler(stubService{updateErr: errors.New(secretDBError)}), `{"status":"published"}`)
	assertNoLeak(t, rec, http.StatusInternalServerError, "Failed to update draft")

	rec = updateDraft(vault.NewHandler(stubService{updateErr: vault.ErrInvalidDraftStatus}), `{"status":"bogus"}`)
	assertNoLeak(t, rec, http.StatusBadRequest, vault.ErrInvalidDraftStatus.Error())

	rec = updateDraft(vault.NewHandler(stubService{updateErr: vault.ErrDraftNotFound}), `{"status":"draft"}`)
	assertNoLeak(t, rec, http.StatusNotFound, vault.ErrDraftNotFound.Error())
}
