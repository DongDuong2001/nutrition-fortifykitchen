package profile

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
)

// The profile's target settings (migration 000015): the macro split, the custom kcal and the custom vitamin/mineral
// targets. Each is optional: nil (NULL) means not set, and the app uses the coach formula. The API stores them and
// gives them back; the targets it works out itself (trends, day summary) do not read them yet.

type MacroRatios struct {
	ProteinPct float64 `json:"proteinPct"`
	CarbsPct   float64 `json:"carbsPct"`
	FatPct     float64 `json:"fatPct"`
}

type MacroFixed struct {
	ProteinGrams float64 `json:"proteinGrams"`
	CarbsGrams   float64 `json:"carbsGrams"`
	FatGrams     float64 `json:"fatGrams"`
}

// MacroModes are the values of macro_mode.
var MacroModes = []string{"default", "ratios", "fixed", "keto"}

// CustomTargetIDs are the nutrients a custom target may be set for: the 21 DRI vitamins and minerals (the keys of
// nutrition.ValidNutrients, sodium left out: it keeps the salt formula). The same list as the web's CUSTOM_TARGET_IDS.
var CustomTargetIDs = map[string]bool{
	"calcium": true, "phosphorus": true, "magnesium": true, "iron": true, "zinc": true, "selenium": true,
	"copper": true, "manganese": true, "potassium": true,
	"vitamin_a": true, "vitamin_d": true, "vitamin_e": true, "vitamin_k": true, "vitamin_c": true,
	"b1": true, "b2": true, "b3": true, "b5": true, "b6": true, "folate": true, "b12": true,
}

const (
	CustomTargetMax   = 100000
	CustomEnergyMin   = 800
	CustomEnergyMax   = 8000
	MacroFixedMax     = 1000
	RatioSumTolerance = 1
)

// Nullable is a request field that tells a key left out (Set false: keep what is stored) from a JSON null (Set true,
// Raw nil: clear it).
type Nullable struct {
	Set bool
	Raw json.RawMessage
}

func (n *Nullable) UnmarshalJSON(b []byte) error {
	n.Set = true
	if string(bytes.TrimSpace(b)) == "null" {
		n.Raw = nil
		return nil
	}
	n.Raw = append(json.RawMessage(nil), b...)
	return nil
}

// ColumnPatch is one column of a profile save: Set false leaves it as stored; Set true writes Value (nil = NULL).
type ColumnPatch struct {
	Set   bool
	Value any
}

// TargetSettingsPatch is what a PUT /me/profile changes in the target settings. JSON values are encoded strings.
type TargetSettingsPatch struct {
	MacroMode        ColumnPatch // *string
	MacroRatios      ColumnPatch // *string (JSON)
	MacroFixed       ColumnPatch // *string (JSON)
	CustomEnergyKcal ColumnPatch // *int
	CustomTargets    ColumnPatch // *string (JSON)
}

// FieldErrors is a 400 with a message per request field.
type FieldErrors map[string]string

func (e FieldErrors) Error() string {
	keys := make([]string, 0, len(e))
	for k := range e {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, e[k])
	}
	return strings.Join(parts, "; ")
}

// strictDecode reads one JSON value into v, refusing keys v does not have.
func strictDecode(raw json.RawMessage, v any) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func encoded(v any) *string {
	b, _ := json.Marshal(v)
	s := string(b)
	return &s
}

func inRange(v, min, max float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= min && v <= max
}

