package trends

import (
	"context"
	"math"
	"time"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

type TrendDayTotals struct {
	Date       string              `json:"date"`
	Logged     bool                `json:"logged"`
	Calories   *float64            `json:"calories"`
	Protein    *float64            `json:"protein"`
	Carbs      *float64            `json:"carbs"`
	Fat        *float64            `json:"fat"`
	Fiber      *float64            `json:"fiber"`
	Nutrients  map[string]*float64 `json:"nutrients"`
}

type PeriodAverages struct {
	LoggedDays int                 `json:"logged_days"`
	Calories   *float64            `json:"calories"`
	Protein    *float64            `json:"protein"`
	Carbs      *float64            `json:"carbs"`
	Fat        *float64            `json:"fat"`
	Fiber      *float64            `json:"fiber"`
	Nutrients  map[string]*float64 `json:"nutrients"`
}

type TrendsResponse struct {
	Days          int             `json:"days"`
	Offset        int             `json:"offset"`
	StartDate     string          `json:"start_date"`
	EndDate       string          `json:"end_date"`
	Averages      PeriodAverages  `json:"averages"`
	DaysOnTarget  map[string]int  `json:"days_on_target"`
	MacroSharePct map[string]float64 `json:"macro_share_pct"`
	Streak        int             `json:"streak"`
}

type Repository interface {
	GetHistoryDays(ctx context.Context, userID uuid.UUID, startDate string, endDate string) ([]TrendDayTotals, error)
	GetUserTargets(ctx context.Context, userID uuid.UUID) (*targets.CompleteTargets, error)
}

type Service interface {
	GetTrends(ctx context.Context, userID uuid.UUID, days int, offset int) (*TrendsResponse, error)
}

type trendsServiceImpl struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &trendsServiceImpl{repo: repo}
}

func averageOf(values []*float64) *float64 {
	var sum float64
	count := 0
	for _, v := range values {
		if v != nil {
			sum += *v
			count++
		}
	}
	if count == 0 {
		return nil
	}
	avg := math.Round((sum/float64(count))*10) / 10
	return &avg
}

func (s *trendsServiceImpl) GetTrends(ctx context.Context, userID uuid.UUID, days int, offset int) (*TrendsResponse, error) {
	if days != 30 {
		days = 7
	}
	if offset < 0 {
		offset = 0
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	now := time.Now().In(loc)

	// end date = now - offset * days
	endT := now.AddDate(0, 0, -offset*days)
	startT := endT.AddDate(0, 0, -(days - 1))

	startDate := startT.Format("2006-01-02")
	endDate := endT.Format("2006-01-02")
	todayIso := now.Format("2006-01-02")

	dayList, err := s.repo.GetHistoryDays(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	userTargets, _ := s.repo.GetUserTargets(ctx, userID)

	// Filter finished logged days (exclude today as today is in progress)
	var finishedLogged []TrendDayTotals
	for _, d := range dayList {
		if d.Logged && d.Date < todayIso {
			finishedLogged = append(finishedLogged, d)
		}
	}

	var cals, pros, carbs, fats, fibers []*float64
	for _, d := range finishedLogged {
		cals = append(cals, d.Calories)
		pros = append(pros, d.Protein)
		carbs = append(carbs, d.Carbs)
		fats = append(fats, d.Fat)
		fibers = append(fibers, d.Fiber)
	}

	avgCal := averageOf(cals)
	avgPro := averageOf(pros)
	avgCarb := averageOf(carbs)
	avgFat := averageOf(fats)
	avgFiber := averageOf(fibers)

	// Macro composition (% of kcal)
	macroShare := make(map[string]float64)
	if avgCal != nil && *avgCal > 0 {
		if avgPro != nil {
			macroShare["protein"] = math.Round((*avgPro * 4 / *avgCal) * 100)
		}
		if avgCarb != nil {
			macroShare["carbs"] = math.Round((*avgCarb * 4 / *avgCal) * 100)
		}
		if avgFat != nil {
			macroShare["fat"] = math.Round((*avgFat * 9 / *avgCal) * 100)
		}
	}

	// Days on target
	daysOnTarget := make(map[string]int)
	if userTargets != nil {
		for _, d := range finishedLogged {
			if d.Calories != nil && *d.Calories >= userTargets.Calories.Min {
				daysOnTarget["calories"]++
			}
			if d.Protein != nil && *d.Protein >= userTargets.Protein.Min {
				daysOnTarget["protein"]++
			}
			if d.Fiber != nil && *d.Fiber >= userTargets.Fiber.Min {
				daysOnTarget["fiber"]++
			}
		}
	}

	// Streak calculation (consecutive logged days up to yesterday)
	streak := 0
	for i := len(dayList) - 1; i >= 0; i-- {
		d := dayList[i]
		if d.Date >= todayIso {
			continue
		}
		if d.Logged {
			streak++
		} else {
			break
		}
	}

	return &TrendsResponse{
		Days:      days,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
		Averages: PeriodAverages{
			LoggedDays: len(finishedLogged),
			Calories:   avgCal,
			Protein:    avgPro,
			Carbs:      avgCarb,
			Fat:        avgFat,
			Fiber:      avgFiber,
			Nutrients:  make(map[string]*float64),
		},
		DaysOnTarget:  daysOnTarget,
		MacroSharePct: macroShare,
		Streak:        streak,
	}, nil
}
