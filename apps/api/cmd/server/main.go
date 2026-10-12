package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/config"
	"nutrition-api/internal/diary"
	"nutrition-api/internal/logger"
	"nutrition-api/internal/nutrition"
	"nutrition-api/internal/payment"
	"nutrition-api/internal/vault"
	"nutrition-api/pkg/database"
	"nutrition-api/pkg/response"
)

func main() {
	// 1. Load centralized configuration
	cfg := config.Load()

	// 2. Initialize Sentry if DSN is provided
	if cfg.SentryDSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.SentryDSN,
			TracesSampleRate: 1.0,
			Environment:      cfg.Environment,
		})
		if err != nil {
			logger.Log.Error().Err(err).Msg("Sentry initialization failed")
		} else {
			defer sentry.Flush(2 * time.Second)
			logger.Log.Info().Msg("Sentry initialized successfully")
		}
	}

	// 3. Initialize PostgreSQL 17 Connection Pool
	ctx := context.Background()
	dbClient, err := database.NewPostgresPool(ctx)
	if err != nil {
		logger.Log.Fatal().Err(err).Msg("Database connection initialization failed")
	}
	defer dbClient.Close()
	logger.Log.Info().Msg("PostgreSQL 17 connection pool established (session mode, search_path: nutrition, public)")

	// 4. Initialize Repositories and Services
	diaryRepo := diary.NewRepository(dbClient.Pool)
	diaryService := diary.NewService(diaryRepo)
	diaryHandler := diary.NewHandler(diaryService)

	nutritionRepo := nutrition.NewRepository(dbClient.Pool)
	nutritionService := nutrition.NewService(nutritionRepo)
	nutritionHandler := nutrition.NewHandler(nutritionService)

	vaultService := vault.NewService(dbClient.Pool)
	vaultHandler := vault.NewHandler(vaultService)

	paymentService := payment.NewService(dbClient.Pool)
	paymentHandler := payment.NewHandler(paymentService)

	authMiddleware := auth.NewMiddleware()

	// 5. Setup Chi Router
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(logger.RequestLogger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	if cfg.SentryDSN != "" {
		sentryMiddleware := sentryhttp.New(sentryhttp.Options{Repanic: true})
		r.Use(sentryMiddleware.Handle)
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-API-Key", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health Check
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{
			"status": "healthy",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	// API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public Webhook: PayOS VietQR
		r.Post("/payments/webhook", paymentHandler.HandleWebhook)

		// Public Webhook: GitHub Vault Ingestion
		r.Post("/vault/webhook", vaultHandler.HandleWebhook)

		// Food search (public access allowed for catalog browsing)
		r.Get("/foods", nutritionHandler.SearchFoods)

		// Authenticated Routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)

			// Custom food creation
			r.Post("/foods/custom", nutritionHandler.CreateCustomFood)

			// Diary logs & daily progress
			r.Route("/diary", func(r chi.Router) {
				r.Post("/logs", diaryHandler.LogMeal)
				r.Get("/daily", diaryHandler.GetDailyProgress)
			})
		})

		// Admin Protected Routes (Role == "admin")
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)
			r.Use(authMiddleware.RequireAdmin)

			r.Route("/admin", func(r chi.Router) {
				r.Get("/drafts", vaultHandler.ListDrafts)
				r.Patch("/drafts/{id}/status", vaultHandler.UpdateDraftStatus)
				r.Post("/menu/sync", nutritionHandler.SyncFortifyMenu)
			})
		})
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Log.Info().Str("port", cfg.Port).Msg("Nutrition API server listening")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Fatal().Err(err).Msg("Server ListenAndServe error")
		}
	}()

	<-stop
	logger.Log.Info().Msg("Shutting down API server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	logger.Log.Info().Msg("API server stopped.")
}
