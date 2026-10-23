package profile

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

var (
	ErrInvalidSex             = errors.New("invalid sex: must be 'male' or 'female'")
	ErrInvalidGoal            = errors.New("invalid goal: must be 'build', 'maintain', 'cut', or 'deep_cut'")
	ErrInvalidWeight          = errors.New("invalid weight: must be between 25 and 300 kg")
	ErrInvalidBirthYear       = errors.New("invalid birth year: must be between 1920 and 2015")
	ErrInvalidDisplayName     = errors.New("display_name must not exceed 40 characters")
	ErrInvalidTrainingMinutes = errors.New("training_minutes_default must be 0, 45, or a multiple of 30 from 30 to 480")
)

type DefaultService struct {
	repo Repository
}

func NewService(repo Repository) *DefaultService {
	return &DefaultService{repo: repo}
}

func (s *DefaultService) GetProfile(ctx context.Context, userID uuid.UUID) (*Profile, error) {
	p, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	if p != nil {
		if p.Role == "" {
			p.Role = "user"
		}
		age := targets.DefaultAge
		if p.BirthYear > 0 {
			age = time.Now().Year() - p.BirthYear
		}
		p.Targets = targets.CalculateTargets(targets.UserProfileForTargets{
			Sex:             p.Sex,
			WeightKg:        p.WeightKg,
			Goal:            p.Goal,
			TrainingMinutes: p.TrainingMinutesDefault,
			IsPeriod:        p.NearPeriod,
			Age:             age,
		})
	}
	return p, nil
}

func (s *DefaultService) UpsertProfile(ctx context.Context, userID uuid.UUID, req UpsertProfileRequest) (*Profile, error) {
	levelSeen, levelErrs := ParseLevelFields(req)
	if levelErrs != nil {
		return nil, levelErrs
	}
	if req.Sex != "male" && req.Sex != "female" {
		return nil, ErrInvalidSex
	}
	if req.Goal != "build" && req.Goal != "maintain" && req.Goal != "cut" && req.Goal != "deep_cut" {
		return nil, ErrInvalidGoal
	}
	if req.WeightKg < 25.0 || req.WeightKg > 300.0 {
		return nil, ErrInvalidWeight
	}
	if req.BirthYear < 1920 || req.BirthYear > 2015 {
		return nil, ErrInvalidBirthYear
	}

	trainingMinutes := 60
	if req.TrainingMinutesDefault != nil {
		m := *req.TrainingMinutesDefault
		if !targets.ValidTrainingMinutes(m) {
			return nil, ErrInvalidTrainingMinutes
		}
		trainingMinutes = m
	}

	nearPeriod := false
	if req.NearPeriod != nil && req.Sex == "female" {
		nearPeriod = *req.NearPeriod
	}

	lang := "vi"
	if req.Language != nil && *req.Language != "" {
		lang = *req.Language
	}

	var displayName *string
	if req.DisplayName != nil {
		trimmed := strings.TrimSpace(*req.DisplayName)
		if len([]rune(trimmed)) > 40 {
			return nil, ErrInvalidDisplayName
		}
		if trimmed != "" {
			displayName = &trimmed
		}
	}

	settings, fieldErrs := ParseTargetSettings(req)
	if fieldErrs != nil {
		return nil, fieldErrs
	}

	if levelSeen != nil {
		// Never above the user's own Level; a user with no profile row yet is at Level 0
		level := 0
		stored, err := s.repo.GetProfile(ctx, userID)
		switch {
		case err == nil:
			level = stored.Level
		case !errors.Is(err, ErrProfileNotFound):
			return nil, err
		}
		if *levelSeen > level {
			return nil, FieldErrors{"levelSeen": fmt.Sprintf("levelSeen must not be above your level (%d)", level)}
		}
	}

	p := &Profile{
		SetLevelSeen:           levelSeen,
		Settings:               settings,
		UserID:                 userID,
		Sex:                    req.Sex,
		BirthYear:              req.BirthYear,
		WeightKg:               req.WeightKg,
		Goal:                   req.Goal,
		TrainingMinutesDefault: trainingMinutes,
		NearPeriod:             nearPeriod,
		Language:               lang,
		DisplayName:            displayName,
		TrainingPrefs:          req.TrainingPrefs,
	}

	if err := s.repo.UpsertProfile(ctx, p); err != nil {
		return nil, err
	}

	return s.GetProfile(ctx, userID)
}

func (s *DefaultService) GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]WeightLog, error) {
	return s.repo.GetWeightLogs(ctx, userID, fromDate, toDate)
}

func (s *DefaultService) UpsertWeight(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error {
	if weightKg < 25.0 || weightKg > 300.0 {
		return ErrInvalidWeight
	}
	return s.repo.UpsertWeightLog(ctx, userID, logDate, weightKg)
}

func (s *DefaultService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeleteAccount(ctx, userID)
}
