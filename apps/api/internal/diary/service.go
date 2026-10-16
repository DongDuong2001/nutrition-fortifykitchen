package diary

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

var (
	ErrEntryNotFound         = errors.New("diary entry not found")
	ErrRestoreWindowExpired = errors.New("restore window expired (must be within 10 seconds)")
)

type RecentsTracker interface {
	UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error
}

type Service interface {
	GetDay(ctx context.Context, userID uuid.UUID, date string) (*DaySummaryResponse, error)
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
	totals := make(map[string]*float64)
	hasValue := make(map[string]bool)

	for _, entry := range entries {
		// Energy / calories is accounted when known
		if entry.Calories != nil && *entry.Calories > 0 {
			if totals["calories"] == nil {
				cal := 0.0
				en := 0.0
				totals["calories"] = &cal
				totals["energy"] = &en
			}
			*totals["calories"] = round2(*totals["calories"] + *entry.Calories)
			*totals["energy"] = *totals["calories"]
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
				if totals[k] == nil {
					val := 0.0
					totals[k] = &val
				}
				*totals[k] = round2(*totals[k] + *v)
				hasValue[k] = true
			}
		}
	}

	return totals
}

func (s *diaryServiceImpl) GetDay(ctx context.Context, userID uuid.UUID, date string) (*DaySummaryResponse, error) {
	entries, err := s.repo.GetDayEntries(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	training, err := s.repo.GetDayTraining(ctx, userID, date)
	if err != nil {
		return nil, err
	}
	if training < 0 {
		training, err = s.repo.GetUserDefaultTraining(ctx, userID)
		if err != nil {
			training = 60
		}
	}

	isReadOnly := date < GetServerToday()

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
					meals[i].TotalKcal = round2(meals[i].TotalKcal + *e.Calories)
				}
				break
			}
		}
	}

	dayTotals := computeDayTotals(entries)

	var dayTargets any
	if sex, weight, goal, defTraining, isPeriod, err := s.repo.GetUserProfile(ctx, userID); err == nil {
		mins := training
		if mins < 0 {
			mins = defTraining
		}
		t := targets.CalculateTargets(targets.UserProfileForTargets{
			Sex:             sex,
			WeightKg:        weight,
			Goal:            goal,
			TrainingMinutes: mins,
			IsPeriod:        isPeriod,
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
		TrainingMinutes: training,
		IsReadOnly:      isReadOnly,
		Summary:         dayTotals,
		Targets:         dayTargets,
		Meals:           meals,
	}, nil
}

func (s *diaryServiceImpl) CreateEntry(ctx context.Context, userID uuid.UUID, date string, req CreateEntryRequest) (*DiaryEntryItem, map[string]*float64, error) {
	if err := ValidateDateWritable(date); err != nil {
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
		item.FoodName = "Chỉ ghi kcal"
		item.Nutrients = nil
	} else {
		if req.FoodID == nil {
			return nil, nil, errors.New("food_id is required for food entry")
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
	restored, date, err := s.repo.RestoreEntry(ctx, userID, entryID)
	if err != nil {
		return nil, nil, err
	}

	if err := ValidateDateWritable(date); err != nil {
		_ = s.repo.SoftDeleteEntry(ctx, userID, entryID)
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

	existing, date, err := s.repo.GetEntryByID(ctx, userID, entryID)
	if err != nil {
		return nil, nil, err
	}
	if existing == nil {
		return nil, nil, ErrEntryNotFound
	}

	if err := ValidateDateWritable(date); err != nil {
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
		if req.Calories != nil {
			existing.Calories = req.Calories
		}
	} else {
		if gramsVal != nil && *gramsVal > 0 {
			existing.Grams = *gramsVal
			if existing.FoodID != nil {
				_, per100g, err := s.repo.GetFoodNutrients(ctx, *existing.FoodID)
				if err == nil {
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
	existing, date, err := s.repo.GetEntryByID(ctx, userID, entryID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrEntryNotFound
	}

	if err := ValidateDateWritable(date); err != nil {
		return err
	}

	return s.repo.SoftDeleteEntry(ctx, userID, entryID)
}

func (s *diaryServiceImpl) CopyYesterday(ctx context.Context, userID uuid.UUID, targetDate string, req CopyYesterdayRequest) (*CopyYesterdayResponse, error) {
	if err := ValidateDateWritable(targetDate); err != nil {
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

	var copied []DiaryEntryItem
	for _, src := range sourceEntries {
		slot := src.MealSlot
		if slot == "preworkout" {
			slot = "pre_workout"
		}
		if len(allowedSlots) > 0 && !allowedSlots[slot] {
			continue
		}

		newEntry := &DiaryEntryItem{
			ID:           uuid.New(),
			FoodID:       src.FoodID,
			FoodName:     src.FoodName,
			Kind:         src.Kind,
			MealSlot:     slot,
			ServingLabel: src.ServingLabel,
			Grams:        src.Grams,
			Calories:     src.Calories,
			Nutrients:    src.Nutrients,
		}

		saved, err := s.repo.CreateEntry(ctx, userID, targetDate, newEntry)
		if err == nil {
			copied = append(copied, *saved)
		}
	}

	return &CopyYesterdayResponse{
		CopiedCount: len(copied),
		Entries:     copied,
	}, nil
}

func (s *diaryServiceImpl) DeleteMeal(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error {
	if err := ValidateDateWritable(date); err != nil {
		return err
	}
	if mealSlot == "preworkout" {
		mealSlot = "pre_workout"
	}
	return s.repo.DeleteMealEntries(ctx, userID, date, mealSlot)
}

func (s *diaryServiceImpl) SetTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) (*SetTrainingResponse, error) {
	if err := ValidateDateWritable(date); err != nil {
		return nil, err
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
