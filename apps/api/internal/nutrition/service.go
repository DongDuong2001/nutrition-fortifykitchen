package nutrition

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"nutrition-api/internal/diary"
)

type CreateCustomFoodRequest struct {
	Name             string               `json:"name"`
	ServingSizeG     float64              `json:"serving_size_g"`
	Per100gNutrients diary.NutrientValues `json:"per_100g_nutrients"`
}

type Service interface {
	SearchFoods(ctx context.Context, query string, limit, offset int) ([]diary.Food, error)
	CreateCustomFood(ctx context.Context, userID uuid.UUID, req CreateCustomFoodRequest) (*diary.Food, error)
	SyncFortifyMenu(ctx context.Context) (int, error)
}

type nutritionService struct {
	repo       Repository
	httpClient *http.Client
}

func NewService(repo Repository) Service {
	return &nutritionService{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *nutritionService) SearchFoods(ctx context.Context, query string, limit, offset int) ([]diary.Food, error) {
	return s.repo.ListFoods(ctx, query, limit, offset)
}

func (s *nutritionService) CreateCustomFood(ctx context.Context, userID uuid.UUID, req CreateCustomFoodRequest) (*diary.Food, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("food name is required")
	}
	if req.ServingSizeG <= 0 {
		req.ServingSizeG = 100
	}

	food := &diary.Food{
		ID:               uuid.New(),
		Name:             req.Name,
		ServingSizeG:     req.ServingSizeG,
		Per100gNutrients: req.Per100gNutrients,
		IsCustom:         true,
		CreatedBy:        &userID,
	}

	return s.repo.CreateFood(ctx, food)
}

// SyncFortifyMenu synchronizes meals from Fortify Kitchen Core API using API Key header
func (s *nutritionService) SyncFortifyMenu(ctx context.Context) (int, error) {
	coreURL := os.Getenv("FORTIFY_CORE_API_URL")
	apiKey := os.Getenv("FORTIFY_CORE_API_KEY")
	if coreURL == "" || apiKey == "" {
		return 0, fmt.Errorf("FORTIFY_CORE_API_URL or FORTIFY_CORE_API_KEY is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, coreURL+"/api/v1/menu/items", nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create menu sync request: %w", err)
	}

	req.Header.Set("X-API-Key", apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("fortify kitchen core request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("fortify core api returned status: %d", resp.StatusCode)
	}

	var menuResponse struct {
		Items []struct {
			ID           uuid.UUID            `json:"id"`
			Name         string               `json:"name"`
			ServingSizeG float64              `json:"serving_size_g"`
			Nutrients    diary.NutrientValues `json:"per_100g_nutrients"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&menuResponse); err != nil {
		return 0, fmt.Errorf("failed to decode core menu items: %w", err)
	}

	foods := make([]diary.Food, len(menuResponse.Items))
	for i, item := range menuResponse.Items {
		foods[i] = diary.Food{
			ID:               item.ID,
			Name:             item.Name,
			ServingSizeG:     item.ServingSizeG,
			Per100gNutrients: item.Nutrients,
			IsCustom:         false,
		}
	}

	if err := s.repo.UpsertBatchFoods(ctx, foods); err != nil {
		return 0, fmt.Errorf("failed to upsert foods: %w", err)
	}

	return len(foods), nil
}
