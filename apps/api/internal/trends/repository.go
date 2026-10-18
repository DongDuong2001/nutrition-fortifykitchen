package trends

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"nutrition-api/internal/targets"
)

type pgxTrendsRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxTrendsRepo{pool: pool}
}

func (r *pgxTrendsRepo) GetHistoryDays(ctx context.Context, userID uuid.UUID, startDate string, endDate string) ([]TrendDayTotals, error) {
	startT, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, err
	}
	endT, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT log_date, calories, nutrients_snapshot
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3 AND deleted_at IS NULL
		ORDER BY log_date ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, startT, endT)
	if err != nil {
		return nil, fmt.Errorf("failed to query trends history: %w", err)
	}
	defer rows.Close()

	dayDataMap := make(map[string][]struct {
		cal       *float64
		nutrients map[string]*float64
	})

	for rows.Next() {
		var logDate time.Time
		var cal *float64
		var nutrientsJSON []byte
		if err := rows.Scan(&logDate, &cal, &nutrientsJSON); err == nil {
			dStr := logDate.Format("2006-01-02")
			var nut map[string]*float64
			if len(nutrientsJSON) > 0 {
				_ = json.Unmarshal(nutrientsJSON, &nut)
			}
			dayDataMap[dStr] = append(dayDataMap[dStr], struct {
				cal       *float64
				nutrients map[string]*float64
			}{cal: cal, nutrients: nut})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed during day totals iteration: %w", err)
	}

	var result []TrendDayTotals
	for cur := startT; !cur.After(endT); cur = cur.AddDate(0, 0, 1) {
		dStr := cur.Format("2006-01-02")
		entries, ok := dayDataMap[dStr]
		if !ok || len(entries) == 0 {
			result = append(result, TrendDayTotals{
				Date:      dStr,
				Logged:    false,
				Nutrients: make(map[string]*float64),
			})
			continue
		}

		var dayCal *float64
		var pro, carb, fat, fiber *float64
		dayNutrients := make(map[string]*float64)

		for _, e := range entries {
			if e.cal != nil && *e.cal >= 0 {
				if dayCal == nil {
					val := 0.0
					dayCal = &val
				}
				*dayCal += *e.cal
			}
			if e.nutrients != nil {
				if p, ok := e.nutrients["protein"]; ok && p != nil {
					if pro == nil {
						val := 0.0
						pro = &val
					}
					*pro += *p
				}
				if c, ok := e.nutrients["carbs"]; ok && c != nil {
					if carb == nil {
						val := 0.0
						carb = &val
					}
					*carb += *c
				}
				if f, ok := e.nutrients["fat"]; ok && f != nil {
					if fat == nil {
						val := 0.0
						fat = &val
					}
					*fat += *f
				}
				if fi, ok := e.nutrients["fiber"]; ok && fi != nil {
					if fiber == nil {
						val := 0.0
						fiber = &val
					}
					*fiber += *fi
				}

				for _, k := range CountedNutrientKeys {
					if v, ok := e.nutrients[k]; ok && v != nil {
						if dayNutrients[k] == nil {
							val := 0.0
							dayNutrients[k] = &val
						}
						*dayNutrients[k] += *v
					}
				}
			}
		}

		result = append(result, TrendDayTotals{
			Date:      dStr,
			Logged:    true,
			Calories:  dayCal,
			Protein:   pro,
			Carbs:     carb,
			Fat:       fat,
			Fiber:     fiber,
			Nutrients: dayNutrients,
		})
	}

	return result, nil
}

func (r *pgxTrendsRepo) GetDayTrainingFlags(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string]bool, error) {
	flags := make(map[string]bool)
	query := `
		SELECT log_date
		FROM nutrition.day_training
		WHERE user_id = $1 AND log_date >= $2::date AND log_date <= $3::date AND minutes > 0
	`
	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return flags, err
	}
	defer rows.Close()

	for rows.Next() {
		var t time.Time
		if err := rows.Scan(&t); err == nil {
			flags[t.Format("2006-01-02")] = true
		}
	}
	return flags, nil
}

