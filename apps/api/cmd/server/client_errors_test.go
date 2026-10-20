package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"nutrition-api/internal/config"
)

// POST /api/v1/client-errors needs no session and takes at most 10 reports a minute from one address.
func TestClientErrorsRouteIsRateLimited(t *testing.T) {
	os.Setenv("SUPABASE_JWT_SECRET", "test-secret-12345")
	defer os.Unsetenv("SUPABASE_JWT_SECRET")
	router := SetupRouter(&config.Config{Port: "8080", Environment: "test", AllowedOrigins: []string{"*"}, SupabaseJWTSecret: "test-secret-12345"}, nil)

	codes := []int{}
	for i := 0; i < 11; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/client-errors", strings.NewReader(`{"kind":"sync","route":"/app","message":"x","version":"t"}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "203.0.113.7:5000"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		codes = append(codes, rec.Code)
	}
	for i, code := range codes[:10] {
		if code != http.StatusNoContent {
			t.Fatalf("report %d: status %d, want 204 (%v)", i+1, code, codes)
		}
	}
	if codes[10] != http.StatusTooManyRequests {
		t.Fatalf("report 11: status %d, want 429", codes[10])
	}
}

// The CSRF guard is wired into /api/v1: a form post is refused, the web's JSON post is not, and the webhooks are exempt.
func TestRouterCSRFGuard(t *testing.T) {
	os.Setenv("SUPABASE_JWT_SECRET", "test-secret-12345")
	defer os.Unsetenv("SUPABASE_JWT_SECRET")
	router := SetupRouter(&config.Config{Port: "8080", Environment: "test", AllowedOrigins: []string{"http://localhost:3000"}, SupabaseJWTSecret: "test-secret-12345"}, nil)

	do := func(method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.RemoteAddr = "203.0.113.9:5000"
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}
	report := `{"kind":"sync","route":"/app","message":"x","version":"t"}`

	if rec := do(http.MethodPost, "/api/v1/client-errors", report, map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "application/json"}); rec.Code != http.StatusNoContent {
		t.Errorf("allowed JSON post: status %d, want 204", rec.Code)
	}
	if rec := do(http.MethodPost, "/api/v1/client-errors", report, map[string]string{"Origin": "https://evil.example", "Content-Type": "application/json"}); rec.Code != http.StatusForbidden {
		t.Errorf("foreign origin: status %d, want 403", rec.Code)
	}
	if rec := do(http.MethodPost, "/api/v1/client-errors", "kind=sync", map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "application/x-www-form-urlencoded"}); rec.Code != http.StatusForbidden {
		t.Errorf("form post: status %d, want 403", rec.Code)
	}
	// Webhooks keep their own verification: with no valid signature they answer 401, never the guard's 403
	for _, path := range []string{"/api/v1/payments/webhook", "/api/v1/vault/webhook"} {
		rec := do(http.MethodPost, path, `{}`, map[string]string{"Origin": "https://evil.example", "Content-Type": "text/plain"})
		if rec.Code == http.StatusForbidden && strings.Contains(rec.Body.String(), "CSRF_") {
			t.Errorf("%s was stopped by the CSRF guard: %s", path, rec.Body.String())
		}
	}
}
