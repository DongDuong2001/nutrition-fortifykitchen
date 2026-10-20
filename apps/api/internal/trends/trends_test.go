package trends

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

type SharedPeriodVectors struct {
	AveragesCases []struct {
		Name             string           `json:"name"`
		Today            string           `json:"today"`
		Days             []TrendDayTotals `json:"days"`
		Output           PeriodAverages   `json:"output"`
		TargetDaysOutput struct {
			Calories  TargetCount            `json:"calories"`
			Protein   TargetCount            `json:"protein"`
			Nutrients map[string]TargetCount `json:"nutrients"`
		} `json:"targetDaysOutput"`
	} `json:"averages_cases"`

	MacroCases []struct {
		Input struct {
			Protein *float64 `json:"protein"`
			Carbs   *float64 `json:"carbs"`
			Fat     *float64 `json:"fat"`
		} `json:"input"`
		Output *MacroSplit `json:"output"`
	} `json:"macro_cases"`

	ComparisonCases []struct {
		Name     string         `json:"name"`
		Current  PeriodAverages `json:"current"`
		Previous PeriodAverages `json:"previous"`
		Output   []PeriodChange `json:"output"`
	} `json:"comparison_cases"`

	WeightCases []struct {
		Name   string        `json:"name"`
		Log    []WeightPoint `json:"log"`
		Period struct {
			Start string `json:"start"`
			End   string `json:"end"`
		} `json:"period"`
		Output WeightSummary `json:"output"`
	} `json:"weight_cases"`
}

func almostEqual(a, b *float64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return math.Abs(*a-*b) < 1e-4
}

