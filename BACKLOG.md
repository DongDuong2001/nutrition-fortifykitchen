# Backlog: features learned from Cronometer

Source: https://cronometer.com/features/track-food.html (reviewed 10/10/2026).
Our edge over Cronometer: coach-rule targets and Vietnamese-first food data. Their edge: fast logging and trusted data.

## Release 1 (add to the UI plan)
- [ ] **Water tracking:** a water card on Today with quick "+250 ml" / "+500 ml" buttons and a daily target. Count water from foods too, when the data exists.
- [ ] **Copy and multi-select:** extend "Chép hôm qua" to copy any meal or a whole day to another date or meal. Allow selecting several entries to move, copy or delete.
- [ ] **Recent and favourites:** "Gần đây" and "Yêu thích" in Add food (already in the design). Star a food from its detail screen.
- [ ] **Recipes / dishes:** build a dish from ingredients, with servings. Nutrients are calculated from the ingredients. This is also needed for Vietnamese dishes in the food data.
- [ ] **Micros phone header:** the header takes ~1/3 of the screen; collapse the summary panel on scroll.
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

## Training (from ag-01 review)
- [ ] **Training checklist ticks aren't saved:** store the ticks per day in the diary.
- [ ] **Duration chips wrap 3+2:** use an even grid.
- [ ] **"Carb nhanh" sub-line copy:** check it against design/screens/Training.dc.html.

## Share image (from cc-47)
- [ ] **Share image: draw anyway in the fallback face, measuring the height in that face** (today a picture whose fonts do not embed shows Không tạo được ảnh. Tải lại trang rồi thử lại.).
- (Hao 24/10) Ngày ăn mẫu list: the saved-day cards get "x/N đạt" (vi chất) so days can be compared without opening each one.
