package courses

import (
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func intp(n int) *int { return &n }

func course(access Access, level *int) Course {
	return Course{ID: uuid.New(), Title: "Khoá", Access: access, MinLevel: level}
}

// Who may open a course: every rule of the brief.
func TestDecide(t *testing.T) {
	user := func(level int) Viewer { return Viewer{ID: uuid.New(), Role: "user", Level: level} }
	cases := []struct {
		name         string
		viewer       Viewer
		course       Course
		codeUnlocked bool
		want         Lock
	}{
		{"open: a signed-in user", user(0), course(AccessOpen, nil), false, LockNone},
		{"code: no code used", user(5), course(AccessCode, nil), false, LockCode},
		{"code: a live code was used", user(0), course(AccessCode, nil), true, LockNone},
		{"level 3: Level 2 is below", user(2), course(AccessLevel, intp(3)), false, LockLevel},
		{"level 3: Level 3 is at", user(3), course(AccessLevel, intp(3)), false, LockNone},
		{"level 3: Level 5 is above", user(5), course(AccessLevel, intp(3)), false, LockNone},
		{"level: a code never opens a level course", user(1), course(AccessLevel, intp(3)), true, LockLevel},
		{"coach sees a code course", Viewer{Role: "coach"}, course(AccessCode, nil), false, LockNone},
		{"admin sees a level course", Viewer{Role: "admin"}, course(AccessLevel, intp(5)), false, LockNone},
		{"level course with no Level set stays shut", user(5), course(AccessLevel, nil), false, LockLevel},
		{"an unknown role is a user", Viewer{Role: "visitor", Level: 0}, course(AccessCode, nil), false, LockCode},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Decide(tc.viewer, tc.course, tc.codeUnlocked); got != tc.want {
				t.Fatalf("Decide = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestLockedErrorCarriesTheReason(t *testing.T) {
	err := lockedError(course(AccessLevel, intp(3)), LockLevel)
	var locked *LockedError
	if !errors.As(err, &locked) || locked.Lock != LockLevel || locked.MinLevel != 3 || !errors.Is(err, ErrLocked) {
		t.Fatalf("got %#v", err)
	}
}

func TestCheckAccess(t *testing.T) {
	if lvl, err := CheckAccess(AccessLevel, intp(2)); err != nil || *lvl != 2 {
		t.Fatalf("level 2: %v %v", lvl, err)
	}
	for _, bad := range []*int{nil, intp(0), intp(6), intp(-1)} {
		if _, err := CheckAccess(AccessLevel, bad); !errors.Is(err, ErrInvalid) {
			t.Errorf("level %v should be refused, got %v", bad, err)
		}
	}
	// Open and code carry no Level: one that was sent is dropped
	for _, a := range []Access{AccessOpen, AccessCode} {
		if lvl, err := CheckAccess(a, intp(3)); err != nil || lvl != nil {
			t.Errorf("%s: %v %v", a, lvl, err)
		}
	}
	if _, err := CheckAccess("secret", nil); !errors.Is(err, ErrInvalid) {
		t.Errorf("unknown access: %v", err)
	}
}

func TestValidTitle(t *testing.T) {
	if got, err := ValidTitle("title", "  Nhập môn  "); err != nil || got != "Nhập môn" {
		t.Fatalf("%q %v", got, err)
	}
	if _, err := ValidTitle("title", "   "); !errors.Is(err, ErrInvalid) {
		t.Error("blank")
	}
	if _, err := ValidTitle("title", strings.Repeat("ạ", 101)); !errors.Is(err, ErrInvalid) {
		t.Error("101 characters (counted as characters, not bytes)")
	}
	if _, err := ValidTitle("title", strings.Repeat("ạ", 100)); err != nil {
		t.Errorf("100 characters: %v", err)
	}
}

func TestIsWebP(t *testing.T) {
	good := append([]byte("RIFF\x10\x00\x00\x00WEBPVP8 "), make([]byte, 8)...)
	if !IsWebP(good) {
		t.Error("a WebP header")
	}
	for name, b := range map[string][]byte{"png": []byte("\x89PNG\r\n\x1a\n0000"), "pdf": []byte("%PDF-1.7 0000000"), "empty": nil, "short": []byte("RIFF"), "riff wav": []byte("RIFF\x10\x00\x00\x00WAVEfmt ")} {
		if IsWebP(b) {
			t.Errorf("%s must not pass", name)
		}
	}
}

func TestReadMinutes(t *testing.T) {
	for _, tc := range []struct {
		words int
		want  int
	}{{0, 0}, {1, 1}, {180, 1}, {181, 2}, {900, 5}} {
		if got := ReadMinutes(strings.Repeat("từ ", tc.words)); got != tc.want {
			t.Errorf("%d words: %d, want %d", tc.words, got, tc.want)
		}
	}
}
