package diary

import (
	"time"

	"github.com/google/uuid"
)

type DiaryEntryItem struct {
	ID           uuid.UUID           `json:"id"`
	FoodID       *uuid.UUID          `json:"food_id"`
	FoodName     string              `json:"food_name"`
	Kind         string              `json:"kind"`
	MealSlot     string              `json:"meal_slot"`
	ServingLabel string              `json:"serving_label"`
	Grams        float64             `json:"grams"`
	Calories     float64             `json:"calories"`
	Nutrients    map[string]*float64 `json:"nutrients"`
	CreatedAt    time.Time           `json:"created_at"`
}

type MealSlotSummary struct {
	Slot          string           `json:"slot"`
	NameVi        string           `json:"name_vi"`
	TotalKcal     float64          `json:"total_kcal"`
	TargetMinKcal float64          `json:"target_min_kcal"`
	Entries       []DiaryEntryItem `json:"entries"`
}

type DaySummaryResponse struct {
	Date            string              `json:"date"`
	TrainingMinutes int                 `json:"training_minutes"`
	IsReadOnly      bool                `json:"is_read_only"`
	Summary         map[string]*float64 `json:"summary"`
	Targets         any                 `json:"targets,omitempty"`
	Meals           []MealSlotSummary   `json:"meals"`
}

type CreateEntryRequest struct {
	ID           uuid.UUID  `json:"id"`
	Kind         string     `json:"kind"` // "food" or "quick"
	FoodID       *uuid.UUID `json:"food_id,omitempty"`
	MealSlot     string     `json:"meal_slot"`
	Grams        float64    `json:"grams,omitempty"`
	ServingLabel string     `json:"serving_label,omitempty"`
	Calories     float64    `json:"calories,omitempty"`
}

type UpdateEntryRequest struct {
	MealSlot     *string  `json:"meal_slot,omitempty"`
	Grams        *float64 `json:"grams,omitempty"`
	ServingLabel *string  `json:"serving_label,omitempty"`
	Calories     *float64 `json:"calories,omitempty"`
	Restore      *bool    `json:"restore,omitempty"`
}

type CopyYesterdayRequest struct {
	SourceDate string   `json:"source_date"`
	MealSlots  []string `json:"meal_slots"`
}

type CopyYesterdayResponse struct {
	CopiedCount int              `json:"copied_count"`
	Entries     []DiaryEntryItem `json:"entries"`
}

type SetTrainingRequest struct {
	TrainingMinutes int `json:"training_minutes"`
}

type SetTrainingResponse struct {
	Date            string `json:"date"`
	TrainingMinutes int    `json:"training_minutes"`
}
