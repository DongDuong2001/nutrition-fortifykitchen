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
| 11/10/2026 | ui-04b | Shared AppHeader (daily, sub, tab variants), adopted in /today, /micros, /micros/[nutrient], /profile, /training, and /dev/ui; formatDayLabel timezone & yesterday support; alignment checks today-header and micros-header | Ready for review |

## Quality Gate Summary (ui-04b)
- `npm run check`: All 5 gates passed (tsc --noEmit, vitest: 98 passed in 11 files, build: 19/19 routes static/dynamic, test:align: 14 checks passed, test:hydration: 0 errors).
- Edges: today-header (1 pair pass), micros-header (1 pair pass), daily-targets (mobile & desktop), setup-row, add-list (mobile & desktop), meal-card (mobile), micros-card (mobile & desktop), portion (mobile & desktop), food-detail (mobile & desktop), desktop-meal (desktop) all pass.


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

| 11/10/2026 | cc-01 | Onboarding in Cobalt Sign: /signup (split on desktop), /signin, /signin/check-email, /signin/expired, /setup/profile and /setup/goal (one card on desktop). Mock auth and profile save behind lib/api-client.ts. Goal kcal and daily targets from lib/targets.ts. Local sub-screen header | Swap the local header for AppHeader (ui-04b). Wire Supabase auth and profile save (Dong) |
| 11/10/2026 | cc-02 | Food categories (10 keys, order and labels in lib/food-categories.ts, web-side mock). /add: one scrolling filter row (Tất cả, Yêu thích, categories with foods) and recents as { foodId, servingLabel }. Tất cả groups by category with sticky headers. Shared FoodList and ChipRow on phone and desktop | Dong: category column on foods (OPEN_QUESTIONS). Favourites store for Yêu thích |
| 11/10/2026 | cc-02 fix | Search clear: one × (native hidden). /add opens with no food: phone panel after a tap, desktop empty state. Yêu thích hidden until favourites exist. Filter row wraps from 1024 px; phone scrolls with a left fade once scrolled. formatAmount for amounts with units (kcal and mg whole, g and µg one decimal under 100, under 1 up to two decimals). Vitamin B6 label. Sticky header on card with divider. bottom-nav storage guarded | Dong: category column. Favourites store |
| 11/10/2026 | cc-02 final | Rebased onto feat/ui 42ac9d6 (ui-05-fix-4). Re-applied cc-02 on the useMealSlot add page. Folate label is now "Vitamin B9". Hydration probe moved to h1t_recent_foods_v2. Onboarding and add-list alignment checks re-added with pair counts. BACKLOG: typed vitamins map | Dong: category column. Favourites store |

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


## Quality Gate Outputs (cc-01)
- `npm run typecheck`: exit 0.
- `npm test`: 8 files, 61 tests passed (`lib/__tests__/onboarding.test.ts`: 12 tests, written first from the coach rules in SPEC.md).
- `npm run build`: compiled, TypeScript finished. `/signup`, `/signin`, `/signin/check-email`, `/signin/expired`, `/setup/profile`, `/setup/goal` are all static.
- `BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`, since Homebrew python3 has no Playwright): all checks pass, 0 hydration errors. cc-01 pairs compared: `/setup/goal` @ 390 [daily-targets, left/right] 3 pairs; `/setup/goal` @ 1440 [daily-targets, left/right] 3 pairs; `/setup/profile` @ 1440 [setup-row, top/bottom] 2 pairs.
- `setup-row` top and bottom at 1440: all three rows at y 211.5–285.5. Sex chip height 52 px, same as the inputs.
- Screenshots: `apps/web/.screenshots/cc01-fix2-setup-goal-390.png`, `cc01-fix2-setup-profile-1440.png`. Chip comparison: `cc01-fix2-{base,border,md}-{add,food}-{390,1440}.png` (base = feat/ui chip, border = committed border fix, md = final).
- `size="md"` ChipGroup is byte-identical to the feat/ui (ui-05-fix) render of `/add?meal=snack` and `/foods/food-cha-la` at 390 and 1440. The `size="lg"` chips do not affect those screens.
- Playwright (port 3101), 390×844 and 1440×900: `/signup` copy has no "26 chất"; "Mở ứng dụng Mail" goes to `mailto:`; dev link goes to `/setup/profile`; profile back goes to `/signin/check-email`; a weight error clears on the next valid edit; the iron note shows only for Nữ; on 1440, Enter in the weight field lands on `/today`. No console errors.
- Full flow passed earlier: signup → check-email → profile → goal → /today.
- Screenshots: `apps/web/.screenshots/cc01-gate-{signup,setup-profile}-{390,1440}.png`
- Edges: daily-targets (setup-goal at 390 and 1440) pass, left/right, 3 pairs each. setup-row (setup-profile at 1440) passes, top/bottom, 2 pairs.
- Edges: signup, signin, check-email, expired have no data-align-group rows (n/a).
- Cleanup: "Mở ứng dụng Mail" is phone only (`lg:hidden`, checked at 390 visible and 1440 hidden). `size="lg"` inactive chip has a 2 px grabber border (52 px, `#D5D8DF`). `size="md"` re-checked byte-identical to feat/ui for /add and /foods/food-cha-la at 390 and 1440.

