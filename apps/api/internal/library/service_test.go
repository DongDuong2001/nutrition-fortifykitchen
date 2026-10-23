package library

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/diary"
)

type mockLibRepo struct {
	favourites map[uuid.UUID]bool
	recents    []RecentItem
	savedMeals map[uuid.UUID]*SavedMeal
}

func newMockLibRepo() *mockLibRepo {
	return &mockLibRepo{
		favourites: make(map[uuid.UUID]bool),
		savedMeals: make(map[uuid.UUID]*SavedMeal),
	}
}

func (m *mockLibRepo) GetFavourites(ctx context.Context, userID uuid.UUID) ([]FavouriteItem, error) {
	var res []FavouriteItem
	for fid := range m.favourites {
		res = append(res, FavouriteItem{FoodID: fid, NameVi: "Food"})
	}
	return res, nil
}

func (m *mockLibRepo) AddFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	m.favourites[foodID] = true
	return nil
}

func (m *mockLibRepo) RemoveFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	delete(m.favourites, foodID)
	return nil
}

func (m *mockLibRepo) GetRecents(ctx context.Context, userID uuid.UUID, limit int) ([]RecentItem, error) {
	return m.recents, nil
}

func (m *mockLibRepo) UpsertRecent(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error {
	m.recents = append([]RecentItem{{FoodID: foodID, LastServingLabel: portionLabel, LastGrams: grams}}, m.recents...)
	return nil
}

func (m *mockLibRepo) GetSavedMeals(ctx context.Context, userID uuid.UUID) ([]SavedMeal, error) {
	var list []SavedMeal
	for _, sm := range m.savedMeals {
		list = append(list, *sm)
	}
	return list, nil
}

func (m *mockLibRepo) GetSavedMealByID(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) (*SavedMeal, error) {
	if sm, ok := m.savedMeals[mealID]; ok {
		return sm, nil
	}
	return nil, nil
}

func (m *mockLibRepo) CreateSavedMeal(ctx context.Context, userID uuid.UUID, meal *SavedMeal) (*SavedMeal, error) {
	if meal.ID == uuid.Nil {
		meal.ID = uuid.New()
	}
	m.savedMeals[meal.ID] = meal
	return meal, nil
}

func (m *mockLibRepo) DeleteSavedMeal(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) error {
	delete(m.savedMeals, mealID)
	return nil
}

type mockDiaryService struct {
	createdEntries []diary.DiaryEntryItem
	recents        diary.RecentsTracker
}

func (d *mockDiaryService) GetDay(ctx context.Context, userID uuid.UUID, date string) (*diary.DaySummaryResponse, error) {
	return nil, nil
}

func (d *mockDiaryService) GetDaysRange(ctx context.Context, userID uuid.UUID, fromDate, toDate string) ([]*diary.DaySummaryResponse, error) {
	return nil, nil
}

func (d *mockDiaryService) CreateEntry(ctx context.Context, userID uuid.UUID, date string, req diary.CreateEntryRequest) (*diary.DiaryEntryItem, map[string]*float64, error) {
	item := &diary.DiaryEntryItem{
		ID:           req.ID,
		FoodID:       req.FoodID,
		MealSlot:     req.MealSlot,
		Grams:        req.Grams,
		ServingLabel: req.ServingLabel,
	}
	d.createdEntries = append(d.createdEntries, *item)
	return item, nil, nil
}

func (d *mockDiaryService) UpdateEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID, req diary.UpdateEntryRequest) (*diary.DiaryEntryItem, map[string]*float64, error) {
	return nil, nil, nil
}

func (d *mockDiaryService) DeleteEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) error {
	return nil
}

func (d *mockDiaryService) RestoreEntry(ctx context.Context, userID uuid.UUID, entryID uuid.UUID) (*diary.DiaryEntryItem, map[string]*float64, error) {
	return nil, nil, nil
}

func (d *mockDiaryService) CopyYesterday(ctx context.Context, userID uuid.UUID, targetDate string, req diary.CopyYesterdayRequest) (*diary.CopyYesterdayResponse, error) {
	return nil, nil
}

func (d *mockDiaryService) DeleteMeal(ctx context.Context, userID uuid.UUID, date string, mealSlot string) error {
	return nil
}

func (d *mockDiaryService) SetTraining(ctx context.Context, userID uuid.UUID, date string, minutes int) (*diary.SetTrainingResponse, error) {
	return nil, nil
}

