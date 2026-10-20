package diary

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

var (
	ErrEntryNotFound          = errors.New("diary entry not found")
	ErrRestoreWindowExpired   = errors.New("restore window expired (must be within 10 seconds)")
	ErrInvalidTrainingMinutes = errors.New("training_minutes must be one of: 0, 45, 60, 90, 120, 240")
	ErrFoodIDRequired         = errors.New("food_id is required for food entry")
	ErrIDConflict             = errors.New("entry id conflict")
	ErrInvalidDateRange       = errors.New("fromDate must be before or equal to toDate")
	ErrRangeTooLarge          = errors.New("date range exceeds maximum of 100 days")
	ErrFoodNameTooLong        = errors.New("tên món không được vượt quá 80 ký tự")
)

// sanitizeFoodName strips control characters, trims leading/trailing spaces, and enforces a max of 80 runes.
func sanitizeFoodName(name string) (string, error) {
	var b strings.Builder
	b.Grow(len(name))
	for _, r := range name {
		if !unicode.IsControl(r) {
			b.WriteRune(r)
		}
	}
	trimmed := strings.TrimSpace(b.String())
	if utf8.RuneCountInString(trimmed) > 80 {
		return "", ErrFoodNameTooLong
	}
	return trimmed, nil
}

type RecentsTracker interface {
	UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error
}

type Service interface {
	GetDay(ctx context.Context, userID uuid.UUID, date string) (*DaySummaryResponse, error)
	GetDaysRange(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]*DaySummaryResponse, error)
	CreateEntry(ctx context.Context, userID uuid.UUID, date string, req CreateEntryRequest) (*DiaryEntryItem, map[string]*float64, error)
	UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, req UpdateEntryRequest) (*DiaryEntryItem, map[string]*float64, error)
	RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, map[string]*float64, error)
	DeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error
	CopyYesterday(ctx context.Context, userID uuid.UUID, targetDate string, req CopyYesterdayRequest) (*CopyYesterdayResponse, error)
	DeleteMeal(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error
	SetTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) (*SetTrainingResponse, error)
}

type diaryServiceImpl struct {
	repo    Repository
	recents RecentsTracker
}

func NewService(repo Repository, recents ...RecentsTracker) Service {
	var r RecentsTracker
	if len(recents) > 0 {
		r = recents[0]
	}
	return &diaryServiceImpl{repo: repo, recents: r}
}

var mealSlotOrder = []struct {
	slot   string
	nameVi string
}{
	{"breakfast", "Bữa sáng"},
	{"lunch", "Bữa trưa"},
	{"dinner", "Bữa tối"},
	{"snack", "Bữa phụ"},
	{"pre_workout", "Trước tập"},
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}

func computeDayTotals(entries []DiaryEntryItem) map[string]*float64 {
	rawTotals := make(map[string]float64)
	hasValue := make(map[string]bool)

	for _, entry := range entries {
		// Energy / calories is accounted when known
		if entry.Calories != nil && *entry.Calories >= 0 {
			rawTotals["calories"] += *entry.Calories
			hasValue["calories"] = true
			hasValue["energy"] = true
		}

		if entry.Nutrients == nil {
			continue
		}

		for k, v := range entry.Nutrients {
			if k == "calories" || k == "energy" {
				continue // already accounted via entry.Calories
			}
			if v != nil {
				rawTotals[k] += *v
				hasValue[k] = true
			}
		}
	}

	totals := make(map[string]*float64, len(hasValue))
	for k := range hasValue {
		v := round2(rawTotals[k])
		if k == "energy" {
			v = round2(rawTotals["calories"])
		}
		totals[k] = &v
	}

	return totals
}

