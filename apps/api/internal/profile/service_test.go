package profile_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/profile"
)

type mockRepository struct {
	profiles map[uuid.UUID]*profile.Profile
	weights  map[uuid.UUID]map[string]float64
}

func newMockRepo() *mockRepository {
	return &mockRepository{
		profiles: make(map[uuid.UUID]*profile.Profile),
		weights:  make(map[uuid.UUID]map[string]float64),
	}
}

func (m *mockRepository) GetProfile(ctx context.Context, userID uuid.UUID) (*profile.Profile, error) {
	p, ok := m.profiles[userID]
	if !ok {
		return nil, profile.ErrProfileNotFound
	}
	return p, nil
}

// Like the SQL: level is never written by a save; level_seen only when the save sets it, at most the stored level (new
// rows start at 0 / 0).
func (m *mockRepository) UpsertProfile(ctx context.Context, p *profile.Profile) error {
	if stored, ok := m.profiles[p.UserID]; ok {
		p.Level, p.LevelSeen = stored.Level, stored.LevelSeen
	}
	if p.SetLevelSeen != nil {
		p.LevelSeen = min(*p.SetLevelSeen, p.Level)
	}
	m.profiles[p.UserID] = p
	return nil
}

func (m *mockRepository) GetWeightLogs(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]profile.WeightLog, error) {
	userWeights := m.weights[userID]
	var logs []profile.WeightLog
	for date, w := range userWeights {
		logs = append(logs, profile.WeightLog{
			UserID:   userID,
			LogDate:  date,
			WeightKg: w,
		})
	}
	return logs, nil
}

func (m *mockRepository) UpsertWeightLog(ctx context.Context, userID uuid.UUID, logDate string, weightKg float64) error {
	if _, ok := m.weights[userID]; !ok {
		m.weights[userID] = make(map[string]float64)
	}
	m.weights[userID][logDate] = weightKg
	if p, ok := m.profiles[userID]; ok {
		p.WeightKg = weightKg
	}
	return nil
}

func (m *mockRepository) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	delete(m.profiles, userID)
	delete(m.weights, userID)
	return nil
}

func TestProfileService(t *testing.T) {
	repo := newMockRepo()
	svc := profile.NewService(repo)
	userID := uuid.New()
	ctx := context.Background()

	t.Run("get missing profile returns ErrProfileNotFound", func(t *testing.T) {
		_, err := svc.GetProfile(ctx, userID)
		if err != profile.ErrProfileNotFound {
			t.Fatalf("expected ErrProfileNotFound, got %v", err)
		}
	})

	t.Run("upsert invalid sex fails", func(t *testing.T) {
		req := profile.UpsertProfileRequest{
			Sex:       "other",
			BirthYear: 2000,
			WeightKg:  70.0,
			Goal:      "maintain",
		}
		_, err := svc.UpsertProfile(ctx, userID, req)
		if err != profile.ErrInvalidSex {
			t.Fatalf("expected ErrInvalidSex, got %v", err)
		}
	})

	t.Run("upsert invalid goal fails", func(t *testing.T) {
		req := profile.UpsertProfileRequest{
			Sex:       "male",
			BirthYear: 2000,
			WeightKg:  70.0,
			Goal:      "invalid_goal",
		}
		_, err := svc.UpsertProfile(ctx, userID, req)
		if err != profile.ErrInvalidGoal {
			t.Fatalf("expected ErrInvalidGoal, got %v", err)
		}
	})

	t.Run("upsert valid profile succeeds", func(t *testing.T) {
		mins := 60
		req := profile.UpsertProfileRequest{
			Sex:                    "male",
			BirthYear:              2003,
			WeightKg:               65.0,
			Goal:                   "maintain",
			TrainingMinutesDefault: &mins,
		}
		p, err := svc.UpsertProfile(ctx, userID, req)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if p.WeightKg != 65.0 || p.Sex != "male" {
			t.Fatalf("unexpected profile values: %+v", p)
		}
	})

	t.Run("upsert weight updates daily log and profile weight", func(t *testing.T) {
		err := svc.UpsertWeight(ctx, userID, "2026-10-12", 64.5)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		p, err := svc.GetProfile(ctx, userID)
		if err != nil {
			t.Fatalf("expected profile, got %v", err)
		}
		if p.WeightKg != 64.5 {
			t.Fatalf("expected profile weight updated to 64.5, got %v", p.WeightKg)
		}
	})

	t.Run("upsert profile with display name over 40 characters fails", func(t *testing.T) {
		tooLong := "This display name is definitely longer than 40 characters long"
		req := profile.UpsertProfileRequest{
			Sex:         "male",
			BirthYear:   2000,
			WeightKg:    70.0,
			Goal:        "maintain",
			DisplayName: &tooLong,
		}
		_, err := svc.UpsertProfile(ctx, userID, req)
		if err != profile.ErrInvalidDisplayName {
			t.Fatalf("expected ErrInvalidDisplayName, got %v", err)
		}
	})

	t.Run("upsert profile trims display name and converts blank to nil", func(t *testing.T) {
		name := "  Phu Dong  "
		req := profile.UpsertProfileRequest{
			Sex:         "male",
			BirthYear:   2000,
			WeightKg:    70.0,
			Goal:        "maintain",
			DisplayName: &name,
		}
		p, err := svc.UpsertProfile(ctx, userID, req)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if p.DisplayName == nil || *p.DisplayName != "Phu Dong" {
			t.Fatalf("expected trimmed display name 'Phu Dong', got %v", p.DisplayName)
		}

		blank := "   "
		reqBlank := profile.UpsertProfileRequest{
			Sex:         "male",
			BirthYear:   2000,
			WeightKg:    70.0,
			Goal:        "maintain",
			DisplayName: &blank,
		}
		pBlank, err := svc.UpsertProfile(ctx, userID, reqBlank)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if pBlank.DisplayName != nil {
			t.Fatalf("expected nil for blank display name, got %v", *pBlank.DisplayName)
		}
	})
}
