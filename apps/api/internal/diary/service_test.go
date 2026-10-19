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
	entryDates     map[uuid.UUID]string
	training       map[string]int
	restoreExpired bool
	conflictIDs    map[uuid.UUID]bool
	dbError        error
}

func newMockDiaryRepo() *mockDiaryRepo {
	return &mockDiaryRepo{
		entries:        make(map[uuid.UUID]*DiaryEntryItem),
		deletedEntries: make(map[uuid.UUID]*DiaryEntryItem),
		entryDates:     make(map[uuid.UUID]string),
		training:       make(map[string]int),
		conflictIDs:    make(map[uuid.UUID]bool),
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

func (m *mockDiaryRepo) GetUserProfile(ctx context.Context, userID uuid.UUID) (string, float64, string, int, bool, int, error) {
	return "male", 65.0, "maintain", 60, false, 2000, nil
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
	if m.conflictIDs[entry.ID] {
		return nil, ErrIDConflict
	}
	m.entries[entry.ID] = entry
	m.entryDates[entry.ID] = date
	return entry, nil
}

func (m *mockDiaryRepo) GetEntryByID(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*DiaryEntryItem, string, bool, error) {
	date := GetServerToday()
	if d, ok := m.entryDates[entryID]; ok {
		date = d
	}
	if e, ok := m.entries[entryID]; ok {
		return e, date, false, nil
	}
	if e, ok := m.deletedEntries[entryID]; ok {
		return e, date, true, nil
	}
	return nil, "", false, nil
}

func (m *mockDiaryRepo) UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, entry *DiaryEntryItem) (*DiaryEntryItem, string, error) {
	m.entries[entryID] = entry
	date := GetServerToday()
	if d, ok := m.entryDates[entryID]; ok {
		date = d
	}
	return entry, date, nil
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
		date := GetServerToday()
		if d, ok := m.entryDates[entryID]; ok {
			date = d
		}
		return e, date, nil
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

func (m *mockDiaryRepo) GetRangeEntries(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string][]DiaryEntryItem, error) {
	if m.dbError != nil {
		return nil, m.dbError
	}
	out := make(map[string][]DiaryEntryItem)
	for _, e := range m.entries {
		out[fromDate] = append(out[fromDate], *e)
	}
	return out, nil
}

func (m *mockDiaryRepo) GetRangeTraining(ctx context.Context, userID uuid.UUID, fromDate, toDate string) (map[string]int, error) {
	if m.dbError != nil {
		return nil, m.dbError
	}
	out := make(map[string]int)
	for d, v := range m.training {
		if d >= fromDate && d <= toDate {
			out[d] = v
		}
	}
	return out, nil
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

func TestDiaryService_YesterdayIsWritable(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	yesterday := GetServerYesterday()
	foodID := uuid.New()

	item, _, err := svc.CreateEntry(context.Background(), userID, yesterday, CreateEntryRequest{
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "lunch",
		Grams:        100,
		ServingLabel: "100 g",
	})
	if err != nil {
		t.Fatalf("yesterday should be writable, got: %v", err)
	}
	if item == nil {
		t.Fatalf("expected created entry item, got nil")
	}

	day, err := svc.GetDay(context.Background(), userID, yesterday)
	if err != nil {
		t.Fatalf("failed to get day: %v", err)
	}
	if day.IsReadOnly {
		t.Errorf("yesterday must not be read-only")
	}
}

func TestDiaryService_CreateEntry_IdempotencyOnRetry(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	twoDaysAgo := "2020-01-01"
	foodID := uuid.New()
	existingID := uuid.New()

	// Pre-populate an existing entry
	existingItem := &DiaryEntryItem{
		ID:           existingID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		ServingLabel: "100 g",
		Grams:        100,
	}
	repo.entries[existingID] = existingItem

	// Client retries an existing ID on a past (read-only) date
	item, _, err := svc.CreateEntry(context.Background(), userID, twoDaysAgo, CreateEntryRequest{
		ID:           existingID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		Grams:        100,
		ServingLabel: "100 g",
	})
	if err != nil {
		t.Fatalf("retry with existing ID should succeed idempotently, got: %v", err)
	}
	if item.ID != existingID {
		t.Errorf("expected item ID %s, got %s", existingID, item.ID)
	}
}

func TestDiaryService_GetDaysRange(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	from := "2026-10-15"
	to := "2026-10-18"

	days, err := svc.GetDaysRange(context.Background(), userID, from, to)
	if err != nil {
		t.Fatalf("GetDaysRange failed: %v", err)
	}
	if len(days) != 4 {
		t.Fatalf("expected 4 days in range, got %d", len(days))
	}
	if days[0].Date != "2026-10-15" || days[3].Date != "2026-10-18" {
		t.Errorf("unexpected date range: got %s to %s", days[0].Date, days[3].Date)
	}
}

func TestDiaryService_RestorePastDayDoesNotUnDelete(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	pastDate := "2020-01-01"
	entryID := uuid.New()
	foodID := uuid.New()

	item := &DiaryEntryItem{
		ID:           entryID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "lunch",
		ServingLabel: "100 g",
		Grams:        100,
	}
	repo.deletedEntries[entryID] = item
	repo.entryDates[entryID] = pastDate

	// Restoring an entry from a past (read-only) day must return ErrPastDayReadOnly
	// and MUST NOT un-delete the entry in the DB.
	_, _, err := svc.RestoreEntry(context.Background(), userID, entryID)
	if !errors.Is(err, ErrPastDayReadOnly) {
		t.Fatalf("expected ErrPastDayReadOnly, got: %v", err)
	}

	if _, ok := repo.entries[entryID]; ok {
		t.Errorf("entry must not be restored to active entries in DB")
	}
	if _, ok := repo.deletedEntries[entryID]; !ok {
		t.Errorf("entry must remain in deletedEntries")
	}
}

func TestDiaryService_RestoreReplayAlreadyLive(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	entryID := uuid.New()
	foodID := uuid.New()

	item := &DiaryEntryItem{
		ID:           entryID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "breakfast",
		ServingLabel: "100 g",
		Grams:        100,
	}
	repo.entries[entryID] = item
	repo.entryDates[entryID] = GetServerToday()

	// Replayed restore of an already-live entry returns the entry with 200 (nil error)
	restored, totals, err := svc.RestoreEntry(context.Background(), userID, entryID)
	if err != nil {
		t.Fatalf("replayed restore should succeed, got: %v", err)
	}
	if restored.ID != entryID {
		t.Errorf("expected restored ID %s, got %s", entryID, restored.ID)
	}
	if totals == nil {
		t.Errorf("expected totals to be computed")
	}
}

func TestDiaryService_CreateEntry_IDConflict(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)

	userID := uuid.New()
	foreignID := uuid.New()
	repo.conflictIDs[foreignID] = true
	today := GetServerToday()
	foodID := uuid.New()

	_, _, err := svc.CreateEntry(context.Background(), userID, today, CreateEntryRequest{
		ID:           foreignID,
		Kind:         "food",
		FoodID:       &foodID,
		MealSlot:     "lunch",
		Grams:        100,
		ServingLabel: "100 g",
	})
	if !errors.Is(err, ErrIDConflict) {
		t.Fatalf("expected ErrIDConflict, got: %v", err)
	}
}

func TestDiaryService_GetDaysRange_ValidationAndDBError(t *testing.T) {
	repo := newMockDiaryRepo()
	svc := NewService(repo)
	userID := uuid.New()

	// 1. Invalid date format
	_, err := svc.GetDaysRange(context.Background(), userID, "invalid", "2026-10-18")
	if !errors.Is(err, ErrInvalidDateFormat) {
		t.Errorf("expected ErrInvalidDateFormat, got: %v", err)
	}

	// 2. from > to
	_, err = svc.GetDaysRange(context.Background(), userID, "2026-10-19", "2026-10-18")
	if !errors.Is(err, ErrInvalidDateRange) {
		t.Errorf("expected ErrInvalidDateRange, got: %v", err)
	}

	// 3. Range > 100 days
	_, err = svc.GetDaysRange(context.Background(), userID, "2026-01-01", "2026-05-01")
	if !errors.Is(err, ErrRangeTooLarge) {
		t.Errorf("expected ErrRangeTooLarge, got: %v", err)
	}

	// 4. DB error returned as-is from service (handler maps to 500)
	dbErr := errors.New("database connection reset")
	repo.dbError = dbErr
	_, err = svc.GetDaysRange(context.Background(), userID, "2026-10-15", "2026-10-18")
	if !errors.Is(err, dbErr) {
		t.Errorf("expected dbErr, got: %v", err)
	}
}
