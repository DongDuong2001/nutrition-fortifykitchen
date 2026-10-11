# Progress

## Now working
| Task | Owner | Files / routes |
|---|---|---|

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | TASK ui-04: Vi chất screen |
| 10/10/2026 | ui-04 | Layout corrections for Vi chất (/micros): ink header date row + title + 8/22 stat in Saira Condensed, horizontal category chips on paper, 4-col equal grid legend, groups reordered (Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan), 2-line nutrient rows | Next tasks |
| 10/10/2026 | ui-04-fix | Vi chất sticky headers, scroll-spy, balanced desktop columns, sample breakdown data, alignment & range targets | Next tasks |
| 11/10/2026 | ui-04-fix-2 | Sticky group header bug fixed via overflow-clip; sample data totals consistency & invariant tests | TASK ui-05: Add food flow |
| 11/10/2026 | ui-05 | Add food flow: search with diacritics & fuzzy fallback, food detail, create custom food, meal switcher sheet, desktop add food modal dialog, reactive diary store with sessionStorage, toast alerts, dynamic Today and Micros updates | Next tasks |
| 11/10/2026 | ui-05-fix | Hydration bug fix, Asia/Ho_Chi_Minh default meal slot, layout primitives (ChipGroup, StatGroup, FormRow), 5-row portion panel alignment & 2-col desktop micros, return focus to opener on modal close, Playwright alignment & hydration tests | Next tasks |
| 11/10/2026 | ui-05-fix-2 | Meal default fallback & neutral placeholder, sessionStorage hydration visibility assertions, content-based alignment verification & desktop meal fix, adaptive precision & Vietnamese nutrient synonyms, single PortionPanel component, FormRow inputs, npm scripts & AGENTS.md documentation | Next tasks |
| 11/10/2026 | ui-05-fix-3 | Nutrient catalog keys & Vitamin B* naming, useMealSlot client resolution hook, desktop Today left text alignment (-mx-2), content-based data-align-edge checks, probe scripts (hydration & screenshots) | Next tasks |
| 11/10/2026 | ui-05-fix-4 | Put test:hydration into npm run check gates, remove dead vitamin remap in micros page, read targets from calculateTargets in PortionPanel & food detail (incl. vitamin_k %), remove playwright test permission from .claude/settings.json | ui-05 approved |

## Quality Gate Outputs (ui-05-fix-4)
- Raw `npm run check` output:
```
> nutrition-web@0.1.0 check
> npm run typecheck && npm run test && npm run build && npm run test:align && npm run test:hydration


> nutrition-web@0.1.0 typecheck
> tsc --noEmit


> nutrition-web@0.1.0 test
> vitest run


 RUN  v5.0.3 /Users/haovu310/Documents/HITMicro/nutrition-fortifykitchen/apps/web


 ❯ lib/__tests__/portion.test.ts [queued]

 Test Files 0 passed (7)
      Tests 0 passed (0)
   Start at 13:49:55
   Duration 0ms
 ✓ lib/__tests__/levels.test.ts (10 tests) 3ms
 ✓ lib/__tests__/targets.test.ts (9 tests) 3ms
 ✓ lib/__tests__/format.test.ts (4 tests) 12ms
 ✓ lib/__tests__/portion.test.ts (5 tests) 2ms
 ✓ lib/__tests__/meal-slot.test.ts (8 tests) 13ms
 ✓ lib/__tests__/search.test.ts (7 tests) 3ms
 ✓ lib/__tests__/nutrients.test.ts (10 tests) 13ms

 Test Files  7 passed (7)
      Tests  53 passed (53)
   Start at  13:49:55
   Duration  169ms (transform 65%, import 17%, tests 13%, worker 5%)


> nutrition-web@0.1.0 build
> next build --webpack

▲ Next.js 16.4.0 (webpack)
✓ Running next.config took 4ms

  Creating an optimized production build ...
✓ Compiled successfully in 1092ms
  Finished TypeScript in 251ms    ✓ Finished TypeScript in 251ms 
  Collecting page data using 11 workers in 423ms    ✓ Collecting page data using 11 workers in 423ms 
✓ Generating static pages using 11 workers (13/13) in 129ms
  Collecting build traces in 2.4s    ✓ Collecting build traces in 2.4s 
  Finalizing page optimization in 2.4s    ✓ Finalizing page optimization in 2.4s 

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /add
├ ○ /admin/review
├ ○ /dev/ui
├ ○ /foods
├ ƒ /foods/[id]
├ ○ /foods/new
├ ○ /login
├ ○ /micros
├ ƒ /micros/[nutrient]
├ ○ /profile
├ ○ /today
└ ○ /training


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


> nutrition-web@0.1.0 test:align
> python3 tests/alignment.py

=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 38})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 15})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 38})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

All alignment checks passed cleanly (<= 1px difference)!

> nutrition-web@0.1.0 test:hydration
> python3 tests/probes/hydration.py

=== Running Hydration Reload Check against http://localhost:3100 ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /today
[PASS] 0 hydration errors on /add with sessionStorage loaded
[PASS] Recent search chip 'Hạt điều test' is visible on /add

All hydration checks passed cleanly (0 hydration errors, sessionStorage entries rendered)!
```

