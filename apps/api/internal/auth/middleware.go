package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
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
}

func NewMiddleware() *Middleware {
	secret := os.Getenv("SUPABASE_JWT_SECRET")
	if secret == "" {
		// Fallback to service role key if JWT secret is not explicitly set
		secret = os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	}
	return &Middleware{
		jwtSecret: []byte(secret),
	}
}

// Authenticate extracts and validates Bearer token, then injects user info into request context
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "missing authorization header")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(w, http.StatusUnauthorized, response.CodeUnauthorized, "invalid authorization header format, expected 'Bearer <token>'")
			return
		}

		tokenStr := strings.TrimSpace(parts[1])
		claims := &SupabaseClaims{}

		// Parse token
		var token *jwt.Token
		var err error

		if len(m.jwtSecret) > 0 {
			token, err = jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return m.jwtSecret, nil
			})
		} else {
			// Dev mode / unverified parsing when secret is not yet configured locally
			parser := jwt.NewParser()
			token, _, err = parser.ParseUnverified(tokenStr, claims)
		}

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
