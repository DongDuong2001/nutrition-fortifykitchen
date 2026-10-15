package library

import (
	"time"

	"github.com/google/uuid"
)

type FavouriteItem struct {
	FoodID   uuid.UUID `json:"food_id"`
	NameVi   string    `json:"name_vi"`
	Category string    `json:"category"`
	AddedAt  time.Time `json:"added_at"`
}

type RecentItem struct {
	FoodID           uuid.UUID `json:"food_id"`
	NameVi           string    `json:"name_vi"`
	LastServingLabel string    `json:"last_serving_label"`
	LastGrams        float64   `json:"last_grams"`
	LastLoggedAt     time.Time `json:"last_logged_at"`
}

type SavedMealItem struct {
	ID           uuid.UUID `json:"id,omitempty"`
	FoodID       uuid.UUID `json:"food_id"`
	FoodName     string    `json:"food_name,omitempty"`
	PortionLabel string    `json:"portion_label"`
	Grams        float64   `json:"grams"`
	ServingSizeG float64   `json:"serving_size_g,omitempty"`
	Sort         int       `json:"sort"`
}

type SavedMeal struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	TotalKcal float64         `json:"total_kcal,omitempty"`
	Items     []SavedMealItem `json:"items"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CreateSavedMealRequest struct {
	Name  string          `json:"name"`
	Items []SavedMealItem `json:"items"`
}

type AddFromSavedResponse struct {
	AddedCount int `json:"added_count"`
	Entries    any `json:"entries"`
}
