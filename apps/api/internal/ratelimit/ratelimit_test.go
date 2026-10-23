package ratelimit_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"nutrition-api/internal/ratelimit"
)

func TestUserRateLimiter_LimitWrites(t *testing.T) {
	limiter := ratelimit.NewUserRateLimiter(2)

	handler := limiter.LimitWrites(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// GET request is not limited
	reqGet := httptest.NewRequest(http.MethodGet, "/test", nil)
	reqGet.Header.Set("X-Real-IP", "1.2.3.4")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, reqGet)
	if w.Code != http.StatusOK {
		t.Fatalf("expected GET to pass with 200, got %d", w.Code)
	}

	// 1st POST request
	reqPost1 := httptest.NewRequest(http.MethodPost, "/test", nil)
	reqPost1.Header.Set("X-Real-IP", "1.2.3.4")
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, reqPost1)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected 1st POST to pass with 200, got %d", w1.Code)
	}

	// 2nd POST request
	reqPost2 := httptest.NewRequest(http.MethodPost, "/test", nil)
	reqPost2.Header.Set("X-Real-IP", "1.2.3.4")
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, reqPost2)
	if w2.Code != http.StatusOK {
		t.Fatalf("expected 2nd POST to pass with 200, got %d", w2.Code)
	}

	// 3rd POST request from same IP should be rate limited (429)
	reqPost3 := httptest.NewRequest(http.MethodPost, "/test", nil)
	reqPost3.Header.Set("X-Real-IP", "1.2.3.4")
	w3 := httptest.NewRecorder()
	handler.ServeHTTP(w3, reqPost3)
	if w3.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 3rd POST to be 429, got %d", w3.Code)
	}

	// Different IP should still be allowed
	reqPostOther := httptest.NewRequest(http.MethodPost, "/test", nil)
	reqPostOther.Header.Set("X-Real-IP", "5.6.7.8")
	wOther := httptest.NewRecorder()
	handler.ServeHTTP(wOther, reqPostOther)
	if wOther.Code != http.StatusOK {
		t.Fatalf("expected POST from different IP to pass with 200, got %d", wOther.Code)
	}

	// Request with CF-Connecting-IP takes precedence over X-Real-IP when behind CDN
	reqPostCF := httptest.NewRequest(http.MethodPost, "/test", nil)
	reqPostCF.Header.Set("CF-Connecting-IP", "9.9.9.9")
	reqPostCF.Header.Set("X-Real-IP", "1.2.3.4") // proxy IP that was already rate-limited
	wCF := httptest.NewRecorder()
	handler.ServeHTTP(wCF, reqPostCF)
	if wCF.Code != http.StatusOK {
		t.Fatalf("expected POST with CF-Connecting-IP to pass with 200 despite proxy IP, got %d", wCF.Code)
	}
}
