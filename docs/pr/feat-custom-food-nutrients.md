# feat/custom-food-nutrients: Tự nhập takes every nutrient on a label

Front end only (apps/web). **Stacks on `feat/rename-labels` (#49)**; retarget as the stack merges. `apps/api` is untouched: the form sends what `CreateCustomFood` already takes.

## ValidNutrients (for Dong)
Every key the form sends is in `apps/api/internal/nutrition/service.go` `ValidNutrients`, with the unit shown on the field. `fiber`, `sugars`, `saturated_fat`, `trans_fat` and `cholesterol` all exist, so **no field was left out and nothing is missing on the API side**. `lib/__tests__/custom-food-fields.test.ts` holds a copy of the map and checks every field's key and unit against it.

## The form (`app/(app)/foods/new/page.tsx`, Tự nhập)
- **Main block, in nutrition-label order:** Năng lượng (kcal) *, Đạm (g), Tinh bột (g), then Chất xơ (g) and Đường (g) indented under it, Chất béo (g), then Bão hòa (g) and Trans (g) indented under it, Cholesterol (mg), Sodium (mg).
  - Only kcal is required.
  - Macro rows have Vietnamese names. Sodium and everything in the sheet keep their English catalogue names.
  - Sub-rows sit on the same two columns as the rows above them. A small connector before the label marks the indent.
- **Empty means no data, never 0.** Every number field shows "–" while blank, the macros included (they used to show "Ví dụ: 250"). A blank or unreadable field is left out of the request.
- **"+ Thêm vi chất khác"** opens `components/foods/nutrient-picker-sheet.tsx` on the shared `Sheet`, so it has the same spring and the same one ✕.
  - The sheet has a search field: the shared `FoodSearchField`, given a `label` and `placeholder`. It matches the English or Vietnamese name, with or without marks ("mag", "magie", "sắt", "kem", "b9").
  - Calcium, Iron, Potassium and Vitamin D come first, then Vitamin and Khoáng chất: the other 21 tracked vitamins and minerals (Sodium is in the main block).
  - Tapping a row closes the sheet, adds the field (label and unit) under the main block, focuses it, and removes it from the list.
  - An added field has an ×: 24 px drawn, 44 px to touch. It takes the field and its value off, and the nutrient goes back to the sheet.
- **Payload:** `lib/custom-food-fields.ts` `customFoodPayload`. kcal, Đạm, Tinh bột and Chất béo go top level as before; every other value goes in `micros` under its ValidNutrients key. The values are per serving, and the API's per-100 g conversion is unchanged.
- **Layout:** a 2-column grid as before. Inputs are inputmode="decimal" and 48 px tall (the existing V3 field, above 44 px). Below 18 rem of card width, the fields stack into one column instead of wrapping or cutting: that is 360 px at 125 % text or more. At 360 px and 150 % text the column was 119 px, and "Năng lượng *" needs 142.
- **Amber note:** "Tự nhập chỉ có kcal và chất đa lượng." is no longer true, so that sentence is gone. "Vi chất để trống nếu bạn không nhập. Món sẽ có nhãn Tự nhập." stays.

## Tutorials
- **Release:** one item in the open entry `2026-10-22a`, the one #49 made for the stack (no new release id). It is titled "Nhập đủ vi chất trên nhãn", and the body opens with the brief's words "Nhập đủ chất xơ, đường và mọi vi chất trên nhãn". As a title, the brief's line wraps at 390 px, and every item title is one line (`cc_46.py`).
- **Tour step:** one step on + Thêm vi chất khác, or on the + of the bar on Hôm nay (fallback). With it, 22a has 7 steps, so on Hôm nay the joined tour for an older account is 21c's two plus 22a's six, and 21b's steps give way (`releases.test.ts`, `cc_46.py`, `cc_tutorials.py`).
- **Tip `food-new-nutrients`** on the button. It fits D-ONB-02: next to its control, once, gone once the sheet has been opened. It waits for the button through a `lib/tour-bus` presence (`add-nutrient`), so it never shows in Tính từ nguyên liệu, and it comes after the existing `food-new` tip. `tutorial-targets` is green.

## Probe `tests/probes/custom_food_nutrients.py` (green)
Run at 360, at 360 with 150 % text, and at 390:
- Field order and labels; "–" in every field; inputmode; ≥ 44 px; one required field.
- Sub-rows on the grid columns.
- No label wraps, nothing in the card is cut, no sideways scroll, and "1.000,5" fits every field.
- The sheet: pinned four first, 21 rows, no Sodium, the two groups, search.
- Pick, focus, gone from the list; three added fields; × hit area; × gives the nutrient back.

Save, at 390 on an empty day: a food with fibre 4 g, sugar 9 g, Vitamin C 40 mg and Magnesium 60 mg.
- **Hôm nay counts them:** the hero shows Chất xơ 4, and the nutrient rows show Vitamin C 40 mg and Magnesium 60 mg.
- **The food page shows Vitamin C 40 mg and Magnesium 60 mg.**
- ⚠️ **The food page has no row for Chất xơ or Đường** (or Bão hòa, Trans, Cholesterol). Its macro card is kcal, Tinh bột, Đạm and Chất béo, and its micro list is the 22 counted nutrients. The values are saved, and Hôm nay reads the fibre. Showing them on the food page is outside this brief (the form "and what it uses"); see OPEN_QUESTIONS.

`v3_foods.py` and `cc_42_onboarding.py` now follow the new form: "–" for number fields, and the button is "+ Thêm vi chất khác".

Screenshots (390 and 360, plus 360 at 150 %) in `docs/screenshots/custom-food-nutrients/`: `form-*`, `sheet-*`, `added3-*`.

## Gates
`npm run gate:full` on 81ebf2d (rebased on #49's 8cabdc1), port 3151, because 3101 and 3141 are held by other sessions:
- green: typecheck, lint:design, vitest (all unit tests), build:demo, test:align (73 s), test:hydration (107 s), check:live-bundle;
- probe:all: 134 PASS, 4 REPORT, 1 QUAR (design-floor-landing.py), 2 FAIL, 1 SKIP.

The two failures were `cc_46.py` and `cc_tutorials.py`. They hardcode the joined "Có gì mới" tour, which the new step shifts. Both are updated in the next commit and were re-run green on a fresh demo build, together with `custom_food_nutrients.py`, `v3_foods.py` and `cc_42_onboarding.py`. Part 2's gate:full runs the whole suite on top of this branch.

## Judgement calls (OPEN_QUESTIONS)
- "–" placeholders go against D-WRT-07 ("a placeholder with an example"). The brief asks for "–", and the field label and unit say what to type.
- The pinned card in the sheet has no visible heading; it is named "Hay có trên nhãn" for screen readers.
- One column below 18 rem (see Layout).
- My copy, for review: the item's title and body, the tour step, and the tip.

DESIGN.md rules touched: D-WRT-07 (see above), D-CTL-01 (the × hit area), D-ONB-02 (the tip).
