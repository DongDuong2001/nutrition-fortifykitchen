package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"nutrition-api/pkg/response"
)

type contextKey string

const (
	UserIDKey contextKey = "userID"
	ClaimsKey contextKey = "claims"
	RoleKey   contextKey = "role"
)

// SupabaseClaims represents the standard Supabase Auth JWT claims
type SupabaseClaims struct {
	Sub         string                 `json:"sub"`
	Email       string                 `json:"email"`
	Role        string                 `json:"role"`
	AppMetadata map[string]interface{} `json:"app_metadata"`
	UserMetadata map[string]interface{} `json:"user_metadata"`
	jwt.RegisteredClaims
}

// Middleware handles JWT authentication and user context injection
type Middleware struct {
	jwtSecret      []byte
	jwksCache      *JWKSCache
	allowedOrigins []string
}

func defaultAllowedOrigins() []string {
	originsStr := os.Getenv("CORS_ORIGINS")
	if originsStr == "" {
		originsStr = os.Getenv("CORS_ALLOWED_ORIGINS")
	}
	if originsStr != "" {
		var list []string
		for _, o := range strings.Split(originsStr, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				list = append(list, strings.ToLower(trimmed))
			}
		}
		return list
	}
	return []string{
		"http://localhost:3000",
		"http://localhost:3100",
		"http://localhost:3101",
		"http://localhost:3102",
	}
}

func parseSecretBytes(secret string) []byte {
	if secret == "" {
		return nil
	}
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil && len(decoded) >= 32 {
		return decoded
	}
	return []byte(secret)
}

func NewMiddleware() *Middleware {
	secret := os.Getenv("SUPABASE_JWT_SECRET")
	if secret == "" {
		// Fallback to service role key if JWT secret is not explicitly set
		secret = os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	}

	jwksURL := os.Getenv("SUPABASE_JWKS_URL")
	if jwksURL == "" && os.Getenv("SUPABASE_URL") != "" {
		jwksURL = strings.TrimRight(os.Getenv("SUPABASE_URL"), "/") + "/auth/v1/.well-known/jwks.json"
	}

	return NewMiddlewareWithOptions(secret, jwksURL)
}

func NewMiddlewareWithSecret(secret []byte) *Middleware {
	return &Middleware{
		jwtSecret:      secret,
		allowedOrigins: defaultAllowedOrigins(),
	}
}

func NewMiddlewareWithOptions(secret string, jwksURL string) *Middleware {
	var cache *JWKSCache
	if jwksURL != "" {
		cache = NewJWKSCache(jwksURL)
	}
	return &Middleware{
		jwtSecret:      parseSecretBytes(secret),
		jwksCache:      cache,
		allowedOrigins: defaultAllowedOrigins(),
	}
}

// WithAllowedOrigins overrides the allowed origins for cookie-authenticated CSRF validation
func (m *Middleware) WithAllowedOrigins(origins []string) *Middleware {
	m.allowedOrigins = origins
	return m
}

func isWriteMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func (m *Middleware) validateOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		ref := r.Header.Get("Referer")
		if ref != "" {
			if u, err := url.Parse(ref); err == nil && u.Scheme != "" && u.Host != "" {
				origin = u.Scheme + "://" + u.Host
			}
		}
	}

	if origin == "" {
		return false
	}

	normOrigin := strings.ToLower(strings.TrimRight(origin, "/"))

	// Allow same-origin requests where origin host matches request host
	if u, err := url.Parse(origin); err == nil {
		if strings.EqualFold(u.Host, r.Host) {
			return true
		}
	}

	for _, allowed := range m.allowedOrigins {
		normAllowed := strings.ToLower(strings.TrimRight(allowed, "/"))
		if normAllowed == "*" || normAllowed == normOrigin {
			return true
		}
	}

	return false
}

// extractToken retrieves the JWT string from Authorization Bearer header or HTTPOnly session cookies
// and returns whether the token was retrieved from cookie authentication.
func extractToken(r *http.Request) (string, bool) {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1]), false
		}
	}

	// Fallback to HTTPOnly session cookies for web applications
	cookieNames := []string{"sb-access-token", "access_token", "sb_token"}
	for _, name := range cookieNames {
		if cookie, err := r.Cookie(name); err == nil && strings.TrimSpace(cookie.Value) != "" {
			return strings.TrimSpace(cookie.Value), true
		}
	}

	// Check Supabase SSR session cookies (e.g. sb-<project-ref>-auth-token)
	for _, cookie := range r.Cookies() {
		if strings.HasPrefix(cookie.Name, "sb-") && strings.HasSuffix(cookie.Name, "-auth-token") {
			rawVal := strings.TrimSpace(cookie.Value)
			if rawVal == "" {
				continue
			}

			val := rawVal
			if unescaped, err := url.QueryUnescape(rawVal); err == nil {
				val = unescaped
			}
			if strings.HasPrefix(val, "base64-") {
				b64Str := strings.TrimPrefix(val, "base64-")
				if decoded, err := base64.StdEncoding.DecodeString(b64Str); err == nil {
					val = string(decoded)
				} else if decoded, err := base64.RawStdEncoding.DecodeString(b64Str); err == nil {
					val = string(decoded)
				}
			}

			var obj struct {
				AccessToken string `json:"access_token"`
			}
			if err := json.Unmarshal([]byte(val), &obj); err == nil && obj.AccessToken != "" {
				return obj.AccessToken, true
			}
			var arr []string
			if err := json.Unmarshal([]byte(val), &arr); err == nil && len(arr) > 0 && arr[0] != "" {
				return arr[0], true
			}
			if strings.Count(val, ".") == 2 {
				return val, true
			}
		}
	}

	return "", false
}

