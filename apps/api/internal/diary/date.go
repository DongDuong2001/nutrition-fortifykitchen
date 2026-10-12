package diary

import (
	"errors"
	"time"
)

var (
	ErrPastDayReadOnly = errors.New("writes to past dates are not permitted")
	ErrInvalidDateFormat = errors.New("date must be in YYYY-MM-DD format")
)

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

// ValidateDateWritable checks if targetDate is today or future in Asia/Ho_Chi_Minh.
// Past days return ErrPastDayReadOnly.
func ValidateDateWritable(targetDate string) error {
	today := GetServerToday()
	if targetDate < today {
		return ErrPastDayReadOnly
	}
	return nil
}
