package library

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"nutrition-api/internal/diary"
)

var (
	ErrSavedMealNotFound = errors.New("saved meal not found")
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
		return nil, errors.New("saved meal name is required")
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
	if err := diary.ValidateDateWritable(targetDate); err != nil {
		return nil, err
	}

	meal, err := s.GetSavedMealByID(ctx, userID, mealID)
	if err != nil {
		return nil, err
	}

	if mealSlot == "" {
		mealSlot = "lunch"
	}

	var addedEntries []diary.DiaryEntryItem
	for _, item := range meal.Items {
		fID := item.FoodID
		entryReq := diary.CreateEntryRequest{
			ID:           uuid.New(),
			Kind:         "food",
			FoodID:       &fID,
			MealSlot:     mealSlot,
			Grams:        item.Grams,
			ServingLabel: item.PortionLabel,
		}

		entry, _, err := s.diaryService.CreateEntry(ctx, userID, targetDate, entryReq)
		if err == nil && entry != nil {
			addedEntries = append(addedEntries, *entry)
			// Upsert recent food
			_ = s.repo.UpsertRecent(ctx, userID, item.FoodID, item.PortionLabel, item.Grams)
		}
	}

	return addedEntries, nil
}
