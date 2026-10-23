package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"nutrition-api/internal/config"
)

func TestOpenAPIContractRoutes_Registered(t *testing.T) {
	// Set dummy environment secrets so SetupRouter doesn't exit
	os.Setenv("SUPABASE_JWT_SECRET", "test-secret-12345")
	defer os.Unsetenv("SUPABASE_JWT_SECRET")

	cfg := &config.Config{
		Port:              "8080",
		Environment:       "test",
		AllowedOrigins:   []string{"*"},
		SupabaseJWTSecret: "test-secret-12345",
	}

	router := SetupRouter(cfg, nil)

	// List of all paths defined in openapi.yaml with an expected HTTP method
	// A request to each route should reach the route handler (e.g., returning 401 Unauthorized because of missing token,
	// or 200/400, but NEVER 404 Page Not Found or 405 Method Not Allowed).
	routes := []struct {
		method string
		path   string
	}{
		// Public
		{"GET", "/healthz"},
		{"POST", "/api/v1/payments/webhook"},
		{"POST", "/api/v1/vault/webhook"},
		{"GET", "/api/v1/foods"},
		{"GET", "/api/v1/foods/11111111-1111-1111-1111-111111111111"},
		{"GET", "/api/v1/foods/rich-in"},
		{"GET", "/api/v1/foods/rich-in/calcium"},
		{"POST", "/api/v1/client-errors"},

		// Protected Profile
		{"GET", "/api/v1/me"},
		{"PUT", "/api/v1/me/profile"},
		{"GET", "/api/v1/me/weight"},
		{"PUT", "/api/v1/me/weight/2026-10-13"},
		{"DELETE", "/api/v1/me"},

		// Protected Foods
		{"POST", "/api/v1/foods/custom"},
		{"DELETE", "/api/v1/foods/custom/11111111-1111-1111-1111-111111111111"},

		// Protected Diary
		{"GET", "/api/v1/days/2026-10-13"},
		{"POST", "/api/v1/days/2026-10-13/entries"},
		{"POST", "/api/v1/days/2026-10-13/entries/from-saved/11111111-1111-1111-1111-111111111111"},
		{"POST", "/api/v1/days/2026-10-13/copy-yesterday"},
		{"DELETE", "/api/v1/days/2026-10-13/meals/breakfast"},
		{"PUT", "/api/v1/days/2026-10-13/training"},
		{"PATCH", "/api/v1/entries/11111111-1111-1111-1111-111111111111"},
		{"DELETE", "/api/v1/entries/11111111-1111-1111-1111-111111111111"},

		// Protected Library
		{"GET", "/api/v1/favourites"},
		{"POST", "/api/v1/favourites"},
		{"DELETE", "/api/v1/favourites/11111111-1111-1111-1111-111111111111"},
		{"GET", "/api/v1/recents"},
		{"GET", "/api/v1/saved-meals"},
		{"POST", "/api/v1/saved-meals"},
		{"DELETE", "/api/v1/saved-meals/11111111-1111-1111-1111-111111111111"},

		// Protected Day templates (Ngày ăn mẫu)
		{"GET", "/api/v1/day-templates"},
		{"PUT", "/api/v1/day-templates/11111111-1111-1111-1111-111111111111"},
		{"DELETE", "/api/v1/day-templates/11111111-1111-1111-1111-111111111111"},
		// Protected Trends
		{"GET", "/api/v1/trends"},

		// Protected Coaching
		{"POST", "/api/v1/coaches/apply"},
		{"GET", "/api/v1/coaches/my-application"},

		// Entry restore
		{"POST", "/api/v1/entries/11111111-1111-1111-1111-111111111111/restore"},

		// Admin
		{"GET", "/api/v1/admin/drafts"},
		{"PATCH", "/api/v1/admin/drafts/11111111-1111-1111-1111-111111111111/status"},
		{"GET", "/api/v1/admin/coach-applications"},
		{"PATCH", "/api/v1/admin/coach-applications/11111111-1111-1111-1111-111111111111/status"},
	}

	for _, rt := range routes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code == http.StatusNotFound {
				t.Errorf("route %s %s was not found (got 404)", rt.method, rt.path)
			}
			if rec.Code == http.StatusMethodNotAllowed {
				t.Errorf("method %s not allowed on %s (got 405)", rt.method, rt.path)
			}

			if strings.HasPrefix(rt.path, "/api/v1") {
				cc := rec.Header().Get("Cache-Control")
				expected := "private, no-cache, no-store, max-age=0, must-revalidate"
				if cc != expected {
					t.Errorf("route %s %s Cache-Control = %q; want %q", rt.method, rt.path, cc, expected)
				}
			}
		})
	}
}
