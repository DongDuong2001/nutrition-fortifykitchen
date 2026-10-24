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

	// Target settings (migration 000015), camelCase like the web's lib/profile.ts. null = not set.
	MacroMode        *string            `json:"macroMode"`
	MacroRatios      *MacroRatios       `json:"macroRatios"`
	MacroFixed       *MacroFixed        `json:"macroFixed"`
	CustomEnergyKcal *int               `json:"customEnergyKcal"`
	CustomTargets    map[string]float64 `json:"customTargets"`
	// UpdatedAtJS is updated_at again under the web's name: the web compares it with the device's last change.
	UpdatedAtJS time.Time `json:"updatedAt"`

	// The user's Level (migration 000021), 0–5, camelCase like the target settings. Level is set by an admin or a coach,
	// never by the user's own save; LevelSeen is the last Level the user was shown the Level-up celebration or card for.
	Level     int `json:"level"`
	LevelSeen int `json:"levelSeen"`
	// SetLevelSeen is what a save writes to level_seen: nil keeps the stored value (never serialised).
	SetLevelSeen *int `json:"-"`

	// Settings is what a save changes in the target settings (never serialised).
	Settings TargetSettingsPatch `json:"-"`
}

type WeightLog struct {
	UserID    uuid.UUID `json:"user_id"`
	LogDate   string    `json:"log_date"`
	WeightKg  float64   `json:"weight_kg"`
	CreatedAt time.Time `json:"created_at"`
}

type UpsertProfileRequest struct {
	Sex                    string  `json:"sex"`
	BirthYear              int     `json:"birth_year"`
	WeightKg               float64 `json:"weight_kg"`
	Goal                   string  `json:"goal"`
	TrainingMinutesDefault *int    `json:"training_minutes_default,omitempty"`
	NearPeriod             *bool   `json:"near_period,omitempty"`
	Language               *string `json:"language,omitempty"`
	DisplayName            *string `json:"display_name,omitempty"`
	TrainingPrefs          any     `json:"training_prefs,omitempty"`

	// Target settings: a key left out keeps the stored value, null clears it (ParseTargetSettings).
	MacroMode        Nullable `json:"macroMode"`
	MacroRatios      Nullable `json:"macroRatios"`
	MacroFixed       Nullable `json:"macroFixed"`
	CustomEnergyKcal Nullable `json:"customEnergyKcal"`
	CustomTargets    Nullable `json:"customTargets"`

	// LevelSeen may be sent (0–5, stored at most as the user's level). Level is only here so a request that sends it is refused.
	LevelSeen Nullable `json:"levelSeen"`
	Level     Nullable `json:"level"`
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
