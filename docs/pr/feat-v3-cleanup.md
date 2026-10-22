# fix/v3-cleanup: the follow-up to the V3 redesign (#45)

Front end only (apps/web). Nothing in apps/api, migrations or deploy is touched. Four commits, one per item, each with `npm run gate:fast` green.

**Base:** `feat/v3-redesign` (the head of #45). #45 is not merged yet and main has none of the V3 code, so this branch is stacked on it and the PR targets `feat/v3-redesign`. When #45 merges, retarget the PR to `main` (the four commits apply on top of it as they are).

## 1. One Close per sheet (e5f2104)
Every V3 sheet with a title already has the 44 px Close at the leading edge of its header. Six sheets also had a footer "Đóng" (the review counted five; the meal menu had the same duplicate and goes with them):

| Sheet | File |
|---|---|
| Chọn ngày (calendar) | components/calendar-sheet.tsx |
| Nguồn của vi chất (nutrient sources) | components/home/nutrient-sources-sheet.tsx |
| Tùy chọn ngày (day menu) | components/home/select-mode.tsx |
| Menu bữa ăn (meal menu) | components/diary/meal-menu-sheet.tsx |
| Chưa lưu (sync list) | components/sync/sync-list.tsx |
| Level là gì? (Level explainer) | components/coaching/level-explainer-sheet.tsx |

Probes: `cc_28c.py` clicked the Level explainer's footer with `.last`; it now clicks the one Close. `v3_cleanup_shots.py` (new) opens the nutrient sources, the calendar and the day menu at 390 and asserts exactly one control named Đóng and that it closes the sheet.

## 2. Unused code (d1c798f)
Removed, and shown unreferenced with `grep -rnE "ink-pill|inkPill|shareKey|ShareFoodRow" app components lib tests` (only `lib/share-card.ts`'s own `shareKey()` and `ShareKeyItem`, which the share image still uses, remain):
- `components/home/ink-pill.ts` (the V3 meal and group headers are plain rows; the pill was only drawn by the share branches).
- `FoodList`'s `share` prop, its `ShareFoodRow` and the `!share` pull-to-refresh guard. Nothing passes `share`; the share image draws its own meals (`share-day.tsx`).
- `NutrientColumn`'s `shareKey` prop and every `share ?` branch (fixed rows, the in-column summary and colour key, the `Scroll` helper). The share image draws its own vi chất card.
- Probe guards for `[data-ink-pill]` in `cc2_unify.py` and `cc_41_shots.py`. `cc_27f.py` still asserts there is no ink band, which stays true.

**Not removed:** `components/copy-yesterday-sheet.tsx`. #47 (Ngày ăn mẫu) is not in this branch and Hôm nay still opens the sheet from the empty-day line and the meal menu (`home-screen.tsx`, `loadCopyYesterday`). Deleting it here would break "Chép hôm qua". Delete it in #47 (or after it merges), where the "Hôm qua" card replaces it. `HomeHero`'s `share` prop is also kept: `ShareDay` still uses it.

## 3. The share image's colour key at 150 % text (df158c5)
The key was a 2-column grid of `whitespace-nowrap` items in a 180 px card. At 150 % text the labels are wider than their column and ran into each other ("Thiếu <50%" over "Trung bình"). The columns are now `repeat(2, minmax(min-content, max-content))` and the labels may wrap:
- at 100 % text each column is as wide as its longest label, so every label stays on one line as in V3ShareB (`cc_26.py` still checks one line, two columns, gaps 4 / 8 / 4);
- at 150 % a column never gets narrower than its longest word, so "Thiếu <50%", "Trung bình", "Gần đủ" and "Đạt ≥100%" wrap to two lines each, the swatch stays on the first line, nothing overlaps.

`share_micros.py` gets a pass that draws the image at 150 % root text (short and mixed days, Level 0 and 5) and asserts no key item overflows its box or overlaps another. Run on the commit before the fix it failed (`Thiếu <50% × Trung bình`, all four items overflowing); on the fix it passes. The picture is `.screenshots/v3-cleanup/share-key-text150-before.png` / `-after.png`.

## 4. Hit areas at 200 % text, design-floor out of quarantine (e26c5f5)
design-floor D-CTL-01 failed at 200 % text on three controls whose box shrinks with the screen width: the meal header button on /app, the minute chips on /settings/profile, the day bars on /trends, /trends/energy and /trends/body. Fixed with hit areas, not a bigger look: a new `hit-44` utility (`app/globals.css`) puts an invisible `::before` on the target that grows it sideways up to 44 px when it is narrower (`calc(max(0px, (44px - 100%) / 2) * -1)` on left and right), and does nothing when the target is already wide enough. Measured (`v3_cleanup_shots.py`):

| Control | Box at 200 % | Hit area at 200 % | At 390 and 1440 |
|---|---|---|---|
| /app meal header ("Xem riêng …") | 34 wide | 44 | unchanged (122 / 742) |
| /settings/profile minute chip | 39 wide | 44 | unchanged (58 / 99) |
| /trends day bar | 37 wide | 44 | unchanged (46 / 89) |
| /trends/body day bar | 38 wide | 44 | unchanged (48 / 91) |

Touching neighbours (day bars) share the overlap, the later one takes it; the + link next to the meal header is `relative` so it paints above the header's hit area.

Quarantine: with that, `design-floor.py` is green on all 54 routes at 390, 1280 and 390@200 %, so it is off `QUARANTINE`. What still fails is `/landing` (D-COL-01 cobalt on ink 3,0–3,3:1, D-TYPE-01 11–13 px text at 200 %, D-CTL-01 nav links 20 px tall at 1280, D-LAY-04 at 200 %), all there before V3. `design-floor.py` now leaves `/landing` out (`OWN_PROBE_ROUTES`) and a new `design-floor-landing.py` runs the same probe on `/landing` alone, with its own `QUARANTINE` entry (reason and 2026-10-29 expiry). A regression on an app screen turns `design-floor.py` red again; the landing page stays measured.

## Screenshots (apps/web/.screenshots/v3-cleanup/, gitignored)
- `<screen>-<390|1440|text200>-<before|after>.png` for app, profile, trends and trends-body, centred on the control that changed. The look is the same before and after by design; the table above has the numbers.
- `share-key-text150-<before|after>.png`: the colour key at 150 % text.
- `sheet-<nutrient-sources|calendar|day-menu>-390-after.png`: the sheets with only the leading Close.

## Gates
gate:fast after each commit: green (typecheck, lint:design, vitest related, build:demo, 12 probes). gate:full: see the end of this file.

Notes
- `gate:fast` compares against origin/main, so on this stacked branch it picks the same 12 probes every time. The probes that cover each change were run on their own: `share_micros.py`, `cc_26.py`, `design-floor.py` (and `design-floor-landing.py`), `v3_cleanup_shots.py`.
- The probes ran on port 3141 because another process held 3101.
- Not done: deleting `copy-yesterday-sheet.tsx` (see item 2) and the cramped dish name on Hôm nay at 360 px and 150 % (still in OPEN_QUESTIONS).
