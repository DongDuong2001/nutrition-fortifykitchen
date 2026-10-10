package diary_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"nutrition-api/internal/diary"
)

type mockRepository struct {
	food      *diary.Food
	savedLogs map[uuid.UUID]*diary.DiaryLog
	targets   *diary.NutrientValues
}

func (m *mockRepository) GetFoodByID(ctx context.Context, foodID uuid.UUID) (*diary.Food, error) {
	return m.food, nil
}

func (m *mockRepository) CreateLog(ctx context.Context, log *diary.DiaryLog) (*diary.DiaryLog, error) {
	if existing, ok := m.savedLogs[log.ID]; ok {
		// Idempotent duplicate: return existing without double-adding
		return existing, nil
	}
	m.savedLogs[log.ID] = log
	return log, nil
}

func (m *mockRepository) GetLogsByUserAndDate(ctx context.Context, userID uuid.UUID, logDate time.Time) ([]diary.DiaryLog, error) {
	var list []diary.DiaryLog
	for _, l := range m.savedLogs {
		if l.UserID == userID {
			list = append(list, *l)
		}
	}
	return list, nil
}

func (m *mockRepository) GetUserTarget(ctx context.Context, userID uuid.UUID, targetDate time.Time) (*diary.NutrientValues, error) {
	return m.targets, nil
}

func TestNutrientScalingFormula(t *testing.T) {
	per100g := diary.NutrientValues{
		Calories:      165,
		Protein:       31,
		Fat:           3.6,
		Carbohydrates: 0,
		Fiber:         0,
		Sodium:        74,
		Potassium:     256,
		Calcium:       15,
		Iron:          1.0,
		VitaminC:      0,
	}

	// 200 grams consumed (2.0 quantity * 100g serving size)
	grams := 200.0
	scaled := per100g.Scale(grams)

	if scaled.Calories != 330 {
		t.Errorf("Expected 330 calories, got %f", scaled.Calories)
	}
	if scaled.Protein != 62 {
		t.Errorf("Expected 62g protein, got %f", scaled.Protein)
	}
	if scaled.Fat != 7.2 {
		t.Errorf("Expected 7.2g fat, got %f", scaled.Fat)
	}
	if scaled.Sodium != 148 {
		t.Errorf("Expected 148mg sodium, got %f", scaled.Sodium)
	}
}

func TestDiaryService_LogMeal_Idempotency(t *testing.T) {
	foodID := uuid.New()
	userID := uuid.New()
	clientID := uuid.New()

	mockFood := &diary.Food{
		ID:           foodID,
		Name:         "Grilled Chicken Breast",
		ServingSizeG: 100,
		Per100gNutrients: diary.NutrientValues{
			Calories: 165,
			Protein:  31,
			Fat:      3.6,
		},
	}

	repo := &mockRepository{
		food:      mockFood,
		savedLogs: make(map[uuid.UUID]*diary.DiaryLog),
		targets: &diary.NutrientValues{
			Calories: 2000,
			Protein:  150,
		},
	}

	service := diary.NewService(repo)

	req := diary.LogMealRequest{
		ID:       clientID,
		FoodID:   foodID,
		MealSlot: "lunch",
		Quantity: 1.5, // 150 grams
		LogDate:  time.Now(),
	}

	// First call
	res1, err := service.LogMeal(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("First LogMeal call failed: %v", err)
	}

	if res1.Log.NutrientsSnapshot.Calories != 247.5 {
		t.Errorf("Expected 247.5 calories, got %f", res1.Log.NutrientsSnapshot.Calories)
	}
	if res1.Log.NutrientsSnapshot.Protein != 46.5 {
		t.Errorf("Expected 46.5 protein, got %f", res1.Log.NutrientsSnapshot.Protein)
	}

	// Duplicate call with exact same client-generated UUID
	res2, err := service.LogMeal(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("Second LogMeal call failed: %v", err)
	}

	// Verify idempotency: total calories and logs count should not be doubled
	if res2.TodayProgress.LogsCount != 1 {
		t.Errorf("Expected 1 log entry in today's progress, got %d", res2.TodayProgress.LogsCount)
	}
	if res2.TodayProgress.TotalNutrients.Calories != 247.5 {
		t.Errorf("Expected 247.5 total calories, got %f", res2.TodayProgress.TotalNutrients.Calories)
	}
}
