package auth_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
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

type fakeRoleLookup struct {
	role  string
	err   error
	calls int
}

func (f *fakeRoleLookup) GetRole(_ context.Context, _ uuid.UUID) (string, error) {
	f.calls++
	return f.role, f.err
}

func TestRoleGuards(t *testing.T) {
	secret := []byte("test-super-secret-key-12345")
	userID := uuid.New()

	// The JWT carries a role that must never matter: profiles.role decides.
	signToken := func(t *testing.T, appRole string) string {
		t.Helper()
		claims := auth.SupabaseClaims{
			Sub:         userID.String(),
			AppMetadata: map[string]interface{}{"role": appRole},
		}
		tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
		if err != nil {
			t.Fatalf("sign token: %v", err)
		}
		return tok
	}

	cases := []struct {
		name      string
		guard     string // "admin" or "coach"
		jwtRole   string
		lookup    fakeRoleLookup
		wantCode  int
		wantNext  bool
		wantCalls int
	}{
		{"user is forbidden on admin", "admin", "authenticated", fakeRoleLookup{role: "user"}, http.StatusForbidden, false, 1},
		{"admin passes admin", "admin", "authenticated", fakeRoleLookup{role: "admin"}, http.StatusOK, true, 1},
		{"coach is forbidden on admin", "admin", "authenticated", fakeRoleLookup{role: "coach"}, http.StatusForbidden, false, 1},
		{"coach passes coach-or-admin", "coach", "authenticated", fakeRoleLookup{role: "coach"}, http.StatusOK, true, 1},
		{"admin passes coach-or-admin", "coach", "authenticated", fakeRoleLookup{role: "admin"}, http.StatusOK, true, 1},
		{"user is forbidden on coach-or-admin", "coach", "authenticated", fakeRoleLookup{role: "user"}, http.StatusForbidden, false, 1},
		{"jwt app_metadata admin is ignored", "admin", "admin", fakeRoleLookup{role: "user"}, http.StatusForbidden, false, 1},
		{"jwt app_metadata coach is ignored", "coach", "coach", fakeRoleLookup{role: "user"}, http.StatusForbidden, false, 1},
		{"missing profile is forbidden", "admin", "admin", fakeRoleLookup{err: auth.ErrNoProfile}, http.StatusForbidden, false, 1},
		{"wrapped missing profile is forbidden", "coach", "coach", fakeRoleLookup{err: fmt.Errorf("lookup: %w", auth.ErrNoProfile)}, http.StatusForbidden, false, 1},
		{"lookup error is 500", "admin", "admin", fakeRoleLookup{err: errors.New("connection refused: db.internal:5432")}, http.StatusInternalServerError, false, 1},
		{"empty role is forbidden", "coach", "coach", fakeRoleLookup{role: ""}, http.StatusForbidden, false, 1},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			lookup := tc.lookup
			mw := auth.NewMiddlewareWithSecret(secret).WithRoleLookup(&lookup)

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			var guarded http.Handler
			if tc.guard == "admin" {
				guarded = mw.RequireAdmin(next)
			} else {
				guarded = mw.RequireRole("coach", "admin")(next)
			}
			h := mw.Authenticate(guarded)

			req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
			req.Header.Set("Authorization", "Bearer "+signToken(t, tc.jwtRole))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if rec.Code != tc.wantCode {
				t.Errorf("status = %d, want %d (body %s)", rec.Code, tc.wantCode, rec.Body.String())
			}
			if nextCalled != tc.wantNext {
				t.Errorf("next called = %v, want %v", nextCalled, tc.wantNext)
			}
			if lookup.calls != tc.wantCalls {
				t.Errorf("lookup calls = %d, want %d", lookup.calls, tc.wantCalls)
			}
			if tc.wantCode == http.StatusInternalServerError && strings.Contains(rec.Body.String(), "db.internal") {
				t.Errorf("500 body leaks lookup error details: %s", rec.Body.String())
			}
		})
	}

	t.Run("no role lookup configured fails closed", func(t *testing.T) {
		mw := auth.NewMiddlewareWithSecret(secret)
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { nextCalled = true })
		req := httptest.NewRequest("GET", "/api/v1/admin/drafts", nil)
		req.Header.Set("Authorization", "Bearer "+signToken(t, "admin"))
		rec := httptest.NewRecorder()
		mw.Authenticate(mw.RequireAdmin(next)).ServeHTTP(rec, req)
		if rec.Code != http.StatusInternalServerError || nextCalled {
			t.Errorf("status = %d next = %v, want 500 and not called", rec.Code, nextCalled)
		}
	})

	t.Run("no authenticated user is 401", func(t *testing.T) {
		mw := auth.NewMiddlewareWithSecret(secret).WithRoleLookup(&fakeRoleLookup{role: "admin"})
		rec := httptest.NewRecorder()
		mw.RequireAdmin(http.NotFoundHandler()).ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
	})
}

func TestOptionalAuthenticate(t *testing.T) {
	validSecret := []byte("test-optional-secret-key-12345")
	mw := auth.NewMiddlewareWithSecret(validSecret)
	testUserID := uuid.New()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, err := auth.GetUserID(r.Context())
		if err == nil {
			w.Header().Set("X-User-ID", uid.String())
		} else {
			w.Header().Set("X-User-ID", "guest")
		}
		w.WriteHeader(http.StatusOK)
	})

	t.Run("no token proceeds as guest", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/foods", nil)
		rec := httptest.NewRecorder()

		mw.OptionalAuthenticate(handler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
		if got := rec.Header().Get("X-User-ID"); got != "guest" {
			t.Errorf("expected guest, got %s", got)
		}
	})

	t.Run("invalid token proceeds as guest", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/foods", nil)
		req.Header.Set("Authorization", "Bearer invalid-token-string")
		rec := httptest.NewRecorder()

		mw.OptionalAuthenticate(handler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
		if got := rec.Header().Get("X-User-ID"); got != "guest" {
			t.Errorf("expected guest, got %s", got)
		}
	})

	t.Run("valid Bearer token injects userID", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/foods", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		rec := httptest.NewRecorder()

		mw.OptionalAuthenticate(handler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
		if got := rec.Header().Get("X-User-ID"); got != testUserID.String() {
			t.Errorf("expected user ID %s, got %s", testUserID.String(), got)
		}
	})

	t.Run("valid session cookie injects userID", func(t *testing.T) {
		claims := auth.SupabaseClaims{
			Sub: testUserID.String(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString(validSecret)

		req := httptest.NewRequest("GET", "/api/v1/foods", nil)
		req.AddCookie(&http.Cookie{Name: "sb-access-token", Value: tokenStr})
		rec := httptest.NewRecorder()

		mw.OptionalAuthenticate(handler).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
		if got := rec.Header().Get("X-User-ID"); got != testUserID.String() {
			t.Errorf("expected user ID %s, got %s", testUserID.String(), got)
		}
	})
}

