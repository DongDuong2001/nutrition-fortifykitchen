package library

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"nutrition-api/internal/diary"
)

var (
	ErrSavedMealNotFound     = errors.New("saved meal not found")
	ErrSavedMealNameRequired = errors.New("saved meal name is required")
)

type Service interface {
	GetFavourites(ctx context.Context, userID uuid.UUID) ([]FavouriteItem, error)
	AddFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error
	RemoveFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error

	GetRecents(ctx context.Context, userID uuid.UUID, limit int) ([]RecentItem, error)
	RecordRecentFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error

	GetSavedMeals(ctx context.Context, userID uuid.UUID) ([]SavedMeal, error)
	GetSavedMealByID(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) (*SavedMeal, error)
	CreateSavedMeal(ctx context.Context, userID uuid.UUID, req CreateSavedMealRequest) (*SavedMeal, error)
	DeleteSavedMeal(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) error
	AddFromSaved(ctx context.Context, userID uuid.UUID, targetDate string, mealID uuid.UUID, mealSlot string) ([]diary.DiaryEntryItem, error)
}

type libraryServiceImpl struct {
	repo         Repository
	diaryService diary.Service
}

func NewService(repo Repository, diaryService diary.Service) Service {
	return &libraryServiceImpl{
		repo:         repo,
		diaryService: diaryService,
	}
}

func (s *libraryServiceImpl) GetFavourites(ctx context.Context, userID uuid.UUID) ([]FavouriteItem, error) {
	return s.repo.GetFavourites(ctx, userID)
}

func (s *libraryServiceImpl) AddFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	return s.repo.AddFavourite(ctx, userID, foodID)
}

func (s *libraryServiceImpl) RemoveFavourite(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	return s.repo.RemoveFavourite(ctx, userID, foodID)
}

func (s *libraryServiceImpl) GetRecents(ctx context.Context, userID uuid.UUID, limit int) ([]RecentItem, error) {
	return s.repo.GetRecents(ctx, userID, limit)
}

func (s *libraryServiceImpl) RecordRecentFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, portionLabel string, grams float64) error {
	return s.repo.UpsertRecent(ctx, userID, foodID, portionLabel, grams)
}

func (s *libraryServiceImpl) GetSavedMeals(ctx context.Context, userID uuid.UUID) ([]SavedMeal, error) {
	return s.repo.GetSavedMeals(ctx, userID)
}

func (s *libraryServiceImpl) GetSavedMealByID(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) (*SavedMeal, error) {
	m, err := s.repo.GetSavedMealByID(ctx, userID, mealID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, ErrSavedMealNotFound
	}
	return m, nil
}

func (s *libraryServiceImpl) CreateSavedMeal(ctx context.Context, userID uuid.UUID, req CreateSavedMealRequest) (*SavedMeal, error) {
	if req.Name == "" {
		return nil, ErrSavedMealNameRequired
	}
	for i := range req.Items {
		if req.Items[i].Grams <= 0 && req.Items[i].ServingSizeG > 0 {
			req.Items[i].Grams = req.Items[i].ServingSizeG
		}
		if req.Items[i].PortionLabel == "" {
			req.Items[i].PortionLabel = "Khẩu phần"
		}
	}
	meal := &SavedMeal{
		Name:  req.Name,
		Items: req.Items,
	}
	return s.repo.CreateSavedMeal(ctx, userID, meal)
}

func (s *libraryServiceImpl) DeleteSavedMeal(ctx context.Context, userID uuid.UUID, mealID uuid.UUID) error {
	return s.repo.DeleteSavedMeal(ctx, userID, mealID)
}

func (s *libraryServiceImpl) AddFromSaved(ctx context.Context, userID uuid.UUID, targetDate string, mealID uuid.UUID, mealSlot string) ([]diary.DiaryEntryItem, error) {
	if err := diary.ValidateDateWritableCtx(ctx, targetDate); err != nil {
		return nil, err
	}

	meal, err := s.GetSavedMealByID(ctx, userID, mealID)
	if err != nil {
		return nil, err
	}

	if mealSlot == "" {
		mealSlot = "lunch"
	}

	reqs := make([]diary.CreateEntryRequest, 0, len(meal.Items))
	for _, item := range meal.Items {
		fID := item.FoodID
		reqs = append(reqs, diary.CreateEntryRequest{
			ID:           uuid.New(),
			Kind:         "food",
			FoodID:       &fID,
			MealSlot:     mealSlot,
			Grams:        item.Grams,
			ServingLabel: item.PortionLabel,
		})
	}

	addedEntries, err := s.diaryService.CreateEntriesBatch(ctx, userID, targetDate, reqs)
	if err != nil {
		return nil, err
	}

	// Upsert recents only after successful batch commit
	for _, item := range meal.Items {
		_ = s.repo.UpsertRecent(ctx, userID, item.FoodID, item.PortionLabel, item.Grams)
	}

	return addedEntries, nil
}
