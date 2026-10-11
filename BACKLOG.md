# Backlog: features learned from Cronometer

Source: https://cronometer.com/features/track-food.html (reviewed 10/10/2026).
Our edge over Cronometer: coach-rule targets and Vietnamese-first food data. Their edge: fast logging and trusted data.

## Release 1 (add to the UI plan)
- [ ] **Water tracking:** a water card on Today with quick "+250 ml" / "+500 ml" buttons and a daily target. Count water from foods too, when the data exists.
- [ ] **Copy and multi-select:** extend "Chép hôm qua" to copy any meal or a whole day to another date or meal. Allow selecting several entries to move, copy or delete.
- [ ] **Recent and favourites:** "Gần đây" and "Yêu thích" in Add food (already in the design). Star a food from its detail screen.
- [ ] **Recipes / dishes:** build a dish from ingredients, with servings. Nutrients are calculated from the ingredients. This is also needed for Vietnamese dishes in the food data.
- [ ] **Data trust:** a "Nguồn dữ liệu" page, a source label on food detail (USDA / CNF / VN), and "chưa có dữ liệu" instead of 0.

## Release 2+
- [ ] **Barcode scanning:** packaged foods via Open Food Facts (ODbL licence).
- [ ] **Auto-repeat items (Pro):** foods logged on a schedule, e.g. the same breakfast every weekday.
- [ ] **Recipe importer (Pro):** paste a recipe URL and get a dish.
- [ ] **AI photo logging:** photograph a meal (cơm phần, phở…) to get suggested foods and portions, which the user confirms. Needs reliable Vietnamese dish data first.
- [ ] **Voice logging:** "thêm 2 quả trứng vào bữa sáng".
- [ ] **Typed vitamins map:** `CompleteTargets` (lib/targets.ts) has a `[key: string]` index signature. Replace it with a typed vitamins map so misspelled keys fail typecheck.

## Pricing principle (from Cronometer)
The core stays free: logging, barcode, the full nutrient report. Pro charges for convenience and coaching: auto-repeat, recipe import, coach suggestions, trends.
