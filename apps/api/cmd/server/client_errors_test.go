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
