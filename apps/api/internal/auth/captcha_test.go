package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCaptchaVerifier(t *testing.T) {
	t.Run("returns true on success", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Fatalf("expected POST, got %s", r.Method)
			}
			if err := r.ParseForm(); err != nil {
				t.Fatalf("failed to parse form: %v", err)
			}
			if r.FormValue("secret") != "test-secret" {
				t.Errorf("expected secret test-secret, got %s", r.FormValue("secret"))
			}
			if r.FormValue("response") != "test-token" {
				t.Errorf("expected response test-token, got %s", r.FormValue("response"))
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"success": true,
			})
		}))
		defer ts.Close()

		v := NewCaptchaVerifier("test-secret", "test-sitekey")
		v.VerifyURL = ts.URL

		ok, codes, err := v.VerifyToken(context.Background(), "test-token", "127.0.0.1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !ok {
			t.Errorf("expected true, got false")
		}
		if len(codes) != 0 {
			t.Errorf("expected empty codes, got %v", codes)
		}
	})

	t.Run("returns error codes on failure", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"success":     false,
				"error-codes": []string{"invalid-input-response"},
			})
		}))
		defer ts.Close()

		v := NewCaptchaVerifier("test-secret", "test-sitekey")
		v.VerifyURL = ts.URL

		ok, codes, err := v.VerifyToken(context.Background(), "invalid-token", "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ok {
			t.Errorf("expected false, got true")
		}
		if len(codes) != 1 || codes[0] != "invalid-input-response" {
			t.Errorf("expected invalid-input-response, got %v", codes)
		}
	})

	t.Run("fails fast on empty token", func(t *testing.T) {
		v := NewCaptchaVerifier("test-secret", "test-sitekey")
		ok, codes, err := v.VerifyToken(context.Background(), "", "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ok {
			t.Errorf("expected false, got true")
		}
		if len(codes) == 0 || codes[0] != "missing-input-response" {
			t.Errorf("expected missing-input-response, got %v", codes)
		}
	})
}
