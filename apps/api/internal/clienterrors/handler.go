// Package clienterrors takes failure reports from the web app (POST /api/v1/client-errors) and logs each as one
// structured line with event "client_error", so `docker compose logs api | grep client_error` shows what failed for
// real users: a refused write, a sync, the share image, setup. Nothing personal is kept beyond the user id: the
// query string of the route and path is dropped and every field is cut short.
package clienterrors

import (
	"encoding/json"
	"net/http"
	"strings"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/logger"
	"nutrition-api/pkg/response"
)

// Report is one failure seen by the web app.
type Report struct {
	Kind    string `json:"kind"`
	Route   string `json:"route"`
	Method  string `json:"method"`
	Path    string `json:"path"`
	Status  int    `json:"status"`
	Message string `json:"message"`
	Version string `json:"version"`
}

const maxBody = 4096

var kinds = map[string]bool{
	"write":      true,
	"sync":       true,
	"share":      true,
	"setup":      true,
	"storage":    true,
	"outbox_age": true,
}

func cut(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) > n {
		return s[:n]
	}
	return s
}

func withoutQuery(s string) string {
	if i := strings.IndexAny(s, "?#"); i >= 0 {
		return s[:i]
	}
	return s
}

// Handle logs one report and answers 204. Rate limited per user (or per address when signed out) in the router.
func Handle(w http.ResponseWriter, r *http.Request) {
	var rep Report
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody)).Decode(&rep); err != nil || !kinds[rep.Kind] {
		response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid client error report")
		return
	}
	event := logger.Log.Warn().
		Str("event", "client_error").
		Str("kind", rep.Kind).
		Str("route", cut(withoutQuery(rep.Route), 120)).
		Str("method", cut(rep.Method, 10)).
		Str("path", cut(withoutQuery(rep.Path), 160)).
		Int("status", rep.Status).
		Str("error_message", cut(rep.Message, 300)).
		Str("version", cut(rep.Version, 40))
	if userID, err := auth.GetUserID(r.Context()); err == nil {
		event = event.Str("user_id", userID.String())
	}
	event.Msg("client_error")
	w.WriteHeader(http.StatusNoContent)
}
