package diary

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type mockDiaryRepo struct {
	entries        map[uuid.UUID]*DiaryEntryItem
	deletedEntries map[uuid.UUID]*DiaryEntryItem
	training       map[string]int
	restoreExpired bool
}

func newMockDiaryRepo() *mockDiaryRepo {
	return &mockDiaryRepo{
		entries:        make(map[uuid.UUID]*DiaryEntryItem),
		deletedEntries: make(map[uuid.UUID]*DiaryEntryItem),
		training:       make(map[string]int),
	}
}

type mockRecentsTracker struct {
	upserted []struct {
		foodID       uuid.UUID
		portionLabel string
		grams        float64
	}
}

func (m *mockRecentsTracker) UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error {
	m.upserted = append(m.upserted, struct {
		foodID       uuid.UUID
		portionLabel string
		grams        float64
	}{foodID: foodID, portionLabel: portionLabel, grams: grams})
	return nil
}

func (m *mockDiaryRepo) GetDayEntries(ctx context.Context, userID uuid.UUID, date string) ([]DiaryEntryItem, error) {
	var list []DiaryEntryItem
	for _, e := range m.entries {
		list = append(list, *e)
	}
	return list, nil
}

func (m *mockDiaryRepo) GetDayTraining(ctx context.Context, userID uuid.UUID, date string) (int, error) {
	if val, ok := m.training[date]; ok {
		return val, nil
	}
	return -1, nil
}

func (m *mockDiaryRepo) GetUserDefaultTraining(ctx context.Context, userID uuid.UUID) (int, error) {
	return 60, nil
}

func (m *mockDiaryRepo) GetUserProfile(ctx context.Context, userID uuid.UUID) (string, float64, string, int, bool, error) {
	return "male", 65.0, "maintain", 60, false, nil
}

func (m *mockDiaryRepo) GetFoodNutrients(ctx context.Context, foodID uuid.UUID) (string, map[string]*float64, error) {
	cal := 380.0
	pro := 13.0
	ca := 60.0
	return "Yến mạch", map[string]*float64{
		"calories":  &cal,
		"energy":    &cal,
		"protein":   &pro,
		"calcium":   &ca,
		"potassium": nil, // unknown
	}, nil
}

func (m *mockDiaryRepo) CreateEntry(ctx context.Context, userID uuid.UUID, date string, entry *DiaryEntryItem) (*DiaryEntryItem, error) {
	m.entries[entry.ID] = entry
	return entry, nil
}

func (m *mockDiaryRepo) GetEntryByID(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error) {
	if e, ok := m.entries[entryID]; ok {
		return e, GetServerToday(), nil
	}
	return nil, "", nil
}

func (m *mockDiaryRepo) UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, entry *DiaryEntryItem) (*DiaryEntryItem, string, error) {
	m.entries[entryID] = entry
	return entry, GetServerToday(), nil
}

func (m *mockDiaryRepo) SoftDeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error {
	if e, ok := m.entries[entryID]; ok {
		m.deletedEntries[entryID] = e
		delete(m.entries, entryID)
	}
	return nil
}

func (m *mockDiaryRepo) RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, error) {
	if m.restoreExpired {
		return nil, "", ErrRestoreWindowExpired
	}
	if e, ok := m.deletedEntries[entryID]; ok {
		m.entries[entryID] = e
		delete(m.deletedEntries, entryID)
		return e, GetServerToday(), nil
	}
	return nil, "", ErrEntryNotFound
}

func (m *mockDiaryRepo) DeleteMealEntries(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error {
	for id, e := range m.entries {
		if e.MealSlot == mealSlot {
			delete(m.entries, id)
		}
	}
	return nil
}

func (m *mockDiaryRepo) UpsertDayTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) error {
	m.training[date] = minutes
	return nil
}

func TestDiaryService_PastDayReadOnly(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	pastDate := "2020-01-01"

	calVal := 200.0
	_, _, err := svc.CreateEntry(context.Background(), userID, pastDate, CreateEntryRequest{
		Kind:     "quick",
		Calories: &calVal,
	})
	if !errors.Is(err, ErrPastDayReadOnly) {
		t.Fatalf("expected ErrPastDayReadOnly on past date write, got %v", err)
	}

	err = svc.DeleteMeal(context.Background(), userID, pastDate, "breakfast")
	if !errors.Is(err, ErrPastDayReadOnly) {
		t.Fatalf("expected ErrPastDayReadOnly on past date delete meal, got %v", err)
	}

	_, err = svc.SetTraining(context.Background(), userID, pastDate, 90)
	if !errors.Is(err, ErrPastDayReadOnly) {
		t.Fatalf("expected ErrPastDayReadOnly on past date set training, got %v", err)
	}
}

