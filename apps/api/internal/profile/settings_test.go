package profile_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
	"nutrition-api/internal/profile"
)

// decodeReq reads a PUT /me/profile body the way the handler does.
func decodeReq(t *testing.T, body string) profile.UpsertProfileRequest {
	t.Helper()
	var req profile.UpsertProfileRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("decode %s: %v", body, err)
	}
	return req
}

func strVal(t *testing.T, c profile.ColumnPatch) string {
	t.Helper()
	s, ok := c.Value.(*string)
	if !ok || s == nil {
		t.Fatalf("value %#v is not a *string", c.Value)
	}
	return *s
}

func TestParseTargetSettings_LeftOutIsUnchanged(t *testing.T) {
	patch, errs := profile.ParseTargetSettings(decodeReq(t, `{"sex":"male"}`))
	if errs != nil {
		t.Fatal(errs)
	}
	for name, c := range map[string]profile.ColumnPatch{
		"macroMode": patch.MacroMode, "macroRatios": patch.MacroRatios, "macroFixed": patch.MacroFixed,
		"customEnergyKcal": patch.CustomEnergyKcal, "customTargets": patch.CustomTargets,
	} {
		if c.Set {
			t.Errorf("%s: left out but marked set", name)
		}
	}
}

func TestParseTargetSettings_NullClears(t *testing.T) {
	patch, errs := profile.ParseTargetSettings(decodeReq(t,
		`{"macroMode":null,"macroRatios":null,"macroFixed":null,"customEnergyKcal":null,"customTargets":null}`))
	if errs != nil {
		t.Fatal(errs)
	}
	for name, c := range map[string]profile.ColumnPatch{
		"macroMode": patch.MacroMode, "macroRatios": patch.MacroRatios, "macroFixed": patch.MacroFixed,
		"customEnergyKcal": patch.CustomEnergyKcal, "customTargets": patch.CustomTargets,
	} {
		if !c.Set || c.Value != nil {
			t.Errorf("%s: null must clear (Set true, Value nil), got %+v", name, c)
		}
	}
}

func TestParseTargetSettings_ValidValues(t *testing.T) {
	patch, errs := profile.ParseTargetSettings(decodeReq(t, `{
		"macroMode": "ratios",
		"macroRatios": {"proteinPct": 25, "carbsPct": 55, "fatPct": 20.5},
		"macroFixed": {"proteinGrams": 150, "carbsGrams": 200, "fatGrams": 60},
		"customEnergyKcal": 2400,
		"customTargets": {"calcium": 1200, "vitamin_d": 20, "b12": 0}
	}`))
	if errs != nil {
		t.Fatal(errs)
	}
	if got := strVal(t, patch.MacroMode); got != "ratios" {
		t.Errorf("macroMode = %q", got)
	}
	if got := strVal(t, patch.MacroRatios); got != `{"proteinPct":25,"carbsPct":55,"fatPct":20.5}` {
		t.Errorf("macroRatios = %s", got)
	}
	if got := strVal(t, patch.MacroFixed); got != `{"proteinGrams":150,"carbsGrams":200,"fatGrams":60}` {
		t.Errorf("macroFixed = %s", got)
	}
	if v, ok := patch.CustomEnergyKcal.Value.(*int); !ok || *v != 2400 {
		t.Errorf("customEnergyKcal = %#v", patch.CustomEnergyKcal.Value)
	}
	var targets map[string]float64
	_ = json.Unmarshal([]byte(strVal(t, patch.CustomTargets)), &targets)
	if len(targets) != 3 || targets["calcium"] != 1200 || targets["b12"] != 0 {
		t.Errorf("customTargets = %v", targets)
	}
}

func TestParseTargetSettings_EdgesAccepted(t *testing.T) {
	for _, body := range []string{
		`{"macroRatios": {"proteinPct": 0, "carbsPct": 100, "fatPct": 0}}`,
		`{"macroRatios": {"proteinPct": 33, "carbsPct": 33, "fatPct": 33}}`, // 99: within ±1
		`{"macroRatios": {"proteinPct": 34, "carbsPct": 34, "fatPct": 33}}`, // 101
		`{"macroFixed": {"proteinGrams": 0, "carbsGrams": 1000, "fatGrams": 0}}`,
		`{"customEnergyKcal": 800}`,
		`{"customEnergyKcal": 8000}`,
		`{"customEnergyKcal": 2000.0}`,
		`{"customTargets": {"potassium": 100000}}`,
		`{"macroMode": "keto"}`,
		`{"macroMode": "default"}`,
	} {
		if _, errs := profile.ParseTargetSettings(decodeReq(t, body)); errs != nil {
			t.Errorf("%s: refused: %v", body, errs)
		}
	}
}

func TestParseTargetSettings_EmptyTargetsStoredAsNull(t *testing.T) {
	patch, errs := profile.ParseTargetSettings(decodeReq(t, `{"customTargets": {}}`))
	if errs != nil {
		t.Fatal(errs)
	}
	if !patch.CustomTargets.Set || patch.CustomTargets.Value != nil {
		t.Errorf("{} must clear, got %+v", patch.CustomTargets)
	}
}

