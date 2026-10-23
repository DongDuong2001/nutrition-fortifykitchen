package courses

import (
	"bytes"
	"strings"
	"unicode/utf8"
)

// Decide is who may open a course. A coach or an admin always may; open is open; a Level course opens at that Level or above; a code
// course opens for someone who used one of its live codes (codeUnlocked, worked out by the repository: the code is not revoked or
// lapsed). The list of courses never asks: only opening does.
func Decide(v Viewer, c Course, codeUnlocked bool) Lock {
	if v.IsStaff() {
		return LockNone
	}
	switch c.Access {
	case AccessOpen:
		return LockNone
	case AccessLevel:
		if c.MinLevel != nil && v.Level >= *c.MinLevel {
			return LockNone
		}
		return LockLevel
	default:
		if codeUnlocked {
			return LockNone
		}
		return LockCode
	}
}

func lockedError(c Course, lock Lock) error {
	e := &LockedError{Lock: lock}
	if c.MinLevel != nil {
		e.MinLevel = *c.MinLevel
	}
	return e
}

// ValidTitle: 1 to 100 characters once trimmed.
func ValidTitle(field, title string) (string, error) {
	t := strings.TrimSpace(title)
	if n := utf8.RuneCountInString(t); n < 1 || n > MaxTitleLen {
		return "", &FieldError{Field: field, Msg: "1 to 100 characters"}
	}
	return t, nil
}

// CheckAccess validates an access setting and its Level: a level course has a Level from 1 to 5, the others none.
func CheckAccess(access Access, minLevel *int) (*int, error) {
	switch access {
	case AccessOpen, AccessCode:
		return nil, nil
	case AccessLevel:
		if minLevel == nil || *minLevel < 1 || *minLevel > MaxLevel {
			return nil, &FieldError{Field: "minLevel", Msg: "a Level from 1 to 5"}
		}
		return minLevel, nil
	}
	return nil, &FieldError{Field: "access", Msg: "open, code or level"}
}

func checkTone(tone int) error {
	if tone < 0 || tone >= ToneCount {
		return &FieldError{Field: "tone", Msg: "0 to 7"}
	}
	return nil
}

// IsWebP: a RIFF container that says WEBP. Anything else is not a page image, so nothing but images is ever written to the disk.
func IsWebP(b []byte) bool {
	return len(b) >= 12 && bytes.Equal(b[0:4], []byte("RIFF")) && bytes.Equal(b[8:12], []byte("WEBP"))
}

// ReadMinutes: how long a text lesson takes to read, 180 words a minute, at least one minute (0 for empty text).
func ReadMinutes(markdown string) int {
	words := len(strings.Fields(markdown))
	if words == 0 {
		return 0
	}
	m := (words + 179) / 180
	if m > 600 {
		m = 600
	}
	return m
}
