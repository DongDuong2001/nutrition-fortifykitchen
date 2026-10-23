package documents

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Tài liệu (migration 000017): the app's documents and rules, markdown text by file name. Every signed-in user reads them;
// a write needs an access code that a coach (or an admin) made with POST /document-codes. A code is 10 symbols from a
// 32-symbol alphabet (50 bits, the coach join code's format); only its SHA-256 is stored, and it lapses after CodeTTL.
// Guessing one is bounded by the per-user write limit (60 a minute): 2^49 tries on average is out of reach.

const (
	MaxContentBytes = 1_000_000
	CodeLength      = 10
	CodeTTL         = 30 * 24 * time.Hour
)

// The coach join code's alphabet (web lib/mock-coach-server): no 0, O, 1 or I, and 256 / 32 maps a byte to a symbol with no bias.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

var (
	ErrBadName  = errors.New("invalid document name")
	ErrTooLarge = errors.New("document larger than 1 MB")
	ErrNotFound = errors.New("document not found")
	ErrBadCode  = errors.New("access code is wrong, expired or revoked")
	// ErrChanged: someone saved the document after the editor loaded it.
	ErrChanged = errors.New("document changed since it was loaded")

	// One object name: letters, digits, "_", "-" and ".", no leading dot, no "..", at most 100 characters (web lib/documents isDocumentName).
	nameRe = regexp.MustCompile(`^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$`)
)

func ValidName(name string) bool {
	return nameRe.MatchString(name) && !strings.Contains(name, "..")
}

// NormalizeCode is how a typed code is compared: any case, spaces and dashes around or inside ignored.
func NormalizeCode(code string) string {
	return strings.ToUpper(strings.NewReplacer(" ", "", "-", "").Replace(strings.TrimSpace(code)))
}

// HashCode is what the table keeps for a code.
func HashCode(code string) string {
	sum := sha256.Sum256([]byte(NormalizeCode(code)))
	return hex.EncodeToString(sum[:])
}

// NewCode is a fresh random code. An error means no secure random source: a guessable code is worse than none.
func NewCode() (string, error) {
	b := make([]byte, CodeLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, CodeLength)
	for i, v := range b {
		out[i] = codeAlphabet[int(v)%len(codeAlphabet)]
	}
	return string(out), nil
}

type Meta struct {
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Document struct {
	Meta
	Content string `json:"content"`
}

type PutRequest struct {
	Content string `json:"content"`
	Code    string `json:"code"`
	// BaseUpdatedAt is the updatedAt the editor loaded. Set, the write only lands on that version (else ErrChanged);
	// left out, it creates or replaces (an upload).
	BaseUpdatedAt *time.Time `json:"baseUpdatedAt"`
}

type CheckRequest struct {
	Code string `json:"code"`
}

// Code is one access code as its coach sees it in the list; the code itself is shown only once, when it is made.
type Code struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type NewCodeResponse struct {
	Code
	Value string `json:"code"`
}

type Repository interface {
	List(ctx context.Context) ([]Meta, error)
	// Get returns ErrNotFound when there is no document by that name.
	Get(ctx context.Context, name string) (*Document, error)
	// Upsert writes the document; with base set, only over that version (ErrChanged otherwise, ErrNotFound when it is gone).
	Upsert(ctx context.Context, name, content string, by uuid.UUID, base *time.Time) (*Meta, error)
	// CodeValid: a live code (not revoked, not expired) has this hash.
	CodeValid(ctx context.Context, hash string) (bool, error)
	InsertCode(ctx context.Context, hash string, by uuid.UUID, expiresAt time.Time) (*Code, error)
	// ListCodes: the creator's live codes, newest first.
	ListCodes(ctx context.Context, by uuid.UUID) ([]Code, error)
	// RevokeCode revokes the creator's code; one that is gone, or someone else's, is not an error.
	RevokeCode(ctx context.Context, by, id uuid.UUID) error
}
