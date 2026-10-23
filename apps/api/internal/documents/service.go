package documents

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo Repository
	now  func() time.Time
	// newCode is NewCode; a test swaps it
	newCode func() (string, error)
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo, now: time.Now, newCode: NewCode}
}

func (s *Service) List(ctx context.Context) ([]Meta, error) {
	return s.repo.List(ctx)
}

func (s *Service) Get(ctx context.Context, name string) (*Document, error) {
	if !ValidName(name) {
		return nil, ErrBadName
	}
	return s.repo.Get(ctx, name)
}

// Put writes the document (the route is for coaches and admins only).
func (s *Service) Put(ctx context.Context, userID uuid.UUID, name string, req PutRequest) (*Meta, error) {
	if !ValidName(name) {
		return nil, ErrBadName
	}
	if len(req.Content) > MaxContentBytes {
		return nil, ErrTooLarge
	}
	return s.repo.Upsert(ctx, name, req.Content, userID, req.BaseUpdatedAt)
}

// Open is a learner's read: the document, when code is a live access code. The name is checked first, so a bad request never
// spends a code check.
func (s *Service) Open(ctx context.Context, name, code string) (*Document, error) {
	if !ValidName(name) {
		return nil, ErrBadName
	}
	if err := s.Check(ctx, code); err != nil {
		return nil, err
	}
	return s.repo.Get(ctx, name)
}

// Check is nil for a live access code and ErrBadCode otherwise.
func (s *Service) Check(ctx context.Context, code string) error {
	if len(NormalizeCode(code)) != CodeLength {
		return ErrBadCode
	}
	ok, err := s.repo.CodeValid(ctx, HashCode(code))
	if err != nil {
		return err
	}
	if !ok {
		return ErrBadCode
	}
	return nil
}

// CreateCode makes a code for the coach `by`. The value is in the response only; the table keeps its hash.
func (s *Service) CreateCode(ctx context.Context, by uuid.UUID) (*NewCodeResponse, error) {
	value, err := s.newCode()
	if err != nil {
		return nil, err
	}
	code, err := s.repo.InsertCode(ctx, HashCode(value), by, s.now().Add(CodeTTL))
	if err != nil {
		return nil, err
	}
	return &NewCodeResponse{Code: *code, Value: value}, nil
}

func (s *Service) ListCodes(ctx context.Context, by uuid.UUID) ([]Code, error) {
	return s.repo.ListCodes(ctx, by)
}

func (s *Service) RevokeCode(ctx context.Context, by, id uuid.UUID) error {
	return s.repo.RevokeCode(ctx, by, id)
}
