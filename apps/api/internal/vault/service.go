package vault

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CoachDraft struct {
	ID              uuid.UUID       `json:"id"`
	FilePath        string          `json:"file_path"`
	MarkdownContent string          `json:"markdown_content"`
	ParsedData      json.RawMessage `json:"parsed_data,omitempty"`
	Status          string          `json:"status"` // 'draft', 'published', 'rejected'
	CommitHash      string          `json:"commit_hash"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type GitHubWebhookPayload struct {
	Ref        string `json:"ref"`
	After      string `json:"after"` // Commit hash
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	Commits []struct {
		ID       string   `json:"id"`
		Added    []string `json:"added"`
		Modified []string `json:"modified"`
		Removed  []string `json:"removed"`
	} `json:"commits"`
}

type Service interface {
	VerifyGitHubSignature(signatureHeader string, body []byte) bool
	ProcessGitHubPush(ctx context.Context, payload GitHubWebhookPayload) error
	ListDrafts(ctx context.Context, status string) ([]CoachDraft, error)
	UpdateDraftStatus(ctx context.Context, id uuid.UUID, newStatus string) (*CoachDraft, error)
}

type vaultService struct {
	pool       *pgxpool.Pool
	httpClient *http.Client
}

func NewService(pool *pgxpool.Pool) Service {
	return &vaultService{
		pool: pool,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (s *vaultService) VerifyGitHubSignature(signatureHeader string, body []byte) bool {
	secret := os.Getenv("GITHUB_VAULT_WEBHOOK_SECRET")
	if secret == "" {
		if strings.EqualFold(os.Getenv("ENVIRONMENT"), "production") {
			return false
		}
		return true // Allow in dev if not set
	}
	if !strings.HasPrefix(signatureHeader, "sha256=") {
		return false
	}
	actualSig := strings.TrimPrefix(signatureHeader, "sha256=")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(actualSig), []byte(expectedSig))
}

func (s *vaultService) ProcessGitHubPush(ctx context.Context, payload GitHubWebhookPayload) error {
	pat := os.Getenv("GITHUB_VAULT_PAT")
	repo := payload.Repository.FullName
	commitHash := payload.After

	for _, commit := range payload.Commits {
		allFiles := append(commit.Added, commit.Modified...)
		for _, file := range allFiles {
			if !strings.HasSuffix(file, ".md") {
				continue
			}

			content, err := s.fetchRawGitHubFile(ctx, repo, commitHash, file, pat)
			if err != nil {
				// Log and continue to next file
				continue
			}

			draft := &CoachDraft{
				ID:              uuid.New(),
				FilePath:        file,
				MarkdownContent: content,
				Status:          "draft",
				CommitHash:      commitHash,
			}

			if err := s.saveDraft(ctx, draft); err != nil {
				return fmt.Errorf("failed to save draft for %s: %w", file, err)
			}
		}
	}

	return nil
}

func (s *vaultService) fetchRawGitHubFile(ctx context.Context, repo, ref, path, pat string) (string, error) {
	url := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s", repo, ref, path)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	if pat != "" {
		req.Header.Set("Authorization", "Bearer "+pat)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github returned HTTP %d", resp.StatusCode)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *vaultService) saveDraft(ctx context.Context, draft *CoachDraft) error {
	var existingID uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM nutrition.coach_drafts WHERE file_path = $1 ORDER BY updated_at DESC LIMIT 1", draft.FilePath).Scan(&existingID)
	if err == nil {
		query := `
			UPDATE nutrition.coach_drafts
			SET markdown_content = $1, status = $2, commit_hash = $3, updated_at = NOW()
			WHERE id = $4
		`
		_, updateErr := s.pool.Exec(ctx, query, draft.MarkdownContent, draft.Status, draft.CommitHash, existingID)
		return updateErr
	}

	query := `
		INSERT INTO nutrition.coach_drafts (id, file_path, markdown_content, parsed_data, status, commit_hash, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, insertErr := s.pool.Exec(ctx, query, draft.ID, draft.FilePath, draft.MarkdownContent, draft.ParsedData, draft.Status, draft.CommitHash)
	return insertErr
}

func (s *vaultService) ListDrafts(ctx context.Context, status string) ([]CoachDraft, error) {
	query := `
		SELECT id, file_path, markdown_content, parsed_data, status, commit_hash, updated_at
		FROM nutrition.coach_drafts
		WHERE ($1::text = '' OR status = $1::text)
		ORDER BY updated_at DESC
	`
	rows, err := s.pool.Query(ctx, query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drafts []CoachDraft
	for rows.Next() {
		var d CoachDraft
		if err := rows.Scan(&d.ID, &d.FilePath, &d.MarkdownContent, &d.ParsedData, &d.Status, &d.CommitHash, &d.UpdatedAt); err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, nil
}

func (s *vaultService) UpdateDraftStatus(ctx context.Context, id uuid.UUID, newStatus string) (*CoachDraft, error) {
	if newStatus != "draft" && newStatus != "published" && newStatus != "rejected" {
		return nil, errors.New("invalid status: must be draft, published, or rejected")
	}

	query := `
		UPDATE nutrition.coach_drafts
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, file_path, markdown_content, parsed_data, status, commit_hash, updated_at
	`
	var d CoachDraft
	err := s.pool.QueryRow(ctx, query, newStatus, id).Scan(
		&d.ID, &d.FilePath, &d.MarkdownContent, &d.ParsedData, &d.Status, &d.CommitHash, &d.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update draft status: %w", err)
	}

	return &d, nil
}
