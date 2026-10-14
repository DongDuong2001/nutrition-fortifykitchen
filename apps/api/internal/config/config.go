package config

import (
	"os"
	"strings"
)

type Config struct {
	Port              string
	DatabaseURL       string
	SupabaseURL       string
	SupabaseAnonKey   string
	SupabaseJWTSecret string
	SupabaseJWKSURL   string
	HCaptchaSecretKey string
	HCaptchaSiteKey   string
	SentryDSN         string
	Environment       string
	AllowedOrigins    []string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	originsStr := os.Getenv("CORS_ORIGINS")
	var origins []string
	if originsStr != "" {
		origins = strings.Split(originsStr, ",")
	} else {
		origins = []string{"http://localhost:3000", "http://localhost:3100", "http://localhost:3101", "http://localhost:3102"}
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	jwksURL := os.Getenv("SUPABASE_JWKS_URL")
	if jwksURL == "" && supabaseURL != "" {
		jwksURL = strings.TrimRight(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
	}

	return &Config{
		Port:              port,
		DatabaseURL:       dbURL,
		SupabaseURL:       supabaseURL,
		SupabaseAnonKey:   os.Getenv("SUPABASE_ANON_KEY"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		SupabaseJWKSURL:   jwksURL,
		HCaptchaSecretKey: os.Getenv("HCAPTCHA_SECRET_KEY"),
		HCaptchaSiteKey:   os.Getenv("HCAPTCHA_SITE_KEY"),
		SentryDSN:         os.Getenv("SENTRY_DSN"),
		Environment:       env,
		AllowedOrigins:    origins,
	}
}