## Quality Gate Outputs (ui-05-fix-3)
- `npx tsc --noEmit`: 0 errors (clean).
- `npm test`:
```
 Test Files  7 passed (7)
      Tests  53 passed (53)
   Duration  209ms
```
- Invariant tests passed:
  - All nutrient keys in `MOCK_FOODS` and `SAMPLE_DAY` exist in `NUTRIENT_CATALOG`.
  - Adding Chà là 30 g increases diary `b6` (1.1 → 1.15 mg, 88%).
- `npm run build`: 13/13 pages compiled statically, 0 errors.
- `npm run probe -- tests/probes/hydration.py`:
  - 0 hydration console errors on `/today` and `/add` with sessionStorage loaded.
  - Seeded entry 'Chà là hạt dẻ test' visible on `/today`.
  - Recent search chip 'Hạt điều test' visible on `/add`.
- Alignment self-check (`npm run test:align`):
  - Mobile (390px):
    - Edges: `/today` (`meal-card` 10 elements) pass.
    - Edges: `/micros` (`micros-card` 38 elements) pass.
    - Edges: `/add` (`portion` 5 elements) pass.
    - Edges: `/foods/food-cha-la` (`food-detail` 3 elements) pass.
  - Desktop (1440px):
    - Edges: `/today` (`desktop-meal` 15 elements: title `Bữa ăn`, meal headers, meal items, + Thêm món) pass.
    - Edges: `/micros` (`micros-card` 38 elements) pass.
    - Edges: `/add` (`portion` 5 elements) pass.
    - Edges: `/foods/food-cha-la` (`food-detail` 3 elements) pass.
- Screenshots verified:
  - `apps/web/.screenshots/today-desktop-1440.png`: card title "Bữa ăn", meal headers ("Bữa sáng", "Bữa trưa", "Trước tập") and food items share exact left text edge.
  - `apps/web/.screenshots/micros-mobile-b6-increase-390.png`: Vitamin B6 row increased to 1,15 / 1,3 mg · 88% after adding Chà là 30g; Vitamin B* naming consistent.


## Quality Gate Outputs (ui-05)
- `npx tsc --noEmit`: 0 errors (clean).
- `npx vitest run`:
```
 Test Files  7 passed (7)
      Tests  48 passed (48)
   Duration  150ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 876ms
  Finished TypeScript in 193ms
  Collecting page data using 11 workers in 429ms
✓ Generating static pages using 11 workers (13/13) in 148ms
  Collecting build traces in 2.4s
  Finalizing page optimization in 2.4s
```
- Visual verification screenshots (Playwright):
  - `apps/web/.screenshots/ui05-search-empty-390.png` (390x844: SearchEmpty for "banh trang tron" with suggestions & + Tạo món mới)
  - `apps/web/.screenshots/ui05-meal-switcher-390.png` (390x844: MealSwitcher sheet with 5 slots & time hint)
  - `apps/web/.screenshots/ui05-food-detail-390.png` (390x844: FoodDetail for Chà là with servings, macros & micros breakdown)
  - `apps/web/.screenshots/ui05-today-added-390.png` (390x844: Today screen showing floating Toast, 1.125 kcal total, 178 kcal Trước tập)
  - `apps/web/.screenshots/ui05-micros-updated-390.png` (390x844: Vi chất report showing Kali updated to 4.097 mg / 79%)
  - `apps/web/.screenshots/ui05-create-food-error-390.png` (390x844: CreateFood form with required field validation alert)
  - `apps/web/.screenshots/ui05-desktop-add-dialog-1440.png` (1440x900: Desktop AddFood dialog modal over Today)
  - `apps/web/.screenshots/ui05-search-empty-1440.png` (1440x900: Desktop SearchEmpty state in 2-pane modal)
  - `apps/web/.screenshots/ui05-food-detail-1440.png` (1440x900: Desktop FoodDetail screen)
  - `apps/web/.screenshots/ui05-create-food-error-1440.png` (1440x900: Desktop CreateFood screen with validation error)
  - `apps/web/.screenshots/ui05-today-1440.png` (1440x900: Desktop Today screen with meal + Thêm links)
  - `apps/web/.screenshots/ui05-micros-1440.png` (1440x900: Desktop Micros 2-column balanced report)

