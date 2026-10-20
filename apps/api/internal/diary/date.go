package diary

import (
	"context"
	"errors"
	"time"
)

const (
	// EditablePastDays is how many days before the day a write was made stay editable (today and yesterday).
	EditablePastDays = 1
	// MaxMadeAtAge is how old a device-stamped write may be before the server refuses it for good.
	MaxMadeAtAge = 14 * 24 * time.Hour
	// MaxMadeAtSkew is how far ahead of the server clock a made_at stamp may be (phone clock drift).
	MaxMadeAtSkew = 5 * time.Minute
)

var (
	ErrPastDayReadOnly   = errors.New("writes to past dates are not permitted")
	ErrInvalidDateFormat = errors.New("date must be in YYYY-MM-DD format")
	ErrInvalidMadeAt     = errors.New("made_at must be an RFC3339 timestamp")
)

// nowFunc is the server clock; tests replace it.
var nowFunc = time.Now

type madeAtKey struct{}

// WithMadeAt carries the moment the user made a write on their device down to the date rule.
func WithMadeAt(ctx context.Context, madeAt time.Time) context.Context {
	return context.WithValue(ctx, madeAtKey{}, madeAt)
}

func madeAtFrom(ctx context.Context) *time.Time {
	if t, ok := ctx.Value(madeAtKey{}).(time.Time); ok {
		return &t
	}
	return nil
}

// ParseMadeAt reads an optional RFC3339 made_at; empty means "not sent".
func ParseMadeAt(raw string) (*time.Time, error) {
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, ErrInvalidMadeAt
	}
	return &t, nil
}

var hoChiMinhLocation *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		// Fallback to FixedZone (+07:00) if tzdata is not available on host
		loc = time.FixedZone("ICT", 7*3600)
	}
	hoChiMinhLocation = loc
}

// GetServerToday returns today's date in Asia/Ho_Chi_Minh as "YYYY-MM-DD"
func GetServerToday() string {
	return time.Now().In(hoChiMinhLocation).Format("2006-01-02")
}

// GetServerYesterday returns yesterday's date in Asia/Ho_Chi_Minh as "YYYY-MM-DD"
func GetServerYesterday() string {
	return time.Now().In(hoChiMinhLocation).AddDate(0, 0, -1).Format("2006-01-02")
}

// ValidateDateWritable checks targetDate against the server clock: today, yesterday and the future
// are writable in Asia/Ho_Chi_Minh; days before yesterday return ErrPastDayReadOnly.
func ValidateDateWritable(targetDate string) error {
	return validateWritableAt(targetDate, nil, nowFunc())
}

// ValidateDateWritableCtx is the rule for a write carried by ctx. A write is judged by when the user
// made it (made_at on the device), not when it reached the server, so food logged offline is kept.
func ValidateDateWritableCtx(ctx context.Context, targetDate string) error {
	return validateWritableAt(targetDate, madeAtFrom(ctx), nowFunc())
}

func validateWritableAt(targetDate string, madeAt *time.Time, now time.Time) error {
	if madeAt == nil {
		floor := now.In(hoChiMinhLocation).AddDate(0, 0, -EditablePastDays).Format("2006-01-02")
		if targetDate < floor {
			return ErrPastDayReadOnly
		}
		return nil
	}
	if madeAt.After(now.Add(MaxMadeAtSkew)) || now.Sub(*madeAt) > MaxMadeAtAge {
		return ErrPastDayReadOnly
	}
	floor := madeAt.In(hoChiMinhLocation).AddDate(0, 0, -EditablePastDays).Format("2006-01-02")
	if targetDate < floor {
		return ErrPastDayReadOnly
	}
	return nil
}
