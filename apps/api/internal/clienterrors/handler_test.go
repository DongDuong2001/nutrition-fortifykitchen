package clienterrors

import (
	"bytes"
	"context"
	"encoding/json"
	"math"
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

func TestVitalsReportIsLoggedWithMetricPageAndValue(t *testing.T) {
	buf := capture(t)
	user := uuid.New()
	rec := post(`{"kind":"vitals","name":"LCP","page":"/app?date=2026-10-20#top","value":2431.5,"version":"2026-10-20.1"}`, &user)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatalf("not one JSON line: %q", buf.String())
	}
	want := map[string]any{
		"event": "client_error", "kind": "vitals", "metric": "LCP", "page": "/app", "value": 2431.5,
		"version": "2026-10-20.1", "user_id": user.String(), "level": "info", "message": "client_error",
	}
	for k, v := range want {
		if line[k] != v {
			t.Errorf("%s = %v, want %v", k, line[k], v)
		}
	}
	for _, k := range []string{"error_message", "status", "method", "path"} {
		if _, ok := line[k]; ok {
			t.Errorf("vitals line has the failure field %s: %s", k, buf.String())
		}
	}
}

func TestVitalsAcceptsEveryMetricAndZero(t *testing.T) {
	capture(t)
	for _, name := range []string{"LCP", "INP", "CLS", "FCP", "TTFB"} {
		for _, value := range []string{"0", "0.05", "1200"} {
			rec := post(`{"kind":"vitals","name":"`+name+`","page":"/app","value":`+value+`}`, nil)
			if rec.Code != http.StatusNoContent {
				t.Errorf("%s %s: status %d, want 204", name, value, rec.Code)
			}
		}
	}
}

func TestVitalsPageIsCut(t *testing.T) {
	buf := capture(t)
	post(`{"kind":"vitals","name":"CLS","page":"/`+strings.Repeat("p", 2000)+`","value":0.1}`, nil)
	var line map[string]any
	_ = json.Unmarshal(buf.Bytes(), &line)
	if n := len(line["page"].(string)); n > 120 {
		t.Fatalf("page kept %d characters", n)
	}
}

func TestBadVitalsAreRefused(t *testing.T) {
	buf := capture(t)
	for name, body := range map[string]string{
		"unknown metric":     `{"kind":"vitals","name":"FID","page":"/app","value":1}`,
		"lowercase metric":   `{"kind":"vitals","name":"lcp","page":"/app","value":1}`,
		"missing metric":     `{"kind":"vitals","page":"/app","value":1}`,
		"missing value":      `{"kind":"vitals","name":"LCP","page":"/app"}`,
		"null value":         `{"kind":"vitals","name":"LCP","page":"/app","value":null}`,
		"negative value":     `{"kind":"vitals","name":"LCP","page":"/app","value":-1}`,
		"string value":       `{"kind":"vitals","name":"LCP","page":"/app","value":"12"}`,
		"overflowing value":  `{"kind":"vitals","name":"LCP","page":"/app","value":1e999}`,
		"non-finite literal": `{"kind":"vitals","name":"LCP","page":"/app","value":NaN}`,
	} {
		if rec := post(body, nil); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status %d, want 400", name, rec.Code)
		}
	}
	if buf.Len() != 0 {
		t.Errorf("a refused report was logged: %s", buf.String())
	}
}

func TestValidVitalsRejectsNonFinite(t *testing.T) {
	for _, v := range []float64{math.NaN(), math.Inf(1), math.Inf(-1), -0.001} {
		v := v
		if validVitals(Report{Kind: "vitals", Name: "LCP", Value: &v}) {
			t.Errorf("value %v accepted", v)
		}
	}
}

func TestVitalsFieldsDoNotMakeOtherKindsDifferent(t *testing.T) {
	buf := capture(t)
	post(`{"kind":"sync","route":"/app","message":"x","name":"LCP","page":"/y","value":3}`, nil)
	var line map[string]any
	_ = json.Unmarshal(buf.Bytes(), &line)
	if line["level"] != "warn" || line["kind"] != "sync" {
		t.Fatalf("a non-vitals report changed: %s", buf.String())
	}
	if _, ok := line["metric"]; ok {
		t.Errorf("a non-vitals report logged vitals fields: %s", buf.String())
	}
}
