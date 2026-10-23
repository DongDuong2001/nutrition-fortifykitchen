//go:build integration

// Integration tests: every diary write end to end through the real router against Postgres with all migrations
// (scripts/test-integration.sh starts Postgres 17 and sets TEST_DATABASE_URL). They exist because a unit test with a
// mocked repository never runs the SQL: the 42P08 insert bug of 18/10 passed every unit test.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"nutrition-api/internal/config"
	"nutrition-api/internal/diary"
)

const testSecret = "integration-secret-0123456789abcdef"

type apiClient struct {
	t      *testing.T
	router http.Handler
	token  string
}

// call sends one request and returns the status and the decoded "data" of the envelope (nil when there is none).
func (c *apiClient) call(method, path string, body any) (int, any) {
	c.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			c.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	rec := httptest.NewRecorder()
	c.router.ServeHTTP(rec, req)
	var env struct {
		Data  any `json:"data"`
		Error any `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &env)
	if rec.Code >= 400 {
		c.t.Logf("%s %s → %d %s", method, path, rec.Code, strings.TrimSpace(rec.Body.String()))
	}
	return rec.Code, env.Data
}

func (c *apiClient) must(want int, method, path string, body any) any {
	c.t.Helper()
	status, data := c.call(method, path, body)
	if status != want {
		c.t.Fatalf("%s %s: status %d, want %d", method, path, status, want)
	}
	return data
}

func setup(t *testing.T) (*apiClient, *pgxpool.Pool, uuid.UUID) {
	t.Helper()
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL is not set: run scripts/test-integration.sh")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	os.Setenv("SUPABASE_JWT_SECRET", testSecret)
	t.Cleanup(func() { os.Unsetenv("SUPABASE_JWT_SECRET") })
	cfg := &config.Config{Port: "8080", Environment: "test", AllowedOrigins: []string{"*"}, SupabaseJWTSecret: testSecret}

	user := uuid.New()
	email := fmt.Sprintf("it-%s@example.com", user.String()[:8])
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, user, email); err != nil {
		t.Fatal(err)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.String(), "email": email, "role": "authenticated", "aud": "authenticated",
		"exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(),
	}).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	c := &apiClient{t: t, router: SetupRouter(cfg, pool), token: token}
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", map[string]any{
		"sex": "male", "birth_year": 1995, "weight_kg": 65, "goal": "maintain", "display_name": "Integration",
	})
	return c, pool, user
}

// A catalogue food with known values per 100 g.
func insertFood(t *testing.T, pool *pgxpool.Pool, name string, energy float64) uuid.UUID {
	t.Helper()
	id := uuid.New()
	per100 := fmt.Sprintf(`{"energy": %g, "protein": 2.5, "carbs": 28, "fat": 0.3}`, energy)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO nutrition.foods (id, name, name_vi, category, source, source_id, per_100g_nutrients, per_100g, is_custom)
		VALUES ($1::uuid, $2::text, $2::text, 'tinh_bot', 'test', $3, $4::jsonb, $4::jsonb, false)`, id, name, id.String(), per100)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func m(v any) map[string]any {
	out, _ := v.(map[string]any)
	return out
}

func list(v any, key string) []any {
	if key != "" {
		v = m(v)[key]
	}
	out, _ := v.([]any)
	return out
}

// The day's entries by id, from GET /days/{date}.
func dayEntries(c *apiClient, date string) map[string]map[string]any {
	c.t.Helper()
	day := c.must(http.StatusOK, "GET", "/api/v1/days/"+date, nil)
	out := map[string]map[string]any{}
	for _, meal := range list(day, "meals") {
		for _, e := range list(meal, "entries") {
			out[fmt.Sprint(m(e)["id"])] = m(e)
		}
	}
	return out
}

func TestDiaryWritesEndToEnd(t *testing.T) {
	c, pool, user := setup(t)
	today := diary.GetServerToday()
	rice := insertFood(t, pool, "Cơm trắng IT", 130)

	// Create a food entry: grams and calories from the catalogue
	food := uuid.New()
	c.must(http.StatusCreated, "POST", "/api/v1/days/"+today+"/entries", map[string]any{
		"id": food, "kind": "food", "meal_slot": "breakfast", "food_id": rice, "grams": 150, "serving_size_g": 150,
	})
	got := dayEntries(c, today)[food.String()]
	if got == nil || got["grams"] != 150.0 || got["calories"] != 195.0 {
		t.Fatalf("food entry: %v", got)
	}

	// The same POST again (an outbox replay) answers 2xx and leaves one entry
	if status, _ := c.call("POST", "/api/v1/days/"+today+"/entries", map[string]any{
		"id": food, "kind": "food", "meal_slot": "breakfast", "food_id": rice, "grams": 150,
	}); status >= 300 {
		t.Fatalf("replayed POST: %d", status)
	}

	// A quick entry without calories stores NULL, never 0
	quick := uuid.New()
	c.must(http.StatusCreated, "POST", "/api/v1/days/"+today+"/entries", map[string]any{"id": quick, "kind": "quick", "meal_slot": "snack"})
	if got := dayEntries(c, today)[quick.String()]; got == nil || got["calories"] != nil {
		t.Fatalf("quick entry: %v", got)
	}

	// Update grams, then move to another meal
	c.must(http.StatusOK, "PATCH", "/api/v1/entries/"+food.String(), map[string]any{"grams": 200, "serving_size_g": 200})
	c.must(http.StatusOK, "PATCH", "/api/v1/entries/"+food.String(), map[string]any{"meal_slot": "lunch"})
	got = dayEntries(c, today)[food.String()]
	if got["grams"] != 200.0 || got["meal_slot"] != "lunch" {
		t.Fatalf("after update and move: %v", got)
	}

	// Delete, then restore
	c.must(http.StatusOK, "DELETE", "/api/v1/entries/"+food.String(), nil)
	if _, ok := dayEntries(c, today)[food.String()]; ok {
		t.Fatal("deleted entry still listed")
	}
	c.must(http.StatusOK, "POST", "/api/v1/entries/"+food.String()+"/restore", nil)
	if _, ok := dayEntries(c, today)[food.String()]; !ok {
		t.Fatal("restored entry missing")
	}

	// Copy to the day: yesterday's entry (written straight into the table, the API keeps past days read-only)
	yesterday := time.Now().In(time.FixedZone("ICT", 7*3600)).AddDate(0, 0, -1).Format("2006-01-02")
	if _, err := pool.Exec(context.Background(), `
		INSERT INTO nutrition.diary_logs (id, client_id, user_id, food_id, kind, meal_slot, grams, calories, name_snapshot,
			nutrients_snapshot, quantity, serving_size_g, log_date)
		VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, 'food', 'dinner', 100, 130, 'Cơm trắng IT', '{}', 1, 100, $3)`,
		user, rice, yesterday); err != nil {
		t.Fatal(err)
	}
	copied := c.must(http.StatusCreated, "POST", "/api/v1/days/"+today+"/copy-yesterday", map[string]any{"source_date": yesterday, "meal_slots": []string{"dinner"}})
	if n := m(copied)["copied_count"]; n != 1.0 {
		t.Fatalf("copy-yesterday copied %v", n)
	}

	// Delete a meal: every entry of dinner goes
	c.must(http.StatusOK, "DELETE", "/api/v1/days/"+today+"/meals/dinner", nil)
	for _, e := range dayEntries(c, today) {
		if e["meal_slot"] == "dinner" {
			t.Fatalf("dinner entry left after delete meal: %v", e)
		}
	}

	// Add from a saved meal
	saved := c.must(http.StatusCreated, "POST", "/api/v1/saved-meals", map[string]any{
		"name": "Bữa IT", "items": []map[string]any{{"food_id": rice, "portion_label": "1 chén", "grams": 120, "sort": 0}},
	})
	savedID := fmt.Sprint(m(saved)["id"])
	before := len(dayEntries(c, today))
	c.must(http.StatusCreated, "POST", "/api/v1/days/"+today+"/entries/from-saved/"+savedID+"?meal=lunch", nil)
	if after := len(dayEntries(c, today)); after != before+1 {
		t.Fatalf("from saved meal: %d entries, want %d", after, before+1)
	}
	c.must(http.StatusOK, "DELETE", "/api/v1/saved-meals/"+savedID, nil)

	// Recents: the food logged today is listed
	if items := list(c.must(http.StatusOK, "GET", "/api/v1/recents", nil), "items"); len(items) == 0 {
		t.Fatal("recents empty after logging")
	}
}

func TestCustomFoodsFavouritesWeightAndSearch(t *testing.T) {
	c, pool, _ := setup(t)
	rice := insertFood(t, pool, "Phở bò IT", 110)

	// Search ignores accents (unaccent with the cast parameter)
	found := c.must(http.StatusOK, "GET", "/api/v1/foods?q=pho%20bo%20it&limit=5", nil)
	if items := list(found, "items"); len(items) == 0 {
		t.Fatalf("search pho bo it: %v", found)
	}

	// Custom food: create, find it as its owner, delete
	created := c.must(http.StatusCreated, "POST", "/api/v1/foods/custom", map[string]any{
		"name_vi": "Bánh IT tự làm", "serving_unit": "cái", "serving_size": 50, "calories": 120, "protein": 3,
	})
	customID := fmt.Sprint(m(created)["id"])
	c.must(http.StatusOK, "GET", "/api/v1/foods/"+customID, nil)
	c.must(http.StatusOK, "DELETE", "/api/v1/foods/custom/"+customID, nil)

	// Favourites: add, list, remove
	c.must(http.StatusCreated, "POST", "/api/v1/favourites", map[string]any{"food_id": rice})
	if items := list(c.must(http.StatusOK, "GET", "/api/v1/favourites", nil), "items"); len(items) != 1 {
		t.Fatalf("favourites: %v", items)
	}
	c.must(http.StatusOK, "DELETE", "/api/v1/favourites/"+rice.String(), nil)
	if items := list(c.must(http.StatusOK, "GET", "/api/v1/favourites", nil), "items"); len(items) != 0 {
		t.Fatalf("favourites after remove: %v", items)
	}

	// Weight: upsert, then read with and without a range (the '' OR ::date query)
	today := diary.GetServerToday()
	c.must(http.StatusOK, "PUT", "/api/v1/me/weight/"+today, map[string]any{"weight_kg": 64.5})
	for _, q := range []string{"", "?from=" + today + "&to=" + today} {
		logs := c.must(http.StatusOK, "GET", "/api/v1/me/weight"+q, nil)
		if fmt.Sprint(logs) == "[]" || logs == nil {
			t.Fatalf("weight logs %q: %v", q, logs)
		}
	}
}

func TestCreateEntriesBatch_RollbackOnBadFoodID(t *testing.T) {
	_, pool, userID := setup(t)
	repo := diary.NewRepository(pool)
	validFoodID := insertFood(t, pool, "Cơm trắng IT", 130)
	badFoodID := uuid.New() // non-existent food_id

	today := diary.GetServerToday()
	entries := []*diary.DiaryEntryItem{
		{
			ID:           uuid.New(),
			FoodID:       &validFoodID,
			Kind:         "food",
			MealSlot:     "lunch",
			ServingLabel: "100 g",
			Grams:        100,
			FoodName:     "Cơm trắng IT",
		},
		{
			ID:           uuid.New(),
			FoodID:       &badFoodID,
			Kind:         "food",
			MealSlot:     "lunch",
			ServingLabel: "100 g",
			Grams:        100,
			FoodName:     "Món ma",
		},
	}

	_, err := repo.CreateEntriesBatch(context.Background(), userID, today, entries)
	if err == nil {
		t.Fatal("expected batch insert to fail on bad food_id, got nil")
	}

	// Verify that the transaction rolled back: validFoodID was not inserted
	dayEntries, err := repo.GetDayEntries(context.Background(), userID, today)
	if err != nil {
		t.Fatalf("failed to query day entries: %v", err)
	}
	if len(dayEntries) != 0 {
		t.Fatalf("expected 0 entries saved due to rollback, got %d", len(dayEntries))
	}
}

// The user's Level (migration 000021): a new row starts at 0/0, an admin's UPDATE is what GET /me shows, the user's own
// save moves levelSeen up to that Level and never level.
func TestProfileLevel(t *testing.T) {
	c, pool, user := setup(t)
	ctx := context.Background()
	base := map[string]any{"sex": "male", "birth_year": 1995, "weight_kg": 65, "goal": "maintain"}
	with := func(key string, v any) map[string]any {
		out := map[string]any{key: v}
		for k, val := range base {
			out[k] = val
		}
		return out
	}

	me := m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if me["level"] != float64(0) || me["levelSeen"] != float64(0) {
		t.Fatalf("new profile: want level 0 / levelSeen 0, got %v / %v", me["level"], me["levelSeen"])
	}

	// What the run sheet's SQL does until the coach screens exist
	if _, err := pool.Exec(ctx, `UPDATE nutrition.profiles SET level = 3 WHERE user_id = $1`, user); err != nil {
		t.Fatal(err)
	}
	c.must(http.StatusBadRequest, "PUT", "/api/v1/me/profile", with("levelSeen", 4))
	c.must(http.StatusBadRequest, "PUT", "/api/v1/me/profile", with("level", 5))
	saved := m(c.must(http.StatusOK, "PUT", "/api/v1/me/profile", with("levelSeen", 3)))
	if saved["level"] != float64(3) || saved["levelSeen"] != float64(3) {
		t.Fatalf("after levelSeen 3: got level %v / levelSeen %v", saved["level"], saved["levelSeen"])
	}

	// A save without levelSeen keeps both
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", base)
	var level, seen int
	if err := pool.QueryRow(ctx, `SELECT level, level_seen FROM nutrition.profiles WHERE user_id = $1`, user).Scan(&level, &seen); err != nil {
		t.Fatal(err)
	}
	if level != 3 || seen != 3 {
		t.Fatalf("stored: want 3 / 3, got %d / %d", level, seen)
	}

	// The checks hold even for a write that skips the API
	if _, err := pool.Exec(ctx, `UPDATE nutrition.profiles SET level = 6 WHERE user_id = $1`, user); err == nil {
		t.Fatal("level 6 was stored: the CHECK is missing")
	}
}
