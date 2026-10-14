package auth_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
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

	validSecret := []byte("test-super-secret-key-12345")
	middlewareWithSecret := auth.NewMiddlewareWithSecret(validSecret)

	t.Run("valid signed token accepted", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("badly signed token gets 401", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte("wrong-signing-secret"))

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized for badly signed token, got %d", rec.Code)
		}
	})

	t.Run("unsigned token gets 401", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer some-unsigned-malformed-token")
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized for unsigned token, got %d", rec.Code)
		}
	})

	t.Run("middleware with empty secret rejects all requests with 401", func(t *testing.T) {
		emptyMiddleware := auth.NewMiddlewareWithSecret(nil)
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		emptyMiddleware.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized when secret is unconfigured, got %d", rec.Code)
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
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		adminHandler := middlewareWithSecret.Authenticate(middlewareWithSecret.RequireAdmin(testHandler))
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
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		adminHandler := middlewareWithSecret.Authenticate(middlewareWithSecret.RequireAdmin(testHandler))
		adminHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("valid ES256 token verified via JWKS", func(t *testing.T) {
		privKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			t.Fatalf("failed to generate ecdsa key: %v", err)
		}

		xBytes := privKey.PublicKey.X.Bytes()
		yBytes := privKey.PublicKey.Y.Bytes()
		xStr := base64.RawURLEncoding.EncodeToString(xBytes)
		yStr := base64.RawURLEncoding.EncodeToString(yBytes)

		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"keys": []map[string]any{
					{
						"kty": "EC",
						"crv": "P-256",
						"x":   xStr,
						"y":   yStr,
						"kid": "test-ecc-key-id",
						"alg": "ES256",
						"use": "sig",
					},
				},
			})
		}))
		defer ts.Close()

		ecMiddleware := auth.NewMiddlewareWithOptions("", ts.URL)

		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
		token.Header["kid"] = "test-ecc-key-id"
		tokenStr, err := token.SignedString(privKey)
		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		ecMiddleware.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for valid ES256 token, got %d", rec.Code)
		}
	})

	t.Run("ES256 token signed by unknown key gets 401", func(t *testing.T) {
		otherKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"keys": []map[string]any{},
			})
		}))
		defer ts.Close()

		ecMiddleware := auth.NewMiddlewareWithOptions("", ts.URL)
		claims := auth.SupabaseClaims{Sub: testUserID.String()}
		token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
		token.Header["kid"] = "unknown-kid"
		tokenStr, _ := token.SignedString(otherKey)

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		ecMiddleware.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 Unauthorized for unknown ES256 key, got %d", rec.Code)
		}
	})
}
