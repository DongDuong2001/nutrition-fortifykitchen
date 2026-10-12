package logger

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

type contextKey string

const (
	RequestIDKey contextKey = "request_id"
	UserIDKey    contextKey = "user_id"
)

var Log zerolog.Logger

func init() {
	zerolog.TimeFieldFormat = time.RFC3339Nano
	level := zerolog.InfoLevel
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = zerolog.DebugLevel
	}

	Log = zerolog.New(os.Stdout).
		Level(level).
		With().
		Timestamp().
		Logger()
}

// RequestLogger returns an HTTP middleware logging requests in JSON format.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}

		ctx := context.WithValue(r.Context(), RequestIDKey, reqID)
		r = r.WithContext(ctx)

		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		w.Header().Set("X-Request-ID", reqID)

		next.ServeHTTP(ww, r)

		duration := time.Since(start)

		event := Log.Info().
			Str("request_id", reqID).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", ww.status).
			Int64("duration_ms", duration.Milliseconds())

		// Add user_id if present in context
		if uid, ok := r.Context().Value(UserIDKey).(string); ok && uid != "" {
			event.Str("user_id", uid)
		}

		event.Msg("HTTP request")
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}
