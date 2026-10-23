package profile_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/auth"
	"nutrition-api/internal/profile"
)

// The user's Level (migration 000021): set by an admin or a coach in the database, never by the user. The user's own
// save may only move levelSeen, from 0 up to their level.

// A stored profile at the given Level, as the database would have it after an admin set it.
func seedLevel(repo *mockRepository, level, seen int) uuid.UUID {
	id := uuid.New()
	repo.profiles[id] = &profile.Profile{UserID: id, Sex: "male", BirthYear: 1995, WeightKg: 65, Goal: "maintain",
		TrainingMinutesDefault: 60, Language: "vi", Role: "user", Level: level, LevelSeen: seen}
	return id
}

func callAs(h http.HandlerFunc, userID uuid.UUID, method, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/api/v1/me/profile", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

// The profile body of a save, plus extra keys.
func profileBody(extra string) string {
	body := `{"sex":"male","goal":"maintain","weight_kg":66,"birth_year":1995`
	if extra != "" {
		body += "," + extra
	}
	return body + "}"
}

func dataOf(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var env struct {
		Data map[string]any `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatalf("decode %s: %v", rec.Body.String(), err)
	}
	return env.Data
}

func TestLevel_GetReturnsLevelAndLevelSeen(t *testing.T) {
	repo := newMockRepo()
	h := profile.NewHandler(profile.NewService(repo))
	id := seedLevel(repo, 3, 2)

	rec := callAs(h.GetMe, id, http.MethodGet, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /me: %d %s", rec.Code, rec.Body.String())
	}
	data := dataOf(t, rec)
	if data["level"] != float64(3) || data["levelSeen"] != float64(2) {
		t.Fatalf("want level 3 and levelSeen 2 (camelCase), got level=%v levelSeen=%v in %s", data["level"], data["levelSeen"], rec.Body.String())
	}
}

func TestLevel_LevelSeenUpdate(t *testing.T) {
	repo := newMockRepo()
	h := profile.NewHandler(profile.NewService(repo))

	t.Run("up to the user's level is saved", func(t *testing.T) {
		id := seedLevel(repo, 3, 1)
		for _, seen := range []string{"3", "2", "0"} {
			rec := callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"levelSeen":`+seen))
			if rec.Code != http.StatusOK {
				t.Fatalf("levelSeen %s: %d %s", seen, rec.Code, rec.Body.String())
			}
			data := dataOf(t, rec)
			if got := data["levelSeen"]; got != mustFloat(seen) {
				t.Fatalf("levelSeen %s: response has %v", seen, got)
			}
			if data["level"] != float64(3) || repo.profiles[id].Level != 3 {
				t.Fatalf("level changed: response %v, stored %d", data["level"], repo.profiles[id].Level)
			}
		}
	})

	t.Run("above the user's level is 400 and nothing is saved", func(t *testing.T) {
		id := seedLevel(repo, 2, 1)
		rec := callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"levelSeen":3`))
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"levelSeen"`) {
			t.Fatalf("want 400 on levelSeen, got %d %s", rec.Code, rec.Body.String())
		}
		if p := repo.profiles[id]; p.LevelSeen != 1 || p.WeightKg != 65 {
			t.Fatalf("a refused save changed the row: levelSeen %d, weight %v", p.LevelSeen, p.WeightKg)
		}
	})

	t.Run("outside 0-5 or not a whole number is 400", func(t *testing.T) {
		id := seedLevel(repo, 5, 0)
		for _, bad := range []string{"-1", "6", "2.5", `"3"`, "null", "true"} {
			rec := callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"levelSeen":`+bad))
			if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"levelSeen"`) {
				t.Fatalf("levelSeen %s: want 400 on levelSeen, got %d %s", bad, rec.Code, rec.Body.String())
			}
		}
		if repo.profiles[id].LevelSeen != 0 {
			t.Fatalf("a refused save changed levelSeen to %d", repo.profiles[id].LevelSeen)
		}
	})

	t.Run("a user with no profile row yet has level 0: levelSeen 0 is fine, 1 is 400", func(t *testing.T) {
		id := uuid.New()
		rec := callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"levelSeen":1`))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("new user levelSeen 1: want 400, got %d %s", rec.Code, rec.Body.String())
		}
		rec = callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"levelSeen":0`))
		if rec.Code != http.StatusOK {
			t.Fatalf("new user levelSeen 0: %d %s", rec.Code, rec.Body.String())
		}
	})
}

func mustFloat(s string) float64 {
	var f float64
	_ = json.Unmarshal([]byte(s), &f)
	return f
}

func TestLevel_SendingLevelIsRefused(t *testing.T) {
	repo := newMockRepo()
	h := profile.NewHandler(profile.NewService(repo))
	id := seedLevel(repo, 2, 2)

	// Any value, even the one stored or null: the key itself is refused, and nothing of the save is applied
	for _, level := range []string{"5", "2", "0", "null"} {
		rec := callAs(h.UpdateProfile, id, http.MethodPut, profileBody(`"level":`+level))
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "level is set by your coach") {
			t.Fatalf("level %s: want 400 \"level is set by your coach\", got %d %s", level, rec.Code, rec.Body.String())
		}
	}
	if p := repo.profiles[id]; p.Level != 2 || p.WeightKg != 65 {
		t.Fatalf("stored row changed: level %d, weight %v", p.Level, p.WeightKg)
	}
}

func TestLevel_OtherProfileSavesKeepLevel(t *testing.T) {
	repo := newMockRepo()
	svc := profile.NewService(repo)
	id := seedLevel(repo, 4, 3)

	// A save from Hồ sơ without levelSeen: the other fields change, level and levelSeen stay
	name := "Hao"
	p, err := svc.UpsertProfile(context.Background(), id, profile.UpsertProfileRequest{
		Sex: "male", BirthYear: 1995, WeightKg: 70, Goal: "cut", DisplayName: &name,
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.WeightKg != 70 || p.Goal != "cut" || p.DisplayName == nil || *p.DisplayName != "Hao" {
		t.Fatalf("profile fields not saved: %+v", p)
	}
	if p.Level != 4 || p.LevelSeen != 3 {
		t.Fatalf("want level 4 / levelSeen 3 kept, got %d / %d", p.Level, p.LevelSeen)
	}
}

func TestLevel_NewProfileStartsAtZero(t *testing.T) {
	repo := newMockRepo()
	svc := profile.NewService(repo)
	id := uuid.New()

	p, err := svc.UpsertProfile(context.Background(), id, profile.UpsertProfileRequest{
		Sex: "female", BirthYear: 2000, WeightKg: 55, Goal: "maintain",
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.Level != 0 || p.LevelSeen != 0 {
		t.Fatalf("new profile: want level 0 / levelSeen 0, got %d / %d", p.Level, p.LevelSeen)
	}
}
