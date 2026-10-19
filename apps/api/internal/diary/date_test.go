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
