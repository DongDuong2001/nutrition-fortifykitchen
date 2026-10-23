package documents

import (
	"context"
	"errors"
	"time"

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

func (r *PostgresRepository) List(ctx context.Context) ([]Meta, error) {
	rows, err := r.pool.Query(ctx, `SELECT name, updated_at FROM nutrition.documents ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Meta{}
	for rows.Next() {
		var m Meta
		if err := rows.Scan(&m.Name, &m.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func (r *PostgresRepository) Get(ctx context.Context, name string) (*Document, error) {
	var d Document
	err := r.pool.QueryRow(ctx, `SELECT name, updated_at, content FROM nutrition.documents WHERE name = $1`, name).
		Scan(&d.Name, &d.UpdatedAt, &d.Content)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *PostgresRepository) Upsert(ctx context.Context, name, content string, by uuid.UUID, base *time.Time) (*Meta, error) {
	var m Meta
	if base == nil {
		err := r.pool.QueryRow(ctx, `
			INSERT INTO nutrition.documents (name, content, updated_by) VALUES ($1, $2, $3)
			ON CONFLICT (name) DO UPDATE SET content = EXCLUDED.content, updated_by = EXCLUDED.updated_by
			RETURNING name, updated_at
		`, name, content, by).Scan(&m.Name, &m.UpdatedAt)
		if err != nil {
			return nil, err
		}
		return &m, nil
	}

	// An edit: one statement, so a save between the editor's load and this write makes it match no row
	err := r.pool.QueryRow(ctx, `
		UPDATE nutrition.documents SET content = $2, updated_by = $3
		WHERE name = $1 AND updated_at = $4
		RETURNING name, updated_at
	`, name, content, by, *base).Scan(&m.Name, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM nutrition.documents WHERE name = $1)`, name).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrChanged
		}
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *PostgresRepository) CodeValid(ctx context.Context, hash string) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM nutrition.document_access_codes WHERE code_hash = $1 AND revoked_at IS NULL AND expires_at > now())
	`, hash).Scan(&ok)
	return ok, err
}

func (r *PostgresRepository) InsertCode(ctx context.Context, hash string, by uuid.UUID, expiresAt time.Time) (*Code, error) {
	var c Code
	err := r.pool.QueryRow(ctx, `
		INSERT INTO nutrition.document_access_codes (code_hash, created_by, expires_at) VALUES ($1, $2, $3)
		RETURNING id, created_at, expires_at
	`, hash, by, expiresAt).Scan(&c.ID, &c.CreatedAt, &c.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *PostgresRepository) ListCodes(ctx context.Context, by uuid.UUID) ([]Code, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, created_at, expires_at FROM nutrition.document_access_codes
		WHERE created_by = $1 AND revoked_at IS NULL AND expires_at > now()
		ORDER BY created_at DESC
	`, by)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Code{}
	for rows.Next() {
		var c Code
		if err := rows.Scan(&c.ID, &c.CreatedAt, &c.ExpiresAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (r *PostgresRepository) RevokeCode(ctx context.Context, by, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE nutrition.document_access_codes SET revoked_at = now()
		WHERE id = $1 AND created_by = $2 AND revoked_at IS NULL
	`, id, by)
	return err
}