func TestDiaryService_FoodAndQuickEntries_NullHandling(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	today := GetServerToday()
	foodID := uuid.New()

	// 1. Log 50g of Yến mạch (380 kcal / 100g -> 190 kcal)
	entry1, totals1, err := svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:           uuid.New(),
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		Grams:        50,
		ServingLabel: "50 g",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if entry1.Calories == nil || *entry1.Calories != 190 {
		t.Errorf("expected 190 kcal for 50g, got %v", entry1.Calories)
	}
	if totals1["calories"] == nil || *totals1["calories"] != 190 {
		t.Errorf("expected 190 kcal total, got %v", totals1["calories"])
	}
	// Potassium is nil in source, must remain nil in entry and day summary
	if entry1.Nutrients["potassium"] != nil {
		t.Errorf("expected nil potassium in entry, got %v", entry1.Nutrients["potassium"])
	}
	if totals1["potassium"] != nil {
		t.Errorf("expected nil potassium in totals, got %v", totals1["potassium"])
	}

	// 2. Add quick entry 250 kcal
	quickCal := 250.0
	entry2, totals2, err := svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:       uuid.New(),
		Kind:     "quick",
		MealSlot: "snack",
		Calories: &quickCal,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if entry2.Nutrients != nil {
		t.Errorf("quick entry nutrients should be nil, got %v", entry2.Nutrients)
	}

	// Total calories should now be 190 + 250 = 440
	if totals2["calories"] == nil || *totals2["calories"] != 440 {
		t.Errorf("expected 440 total kcal after quick entry, got %v", totals2["calories"])
	}
	// Potassium still nil (never coerced to 0)
	if totals2["potassium"] != nil {
		t.Errorf("expected nil potassium after quick entry, got %v", totals2["potassium"])
	}
}

func TestDiaryService_RecentsUpsertedOnFoodEntry(t *testing.T) {
	repo := newMockDiaryRepo()
	recents := &mockRecentsTracker{}
	svc := NewService(repo, recents)

	userID := uuid.New()
	today := GetServerToday()
	foodID := uuid.New()

	// 1. Food entry -> must upsert recent
	_, _, err := svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:           uuid.New(),
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "lunch",
		Grams:        150,
		ServingLabel: "150 g",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(recents.upserted) != 1 {
		t.Fatalf("expected 1 recent upsert, got %d", len(recents.upserted))
	}
	if recents.upserted[0].foodID != foodID || recents.upserted[0].grams != 150 {
		t.Errorf("unexpected recent item: %+v", recents.upserted[0])
	}

	quickCal := 300.0
	_, _, err = svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:       uuid.New(),
		Kind:     "quick",
		MealSlot: "snack",
		Calories: &quickCal,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(recents.upserted) != 1 {
		t.Errorf("quick entry should not upsert to recents, total is %d", len(recents.upserted))
	}
}

func TestDiaryService_RestoreWithin10s(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	today := GetServerToday()
	foodID := uuid.New()

	// Create and then delete entry
	entryID := uuid.New()
	_, _, err := svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:           entryID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		Grams:        100,
		ServingLabel: "100 g",
	})
	if err != nil {
		t.Fatalf("failed to create entry: %v", err)
	}

	if err := svc.DeleteEntry(context.Background(), userID, entryID); err != nil {
		t.Fatalf("failed to delete entry: %v", err)
	}

	// Verify it's deleted
	if _, ok := repo.entries[entryID]; ok {
		t.Fatalf("entry should be deleted from active entries")
	}

	// 1. Direct restore
	restored, totals, err := svc.RestoreEntry(context.Background(), userID, entryID)
	if err != nil {
		t.Fatalf("failed to restore entry: %v", err)
	}
	if restored.ID != entryID {
		t.Errorf("expected restored ID %s, got %s", entryID, restored.ID)
	}
	if totals["calories"] == nil || *totals["calories"] != 380 {
		t.Errorf("expected 380 kcal total after restore, got %v", totals["calories"])
	}

	// 2. Delete again and restore via UpdateEntry with req.Restore = true
	_ = svc.DeleteEntry(context.Background(), userID, entryID)
	trueVal := true
	restored2, _, err := svc.UpdateEntry(context.Background(), userID, entryID, UpdateEntryRequest{
		Restore: &trueVal,
	})
	if err != nil {
		t.Fatalf("failed to restore via UpdateEntry: %v", err)
	}
	if restored2.ID != entryID {
		t.Errorf("expected restored ID %s, got %s", entryID, restored2.ID)
	}

	// 3. Expired restore window returns ErrRestoreWindowExpired
	_ = svc.DeleteEntry(context.Background(), userID, entryID)
	repo.restoreExpired = true
	_, _, err = svc.RestoreEntry(context.Background(), userID, entryID)
	if !errors.Is(err, ErrRestoreWindowExpired) {
		t.Errorf("expected ErrRestoreWindowExpired, got %v", err)
	}
}

func TestDiaryService_GetDay_TrainingMinutesNullable(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	today := GetServerToday()

	// When training is not set for the day, TrainingMinutes must be nil
	day1, err := svc.GetDay(context.Background(), userID, today)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if day1.TrainingMinutes != nil {
		t.Errorf("expected nil TrainingMinutes when unset, got %v", *day1.TrainingMinutes)
	}

	// Explicitly set training to 45 minutes
	_, err = svc.SetTraining(context.Background(), userID, today, 45)
	if err != nil {
		t.Fatalf("unexpected error setting training: %v", err)
	}

	day2, err := svc.GetDay(context.Background(), userID, today)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if day2.TrainingMinutes == nil || *day2.TrainingMinutes != 45 {
		t.Errorf("expected TrainingMinutes 45, got %v", day2.TrainingMinutes)
	}

	// Invalid training minutes returns ErrInvalidTrainingMinutes
	_, err = svc.SetTraining(context.Background(), userID, today, 30)
	if !errors.Is(err, ErrInvalidTrainingMinutes) {
		t.Errorf("expected ErrInvalidTrainingMinutes for 30 min, got %v", err)
	}
}
