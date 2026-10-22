package daytemplates

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) List(ctx context.Context, userID uuid.UUID) ([]Template, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, tag, meals, created_at, updated_at
		FROM nutrition.day_templates
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC, id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Template{}
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Name, &t.Tag, &t.Meals, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *PostgresRepository) Upsert(ctx context.Context, userID uuid.UUID, t Template) (*Template, error) {
	meals, err := json.Marshal(t.Meals)
	if err != nil {
		return nil, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// One save per user at a time, so two saves at once cannot both pass the limit
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('day_templates:' || $1::text, 0))`, userID); err != nil {
		return nil, err
	}

	var owner uuid.UUID
	var live bool
	err = tx.QueryRow(ctx,
		`SELECT user_id, deleted_at IS NULL FROM nutrition.day_templates WHERE id = $1 FOR UPDATE`, t.ID,
	).Scan(&owner, &live)
	exists := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if exists && owner != userID {
		return nil, ErrIDConflict
	}
	// Replacing a live template does not add one; a new (or deleted) one must fit under the limit
	if !(exists && live) {
		var count int
		if err := tx.QueryRow(ctx,
			`SELECT count(*) FROM nutrition.day_templates WHERE user_id = $1 AND deleted_at IS NULL`, userID,
		).Scan(&count); err != nil {
			return nil, err
		}
		if count >= MaxLive {
			return nil, ErrLimit
		}
	}

	// A replace keeps the first created_at (the list order); a save of a deleted template brings it back
	var out Template
	err = tx.QueryRow(ctx, `
		INSERT INTO nutrition.day_templates (id, user_id, name, tag, meals, created_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			tag = EXCLUDED.tag,
			meals = EXCLUDED.meals,
			deleted_at = NULL
		WHERE nutrition.day_templates.user_id = EXCLUDED.user_id
		RETURNING id, name, tag, meals, created_at, updated_at
	`, t.ID, userID, t.Name, t.Tag, string(meals), t.CreatedAt).Scan(
		&out.ID, &out.Name, &out.Tag, &out.Meals, &out.CreatedAt, &out.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrIDConflict
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, userID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE nutrition.day_templates SET deleted_at = now()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`, id, userID)
	return err
}
