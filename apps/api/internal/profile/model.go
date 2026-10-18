package profile

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	UserID                 uuid.UUID `json:"user_id"`
	Sex                    string    `json:"sex"`
	BirthYear              int       `json:"birth_year"`
	WeightKg               float64   `json:"weight_kg"`
	Goal                   string    `json:"goal"`
	TrainingMinutesDefault int       `json:"training_minutes_default"`
	NearPeriod             bool      `json:"near_period"`
	Language               string    `json:"language"`
	DisplayName            *string   `json:"display_name,omitempty"`
	Role                   string    `json:"role"`
	Reminders              any       `json:"reminders"`
	TrainingPrefs          any       `json:"training_prefs,omitempty"`
	Targets                any       `json:"targets,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type WeightLog struct {
	UserID    uuid.UUID `json:"user_id"`
	LogDate   string    `json:"log_date"`
	WeightKg  float64   `json:"weight_kg"`
	CreatedAt time.Time `json:"created_at"`
}

type UpsertProfileRequest struct {
	Sex                    string   `json:"sex"`
	BirthYear              int      `json:"birth_year"`
	WeightKg               float64  `json:"weight_kg"`
	Goal                   string   `json:"goal"`
	TrainingMinutesDefault *int     `json:"training_minutes_default,omitempty"`
	NearPeriod             *bool    `json:"near_period,omitempty"`
	Language               *string  `json:"language,omitempty"`
	DisplayName            *string  `json:"display_name,omitempty"`
	TrainingPrefs          any      `json:"training_prefs,omitempty"`
}

type UpsertWeightRequest struct {
	WeightKg float64 `json:"weight_kg"`
}

type Repository interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*Profile, error)
	UpsertProfile(ctx context.Context, p *Profile) error
	GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]WeightLog, error)
	UpsertWeightLog(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
}

type Service interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*Profile, error)
	UpsertProfile(ctx context.Context, userID uuid.UUID, req UpsertProfileRequest) (*Profile, error)
	GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]WeightLog, error)
	UpsertWeight(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
}
