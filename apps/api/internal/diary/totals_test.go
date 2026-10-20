package diary

import (
	"testing"
)

func TestComputeDayTotals_NoPrematureRounding(t *testing.T) {
	// 10 entries with fractional B12 = 0.004 each.
	// Premature round2 would truncate each to 0.00, yielding 0.00.
	// End-of-aggregation rounding sums 10 * 0.004 = 0.04, yielding 0.04.
	b12Val := 0.004
	entries := make([]DiaryEntryItem, 10)
	for i := 0; i < 10; i++ {
		entries[i] = DiaryEntryItem{
			Nutrients: map[string]*float64{
				"vitamin_b12": &b12Val,
			},
		}
	}

	totals := computeDayTotals(entries)
	if totals["vitamin_b12"] == nil {
		t.Fatal("expected vitamin_b12 total to be non-nil")
	}
	if *totals["vitamin_b12"] != 0.04 {
		t.Fatalf("expected vitamin_b12 = 0.04, got %v", *totals["vitamin_b12"])
	}
}

func TestComputeDayTotals_CaloriesAndEnergy(t *testing.T) {
	cal1 := 100.334
	cal2 := 200.334
	entries := []DiaryEntryItem{
		{Calories: &cal1},
		{Calories: &cal2},
	}

	totals := computeDayTotals(entries)
	if totals["calories"] == nil || totals["energy"] == nil {
		t.Fatal("expected calories and energy to be non-nil")
	}
	// 100.334 + 200.334 = 300.668 -> rounded to 300.67
	if *totals["calories"] != 300.67 {
		t.Fatalf("expected calories = 300.67, got %v", *totals["calories"])
	}
	if *totals["energy"] != 300.67 {
		t.Fatalf("expected energy = 300.67, got %v", *totals["energy"])
	}
}
