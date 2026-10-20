package targets

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type TargetTestCase struct {
	Input  UserProfileForTargets `json:"input"`
	Output CompleteTargets       `json:"output"`
}

func TestSharedTargetVectors(t *testing.T) {
	candidates := []string{
		filepath.Join("..", "..", "..", "..", "packages", "vectors", "targets.json"),
		filepath.Join("..", "..", "packages", "vectors", "targets.json"),
		filepath.Join("..", "..", "..", "packages", "vectors", "targets.json"),
		filepath.Join("packages", "vectors", "targets.json"),
		"D:/nutrition-meals/packages/vectors/targets.json",
	}

	var data []byte
	var err error
	for _, p := range candidates {
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if err != nil {
		t.Skipf("targets.json not found: %v", err)
		return
	}

	var testCases []TargetTestCase
	if err := json.Unmarshal(data, &testCases); err != nil {
		t.Fatalf("failed to unmarshal test cases: %v", err)
	}

	if len(testCases) == 0 {
		t.Fatalf("expected at least 1 test case, got 0")
	}

	for idx, tc := range testCases {
		calculated := CalculateTargets(tc.Input)

		if calculated.Calories.Min != tc.Output.Calories.Min || calculated.Calories.Max != tc.Output.Calories.Max {
			t.Errorf("[%d] Calories mismatch: got %+v, want %+v", idx, calculated.Calories, tc.Output.Calories)
		}
		if calculated.Protein.Min != tc.Output.Protein.Min || calculated.Protein.Max != tc.Output.Protein.Max {
			t.Errorf("[%d] Protein mismatch: got %+v, want %+v", idx, calculated.Protein, tc.Output.Protein)
		}
		if calculated.Fat.Min != tc.Output.Fat.Min || calculated.Fat.Max != tc.Output.Fat.Max {
			t.Errorf("[%d] Fat mismatch: got %+v, want %+v", idx, calculated.Fat, tc.Output.Fat)
		}
		if calculated.Carbs.Min != tc.Output.Carbs.Min || calculated.Carbs.Max != tc.Output.Carbs.Max {
			t.Errorf("[%d] Carbs mismatch: got %+v, want %+v", idx, calculated.Carbs, tc.Output.Carbs)
		}
		if calculated.Sodium.Min != tc.Output.Sodium.Min || calculated.Sodium.Max != tc.Output.Sodium.Max {
			t.Errorf("[%d] Sodium mismatch: got %+v, want %+v", idx, calculated.Sodium, tc.Output.Sodium)
		}
		if calculated.Potassium.Min != tc.Output.Potassium.Min || calculated.Potassium.Max != tc.Output.Potassium.Max {
			t.Errorf("[%d] Potassium mismatch: got %+v, want %+v", idx, calculated.Potassium, tc.Output.Potassium)
		}
		if calculated.Calcium.Min != tc.Output.Calcium.Min || calculated.Calcium.Max != tc.Output.Calcium.Max {
			t.Errorf("[%d] Calcium mismatch: got %+v, want %+v", idx, calculated.Calcium, tc.Output.Calcium)
		}
		if calculated.Magnesium.Min != tc.Output.Magnesium.Min || calculated.Magnesium.Max != tc.Output.Magnesium.Max {
			t.Errorf("[%d] Magnesium mismatch: got %+v, want %+v", idx, calculated.Magnesium, tc.Output.Magnesium)
		}
		if calculated.Iron.Min != tc.Output.Iron.Min || calculated.Iron.Max != tc.Output.Iron.Max {
			t.Errorf("[%d] Iron mismatch: got %+v, want %+v", idx, calculated.Iron, tc.Output.Iron)
		}
		if calculated.Zinc.Min != tc.Output.Zinc.Min || calculated.Zinc.Max != tc.Output.Zinc.Max {
			t.Errorf("[%d] Zinc mismatch: got %+v, want %+v", idx, calculated.Zinc, tc.Output.Zinc)
		}
		if calculated.Fiber.Min != tc.Output.Fiber.Min || calculated.Fiber.Max != tc.Output.Fiber.Max {
			t.Errorf("[%d] Fiber mismatch: got %+v, want %+v", idx, calculated.Fiber, tc.Output.Fiber)
		}
		if calculated.Phosphorus.Min != tc.Output.Phosphorus.Min || calculated.Phosphorus.Max != tc.Output.Phosphorus.Max {
			t.Errorf("[%d] Phosphorus mismatch: got %+v, want %+v", idx, calculated.Phosphorus, tc.Output.Phosphorus)
		}
		if calculated.Selenium.Min != tc.Output.Selenium.Min || calculated.Selenium.Max != tc.Output.Selenium.Max {
			t.Errorf("[%d] Selenium mismatch: got %+v, want %+v", idx, calculated.Selenium, tc.Output.Selenium)
		}
		if calculated.Copper.Min != tc.Output.Copper.Min || calculated.Copper.Max != tc.Output.Copper.Max {
			t.Errorf("[%d] Copper mismatch: got %+v, want %+v", idx, calculated.Copper, tc.Output.Copper)
		}
		if calculated.Manganese.Min != tc.Output.Manganese.Min || calculated.Manganese.Max != tc.Output.Manganese.Max {
			t.Errorf("[%d] Manganese mismatch: got %+v, want %+v", idx, calculated.Manganese, tc.Output.Manganese)
		}
		if calculated.VitaminA.Min != tc.Output.VitaminA.Min || calculated.VitaminA.Max != tc.Output.VitaminA.Max {
			t.Errorf("[%d] VitaminA mismatch: got %+v, want %+v", idx, calculated.VitaminA, tc.Output.VitaminA)
		}
		if calculated.VitaminD.Min != tc.Output.VitaminD.Min || calculated.VitaminD.Max != tc.Output.VitaminD.Max {
			t.Errorf("[%d] VitaminD mismatch: got %+v, want %+v", idx, calculated.VitaminD, tc.Output.VitaminD)
		}
		if calculated.VitaminE.Min != tc.Output.VitaminE.Min || calculated.VitaminE.Max != tc.Output.VitaminE.Max {
			t.Errorf("[%d] VitaminE mismatch: got %+v, want %+v", idx, calculated.VitaminE, tc.Output.VitaminE)
		}
		if calculated.VitaminK.Min != tc.Output.VitaminK.Min || calculated.VitaminK.Max != tc.Output.VitaminK.Max {
			t.Errorf("[%d] VitaminK mismatch: got %+v, want %+v", idx, calculated.VitaminK, tc.Output.VitaminK)
		}
		if calculated.B1.Min != tc.Output.B1.Min || calculated.B1.Max != tc.Output.B1.Max {
			t.Errorf("[%d] B1 mismatch: got %+v, want %+v", idx, calculated.B1, tc.Output.B1)
		}
		if calculated.B2.Min != tc.Output.B2.Min || calculated.B2.Max != tc.Output.B2.Max {
			t.Errorf("[%d] B2 mismatch: got %+v, want %+v", idx, calculated.B2, tc.Output.B2)
		}
		if calculated.B3.Min != tc.Output.B3.Min || calculated.B3.Max != tc.Output.B3.Max {
			t.Errorf("[%d] B3 mismatch: got %+v, want %+v", idx, calculated.B3, tc.Output.B3)
		}
		if calculated.B5.Min != tc.Output.B5.Min || calculated.B5.Max != tc.Output.B5.Max {
			t.Errorf("[%d] B5 mismatch: got %+v, want %+v", idx, calculated.B5, tc.Output.B5)
		}
		if calculated.B6.Min != tc.Output.B6.Min || calculated.B6.Max != tc.Output.B6.Max {
			t.Errorf("[%d] B6 mismatch: got %+v, want %+v", idx, calculated.B6, tc.Output.B6)
		}
		if calculated.Folate.Min != tc.Output.Folate.Min || calculated.Folate.Max != tc.Output.Folate.Max {
			t.Errorf("[%d] Folate mismatch: got %+v, want %+v", idx, calculated.Folate, tc.Output.Folate)
		}
		if calculated.B12.Min != tc.Output.B12.Min || calculated.B12.Max != tc.Output.B12.Max {
			t.Errorf("[%d] B12 mismatch: got %+v, want %+v", idx, calculated.B12, tc.Output.B12)
		}
		if calculated.VitaminC.Min != tc.Output.VitaminC.Min || calculated.VitaminC.Max != tc.Output.VitaminC.Max {
			t.Errorf("[%d] VitaminC mismatch: got %+v, want %+v", idx, calculated.VitaminC, tc.Output.VitaminC)
		}
	}
}

type driCase struct {
	Sex    string             `json:"sex"`
	Age    int                `json:"age"`
	Target map[string]float64 `json:"targets"`
	Upper  map[string]struct {
		Limit           float64 `json:"limit"`
		SupplementsOnly bool    `json:"supplementsOnly"`
	} `json:"upper_limits"`
}

func readVector(t *testing.T, name string) []byte {
	t.Helper()
	for _, p := range []string{
		filepath.Join("..", "..", "..", "..", "packages", "vectors", name),
		filepath.Join("..", "..", "packages", "vectors", name),
		filepath.Join("packages", "vectors", name),
	} {
		if data, err := os.ReadFile(p); err == nil {
			return data
		}
	}
	t.Fatalf("%s not found: the DRI vectors are part of the repo, a test that cannot read them must fail, not skip", name)
	return nil
}

// cc-73b: every age 9 to 100 for both sexes, the DRI target and the upper limit of each nutrient, from the web's lib/rda.
func TestSharedDRIVectors(t *testing.T) {
	var cases []driCase
	if err := json.Unmarshal(readVector(t, "dri.json"), &cases); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if len(cases) != 184 {
		t.Fatalf("expected 184 cases (92 ages x 2 sexes), got %d", len(cases))
	}
	for _, c := range cases {
		got := CalculateTargets(UserProfileForTargets{Sex: c.Sex, WeightKg: 65, Goal: "maintain", Age: c.Age})
		byID := map[string]TargetRange{
			"calcium": got.Calcium, "phosphorus": got.Phosphorus, "magnesium": got.Magnesium, "iron": got.Iron, "zinc": got.Zinc,
			"selenium": got.Selenium, "copper": got.Copper, "manganese": got.Manganese, "potassium": got.Potassium,
			"vitamin_a": got.VitaminA, "vitamin_d": got.VitaminD, "vitamin_e": got.VitaminE, "vitamin_k": got.VitaminK,
			"b1": got.B1, "b2": got.B2, "b3": got.B3, "b5": got.B5, "b6": got.B6, "folate": got.Folate, "b12": got.B12, "vitamin_c": got.VitaminC,
		}
		if len(c.Target) != len(byID) {
			t.Fatalf("%s %d: %d targets in the vector, %d in the API", c.Sex, c.Age, len(c.Target), len(byID))
		}
		for id, want := range c.Target {
			r, ok := byID[id]
			if !ok || r.Min != want || r.Max != want {
				t.Errorf("%s %d %s: got %+v, want %v", c.Sex, c.Age, id, r, want)
			}
		}
		for id := range dri {
			want, has := c.Upper[id]
			ul, ok := UpperLimitFor(id, c.Age)
			if has != ok {
				t.Errorf("%s %d %s: has a UL in the vector %v, in the API %v", c.Sex, c.Age, id, has, ok)
				continue
			}
			if ok && (ul.Limit != want.Limit || ul.SupplementsOnly != want.SupplementsOnly) {
				t.Errorf("%s %d %s UL: got %+v, want %+v", c.Sex, c.Age, id, ul, want)
			}
		}
	}
}

// The coach's macros are the upper end: 65 kg and 69 kg, every goal, worked out by hand.
func TestUpperEndMacros(t *testing.T) {
	cases := []struct {
		kg                        float64
		goal                      string
		kcal, protein, fat, carbs float64
		fiberMan, fiberWoman      float64
	}{
		{65, "build", 2600, 143, 65, 361, 36, 30},
		{65, "maintain", 2275, 143, 65, 280, 32, 30},
		{65, "cut", 1950, 143, 65, 198, 27, 27},
		{65, "deep_cut", 1625, 143, 65, 117, 23, 23},
		{69, "build", 2760, 152, 69, 383, 39, 30},
		{69, "maintain", 2415, 152, 69, 297, 34, 30},
		{69, "cut", 2070, 152, 69, 210, 29, 29},
		{69, "deep_cut", 1725, 152, 69, 124, 24, 24},
	}
	for _, c := range cases {
		m := CalculateTargets(UserProfileForTargets{Sex: "male", WeightKg: c.kg, Goal: c.goal, Age: 25})
		w := CalculateTargets(UserProfileForTargets{Sex: "female", WeightKg: c.kg, Goal: c.goal, Age: 25})
		one := func(name string, r TargetRange, want float64) {
			if r.Min != want || r.Max != want {
				t.Errorf("%v kg %s %s: got %+v, want %v", c.kg, c.goal, name, r, want)
			}
		}
		one("kcal", m.Calories, c.kcal)
		one("protein", m.Protein, c.protein)
		one("fat", m.Fat, c.fat)
		one("carbs", m.Carbs, c.carbs)
		one("fibre man", m.Fiber, c.fiberMan)
		one("fibre woman", w.Fiber, c.fiberWoman)
	}
}

// Fast carbs and salt stay ranges (Hao 20/10); the period makes a woman's iron the coach's 28 mg.
func TestRangesAndPeriodIron(t *testing.T) {
	for _, c := range []struct {
		minutes                        int
		fastMin, fastMax, naMin, naMax float64
	}{{0, 0, 0, 1570, 2360}, {60, 30, 45, 2750, 4130}, {120, 60, 90, 3930, 5900}} {
		got := CalculateTargets(UserProfileForTargets{Sex: "male", WeightKg: 65, Goal: "maintain", TrainingMinutes: c.minutes, Age: 25})
		if got.FastCarbs.Min != c.fastMin || got.FastCarbs.Max != c.fastMax {
			t.Errorf("%d min fast carbs: got %+v", c.minutes, got.FastCarbs)
		}
		if got.Sodium.Min != c.naMin || got.Sodium.Max != c.naMax {
			t.Errorf("%d min sodium: got %+v", c.minutes, got.Sodium)
		}
	}
	base := CalculateTargets(UserProfileForTargets{Sex: "female", WeightKg: 65, Goal: "maintain", Age: 25})
	period := CalculateTargets(UserProfileForTargets{Sex: "female", WeightKg: 65, Goal: "maintain", Age: 25, IsPeriod: true})
	if base.Iron.Min != 18 || period.Iron.Min != 28 || period.Iron.Max != 28 {
		t.Errorf("iron: base %+v, period %+v", base.Iron, period.Iron)
	}
	man := CalculateTargets(UserProfileForTargets{Sex: "male", WeightKg: 65, Goal: "maintain", Age: 25, IsPeriod: true})
	if man.Iron.Min != 8 {
		t.Errorf("a man ignores the period: %+v", man.Iron)
	}
}
