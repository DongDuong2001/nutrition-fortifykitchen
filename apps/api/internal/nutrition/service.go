package nutrition

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"
)

var (
	ErrFoodNotFound       = errors.New("food not found")
	ErrInvalidNutrientKey = errors.New("invalid nutrient key")
)

type Service interface {
	SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error)
	GetFoodByID(ctx context.Context, id uuid.UUID) (*FoodDetail, error)
	GetFoodsRichIn(ctx context.Context, nutrient string, limit int) (*RichInResponse, error)
	CreateCustomFood(ctx context.Context, userID uuid.UUID, req CreateCustomFoodRequest) (*FoodDetail, error)
	DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error
}

type nutritionService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &nutritionService{repo: repo}
}

func (s *nutritionService) SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error) {
	return s.repo.SearchFoods(ctx, filter)
}

func (s *nutritionService) GetFoodByID(ctx context.Context, id uuid.UUID) (*FoodDetail, error) {
	food, err := s.repo.GetFoodByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if food == nil {
		return nil, ErrFoodNotFound
	}
	return food, nil
}

func (s *nutritionService) GetFoodsRichIn(ctx context.Context, nutrient string, limit int) (*RichInResponse, error) {
	// Nutrient units mapping
	units := map[string]string{
		"calcium":    "mg",
		"iron":       "mg",
		"potassium":  "mg",
		"magnesium":  "mg",
		"zinc":       "mg",
		"vitamin_d":  "µg",
		"protein":    "g",
		"fiber":      "g",
		"vitamin_c":  "mg",
		"vitamin_a":  "µg",
		"sodium":     "mg",
		"folate":     "µg",
		"b12":        "µg",
	}

	unit, ok := units[nutrient]
	if !ok {
		unit = "mg"
	}

	items, err := s.repo.GetFoodsRichIn(ctx, nutrient, limit)
	if err != nil {
		return nil, err
	}

	return &RichInResponse{
		Nutrient: nutrient,
		Unit:     unit,
		Items:    items,
	}, nil
}

func round(val float64) float64 {
	return math.Round(val*100) / 100
}

func (s *nutritionService) CreateCustomFood(ctx context.Context, userID uuid.UUID, req CreateCustomFoodRequest) (*FoodDetail, error) {
	if req.NameVi == "" {
		return nil, errors.New("name_vi is required")
	}
	if req.ServingSize <= 0 {
		return nil, errors.New("serving_size must be greater than zero")
	}
	if req.Calories < 0 || req.Protein < 0 || req.Carbs < 0 || req.Fat < 0 {
		return nil, errors.New("macronutrients cannot be negative")
	}

	// Scale factor to convert user's portion to 100g standard
	factor := 100.0 / req.ServingSize

	per100g := make(map[string]*float64)
	calVal := round(req.Calories * factor)
	proVal := round(req.Protein * factor)
	carbVal := round(req.Carbs * factor)
	fatVal := round(req.Fat * factor)

	per100g["energy"] = &calVal
	per100g["calories"] = &calVal
	per100g["protein"] = &proVal
	per100g["carbs"] = &carbVal
	per100g["fat"] = &fatVal

	for k, v := range req.Micros {
		if v != nil {
			scaled := round(*v * factor)
			per100g[k] = &scaled
		} else {
			per100g[k] = nil
		}
	}

	servingLabel := fmt.Sprintf("%g %s", req.ServingSize, req.ServingUnit)
	if req.ServingUnit == "" {
		servingLabel = fmt.Sprintf("%g g", req.ServingSize)
	}

	portions := []Portion{
		{LabelVi: servingLabel, Grams: req.ServingSize},
		{LabelVi: "100 g", Grams: 100},
	}

	food := &FoodDetail{
		ID:               uuid.New(),
		NameVi:           req.NameVi,
		Category:         "cua_toi",
		Source:           "custom",
		IsCustom:         true,
		Per100gNutrients: per100g,
	}

	return s.repo.CreateCustomFood(ctx, userID, food, portions)
}

func (s *nutritionService) DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	return s.repo.DeleteCustomFood(ctx, userID, foodID)
}
