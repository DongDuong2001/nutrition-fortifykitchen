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
	}
}