## Quality Gate Outputs (cc-02)
- `npm run typecheck`: exit 0.
- `npm test`: 10 files, 80 tests passed. 19 are new: `lib/__tests__/food-categories.test.ts` (11) and `lib/__tests__/recent-foods.test.ts` (8), written first.
- `npm run build`: compiled, TypeScript finished.
- `BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`): add-list pairs compared, left edges aligned: `/add?meal=snack` @ 390, 3 pairs; @ 1440, 3 pairs. 0 hydration errors.
- Playwright at 390 and 1440: scrolled grouped list, the stuck header is opaque and on top of the rows. Rau củ shows 3 foods. Chuoi with Trái cây shows Chuối, with the category in its meta line. Tapping the recent "Yến mạch 60 g" sets 60 g in the portion panel, and the search box stays empty. Empty category + query shows "Bỏ lọc", which returns to Tất cả. No console errors.
- `size="md"` ChipGroup is not changed on this branch.
- Screenshots: `apps/web/.screenshots/cc02-add-{all,category,search}-{390,1440}.png`.

## Quality Gate Outputs (cc-02 fix)
- Rebased onto `feat/ui` 39322e7 (ui-05-fix-2). Conflicts: PROGRESS (kept every row and block), add page (cc-02 re-applied on Antigravity's PortionPanel structure), chip-group (inline grid kept, size prop added), alignment.py (Antigravity's version kept, onboarding and add-list checks re-added), recents hydration test (moved to `h1t_recent_foods_v2`).
- `npm run typecheck`: exit 0. `npm run test`: 90 passed.
- `npm run build`: compiled. Ran against the production build too, but Playwright's `networkidle` timed out on `next start` in this sandbox, so `test:align` and the probe ran on the dev server at 3101.
- `ALIGN_BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`): all pass, 0 hydration errors. Pairs: daily-targets 390 3, daily-targets 1440 3, setup-row 1440 2 (top/bottom), add-list 390 3, add-list 1440 3.
- `npm run probe -- tests/probes/cc02-final.py`: no problems. One × in the search box at 390 and 1440, native clear hidden. /add opens with no panel at 390 and the empty state at 1440. Chà là 30 g shows 0,3 mg and Vitamin B6 at 1440. All 10 filter chips inside the viewport at 1440, Yêu thích hidden. Recent Yến mạch 60 g opens the panel at 60 g at both widths, search box stays empty. Left fade appears only after scrolling at 390. Today kcal has no decimals. Onboarding flow reaches /today.
- Screenshots: `apps/web/.screenshots/cc02-final-add-open-390.png`, `cc02-final-add-chala-1440.png`, `cc02-final-today-390.png`.
- Not re-checked on this branch: the `size="md"` ChipGroup byte-identity. The class string is the same as before, but the add page has changed, so there is no clean baseline.

## Quality Gate Outputs (cc-02 final)
- Rebased onto `feat/ui` 42ac9d6 (ui-05-fix-4). Conflicts: OPEN_QUESTIONS and PROGRESS (kept both sides), add page (cc-02 re-applied on the `useMealSlot` / `overrideSlot` version), nutrients.ts and its test (Antigravity's taken, B6 change dropped), diary-store (Antigravity's composite logic kept, unit strings switched to formatAmount), alignment.py (Antigravity's taken, onboarding checks re-added).
- `tests/probes/hydration.py`: seeds `h1t_recent_foods_v2` with `{ foodId: 'food-hat-dieu', servingLabel: '30 g' }` and checks the chip "Hạt điều rang".
- `vitamin folate`: label changed from "Folate (B9)" to "Vitamin B9", so no English B-vitamin name shows on Micros. The probe checks this.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Typecheck exit 0. Tests 92 passed (11 files). Build compiled. `test:align` pairs: daily-targets 390 3, daily-targets 1440 3, setup-row 1440 2 (top/bottom), add-list 390 3, add-list 1440 3. `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc02-final.py`: no problems (see the list in the cc-02 gate block above).
- Ran against the dev server on 3101, which was running while `npm run check` built. Next 16 writes dev and build output to separate folders.
- Screenshots: `apps/web/.screenshots/cc02-final-add-open-390.png`, `cc02-final-add-chala-1440.png`, `cc02-final-today-390.png`.
