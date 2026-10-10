package diary

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NutrientValues defines the 26 micro and macro nutrients
type NutrientValues struct {
	// Macronutrients (11)
	Calories           float64 `json:"calories"`             // kcal
	Protein            float64 `json:"protein"`              // g
	Carbohydrates      float64 `json:"carbohydrates"`         // g
	Fat                float64 `json:"fat"`                  // g
	SaturatedFat       float64 `json:"saturated_fat"`        // g
	TransFat           float64 `json:"trans_fat"`            // g
	MonounsaturatedFat float64 `json:"monounsaturated_fat"`  // g
	PolyunsaturatedFat float64 `json:"polyunsaturated_fat"`  // g
	Fiber              float64 `json:"fiber"`                // g
	Sugar              float64 `json:"sugar"`                // g
	AddedSugar         float64 `json:"added_sugar"`          // g

	// Minerals (11)
	Cholesterol        float64 `json:"cholesterol"`          // mg
	Sodium             float64 `json:"sodium"`               // mg
	Potassium          float64 `json:"potassium"`            // mg
	Calcium            float64 `json:"calcium"`              // mg
	Iron               float64 `json:"iron"`                 // mg
	Phosphorus         float64 `json:"phosphorus"`           // mg
	Magnesium          float64 `json:"magnesium"`            // mg
	Zinc               float64 `json:"zinc"`                 // mg
	Copper             float64 `json:"copper"`               // mg
	Manganese          float64 `json:"manganese"`            // mg
	Selenium           float64 `json:"selenium"`             // mcg

	// Vitamins (4)
	VitaminA           float64 `json:"vitamin_a"`            // mcg
	VitaminC           float64 `json:"vitamin_c"`            // mg
	VitaminD           float64 `json:"vitamin_d"`            // mcg
	VitaminE           float64 `json:"vitamin_e"`            // mg
}

func round(v float64) float64 {
	return math.Round(v*100) / 100
}

// Scale computes nutrients based on consumed grams: (per_100g_value * grams) / 100
func (n NutrientValues) Scale(grams float64) NutrientValues {
	ratio := grams / 100.0
	return NutrientValues{
		Calories:           round(n.Calories * ratio),
		Protein:            round(n.Protein * ratio),
		Carbohydrates:      round(n.Carbohydrates * ratio),
		Fat:                round(n.Fat * ratio),
		SaturatedFat:       round(n.SaturatedFat * ratio),
		TransFat:           round(n.TransFat * ratio),
		MonounsaturatedFat: round(n.MonounsaturatedFat * ratio),
		PolyunsaturatedFat: round(n.PolyunsaturatedFat * ratio),
		Fiber:              round(n.Fiber * ratio),
		Sugar:              round(n.Sugar * ratio),
		AddedSugar:         round(n.AddedSugar * ratio),

		Cholesterol:        round(n.Cholesterol * ratio),
		Sodium:             round(n.Sodium * ratio),
		Potassium:          round(n.Potassium * ratio),
		Calcium:            round(n.Calcium * ratio),
		Iron:               round(n.Iron * ratio),
		Phosphorus:         round(n.Phosphorus * ratio),
		Magnesium:          round(n.Magnesium * ratio),
		Zinc:               round(n.Zinc * ratio),
		Copper:             round(n.Copper * ratio),
		Manganese:          round(n.Manganese * ratio),
		Selenium:           round(n.Selenium * ratio),

		VitaminA:           round(n.VitaminA * ratio),
		VitaminC:           round(n.VitaminC * ratio),
		VitaminD:           round(n.VitaminD * ratio),
		VitaminE:           round(n.VitaminE * ratio),
	}
}

