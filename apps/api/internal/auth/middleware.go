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
	jwtSecret []byte
	jwksCache *JWKSCache
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
		jwtSecret: secret,
	}
}

func NewMiddlewareWithOptions(secret string, jwksURL string) *Middleware {
	var cache *JWKSCache
	if jwksURL != "" {
		cache = NewJWKSCache(jwksURL)
	}
	return &Middleware{
		jwtSecret: parseSecretBytes(secret),
		jwksCache: cache,
	}
}

// extractToken retrieves the JWT string from Authorization Bearer header or HTTPOnly session cookies
func extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	// Fallback to HTTPOnly session cookies for web applications
	cookieNames := []string{"sb-access-token", "access_token", "sb_token"}
	for _, name := range cookieNames {
		if cookie, err := r.Cookie(name); err == nil && strings.TrimSpace(cookie.Value) != "" {
			return strings.TrimSpace(cookie.Value)
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
				return obj.AccessToken
			}
			var arr []string
			if err := json.Unmarshal([]byte(val), &arr); err == nil && len(arr) > 0 && arr[0] != "" {
				return arr[0]
			}
			if strings.Count(val, ".") == 2 {
				return val
			}
		}
	}

	return ""
}

// Authenticate extracts and validates Bearer token or session cookie, then injects user info into request context
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := extractToken(r)
		if tokenStr == "" {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "missing authorization header or session cookie")
			return
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
