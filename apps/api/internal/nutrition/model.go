package nutrition

import (
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
	Brand            *string                 `json:"brand,omitempty"`
	TipVi            *string                 `json:"tip_vi,omitempty"`
	IsCustom         bool                    `json:"is_custom"`
	Servings         []Portion               `json:"servings"`
	Per100gNutrients map[string]*float64     `json:"per_100g_nutrients"`
	CreatedAt        time.Time               `json:"created_at"`
}

type FoodSearchFilter struct {
	Query    string
	Category string
	Page     int
	Limit    int
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
	NameVi      string              `json:"name_vi"`
	ServingUnit string              `json:"serving_unit"`
	ServingSize float64             `json:"serving_size"`
	Calories    float64             `json:"calories"`
	Protein     float64             `json:"protein"`
	Carbs       float64             `json:"carbs"`
	Fat         float64             `json:"fat"`
	Micros      map[string]*float64 `json:"micros,omitempty"`
}
