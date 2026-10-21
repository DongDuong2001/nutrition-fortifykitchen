package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestJWKSCache_TransientFailureDoesNotLockOut(t *testing.T) {
	var requestCount int32
	privKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("failed to generate rsa key: %v", err)
	}

	jwk := JWK{
		Kty: "RSA",
		Kid: "test-key-id",
		N:   base64.RawURLEncoding.EncodeToString(privKey.N.Bytes()),
		E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(privKey.E)).Bytes()),
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&requestCount, 1)
		if count == 1 {
			// First request fails with 500
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		// Subsequent requests succeed with valid JWKS
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(JWKSResponse{Keys: []JWK{jwk}})
	}))
	defer ts.Close()

	cache := NewJWKSCache(ts.URL)

	// 1. First fetch attempt fails
	_, err = cache.GetKey(context.Background(), "test-key-id")
	if err == nil {
		t.Fatal("expected error on first attempt, got nil")
	}

	// Verify lastFetched was NOT updated on failure
	if !cache.lastFetched.IsZero() {
		t.Errorf("lastFetched should be zero after failed fetch, got %v", cache.lastFetched)
	}

	// 2. Immediate second call is throttled by lastAttempt (< 1s)
	_, err = cache.GetKey(context.Background(), "test-key-id")
	if err == nil {
		t.Fatal("expected error while still within 1s throttle, got nil")
	}

	// 3. Fast-forward lastAttempt by > 1s
	cache.mu.Lock()
	cache.lastAttempt = time.Now().Add(-2 * time.Second)
	cache.mu.Unlock()

	// 4. Retry succeeds immediately
	key, err := cache.GetKey(context.Background(), "test-key-id")
	if err != nil {
		t.Fatalf("expected retry to succeed after throttle window, got %v", err)
	}
	if key == nil {
		t.Fatal("expected non-nil public key")
	}

	// Verify lastFetched is now recorded
	if cache.lastFetched.IsZero() {
		t.Error("lastFetched should be recorded after successful fetch")
	}
}
