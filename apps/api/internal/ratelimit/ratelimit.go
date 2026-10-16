package ratelimit

import (
	"net"
	"net/http"
	"sync"
	"time"

	"nutrition-api/internal/auth"
	"nutrition-api/pkg/response"
)

type clientBucket struct {
	tokens     int
	lastRefill time.Time
}

// UserRateLimiter limits write requests to maxWrites per minute per user
type UserRateLimiter struct {
	mu        sync.Mutex
	buckets   map[string]*clientBucket
	maxWrites int
	refill    time.Duration
}

func NewUserRateLimiter(maxWritesPerMinute int) *UserRateLimiter {
	limiter := &UserRateLimiter{
		buckets:   make(map[string]*clientBucket),
		maxWrites: maxWritesPerMinute,
		refill:    time.Minute,
	}

	// Cleanup stale buckets periodically
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			limiter.mu.Lock()
			cutoff := time.Now().Add(-5 * time.Minute)
			for k, b := range limiter.buckets {
				if b.lastRefill.Before(cutoff) {
					delete(limiter.buckets, k)
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

// LimitWrites restricts POST, PUT, PATCH, DELETE to 60 requests per minute per user
func (rl *UserRateLimiter) LimitWrites(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only apply to write methods
		if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodPatch && r.Method != http.MethodDelete {
			next.ServeHTTP(w, r)
			return
		}

		key := r.RemoteAddr
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil && host != "" {
			key = host
		}
		if uid, err := auth.GetUserID(r.Context()); err == nil {
			key = uid.String()
		}

		rl.mu.Lock()
		b, exists := rl.buckets[key]
		now := time.Now()
		if !exists {
			if len(rl.buckets) >= 10000 {
				cutoff := now.Add(-5 * time.Minute)
				for k, oldB := range rl.buckets {
					if oldB.lastRefill.Before(cutoff) {
						delete(rl.buckets, k)
					}
				}
			}
			b = &clientBucket{
				tokens:     rl.maxWrites - 1,
				lastRefill: now,
			}
			rl.buckets[key] = b
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		// Refill tokens
		elapsed := now.Sub(b.lastRefill)
		if elapsed >= rl.refill {
			b.tokens = rl.maxWrites
			b.lastRefill = now
		}

		if b.tokens <= 0 {
			rl.mu.Unlock()
			w.Header().Set("Retry-After", "60")
			response.Error(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Rate limit exceeded. Maximum 60 writes per minute.")
			return
		}

		b.tokens--
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	})
}
