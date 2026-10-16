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
	"github.com/jackc/pgx/v5/pgxpool"

	"nutrition-api/internal/auth"
	"nutrition-api/internal/coaching"
	"nutrition-api/internal/config"
	"nutrition-api/internal/diary"
	"nutrition-api/internal/library"
	"nutrition-api/internal/logger"
	"nutrition-api/internal/nutrition"
	"nutrition-api/internal/payment"
	"nutrition-api/internal/profile"
	"nutrition-api/internal/ratelimit"
	"nutrition-api/internal/trends"
	"nutrition-api/internal/vault"
	"nutrition-api/pkg/database"
	"nutrition-api/pkg/response"
)

func main() {
	// 1. Load centralized configuration
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		logger.Log.Fatal().Err(err).Msg("Configuration validation failed")
	}

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
	dbClient, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Log.Fatal().Err(err).Msg("Database connection initialization failed")
	}
	defer dbClient.Close()
	logger.Log.Info().Msg("PostgreSQL 17 connection pool established (session mode, search_path: nutrition, public, extensions)")

	// 4. Build router
	r := SetupRouter(cfg, dbClient.Pool)

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

func SetupRouter(cfg *config.Config, pool *pgxpool.Pool) chi.Router {
	// Initialize Repositories and Services
	profileRepo := profile.NewRepository(pool)
	profileService := profile.NewService(profileRepo)
	profileHandler := profile.NewHandler(profileService)

	libraryRepo := library.NewRepository(pool)

	diaryRepo := diary.NewRepository(pool)
	diaryService := diary.NewService(diaryRepo, libraryRepo)
	diaryHandler := diary.NewHandler(diaryService)

	libraryService := library.NewService(libraryRepo, diaryService)
	libraryHandler := library.NewHandler(libraryService)

	nutritionRepo := nutrition.NewRepository(pool)
	nutritionService := nutrition.NewService(nutritionRepo)
	nutritionHandler := nutrition.NewHandler(nutritionService)

	vaultService := vault.NewService(pool)
	vaultHandler := vault.NewHandler(vaultService)

	paymentService := payment.NewService(pool)
	paymentHandler := payment.NewHandler(paymentService)

	trendsRepo := trends.NewRepository(pool)
	trendsService := trends.NewService(trendsRepo)
	trendsHandler := trends.NewHandler(trendsService)

	coachingRepo := coaching.NewRepository(pool)
	coachingService := coaching.NewService(coachingRepo)
	coachingHandler := coaching.NewHandler(coachingService)

	userRateLimiter := ratelimit.NewUserRateLimiter(60)

	if cfg.SupabaseJWTSecret == "" && os.Getenv("SUPABASE_SERVICE_ROLE_KEY") == "" && cfg.SupabaseJWKSURL == "" && cfg.SupabaseURL == "" {
		logger.Log.Fatal().Msg("Authentication configuration missing: SUPABASE_JWT_SECRET (or SUPABASE_SERVICE_ROLE_KEY) or SUPABASE_JWKS_URL (or SUPABASE_URL) is required to start the server")
	}

	authMiddleware := auth.NewMiddleware().WithAllowedOrigins(cfg.AllowedOrigins).WithRoleLookup(profileRepo)

	// Setup Chi Router
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(logger.RequestLogger)
	r.Use(MaxBodySize(2 * 1024 * 1024)) // 2 MB maximum payload size to prevent memory exhaustion DoS
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
		dbStatus := "disabled"
		if pool != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()

			if err := pool.Ping(ctx); err != nil {
				logger.Log.Error().Err(err).Msg("Health check database ping failed")
				response.JSON(w, http.StatusServiceUnavailable, map[string]string{
					"status":   "unhealthy",
					"database": "down",
					"time":     time.Now().UTC().Format(time.RFC3339),
				})
				return
			}
			dbStatus = "healthy"
		}

		response.JSON(w, http.StatusOK, map[string]string{
			"status":   "healthy",
			"database": dbStatus,
			"time":     time.Now().UTC().Format(time.RFC3339),
		})
	})

	// API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public Webhook: PayOS VietQR
		r.Post("/payments/webhook", paymentHandler.HandleWebhook)

		// Public Webhook: GitHub Vault Ingestion
		r.Post("/vault/webhook", vaultHandler.HandleWebhook)

		// Food catalog routes (public browsing allowed)
		r.Route("/foods", func(r chi.Router) {
			r.Get("/", nutritionHandler.SearchFoods)
			r.Get("/rich-in", nutritionHandler.GetFoodsRichIn)
			r.Get("/rich-in/{nutrient}", nutritionHandler.GetFoodsRichIn)
			r.Get("/{id}", nutritionHandler.GetFoodByID)
		})

		// Authenticated Routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)
			r.Use(userRateLimiter.LimitWrites)

			// Profile & Weight endpoints (Phase 1)
			r.Route("/me", func(r chi.Router) {
				r.Get("/", profileHandler.GetMe)
				r.Get("/profile", profileHandler.GetMe)
				r.Put("/profile", profileHandler.UpdateProfile)
				r.Get("/weight", profileHandler.GetWeightLogs)
				r.Put("/weight/{date}", profileHandler.UpsertWeight)
				r.Delete("/", profileHandler.DeleteMe)
			})

			// Custom food creation & deletion
			r.Post("/foods/custom", nutritionHandler.CreateCustomFood)
			r.Delete("/foods/custom/{id}", nutritionHandler.DeleteCustomFood)

			// Diary routes (Phase 3)
			r.Route("/days/{date}", func(r chi.Router) {
				r.Get("/", diaryHandler.GetDay)
				r.Post("/entries", diaryHandler.CreateEntry)
				r.Post("/entries/from-saved/{id}", libraryHandler.AddFromSaved)
				r.Post("/copy-yesterday", diaryHandler.CopyYesterday)
				r.Delete("/meals/{meal}", diaryHandler.DeleteMeal)
				r.Put("/training", diaryHandler.SetTraining)
			})

			r.Route("/entries/{id}", func(r chi.Router) {
				r.Patch("/", diaryHandler.UpdateEntry)
				r.Post("/restore", diaryHandler.RestoreEntry)
				r.Delete("/", diaryHandler.DeleteEntry)
			})

			// Library routes (Phase 4)
			r.Route("/favourites", func(r chi.Router) {
				r.Get("/", libraryHandler.GetFavourites)
				r.Post("/", libraryHandler.AddFavourite)
				r.Delete("/{food_id}", libraryHandler.RemoveFavourite)
			})

			r.Get("/recents", libraryHandler.GetRecents)

			r.Route("/saved-meals", func(r chi.Router) {
				r.Get("/", libraryHandler.GetSavedMeals)
				r.Post("/", libraryHandler.CreateSavedMeal)
				r.Delete("/{id}", libraryHandler.DeleteSavedMeal)
			})

			// Trends route (Phase 5)
			r.Get("/trends", trendsHandler.GetTrends)

			// Coaching routes (Level 4 application & status)
			r.Route("/coaches", func(r chi.Router) {
				r.Post("/apply", coachingHandler.Apply)
				r.Get("/my-application", coachingHandler.GetMyApplication)
			})
		})

		// Admin Protected Routes (Role == "admin")
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)
			r.Use(authMiddleware.RequireAdmin)

			r.Route("/admin", func(r chi.Router) {
				r.Get("/drafts", vaultHandler.ListDrafts)
				r.Patch("/drafts/{id}/status", vaultHandler.UpdateDraftStatus)
				r.Get("/coach-applications", coachingHandler.ListApplications)
				r.Patch("/coach-applications/{id}/status", coachingHandler.UpdateStatus)
			})
		})
	})

	return r
}

// MaxBodySize limits incoming request body size to mitigate memory exhaustion DoS attacks
func MaxBodySize(limitBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limitBytes)
			next.ServeHTTP(w, r)
		})
	}
}

