package coaching

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrApplicationNotFound = errors.New("coach application not found")
	ErrAlreadyApplied      = errors.New("a pending or approved coach application already exists")
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateApplication(ctx context.Context, app *CoachApplication) error {
	query := `
		INSERT INTO nutrition.coach_applications (
			id, user_id, full_name, email, specialty, experience_years,
			message, social_link, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.pool.Exec(
		ctx, query,
		app.ID, app.UserID, app.FullName, app.Email, app.Specialty, app.ExperienceYears,
		app.Message, app.SocialLink, app.Status, app.CreatedAt, app.UpdatedAt,
	)
	return err
}

func (r *PostgresRepository) GetApplicationByUserID(ctx context.Context, userID uuid.UUID) (*CoachApplication, error) {
	query := `
		SELECT id, user_id, full_name, email, specialty, experience_years,
		       message, social_link, status, reviewed_by, reviewed_at, created_at, updated_at
		FROM nutrition.coach_applications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var app CoachApplication
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&app.ID, &app.UserID, &app.FullName, &app.Email, &app.Specialty, &app.ExperienceYears,
		&app.Message, &app.SocialLink, &app.Status, &app.ReviewedBy, &app.ReviewedAt,
		&app.CreatedAt, &app.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}
	return &app, nil
}

func (r *PostgresRepository) GetApplicationByID(ctx context.Context, id uuid.UUID) (*CoachApplication, error) {
	query := `
		SELECT id, user_id, full_name, email, specialty, experience_years,
		       message, social_link, status, reviewed_by, reviewed_at, created_at, updated_at
		FROM nutrition.coach_applications
		WHERE id = $1
	`
	var app CoachApplication
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&app.ID, &app.UserID, &app.FullName, &app.Email, &app.Specialty, &app.ExperienceYears,
		&app.Message, &app.SocialLink, &app.Status, &app.ReviewedBy, &app.ReviewedAt,
		&app.CreatedAt, &app.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}
	return &app, nil
}

func (r *PostgresRepository) ListApplications(ctx context.Context, status string) ([]CoachApplication, error) {
	var query string
	var args []any

	if status != "" && status != "all" {
		query = `
			SELECT id, user_id, full_name, email, specialty, experience_years,
			       message, social_link, status, reviewed_by, reviewed_at, created_at, updated_at
			FROM nutrition.coach_applications
			WHERE status = $1
			ORDER BY created_at DESC
		`
		args = append(args, status)
	} else {
		query = `
			SELECT id, user_id, full_name, email, specialty, experience_years,
			       message, social_link, status, reviewed_by, reviewed_at, created_at, updated_at
			FROM nutrition.coach_applications
			ORDER BY created_at DESC
		`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []CoachApplication
	for rows.Next() {
		var app CoachApplication
		if err := rows.Scan(
			&app.ID, &app.UserID, &app.FullName, &app.Email, &app.Specialty, &app.ExperienceYears,
			&app.Message, &app.SocialLink, &app.Status, &app.ReviewedBy, &app.ReviewedAt,
			&app.CreatedAt, &app.UpdatedAt,
		); err != nil {
			return nil, err
		}
		apps = append(apps, app)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if apps == nil {
		apps = []CoachApplication{}
	}
	return apps, nil
}

func (r *PostgresRepository) UpdateApplicationStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) error {
	now := time.Now()
	query := `
		UPDATE nutrition.coach_applications
		SET status = $1, reviewed_by = $2, reviewed_at = $3::timestamptz, updated_at = $3::timestamptz
		WHERE id = $4
	`
	cmd, err := r.pool.Exec(ctx, query, status, reviewerID, now, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrApplicationNotFound
	}
	return nil
}

func (r *PostgresRepository) PromoteUserToCoach(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE nutrition.profiles
		SET role = 'coach', updated_at = now()
		WHERE user_id = $1
	`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
