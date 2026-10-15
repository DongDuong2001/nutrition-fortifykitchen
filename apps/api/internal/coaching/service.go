package coaching

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidFullName = errors.New("full name is required")
	ErrInvalidEmail    = errors.New("valid email is required")
	ErrInvalidStatus   = errors.New("status must be approved or rejected")
)

type DefaultService struct {
	repo Repository
}

func NewService(repo Repository) *DefaultService {
	return &DefaultService{repo: repo}
}

func (s *DefaultService) Apply(ctx context.Context, userID uuid.UUID, req ApplyCoachRequest) (*CoachApplication, error) {
	name := strings.TrimSpace(req.FullName)
	if name == "" {
		return nil, ErrInvalidFullName
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, ErrInvalidEmail
	}

	// Check if existing pending application exists
	existing, err := s.repo.GetApplicationByUserID(ctx, userID)
	if err == nil && existing != nil && existing.Status == "pending" {
		return nil, ErrAlreadyApplied
	}

	now := time.Now()
	app := &CoachApplication{
		ID:              uuid.New(),
		UserID:          userID,
		FullName:        name,
		Email:           email,
		Specialty:       strings.TrimSpace(req.Specialty),
		ExperienceYears: req.ExperienceYears,
		Message:         strings.TrimSpace(req.Message),
		SocialLink:      strings.TrimSpace(req.SocialLink),
		Status:          "pending",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.repo.CreateApplication(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

func (s *DefaultService) GetMyApplication(ctx context.Context, userID uuid.UUID) (*CoachApplication, error) {
	return s.repo.GetApplicationByUserID(ctx, userID)
}

func (s *DefaultService) ListApplications(ctx context.Context, status string) ([]CoachApplication, error) {
	return s.repo.ListApplications(ctx, status)
}

func (s *DefaultService) UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) (*CoachApplication, error) {
	status = strings.ToLower(strings.TrimSpace(status))
	if status != "approved" && status != "rejected" {
		return nil, ErrInvalidStatus
	}

	app, err := s.repo.GetApplicationByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateApplicationStatus(ctx, id, status, reviewerID); err != nil {
		return nil, err
	}

	// If approved, promote the applicant to coach role in nutrition.profiles
	if status == "approved" {
		if err := s.repo.PromoteUserToCoach(ctx, app.UserID); err != nil {
			return nil, err
		}
	}

	app.Status = status
	app.ReviewedBy = &reviewerID
	now := time.Now()
	app.ReviewedAt = &now
	app.UpdatedAt = now

	return app, nil
}
