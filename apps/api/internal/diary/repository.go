package diary

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetDayEntries(ctx context.Context, userID uuid.UUID, date string) ([]DiaryEntryItem, error)
	GetDayTraining(ctx context.Context, userID uuid.UUID, date string) (int, error)
	GetUserDefaultTraining(ctx context.Context, userID uuid.UUID) (int, error)
	GetUserProfile(ctx context.Context, userID uuid.UUID) (string, float64, string, int, bool, int, error)
	GetFoodNutrients(ctx context.Context, foodID uuid.UUID) (string, map[string]*float64, error)
	CreateEntry(ctx context.Context, userID uuid.UUID, date string, entry *DiaryEntryItem) (*DiaryEntryItem, error)
	GetEntryByID(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error)
	UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, entry *DiaryEntryItem) (*DiaryEntryItem, string, error)
	SoftDeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error
	RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error)
	GetRangeEntries(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string][]DiaryEntryItem, error)
	GetRangeTraining(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string]int, error)
	DeleteMealEntries(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error
	UpsertDayTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) error
}

type pgxDiaryRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxDiaryRepo{pool: pool}
}

func (r *pgxDiaryRepo) GetDayEntries(ctx context.Context, userID uuid.UUID, date string) ([]DiaryEntryItem, error) {
	query := `
		SELECT id, food_id, kind, meal_slot, portion_label, grams, calories, name_snapshot, nutrients_snapshot, created_at
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND log_date = $2 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to get day entries: %w", err)
	}
	defer rows.Close()

	var entries []DiaryEntryItem
	for rows.Next() {
		var item DiaryEntryItem
		var portionLabel, nameSnapshot *string
		var grams *float64
		var nutrientsJSON []byte

		err := rows.Scan(
			&item.ID, &item.FoodID, &item.Kind, &item.MealSlot,
			&portionLabel, &grams, &item.Calories, &nameSnapshot,
			&nutrientsJSON, &item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan entry: %w", err)
		}

		if portionLabel != nil {
			item.ServingLabel = *portionLabel
		}
		if nameSnapshot != nil {
			item.FoodName = *nameSnapshot
		}
		if grams != nil {
			item.Grams = *grams
		}

		if len(nutrientsJSON) > 0 {
			_ = json.Unmarshal(nutrientsJSON, &item.Nutrients)
		}
		entries = append(entries, item)
	}

	return entries, rows.Err()
}

func (r *pgxDiaryRepo) GetDayTraining(ctx context.Context, userID uuid.UUID, date string) (int, error) {
	var minutes int
	query := `SELECT minutes FROM nutrition.day_training WHERE user_id = $1 AND log_date = $2`
	err := r.pool.QueryRow(ctx, query, userID, date).Scan(&minutes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return -1, nil // not found, fallback to user default
		}
		return 0, err
	}
	return minutes, nil
}

func (r *pgxDiaryRepo) GetUserDefaultTraining(ctx context.Context, userID uuid.UUID) (int, error) {
	var minutes int
	query := `SELECT training_minutes_default FROM nutrition.profiles WHERE user_id = $1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&minutes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 60, nil
		}
		return 60, nil
	}
	return minutes, nil
}

func (r *pgxDiaryRepo) GetUserProfile(ctx context.Context, userID uuid.UUID) (string, float64, string, int, bool, int, error) {
	query := `SELECT sex, weight_kg, goal, training_minutes_default, near_period, COALESCE(birth_year, 0) FROM nutrition.profiles WHERE user_id = $1`
	var sex, goal string
	var weightKg float64
	var trainingMinutes, birthYear int
	var nearPeriod bool
	err := r.pool.QueryRow(ctx, query, userID).Scan(&sex, &weightKg, &goal, &trainingMinutes, &nearPeriod, &birthYear)
	return sex, weightKg, goal, trainingMinutes, nearPeriod, birthYear, err
}