func TestParseTargetSettings_InvalidValuesNameTheirField(t *testing.T) {
	cases := []struct {
		body, field, mentions string
	}{
		{`{"macroMode": "high_protein"}`, "macroMode", "one of"},
		{`{"macroMode": 3}`, "macroMode", "one of"},
		{`{"macroRatios": {"proteinPct": 25, "carbsPct": 55, "fatPct": 25}}`, "macroRatios", "add up to 100"},
		{`{"macroRatios": {"proteinPct": 25, "carbsPct": 55}}`, "macroRatios", "proteinPct"},
		{`{"macroRatios": {"proteinPct": -5, "carbsPct": 85, "fatPct": 20}}`, "macroRatios", "between 0 and 100"},
		{`{"macroRatios": {"proteinPct": 25, "carbsPct": 55, "fatPct": 20, "alcoholPct": 0}}`, "macroRatios", "proteinPct"},
		{`{"macroRatios": [25, 55, 20]}`, "macroRatios", "proteinPct"},
		{`{"macroRatios": {"proteinPct": "25", "carbsPct": 55, "fatPct": 20}}`, "macroRatios", "proteinPct"},
		{`{"macroFixed": {"proteinGrams": 1001, "carbsGrams": 200, "fatGrams": 60}}`, "macroFixed", "between 0 and 1000"},
		{`{"macroFixed": {"proteinGrams": 150, "carbsGrams": 200}}`, "macroFixed", "fatGrams"},
		{`{"customEnergyKcal": 799}`, "customEnergyKcal", "between 800 and 8000"},
		{`{"customEnergyKcal": 8001}`, "customEnergyKcal", "between 800 and 8000"},
		{`{"customEnergyKcal": 2000.5}`, "customEnergyKcal", "whole number"},
		{`{"customEnergyKcal": "2000"}`, "customEnergyKcal", "whole number"},
		{`{"customTargets": {"sodium": 1500}}`, "customTargets", `"sodium"`},
		{`{"customTargets": {"protein": 150}}`, "customTargets", `"protein"`},
		{`{"customTargets": {"calcium": -1}}`, "customTargets", "calcium must be between 0 and 100000"},
		{`{"customTargets": {"calcium": 100001}}`, "customTargets", "calcium must be between 0 and 100000"},
		{`{"customTargets": {"calcium": "1200"}}`, "customTargets", "object"},
		{`{"customTargets": [1200]}`, "customTargets", "object"},
	}
	for _, tc := range cases {
		_, errs := profile.ParseTargetSettings(decodeReq(t, tc.body))
		msg, ok := errs[tc.field]
		if !ok {
			t.Errorf("%s: no error for %s (got %v)", tc.body, tc.field, errs)
			continue
		}
		if !strings.Contains(msg, tc.mentions) {
			t.Errorf("%s: message %q does not mention %q", tc.body, msg, tc.mentions)
		}
		if len(errs) != 1 {
			t.Errorf("%s: only %s is wrong, got %v", tc.body, tc.field, errs)
		}
	}
}

func TestParseTargetSettings_AllCustomTargetIDsAccepted(t *testing.T) {
	if len(profile.CustomTargetIDs) != 21 {
		t.Fatalf("CustomTargetIDs has %d ids, want the 21 DRI vitamins and minerals", len(profile.CustomTargetIDs))
	}
	all := map[string]float64{}
	for id := range profile.CustomTargetIDs {
		all[id] = 1
	}
	body, _ := json.Marshal(map[string]any{"customTargets": all})
	if _, errs := profile.ParseTargetSettings(decodeReq(t, string(body))); errs != nil {
		t.Fatal(errs)
	}
}

func TestUpsertProfile_TargetSettingsErrorsAreFieldErrors(t *testing.T) {
	svc := profile.NewService(newMockRepo())
	req := decodeReq(t, `{"sex":"male","birth_year":1995,"weight_kg":65,"goal":"maintain","customEnergyKcal":100,"macroMode":"x"}`)
	_, err := svc.UpsertProfile(context.Background(), uuid.New(), req)
	var fe profile.FieldErrors
	if !errors.As(err, &fe) || len(fe) != 2 || fe["customEnergyKcal"] == "" || fe["macroMode"] == "" {
		t.Fatalf("want field errors for customEnergyKcal and macroMode, got %v", err)
	}
}

func TestHandler_TargetSettingsInvalidIs400WithFields(t *testing.T) {
	h := profile.NewHandler(profile.NewService(newMockRepo()))
	rec := call(h.UpdateProfile, "PUT", "/api/v1/me/profile",
		`{"sex":"male","birth_year":1995,"weight_kg":65,"goal":"maintain","macroRatios":{"proteinPct":50,"carbsPct":50,"fatPct":50}}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d, want 400: %s", rec.Code, rec.Body.String())
	}
	var env struct {
		Error struct {
			Code   string            `json:"code"`
			Fields map[string]string `json:"fields"`
		} `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &env)
	if env.Error.Code != "VALIDATION_FAILED" || !strings.Contains(env.Error.Fields["macroRatios"], "add up to 100") {
		t.Fatalf("body %s", rec.Body.String())
	}
}
