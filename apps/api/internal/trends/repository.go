package trends

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
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
	// Generate date series from startDate to endDate
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
		cal       float64
		nutrients map[string]*float64
	})

	for rows.Next() {
		var logDate time.Time
		var cal float64
		var nutrientsJSON []byte
		if err := rows.Scan(&logDate, &cal, &nutrientsJSON); err == nil {
			dStr := logDate.Format("2006-01-02")
			var nut map[string]*float64
			if len(nutrientsJSON) > 0 {
				_ = json.Unmarshal(nutrientsJSON, &nut)
			}
			dayDataMap[dStr] = append(dayDataMap[dStr], struct {
				cal       float64
				nutrients map[string]*float64
			}{cal: cal, nutrients: nut})
		}
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

		dayCal := 0.0
		var pro, carb, fat, fiber *float64
		for _, e := range entries {
			dayCal += e.cal
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
			}
		}

		result = append(result, TrendDayTotals{
			Date:      dStr,
			Logged:    true,
			Calories:  &dayCal,
			Protein:   pro,
			Carbs:     carb,
			Fat:       fat,
			Fiber:     fiber,
			Nutrients: make(map[string]*float64),
		})
	}

	return result, nil
}

func (r *pgxTrendsRepo) GetUserTargets(ctx context.Context, userID uuid.UUID) (*targets.CompleteTargets, error) {
	query := `SELECT sex, weight_kg, goal, training_minutes_default, near_period FROM nutrition.profiles WHERE user_id = $1`
	var sex, goal string
	var weightKg float64
	var trainingMinutes int
	var nearPeriod bool

	err := r.pool.QueryRow(ctx, query, userID).Scan(&sex, &weightKg, &goal, &trainingMinutes, &nearPeriod)
	if err != nil {
		return nil, err
	}

	computed := targets.CalculateTargets(targets.UserProfileForTargets{
		Sex:             sex,
		WeightKg:        weightKg,
		Goal:            goal,
		TrainingMinutes: trainingMinutes,
		IsPeriod:        nearPeriod,
	})

	return &computed, nil
}
