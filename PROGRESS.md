# Progress

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