// ParseTargetSettings checks the five target-settings fields of a profile save. A field left out is not changed, a
// JSON null clears it, and any other value must be valid; every invalid field gets its own message.
func ParseTargetSettings(req UpsertProfileRequest) (TargetSettingsPatch, FieldErrors) {
	var patch TargetSettingsPatch
	errs := FieldErrors{}

	if f := req.MacroMode; f.Set {
		patch.MacroMode.Set = true
		if f.Raw != nil {
			var mode string
			if err := json.Unmarshal(f.Raw, &mode); err != nil || !contains(MacroModes, mode) {
				errs["macroMode"] = "macroMode must be one of: " + strings.Join(MacroModes, ", ")
			} else {
				patch.MacroMode.Value = &mode
			}
		}
	}

	if f := req.MacroRatios; f.Set {
		patch.MacroRatios.Set = true
		if f.Raw != nil {
			var in struct {
				ProteinPct *float64 `json:"proteinPct"`
				CarbsPct   *float64 `json:"carbsPct"`
				FatPct     *float64 `json:"fatPct"`
			}
			const shape = `macroRatios must be {"proteinPct","carbsPct","fatPct"}, each 0–100, adding up to 100`
			switch {
			case strictDecode(f.Raw, &in) != nil || in.ProteinPct == nil || in.CarbsPct == nil || in.FatPct == nil:
				errs["macroRatios"] = shape
			case !inRange(*in.ProteinPct, 0, 100) || !inRange(*in.CarbsPct, 0, 100) || !inRange(*in.FatPct, 0, 100):
				errs["macroRatios"] = "macroRatios: each percentage must be between 0 and 100"
			case math.Abs(*in.ProteinPct+*in.CarbsPct+*in.FatPct-100) > RatioSumTolerance:
				errs["macroRatios"] = fmt.Sprintf("macroRatios must add up to 100 (±%d), got %v", RatioSumTolerance, *in.ProteinPct+*in.CarbsPct+*in.FatPct)
			default:
				patch.MacroRatios.Value = encoded(MacroRatios{ProteinPct: *in.ProteinPct, CarbsPct: *in.CarbsPct, FatPct: *in.FatPct})
			}
		}
	}

	if f := req.MacroFixed; f.Set {
		patch.MacroFixed.Set = true
		if f.Raw != nil {
			var in struct {
				ProteinGrams *float64 `json:"proteinGrams"`
				CarbsGrams   *float64 `json:"carbsGrams"`
				FatGrams     *float64 `json:"fatGrams"`
			}
			switch {
			case strictDecode(f.Raw, &in) != nil || in.ProteinGrams == nil || in.CarbsGrams == nil || in.FatGrams == nil:
				errs["macroFixed"] = `macroFixed must be {"proteinGrams","carbsGrams","fatGrams"}, each 0–1000`
			case !inRange(*in.ProteinGrams, 0, MacroFixedMax) || !inRange(*in.CarbsGrams, 0, MacroFixedMax) || !inRange(*in.FatGrams, 0, MacroFixedMax):
				errs["macroFixed"] = fmt.Sprintf("macroFixed: each amount must be between 0 and %d g", MacroFixedMax)
			default:
				patch.MacroFixed.Value = encoded(MacroFixed{ProteinGrams: *in.ProteinGrams, CarbsGrams: *in.CarbsGrams, FatGrams: *in.FatGrams})
			}
		}
	}

	if f := req.CustomEnergyKcal; f.Set {
		patch.CustomEnergyKcal.Set = true
		if f.Raw != nil {
			var kcal float64
			if err := json.Unmarshal(f.Raw, &kcal); err != nil || kcal != math.Trunc(kcal) || !inRange(kcal, CustomEnergyMin, CustomEnergyMax) {
				errs["customEnergyKcal"] = fmt.Sprintf("customEnergyKcal must be a whole number between %d and %d", CustomEnergyMin, CustomEnergyMax)
			} else {
				v := int(kcal)
				patch.CustomEnergyKcal.Value = &v
			}
		}
	}

	if f := req.CustomTargets; f.Set {
		patch.CustomTargets.Set = true
		if f.Raw != nil {
			var in map[string]float64
			if err := json.Unmarshal(f.Raw, &in); err != nil || in == nil {
				errs["customTargets"] = "customTargets must be an object of nutrient id to amount"
			} else {
				var bad []string
				for id, amount := range in {
					if !CustomTargetIDs[id] {
						bad = append(bad, fmt.Sprintf("%q is not a vitamin or mineral with a DRI target", id))
					} else if !inRange(amount, 0, CustomTargetMax) {
						bad = append(bad, fmt.Sprintf("%s must be between 0 and %d", id, CustomTargetMax))
					}
				}
				sort.Strings(bad)
				switch {
				case len(bad) > 0:
					errs["customTargets"] = "customTargets: " + strings.Join(bad, "; ")
				case len(in) > 0:
					patch.CustomTargets.Value = encoded(in)
					// An empty object is stored as NULL: one way to say "none set"
				}
			}
		}
	}

	if len(errs) > 0 {
		return TargetSettingsPatch{}, errs
	}
	return patch, nil
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