// Authenticate extracts and validates Bearer token or session cookie, then injects user info into request context
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr, isCookieAuth := extractToken(r)
		if tokenStr == "" {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "missing authorization header or session cookie")
			return
		}

		// Protect cookie-authenticated mutating requests against CSRF
		if isCookieAuth && isWriteMethod(r.Method) {
			if !m.validateOrigin(r) {
				response.Error(w, http.StatusForbidden, response.CodeForbidden, "cross-origin write not allowed for cookie authentication")
				return
			}
		}

		claims := &SupabaseClaims{}

		// Parse and verify token signature (supports both ECDSA P-256 via JWKS and HMAC)
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			switch t.Method.(type) {
			case *jwt.SigningMethodECDSA:
				if m.jwksCache == nil {
					return nil, errors.New("jwks verification not configured for ecdsa tokens")
				}
				kid, _ := t.Header["kid"].(string)
				return m.jwksCache.GetKey(r.Context(), kid)

			case *jwt.SigningMethodRSA:
				if m.jwksCache == nil {
					return nil, errors.New("jwks verification not configured for rsa tokens")
				}
				kid, _ := t.Header["kid"].(string)
				return m.jwksCache.GetKey(r.Context(), kid)

			case *jwt.SigningMethodHMAC:
				if len(m.jwtSecret) == 0 {
					return nil, errors.New("hmac secret not configured")
				}
				return m.jwtSecret, nil

			default:
				return nil, errors.New("unexpected signing method: " + t.Method.Alg())
			}
		})

		if err != nil || token == nil || claims.Sub == "" {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "invalid or expired token")
			return
		}

		parsedUserID, err := uuid.Parse(claims.Sub)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "invalid user id in token claims")
			return
		}

		// Inject user id and claims into context
		ctx := context.WithValue(r.Context(), UserIDKey, parsedUserID)
		ctx = context.WithValue(ctx, ClaimsKey, claims)

		// Check app_metadata.role
		if roleVal, ok := claims.AppMetadata["role"].(string); ok {
			ctx = context.WithValue(ctx, RoleKey, roleVal)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdmin verifies that the authenticated user possesses the admin role in app_metadata
func (m *Middleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(ClaimsKey).(*SupabaseClaims)
		if !ok || claims == nil {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
			return
		}

		role, hasRole := claims.AppMetadata["role"].(string)
		if !hasRole || role != "admin" {
			response.Error(w, http.StatusForbidden, response.CodeForbidden, "forbidden: administrator role required (app_metadata.role must be admin)")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireRole verifies that the authenticated user possesses one of the specified roles in app_metadata
func (m *Middleware) RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(ClaimsKey).(*SupabaseClaims)
			if !ok || claims == nil {
				response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "unauthorized")
				return
			}

			role, hasRole := claims.AppMetadata["role"].(string)
			if !hasRole || role == "" {
				response.Error(w, http.StatusForbidden, response.CodeForbidden, "forbidden: user lacks required permissions")
				return
			}

			for _, allowed := range allowedRoles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			response.Error(w, http.StatusForbidden, response.CodeForbidden, "forbidden: insufficient role privileges")
		})
	}
}

// GetUserID retrieves the authenticated UUID from request context
func GetUserID(ctx context.Context) (uuid.UUID, error) {
	val := ctx.Value(UserIDKey)
	if id, ok := val.(uuid.UUID); ok {
		return id, nil
	}
	return uuid.Nil, errors.New("user ID not found in context")
}

// GetClaims retrieves the Supabase claims from context
func GetClaims(ctx context.Context) (*SupabaseClaims, bool) {
	claims, ok := ctx.Value(ClaimsKey).(*SupabaseClaims)
	return claims, ok
}

// IsAdmin checks if current context user has admin role
func IsAdmin(ctx context.Context) bool {
	claims, ok := GetClaims(ctx)
	if !ok || claims == nil {
		return false
	}
	role, ok := claims.AppMetadata["role"].(string)
	return ok && role == "admin"
}

// Helper to marshal claims for debugging/logging
func (c *SupabaseClaims) ToJSON() string {
	b, _ := json.Marshal(c)
	return string(b)
}
