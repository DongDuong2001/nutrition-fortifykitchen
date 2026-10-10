package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
)

func TestAuthMiddleware(t *testing.T) {
	middleware := auth.NewMiddleware()
	testUserID := uuid.New()

	// Handler to test context injection
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, err := auth.GetUserID(r.Context())
		if err != nil {
			t.Errorf("expected user ID in context, got err: %v", err)
		}
		if uid != testUserID {
			t.Errorf("expected user ID %v, got %v", testUserID, uid)
		}
		w.WriteHeader(http.StatusOK)
	})

	t.Run("missing authorization header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		rec := httptest.NewRecorder()

		middleware.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized, got %d", rec.Code)
		}
	})

	t.Run("valid unverified token in dev", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte("dummy-secret"))

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		middleware.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("require admin role - regular user rejected", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte("dummy-secret"))

		req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		adminHandler := middleware.Authenticate(middleware.RequireAdmin(testHandler))
		adminHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden, got %d", rec.Code)
		}
	})

	t.Run("require admin role - admin accepted", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "admin",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte("dummy-secret"))

		req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		adminHandler := middleware.Authenticate(middleware.RequireAdmin(testHandler))
		adminHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})
}
