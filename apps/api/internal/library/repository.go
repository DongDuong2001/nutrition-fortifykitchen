package library

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetFavourites(ctx context.Context, userID uuid.UUID) ([]FavouriteItem, error)
	AddFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error
	RemoveFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error

	GetRecents(ctx context.Context, userID uuid.UUID, limit int) ([]RecentItem, error)
	UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error

	GetSavedMeals(ctx context.Context, userID uuid.UUID) ([]SavedMeal, error)
	GetSavedMealByID(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) (*SavedMeal, error)
	CreateSavedMeal(ctx context.Context, userID uuid.UUID, meal *SavedMeal) (*SavedMeal, error)
	DeleteSavedMeal(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) error
}

type pgxLibraryRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgxLibraryRepo{pool: pool}
}

func (r *pgxLibraryRepo) GetFavourites(ctx context.Context, userID uuid.UUID) ([]FavouriteItem, error) {
	query := `
		SELECT f.id, f.name_vi, f.category, uf.created_at
		FROM nutrition.user_favourites uf
		JOIN nutrition.foods f ON f.id = uf.food_id
		WHERE uf.user_id = $1
		ORDER BY uf.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query favourites: %w", err)
	}
	defer rows.Close()

	var list []FavouriteItem
	for rows.Next() {
		var item FavouriteItem
		if err := rows.Scan(&item.FoodID, &item.NameVi, &item.Category, &item.AddedAt); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *pgxLibraryRepo) AddFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	query := `
		INSERT INTO nutrition.user_favourites (user_id, food_id, created_at)
		VALUES ($1, $2, now())
		ON CONFLICT (user_id, food_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, userID, foodID)
	return err
}

func (r *pgxLibraryRepo) RemoveFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	query := `DELETE FROM nutrition.user_favourites WHERE user_id = $1 AND food_id = $2`
	_, err := r.pool.Exec(ctx, query, userID, foodID)
	return err
}

