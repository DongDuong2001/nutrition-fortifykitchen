package csrf

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMiddleware(t *testing.T) {
	handler := Middleware(Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		ExemptPaths:    []string{"/api/v1/payments/webhook", "/api/v1/vault/webhook"},
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	const json = "application/json"
	tests := []struct {
		name       string
		method     string
		path       string
		body       string // empty means no body at all
		headers    map[string]string
		wantStatus int
		wantCode   string
	}{
		{"allowed origin with json", "POST", "/api/v1/days/2026-10-20/entries", `{"a":1}`, map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": json}, 204, ""},
		{"configured origin", "PUT", "/api/v1/me/profile", `{}`, map[string]string{"Origin": "http://localhost:3000", "Content-Type": json}, 204, ""},
		{"origin compare ignores case and trailing slash", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "HTTPS://LehongKhanh.vn/", "Content-Type": json}, 204, ""},
		{"production origin always allowed", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": json}, 204, ""},
		{"origin equal to the request host", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "http://example.com", "Content-Type": json}, 204, ""},
		{"wrong origin", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "https://evil.example", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"null origin", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "null", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"wrong origin beats good fetch metadata", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "https://evil.example", "Sec-Fetch-Site": "same-origin", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"no origin, same-origin fetch metadata", "POST", "/api/v1/x", `{}`, map[string]string{"Sec-Fetch-Site": "same-origin", "Content-Type": json}, 204, ""},
		{"no origin, cross-site fetch metadata", "POST", "/api/v1/x", `{}`, map[string]string{"Sec-Fetch-Site": "cross-site", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"no origin, same-site fetch metadata", "POST", "/api/v1/x", `{}`, map[string]string{"Sec-Fetch-Site": "same-site", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"no origin, fetch metadata none", "POST", "/api/v1/x", `{}`, map[string]string{"Sec-Fetch-Site": "none", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"no origin, no fetch metadata (non-browser client)", "POST", "/api/v1/x", `{}`, map[string]string{"Content-Type": json}, 204, ""},
		{"no origin, referer of an allowed site", "POST", "/api/v1/x", `{}`, map[string]string{"Referer": "https://lehongkhanh.vn/app?d=1", "Content-Type": json}, 204, ""},
		{"no origin, referer of another site", "POST", "/api/v1/x", `{}`, map[string]string{"Referer": "https://evil.example/page", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"form content type refused", "POST", "/api/v1/x", "a=1", map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "application/x-www-form-urlencoded"}, 403, "CSRF_CONTENT_TYPE"},
		{"text/plain refused", "POST", "/api/v1/x", "{}", map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "text/plain;charset=UTF-8"}, 403, "CSRF_CONTENT_TYPE"},
		{"body without content type refused", "POST", "/api/v1/x", "{}", map[string]string{"Origin": "https://lehongkhanh.vn"}, 403, "CSRF_CONTENT_TYPE"},
		{"json with charset allowed", "POST", "/api/v1/x", `{}`, map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "application/json; charset=utf-8"}, 204, ""},
		{"json media type is case-insensitive", "PATCH", "/api/v1/x", `{}`, map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "Application/JSON"}, 204, ""},
		{"empty-body delete without content type allowed", "DELETE", "/api/v1/entries/1", "", map[string]string{"Origin": "https://lehongkhanh.vn"}, 204, ""},
		{"empty-body post without content type allowed (restore)", "POST", "/api/v1/entries/1/restore", "", map[string]string{"Origin": "https://lehongkhanh.vn"}, 204, ""},
		{"empty-body delete with json content type allowed (what the web sends)", "DELETE", "/api/v1/entries/1", "", map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": json}, 204, ""},
		{"empty-body delete still needs an allowed origin", "DELETE", "/api/v1/entries/1", "", map[string]string{"Origin": "https://evil.example"}, 403, "CSRF_ORIGIN"},
		{"empty-body post with a form content type refused", "POST", "/api/v1/x", "", map[string]string{"Origin": "https://lehongkhanh.vn", "Content-Type": "text/plain"}, 403, "CSRF_CONTENT_TYPE"},
		{"payments webhook exempt", "POST", "/api/v1/payments/webhook", `{}`, map[string]string{"Origin": "https://evil.example", "Content-Type": "text/plain"}, 204, ""},
		{"vault webhook exempt", "POST", "/api/v1/vault/webhook", `{}`, map[string]string{"Content-Type": "application/x-www-form-urlencoded", "Sec-Fetch-Site": "cross-site"}, 204, ""},
		{"webhook prefix is not exempt", "POST", "/api/v1/payments/webhook/extra", `{}`, map[string]string{"Origin": "https://evil.example", "Content-Type": json}, 403, "CSRF_ORIGIN"},
		{"get untouched", "GET", "/api/v1/days", "", map[string]string{"Origin": "https://evil.example"}, 204, ""},
		{"get with form content type untouched", "GET", "/api/v1/foods", "", map[string]string{"Sec-Fetch-Site": "cross-site", "Content-Type": "text/plain"}, 204, ""},
		{"options untouched", "OPTIONS", "/api/v1/days", "", map[string]string{"Origin": "https://evil.example"}, 204, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body io.Reader
			if tt.body != "" {
				body = strings.NewReader(tt.body)
			}
			req := httptest.NewRequest(tt.method, tt.path, body)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status %d, want %d (%s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantCode != "" && !strings.Contains(rec.Body.String(), `"code":"`+tt.wantCode+`"`) {
				t.Errorf("body %s lacks code %s", rec.Body.String(), tt.wantCode)
			}
		})
	}
}

// A CORS_ORIGINS list that forgot the production site still lets the production site write.
func TestMiddlewareAlwaysAllowsProductionOrigin(t *testing.T) {
	handler := Middleware(Options{AllowedOrigins: []string{"http://localhost:3000"}})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/x", strings.NewReader(`{}`))
	req.Header.Set("Origin", "https://lehongkhanh.vn")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status %d", rec.Code)
	}
}