func (d *mockDiaryService) CreateEntriesBatch(ctx context.Context, userID uuid.UUID, date string, reqs []diary.CreateEntryRequest) ([]diary.DiaryEntryItem, error) {
	var result []diary.DiaryEntryItem
	for _, req := range reqs {
		item := diary.DiaryEntryItem{
			ID:           req.ID,
			FoodID:       req.FoodID,
			MealSlot:     req.MealSlot,
			Grams:        req.Grams,
			ServingLabel: req.ServingLabel,
		}
		result = append(result, item)
		d.createdEntries = append(d.createdEntries, item)
		if d.recents != nil && req.FoodID != nil {
			_ = d.recents.UpsertRecent(ctx, userID, *req.FoodID, req.ServingLabel, req.Grams)
		}
	}
	return result, nil
}

func TestLibraryService_AddFromSaved(t *testing.T) {
	repo := newMockLibRepo()
	dService := &mockDiaryService{recents: repo}
	svc := NewService(repo, dService)

	userID := uuid.New()
	f1 := uuid.New()
	f2 := uuid.New()

	// 1. Create a saved meal with 2 items
	meal, err := svc.CreateSavedMeal(context.Background(), userID, CreateSavedMealRequest{
		Name: "Bữa trưa tăng cơ",
		Items: []SavedMealItem{
			{FoodID: f1, PortionLabel: "200 g cơm", Grams: 200},
			{FoodID: f2, PortionLabel: "150 g ức gà", Grams: 150},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 2. Add all items of saved meal into today's lunch
	today := diary.GetServerToday()
	entries, err := svc.AddFromSaved(context.Background(), userID, today, meal.ID, "lunch")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries created, got %d", len(entries))
	}

	// Check entries were sent to diary
	if len(dService.createdEntries) != 2 {
		t.Errorf("expected 2 entries in diary service, got %d", len(dService.createdEntries))
	}

	// Check recents were updated
	if len(repo.recents) != 2 {
		t.Errorf("expected 2 recent foods recorded, got %d", len(repo.recents))
	}
}

type errDiaryService struct {
	mockDiaryService
	err error
}

func (e *errDiaryService) CreateEntriesBatch(ctx context.Context, userID uuid.UUID, date string, reqs []diary.CreateEntryRequest) ([]diary.DiaryEntryItem, error) {
	return nil, e.err
}

func TestLibraryService_AddFromSaved_AtomicRollback(t *testing.T) {
	repo := newMockLibRepo()
	expectedErr := errors.New("atomic batch insert failed")
	dService := &errDiaryService{err: expectedErr}
	svc := NewService(repo, dService)

	userID := uuid.New()
	f1 := uuid.New()
	f2 := uuid.New()

	meal, err := svc.CreateSavedMeal(context.Background(), userID, CreateSavedMealRequest{
		Name: "Test meal",
		Items: []SavedMealItem{
			{FoodID: f1, PortionLabel: "100 g", Grams: 100},
			{FoodID: f2, PortionLabel: "200 g", Grams: 200},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	today := diary.GetServerToday()
	entries, err := svc.AddFromSaved(context.Background(), userID, today, meal.ID, "dinner")
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected error %v, got %v", expectedErr, err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries returned on error, got %d", len(entries))
	}
	// Assert all-or-nothing: no recents should be written when transaction fails
	if len(repo.recents) != 0 {
		t.Fatalf("expected 0 recents recorded on atomic rollback, got %d", len(repo.recents))
	}
}

func TestPutSavedMeal_KeepsTheClientIDAndReplaces(t *testing.T) {
	repo := &mockLibRepo{savedMeals: map[uuid.UUID]*SavedMeal{}}
	svc := NewService(repo, nil)
	user, id, food := uuid.New(), uuid.New(), uuid.New()

	first, err := svc.PutSavedMeal(context.Background(), user, id, CreateSavedMealRequest{Name: "Bữa sáng", Items: []SavedMealItem{{FoodID: food, Grams: 60}}})
	if err != nil || first.ID != id {
		t.Fatalf("got %v, %v; want the client id %v", first, err, id)
	}
	if first.Items[0].PortionLabel != "Khẩu phần" {
		t.Fatalf("a blank portion label gets the default, got %q", first.Items[0].PortionLabel)
	}
	again, err := svc.PutSavedMeal(context.Background(), user, id, CreateSavedMealRequest{Name: "Bữa sáng mới", Items: []SavedMealItem{{FoodID: food, Grams: 80}}})
	if err != nil || again.ID != id || len(repo.savedMeals) != 1 || repo.savedMeals[id].Name != "Bữa sáng mới" {
		t.Fatalf("sending the same id again must replace, not add: %v, %d meals", err, len(repo.savedMeals))
	}
	if _, err := svc.PutSavedMeal(context.Background(), user, id, CreateSavedMealRequest{Name: ""}); !errors.Is(err, ErrSavedMealNameRequired) {
		t.Fatalf("a blank name: got %v", err)
	}
}
