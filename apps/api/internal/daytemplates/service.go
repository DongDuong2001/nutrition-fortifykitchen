package daytemplates

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

// FieldErrors is a 400 with a message per request field.
type FieldErrors map[string]string

func (e FieldErrors) Error() string {
	parts := make([]string, 0, len(e))
	for _, field := range []string{"name", "tag", "meals", "createdAt"} {
		if msg, ok := e[field]; ok {
			parts = append(parts, msg)
		}
	}
	return strings.Join(parts, "; ")
}

type DefaultService struct {
	repo Repository
	now  func() time.Time
}

func NewService(repo Repository) *DefaultService {
	return &DefaultService{repo: repo, now: time.Now}
}

func (s *DefaultService) List(ctx context.Context, userID uuid.UUID) ([]Template, error) {
	return s.repo.List(ctx, userID)
}

func (s *DefaultService) Put(ctx context.Context, userID, id uuid.UUID, req PutRequest) (*Template, error) {
	t, errs := Validate(id, req, s.now())
	if errs != nil {
		return nil, errs
	}
	return s.repo.Upsert(ctx, userID, t)
}

func (s *DefaultService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.Delete(ctx, userID, id)
}

func oneOf(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

// Validate checks a PUT body and returns the template to store: the name trimmed, every field in range. Every invalid
// field gets its own message (the first problem found in it).
func Validate(id uuid.UUID, req PutRequest, now time.Time) (Template, FieldErrors) {
	errs := FieldErrors{}
	t := Template{ID: id, Name: strings.TrimSpace(req.Name), Tag: req.Tag, CreatedAt: now}

	if n := utf8.RuneCountInString(t.Name); n < 1 || n > MaxNameRunes {
		errs["name"] = fmt.Sprintf("name must be 1–%d characters", MaxNameRunes)
	}
	if !oneOf(Tags, t.Tag) {
		errs["tag"] = "tag must be one of: " + strings.Join(Tags, ", ")
	}
	if req.CreatedAt != nil {
		created, err := time.Parse(time.RFC3339Nano, *req.CreatedAt)
		switch {
		case err != nil:
			errs["createdAt"] = "createdAt must be an RFC 3339 time"
		case created.After(now):
			// A device clock ahead of the server: the server's time, so the list order stays sane
		default:
			t.CreatedAt = created
		}
	}
	meals, msg := parseMeals(req.Meals)
	if msg != "" {
		errs["meals"] = msg
	}
	t.Meals = meals

	if len(errs) > 0 {
		return Template{}, errs
	}
	return t, nil
}

func parseMeals(raw json.RawMessage) ([]Meal, string) {
	shape := fmt.Sprintf(`meals must be 1–%d of {"slot","items":[{"foodId","servingLabel","grams"}]}`, MaxMeals)
	if len(bytes.TrimSpace(raw)) == 0 || string(bytes.TrimSpace(raw)) == "null" {
		return nil, shape
	}
	var in []struct {
		Slot  *string `json:"slot"`
		Items []struct {
			FoodID       *string  `json:"foodId"`
			ServingLabel *string  `json:"servingLabel"`
			Grams        *float64 `json:"grams"`
		} `json:"items"`
	}
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, shape
	}
	if len(in) < 1 || len(in) > MaxMeals {
		return nil, shape
	}
	seen := map[string]bool{}
	meals := make([]Meal, 0, len(in))
	for i, m := range in {
		if m.Slot == nil || !oneOf(Slots, *m.Slot) {
			return nil, fmt.Sprintf("meals[%d].slot must be one of: %s", i, strings.Join(Slots, ", "))
		}
		if seen[*m.Slot] {
			return nil, fmt.Sprintf("meals[%d].slot %q is already in the template", i, *m.Slot)
		}
		seen[*m.Slot] = true
		if len(m.Items) < 1 || len(m.Items) > MaxItemsPerMeal {
			return nil, fmt.Sprintf("meals[%d].items must hold 1–%d foods", i, MaxItemsPerMeal)
		}
		items := make([]Item, 0, len(m.Items))
		for j, it := range m.Items {
			at := fmt.Sprintf("meals[%d].items[%d]", i, j)
			switch {
			case it.FoodID == nil || strings.TrimSpace(*it.FoodID) == "" || len(*it.FoodID) > MaxFoodIDLen:
				return nil, fmt.Sprintf("%s.foodId must be a non-empty id of at most %d characters", at, MaxFoodIDLen)
			case it.ServingLabel == nil || utf8.RuneCountInString(*it.ServingLabel) > MaxLabelRunes:
				return nil, fmt.Sprintf("%s.servingLabel must be text of at most %d characters", at, MaxLabelRunes)
			case it.Grams == nil || math.IsNaN(*it.Grams) || *it.Grams < 0 || *it.Grams > MaxGrams:
				return nil, fmt.Sprintf("%s.grams must be between 0 and %d", at, MaxGrams)
			}
			items = append(items, Item{FoodID: *it.FoodID, ServingLabel: *it.ServingLabel, Grams: *it.Grams})
		}
		meals = append(meals, Meal{Slot: *m.Slot, Items: items})
	}
	return meals, ""
}
