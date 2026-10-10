package nutrition

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"nutrition-api/internal/diary"
)

type Repository interface {
	ListFoods(ctx context.Context, query string, limit, offset int) ([]diary.Food, error)
	CreateFood(ctx context.Context, food *diary.Food) (*diary.Food, error)
	UpsertBatchFoods(ctx context.Context, foods []diary.Food) error
}

type pgxNutritionRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxNutritionRepo{pool: pool}
}

func (r *pgxNutritionRepo) ListFoods(ctx context.Context, query string, limit, offset int) ([]diary.Food, error) {
	if limit <= 0 {
		limit = 50
	}
	sql := `
		SELECT id, name, serving_size_g, per_100g_nutrients, is_custom, created_by, created_at
		FROM nutrition.foods
		WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
		ORDER BY is_custom ASC, name ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, sql, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query foods: %w", err)
	}
	defer rows.Close()

	var foods []diary.Food
	for rows.Next() {
		var f diary.Food
		var nutrientsJSON []byte
		if err := rows.Scan(&f.ID, &f.Name, &f.ServingSizeG, &nutrientsJSON, &f.IsCustom, &f.CreatedBy, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan food: %w", err)
		}
		if err := json.Unmarshal(nutrientsJSON, &f.Per100gNutrients); err != nil {
			return nil, fmt.Errorf("failed to parse nutrients: %w", err)
		}
		foods = append(foods, f)
	}
	return foods, nil
}

func (r *pgxNutritionRepo) CreateFood(ctx context.Context, food *diary.Food) (*diary.Food, error) {
	nutrientsJSON, err := json.Marshal(food.Per100gNutrients)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal nutrients: %w", err)
	}

	sql := `
		INSERT INTO nutrition.foods (id, name, serving_size_g, per_100g_nutrients, is_custom, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, name, serving_size_g, per_100g_nutrients, is_custom, created_by, created_at
	`
	if food.ID == uuid.Nil {
		food.ID = uuid.New()
	}

	var out diary.Food
	var outNutrientsJSON []byte
	err = r.pool.QueryRow(ctx, sql, food.ID, food.Name, food.ServingSizeG, nutrientsJSON, food.IsCustom, food.CreatedBy).
		Scan(&out.ID, &out.Name, &out.ServingSizeG, &outNutrientsJSON, &out.IsCustom, &out.CreatedBy, &out.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create food: %w", err)
	}

	if err := json.Unmarshal(outNutrientsJSON, &out.Per100gNutrients); err != nil {
		return nil, fmt.Errorf("failed to parse nutrients: %w", err)
	}

	return &out, nil
}

func (r *pgxNutritionRepo) UpsertBatchFoods(ctx context.Context, foods []diary.Food) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // nolint:errcheck

	sql := `
		INSERT INTO nutrition.foods (id, name, serving_size_g, per_100g_nutrients, is_custom, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			serving_size_g = EXCLUDED.serving_size_g,
			per_100g_nutrients = EXCLUDED.per_100g_nutrients
	`

	for _, f := range foods {
		nutrientsJSON, err := json.Marshal(f.Per100gNutrients)
		if err != nil {
			return err
		}
		if f.ID == uuid.Nil {
			f.ID = uuid.New()
		}
		_, err = tx.Exec(ctx, sql, f.ID, f.Name, f.ServingSizeG, nutrientsJSON, false)
		if err != nil {
			return fmt.Errorf("failed to upsert food item %s: %w", f.Name, err)
		}
	}

	return tx.Commit(ctx)
}
