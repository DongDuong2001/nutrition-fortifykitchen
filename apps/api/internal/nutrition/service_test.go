package nutrition

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"nutrition-api/internal/auth"
)

type mockNutritionRepo struct {
	foods       map[uuid.UUID]*FoodDetail
	customFood  *FoodDetail
	updatedFood *FoodDetail
	updatedID   uuid.UUID
	updateCalls int
	updateErr   error
}

func (m *mockNutritionRepo) SearchFoods(ctx context.Context, filter FoodSearchFilter) (*FoodSearchResponse, error) {
	var items []FoodDetail
	for _, f := range m.foods {
		if !f.IsCustom || (filter.UserID != nil && f.CreatedBy != nil && *f.CreatedBy == *filter.UserID) {
			items = append(items, *f)
		}
	}
	return &FoodSearchResponse{
		Items: items,
		Total: len(items),
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (m *mockNutritionRepo) GetFoodByID(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*FoodDetail, error) {
	if f, ok := m.foods[id]; ok {
		if !f.IsCustom || (userID != nil && f.CreatedBy != nil && *f.CreatedBy == *userID) {
			return f, nil
		}
	}
	return nil, nil
}

func (m *mockNutritionRepo) GetFoodsRichIn(ctx context.Context, nutrient string, limit int, userID *uuid.UUID) ([]RichInFoodItem, error) {
	var items []RichInFoodItem
	for _, f := range m.foods {
		if !f.IsCustom || (userID != nil && f.CreatedBy != nil && *f.CreatedBy == *userID) {
			if val, ok := f.Per100gNutrients[nutrient]; ok && val != nil && *val > 0 {
				items = append(items, RichInFoodItem{
					FoodID:        f.ID,
					NameVi:        f.NameVi,
					Category:      f.Category,
					AmountPer100g: *val,
				})
			}
		}
	}
	return items, nil
}

func (m *mockNutritionRepo) CreateCustomFood(ctx context.Context, userID uuid.UUID, food *FoodDetail, portions []Portion) (*FoodDetail, error) {
	food.Servings = portions
	food.IsCustom = true
	food.CreatedBy = &userID
	m.customFood = food
	if m.foods == nil {
		m.foods = make(map[uuid.UUID]*FoodDetail)
	}
	m.foods[food.ID] = food
	return food, nil
}

func (m *mockNutritionRepo) DeleteCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID) error {
	return nil
}

// UpdateCustomFood records what the service passed down; err stands in for "no such live custom food of this user".
func (m *mockNutritionRepo) UpdateCustomFood(ctx context.Context, userID uuid.UUID, foodID uuid.UUID, food *FoodDetail, portions []Portion) (*FoodDetail, error) {
	m.updateCalls++
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	food.Servings = portions
	food.IsCustom = true
	food.CreatedBy = &userID
	m.updatedFood = food
	m.updatedID = foodID
	return food, nil
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

	res, err := svc.GetFoodsRichIn(context.Background(), "calcium", 10, nil)
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
	_, err := svc.GetFoodsRichIn(context.Background(), maliciousNutrient, 10, nil)
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

func TestCustomFood_PrivacyAndVisibility(t *testing.T) {
	userA := uuid.New()
	userB := uuid.New()

	standardFoodID := uuid.New()
	standardFood := &FoodDetail{
		ID:       standardFoodID,
		NameVi:   "Phở bò tái",
		Category: "mon_viet",
		IsCustom: false,
		Per100gNutrients: map[string]*float64{
			"protein": ptrFloat(15.0),
		},
	}

	repo := &mockNutritionRepo{
		foods: map[uuid.UUID]*FoodDetail{
			standardFoodID: standardFood,
		},
	}
	svc := NewService(repo)

	// User A creates a custom food
	cal := 250.0
	pro := 25.0
	customReq := CreateCustomFoodRequest{
		NameVi:      "Cơm chiên User A",
		ServingSize: 100,
		ServingUnit: "g",
		Calories:    &cal,
		Protein:     &pro,
	}
	createdFood, err := svc.CreateCustomFood(context.Background(), userA, customReq)
	if err != nil {
		t.Fatalf("failed to create custom food: %v", err)
	}
	customFoodID := createdFood.ID

	// 1. Search / List visibility test
	t.Run("SearchFoods visibility", func(t *testing.T) {
		// User A searches: must see standard food AND their custom food
		resA, err := svc.SearchFoods(context.Background(), FoodSearchFilter{UserID: &userA})
		if err != nil {
			t.Fatalf("User A search error: %v", err)
		}
		if len(resA.Items) != 2 {
			t.Errorf("User A should see 2 foods, got %d", len(resA.Items))
		}

		// User B searches: must ONLY see standard food
		resB, err := svc.SearchFoods(context.Background(), FoodSearchFilter{UserID: &userB})
		if err != nil {
			t.Fatalf("User B search error: %v", err)
		}
		if len(resB.Items) != 1 || resB.Items[0].ID != standardFoodID {
			t.Errorf("User B should only see standard food, got %d items", len(resB.Items))
		}

		// Guest (unauthenticated) searches: must ONLY see standard food
		resGuest, err := svc.SearchFoods(context.Background(), FoodSearchFilter{UserID: nil})
		if err != nil {
			t.Fatalf("Guest search error: %v", err)
		}
		if len(resGuest.Items) != 1 || resGuest.Items[0].ID != standardFoodID {
			t.Errorf("Guest should only see standard food, got %d items", len(resGuest.Items))
		}
	})

	// 2. GetFoodByID visibility test
	t.Run("GetFoodByID visibility", func(t *testing.T) {
		// User A retrieves custom food: succeeds
		foodA, err := svc.GetFoodByID(context.Background(), customFoodID, &userA)
		if err != nil || foodA == nil {
			t.Errorf("User A should be able to get their custom food, got err: %v", err)
		}

		// User B retrieves User A's custom food: returns ErrFoodNotFound (404)
		_, err = svc.GetFoodByID(context.Background(), customFoodID, &userB)
		if !errors.Is(err, ErrFoodNotFound) {
			t.Errorf("User B getting User A's custom food should return ErrFoodNotFound, got %v", err)
		}

		// Guest retrieves User A's custom food: returns ErrFoodNotFound (404)
		_, err = svc.GetFoodByID(context.Background(), customFoodID, nil)
		if !errors.Is(err, ErrFoodNotFound) {
			t.Errorf("Guest getting User A's custom food should return ErrFoodNotFound, got %v", err)
		}

		// All users and guest can retrieve standard food
		for name, uid := range map[string]*uuid.UUID{"User A": &userA, "User B": &userB, "Guest": nil} {
			sf, err := svc.GetFoodByID(context.Background(), standardFoodID, uid)
			if err != nil || sf == nil {
				t.Errorf("%s should be able to get standard food, got err: %v", name, err)
			}
		}
	})

	// 3. GetFoodsRichIn visibility test
	t.Run("GetFoodsRichIn visibility", func(t *testing.T) {
		// User A queries rich in protein: sees both custom food and standard food
		richA, err := svc.GetFoodsRichIn(context.Background(), "protein", 10, &userA)
		if err != nil {
			t.Fatalf("User A rich-in error: %v", err)
		}
		if len(richA.Items) != 2 {
			t.Errorf("User A should see 2 protein rich items, got %d", len(richA.Items))
		}

		// User B queries rich in protein: sees ONLY standard food
		richB, err := svc.GetFoodsRichIn(context.Background(), "protein", 10, &userB)
		if err != nil {
			t.Fatalf("User B rich-in error: %v", err)
		}
		if len(richB.Items) != 1 || richB.Items[0].FoodID != standardFoodID {
			t.Errorf("User B should only see standard food in rich-in, got %d items", len(richB.Items))
		}

		// Guest queries rich in protein: sees ONLY standard food
		richGuest, err := svc.GetFoodsRichIn(context.Background(), "protein", 10, nil)
		if err != nil {
			t.Fatalf("Guest rich-in error: %v", err)
		}
		if len(richGuest.Items) != 1 || richGuest.Items[0].FoodID != standardFoodID {
			t.Errorf("Guest should only see standard food in rich-in, got %d items", len(richGuest.Items))
		}
	})

	// 4. HTTP Handler status codes and response checks
	t.Run("HTTP Handlers status codes", func(t *testing.T) {
		handler := NewHandler(svc)

		// Helper to create request with optional auth context and route param
		newReq := func(method, target string, uid *uuid.UUID, routeParamKey, routeParamVal string) *http.Request {
			r := httptest.NewRequest(method, target, nil)
			if uid != nil {
				r = r.WithContext(context.WithValue(r.Context(), auth.UserIDKey, *uid))
			}
			if routeParamKey != "" {
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add(routeParamKey, routeParamVal)
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
			}
			return r
		}

		// GET /api/v1/foods/{id} for custom food
		// User A -> 200 OK
		recA := httptest.NewRecorder()
		handler.GetFoodByID(recA, newReq("GET", "/api/v1/foods/"+customFoodID.String(), &userA, "id", customFoodID.String()))
		if recA.Code != http.StatusOK {
			t.Errorf("expected 200 for User A, got %d", recA.Code)
		}

		// User B -> 404 Not Found
		recB := httptest.NewRecorder()
		handler.GetFoodByID(recB, newReq("GET", "/api/v1/foods/"+customFoodID.String(), &userB, "id", customFoodID.String()))
		if recB.Code != http.StatusNotFound {
			t.Errorf("expected 404 for User B, got %d", recB.Code)
		}

		// Guest -> 404 Not Found
		recGuest := httptest.NewRecorder()
		handler.GetFoodByID(recGuest, newReq("GET", "/api/v1/foods/"+customFoodID.String(), nil, "id", customFoodID.String()))
		if recGuest.Code != http.StatusNotFound {
			t.Errorf("expected 404 for Guest, got %d", recGuest.Code)
		}
	})
}

func TestNutritionService_CreateCustomFood_OneOff(t *testing.T) {
	repo := &mockNutritionRepo{foods: make(map[uuid.UUID]*FoodDetail)}
	svc := NewService(repo)

	userID := uuid.New()
	cal := 250.0
	req := CreateCustomFoodRequest{
		NameVi:      "Phở bò · đã chỉnh",
		ServingUnit: "phần",
		ServingSize: 300,
		Calories:    &cal,
		OneOff:      true,
	}

	food, err := svc.CreateCustomFood(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("failed to create one-off custom food: %v", err)
	}
	if food.Category != "one_off" {
		t.Errorf("expected category 'one_off', got '%s'", food.Category)
	}
}



// PUT /foods/custom/{id} (Job B): the same body and the same checks as POST, the same id.
func TestNutritionService_UpdateCustomFood_ScalesLikeCreate(t *testing.T) {
	repo := &mockNutritionRepo{}
	svc := NewService(repo)
	cal, pro, carb, fat, ca := 150.0, 15.0, 30.0, 7.5, 60.0
	req := CreateCustomFoodRequest{
		NameVi: "Bánh mì trứng", ServingSize: 150, ServingUnit: "g",
		Calories: &cal, Protein: &pro, Carbs: &carb, Fat: &fat,
		Micros: map[string]*float64{"calcium": &ca, "potassium": nil},
	}
	userID, foodID := uuid.New(), uuid.New()

	created, err := NewService(&mockNutritionRepo{}).CreateCustomFood(context.Background(), userID, req)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := svc.UpdateCustomFood(context.Background(), userID, foodID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.ID != foodID || repo.updatedID != foodID {
		t.Errorf("the id must stay %s, got %s (repo %s)", foodID, updated.ID, repo.updatedID)
	}
	if updated.Category != created.Category || updated.NameVi != created.NameVi || updated.Source != "custom" || !updated.IsCustom {
		t.Errorf("update built %+v, create built %+v", updated, created)
	}
	for key, want := range created.Per100gNutrients {
		got, ok := updated.Per100gNutrients[key]
		if !ok || (want == nil) != (got == nil) || (want != nil && *want != *got) {
			t.Errorf("%s: update %v, create %v", key, got, want)
		}
	}
	if updated.Per100gNutrients["potassium"] != nil {
		t.Error("an unknown nutrient must stay unknown on update")
	}
	if len(updated.Servings) != 2 || updated.Servings[0].LabelVi != "150 g" || updated.Servings[0].Grams != 150 || updated.Servings[1].Grams != 100 {
		t.Errorf("servings: %+v", updated.Servings)
	}
}

func TestNutritionService_UpdateCustomFood_OneOffFlagFollowsTheBody(t *testing.T) {
	repo := &mockNutritionRepo{}
	svc := NewService(repo)
	req := CreateCustomFoodRequest{NameVi: "Bữa tiệc", ServingSize: 100, OneOff: true}
	food, err := svc.UpdateCustomFood(context.Background(), uuid.New(), uuid.New(), req)
	if err != nil || food.Category != "one_off" {
		t.Fatalf("one_off: %v %+v", err, food)
	}
	req.OneOff = false
	food, err = svc.UpdateCustomFood(context.Background(), uuid.New(), uuid.New(), req)
	if err != nil || food.Category != "cua_toi" {
		t.Fatalf("cua_toi: %v %+v", err, food)
	}
}

func TestNutritionService_UpdateCustomFood_ValidationIsTheSameAsCreate(t *testing.T) {
	neg := -1.0
	cases := []struct {
		name string
		req  CreateCustomFoodRequest
		want error
	}{
		{"no name", CreateCustomFoodRequest{ServingSize: 100}, ErrNameRequired},
		{"serving size 0", CreateCustomFoodRequest{NameVi: "A", ServingSize: 0}, ErrInvalidServingSize},
		{"negative serving size", CreateCustomFoodRequest{NameVi: "A", ServingSize: -5}, ErrInvalidServingSize},
		{"negative calories", CreateCustomFoodRequest{NameVi: "A", ServingSize: 100, Calories: &neg}, ErrNegativeMacronutrients},
		{"negative protein", CreateCustomFoodRequest{NameVi: "A", ServingSize: 100, Protein: &neg}, ErrNegativeMacronutrients},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockNutritionRepo{}
			_, createErr := NewService(&mockNutritionRepo{}).CreateCustomFood(context.Background(), uuid.New(), tc.req)
			_, err := NewService(repo).UpdateCustomFood(context.Background(), uuid.New(), uuid.New(), tc.req)
			if !errors.Is(err, tc.want) || !errors.Is(createErr, tc.want) {
				t.Fatalf("update %v, create %v, want %v", err, createErr, tc.want)
			}
			if repo.updateCalls != 0 {
				t.Error("an invalid body must not reach the repository")
			}
		})
	}
}

func TestNutritionService_UpdateCustomFood_NotFoundComesBackAsIs(t *testing.T) {
	repo := &mockNutritionRepo{updateErr: ErrFoodNotFound}
	_, err := NewService(repo).UpdateCustomFood(context.Background(), uuid.New(), uuid.New(), CreateCustomFoodRequest{NameVi: "A", ServingSize: 100})
	if !errors.Is(err, ErrFoodNotFound) {
		t.Fatalf("want ErrFoodNotFound, got %v", err)
	}
}