// Add aggregates two NutrientValues together
func (n NutrientValues) Add(other NutrientValues) NutrientValues {
	return NutrientValues{
		Calories:           round(n.Calories + other.Calories),
		Protein:            round(n.Protein + other.Protein),
		Carbohydrates:      round(n.Carbohydrates + other.Carbohydrates),
		Fat:                round(n.Fat + other.Fat),
		SaturatedFat:       round(n.SaturatedFat + other.SaturatedFat),
		TransFat:           round(n.TransFat + other.TransFat),
		MonounsaturatedFat: round(n.MonounsaturatedFat + other.MonounsaturatedFat),
		PolyunsaturatedFat: round(n.PolyunsaturatedFat + other.PolyunsaturatedFat),
		Fiber:              round(n.Fiber + other.Fiber),
		Sugar:              round(n.Sugar + other.Sugar),
		AddedSugar:         round(n.AddedSugar + other.AddedSugar),

		Cholesterol:        round(n.Cholesterol + other.Cholesterol),
		Sodium:             round(n.Sodium + other.Sodium),
		Potassium:          round(n.Potassium + other.Potassium),
		Calcium:            round(n.Calcium + other.Calcium),
		Iron:               round(n.Iron + other.Iron),
		Phosphorus:         round(n.Phosphorus + other.Phosphorus),
		Magnesium:          round(n.Magnesium + other.Magnesium),
		Zinc:               round(n.Zinc + other.Zinc),
		Copper:             round(n.Copper + other.Copper),
		Manganese:          round(n.Manganese + other.Manganese),
		Selenium:           round(n.Selenium + other.Selenium),

		VitaminA:           round(n.VitaminA + other.VitaminA),
		VitaminC:           round(n.VitaminC + other.VitaminC),
		VitaminD:           round(n.VitaminD + other.VitaminD),
		VitaminE:           round(n.VitaminE + other.VitaminE),
	}
}

