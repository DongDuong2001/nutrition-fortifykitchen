# feat/v3-cleanup: the V3 follow-up (review-0630 and Hao's testing of 22/10)

Front end only (apps/web). Nothing in apps/api, migrations or deploy is touched, and there is no change to logic, data or sync. No new release id: these are fixes to #45's open release.

**Stacks on `feat/ngay-mau`** (#44 → #45 → #46 → #47 → this). Retarget the PR as the stack merges; the commits apply on top of each step as they are. Commits are by Vu Thien Minh Hao, one per item, `npm run gate:fast` green after each and pushed after each.

Probes ran on port 3141 because another process held 3101.

## Items

| # | Item | Commit |
|---|---|---|
| 2 | One Close per sheet | `bdd9b2a` |
| 3 | Unused code and the copy-yesterday sheet | `c2daafb`, `6f2e99e` |
| 4 | Share image colour key at 150 % | `d8dd32d` |
| 1 | Quarantine and the 200 % hit areas | `a8fe63a` |
| 5 | Saira titles keep their marks | `c9985e8` |
| 6 | "Năng lượng" no longer wraps | `2fc2b61` |
| 7 | Tab bar fill and shadow | `ddb74aa` |
| 8 | One share icon | `8bd41db` |
| 9 | Tab wash, tab colours, teal sub-tab | `dd67387`, `709a5e1` (colours #007F96 and #C45200, cc2_unify) |
| 4 | Share key wraps only at large text | `fa67b52` |

(The numbers are the brief's; the commits went in an order that kept each gate small.)

### 2. One Close per sheet
Every V3 sheet with a title has the 44 px Close at the leading edge of its header. Six sheets also had a footer "Đóng" (the brief counted five; the meal menu had the same duplicate): the calendar, the nutrient sources, the day menu (the "Lưu ngày này thành mẫu" button from #47 stays), the meal menu, the sync list and the Level explainer. The footer buttons are gone. `cc_28c.py` clicked the explainer's footer with `.last`; it now clicks the one Close. `v3_cleanup_shots.py` opens the nutrient sources, the calendar and the day menu at 390 and asserts exactly one control named Đóng that closes the sheet.

### 3. Unused code
Removed, with nothing left importing them (`grep -rnE "ink-pill|inkPill|shareKey|ShareFoodRow|copy-yesterday-sheet|CopyYesterdaySheet" app components lib tests` finds only `lib/share-card.ts`'s own `shareKey()`, which the share image still uses):
- `components/home/ink-pill.ts`; `FoodList`'s `share` prop and `ShareFoodRow`; `NutrientColumn`'s `shareKey` prop and every `share` branch. The share image draws its own meals and vi chất card (`share-day.tsx`); `HomeHero`'s `share` prop stays because `ShareDay` uses it.
- `components/copy-yesterday-sheet.tsx`: this branch stacks on #47, whose "Hôm qua" card in the Chép ngày mẫu picker replaced it.
- Probe guards for `[data-ink-pill]` in `cc2_unify.py` and `cc_41_shots.py`.

### 4. Share image at 150 % text
The colour key was a 2-column grid of `nowrap` items in a 180 px card; at 150 % the labels ran into each other ("Thiếu <50%" over "Trung bình"). `ShareDay` now takes `largeText` (the root font is over 16,5 px when `share-sheet.tsx` draws the image). At 100 % text nothing changes: equal columns, every label `nowrap` on one line as in V3ShareB (so a rasteriser a hair wider cannot wrap it). With large text the columns are `repeat(2, minmax(min-content, max-content))` and the labels may wrap: a column never gets narrower than its longest word, so each label is at most two lines, the swatch stays on the first line, nothing overlaps. `share_micros.py` gets a pass that draws the image at 150 % root text (short and mixed days, Level 0 and 5) and asserts no key item overflows or overlaps another; before the fix it failed (`Thiếu <50% × Trung bình`), after it passes. `share-key-text150-before.png` / `-after.png`, `share-text150-vs-canvas.png`. (A first version wrapped at 100 % too and was caught by cc_44, hence `largeText`.)

### 1. Quarantine and 200 % hit areas
design-floor D-CTL-01 failed at 200 % text on the meal header button on /app, the minute chips on /settings/profile and the day bars on /trends, /trends/energy and /trends/body (boxes 34–39 px wide). A `hit-44` utility (`app/globals.css`) puts an invisible `::before` on a target that grows it sideways up to 44 px when it is narrower, and does nothing when it is wide enough. Measured: 34 → 44, 39 → 44, 37 → 44, 38 → 44; at 390 and 1440 the hit areas equal the boxes. `design-floor.py` is green on all 54 routes at 390, 1280 and 390@200 % and leaves the quarantine. `/landing` (cobalt on ink 3,0–3,3:1, 11–13 px text at 200 %, nav links 20 px tall at 1280, a horizontal scroll at 200 %, all there before V3) moved to its own probe, `design-floor-landing.py`, quarantined to 2026-10-29 with that reason; `design-floor.py` skips `/landing`.

### 5. Saira titles keep their marks
`app-header.tsx`: the clamped title (`line-clamp-2`, `leading-tight`) cut the tops of Ụ/Ề, the dấu nặng and the italic's right edge. It now has `py-[0.2em] pr-[0.15em]` with `-my-[0.2em] -mr-[0.15em]`, so the layout does not move. It was the only Saira title with a clamp or `overflow-hidden`. New probe `title_clip.py`: for every h1–h3 in Saira on all 57 smoke routes, at 390 and at 200 % text, each text line (Range.getClientRects, plus the italic's overhang) must sit inside the nearest clipping ancestor within 1 px. Before: 78 cut titles; after: 0 on both passes. Checked on /trends, /settings, /explore and /settings/targets.
Caveats (both in OPEN_QUESTIONS): a title of three lines shows a few pixels of the third line's marks under the ellipsis, because the padding sits inside the clip; and /settings/targets/macros at 200 % leaves the title 29 px between Huỷ and Lưu, so it is cut whatever the padding (the probe skips a line wider than its clip for that reason).

### 6. "Năng lượng" on one line
`Segmented` gets `nowrap` (used by the four Tổng quan tabs): `whitespace-nowrap`, 4 px side padding in the pill, columns `minmax(max-content, 1fr)`, and a track too narrow for its longest label scrolls sideways. Text stays 13 px. `overview_tabs.py`: one line each at 390, 360, 320 and at 390 with 150 % text, 13 px, no page scroll; four equal columns with no scroll at 390 and 360.

### 7. Tab bar
New `glass-tab` utility and tokens: `--color-glass-tab` 0.86 white, `--color-glass-tab-dark` 0.82 of rgb(28 28 30), `--shadow-glass-tab` (0 10px 28px at 0.16, with the same highlight and hairline as the other glass) and `-dark` (0.5). The 24 px blur is kept; reduced transparency and increased contrast still give the solid card. The dark values are tokens only: the app has no dark column yet (V3-SPEC's dark map is one `:root` block later). `tab_bar.py` checks the computed fill, blur and shadow on the four tabs.

### 8. One share icon
`IconShare` is now V3's iOS glyph (`M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7`, 24 box, stroke 1.8, round caps and joins) in the same `createH1TIcon` wrapper. It is the only share icon in the app: Hôm nay's "Chia sẻ ngày này" and the Có gì mới entry use it (the Safari share glyph in the install steps is a picture of Safari's button and stays). No change to logic or `data-tour`. `components/ui/__tests__/icons.test.tsx`.

### 9. Tab wash, tab colours, teal sub-tab
- **TabWash** (`components/ui/tab-wash.tsx`, `.tab-wash` in `globals.css`): aria-hidden, `pointer-events-none`, absolute at the top of the page, 240 px, hidden from lg; top to bottom the colour at A, 0.4 A at 55 %, none at 100 %. Hôm nay cobalt 0.16, Tổng quan teal rgb(0,195,208) 0.18, Khám phá orange rgb(255,141,40) 0.28 (dark: 0.30, rgb(0,210,224) 0.24, rgb(255,146,48) 0.22, as tokens). The tab headers are transparent on a phone and the header and `main` are positioned so they paint over it; Hôm nay keeps its wordmark and header. Cài đặt and pushed screens have no wash. There is no accent bar before any title.
- **Bottom nav:** the active icon and label take the tab's colour: Hôm nay and Cài đặt cobalt, Tổng quan `--color-tab-teal` #007F96, Khám phá `--color-tab-orange` #C45200 (dark #00D2E0 and #FF9230 as tokens); the brief's #008198 and #C55300 were nudged to reach 4,5:1, see below.
- **Tổng quan sub-tabs:** the active chip is filled `--color-tab-teal` with white text (dark: #00D2E0 with ink); inactive chips are unchanged.
- `tab_wash.py` checks the wash (gradient stops, size, position, hidden at 1440, absent on Cài đặt and pushed screens, header over it) and the teal chip; `tab_bar.py` the active colours; `lib/__tests__/tab-colors.test.ts` the contrast.

**Contrast of the 11 px label on the tab bar** (the bar is 0.86 white glass; the ratio is against the fill over what is behind, the blur not modelled). The brief's #008198 and #C55300 came out at 4,497 and 4,480 on the grey page, so Hao chose **#007F96 (teal) and #C45200 (orange)**; both now reach 4,5:1 on the page and on a white card (`lib/__tests__/tab-colors.test.ts` asserts it):

| Label colour | over a white card | over the grey page | over the ink hero card | over black |
|---|---|---|---|---|
| cobalt #2457F5 (as before) | 5,59 | 5,50 | 4,16 | 4,04 |
| teal #007F96 | 4,69 | 4,615 | 3,49 | 3,39 |
| orange #C45200 | 4,61 | 4,536 | 3,43 | 3,33 |

White text on the teal chip: 4,69. Ink on the dark teal #00D2E0 and the dark tab colours on rgb(28 28 30) are tested at 4,5 and pass. Where the ink hero card scrolls under the bar every label colour, cobalt included, falls under 4,5 (3,4 to 4,2): the fill is 0.86 white there too, and that is the price of the see-through bar.

## Not done
- **Dark column.** The app is light only (no dark column; AGENTS and the overnight note), so there are no dark screenshots; the dark values are tokens (`-dark`), ready for it. Dark mode is its own task, later (Hao).
- **The canvas pages "Tab headers · colour wash" and "Tab colour · accent"** are not in `design/v3/renders` (only the older boards are); the wash, colours and alphas follow the numbers in the brief. Accepted by Hao. The shots sit next to the nearest renders (V3HomNayB, V3TongQuan, V3KhamPhaB, V3TrendsEnergy, V3Targets, V3ShareB).
- The cramped dish name on Hôm nay at 360 px and 150 % text (OPEN_QUESTIONS), and the two caveats under item 5.

## Probes changed by this PR
- `cc2_unify.py`: the tab headers are transparent on a phone now. The check passes when the header's fill is the page, or when it is transparent and the colour **painted** there (a 1×1 screenshot inside the header's top padding, `_header_paint.py`) is the page, or the page under the route's wash at that height, within 3. A header that went transparent by mistake over anything else fails.
- `cc_26.py` / `cc_44.py` (share image): the colour key labels never wrap at 100 % text (`nowrap`, as before; cc_44 also checks it with the fonts missing). The key wraps only when the root text is larger than 16,5 px (`ShareDay largeText`, read in `share-sheet.tsx` when the image is drawn); `share_micros.py` checks that at 150 %.

## Screenshots (`apps/web/.screenshots/v3-cleanup/`, gitignored)
- `home|overview|explore|energy|targets-390-light-vs-canvas.png`: the app on the left, the canvas render on the right.
- `share-text150-vs-canvas.png`, `share-key-text150-before|after.png`.
- `sheet-calendar|day-menu|nutrient-sources-390-after.png` (one Close each).
- `<screen>-<390|1440|text200>-<before|after>.png` for the 200 % hit areas; `overview-tabs-<320|360|390>.png`.

## Frames: is the glass slower than main?
`tests/probes/_glass_frames.py` (a helper, not part of probe:all): production demo builds of `origin/main` (6796b35) and of this branch, headless Chrome with the CPU throttled 4× (CDP `Emulation.setCPUThrottlingRate`), 390×844 phone, one at a time on an otherwise idle Mac. Five runs per case, mean of the runs. Dropped = 16,7 ms slots a frame was late by; long frame = requestAnimationFrame gap over 50 ms; long tasks (>50 ms, PerformanceObserver) were 0 in every case.

| Case | Build | Avg FPS | Dropped frames | Long frames (>50 ms) | Worst frame |
|---|---|---|---|---|---|
| Hôm nay scrolled by a script, 20 foods logged (≥ 3 s) | main | 62,6 | 0 | 0 | 20 ms |
| | feat/v3-cleanup | 62,6 | 0 | 0 | 20 ms |
| + sheet opened and closed ×5 (6,8 s) | main | 61,6 | 14,4 | 0 | 41 ms |
| | feat/v3-cleanup | 61,6 | 14,8 | 0,4 | 51 ms |
| Add toast sliding in, 1,5 s after the tap on Thêm | main | 61,6 | 3,2 | 0,6 | 54 ms |
| | feat/v3-cleanup | 61,1 | 3,4 | 0,8 | 56 ms |

V3 is not clearly worse: every row is within the run-to-run spread (a first pass with three runs said the same), so the blur-12–16-px-without-saturate variant was not tried. Caveats: this is headless Chrome on a Mac, so the compositor is not a phone GPU; the old Hôm nay is a one-screen page whose two lists scroll inside (a 58 px scroller) while V3's page scrolls as a whole (374 px), so "top to bottom" compares what a person can scroll, not the same distance; the numbers are `.screenshots/v3-cleanup/frames-*.json` (gitignored).

## Gates
- gate:fast after each commit: green.
- **gate:full (709a5e1): all green, 749 s.** typecheck, lint:design, vitest, build:demo, test:align (74 s), test:hydration (107 s), probe:all (719 s: 134 PASS, 4 REPORT, 1 QUAR = design-floor-landing.py, 0 FAIL, 1 SKIP), check:live-bundle. The first gate:full on this branch was red (cc2_unify.py: the headers are transparent; cc_44.py: the share key wrapped at 100 %); both fixes are in the last two commits.
