// Package csrf guards the state-changing routes of the API against cross-site request forgery.
//
// The web app authenticates with an httpOnly session cookie, so a page on another site could make the browser send a
// write to the API with that cookie. Two cheap checks close that door for every POST, PUT, PATCH and DELETE:
//
//  1. Where the request comes from. Origin present: it must be an allowed origin (or this host). Origin absent but
//     Sec-Fetch-Site present: it must be "same-origin"; "same-site", "cross-site" and "none" are refused. Both
//     absent: allowed, unless a Referer is sent and names a site that is not allowed. Reasoning for allowing the
//     bare request: current browsers send Origin on every cross-origin write (and on same-origin writes in Chrome,
//     Safari and Firefox) and Sec-Fetch-Site on everything, so a request with neither was not made by a browser
//     acting for a logged-in victim. Clients without a browser (curl, tests, servers) authenticate with a bearer
//     token they hold themselves; there is no ambient credential for a third party to ride on.
//  2. What the body is. A form or text/plain post can be forged without a CORS preflight; application/json cannot.
//     A request with a body must say application/json. A request with no body and no Content-Type (a DELETE, or a
//     POST such as restore or copy-yesterday) is allowed.
package csrf

import (
	"mime"
	"net/http"
	"net/url"
	"strings"

	"nutrition-api/internal/auth"
	"nutrition-api/pkg/response"
)

// ProductionOrigin is always allowed, whatever CORS_ORIGINS says.
const ProductionOrigin = "https://lehongkhanh.vn"

// Options configure Middleware.
type Options struct {
	// AllowedOrigins is the configured list (cfg.AllowedOrigins). ProductionOrigin is added to it.
	AllowedOrigins []string
	// ExemptPaths are exact request paths that skip both checks: server-to-server webhooks that have no browser
	// Origin and verify their own signature.
	ExemptPaths []string
}

func isWrite(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	}
	return false
}

// hasBody reports whether the request may carry a body. Unknown length (chunked) counts as a body.
func hasBody(r *http.Request) bool {
	if r.Body == nil || r.Body == http.NoBody {
		return false
	}
	return r.ContentLength != 0
}

func isJSON(contentType string) bool {
	mediaType, _, err := mime.ParseMediaType(contentType)
	return err == nil && mediaType == "application/json"
}

// originOK applies check 1.
func originOK(r *http.Request, allowed []string) bool {
	if origin := r.Header.Get("Origin"); origin != "" {
		return auth.MatchOrigin(origin, r.Host, allowed)
	}
	if site := r.Header.Get("Sec-Fetch-Site"); site != "" {
		return site == "same-origin"
	}
	// Neither header: a Referer, if the client sent one, must still point at an allowed site
	if ref := r.Header.Get("Referer"); ref != "" {
		u, err := url.Parse(ref)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return false
		}
		return auth.MatchOrigin(u.Scheme+"://"+u.Host, r.Host, allowed)
	}
	return true
}

// Middleware returns the guard. Reads (GET, HEAD, OPTIONS) pass untouched.
func Middleware(opts Options) func(http.Handler) http.Handler {
	allowed := append(append([]string{}, opts.AllowedOrigins...), ProductionOrigin)
	exempt := make(map[string]bool, len(opts.ExemptPaths))
	for _, p := range opts.ExemptPaths {
		exempt[p] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !isWrite(r.Method) || exempt[strings.TrimRight(r.URL.Path, "/")] {
				next.ServeHTTP(w, r)
				return
			}
			if !originOK(r, allowed) {
				response.Error(w, http.StatusForbidden, response.CodeCSRFOrigin, "Request origin not allowed")
				return
			}
			ct := r.Header.Get("Content-Type")
			if ct == "" && !hasBody(r) {
				next.ServeHTTP(w, r)
				return
			}
			if !isJSON(ct) {
				response.Error(w, http.StatusForbidden, response.CodeCSRFContentType, "Content-Type must be application/json")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
