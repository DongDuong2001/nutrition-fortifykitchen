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

	return &Config{
		Port:              port,
		DatabaseURL:       dbURL,
		SupabaseURL:       os.Getenv("SUPABASE_URL"),
		SupabaseAnonKey:   os.Getenv("SUPABASE_ANON_KEY"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		SentryDSN:         os.Getenv("SENTRY_DSN"),
		Environment:       env,
		AllowedOrigins:    origins,
	}
}
