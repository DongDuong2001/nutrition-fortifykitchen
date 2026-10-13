package profile

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/google/uuid"
)

var ErrProfileNotFound = errors.New("profile not found")

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetProfile(ctx context.Context, userID uuid.UUID) (*Profile, error) {
	query := `
		SELECT user_id, sex, birth_year, weight_kg, goal, training_minutes_default,
		       near_period, language, reminders, display_name, created_at, updated_at
		FROM nutrition.profiles
		WHERE user_id = $1
	`
	var p Profile
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.Sex, &p.BirthYear, &p.WeightKg, &p.Goal, &p.TrainingMinutesDefault,
		&p.NearPeriod, &p.Language, &p.Reminders, &p.DisplayName, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PostgresRepository) UpsertProfile(ctx context.Context, p *Profile) error {
	query := `
		INSERT INTO nutrition.profiles (
			user_id, sex, birth_year, weight_kg, goal, training_minutes_default,
			near_period, language, display_name, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		ON CONFLICT (user_id) DO UPDATE SET
			sex = EXCLUDED.sex,
			birth_year = EXCLUDED.birth_year,
			weight_kg = EXCLUDED.weight_kg,
			goal = EXCLUDED.goal,
			training_minutes_default = EXCLUDED.training_minutes_default,
			near_period = EXCLUDED.near_period,
			language = EXCLUDED.language,
			display_name = COALESCE(EXCLUDED.display_name, nutrition.profiles.display_name),
			updated_at = now()
	`
	_, err := r.pool.Exec(ctx, query,
		p.UserID, p.Sex, p.BirthYear, p.WeightKg, p.Goal, p.TrainingMinutesDefault,
		p.NearPeriod, p.Language, p.DisplayName,
	)
	return err
}

func (r *PostgresRepository) GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]WeightLog, error) {
	query := `
		SELECT user_id, log_date, weight_kg, created_at
		FROM nutrition.weight_logs
		WHERE user_id = $1
		  AND ($2 = '' OR log_date >= $2::date)
		  AND ($3 = '' OR log_date <= $3::date)
		ORDER BY log_date ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, fromDate, toDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []WeightLog
	for rows.Next() {
		var l WeightLog
		var t time.Time
		if err := rows.Scan(&l.UserID, &t, &l.WeightKg, &l.CreatedAt); err != nil {
			return nil, err
		}
		l.LogDate = t.Format("2006-01-02")
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (r *PostgresRepository) UpsertWeightLog(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Upsert daily weigh-in
	weightQuery := `
		INSERT INTO nutrition.weight_logs (user_id, log_date, weight_kg, created_at)
		VALUES ($1, $2::date, $3, now())
		ON CONFLICT (user_id, log_date) DO UPDATE SET
			weight_kg = EXCLUDED.weight_kg
	`
	if _, err := tx.Exec(ctx, weightQuery, userID, logDate, weightKg); err != nil {
		return err
	}

	// 2. Atomically update latest weight_kg in profile if exists and logDate is the latest weigh-in
	profileQuery := `
		UPDATE nutrition.profiles
		SET weight_kg = $2, updated_at = now()
		WHERE user_id = $1
		  AND NOT EXISTS (
			  SELECT 1 FROM nutrition.weight_logs
			  WHERE user_id = $1 AND log_date > $3::date
		  )
	`
	if _, err := tx.Exec(ctx, profileQuery, userID, weightKg, logDate); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM auth.users WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