func (s *diaryServiceImpl) GetDay(ctx context.Context, userID uuid.UUID, date string) (*DaySummaryResponse, error) {
	entries, err := s.repo.GetDayEntries(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	rawTraining, err := s.repo.GetDayTraining(ctx, userID, date)
	if err != nil {
		return nil, err
	}
	var trainingMinutes *int
	effectiveMinutes := 60
	if rawTraining >= 0 {
		m := rawTraining
		trainingMinutes = &m
		effectiveMinutes = rawTraining
	} else if defTraining, defErr := s.repo.GetUserDefaultTraining(ctx, userID); defErr == nil && defTraining >= 0 {
		effectiveMinutes = defTraining
	}

	isReadOnly := date < GetServerYesterday()

	// Organize entries by meal slot
	meals := make([]MealSlotSummary, len(mealSlotOrder))
	for i, slotDef := range mealSlotOrder {
		meals[i] = MealSlotSummary{
			Slot:      slotDef.slot,
			NameVi:    slotDef.nameVi,
			TotalKcal: 0,
			Entries:   []DiaryEntryItem{},
		}
	}

	for _, e := range entries {
		slot := e.MealSlot
		if slot == "preworkout" {
			slot = "pre_workout"
		}
		for i := range meals {
			if meals[i].Slot == slot {
				meals[i].Entries = append(meals[i].Entries, e)
				if e.Calories != nil {
					meals[i].TotalKcal += *e.Calories
				}
				break
			}
		}
	}
	for i := range meals {
		meals[i].TotalKcal = round2(meals[i].TotalKcal)
	}

	dayTotals := computeDayTotals(entries)

	var dayTargets any
	if sex, weight, goal, _, isPeriod, birthYear, err := s.repo.GetUserProfile(ctx, userID); err == nil {
		age := targets.DefaultAge
		if birthYear > 0 {
			age = time.Now().Year() - birthYear
		}
		t := targets.CalculateTargets(targets.UserProfileForTargets{
			Sex:             sex,
			WeightKg:        weight,
			Goal:            goal,
			TrainingMinutes: effectiveMinutes,
			IsPeriod:        isPeriod,
			Age:             age,
		})
		dayTargets = t

		for i := range meals {
			switch meals[i].Slot {
			case "breakfast":
				meals[i].TargetMinKcal = round2(t.Calories.Min * 0.25)
			case "lunch":
				meals[i].TargetMinKcal = round2(t.Calories.Min * 0.35)
			case "dinner":
				meals[i].TargetMinKcal = round2(t.Calories.Min * 0.30)
			case "snack", "pre_workout":
				meals[i].TargetMinKcal = round2(t.Calories.Min * 0.10)
			}
		}
	}

	return &DaySummaryResponse{
		Date:            date,
		TrainingMinutes: trainingMinutes,
		IsReadOnly:      isReadOnly,
		Summary:         dayTotals,
		Targets:         dayTargets,
		Meals:           meals,
	}, nil
}

func (s *diaryServiceImpl) CreateEntry(ctx context.Context, userID uuid.UUID, date string, req CreateEntryRequest) (*DiaryEntryItem, map[string]*float64, error) {
	if req.ID != uuid.Nil {
		if existing, _, isDeleted, err := s.repo.GetEntryByID(ctx, userID, req.ID); err == nil && existing != nil && !isDeleted {
			dayEntries, err := s.repo.GetDayEntries(ctx, userID, date)
			if err != nil {
				return nil, nil, err
			}
			totals := computeDayTotals(dayEntries)
			return existing, totals, nil
		}
	}

	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return nil, nil, err
	}

	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}

	if req.MealSlot == "" {
		req.MealSlot = "breakfast"
	} else if req.MealSlot == "preworkout" {
		req.MealSlot = "pre_workout"
	}

	if req.Grams <= 0 && req.ServingSizeG > 0 {
		req.Grams = req.ServingSizeG
	}

	item := &DiaryEntryItem{
		ID:           req.ID,
		Kind:         req.Kind,
		MealSlot:     req.MealSlot,
		ServingLabel: req.ServingLabel,
		Grams:        req.Grams,
		Calories:     req.Calories,
	}

	if req.Kind == "quick" {
		item.FoodID = nil
		if req.FoodName != "" {
			cleaned, err := sanitizeFoodName(req.FoodName)
			if err != nil {
				return nil, nil, err
			}
			if cleaned != "" {
				item.FoodName = cleaned
			} else {
				item.FoodName = "Chỉ ghi kcal"
			}
		} else {
			item.FoodName = "Chỉ ghi kcal"
		}
		item.Nutrients = nil
	} else {
		if req.FoodID == nil {
			return nil, nil, ErrFoodIDRequired
		}
		item.FoodID = req.FoodID
		if req.Grams <= 0 {
			req.Grams = 100
			item.Grams = 100
		}

		foodName, per100g, err := s.repo.GetFoodNutrients(ctx, *req.FoodID)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to load food nutrients: %w", err)
		}
		item.FoodName = foodName

		// Snapshot nutrients scaled to grams: per_100g * grams / 100
		ratio := req.Grams / 100.0
		scaledNutrients := make(map[string]*float64)
		for k, v := range per100g {
			if v != nil {
				scaled := round2(*v * ratio)
				scaledNutrients[k] = &scaled
			} else {
				scaledNutrients[k] = nil
			}
		}
		item.Nutrients = scaledNutrients

		if cal, ok := scaledNutrients["calories"]; ok && cal != nil {
			item.Calories = cal
		} else if energy, ok := scaledNutrients["energy"]; ok && energy != nil {
			item.Calories = energy
		} else {
			item.Calories = nil
		}
	}

	saved, err := s.repo.CreateEntry(ctx, userID, date, item)
	if err != nil {
		return nil, nil, err
	}

	if s.recents != nil && item.FoodID != nil && req.Kind != "quick" {
		_ = s.recents.UpsertRecent(ctx, userID, *item.FoodID, item.ServingLabel, item.Grams)
	}

	dayEntries, err := s.repo.GetDayEntries(ctx, userID, date)
	if err != nil {
		return nil, nil, err
	}
	totals := computeDayTotals(dayEntries)

	return saved, totals, nil
}

