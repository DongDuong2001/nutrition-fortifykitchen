package coaching

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

type mockRepo struct {
	apps       map[uuid.UUID]*CoachApplication
	userApps   map[uuid.UUID]*CoachApplication
	promotions []uuid.UUID
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		apps:       make(map[uuid.UUID]*CoachApplication),
		userApps:   make(map[uuid.UUID]*CoachApplication),
		promotions: make([]uuid.UUID, 0),
	}
}

func (m *mockRepo) CreateApplication(ctx context.Context, app *CoachApplication) error {
	m.apps[app.ID] = app
	m.userApps[app.UserID] = app
	return nil
}

func (m *mockRepo) GetApplicationByUserID(ctx context.Context, userID uuid.UUID) (*CoachApplication, error) {
	app, ok := m.userApps[userID]
	if !ok {
		return nil, ErrApplicationNotFound
	}
	return app, nil
}

func (m *mockRepo) GetApplicationByID(ctx context.Context, id uuid.UUID) (*CoachApplication, error) {
	app, ok := m.apps[id]
	if !ok {
		return nil, ErrApplicationNotFound
	}
	return app, nil
}

func (m *mockRepo) ListApplications(ctx context.Context, status string) ([]CoachApplication, error) {
	var list []CoachApplication
	for _, app := range m.apps {
		if status == "" || status == "all" || app.Status == status {
			list = append(list, *app)
		}
	}
	return list, nil
}

func (m *mockRepo) UpdateApplicationStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) error {
	app, ok := m.apps[id]
	if !ok {
		return ErrApplicationNotFound
	}
	app.Status = status
	app.ReviewedBy = &reviewerID
	now := time.Now()
	app.ReviewedAt = &now
	app.UpdatedAt = now
	return nil
}

func (m *mockRepo) PromoteUserToCoach(ctx context.Context, userID uuid.UUID) error {
	m.promotions = append(m.promotions, userID)
	return nil
}

func TestApply_Validation(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()
	userID := uuid.New()

	// Missing name
	_, err := svc.Apply(ctx, userID, ApplyCoachRequest{
		FullName: "",
		Email:    "test@example.com",
	})
	if err != ErrInvalidFullName {
		t.Fatalf("expected ErrInvalidFullName, got %v", err)
	}

	// Missing email
	_, err = svc.Apply(ctx, userID, ApplyCoachRequest{
		FullName: "Le Van A",
		Email:    "invalid-email",
	})
	if err != ErrInvalidEmail {
		t.Fatalf("expected ErrInvalidEmail, got %v", err)
	}

	// Valid application
	app, err := svc.Apply(ctx, userID, ApplyCoachRequest{
		FullName:        "Le Van A",
		Email:           "a.le@example.com",
		Specialty:       "Tang co",
		ExperienceYears: 3,
		Message:         "Toi muon lam HLV",
	})
	if err != nil {
		t.Fatalf("unexpected error on valid apply: %v", err)
	}
	if app.Status != "pending" {
		t.Fatalf("expected status pending, got %s", app.Status)
	}

	// Reapply when pending -> ErrAlreadyApplied
	_, err = svc.Apply(ctx, userID, ApplyCoachRequest{
		FullName: "Le Van A",
		Email:    "a.le@example.com",
	})
	if err != ErrAlreadyApplied {
		t.Fatalf("expected ErrAlreadyApplied, got %v", err)
	}
}

func TestUpdateStatus_Promotion(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()
	applicantID := uuid.New()
	reviewerID := uuid.New()

	app, err := svc.Apply(ctx, applicantID, ApplyCoachRequest{
		FullName:        "Nguyen Coach",
		Email:           "coach@example.com",
		Specialty:       "Giam mo",
		ExperienceYears: 5,
	})
	if err != nil {
		t.Fatalf("apply failed: %v", err)
	}

	// Invalid status
	_, err = svc.UpdateStatus(ctx, app.ID, "unknown", reviewerID)
	if err != ErrInvalidStatus {
		t.Fatalf("expected ErrInvalidStatus, got %v", err)
	}

	// Approve application -> user should be promoted to coach
	updated, err := svc.UpdateStatus(ctx, app.ID, "approved", reviewerID)
	if err != nil {
		t.Fatalf("unexpected error on approve: %v", err)
	}
	if updated.Status != "approved" {
		t.Fatalf("expected status approved, got %s", updated.Status)
	}
	if len(repo.promotions) != 1 || repo.promotions[0] != applicantID {
		t.Fatalf("expected applicant %s to be promoted, got %v", applicantID, repo.promotions)
	}
}