## Quality Gate Outputs (ui-05-fix)
- `npx tsc --noEmit`: 0 errors (clean).
- `npm test`:
```
 Test Files  7 passed (7)
      Tests  49 passed (49)
   Duration  185ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 944ms
  Finished TypeScript in 193ms
  Collecting page data using 11 workers in 510ms
✓ Generating static pages using 11 workers (13/13) in 139ms
  Collecting build traces in 2.3s
  Finalizing page optimization in 2.3s
```
- `npm run test:align`:
```
=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 65})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 14})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 65})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

=== Hydration reload tests with sessionStorage ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] 0 hydration errors on /add with sessionStorage loaded

All alignment and hydration tests passed cleanly (<= 1px difference, 0 hydration errors)!
```
- Alignment Edge Self-Check:
  - /today: Edges: meal-card (10 rows), desktop-meal (14 rows) pass.
  - /micros: Edges: micros-card (65 rows) pass.
  - /add: Edges: portion (5 rows) pass.
  - /foods/[id]: Edges: food-detail (3 rows) pass.
- Visual inspection screenshots (Playwright):
  - `apps/web/.screenshots/portion-panel-390.png` (390x844: mobile portion panel dock with 5-row alignment, ChipGroup, StatGroup, full-width CTA)
  - `apps/web/.screenshots/portion-panel-1440.png` (1440x900: desktop right pane portion panel with 5-row alignment and 2-column micros table underneath)

## Quality Gate Outputs (ui-05-fix-2)
- `npm run typecheck` (`tsc --noEmit`): 0 errors (clean).
- `npm run test` (`vitest run`):
```
 Test Files  7 passed (7)
      Tests  51 passed (51)
   Duration  145ms
```
- `npm run build` (`next build --webpack`):
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 1354ms
  Finished TypeScript in 224ms
  Collecting page data using 11 workers in 373ms
✓ Generating static pages using 11 workers (13/13) in 129ms
  Collecting build traces in 2.4s
  Finalizing page optimization in 2.4s
```
- Content-based alignment pre-fix failure captured:
```
[FAIL] /today @ desktop (1440px): ['Group "desktop-meal" left mismatch: diff 8.00px between <h3 class="m-0 text-[15px] font-bold text-text"> (301.0) and <span class="truncate text-text font-normal"> (309.0)', ...]
```
- `npm run test:align` post-fix:
```
=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 65})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 14})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 65})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

=== Hydration reload tests with sessionStorage ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /today
[PASS] 0 hydration errors on /add with sessionStorage loaded
[PASS] Recent search chip 'Hạt điều test' is visible on /add

All alignment and hydration tests passed cleanly (<= 1px difference, 0 hydration errors)!
```
- Alignment Edge Self-Check:
  - /today: Edges: desktop-meal (14 rows), meal-card (10 rows) pass.
  - /micros: Edges: micros-card (65 rows) pass.
  - /add: Edges: portion (5 rows) pass.
  - /foods/[id]: Edges: food-detail (3 rows) pass.
- Visual inspection screenshots (Playwright):
  - `apps/web/.screenshots/add-portion-mobile.png` (390x844: mobile dock with 4 derived serving columns, aligned 4-col macro stats, 0,7g & 0,1g decimal commas)
  - `apps/web/.screenshots/add-portion-desktop.png` (1440x900: desktop right pane portion panel with 4 columns, B6 (Pyridoxine) synonym, 0,05 mg precision)
  - `apps/web/.screenshots/today-meals-desktop.png` (1440x900: desktop meal list with item links and + Thêm món aligned to exact same left edge as meal title)