func (r *pgxTrendsRepo) GetUserTargets(ctx context.Context, userID uuid.UUID) (*targets.CompleteTargets, string, float64, error) {
	query := `SELECT sex, weight_kg, goal, training_minutes_default, near_period FROM nutrition.profiles WHERE user_id = $1`
	var sex, goal string
	var weightKg float64
	var trainingMinutes int
	var nearPeriod bool

	err := r.pool.QueryRow(ctx, query, userID).Scan(&sex, &weightKg, &goal, &trainingMinutes, &nearPeriod)
	if err != nil {
		if err == pgx.ErrNoRows {
			computed := targets.CalculateTargets(targets.UserProfileForTargets{
				Sex:             "male",
				WeightKg:        65,
				Goal:            "maintain",
				TrainingMinutes: 60,
			})
			return &computed, "maintain", 65, nil
		}
		return nil, "", 0, err
	}

	computed := targets.CalculateTargets(targets.UserProfileForTargets{
		Sex:             sex,
		WeightKg:        weightKg,
		Goal:            goal,
		TrainingMinutes: trainingMinutes,
		IsPeriod:        nearPeriod,
	})

	return &computed, goal, weightKg, nil
}

func (r *pgxTrendsRepo) GetWeightLogs(ctx context.Context, userID uuid.UUID, upToDate string) ([]WeightPoint, error) {
	query := `
		SELECT log_date, weight_kg
		FROM nutrition.weight_logs
		WHERE user_id = $1 AND log_date <= $2::date
		ORDER BY log_date ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, upToDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []WeightPoint
	for rows.Next() {
		var t time.Time
		var kg float64
		if err := rows.Scan(&t, &kg); err == nil {
			points = append(points, WeightPoint{
				Date: t.Format("2006-01-02"),
				Kg:   kg,
			})
		}
	}
	return points, rows.Err()
}

func (r *pgxTrendsRepo) GetTopFoodsForPeriod(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string][]FoodContribution, error) {
	query := `
		SELECT food_id, name_snapshot, nutrients_snapshot
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND log_date >= $2::date AND log_date <= $3::date AND deleted_at IS NULL AND food_id IS NOT NULL
	`
	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return make(map[string][]FoodContribution), err
	}
	defer rows.Close()

	type foodAccum struct {
		name   string
		amount float64
	}

	nutrientMap := make(map[string]map[uuid.UUID]*foodAccum)
	for _, k := range CountedNutrientKeys {
		nutrientMap[k] = make(map[uuid.UUID]*foodAccum)
	}

	for rows.Next() {
		var fID *uuid.UUID
		var nameSnapshot *string
		var nutrientsJSON []byte

		if err := rows.Scan(&fID, &nameSnapshot, &nutrientsJSON); err == nil && fID != nil {
			name := "Thực phẩm"
			if nameSnapshot != nil {
				name = *nameSnapshot
			}

			if len(nutrientsJSON) > 0 {
				var nut map[string]*float64
				if err := json.Unmarshal(nutrientsJSON, &nut); err == nil {
					for _, k := range CountedNutrientKeys {
						if v, ok := nut[k]; ok && v != nil && *v > 0 {
							accum, exists := nutrientMap[k][*fID]
							if !exists {
								accum = &foodAccum{name: name, amount: 0}
								nutrientMap[k][*fID] = accum
							}
							accum.amount += *v
						}
					}
				}
			}
		}
	}
	if err := rows.Err(); err != nil {
		return make(map[string][]FoodContribution), fmt.Errorf("failed during top foods iteration: %w", err)
	}

	result := make(map[string][]FoodContribution)
	for _, k := range CountedNutrientKeys {
		var list []FoodContribution
		for fID, acc := range nutrientMap[k] {
			list = append(list, FoodContribution{
				FoodID:   fID,
				FoodName: acc.name,
				Amount:   acc.amount,
			})
		}
		sort.SliceStable(list, func(i, j int) bool {
			return list[i].Amount > list[j].Amount
		})
		if len(list) > 3 {
			list = list[:3]
		}
		if len(list) > 0 {
			result[k] = list
		} else {
			result[k] = []FoodContribution{}
		}
	}

	return result, nil
}

func (r *pgxTrendsRepo) GetStreak(ctx context.Context, userID uuid.UUID, todayIso string) (int, error) {
	query := `
		SELECT DISTINCT log_date::text
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND deleted_at IS NULL AND log_date <= $2::date
		ORDER BY log_date::text DESC
	`
	rows, err := r.pool.Query(ctx, query, userID, todayIso)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	dates := make(map[string]bool)
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err == nil {
			dates[d] = true
		}
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("failed during streak iteration: %w", err)
	}

	todayT, err := time.Parse("2006-01-02", todayIso)
	if err != nil {
		return 0, nil
	}

	cursor := todayT
	if !dates[todayIso] {
		cursor = cursor.AddDate(0, 0, -1)
	}

	streak := 0
	for streak < 365 {
		dStr := cursor.Format("2006-01-02")
		if dates[dStr] {
			streak++
			cursor = cursor.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	return streak, nil
}
