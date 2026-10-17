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
	GetFoodByID(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*FoodDetail, error)
	GetFoodsRichIn(ctx context.Context, nutrient string, limit int, userID *uuid.UUID) (*RichInResponse, error)
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

func (s *nutritionService) GetFoodByID(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*FoodDetail, error) {
	food, err := s.repo.GetFoodByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if food == nil {
		return nil, ErrFoodNotFound
	}
	return food, nil
}

// ValidNutrients defines all 57 tracked nutrient identifiers in the catalog mapped to their default unit
var ValidNutrients = map[string]string{
	// general
	"energy": "kcal", "water": "g", "alcohol": "g", "caffeine": "mg", "oxalate": "mg", "phytate": "mg",
	// carbs
	"carbs": "g", "net_carbs": "g", "fiber": "g", "insoluble_fiber": "g", "soluble_fiber": "g",
	"starch": "g", "sugars": "g", "added_sugars": "g",
	// lipids
	"fat": "g", "monounsaturated_fat": "g", "polyunsaturated_fat": "g",
	"omega3": "g", "ala": "g", "dha": "g", "epa": "g", "omega6": "g",
	"saturated_fat": "g", "trans_fat": "g", "cholesterol": "mg",
	// protein
	"protein": "g", "cystine": "g", "histidine": "g", "isoleucine": "g", "leucine": "g",
	"lysine": "g", "methionine": "g", "phenylalanine": "g", "threonine": "g",
	"tryptophan": "g", "tyrosine": "g", "valine": "g",
	// vitamins
	"b1": "mg", "b2": "mg", "b3": "mg", "b5": "mg", "b6": "mg", "b12": "µg",
	"folate": "µg", "vitamin_a": "µg", "vitamin_c": "mg", "vitamin_d": "µg",
	"vitamin_e": "mg", "vitamin_k": "µg",
	// minerals
	"calcium": "mg", "copper": "mg", "iron": "mg", "magnesium": "mg",
	"manganese": "mg", "phosphorus": "mg", "potassium": "mg", "selenium": "µg",
	"sodium": "mg", "zinc": "mg",
}

func (s *nutritionService) GetFoodsRichIn(ctx context.Context, nutrient string, limit int, userID *uuid.UUID) (*RichInResponse, error) {
	unit, ok := ValidNutrients[nutrient]
	if !ok {
		return nil, ErrInvalidNutrient
	}

	items, err := s.repo.GetFoodsRichIn(ctx, nutrient, limit, userID)
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
	if req.NameVi == "" && req.NameViAlt != "" {
		req.NameVi = req.NameViAlt
	}
	if req.ServingUnit == "" && req.ServingUnitAlt != "" {
		req.ServingUnit = req.ServingUnitAlt
	}
	if req.ServingSize <= 0 && req.ServingSizeAlt > 0 {
		req.ServingSize = req.ServingSizeAlt
	}

	if req.NameVi == "" {
		return nil, errors.New("name_vi is required")
	}
	if req.ServingSize <= 0 {
		return nil, errors.New("serving_size must be greater than zero")
	}
	if (req.Calories != nil && *req.Calories < 0) ||
		(req.Protein != nil && *req.Protein < 0) ||
		(req.Carbs != nil && *req.Carbs < 0) ||
		(req.Fat != nil && *req.Fat < 0) {
		return nil, errors.New("macronutrients cannot be negative")
	}

	// Scale factor to convert user's portion to 100g standard
	factor := 100.0 / req.ServingSize

	per100g := make(map[string]*float64)
	if req.Calories != nil {
		calVal := round(*req.Calories * factor)
		per100g["energy"] = &calVal
		per100g["calories"] = &calVal
	} else {
		per100g["energy"] = nil
		per100g["calories"] = nil
	}
	if req.Protein != nil {
		proVal := round(*req.Protein * factor)
		per100g["protein"] = &proVal
	} else {
		per100g["protein"] = nil
	}
	if req.Carbs != nil {
		carbVal := round(*req.Carbs * factor)
		per100g["carbs"] = &carbVal
	} else {
		per100g["carbs"] = nil
	}
	if req.Fat != nil {
		fatVal := round(*req.Fat * factor)
		per100g["fat"] = &fatVal
	} else {
		per100g["fat"] = nil
	}

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
		{ID: uuid.New(), LabelVi: servingLabel, Grams: req.ServingSize},
		{ID: uuid.New(), LabelVi: "100 g", Grams: 100},
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