func (s *diaryServiceImpl) RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, map[string]*float64, error) {
	existing, date, isDeleted, err := s.repo.GetEntryByID(ctx, userID, entryID)
	if err != nil {
		return nil, nil, err
	}
	if existing == nil {
		return nil, nil, ErrEntryNotFound
	}
	if !isDeleted {
		dayEntries, err := s.repo.GetDayEntries(ctx, userID, date)
		if err != nil {
			return nil, nil, err
		}
		return existing, computeDayTotals(dayEntries), nil
	}

	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return nil, nil, err
	}

	restored, _, err := s.repo.RestoreEntry(ctx, userID, entryID)
	if err != nil {
		return nil, nil, err
	}

	dayEntries, err := s.repo.GetDayEntries(ctx, userID, date)
	if err != nil {
		return nil, nil, err
	}
	totals := computeDayTotals(dayEntries)

	return restored, totals, nil
}

func (s *diaryServiceImpl) UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, req UpdateEntryRequest) (*DiaryEntryItem, map[string]*float64, error) {
	if req.Restore != nil && *req.Restore {
		return s.RestoreEntry(ctx, userID, entryID)
	}

	existing, date, isDeleted, err := s.repo.GetEntryByID(ctx, userID, entryID)
	if err != nil {
		return nil, nil, err
	}
	if existing == nil || isDeleted {
		return nil, nil, ErrEntryNotFound
	}

	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return nil, nil, err
	}

	if req.MealSlot != nil {
		slot := *req.MealSlot
		if slot == "preworkout" {
			slot = "pre_workout"
		}
		existing.MealSlot = slot
	}
	if req.ServingLabel != nil {
		existing.ServingLabel = *req.ServingLabel
	}

	gramsVal := req.Grams
	if (gramsVal == nil || *gramsVal <= 0) && req.ServingSizeG != nil && *req.ServingSizeG > 0 {
		gramsVal = req.ServingSizeG
	}

	if existing.Kind == "quick" {
		if req.FoodName != nil {
			cleaned, err := sanitizeFoodName(*req.FoodName)
			if err != nil {
				return nil, nil, err
			}
			if cleaned != "" {
				existing.FoodName = cleaned
			}
		}
		if req.Calories != nil {
			existing.Calories = req.Calories
		}
	} else {
		if gramsVal != nil && *gramsVal > 0 {
			existing.Grams = *gramsVal
			if existing.FoodID != nil {
				_, per100g, err := s.repo.GetFoodNutrients(ctx, *existing.FoodID)
				if err != nil {
					return nil, nil, fmt.Errorf("failed to load food nutrients: %w", err)
				}
				ratio := *gramsVal / 100.0
				scaledNutrients := make(map[string]*float64)
				for k, v := range per100g {
					if v != nil {
						scaled := round2(*v * ratio)
						scaledNutrients[k] = &scaled
					} else {
						scaledNutrients[k] = nil
					}
				}
				existing.Nutrients = scaledNutrients
				if cal, ok := scaledNutrients["calories"]; ok && cal != nil {
					existing.Calories = cal
				} else if energy, ok := scaledNutrients["energy"]; ok && energy != nil {
					existing.Calories = energy
				} else {
					existing.Calories = nil
				}
			}
		}
	}

	updated, _, err := s.repo.UpdateEntry(ctx, userID, entryID, existing)
	if err != nil {
		return nil, nil, err
	}

	dayEntries, err := s.repo.GetDayEntries(ctx, userID, date)
	if err != nil {
		return nil, nil, err
	}
	totals := computeDayTotals(dayEntries)

	return updated, totals, nil
}

