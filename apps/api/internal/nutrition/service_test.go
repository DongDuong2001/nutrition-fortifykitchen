package nutrition

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/uuid"
)

type mockNutritionRepo struct {
	foods      map[uuid.UUID]*FoodDetail
	customFood *FoodDetail
}

func (m *mockNutritionRepo) SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error) {
	var items []FoodDetail
	for _, f := range m.foods {
		items = append(items, *f)
	}
	return &FoodSearchResponse{
		Items: items,
		Total: len(items),
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (m *mockNutritionRepo) GetFoodByID(ctx context.Context, id uuid.UUID) (*FoodDetail, error) {
	if f, ok := m.foods[id]; ok {
		return f, nil
	}
	return nil, nil
}

func (m *mockNutritionRepo) GetFoodsRichIn(ctx context.Context, nutrient string, limit int) ([]RichInFoodItem, error) {
	var items []RichInFoodItem
	for _, f := range m.foods {
		if val, ok := f.Per100gNutrients[nutrient]; ok && val != nil && *val > 0 {
			items = append(items, RichInFoodItem{
				FoodID:        f.ID,
				NameVi:        f.NameVi,
				Category:      f.Category,
				AmountPer100g: *val,
			})
		}
	}
	return items, nil
}

func (m *mockNutritionRepo) CreateCustomFood(ctx context.Context, userID uuid.UUID, food *FoodDetail, portions []Portion) (*FoodDetail, error) {
	food.Servings = portions
	m.customFood = food
	return food, nil
}

func (m *mockNutritionRepo) DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	return nil
}

func TestNutritionService_CreateCustomFood_Scaling(t *testing.T) {
	repo := &mockNutritionRepo{foods: make(map[uuid.UUID]*FoodDetail)}
	svc := NewService(repo)

	cal := 150.0
	pro := 15.0
	carb := 30.0
	fat := 7.5
	ca := 60.0
	req := CreateCustomFoodRequest{
		NameVi:      "Bánh mì trứng",
		ServingSize: 150, // Factor = 100 / 150 = 0.666667
		ServingUnit: "g",
		Calories:    &cal,  // 150 * (100 / 150) = 100 kcal per 100g
		Protein:     &pro,  // 15 * 0.666667 = 10 g
		Carbs:       &carb, // 30 * 0.666667 = 20 g
		Fat:         &fat,  // 7.5 * 0.666667 = 5 g
		Micros: map[string]*float64{
			"calcium":   &ca, // 60 * 0.666667 = 40 mg
			"potassium": nil, // unknown must remain nil
		},
	}

	userID := uuid.New()
	res, err := svc.CreateCustomFood(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.NameVi != "Bánh mì trứng" {
		t.Errorf("expected name 'Bánh mì trứng', got %s", res.NameVi)
	}

	// Verify scaling to 100g
	per100g := res.Per100gNutrients
	if per100g["calories"] == nil || *per100g["calories"] != 100 {
		t.Errorf("expected 100 kcal per 100g, got %v", per100g["calories"])
	}
	if per100g["protein"] == nil || *per100g["protein"] != 10 {
		t.Errorf("expected 10 g protein per 100g, got %v", per100g["protein"])
	}
	if per100g["calcium"] == nil || *per100g["calcium"] != 40 {
		t.Errorf("expected 40 mg calcium per 100g, got %v", per100g["calcium"])
	}

	// Verify null stays null
	if per100g["potassium"] != nil {
		t.Errorf("expected potassium to remain nil, got %v", per100g["potassium"])
	}

	// Verify portions created
	if len(res.Servings) != 2 {
		t.Fatalf("expected 2 servings, got %d", len(res.Servings))
	}
	if res.Servings[0].LabelVi != "150 g" || res.Servings[0].Grams != 150 {
		t.Errorf("unexpected first portion: %+v", res.Servings[0])
	}
	if res.Servings[0].ID == uuid.Nil {
		t.Errorf("expected non-zero UUID for first portion, got %v", res.Servings[0].ID)
	}
	if res.Servings[1].LabelVi != "100 g" || res.Servings[1].Grams != 100 {
		t.Errorf("unexpected second portion: %+v", res.Servings[1])
	}
	if res.Servings[1].ID == uuid.Nil {
		t.Errorf("expected non-zero UUID for second portion, got %v", res.Servings[1].ID)
	}
}

func TestNutritionService_CreateCustomFood_NullNutrientsNotCoercedToZero(t *testing.T) {
	repo := &mockNutritionRepo{foods: make(map[uuid.UUID]*FoodDetail)}
	svc := NewService(repo)

	// Custom food created without specifying calories or macros
	req := CreateCustomFoodRequest{
		NameVi:      "Món thử nghiệm không rõ calo",
		ServingSize: 100,
		ServingUnit: "g",
		Calories:    nil,
		Protein:     nil,
		Carbs:       nil,
		Fat:         nil,
	}

	userID := uuid.New()
	res, err := svc.CreateCustomFood(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	per100g := res.Per100gNutrients
	if per100g["calories"] != nil {
		t.Errorf("expected calories to be nil, got %v", *per100g["calories"])
	}
	if per100g["energy"] != nil {
		t.Errorf("expected energy to be nil, got %v", *per100g["energy"])
	}
	if per100g["protein"] != nil {
		t.Errorf("expected protein to be nil, got %v", *per100g["protein"])
	}
	if per100g["carbs"] != nil {
		t.Errorf("expected carbs to be nil, got %v", *per100g["carbs"])
	}
	if per100g["fat"] != nil {
		t.Errorf("expected fat to be nil, got %v", *per100g["fat"])
	}
}

func TestNutritionService_RichIn_Units(t *testing.T) {
	foodID := uuid.New()
	ca := 120.0
	repo := &mockNutritionRepo{
		foods: map[uuid.UUID]*FoodDetail{
			foodID: {
				ID:       foodID,
				NameVi:   "Sữa tươi",
				Category: "sua",
				Per100gNutrients: map[string]*float64{
					"calcium": &ca,
				},
			},
		},
	}
	svc := NewService(repo)

	res, err := svc.GetFoodsRichIn(context.Background(), "calcium", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Unit != "mg" {
		t.Errorf("expected unit 'mg' for calcium, got %s", res.Unit)
	}
	if len(res.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(res.Items))
	}
	if res.Items[0].AmountPer100g != 120 {
		t.Errorf("expected 120 mg per 100g, got %f", res.Items[0].AmountPer100g)
	}
}

func TestNutritionService_RichIn_SQLInjectionRejected(t *testing.T) {
	repo := &mockNutritionRepo{foods: make(map[uuid.UUID]*FoodDetail)}
	svc := NewService(repo)

	maliciousNutrient := "calcium'; DROP TABLE foods;--"
	_, err := svc.GetFoodsRichIn(context.Background(), maliciousNutrient, 10)
	if err == nil || !errors.Is(err, ErrInvalidNutrient) {
		t.Fatalf("expected ErrInvalidNutrient, got %v", err)
	}

	handler := NewHandler(svc)
	req := httptest.NewRequest("GET", "/api/v1/foods/rich-in?nutrient="+url.QueryEscape(maliciousNutrient), nil)
	rec := httptest.NewRecorder()

	handler.GetFoodsRichIn(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request, got %d", rec.Code)
	}
}

func TestNutritionService_SearchFoods_BeveragesAndDishes(t *testing.T) {
	nuocMiaID := uuid.New()
	phoID := uuid.New()
	sourceID := "drink-nuoc-mia"
	phoSourceID := "food-pho-bo"

	repo := &mockNutritionRepo{
		foods: map[uuid.UUID]*FoodDetail{
			nuocMiaID: {
				ID:       nuocMiaID,
				NameVi:   "Nước mía",
				Category: "beverage",
				Source:   "vn_fct",
				SourceID: &sourceID,
				Per100gNutrients: map[string]*float64{
					"calories": ptrFloat(75),
					"iron":     ptrFloat(0.5),
					"selenium": nil, // unknown nutrient must stay nil
				},
				Servings: []Portion{
					{LabelVi: "1 ly vừa (350 ml)", Grams: 350},
					{LabelVi: "100 g", Grams: 100},
				},
			},
			phoID: {
				ID:       phoID,
				NameVi:   "Phở bò tái",
				Category: "mon_viet",
				Source:   "vn_fct",
				SourceID: &phoSourceID,
				Per100gNutrients: map[string]*float64{
					"calories": ptrFloat(120),
					"protein":  ptrFloat(8.5),
				},
				Servings: []Portion{
					{LabelVi: "1 tô vừa (550 g)", Grams: 550},
					{LabelVi: "100 g", Grams: 100},
				},
			},
		},
	}
	svc := NewService(repo)

	// Filter by category beverage
	res, err := svc.SearchFoods(context.Background(), FoodSearchFilter{Category: "beverage"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Items) == 0 {
		t.Fatalf("expected items in result, got 0")
	}

	// Verify beverage fields
	var foundNuocMia bool
	for _, item := range res.Items {
		if item.NameVi == "Nước mía" {
			foundNuocMia = true
			if item.Category != "beverage" {
				t.Errorf("expected category beverage, got %s", item.Category)
			}
			if item.SourceID == nil || *item.SourceID != "drink-nuoc-mia" {
				t.Errorf("expected source_id drink-nuoc-mia, got %v", item.SourceID)
			}
			if item.Per100gNutrients["selenium"] != nil {
				t.Errorf("expected unknown nutrient to be nil, got %v", item.Per100gNutrients["selenium"])
			}
			if len(item.Servings) < 2 {
				t.Errorf("expected at least 2 portions, got %d", len(item.Servings))
			}
		}
	}
	if !foundNuocMia {
		t.Errorf("expected to find Nước mía in search results")
	}
}

func ptrFloat(v float64) *float64 {
	return &v
}

