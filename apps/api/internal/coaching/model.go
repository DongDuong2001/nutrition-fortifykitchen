package coaching

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type CoachApplication struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	FullName        string     `json:"name"`
	Email           string     `json:"email"`
	Specialty       string     `json:"specialty"`
	ExperienceYears int        `json:"experienceYears"`
	Message         string     `json:"message"`
	SocialLink      string     `json:"socialLink"`
	Status          string     `json:"status"` // "pending" | "approved" | "rejected"
	ReviewedBy      *uuid.UUID `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type ApplyCoachRequest struct {
	FullName        string `json:"name"`
	Email           string `json:"email"`
	Specialty       string `json:"specialty"`
	ExperienceYears int    `json:"experienceYears"`
	Message         string `json:"message"`
	SocialLink      string `json:"socialLink"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"` // "approved" | "rejected"
}

type Repository interface {
	CreateApplication(ctx context.Context, app *CoachApplication) error
	GetApplicationByUserID(ctx context.Context, userID uuid.UUID) (*CoachApplication, error)
	ListApplications(ctx context.Context, status string) ([]CoachApplication, error)
	GetApplicationByID(ctx context.Context, id uuid.UUID) (*CoachApplication, error)
	UpdateApplicationStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) error
	PromoteUserToCoach(ctx context.Context, userID uuid.UUID) error
}

type Service interface {
	Apply(ctx context.Context, userID uuid.UUID, req ApplyCoachRequest) (*CoachApplication, error)
	GetMyApplication(ctx context.Context, userID uuid.UUID) (*CoachApplication, error)
	ListApplications(ctx context.Context, status string) ([]CoachApplication, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID) (*CoachApplication, error)
}