func (s *diaryServiceImpl) DeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error {
	existing, date, isDeleted, err := s.repo.GetEntryByID(ctx, userID, entryID)
	if err != nil {
		return err
	}
	if existing == nil || isDeleted {
		return ErrEntryNotFound
	}

	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return err
	}

	return s.repo.SoftDeleteEntry(ctx, userID, entryID)
}

func (s *diaryServiceImpl) CopyYesterday(ctx context.Context, userID uuid.UUID, targetDate string, req CopyYesterdayRequest) (*CopyYesterdayResponse, error) {
	if err := ValidateDateWritableCtx(ctx, targetDate); err != nil {
		return nil, err
	}

	sourceEntries, err := s.repo.GetDayEntries(ctx, userID, req.SourceDate)
	if err != nil {
		return nil, err
	}

	allowedSlots := make(map[string]bool)
	for _, sl := range req.MealSlots {
		if sl == "preworkout" {
			sl = "pre_workout"
		}
		allowedSlots[sl] = true
	}

	var toCopy []*DiaryEntryItem
	for _, src := range sourceEntries {
		slot := src.MealSlot
		if slot == "preworkout" {
			slot = "pre_workout"
		}
		if len(allowedSlots) > 0 && !allowedSlots[slot] {
			continue
		}

		toCopy = append(toCopy, &DiaryEntryItem{
			ID:           uuid.New(),
			FoodID:       src.FoodID,
			FoodName:     src.FoodName,
			Kind:         src.Kind,
			MealSlot:     slot,
			ServingLabel: src.ServingLabel,
			Grams:        src.Grams,
			Calories:     src.Calories,
			Nutrients:    src.Nutrients,
		})
	}

	if len(toCopy) == 0 {
		return &CopyYesterdayResponse{
			CopiedCount: 0,
			Entries:     []DiaryEntryItem{},
		}, nil
	}

	copied, err := s.repo.CreateEntriesBatch(ctx, userID, targetDate, toCopy)
	if err != nil {
		return nil, fmt.Errorf("failed to copy entries: %w", err)
	}

	return &CopyYesterdayResponse{
		CopiedCount: len(copied),
		Entries:     copied,
	}, nil
}

func (s *diaryServiceImpl) DeleteMeal(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error {
	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return err
	}
	if mealSlot == "preworkout" {
		mealSlot = "pre_workout"
	}
	return s.repo.DeleteMealEntries(ctx, userID, date, mealSlot)
}

func (s *diaryServiceImpl) SetTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) (*SetTrainingResponse, error) {
	if err := ValidateDateWritableCtx(ctx, date); err != nil {
		return nil, err
	}
	if minutes != 0 && minutes != 45 && minutes != 60 && minutes != 90 && minutes != 120 && minutes != 240 {
		return nil, ErrInvalidTrainingMinutes
	}
	err := s.repo.UpsertDayTraining(ctx, userID, date, minutes)
	if err != nil {
		return nil, err
	}
	return &SetTrainingResponse{
		Date:            date,
		TrainingMinutes: minutes,
	}, nil
}

