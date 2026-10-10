package main

import (
	"context"
	"log"
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
	"nutrition-api/internal/diary"
	"nutrition-api/internal/nutrition"
	"nutrition-api/internal/payment"
	"nutrition-api/internal/vault"
	"nutrition-api/pkg/database"
	"nutrition-api/pkg/response"
)

func main() {
	// 1. Initialize Sentry if DSN is provided
	sentryDSN := os.Getenv("SENTRY_DSN")
	if sentryDSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			TracesSampleRate: 1.0,
			Environment:      os.Getenv("ENVIRONMENT"),
		})
		if err != nil {
			log.Printf("Sentry initialization failed: %v", err)
		} else {
			defer sentry.Flush(2 * time.Second)
			log.Println("Sentry initialized successfully")
		}
	}

	// 2. Initialize PostgreSQL 17 Connection Pool (Session Mode on port 5432)
	ctx := context.Background()
	dbClient, err := database.NewPostgresPool(ctx)
	if err != nil {
		log.Fatalf("Database connection initialization failed: %v", err)
	}
	defer dbClient.Close()
	log.Println("PostgreSQL 17 connection pool established (session mode, search_path: nutrition, public)")

	// 3. Initialize Repositories and Services
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

	// 4. Setup Chi Router
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	if sentryDSN != "" {
		sentryMiddleware := sentryhttp.New(sentryhttp.Options{Repanic: true})
		r.Use(sentryMiddleware.Handle)
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-API-Key"},
		ExposedHeaders:   []string{"Link"},
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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Nutrition API server listening on http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server ListenAndServe error: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down API server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("API server stopped.")
}
