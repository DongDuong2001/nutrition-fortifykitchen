//go:build integration

// Integration tests for what the web syncs between devices (migrations 000015 and 000016): the profile's target
// settings and Ngày ăn mẫu, end to end through the real router against Postgres with every migration.
package main

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// otherUser signs in a second account on the same router.
func otherUser(t *testing.T, c *apiClient, pool *pgxpool.Pool) *apiClient {
	t.Helper()
	user := uuid.New()
	email := fmt.Sprintf("it-%s@example.com", user.String()[:8])
	if _, err := pool.Exec(context.Background(), `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, user, email); err != nil {
		t.Fatal(err)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.String(), "email": email, "role": "authenticated", "aud": "authenticated",
		"exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(),
	}).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	other := &apiClient{t: t, router: c.router, token: token}
	other.must(http.StatusOK, "PUT", "/api/v1/me/profile", map[string]any{
		"sex": "female", "birth_year": 1998, "weight_kg": 55, "goal": "cut",
	})
	return other
}

var baseProfile = map[string]any{"sex": "male", "birth_year": 1995, "weight_kg": 65, "goal": "maintain"}

func withBase(extra map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range baseProfile {
		out[k] = v
	}
	for k, v := range extra {
		out[k] = v
	}
	return out
}

func TestProfileTargetSettings_SetGetClear(t *testing.T) {
	c, _, _ := setup(t)

	// Not set yet: every field is null
	me := m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	for _, key := range []string{"macroMode", "macroRatios", "macroFixed", "customEnergyKcal", "customTargets"} {
		if v, ok := me[key]; !ok || v != nil {
			t.Fatalf("%s before any save: %v (present %v), want null", key, v, ok)
		}
	}
	firstUpdated, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(me["updatedAt"]))
	if firstUpdated.IsZero() || me["updatedAt"] != me["updated_at"] {
		t.Fatalf("updatedAt %v, updated_at %v", me["updatedAt"], me["updated_at"])
	}

	// Set all five
	time.Sleep(20 * time.Millisecond)
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", withBase(map[string]any{
		"macroMode":        "ratios",
		"macroRatios":      map[string]any{"proteinPct": 30, "carbsPct": 40, "fatPct": 30},
		"macroFixed":       map[string]any{"proteinGrams": 150, "carbsGrams": 200, "fatGrams": 60},
		"customEnergyKcal": 2400,
		"customTargets":    map[string]any{"calcium": 1200, "vitamin_d": 20},
	}))
	me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if me["macroMode"] != "ratios" || m(me["macroRatios"])["proteinPct"] != 30.0 || m(me["macroFixed"])["fatGrams"] != 60.0 ||
		me["customEnergyKcal"] != 2400.0 || m(me["customTargets"])["calcium"] != 1200.0 || len(m(me["customTargets"])) != 2 {
		t.Fatalf("after set: %v", me)
	}
	setUpdated, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(me["updatedAt"]))
	if !setUpdated.After(firstUpdated) {
		t.Fatalf("updatedAt did not move: %v → %v", firstUpdated, setUpdated)
	}

	// A save without the fields (another screen, an older app) leaves them as they are
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", withBase(map[string]any{"display_name": "Đổi tên"}))
	me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if me["macroMode"] != "ratios" || me["customEnergyKcal"] != 2400.0 || me["display_name"] != "Đổi tên" {
		t.Fatalf("a save without the fields changed them: %v", me)
	}

	// A weigh-in also moves updatedAt (the trigger), and keeps the settings
	time.Sleep(20 * time.Millisecond)
	c.must(http.StatusOK, "PUT", "/api/v1/me/weight/"+time.Now().Format("2006-01-02"), map[string]any{"weight_kg": 66})
	me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if weighed, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(me["updatedAt"])); !weighed.After(setUpdated) || me["macroMode"] != "ratios" {
		t.Fatalf("after a weigh-in: updatedAt %v, macroMode %v", me["updatedAt"], me["macroMode"])
	}

	// An invalid value is a 400 naming the field, and nothing is changed
	if status, _ := c.call("PUT", "/api/v1/me/profile", withBase(map[string]any{
		"macroMode": "fixed", "customTargets": map[string]any{"sodium": 1500},
	})); status != http.StatusBadRequest {
		t.Fatalf("invalid customTargets: %d, want 400", status)
	}
	if me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil)); me["macroMode"] != "ratios" {
		t.Fatalf("a refused save changed macroMode: %v", me["macroMode"])
	}

	// Clear some with null, change one, leave the others out
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", withBase(map[string]any{
		"macroMode": "fixed", "macroRatios": nil, "customEnergyKcal": nil, "customTargets": map[string]any{},
	}))
	me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if me["macroMode"] != "fixed" || me["macroRatios"] != nil || me["customEnergyKcal"] != nil || me["customTargets"] != nil ||
		m(me["macroFixed"])["proteinGrams"] != 150.0 {
		t.Fatalf("after clear: %v", me)
	}

	// Clear the rest
	c.must(http.StatusOK, "PUT", "/api/v1/me/profile", withBase(map[string]any{"macroMode": nil, "macroFixed": nil}))
	me = m(c.must(http.StatusOK, "GET", "/api/v1/me", nil))
	for _, key := range []string{"macroMode", "macroRatios", "macroFixed", "customEnergyKcal", "customTargets"} {
		if me[key] != nil {
			t.Fatalf("%s after clearing everything: %v", key, me[key])
		}
	}
}

func TestProfileTargetSettings_FirstSaveCarriesThem(t *testing.T) {
	c, pool, _ := setup(t)
	// A brand-new account whose first save (setup) already has a split: the INSERT path
	user := uuid.New()
	if _, err := pool.Exec(context.Background(), `INSERT INTO auth.users (id, email) VALUES ($1, 'first-save@example.com')`, user); err != nil {
		t.Fatal(err)
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.String(), "email": "first-save@example.com", "role": "authenticated", "aud": "authenticated",
		"exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(),
	}).SignedString([]byte(testSecret))
	fresh := &apiClient{t: t, router: c.router, token: token}
	fresh.must(http.StatusOK, "PUT", "/api/v1/me/profile", map[string]any{
		"sex": "female", "birth_year": 1998, "weight_kg": 55, "goal": "cut",
		"macroMode": "keto", "customTargets": map[string]any{"iron": 28},
	})
	me := m(fresh.must(http.StatusOK, "GET", "/api/v1/me", nil))
	if me["macroMode"] != "keto" || m(me["customTargets"])["iron"] != 28.0 || me["macroRatios"] != nil {
		t.Fatalf("first save: %v", me)
	}
}

func template(name, tag string, grams float64) map[string]any {
	return map[string]any{
		"name": name, "tag": tag,
		"meals": []any{
			map[string]any{"slot": "breakfast", "items": []any{
				map[string]any{"foodId": "11111111-1111-1111-1111-111111111111", "servingLabel": "1 tô", "grams": grams},
			}},
			map[string]any{"slot": "pre_workout", "items": []any{
				map[string]any{"foodId": "custom-recipe-1", "servingLabel": "1 ly", "grams": 300},
			}},
		},
	}
}

func templateIDs(c *apiClient) []string {
	c.t.Helper()
	var ids []string
	for _, tpl := range list(c.must(http.StatusOK, "GET", "/api/v1/day-templates", nil), "items") {
		ids = append(ids, fmt.Sprint(m(tpl)["id"]))
	}
	return ids
}

func TestDayTemplates_Lifecycle(t *testing.T) {
	c, pool, user := setup(t)

	if ids := templateIDs(c); len(ids) != 0 {
		t.Fatalf("a new account has templates: %v", ids)
	}

	// Create: an older one uploaded from a device (its own createdAt), then a new one
	older, newer := uuid.New(), uuid.New()
	up := template("Ngày tập", "tap", 500)
	up["createdAt"] = time.Now().Add(-48 * time.Hour).UTC().Format(time.RFC3339Nano)
	c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+older.String(), up)
	saved := m(c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+newer.String(), template("  Ngày nghỉ  ", "nghi", 250)))
	if saved["name"] != "Ngày nghỉ" || saved["id"] != newer.String() || len(list(saved, "meals")) != 2 {
		t.Fatalf("saved: %v", saved)
	}

	// Newest first, and the meals come back as they were sent
	got := list(c.must(http.StatusOK, "GET", "/api/v1/day-templates", nil), "items")
	if len(got) != 2 || m(got[0])["id"] != newer.String() || m(got[1])["id"] != older.String() {
		t.Fatalf("order: %v", got)
	}
	item := m(list(list(got[1], "meals")[0], "items")[0])
	if item["servingLabel"] != "1 tô" || item["grams"] != 500.0 || item["foodId"] != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("item: %v", item)
	}

	// The same PUT again (an outbox replay): same result, still two templates
	again := m(c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+newer.String(), template("Ngày nghỉ", "nghi", 250)))
	if again["createdAt"] != saved["createdAt"] || len(templateIDs(c)) != 2 {
		t.Fatalf("replay: %v", again)
	}

	// Replace: new name, tag and meals; the first createdAt (the list order) is kept
	time.Sleep(20 * time.Millisecond)
	replaced := m(c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+older.String(), template("Ngày chân", "khac", 400)))
	if replaced["name"] != "Ngày chân" || replaced["tag"] != "khac" || replaced["createdAt"] == replaced["updatedAt"] {
		t.Fatalf("replace: %v", replaced)
	}
	if ids := templateIDs(c); ids[0] != newer.String() {
		t.Fatalf("a replace moved the template up: %v", ids)
	}

	// Invalid body: 400, nothing stored
	if status, _ := c.call("PUT", "/api/v1/day-templates/"+uuid.NewString(), template("", "tap", 100)); status != http.StatusBadRequest {
		t.Fatalf("blank name: %d", status)
	}

	// Another user: sees none of them, cannot take the id (409), and a DELETE of it changes nothing
	other := otherUser(t, c, pool)
	if ids := templateIDs(other); len(ids) != 0 {
		t.Fatalf("the other user sees %v", ids)
	}
	if status, _ := other.call("PUT", "/api/v1/day-templates/"+newer.String(), template("Của tôi", "tap", 1)); status != http.StatusConflict {
		t.Fatalf("PUT of another user's id: %d, want 409", status)
	}
	other.must(http.StatusOK, "DELETE", "/api/v1/day-templates/"+newer.String(), nil)
	if ids := templateIDs(c); len(ids) != 2 {
		t.Fatalf("the other user's DELETE removed a template: %v", ids)
	}

	// Soft delete, twice: gone from the list, the row is kept with deleted_at
	c.must(http.StatusOK, "DELETE", "/api/v1/day-templates/"+newer.String(), nil)
	c.must(http.StatusOK, "DELETE", "/api/v1/day-templates/"+newer.String(), nil)
	if ids := templateIDs(c); len(ids) != 1 || ids[0] != older.String() {
		t.Fatalf("after delete: %v", ids)
	}
	var deleted bool
	if err := pool.QueryRow(context.Background(),
		`SELECT deleted_at IS NOT NULL FROM nutrition.day_templates WHERE id = $1`, newer).Scan(&deleted); err != nil || !deleted {
		t.Fatalf("soft delete: deleted=%v err=%v", deleted, err)
	}

	// A deleted id taken by another user is still a conflict; the owner's PUT brings it back
	if status, _ := other.call("PUT", "/api/v1/day-templates/"+newer.String(), template("X", "tap", 1)); status != http.StatusConflict {
		t.Fatalf("PUT of another user's deleted id: %d, want 409", status)
	}
	c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+newer.String(), template("Ngày nghỉ", "nghi", 250))
	if ids := templateIDs(c); len(ids) != 2 {
		t.Fatalf("after bringing it back: %v", ids)
	}

	// Account delete takes the templates with it (ON DELETE CASCADE, like 000014)
	c.must(http.StatusOK, "DELETE", "/api/v1/me", nil)
	var left int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM nutrition.day_templates WHERE user_id = $1`, user).Scan(&left); err != nil || left != 0 {
		t.Fatalf("after account delete: %d rows (err %v)", left, err)
	}
}

func TestDayTemplates_LimitOf50(t *testing.T) {
	c, _, _ := setup(t)
	ids := make([]uuid.UUID, 50)
	for i := range ids {
		ids[i] = uuid.New()
		c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+ids[i].String(), template(fmt.Sprintf("Mẫu %d", i), "khac", 100))
	}
	// The 51st is refused; replacing one of the 50 is not
	if status, _ := c.call("PUT", "/api/v1/day-templates/"+uuid.NewString(), template("Mẫu 51", "khac", 100)); status != http.StatusConflict {
		t.Fatalf("51st template: %d, want 409", status)
	}
	c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+ids[0].String(), template("Mẫu 0 đổi tên", "tap", 100))
	// A deleted one frees its place
	c.must(http.StatusOK, "DELETE", "/api/v1/day-templates/"+ids[1].String(), nil)
	c.must(http.StatusOK, "PUT", "/api/v1/day-templates/"+uuid.NewString(), template("Mẫu 51", "khac", 100))
	if got := len(templateIDs(c)); got != 50 {
		t.Fatalf("live templates: %d, want 50", got)
	}
}