func (r *pgxLibraryRepo) GetRecents(ctx context.Context, userID uuid.UUID, limit int) ([]RecentItem, error) {
	if limit <= 0 {
		limit = 30
	}
	query := `
		SELECT f.id, f.name_vi, ur.last_portion_label, ur.last_grams, ur.used_at
		FROM nutrition.user_recents ur
		JOIN nutrition.foods f ON f.id = ur.food_id
		WHERE ur.user_id = $1
		ORDER BY ur.used_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query recents: %w", err)
	}
	defer rows.Close()

	var list []RecentItem
	for rows.Next() {
		var item RecentItem
		var portionLabel *string
		if err := rows.Scan(&item.FoodID, &item.NameVi, &portionLabel, &item.LastGrams, &item.LastLoggedAt); err != nil {
			return nil, err
		}
		if portionLabel != nil {
			item.LastServingLabel = *portionLabel
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *pgxLibraryRepo) UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error {
	query := `
		INSERT INTO nutrition.user_recents (user_id, food_id, last_portion_label, last_grams, used_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (user_id, food_id) DO UPDATE SET
			last_portion_label = EXCLUDED.last_portion_label,
			last_grams = EXCLUDED.last_grams,
			used_at = now()
	`
	_, err := r.pool.Exec(ctx, query, userID, foodID, portionLabel, grams)
	if err != nil {
		return err
	}

	// 30-per-user cap: delete entries older than the top 30
	trimSQL := `
		DELETE FROM nutrition.user_recents
		WHERE user_id = $1 AND food_id NOT IN (
			SELECT food_id FROM nutrition.user_recents
			WHERE user_id = $1
			ORDER BY used_at DESC
			LIMIT 30
		)
	`
	_, _ = r.pool.Exec(ctx, trimSQL, userID)
	return nil
}

func (r *pgxLibraryRepo) GetSavedMeals(ctx context.Context, userID uuid.UUID) ([]SavedMeal, error) {
	query := `
		SELECT id, name, created_at, updated_at
		FROM nutrition.saved_meals
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var meals []SavedMeal
	for rows.Next() {
		var m SavedMeal
		if err := rows.Scan(&m.ID, &m.Name, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		meals = append(meals, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating saved meals: %w", err)
	}

	// Batch load items for all meals in one query
	if len(meals) > 0 {
		mealIDs := make([]uuid.UUID, len(meals))
		mealIndex := make(map[uuid.UUID]int, len(meals))
		for i, m := range meals {
			mealIDs[i] = m.ID
			mealIndex[m.ID] = i
		}

		itemsSQL := `
			SELECT smi.saved_meal_id, smi.id, smi.food_id, f.name_vi, smi.portion_label, smi.grams, smi.sort
			FROM nutrition.saved_meal_items smi
			JOIN nutrition.foods f ON f.id = smi.food_id
			WHERE smi.saved_meal_id = ANY($1)
			ORDER BY smi.sort ASC
		`
		iRows, err := r.pool.Query(ctx, itemsSQL, mealIDs)
		if err == nil {
			defer iRows.Close()
			for iRows.Next() {
				var savedMealID uuid.UUID
				var it SavedMealItem
				var pLabel *string
				if err := iRows.Scan(&savedMealID, &it.ID, &it.FoodID, &it.FoodName, &pLabel, &it.Grams, &it.Sort); err == nil {
					if pLabel != nil {
						it.PortionLabel = *pLabel
					}
					if idx, exists := mealIndex[savedMealID]; exists {
						meals[idx].Items = append(meals[idx].Items, it)
					}
				}
			}
		}
	}

	return meals, nil
}

func (r *pgxLibraryRepo) GetSavedMealByID(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) (*SavedMeal, error) {
	query := `
		SELECT id, name, created_at, updated_at
		FROM nutrition.saved_meals
		WHERE id = $1 AND user_id = $2
	`
	var m SavedMeal
	err := r.pool.QueryRow(ctx, query, mealID, userID).Scan(&m.ID, &m.Name, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	itemsSQL := `
		SELECT smi.id, smi.food_id, f.name_vi, smi.portion_label, smi.grams, smi.sort
		FROM nutrition.saved_meal_items smi
		JOIN nutrition.foods f ON f.id = smi.food_id
		WHERE smi.saved_meal_id = $1
		ORDER BY smi.sort ASC
	`
	rows, err := r.pool.Query(ctx, itemsSQL, mealID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it SavedMealItem
			var pLabel *string
			if err := rows.Scan(&it.ID, &it.FoodID, &it.FoodName, &pLabel, &it.Grams, &it.Sort); err == nil {
				if pLabel != nil {
					it.PortionLabel = *pLabel
				}
				m.Items = append(m.Items, it)
			}
		}
	}

	return &m, nil
}

func (r *pgxLibraryRepo) CreateSavedMeal(ctx context.Context, userID uuid.UUID, meal *SavedMeal) (*SavedMeal, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	meal.ID = uuid.New()
	query := `
		INSERT INTO nutrition.saved_meals (id, user_id, name, created_at, updated_at)
		VALUES ($1, $2, $3, now(), now())
		RETURNING created_at, updated_at
	`
	err = tx.QueryRow(ctx, query, meal.ID, userID, meal.Name).Scan(&meal.CreatedAt, &meal.UpdatedAt)
	if err != nil {
		return nil, err
	}

	for idx, item := range meal.Items {
		item.ID = uuid.New()
		item.Sort = idx
		_, err = tx.Exec(ctx, `
			INSERT INTO nutrition.saved_meal_items (id, saved_meal_id, food_id, portion_label, grams, sort)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, item.ID, meal.ID, item.FoodID, item.PortionLabel, item.Grams, item.Sort)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return meal, nil
}

func (r *pgxLibraryRepo) DeleteSavedMeal(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) error {
	query := `DELETE FROM nutrition.saved_meals WHERE id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, query, mealID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
