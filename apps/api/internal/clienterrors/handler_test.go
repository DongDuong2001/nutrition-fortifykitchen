package clienterrors

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/logger"
)

func capture(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	old := logger.Log
	logger.Log = zerolog.New(&buf)
	t.Cleanup(func() { logger.Log = old })
	return &buf
}

func post(body string, user *uuid.UUID) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/client-errors", strings.NewReader(body))
	if user != nil {
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, *user))
	}
	rec := httptest.NewRecorder()
	Handle(rec, req)
	return rec
}

func TestReportIsLoggedAsOneClientErrorLine(t *testing.T) {
	buf := capture(t)
	user := uuid.New()
	rec := post(`{"kind":"write","route":"/app?date=2026-10-18","method":"POST","path":"/days/2026-10-18/entries?x=1",
		"status":400,"message":"failed to insert diary entry: ERROR: inconsistent types","version":"2026-10-18.2"}`, &user)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status %d", rec.Code)
	}
	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatalf("not one JSON line: %q", buf.String())
	}
	want := map[string]any{
		"event": "client_error", "kind": "write", "route": "/app", "method": "POST", "path": "/days/2026-10-18/entries",
		"status": 400.0, "error_message": "failed to insert diary entry: ERROR: inconsistent types", "version": "2026-10-18.2",
		"user_id": user.String(),
	}
	for k, v := range want {
		if line[k] != v {
			t.Errorf("%s = %v, want %v", k, line[k], v)
		}
	}
}

func TestSignedOutReportHasNoUserID(t *testing.T) {
	buf := capture(t)
	if rec := post(`{"kind":"setup","route":"/setup/profile","message":"boom","version":"v"}`, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("status %d", rec.Code)
	}
	if strings.Contains(buf.String(), "user_id") {
		t.Fatalf("signed-out report has a user_id: %s", buf.String())
	}
}

func TestLongFieldsAreCut(t *testing.T) {
	buf := capture(t)
	long := strings.Repeat("x", 2000)
	post(`{"kind":"share","route":"/app","message":"`+long+`","version":"v"}`, nil)
	var line map[string]any
	_ = json.Unmarshal(buf.Bytes(), &line)
	if n := len(line["error_message"].(string)); n > 300 {
		t.Fatalf("message kept %d characters", n)
	}
}

func TestBadReportsAreRefused(t *testing.T) {
	capture(t)
	for _, body := range []string{
		`{"kind":"other","message":"x"}`,
		`not json`,
		`{"kind":"write","message":"` + strings.Repeat("y", 5000) + `"}`,
	} {
		if rec := post(body, nil); rec.Code != http.StatusBadRequest {
			t.Errorf("%.40s…: status %d, want 400", body, rec.Code)
		}
	}
}

func TestStorageAndOutboxAgeKindsAccepted(t *testing.T) {
	capture(t)
	for _, kind := range []string{"storage", "outbox_age"} {
		rec := post(`{"kind":"`+kind+`","route":"/app","message":"test error","version":"v"}`, nil)
		if rec.Code != http.StatusNoContent {
			t.Errorf("kind %s: status %d, want 204", kind, rec.Code)
		}
	}
}
