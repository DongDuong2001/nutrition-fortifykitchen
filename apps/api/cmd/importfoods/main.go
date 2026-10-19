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

type EdiblePortionsData struct {
	Generated      string `json:"generated"`
	Note           string `json:"note"`
	RemovePortions []struct {
		Source   string   `json:"source"`
		SourceID string   `json:"source_id"`
		NameVi   string   `json:"name_vi"`
		Kind     string   `json:"kind"`
		Remove   []string `json:"remove"`
		Keep     []string `json:"keep"`
	} `json:"remove_portions"`
	Renames []struct {
		Source   string `json:"source"`
		SourceID string `json:"source_id"`
		From     string `json:"from"`
		To       string `json:"to"`
	} `json:"renames"`
}

var countedNutrients = []string{
	// 10 minerals
	"calcium", "copper", "iron", "magnesium", "manganese",
	"phosphorus", "potassium", "selenium", "sodium", "zinc",
	// 12 vitamins
	"vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k",
	"b1", "b2", "b3", "b5", "b6", "folate", "b12",
}

func main() {
	dryRun := flag.Bool("dry-run", false, "Simulate import without committing to database")
	dataFile := flag.String("file", "", "Path to JSON file containing food records")
	ediblePortionsFile := flag.String("edible-portions", "", "Path to edible-part portions JSON (removes refuse-based portions and applies renames)")
	flag.Parse()

	fmt.Println("=== H1T MICRO Food Catalog Importer ===")
	if *dryRun {
		fmt.Println("Mode: DRY RUN (No database changes will be saved)")
	}

	if *dataFile == "" && *ediblePortionsFile == "" {
		fmt.Println("No input file provided. Use --file <path> or --edible-portions <path>")
		os.Exit(0)
	}

	var pool *pgxpool.Pool
	ctx := context.Background()

	getPool := func() *pgxpool.Pool {
		if pool != nil {
			return pool
		}
		dbURL := os.Getenv("DATABASE_URL")
		if dbURL == "" {
			fmt.Println("DATABASE_URL environment variable is required for live import")
			os.Exit(1)
		}
		var err error
		pool, err = pgxpool.New(ctx, dbURL)
		if err != nil {
			fmt.Printf("Failed to connect to database: %v\n", err)
			os.Exit(1)
		}
		return pool
	}
	defer func() {
		if pool != nil {
			pool.Close()
		}
	}()

	if *dataFile != "" {
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

		if len(records) > 0 {
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

			if !*dryRun {
				db := getPool()
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
						) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $8::jsonb, false)
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
					err = db.QueryRow(ctx, query,
						r.Name, r.NameVi, r.Category, r.Source, r.SourceID, r.Brand, r.TipVi, nutrientsJSON,
					).Scan(&foodID)
					if err != nil {
						fmt.Printf("Error inserting food %s: %v\n", r.NameVi, err)
						continue
					}

					// Refresh portions
					_, _ = db.Exec(ctx, "DELETE FROM nutrition.food_portions WHERE food_id = $1", foodID)
					for _, p := range r.Portions {
						_, err = db.Exec(ctx, `
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
		}
	}

	if *ediblePortionsFile != "" {
		raw, err := os.ReadFile(*ediblePortionsFile)
		if err != nil {
			fmt.Printf("Failed to read edible portions file: %v\n", err)
			os.Exit(1)
		}

		var edible EdiblePortionsData
		if err := json.Unmarshal(raw, &edible); err != nil {
			fmt.Printf("Failed to parse edible portions JSON: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Loaded %d remove_portions rules and %d renames from %s\n", len(edible.RemovePortions), len(edible.Renames), *ediblePortionsFile)

		if *dryRun {
			fmt.Println("Dry-run: edible-portions updates simulated successfully.")
		} else {
			db := getPool()
			renamedCount := 0
			for _, rn := range edible.Renames {
				tag, err := db.Exec(ctx, `UPDATE nutrition.foods SET name_vi = $1 WHERE source = $2 AND source_id = $3`, rn.To, rn.Source, rn.SourceID)
				if err != nil {
					fmt.Printf("Error applying rename %s -> %s: %v\n", rn.From, rn.To, err)
				} else if tag.RowsAffected() > 0 {
					renamedCount += int(tag.RowsAffected())
				}
			}
			fmt.Printf("Applied %d renames\n", renamedCount)

			removedPortionsCount := 0
			for _, item := range edible.RemovePortions {
				var foodID string
				err := db.QueryRow(ctx, `SELECT id FROM nutrition.foods WHERE source = $1 AND source_id = $2`, item.Source, item.SourceID).Scan(&foodID)
				if err != nil {
					continue
				}
				tag, err := db.Exec(ctx, `DELETE FROM nutrition.food_portions WHERE food_id = $1 AND label_vi = ANY($2)`, foodID, item.Remove)
				if err != nil {
					fmt.Printf("Error removing portions for %s: %v\n", item.NameVi, err)
				} else {
					removedPortionsCount += int(tag.RowsAffected())
				}
			}
			fmt.Printf("Removed %d refusal-based unit portions across %d foods\n", removedPortionsCount, len(edible.RemovePortions))
		}
	}
}
