package nutrition

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Portion struct {
	ID      uuid.UUID `json:"id,omitempty"`
	LabelVi string    `json:"label"`
	Grams   float64   `json:"grams"`
}

type FoodDetail struct {
	ID               uuid.UUID               `json:"id"`
	NameVi           string                  `json:"name_vi"`
	NameEn           *string                 `json:"name_en,omitempty"`
	Category         string                  `json:"category"`
	Source           string                  `json:"source"`
	SourceID         *string                 `json:"source_id,omitempty"`
	Brand            *string                 `json:"brand,omitempty"`
	TipVi            *string                 `json:"tip_vi,omitempty"`
	IsCustom         bool                    `json:"is_custom"`
	CreatedBy        *uuid.UUID              `json:"created_by,omitempty"`
	Servings         []Portion               `json:"servings"`
	Per100gNutrients map[string]*float64     `json:"per_100g_nutrients"`
	CreatedAt        time.Time               `json:"created_at"`
}

type FoodSearchFilter struct {
	Query    string
	Category string
	Page     int
	Limit    int
	UserID   *uuid.UUID
}

type FoodSearchResponse struct {
	Items []FoodDetail `json:"items"`
	Total int          `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}

type RichInFoodItem struct {
	FoodID          uuid.UUID `json:"food_id"`
	NameVi          string    `json:"name_vi"`
	Category        string    `json:"category"`
	AmountPer100g   float64   `json:"amount_per_100g"`
	StandardServing *struct {
		Label  string  `json:"label"`
		Grams  float64 `json:"grams"`
		Amount float64 `json:"amount"`
	} `json:"standard_serving,omitempty"`
}

type RichInResponse struct {
	Nutrient string           `json:"nutrient"`
	Unit     string           `json:"unit"`
	Items    []RichInFoodItem `json:"items"`
}

type CreateCustomFoodRequest struct {
	NameVi         string              `json:"name_vi"`
	NameViAlt      string              `json:"nameVi,omitempty"`
	ServingUnit    string              `json:"serving_unit"`
	ServingUnitAlt string              `json:"servingUnit,omitempty"`
	ServingSize    float64             `json:"serving_size"`
	ServingSizeAlt float64             `json:"servingSize,omitempty"`
	Calories       *float64            `json:"calories,omitempty"`
	Protein        *float64            `json:"protein,omitempty"`
	Carbs          *float64            `json:"carbs,omitempty"`
	Fat            *float64            `json:"fat,omitempty"`
	Micros         map[string]*float64 `json:"micros,omitempty"`
	OneOff         bool                `json:"one_off,omitempty"`
	IsOneOff       bool                `json:"is_one_off,omitempty"`
}

var ErrInvalidNutrient = errors.New("invalid nutrient identifier")