func TestSharedPeriodVectors(t *testing.T) {
	candidates := []string{
		filepath.Join("..", "..", "..", "..", "packages", "vectors", "period.json"),
		filepath.Join("..", "..", "packages", "vectors", "period.json"),
		filepath.Join("..", "..", "..", "packages", "vectors", "period.json"),
		filepath.Join("packages", "vectors", "period.json"),
		"D:/nutrition-meals/packages/vectors/period.json",
	}

	var data []byte
	var err error
	for _, p := range candidates {
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if err != nil {
		t.Skipf("period.json not found: %v", err)
		return
	}

	var vectors SharedPeriodVectors
	if err := json.Unmarshal(data, &vectors); err != nil {
		t.Fatalf("failed to unmarshal period.json: %v", err)
	}

	// 1. Verify Period Averages Cases
	for idx, tc := range vectors.AveragesCases {
		t.Run("Averages_"+tc.Name, func(t *testing.T) {
			got := ComputePeriodAverages(tc.Days, tc.Today)
			if got.LoggedDays != tc.Output.LoggedDays {
				t.Errorf("[%d] LoggedDays mismatch: got %d, want %d", idx, got.LoggedDays, tc.Output.LoggedDays)
			}
			if !almostEqual(got.Calories, tc.Output.Calories) {
				t.Errorf("[%d] Calories mismatch: got %v, want %v", idx, got.Calories, tc.Output.Calories)
			}
			if !almostEqual(got.Protein, tc.Output.Protein) {
				t.Errorf("[%d] Protein mismatch: got %v, want %v", idx, got.Protein, tc.Output.Protein)
			}
			if !almostEqual(got.Carbs, tc.Output.Carbs) {
				t.Errorf("[%d] Carbs mismatch: got %v, want %v", idx, got.Carbs, tc.Output.Carbs)
			}
			if !almostEqual(got.Fat, tc.Output.Fat) {
				t.Errorf("[%d] Fat mismatch: got %v, want %v", idx, got.Fat, tc.Output.Fat)
			}
			if !almostEqual(got.Fiber, tc.Output.Fiber) {
				t.Errorf("[%d] Fiber mismatch: got %v, want %v", idx, got.Fiber, tc.Output.Fiber)
			}

			for _, k := range CountedNutrientKeys {
				if !almostEqual(got.Nutrients[k], tc.Output.Nutrients[k]) {
					t.Errorf("[%d] Nutrient %s mismatch: got %v, want %v", idx, k, got.Nutrients[k], tc.Output.Nutrients[k])
				}
			}
		})
	}

	// 2. Verify Macro Composition Cases
	for idx, tc := range vectors.MacroCases {
		t.Run("MacroComposition", func(t *testing.T) {
			got := ComputeMacroComposition(tc.Input.Protein, tc.Input.Carbs, tc.Input.Fat)
			if tc.Output == nil {
				if got != nil {
					t.Errorf("[%d] expected nil, got %+v", idx, got)
				}
				return
			}
			if got == nil {
				t.Fatalf("[%d] expected %+v, got nil", idx, tc.Output)
			}
			if got.Protein != tc.Output.Protein || got.Carbs != tc.Output.Carbs || got.Fat != tc.Output.Fat {
				t.Errorf("[%d] MacroSplit mismatch: got %+v, want %+v", idx, got, tc.Output)
			}
		})
	}

	// 3. Verify Comparison Cases
	for idx, tc := range vectors.ComparisonCases {
		t.Run("Comparison_"+tc.Name, func(t *testing.T) {
			got := ComputeComparePeriods(tc.Current, tc.Previous)
			if len(got) != len(tc.Output) {
				t.Fatalf("[%d] changes count mismatch: got %d, want %d", idx, len(got), len(tc.Output))
			}
			for i := range got {
				if got[i].Key != tc.Output[i].Key {
					t.Errorf("[%d][%d] Key mismatch: got %s, want %s", idx, i, got[i].Key, tc.Output[i].Key)
				}
				if math.Abs(got[i].Delta-tc.Output[i].Delta) > 1e-4 {
					t.Errorf("[%d][%d] Delta mismatch: got %f, want %f", idx, i, got[i].Delta, tc.Output[i].Delta)
				}
				if math.Abs(got[i].DeltaPct-tc.Output[i].DeltaPct) > 1e-4 {
					t.Errorf("[%d][%d] DeltaPct mismatch: got %f, want %f", idx, i, got[i].DeltaPct, tc.Output[i].DeltaPct)
				}
			}
		})
	}

	// 4. Verify Weight Summary Cases
	for idx, tc := range vectors.WeightCases {
		t.Run("Weight_"+tc.Name, func(t *testing.T) {
			got := ComputeWeightSummary(tc.Log, tc.Period.Start, tc.Period.End)
			if !almostEqual(got.Latest, tc.Output.Latest) {
				t.Errorf("[%d] Latest mismatch: got %v, want %v", idx, got.Latest, tc.Output.Latest)
			}
			if !almostEqual(got.Change, tc.Output.Change) {
				t.Errorf("[%d] Change mismatch: got %v, want %v", idx, got.Change, tc.Output.Change)
			}
			if !almostEqual(got.SinceStart, tc.Output.SinceStart) {
				t.Errorf("[%d] SinceStart mismatch: got %v, want %v", idx, got.SinceStart, tc.Output.SinceStart)
			}
			if tc.Output.StartDate == nil {
				if got.StartDate != nil {
					t.Errorf("[%d] StartDate expected nil, got %v", idx, *got.StartDate)
				}
			} else {
				if got.StartDate == nil || *got.StartDate != *tc.Output.StartDate {
					t.Errorf("[%d] StartDate mismatch: got %v, want %v", idx, got.StartDate, tc.Output.StartDate)
				}
			}
			if len(got.Points) != len(tc.Output.Points) {
				t.Errorf("[%d] Points count mismatch: got %d, want %d", idx, len(got.Points), len(tc.Output.Points))
			}
		})
	}
}

type mockTrendsRepo struct {
	days []TrendDayTotals
}

func (m *mockTrendsRepo) GetHistoryDays(ctx context.Context, userID uuid.UUID, startDate string, endDate string) ([]TrendDayTotals, error) {
	return m.days, nil
}
func (m *mockTrendsRepo) GetDayTrainingFlags(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string]bool, error) {
	return map[string]bool{}, nil
}
func (m *mockTrendsRepo) GetUserTargets(ctx context.Context, userID uuid.UUID) (*targets.CompleteTargets, string, float64, error) {
	t := targets.CalculateTargets(targets.UserProfileForTargets{
		Sex:             "male",
		WeightKg:        70,
		Goal:            "maintain",
		TrainingMinutes: 60,
	})
	return &t, "maintain", 70, nil
}
func (m *mockTrendsRepo) GetWeightLogs(ctx context.Context, userID uuid.UUID, upToDate string) ([]WeightPoint, error) {
	return []WeightPoint{{Date: "2026-10-10", Kg: 70.0}}, nil
}
func (m *mockTrendsRepo) GetTopFoodsForPeriod(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string][]FoodContribution, error) {
	return map[string][]FoodContribution{}, nil
}
func (m *mockTrendsRepo) GetStreak(ctx context.Context, userID uuid.UUID, todayIso string) (int, error) {
	return 3, nil
}

func TestTrendsService_GetTrends(t *testing.T) {
	cal := 2000.0
	pro := 140.0
	carb := 220.0
	fat := 60.0
	fib := 25.0
	ca := 1000.0

	repo := &mockTrendsRepo{
		days: []TrendDayTotals{
			{
				Date:     "2026-10-10",
				Logged:   true,
				Calories: &cal,
				Protein:  &pro,
				Carbs:    &carb,
				Fat:      &fat,
				Fiber:    &fib,
				Nutrients: map[string]*float64{
					"calcium": &ca,
				},
			},
		},
	}
	svc := NewService(repo)

	userID := uuid.New()
	res, err := svc.GetTrends(context.Background(), userID, 7, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Days != 7 {
		t.Errorf("expected 7 days, got %d", res.Days)
	}
	if res.Streak != 3 {
		t.Errorf("expected streak 3, got %d", res.Streak)
	}
	if len(res.NutrientStatus) != 22 {
		t.Errorf("expected 22 nutrient status items, got %d", len(res.NutrientStatus))
	}
	if res.MacroComposition == nil {
		t.Errorf("expected non-nil macro composition")
	}
	if res.WeightImpact == nil {
		t.Errorf("expected non-nil weight impact")
	}
}
