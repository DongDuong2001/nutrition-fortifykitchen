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
