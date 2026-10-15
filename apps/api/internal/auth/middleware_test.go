package auth_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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

	t.Run("require role - coach accepted for coach or admin", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "coach",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/coach/trainees", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		coachHandler := middlewareWithSecret.Authenticate(middlewareWithSecret.RequireRole("coach", "admin")(testHandler))
		coachHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("require role - regular user rejected", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "user",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/coach/trainees", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		coachHandler := middlewareWithSecret.Authenticate(middlewareWithSecret.RequireRole("coach", "admin")(testHandler))
		coachHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden, got %d", rec.Code)
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

	t.Run("valid signed token accepted via sb-access-token cookie", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.AddCookie(&http.Cookie{
			Name:  "sb-access-token",
			Value: tokenStr,
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for cookie auth, got %d", rec.Code)
		}
	})

	t.Run("valid signed token accepted via Supabase SSR JSON cookie", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		cookieJSON, _ := json.Marshal(map[string]string{
			"access_token": tokenStr,
		})

		req := httptest.NewRequest("GET", "/api/v1/diary/daily", nil)
		req.AddCookie(&http.Cookie{
			Name:  "sb-xyzproject-auth-token",
			Value: url.QueryEscape(string(cookieJSON)),
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for Supabase SSR JSON cookie auth, got %d", rec.Code)
		}
	})

	t.Run("cookie auth on POST with matching Origin header succeeds", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("POST", "/api/v1/diary/entry", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		req.AddCookie(&http.Cookie{
			Name:  "sb-access-token",
			Value: tokenStr,
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for cookie write with allowed Origin, got %d", rec.Code)
		}
	})

	t.Run("cookie auth on POST with matching Referer header succeeds", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("POST", "/api/v1/diary/entry", nil)
		req.Header.Set("Referer", "http://localhost:3000/diary")
		req.AddCookie(&http.Cookie{
			Name:  "sb-access-token",
			Value: tokenStr,
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for cookie write with allowed Referer, got %d", rec.Code)
		}
	})

	t.Run("cookie auth on POST with mismatched Origin header returns 403 Forbidden", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("POST", "/api/v1/diary/entry", nil)
		req.Header.Set("Origin", "https://evil.attacker.com")
		req.AddCookie(&http.Cookie{
			Name:  "sb-access-token",
			Value: tokenStr,
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden for cookie write with disallowed Origin, got %d", rec.Code)
		}
	})

	t.Run("cookie auth on POST without Origin/Referer returns 403 Forbidden", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("POST", "/api/v1/diary/entry", nil)
		req.AddCookie(&http.Cookie{
			Name:  "sb-access-token",
			Value: tokenStr,
		})
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden for cookie write without Origin/Referer, got %d", rec.Code)
		}
	})

	t.Run("Bearer auth on POST without Origin header succeeds (exempt from CSRF check)", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
			AppMetadata: map[string]interface{}{
				"role": "authenticated",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("POST", "/api/v1/diary/entry", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		middlewareWithSecret.Authenticate(testHandler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK for Bearer token POST without Origin header, got %d", rec.Code)
		}
	})
}

