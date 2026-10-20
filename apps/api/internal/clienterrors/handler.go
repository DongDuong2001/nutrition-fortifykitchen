// Package clienterrors takes failure reports from the web app (POST /api/v1/client-errors) and logs each as one
// structured line with event "client_error", so `docker compose logs api | grep client_error` shows what failed for
// real users: a refused write, a sync, the share image, setup. Nothing personal is kept beyond the user id: the
// query string of the route and path is dropped and every field is cut short.
//
// Kind "vitals" is not a failure but a web-vitals sample (name LCP, INP, CLS, FCP or TTFB, the page's route path and a
// non-negative value). It goes through the same handler and is logged with the same event and message at info level
// (not warn, so alerts on warnings stay about failures), with the fields metric, page and value instead of the
// failure fields.
package clienterrors

import (
	"encoding/json"
	"math"
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

	// Web vitals (kind "vitals" only)
	Name  string   `json:"name"`
	Page  string   `json:"page"`
	Value *float64 `json:"value"`
}

const maxBody = 4096

var kinds = map[string]bool{
	"write":      true,
	"sync":       true,
	"share":      true,
	"setup":      true,
	"storage":    true,
	"outbox_age": true,
	"vitals":     true,
}

// vitalsMetrics are the web vitals accepted as a vitals report's name.
var vitalsMetrics = map[string]bool{
	"LCP":  true,
	"INP":  true,
	"CLS":  true,
	"FCP":  true,
	"TTFB": true,
}

// validVitals reports whether a vitals report names a known metric and carries a finite value of zero or more.
func validVitals(rep Report) bool {
	return vitalsMetrics[rep.Name] && rep.Value != nil && !math.IsNaN(*rep.Value) && !math.IsInf(*rep.Value, 0) && *rep.Value >= 0
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
	if rep.Kind == "vitals" {
		if !validVitals(rep) {
			response.Error(w, http.StatusBadRequest, response.CodeValidationFailed, "Invalid client error report")
			return
		}
		event := logger.Log.Info().
			Str("event", "client_error").
			Str("kind", rep.Kind).
			Str("metric", rep.Name).
			Float64("value", *rep.Value).
			Str("page", cut(withoutQuery(rep.Page), 120)).
			Str("version", cut(rep.Version, 40))
		if userID, err := auth.GetUserID(r.Context()); err == nil {
			event = event.Str("user_id", userID.String())
		}
		event.Msg("client_error")
		w.WriteHeader(http.StatusNoContent)
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