// Food represents a food row from nutrition.foods
type Food struct {
	ID               uuid.UUID      `json:"id"`
	Name             string         `json:"name"`
	ServingSizeG     float64        `json:"serving_size_g"`
	Per100gNutrients NutrientValues `json:"per_100g_nutrients"`
	IsCustom         bool           `json:"is_custom"`
	CreatedBy        *uuid.UUID     `json:"created_by,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
}

// DiaryLog represents a meal entry in nutrition.diary_logs
type DiaryLog struct {
	ID                uuid.UUID      `json:"id"`
	UserID            uuid.UUID      `json:"user_id"`
	FoodID            uuid.UUID      `json:"food_id"`
	MealSlot          string         `json:"meal_slot"`
	Quantity          float64        `json:"quantity"`
	ServingSizeG      float64        `json:"serving_size_g"`
	NutrientsSnapshot NutrientValues `json:"nutrients_snapshot"`
	LogDate           time.Time      `json:"log_date"`
	CreatedAt         time.Time      `json:"created_at"`
}

// Repository defines data access methods for diary and nutrition
type Repository interface {
	GetFoodByID(ctx context.Context, foodID uuid.UUID) (*Food, error)
	CreateLog(ctx context.Context, log *DiaryLog) (*DiaryLog, error)
	GetLogsByUserAndDate(ctx context.Context, userID uuid.UUID, logDate time.Time) ([]DiaryLog, error)
	GetUserTarget(ctx context.Context, userID uuid.UUID, targetDate time.Time) (*NutrientValues, error)
}

type pgxRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxRepository{pool: pool}
}

func (r *pgxRepository) GetFoodByID(ctx context.Context, foodID uuid.UUID) (*Food, error) {
	query := `
		SELECT id, name, serving_size_g, per_100g_nutrients, is_custom, created_by, created_at
		FROM nutrition.foods
		WHERE id = $1
	`
	row := r.pool.QueryRow(ctx, query, foodID)

	var f Food
	var nutrientsJSON []byte
	err := row.Scan(&f.ID, &f.Name, &f.ServingSizeG, &nutrientsJSON, &f.IsCustom, &f.CreatedBy, &f.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("food not found: %w", err)
		}
		return nil, fmt.Errorf("failed to query food: %w", err)
	}

	if err := json.Unmarshal(nutrientsJSON, &f.Per100gNutrients); err != nil {
		return nil, fmt.Errorf("failed to unmarshal nutrients: %w", err)
	}

	return &f, nil
}

func (r *pgxRepository) CreateLog(ctx context.Context, log *DiaryLog) (*DiaryLog, error) {
	nutrientsJSON, err := json.Marshal(log.NutrientsSnapshot)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal nutrients snapshot: %w", err)
	}

	query := `
		INSERT INTO nutrition.diary_logs (
			id, user_id, food_id, meal_slot, quantity, serving_size_g, nutrients_snapshot, log_date, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, NOW()
		)
		ON CONFLICT (id) DO NOTHING
		RETURNING id, user_id, food_id, meal_slot, quantity, serving_size_g, nutrients_snapshot, log_date, created_at
	`

	var out DiaryLog
	var outNutrientsJSON []byte
	err = r.pool.QueryRow(ctx, query,
		log.ID, log.UserID, log.FoodID, log.MealSlot, log.Quantity, log.ServingSizeG, nutrientsJSON, log.LogDate,
	).Scan(
		&out.ID, &out.UserID, &out.FoodID, &out.MealSlot, &out.Quantity, &out.ServingSizeG, &outNutrientsJSON, &out.LogDate, &out.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Idempotency: entry already exists with this ID, fetch and return existing record
			return r.getLogByID(ctx, log.ID)
		}
		return nil, fmt.Errorf("failed to insert diary log: %w", err)
	}

	if err := json.Unmarshal(outNutrientsJSON, &out.NutrientsSnapshot); err != nil {
		return nil, fmt.Errorf("failed to unmarshal nutrients: %w", err)
	}

	return &out, nil
}

func (r *pgxRepository) getLogByID(ctx context.Context, id uuid.UUID) (*DiaryLog, error) {
	query := `
		SELECT id, user_id, food_id, meal_slot, quantity, serving_size_g, nutrients_snapshot, log_date, created_at
		FROM nutrition.diary_logs
		WHERE id = $1
	`
	var out DiaryLog
	var outNutrientsJSON []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&out.ID, &out.UserID, &out.FoodID, &out.MealSlot, &out.Quantity, &out.ServingSizeG, &outNutrientsJSON, &out.LogDate, &out.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve existing log: %w", err)
	}
	if err := json.Unmarshal(outNutrientsJSON, &out.NutrientsSnapshot); err != nil {
		return nil, fmt.Errorf("failed to unmarshal nutrients: %w", err)
	}
	return &out, nil
}

func (r *pgxRepository) GetLogsByUserAndDate(ctx context.Context, userID uuid.UUID, logDate time.Time) ([]DiaryLog, error) {
	query := `
		SELECT id, user_id, food_id, meal_slot, quantity, serving_size_g, nutrients_snapshot, log_date, created_at
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND log_date = $2
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, logDate.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("failed to query diary logs: %w", err)
	}
	defer rows.Close()

	var logs []DiaryLog
	for rows.Next() {
		var l DiaryLog
		var nutrientsJSON []byte
		if err := rows.Scan(&l.ID, &l.UserID, &l.FoodID, &l.MealSlot, &l.Quantity, &l.ServingSizeG, &nutrientsJSON, &l.LogDate, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan diary log: %w", err)
		}
		if err := json.Unmarshal(nutrientsJSON, &l.NutrientsSnapshot); err != nil {
			return nil, fmt.Errorf("failed to unmarshal nutrients: %w", err)
		}
		logs = append(logs, l)
	}

	return logs, nil
}

func (r *pgxRepository) GetUserTarget(ctx context.Context, userID uuid.UUID, targetDate time.Time) (*NutrientValues, error) {
	query := `
		SELECT target_nutrients
		FROM nutrition.user_targets
		WHERE user_id = $1 AND target_date = $2
	`
	var rawJSON []byte
	err := r.pool.QueryRow(ctx, query, userID, targetDate.Format("2006-01-02")).Scan(&rawJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No custom target configured for this day
		}
		return nil, fmt.Errorf("failed to query user targets: %w", err)
	}

	var targets NutrientValues
	if err := json.Unmarshal(rawJSON, &targets); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user targets: %w", err)
	}
	return &targets, nil
}
