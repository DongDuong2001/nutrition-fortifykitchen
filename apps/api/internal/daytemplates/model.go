package daytemplates

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Ngày ăn mẫu (migration 000016): a whole day of meals a user saved, copied back into an empty day by the web. The id is
// made by the client, so a save sent again (offline outbox) is the same row. JSON is camelCase, like the web's
// lib/day-templates.ts.

const (
	MaxLive         = 50
	MaxNameRunes    = 60
	MaxMeals        = 5
	MaxItemsPerMeal = 40
	MaxGrams        = 5000
	MaxFoodIDLen    = 128
	MaxLabelRunes   = 80
	// MaxBodyBytes bounds a PUT body: 5 meals × 40 items fit in well under this.
	MaxBodyBytes = 64 << 10
)

var (
	Tags  = []string{"tap", "nghi", "khac"}
	Slots = []string{"breakfast", "lunch", "pre_workout", "snack", "dinner"}

	// ErrIDConflict: the id is a template of another user.
	ErrIDConflict = errors.New("day template id belongs to another user")
	// ErrLimit: the user already has MaxLive live templates.
	ErrLimit = errors.New("day template limit reached")
)

type Item struct {
	FoodID       string  `json:"foodId"`
	ServingLabel string  `json:"servingLabel"`
	Grams        float64 `json:"grams"`
}

type Meal struct {
	Slot  string `json:"slot"`
	Items []Item `json:"items"`
}

type Template struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Tag       string    `json:"tag"`
	Meals     []Meal    `json:"meals"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PutRequest is the body of PUT /day-templates/{id}. createdAt is optional: a template saved on the device before it
// could be uploaded keeps its own date (and its place in the list); absent, the server's time is used.
type PutRequest struct {
	Name      string          `json:"name"`
	Tag       string          `json:"tag"`
	Meals     json.RawMessage `json:"meals"`
	CreatedAt *string         `json:"createdAt"`
}

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]Template, error)
	// Upsert creates or replaces the template; ErrIDConflict or ErrLimit when it may not.
	Upsert(ctx context.Context, userID uuid.UUID, t Template) (*Template, error)
	// Delete soft-deletes the user's template; deleting one that is gone (or never was) is not an error.
	Delete(ctx context.Context, userID, id uuid.UUID) error
}

type Service interface {
	List(ctx context.Context, userID uuid.UUID) ([]Template, error)
	Put(ctx context.Context, userID, id uuid.UUID, req PutRequest) (*Template, error)
	Delete(ctx context.Context, userID, id uuid.UUID) error
}