func (s *diaryServiceImpl) GetDaysRange(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]*DaySummaryResponse, error) {
	fromT, err := time.Parse("2006-01-02", fromDate)
	if err != nil {
		return nil, ErrInvalidDateFormat
	}
	toT, err := time.Parse("2006-01-02", toDate)
	if err != nil {
		return nil, ErrInvalidDateFormat
	}
	if fromT.After(toT) {
		return nil, ErrInvalidDateRange
	}

	// Clamp max range to 100 days to prevent excessive memory/query load
	if toT.Sub(fromT) > 100*24*time.Hour {
		return nil, ErrRangeTooLarge
	}

	rangeEntries, err := s.repo.GetRangeEntries(ctx, userID, fromDate, toDate)
	if err != nil {
		return nil, err
	}

	rangeTraining, err := s.repo.GetRangeTraining(ctx, userID, fromDate, toDate)
	if err != nil {
		return nil, err
	}

	defTraining := 60
	if dt, defErr := s.repo.GetUserDefaultTraining(ctx, userID); defErr == nil && dt >= 0 {
		defTraining = dt
	}

	userSex, userWeight, userGoal, _, userIsPeriod, userBirthYear, profileErr := s.repo.GetUserProfile(ctx, userID)
	userAge := targets.DefaultAge
	if userBirthYear > 0 {
		userAge = time.Now().Year() - userBirthYear
	}

	yesterday := GetServerYesterday()

	var days []*DaySummaryResponse
	for cur := fromT; !cur.After(toT); cur = cur.AddDate(0, 0, 1) {
		dateStr := cur.Format("2006-01-02")
		entries := rangeEntries[dateStr]
		if entries == nil {
			entries = []DiaryEntryItem{}
		}

		var trainingMinutes *int
		effectiveMinutes := defTraining
		if m, ok := rangeTraining[dateStr]; ok && m >= 0 {
			trainingMinutes = &m
			effectiveMinutes = m
		}

		isReadOnly := dateStr < yesterday

		meals := make([]MealSlotSummary, len(mealSlotOrder))
		for i, slotDef := range mealSlotOrder {
			meals[i] = MealSlotSummary{
				Slot:      slotDef.slot,
				NameVi:    slotDef.nameVi,
				TotalKcal: 0,
				Entries:   []DiaryEntryItem{},
			}
		}

		for _, e := range entries {
			slot := e.MealSlot
			if slot == "preworkout" {
				slot = "pre_workout"
			}
			for i := range meals {
				if meals[i].Slot == slot {
					meals[i].Entries = append(meals[i].Entries, e)
					if e.Calories != nil {
						meals[i].TotalKcal += *e.Calories
					}
					break
				}
			}
		}
		for i := range meals {
			meals[i].TotalKcal = round2(meals[i].TotalKcal)
		}

		dayTotals := computeDayTotals(entries)

		var dayTargets any
		if profileErr == nil {
			t := targets.CalculateTargets(targets.UserProfileForTargets{
				Sex:             userSex,
				WeightKg:        userWeight,
				Goal:            userGoal,
				TrainingMinutes: effectiveMinutes,
				IsPeriod:        userIsPeriod,
				Age:             userAge,
			})
			dayTargets = t

			for i := range meals {
				switch meals[i].Slot {
				case "breakfast":
					meals[i].TargetMinKcal = round2(t.Calories.Min * 0.25)
				case "lunch":
					meals[i].TargetMinKcal = round2(t.Calories.Min * 0.35)
				case "dinner":
					meals[i].TargetMinKcal = round2(t.Calories.Min * 0.30)
				case "snack", "pre_workout":
					meals[i].TargetMinKcal = round2(t.Calories.Min * 0.10)
				}
			}
		}

		days = append(days, &DaySummaryResponse{
			Date:            dateStr,
			TrainingMinutes: trainingMinutes,
			IsReadOnly:      isReadOnly,
			Summary:         dayTotals,
			Targets:         dayTargets,
			Meals:           meals,
		})
	}

	return days, nil
}
