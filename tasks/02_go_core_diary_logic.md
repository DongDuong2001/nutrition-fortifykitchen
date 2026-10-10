# Task 02: Core Diary Logging & 26-Nutrient Formula

## Objectives
1. Implement diary log domain models and repository in `internal/diary`:
   - Store client-generated UUID `id` to guarantee idempotent writes (`ON CONFLICT (id) DO NOTHING`).
   - Store `food_id`, `meal_slot`, `quantity`, `serving_size_g`, `nutrients_snapshot` (JSONB), and `log_date`.
2. Implement 26-Nutrient Formula in `internal/diary/service.go`:
   - For every food log entry:
     ```
     grams = quantity * serving_size_g
     nutrient_value = (per_100g_value * grams) / 100
     ```
   - Calculate all 26 macro- and micronutrients:
     - Calories (kcal), Protein (g), Carbohydrates (g), Total Fat (g), Saturated Fat (g), Trans Fat (g), Monounsaturated Fat (g), Polyunsaturated Fat (g), Fiber (g), Sugar (g), Added Sugar (g).
     - Cholesterol (mg), Sodium (mg), Potassium (mg), Calcium (mg), Iron (mg), Phosphorus (mg), Magnesium (mg), Zinc (mg), Copper (mg), Manganese (mg), Selenium (mcg).
     - Vitamin A (mcg), Vitamin C (mg), Vitamin D (mcg), Vitamin E (mg).
3. Compute Daily Aggregates:
   - Sum today's nutrient totals across all logged meals for the user.
   - Compare with `nutrition.user_targets` for `log_date` (if configured) to yield progress percentages.
4. Response Format:
   - Return HTTP 201 Created with the saved log entry and cumulative daily progress.

## Verification
- Unit test formula with fractional quantities (e.g. 1.5 servings of 150g).
- Unit test idempotency (posting identical UUID twice returns consistent state without double-counting).
- Pass `go vet ./...` and `go test ./...`.