func (r *pgxDiaryRepo) GetFoodNutrients(ctx context.Context, foodID uuid.UUID) (string, map[string]*float64, error) {
	var nameVi string
	var per100gJSON []byte
	query := `SELECT name_vi, per_100g FROM nutrition.foods WHERE id = $1`
	err := r.pool.QueryRow(ctx, query, foodID).Scan(&nameVi, &per100gJSON)
	if err != nil {
		return "", nil, err
	}

	nutrients := make(map[string]*float64)
	if len(per100gJSON) > 0 {
		_ = json.Unmarshal(per100gJSON, &nutrients)
	}

	return nameVi, nutrients, nil
}

// grams ($7) is used twice. Without the casts Postgres deduces numeric for the grams column and integer for
// COALESCE($7, 100), and rejects every insert (SQLSTATE 42P08). repository_sql_test.go checks it.
const createEntrySQL = `
		INSERT INTO nutrition.diary_logs (
			id, client_id, user_id, food_id, kind, meal_slot, portion_label, grams, calories,
			name_snapshot, nutrients_snapshot, quantity, serving_size_g, log_date
		) VALUES (
			$1::uuid, $1::uuid, $2, $3, $4, $5, $6, $7::numeric, $8, $9, $10, 1, COALESCE($7::numeric, 100), $11
		)
		ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id WHERE diary_logs.user_id = EXCLUDED.user_id
		RETURNING created_at
	`

func (r *pgxDiaryRepo) CreateEntry(ctx context.Context, userID uuid.UUID, date string, entry *DiaryEntryItem) (*DiaryEntryItem, error) {
	nutrientsJSON, err := json.Marshal(entry.Nutrients)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal nutrients snapshot: %w", err)
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", err)
	}

	err = r.pool.QueryRow(ctx, createEntrySQL,
		entry.ID, userID, entry.FoodID, entry.Kind, entry.MealSlot,
		entry.ServingLabel, entry.Grams, entry.Calories, entry.FoodName,
		nutrientsJSON, parsedDate,
	).Scan(&entry.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert diary entry: %w", err)
	}

	return entry, nil
}

