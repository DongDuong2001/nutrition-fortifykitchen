package nutrition

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error)
	GetFoodByID(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*FoodDetail, error)
	GetFoodsRichIn(ctx context.Context, nutrient string, limit int, userID *uuid.UUID) ([]RichInFoodItem, error)
	CreateCustomFood(ctx context.Context, userID uuid.UUID, food *FoodDetail, portions []Portion) (*FoodDetail, error)
	DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error
}

type pgxRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxRepository{pool: pool}
}

func (r *pgxRepository) SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	} else if filter.Limit > 500 {
		filter.Limit = 500
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}
	offset := (filter.Page - 1) * filter.Limit

	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1
	var searchTerms []string

	if filter.Query != "" {
		q := strings.TrimSpace(filter.Query)
		searchTerms = []string{q}
		lowerQ := strings.ToLower(q)
		if strings.Contains(lowerQ, "trái") {
			searchTerms = append(searchTerms, strings.ReplaceAll(lowerQ, "trái", "quả"))
		} else if strings.Contains(lowerQ, "trai") {
			searchTerms = append(searchTerms, strings.ReplaceAll(lowerQ, "trai", "qua"))
		} else if strings.Contains(lowerQ, "quả") {
			searchTerms = append(searchTerms, strings.ReplaceAll(lowerQ, "quả", "trái"))
		} else if strings.Contains(lowerQ, "qua") {
			searchTerms = append(searchTerms, strings.ReplaceAll(lowerQ, "qua", "trai"))
		}

		var orClauses []string
		for _, term := range searchTerms {
			words := strings.Fields(term)
			if len(words) > 1 {
				var andWords []string
				for _, w := range words {
					andWords = append(andWords, fmt.Sprintf("name_search ILIKE '%%' || lower(unaccent($%d::text)) || '%%'", argIdx))
					args = append(args, w)
					argIdx++
				}
				orClauses = append(orClauses, fmt.Sprintf("(name_search ILIKE '%%' || lower(unaccent($%d::text)) || '%%' OR name_search %% lower(unaccent($%d::text)) OR (%s))", argIdx, argIdx, strings.Join(andWords, " AND ")))
				args = append(args, term)
				argIdx++
			} else {
				orClauses = append(orClauses, fmt.Sprintf("(name_search ILIKE '%%' || lower(unaccent($%d::text)) || '%%' OR name_search %% lower(unaccent($%d::text)))", argIdx, argIdx))
				args = append(args, term)
				argIdx++
			}
		}
		whereClauses = append(whereClauses, "("+strings.Join(orClauses, " OR ")+")")
	}

	if filter.Category != "" && filter.Category != "all" {
		whereClauses = append(whereClauses, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, filter.Category)
		argIdx++
	}

	if filter.UserID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(is_custom = false OR created_by = $%d)", argIdx))
		args = append(args, *filter.UserID)
		argIdx++
	} else {
		whereClauses = append(whereClauses, "is_custom = false")
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM nutrition.foods WHERE %s", whereSQL)
	var total int
	err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count foods: %w", err)
	}

	orderBy := "is_custom ASC, name_vi ASC"
	if filter.Query != "" {
		if len(searchTerms) > 1 {
			orderBy = "CASE WHEN name_search ILIKE lower(unaccent($1::text)) || '%' THEN 1 WHEN name_search ILIKE '%' || lower(unaccent($1::text)) || '%' THEN 2 WHEN name_search ILIKE '%' || lower(unaccent($2::text)) || '%' THEN 3 ELSE 4 END, similarity(name_search, lower(unaccent($1::text))) DESC, similarity(name_search, lower(unaccent($2::text))) DESC, is_custom ASC, name_vi ASC"
		} else {
			orderBy = "CASE WHEN name_search ILIKE lower(unaccent($1::text)) || '%' THEN 1 WHEN name_search ILIKE '%' || lower(unaccent($1::text)) || '%' THEN 2 ELSE 3 END, similarity(name_search, lower(unaccent($1::text))) DESC, is_custom ASC, name_vi ASC"
		}
	}

	querySQL := fmt.Sprintf(`
		SELECT id, name_vi, category, source, source_id, brand, tip_vi, is_custom, created_by, per_100g, created_at
		FROM nutrition.foods
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderBy, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, querySQL, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query foods: %w", err)
	}
	defer rows.Close()

	var items []FoodDetail
	for rows.Next() {
		var f FoodDetail
		var per100gJSON []byte
		if err := rows.Scan(&f.ID, &f.NameVi, &f.Category, &f.Source, &f.SourceID, &f.Brand, &f.TipVi, &f.IsCustom, &f.CreatedBy, &per100gJSON, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan food item: %w", err)
		}
		if len(per100gJSON) > 0 {
			_ = json.Unmarshal(per100gJSON, &f.Per100gNutrients)
		}
		items = append(items, f)
	}

	// Fetch portions for returned foods
	if len(items) > 0 {
		foodIDs := make([]uuid.UUID, len(items))
		for i, item := range items {
			foodIDs[i] = item.ID
		}

		portionsSQL := `
			SELECT food_id, id, label_vi, grams
			FROM nutrition.food_portions
			WHERE food_id = ANY($1)
			ORDER BY sort ASC
		`
		pRows, err := r.pool.Query(ctx, portionsSQL, foodIDs)
		if err == nil {
			defer pRows.Close()
			portionMap := make(map[uuid.UUID][]Portion)
			for pRows.Next() {
				var fid uuid.UUID
				var p Portion
				if err := pRows.Scan(&fid, &p.ID, &p.LabelVi, &p.Grams); err == nil {
					portionMap[fid] = append(portionMap[fid], p)
				}
			}
			for i := range items {
				items[i].Servings = portionMap[items[i].ID]
				if items[i].Servings == nil {
					items[i].Servings = []Portion{}
				}
			}
		}
	}

	return &FoodSearchResponse{
		Items: items,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (r *pgxRepository) GetFoodByID(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*FoodDetail, error) {
	var query string
	var err error
	var f FoodDetail
	var per100gJSON []byte

	if userID != nil {
		query = `
			SELECT id, name_vi, category, source, source_id, brand, tip_vi, is_custom, created_by, per_100g, created_at
			FROM nutrition.foods
			WHERE id = $1 AND (is_custom = false OR created_by = $2)
		`
		err = r.pool.QueryRow(ctx, query, id, *userID).Scan(
			&f.ID, &f.NameVi, &f.Category, &f.Source, &f.SourceID, &f.Brand, &f.TipVi, &f.IsCustom, &f.CreatedBy, &per100gJSON, &f.CreatedAt,
		)
	} else {
		query = `
			SELECT id, name_vi, category, source, source_id, brand, tip_vi, is_custom, created_by, per_100g, created_at
			FROM nutrition.foods
			WHERE id = $1 AND is_custom = false
		`
		err = r.pool.QueryRow(ctx, query, id).Scan(
			&f.ID, &f.NameVi, &f.Category, &f.Source, &f.SourceID, &f.Brand, &f.TipVi, &f.IsCustom, &f.CreatedBy, &per100gJSON, &f.CreatedAt,
		)
	}

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get food by id: %w", err)
	}

	if len(per100gJSON) > 0 {
		_ = json.Unmarshal(per100gJSON, &f.Per100gNutrients)
	}

	portionsSQL := `SELECT id, label_vi, grams FROM nutrition.food_portions WHERE food_id = $1 ORDER BY sort ASC`
	rows, err := r.pool.Query(ctx, portionsSQL, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p Portion
			if err := rows.Scan(&p.ID, &p.LabelVi, &p.Grams); err == nil {
				f.Servings = append(f.Servings, p)
			}
		}
	}
	if f.Servings == nil {
		f.Servings = []Portion{}
	}

	return &f, nil
}

func (r *pgxRepository) GetFoodsRichIn(ctx context.Context, nutrient string, limit int, userID *uuid.UUID) ([]RichInFoodItem, error) {
	if _, ok := ValidNutrients[nutrient]; !ok {
		return nil, ErrInvalidNutrient
	}

	if limit <= 0 {
		limit = 10
	}

	var query string
	var rows pgx.Rows
	var err error

	if userID != nil {
		query = fmt.Sprintf(`
			SELECT id, name_vi, category, (per_100g->>'%s')::numeric AS amount
			FROM nutrition.foods
			WHERE per_100g->>'%s' IS NOT NULL AND (per_100g->>'%s')::numeric > 0
			  AND (is_custom = false OR created_by = $2)
			ORDER BY (per_100g->>'%s')::numeric DESC
			LIMIT $1
		`, nutrient, nutrient, nutrient, nutrient)
		rows, err = r.pool.Query(ctx, query, limit, *userID)
	} else {
		query = fmt.Sprintf(`
			SELECT id, name_vi, category, (per_100g->>'%s')::numeric AS amount
			FROM nutrition.foods
			WHERE per_100g->>'%s' IS NOT NULL AND (per_100g->>'%s')::numeric > 0
			  AND is_custom = false
			ORDER BY (per_100g->>'%s')::numeric DESC
			LIMIT $1
		`, nutrient, nutrient, nutrient, nutrient)
		rows, err = r.pool.Query(ctx, query, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query rich-in foods: %w", err)
	}
	defer rows.Close()

	var items []RichInFoodItem
	for rows.Next() {
		var item RichInFoodItem
		if err := rows.Scan(&item.FoodID, &item.NameVi, &item.Category, &item.AmountPer100g); err != nil {
			return nil, fmt.Errorf("failed to scan rich-in food: %w", err)
		}
		items = append(items, item)
	}

	// Fetch standard serving (first portion) for each item
	if len(items) > 0 {
		foodIDs := make([]uuid.UUID, len(items))
		for i, it := range items {
			foodIDs[i] = it.FoodID
		}
		portionsSQL := `
			SELECT DISTINCT ON (food_id) food_id, label_vi, grams
			FROM nutrition.food_portions
			WHERE food_id = ANY($1)
			ORDER BY food_id, sort ASC
		`
		pRows, err := r.pool.Query(ctx, portionsSQL, foodIDs)
		if err == nil {
			defer pRows.Close()
			for pRows.Next() {
				var fid uuid.UUID
				var label string
				var grams float64
				if err := pRows.Scan(&fid, &label, &grams); err == nil {
					for i := range items {
						if items[i].FoodID == fid {
							amount := (items[i].AmountPer100g * grams) / 100.0
							items[i].StandardServing = &struct {
								Label  string  `json:"label"`
								Grams  float64 `json:"grams"`
								Amount float64 `json:"amount"`
							}{
								Label:  label,
								Grams:  grams,
								Amount: amount,
							}
						}
					}
				}
			}
		}
	}

	return items, nil
}

func (r *pgxRepository) CreateCustomFood(ctx context.Context, userID uuid.UUID, food *FoodDetail, portions []Portion) (*FoodDetail, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	nutrientsJSON, err := json.Marshal(food.Per100gNutrients)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal nutrients: %w", err)
	}

	insertSQL := `
		INSERT INTO nutrition.foods (
			id, name, name_vi, category, source, is_custom, created_by, per_100g, per_100g_nutrients
		) VALUES ($1, $2::text, $2::text, $3, 'custom', true, $4, $5::jsonb, $5::jsonb)
		RETURNING created_at
	`
	err = tx.QueryRow(ctx, insertSQL, food.ID, food.NameVi, food.Category, userID, nutrientsJSON).Scan(&food.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert custom food: %w", err)
	}

	for idx := range portions {
		if portions[idx].ID != uuid.Nil {
			_, err = tx.Exec(ctx, `
				INSERT INTO nutrition.food_portions (id, food_id, label_vi, grams, sort)
				VALUES ($1, $2, $3, $4, $5)
			`, portions[idx].ID, food.ID, portions[idx].LabelVi, portions[idx].Grams, idx)
		} else {
			err = tx.QueryRow(ctx, `
				INSERT INTO nutrition.food_portions (food_id, label_vi, grams, sort)
				VALUES ($1, $2, $3, $4)
				RETURNING id
			`, food.ID, portions[idx].LabelVi, portions[idx].Grams, idx).Scan(&portions[idx].ID)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to insert portion: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	food.Servings = portions
	food.CreatedBy = &userID
	return food, nil
}

func (r *pgxRepository) DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	query := `
		DELETE FROM nutrition.foods
		WHERE id = $1 AND created_by = $2 AND is_custom = true
	`
	tag, err := r.pool.Exec(ctx, query, foodID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete custom food: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
