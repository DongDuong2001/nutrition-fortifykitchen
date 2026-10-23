package documents

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

type fakeRepo struct {
	docs  map[string]string
	codes map[string]time.Time // hash → expiry
	now   time.Time
	// version is each document's updatedAt, as the SQL compares it
	version map[string]time.Time
}

func newFake(now time.Time) *fakeRepo {
	return &fakeRepo{docs: map[string]string{}, codes: map[string]time.Time{}, now: now, version: map[string]time.Time{}}
}

func (f *fakeRepo) List(context.Context) ([]Meta, error) { return nil, nil }
func (f *fakeRepo) Get(_ context.Context, name string) (*Document, error) {
	c, ok := f.docs[name]
	if !ok {
		return nil, ErrNotFound
	}
	return &Document{Meta: Meta{Name: name}, Content: c}, nil
}
func (f *fakeRepo) Upsert(_ context.Context, name, content string, _ uuid.UUID, base *time.Time) (*Meta, error) {
	if v, ok := f.version[name]; base != nil && (!ok || !v.Equal(*base)) {
		if ok {
			return nil, ErrChanged
		}
		return nil, ErrNotFound
	}
	f.docs[name] = content
	f.version[name] = f.version[name].Add(time.Second)
	return &Meta{Name: name, UpdatedAt: f.version[name]}, nil
}
func (f *fakeRepo) CodeValid(_ context.Context, hash string) (bool, error) {
	exp, ok := f.codes[hash]
	return ok && exp.After(f.now), nil
}
func (f *fakeRepo) InsertCode(_ context.Context, hash string, _ uuid.UUID, exp time.Time) (*Code, error) {
	f.codes[hash] = exp
	return &Code{ID: uuid.New(), ExpiresAt: exp}, nil
}
func (f *fakeRepo) ListCodes(context.Context, uuid.UUID) ([]Code, error)   { return nil, nil }
func (f *fakeRepo) RevokeCode(context.Context, uuid.UUID, uuid.UUID) error { return nil }

var t0 = time.Date(2026, 10, 23, 10, 0, 0, 0, time.UTC)

func TestValidName(t *testing.T) {
	for _, n := range []string{"AGENTS.md", "03-srs.md", "rules", "a_b-c.v2.txt", strings.Repeat("x", 100)} {
		if !ValidName(n) {
			t.Errorf("%q should be valid", n)
		}
	}
	for _, n := range []string{"", ".env", "..", "a/b.md", `a\b.md`, "a..b", "tên.md", "a b.md", strings.Repeat("x", 101)} {
		if ValidName(n) {
			t.Errorf("%q should be invalid", n)
		}
	}
}

func TestNewCode_FormatAndSpread(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 200; i++ {
		c, err := NewCode()
		if err != nil {
			t.Fatal(err)
		}
		if len(c) != CodeLength || strings.Trim(c, codeAlphabet) != "" {
			t.Fatalf("bad code %q", c)
		}
		if seen[c] {
			t.Fatalf("repeated code %q", c)
		}
		seen[c] = true
	}
}

func TestCreatedCodeUnlocksWrites_AnyCaseAndSpacing(t *testing.T) {
	repo := newFake(t0)
	s := NewService(repo)
	s.now = func() time.Time { return t0 }
	s.newCode = func() (string, error) { return "ABCDEFGH23", nil }
	coach, user := uuid.New(), uuid.New()

	made, err := s.CreateCode(context.Background(), coach)
	if err != nil {
		t.Fatal(err)
	}
	if made.Value != "ABCDEFGH23" || !made.ExpiresAt.Equal(t0.Add(CodeTTL)) {
		t.Fatalf("got %+v", made)
	}
	if _, stored := repo.codes["ABCDEFGH23"]; stored {
		t.Fatal("the code itself must not be stored, only its hash")
	}

	if err := s.Check(context.Background(), " abcd-efgh 23 "); err != nil {
		t.Fatalf("typed with spaces, a dash and lower case: %v", err)
	}
	if _, err := s.Put(context.Background(), user, "rules.md", PutRequest{Content: "# Quy tắc", Code: "abcdefgh23"}); err != nil {
		t.Fatal(err)
	}
	if repo.docs["rules.md"] != "# Quy tắc" {
		t.Fatal("document not written")
	}
}

func TestPut_Refusals(t *testing.T) {
	repo := newFake(t0)
	repo.codes[HashCode("ABCDEFGH23")] = t0.Add(time.Hour)
	repo.codes[HashCode("EXPIRED234")] = t0.Add(-time.Second)
	s := NewService(repo)
	ctx, user := context.Background(), uuid.New()

	cases := []struct {
		name string
		req  PutRequest
		want error
	}{
		{"../x", PutRequest{Content: "x", Code: "ABCDEFGH23"}, ErrBadName},
		{"big.md", PutRequest{Content: strings.Repeat("x", MaxContentBytes+1), Code: "ABCDEFGH23"}, ErrTooLarge},
		{"a.md", PutRequest{Content: "x", Code: "WRONGCODE2"}, ErrBadCode},
		{"a.md", PutRequest{Content: "x", Code: "EXPIRED234"}, ErrBadCode},
		{"a.md", PutRequest{Content: "x", Code: ""}, ErrBadCode},
	}
	for _, c := range cases {
		if _, err := s.Put(ctx, user, c.name, c.req); !errors.Is(err, c.want) {
			t.Errorf("%s with %q: got %v, want %v", c.name, c.req.Code, err, c.want)
		}
	}
	if len(repo.docs) != 0 {
		t.Fatalf("nothing should be written, got %v", repo.docs)
	}
}

func TestPut_EditOverAReplacedVersionIsRefused(t *testing.T) {
	repo := newFake(t0)
	repo.codes[HashCode("ABCDEFGH23")] = t0.Add(time.Hour)
	s := NewService(repo)
	ctx, user := context.Background(), uuid.New()

	first, err := s.Put(ctx, user, "rules.md", PutRequest{Content: "v1", Code: "ABCDEFGH23"})
	if err != nil {
		t.Fatal(err)
	}
	loaded := first.UpdatedAt
	if _, err := s.Put(ctx, user, "rules.md", PutRequest{Content: "v2", Code: "ABCDEFGH23"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Put(ctx, user, "rules.md", PutRequest{Content: "mine", Code: "ABCDEFGH23", BaseUpdatedAt: &loaded}); !errors.Is(err, ErrChanged) {
		t.Fatalf("got %v, want ErrChanged", err)
	}
	if repo.docs["rules.md"] != "v2" {
		t.Fatalf("the other save must stand, got %q", repo.docs["rules.md"])
	}
	if _, err := s.Put(ctx, user, "gone.md", PutRequest{Content: "x", Code: "ABCDEFGH23", BaseUpdatedAt: &loaded}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("an edit of a document that is gone: got %v, want ErrNotFound", err)
	}
}
