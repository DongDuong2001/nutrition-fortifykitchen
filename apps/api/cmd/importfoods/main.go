package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PortionItem holds portion metadata
type PortionItem struct {
	LabelVi string  `json:"label_vi"`
	Grams   float64 `json:"grams"`
	Sort    int     `json:"sort"`
}

// FoodRecord represents a food entry to import
type FoodRecord struct {
	Source    string              `json:"source"`
	SourceID  string              `json:"source_id"`
	Name      string              `json:"name"`
	NameVi    string              `json:"name_vi"`
	Category  string              `json:"category"`
	Brand     *string             `json:"brand,omitempty"`
	TipVi     *string             `json:"tip_vi,omitempty"`
	Nutrients map[string]*float64 `json:"nutrients"` // null when missing, never 0 for unknown
	Portions  []PortionItem       `json:"portions"`
}

var countedNutrients = []string{
	"energy", "protein", "carbs", "fat", "fiber",
	"sodium", "potassium", "calcium", "iron", "phosphorus",
	"magnesium", "zinc", "copper", "manganese", "selenium",
	"vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e",
	"vitamin_b1", "vitamin_b2", "vitamin_b3",
}

func main() {
	dryRun := flag.Bool("dry-run", false, "Simulate import without committing to database")
	dataFile := flag.String("file", "", "Path to JSON file containing food records")
	flag.Parse()

	fmt.Println("=== H1T MICRO Food Catalog Importer ===")
	if *dryRun {
		fmt.Println("Mode: DRY RUN (No database changes will be saved)")
	}

	if *dataFile == "" {
		fmt.Println("No input file provided. Use --file <path> to load food records.")
		os.Exit(0)
	}

	raw, err := os.ReadFile(*dataFile)
	if err != nil {
		fmt.Printf("Failed to read data file: %v\n", err)
		os.Exit(1)
	}

	var records []FoodRecord
	if err := json.Unmarshal(raw, &records); err != nil {
		fmt.Printf("Failed to parse JSON records: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Loaded %d food records from %s\n", len(records), *dataFile)

	if len(records) == 0 {
		fmt.Println("No records found in data file.")
		return
	}

	// Completeness report: % of the 22 counted nutrients per food
	totalCoveragePct := 0.0
	for _, r := range records {
		present := 0
		for _, k := range countedNutrients {
			if v, ok := r.Nutrients[k]; ok && v != nil {
				present++
			}
		}
		pct := (float64(present) / float64(len(countedNutrients))) * 100.0
		totalCoveragePct += pct
	}
	avgCoverage := totalCoveragePct / float64(len(records))
	fmt.Printf("Completeness Report: %.1f%% average coverage of the 22 counted nutrients across %d foods\n", avgCoverage, len(records))

	if *dryRun {
		fmt.Println("Dry-run complete. Exiting.")
		return
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fmt.Println("DATABASE_URL environment variable is required for live import")
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	imported := 0
	for _, r := range records {
		nutrientsJSON, err := json.Marshal(r.Nutrients)
		if err != nil {
			fmt.Printf("Error encoding nutrients for %s: %v\n", r.NameVi, err)
			continue
		}

		var foodID string
		query := `
			INSERT INTO nutrition.foods (
				name, name_vi, category, source, source_id, brand, tip_vi, per_100g, per_100g_nutrients, is_custom
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, false)
			ON CONFLICT (source, source_id) DO UPDATE SET
				name = EXCLUDED.name,
				name_vi = EXCLUDED.name_vi,
				category = EXCLUDED.category,
				brand = EXCLUDED.brand,
				tip_vi = EXCLUDED.tip_vi,
				per_100g = EXCLUDED.per_100g,
				per_100g_nutrients = EXCLUDED.per_100g
			RETURNING id
		`
		err = pool.QueryRow(ctx, query,
			r.Name, r.NameVi, r.Category, r.Source, r.SourceID, r.Brand, r.TipVi, nutrientsJSON,
		).Scan(&foodID)
		if err != nil {
			fmt.Printf("Error inserting food %s: %v\n", r.NameVi, err)
			continue
		}

		// Refresh portions
		_, _ = pool.Exec(ctx, "DELETE FROM nutrition.food_portions WHERE food_id = $1", foodID)
		for _, p := range r.Portions {
			_, err = pool.Exec(ctx, `
				INSERT INTO nutrition.food_portions (food_id, label_vi, grams, sort)
				VALUES ($1, $2, $3, $4)
			`, foodID, p.LabelVi, p.Grams, p.Sort)
			if err != nil {
				fmt.Printf("Error inserting portion %s for food %s: %v\n", p.LabelVi, r.NameVi, err)
			}
		}

		imported++
	}

	fmt.Printf("Successfully imported %d foods into nutrition.foods\n", imported)
}