func (r *pgxDiaryRepo) GetEntryByID(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error) {
	query := `
		SELECT id, food_id, kind, meal_slot, portion_label, grams, calories, name_snapshot, nutrients_snapshot, log_date, created_at
		FROM nutrition.diary_logs
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	var item DiaryEntryItem
	var logDate time.Time
	var portionLabel, nameSnapshot *string
	var grams *float64
	var nutrientsJSON []byte

	err := r.pool.QueryRow(ctx, query, entryID, userID).Scan(
		&item.ID, &item.FoodID, &item.Kind, &item.MealSlot,
		&portionLabel, &grams, &item.Calories, &nameSnapshot,
		&nutrientsJSON, &logDate, &item.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, "", nil
		}
		return nil, "", err
	}

	if portionLabel != nil {
		item.ServingLabel = *portionLabel
	}
	if nameSnapshot != nil {
		item.FoodName = *nameSnapshot
	}
	if grams != nil {
		item.Grams = *grams
	}
	if len(nutrientsJSON) > 0 {
		_ = json.Unmarshal(nutrientsJSON, &item.Nutrients)
	}

	return &item, logDate.Format("2006-01-02"), nil
}

func (r *pgxDiaryRepo) UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, entry *DiaryEntryItem) (*DiaryEntryItem, string, error) {
	nutrientsJSON, err := json.Marshal(entry.Nutrients)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal nutrients snapshot: %w", err)
	}

	query := `
		UPDATE nutrition.diary_logs
		SET meal_slot = $1, portion_label = $2, grams = $3, calories = $4, nutrients_snapshot = $5
		WHERE id = $6 AND user_id = $7 AND deleted_at IS NULL
		RETURNING log_date, created_at
	`
	var logDate time.Time
	err = r.pool.QueryRow(ctx, query,
		entry.MealSlot, entry.ServingLabel, entry.Grams, entry.Calories, nutrientsJSON,
		entryID, userID,
	).Scan(&logDate, &entry.CreatedAt)
	if err != nil {
		return nil, "", fmt.Errorf("failed to update diary log: %w", err)
	}

	return entry, logDate.Format("2006-01-02"), nil
}

func (r *pgxDiaryRepo) SoftDeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error {
	query := `
		UPDATE nutrition.diary_logs
		SET deleted_at = now()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	tag, err := r.pool.Exec(ctx, query, entryID, userID)
	if err != nil {
		return fmt.Errorf("failed to soft delete entry: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *pgxDiaryRepo) RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error) {
	query := `
		UPDATE nutrition.diary_logs
		SET deleted_at = NULL
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
		RETURNING id, food_id, kind, meal_slot, portion_label, grams, calories, name_snapshot, nutrients_snapshot, log_date, created_at
	`
	var item DiaryEntryItem
	var logDate time.Time
	var portionLabel, nameSnapshot *string
	var grams *float64
	var nutrientsJSON []byte

	err := r.pool.QueryRow(ctx, query, entryID, userID).Scan(
		&item.ID, &item.FoodID, &item.Kind, &item.MealSlot,
		&portionLabel, &grams, &item.Calories, &nameSnapshot,
		&nutrientsJSON, &logDate, &item.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrEntryNotFound
		}
		return nil, "", err
	}

	if portionLabel != nil {
		item.ServingLabel = *portionLabel
	}
	if nameSnapshot != nil {
		item.FoodName = *nameSnapshot
	}
	if grams != nil {
		item.Grams = *grams
	}
	if len(nutrientsJSON) > 0 {
		_ = json.Unmarshal(nutrientsJSON, &item.Nutrients)
	}

	return &item, logDate.Format("2006-01-02"), nil
}

func (r *pgxDiaryRepo) DeleteMealEntries(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error {
	query := `
		UPDATE nutrition.diary_logs
		SET deleted_at = now()
		WHERE user_id = $1 AND log_date = $2 AND meal_slot = $3 AND deleted_at IS NULL
	`
	_, err := r.pool.Exec(ctx, query, userID, date, mealSlot)
	return err
}

func (r *pgxDiaryRepo) UpsertDayTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) error {
	query := `
		INSERT INTO nutrition.day_training (user_id, log_date, minutes, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (user_id, log_date) DO UPDATE SET
			minutes = EXCLUDED.minutes,
			updated_at = now()
	`
	_, err := r.pool.Exec(ctx, query, userID, date, minutes)
	return err
}

func (r *pgxDiaryRepo) GetRangeEntries(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string][]DiaryEntryItem, error) {
	query := `
		SELECT id, food_id, kind, meal_slot, portion_label, grams, calories, name_snapshot, nutrients_snapshot, to_char(log_date, 'YYYY-MM-DD'), created_at
		FROM nutrition.diary_logs
		WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, fromDate, toDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get range entries: %w", err)
	}
	defer rows.Close()

	out := make(map[string][]DiaryEntryItem)
	for rows.Next() {
		var item DiaryEntryItem
		var portionLabel, nameSnapshot *string
		var grams *float64
		var nutrientsJSON []byte
		var logDateStr string

		if err := rows.Scan(
			&item.ID, &item.FoodID, &item.Kind, &item.MealSlot,
			&portionLabel, &grams, &item.Calories, &nameSnapshot,
			&nutrientsJSON, &logDateStr, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan range entry: %w", err)
		}
		if portionLabel != nil {
			item.ServingLabel = *portionLabel
		}
		if nameSnapshot != nil {
			item.FoodName = *nameSnapshot
		}
		if grams != nil {
			item.Grams = *grams
		}
		if len(nutrientsJSON) > 0 {
			_ = json.Unmarshal(nutrientsJSON, &item.Nutrients)
		}
		out[logDateStr] = append(out[logDateStr], item)
	}
	return out, rows.Err()
}

func (r *pgxDiaryRepo) GetRangeTraining(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string]int, error) {
	query := `
		SELECT to_char(log_date, 'YYYY-MM-DD'), minutes
		FROM nutrition.day_training
		WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
	`
	rows, err := r.pool.Query(ctx, query, userID, fromDate, toDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get range training: %w", err)
	}
	defer rows.Close()

	out := make(map[string]int)
	for rows.Next() {
		var d string
		var m int
		if err := rows.Scan(&d, &m); err != nil {
			return nil, fmt.Errorf("failed to scan range training: %w", err)
		}
		out[d] = m
	}
	return out, rows.Err()
}
