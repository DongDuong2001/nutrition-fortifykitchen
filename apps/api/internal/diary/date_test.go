package diary

import (
	"errors"
	"testing"
	"time"
)

func TestDateWritableRules(t *testing.T) {
	today := GetServerToday()
	yesterday := GetServerYesterday()

	if err := ValidateDateWritable(today); err != nil {
		t.Errorf("today should be writable, got: %v", err)
	}

	if err := ValidateDateWritable(yesterday); err != nil {
		t.Errorf("yesterday should be writable, got: %v", err)
	}

	twoDaysAgo := time.Now().In(hoChiMinhLocation).AddDate(0, 0, -2).Format("2006-01-02")
	if err := ValidateDateWritable(twoDaysAgo); !errors.Is(err, ErrPastDayReadOnly) {
		t.Errorf("two days ago should be read-only, got: %v", err)
	}

	tomorrow := time.Now().In(hoChiMinhLocation).AddDate(0, 0, 1).Format("2006-01-02")
	if err := ValidateDateWritable(tomorrow); err != nil {
		t.Errorf("tomorrow should be writable, got: %v", err)
	}
}

func TestValidateWritableAtMadeAt(t *testing.T) {
	ict := time.FixedZone("ICT", 7*3600)
	at := func(day, hh, mm int, month time.Month) time.Time {
		return time.Date(2026, month, day, hh, mm, 0, 0, ict)
	}
	now := at(20, 10, 0, time.October)
	d := func(t time.Time) *time.Time { return &t }

	cases := []struct {
		name    string
		date    string
		madeAt  *time.Time
		now     time.Time
		wantErr bool
	}{
		{"offline write made 19/10 23:50 for 19/10 arriving 21/10", "2026-10-19", d(at(19, 23, 50, time.October)), at(21, 9, 0, time.October), false},
		{"made 17/10 for 17/10 arriving 20/10 (inside 14 days)", "2026-10-17", d(at(17, 12, 0, time.October)), now, false},
		{"made 15 days ago", "2026-10-05", d(now.AddDate(0, 0, -15)), now, true},
		{"made_at in the future", "2026-10-20", d(now.Add(10 * time.Minute)), now, true},
		{"made_at a little ahead (clock drift) is fine", "2026-10-20", d(now.Add(3 * time.Minute)), now, false},
		{"no made_at, 2 days back", "2026-10-18", nil, now, true},
		{"no made_at, yesterday", "2026-10-19", nil, now, false},
		{"made_at 17/10, entry 2 days before that is locked", "2026-10-15", d(at(17, 12, 0, time.October)), now, true},
		{"made_at day is judged in Ho Chi Minh time (00:30 on the 20th there, still the 19th in UTC)", "2026-10-18", d(time.Date(2026, 10, 19, 17, 30, 0, 0, time.UTC)), now, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateWritableAt(c.date, c.madeAt, c.now)
			if c.wantErr && !errors.Is(err, ErrPastDayReadOnly) {
				t.Fatalf("want ErrPastDayReadOnly, got %v", err)
			}
			if !c.wantErr && err != nil {
				t.Fatalf("want writable, got %v", err)
			}
		})
	}
}

func TestParseMadeAt(t *testing.T) {
	if got, err := ParseMadeAt(""); got != nil || err != nil {
		t.Fatalf("empty must be absent, got %v %v", got, err)
	}
	if _, err := ParseMadeAt("yesterday"); !errors.Is(err, ErrInvalidMadeAt) {
		t.Fatalf("want ErrInvalidMadeAt, got %v", err)
	}
	if got, err := ParseMadeAt("2026-10-19T23:50:00+07:00"); err != nil || got == nil {
		t.Fatalf("valid RFC3339 rejected: %v", err)
	}
}
