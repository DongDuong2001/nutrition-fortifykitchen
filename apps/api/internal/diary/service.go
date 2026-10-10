package diary

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type LogMealRequest struct {
	ID           uuid.UUID `json:"id"`
	FoodID       uuid.UUID `json:"food_id"`
	MealSlot     string    `json:"meal_slot"`
	Quantity     float64   `json:"quantity"`
	ServingSizeG *float64  `json:"serving_size_g,omitempty"`
	LogDate      time.Time `json:"log_date"`
}

type DailyProgress struct {
	LogDate               string             `json:"log_date"`
	TotalNutrients        NutrientValues     `json:"total_nutrients"`
	TargetNutrients       *NutrientValues    `json:"target_nutrients,omitempty"`
	CompletionPercentages map[string]float64 `json:"completion_percentages,omitempty"`
	LogsCount             int                `json:"logs_count"`
}

type LogMealResponse struct {
	Log           DiaryLog      `json:"log"`
	TodayProgress DailyProgress `json:"today_progress"`
}

type Service interface {
	LogMeal(ctx context.Context, userID uuid.UUID, req LogMealRequest) (*LogMealResponse, error)
	GetDailyProgress(ctx context.Context, userID uuid.UUID, logDate time.Time) (*DailyProgress, []DiaryLog, error)
}

type diaryService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &diaryService{repo: repo}
}

func (s *diaryService) LogMeal(ctx context.Context, userID uuid.UUID, req LogMealRequest) (*LogMealResponse, error) {
	if req.ID == uuid.Nil {
		return nil, errors.New("client-generated log ID is required for idempotency")
	}
	if req.FoodID == uuid.Nil {
		return nil, errors.New("food_id is required")
	}
	if req.MealSlot == "" {
		req.MealSlot = "breakfast"
	}
	if req.Quantity <= 0 {
		return nil, errors.New("quantity must be greater than zero")
	}
	if req.LogDate.IsZero() {
		req.LogDate = time.Now().UTC().Truncate(24 * time.Hour)
	}

	// 1. Fetch food item
	food, err := s.repo.GetFoodByID(ctx, req.FoodID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve food: %w", err)
	}

	// 2. Determine serving size in grams
	servingSizeG := food.ServingSizeG
	if req.ServingSizeG != nil && *req.ServingSizeG > 0 {
		servingSizeG = *req.ServingSizeG
	}
	if servingSizeG <= 0 {
		servingSizeG = 100.0
	}

	// 3. Calculate 26-nutrient formula:
	// grams = quantity * serving_size_g
	// nutrient_value = (per_100g_value * grams) / 100
	grams := req.Quantity * servingSizeG
	nutrientsSnapshot := food.Per100gNutrients.Scale(grams)

	// 4. Create diary entry (Idempotent via ON CONFLICT (id) DO NOTHING)
	entry := &DiaryLog{
		ID:                req.ID,
		UserID:            userID,
		FoodID:            req.FoodID,
		MealSlot:          req.MealSlot,
		Quantity:          req.Quantity,
		ServingSizeG:      servingSizeG,
		NutrientsSnapshot: nutrientsSnapshot,
		LogDate:           req.LogDate,
	}

	savedLog, err := s.repo.CreateLog(ctx, entry)
	if err != nil {
		return nil, fmt.Errorf("failed to save diary log: %w", err)
	}

	// 5. Compute today's total progress
	progress, _, err := s.GetDailyProgress(ctx, userID, req.LogDate)
	if err != nil {
		return nil, fmt.Errorf("failed to compute today's progress: %w", err)
	}

	return &LogMealResponse{
		Log:           *savedLog,
		TodayProgress: *progress,
	}, nil
}

func (s *diaryService) GetDailyProgress(ctx context.Context, userID uuid.UUID, logDate time.Time) (*DailyProgress, []DiaryLog, error) {
	logs, err := s.repo.GetLogsByUserAndDate(ctx, userID, logDate)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get daily logs: %w", err)
	}

	var totals NutrientValues
	for _, l := range logs {
		totals = totals.Add(l.NutrientsSnapshot)
	}

	targets, err := s.repo.GetUserTarget(ctx, userID, logDate)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get targets: %w", err)
	}

	progress := &DailyProgress{
		LogDate:        logDate.Format("2006-01-02"),
		TotalNutrients: totals,
		TargetNutrients: targets,
		LogsCount:      len(logs),
	}

	if targets != nil {
		percentages := make(map[string]float64)
		if targets.Calories > 0 {
			percentages["calories"] = round((totals.Calories / targets.Calories) * 100)
		}
		if targets.Protein > 0 {
			percentages["protein"] = round((totals.Protein / targets.Protein) * 100)
		}
		if targets.Carbohydrates > 0 {
			percentages["carbohydrates"] = round((totals.Carbohydrates / targets.Carbohydrates) * 100)
		}
		if targets.Fat > 0 {
			percentages["fat"] = round((totals.Fat / targets.Fat) * 100)
		}
		if targets.Fiber > 0 {
			percentages["fiber"] = round((totals.Fiber / targets.Fiber) * 100)
		}
		progress.CompletionPercentages = percentages
	}

	return progress, logs, nil
}
