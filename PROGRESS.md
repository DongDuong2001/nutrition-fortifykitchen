# Progress

## Now working
| Task | Owner | Files / routes |
|---|---|---|
| ag-07 (a11y audit completion) | Antigravity | apps/web/app/foods/[id]/page.tsx, apps/web/app/foods/new/page.tsx, apps/web/components/ui/form-row.tsx, apps/web/components/onboarding/magic-link-form.tsx, apps/web/lib/training.ts, apps/web/app/globals.css, apps/web/tests/probes/ag07.py, docs/audit-ag04.md |


| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 12/10/2026 | cc-14 | Whole-app smoke probe tests/probes/smoke.py: 27 page.tsx routes plus the 404 URL, at 390×844 and 1280×800 (56 runs). Checks console and hydration errors, horizontal scroll, a visible header, and text overflow (scroll containers and sr-only skipped). /foods is asserted to redirect to /add. Screenshots in apps/web/tests/probes/out/. tests/probes/run_all.py and npm run probe:all run every probe in one table: cc02-final only with PROBE_DEV=1; ag04_audit and screenshots are REPORT (no exit gate). No app code changed. | Found (cc-14) below: 2 real bugs (/foods, /login); 17 header-rule FAILs need a decision (OPEN_QUESTIONS cc-14) |
| 12/10/2026 | cc-12b | Trends: a day above the max counts as on target (countDaysOnTarget is min-only; max kept for display), tests first (calcium 1.600, magnesium 800 and potassium 7.000 count as đạt). Kcal legend has three items again: Trong mục tiêu, Thiếu, striped Hôm nay (đang ghi), tokens only. Nutrient rows show "Mục tiêu: 1.200–1.500 mg" through targetRangeText (same formatter as /micros), min only when there is no max. The list header reads "Mục tiêu / ngày". Mock: the third day of the 7-day series (2.380 kcal) is above the 2.275 kcal max; the 30-day window reuses those seven days, so it has one over-range day too. cc12a's calcium assertion updated to the range. | Over-range bar in the desktop chart not separately checked; cc-13 audit findings |
| 11/10/2026 | cc-12a | Merged feat/ui-ag-03 (Trends) and feat/ui-ag-04 (docs/audit-ag04.md, tests/probes/ag04_audit.py) with no conflicts. Trends: the 7- and 30-day windows end today (anchorTrendDays, set after mount); targets come from the profile (trendTargetsFrom(calculateTargets)), so calcium 1.200–1.500, magnesium 600–750, potassium from weight, iron 8/18/28; a kcal day above the range is on target, not red (kcalOnTarget); legend Trong mục tiêu / Thiếu; Saira Condensed for the title and the protein number. /micros links to /trends (phone footer row under the summary, desktop link in the stat row). Units added to the Trends rows (TB and Mục tiêu). | Audit findings (cc-13); Trends has no over-range sample day in the mock, so the over case is covered by unit test only |
| 11/10/2026 | cc-12 | Design parity sweep of the 25 screens (docs/parity-cc12.md, probe cc12.py: copy diff + screenshots + calendar check). Fixed 10: Micros footnote and "đã đạt mục tiêu"; FoodDetail "Khẩu phần" label; CreateFood micro example list; calendar is a centred dialog at ≥1024 px (Esc closes, focus returns to the date; components/ui/sheet.tsx `desktopDialog`); TodayStates offline heading; Profile "Nhắc nhở" shows "Đã bật"; setup desktop "Bước 1/2 · Về bạn" and "Mục tiêu mỗi ngày"; SignUp desktop "TẠO TÀI KHOẢN". 15 left as decided and 12 questions (OPEN_QUESTIONS cc-12). Design files need support.js (not in the repo), so layout was checked from source, not rendered. | NutrientDetail is a placeholder (OPEN_QUESTIONS cc-12); vi chất count 21 vs 22 |
| 11/10/2026 | cc-11 | Past days are read-only: rows are not links, no + Thêm and no Chép hôm qua; /entry/… and /add with a past ?date= go back to that day's Today (usePastDayRedirect). Desktop: the date in the header subtitle opens the same calendar (no future days). "Thiếu nhiều nhất" and the x/22 count come from the day's own nutrients vs targets (lib/lacking.ts, lowest % first, tests first), so logging a calcium-rich food changes the list. BACKLOG line removed. Copy sheet subtitle "Thứ Bảy, 10/10". docs/03-srs.md iron men 8 mg. Past-day views added to tests/alignment.py. cc11.py. | Past-day Vi chất detail (none, by design); desktop calendar is the phone bottom sheet (no centred dialog yet) |
| 11/10/2026 | cc-10 | Copy yesterday: "Chép hôm qua" sheet (four meals, snack unticked, Chép N bữa) copies the mock yesterday entries into today with one 5 s undo toast (lib/day-history.ts with tests first). Past days: ?date= on /today, AppHeader ‹ › work, › off on today, past days show their own data (yesterday mock; other days empty), formatDayLabel labels. Calendar picker (Sheet, month grid, no future days) opens from the phone date label. Hồ sơ: Năm sinh is a row that opens the FormRow (same validation, saves on blur or Enter). Iron men 8 mg (lib/targets.ts, tests updated; SRS conflict in OPEN_QUESTIONS). cc10.py and cc09 birth-year steps updated. CLAUDE.md: switch back to feat/ui-cc-* after merge. | Past-day add and edit (date-aware /add), desktop day picker, Vi chất detail on past days (see OPEN_QUESTIONS cc-10) |
| 11/10/2026 | cc-09 | Merged ag-02 (8 commits cherry-picked onto feat/ui; PROGRESS and OPEN_QUESTIONS conflicts resolved, app code identical to 013b268). Hồ sơ menu: Ứng dụng card (Ngôn ngữ shows the saved language → /settings/language, Nhắc nhở → /settings/notifications, Cài như ứng dụng → /install), Pro banner Xem gói → /paywall, Đăng xuất → /signin (link only), Vùng nguy hiểm card with Xoá tài khoản → /settings/delete-account. Birth year FormRow with setup validation (saves on blur or Enter). Default training time ChipGroup lg (Nghỉ, 45, 60, 90, 120); /training follows it until the URL names a duration. Goal chips 2×2 at 1440. hydration.py adds the 5 new routes and a 404 URL (its console 404 is exempt there only). cc09.py. Gates: tsc ok, vitest 195 pass, build ok, test:align pass (prod :3101), test:hydration pass (prod), cc03–cc09 pass (prod), cc02-final pass (dev only: its sign-in link is hidden in production). Edges: /profile 390 profile-header, profile-row (9 pairs) pass; /profile 1440 profile-row (9 pairs) pass | Đăng xuất clears nothing (OPEN_QUESTIONS, Dong); Tải CSV not built; install row name to confirm (OPEN_QUESTIONS); training chips tight at 390 |
| 11/10/2026 | cc-08 | Profile store (lib/profile.ts, localStorage h1t_profile_v1, seeded from the setup draft or the sample user) drives the targets: diary store applies calculateTargets after mount, so Today, Micros, food detail and PortionPanel follow it. /profile (phone + desktop, ChipGroup lg sex and goal, period switch for Nữ with 18→28 mg note, daily targets) and /profile/weight (FormRow, setup validation, live target preview). Onboarding finish saves to the profile. DesktopSidebar replaces the inline copies on Today and Micros. Weight shows 65 kg / 70,5 kg. Gates: tsc ok, vitest 189 pass, build ok, test:align pass (incl. profile-header/row, weight-header/row at 390 and 1440), test:hydration pass (/profile, /profile/weight added), cc06 pass, cc07 pass, cc08 pass (prod :3101). Edges: /profile 390 profile-header, profile-row pass; /profile 1440 profile-row pass; /profile/weight 390 weight-header, weight-row pass; /profile/weight 1440 weight-row pass | Ngày tập default and birth year editing; Ứng dụng/Pro/logout rows; Thiếu nhiều nhất from real data (BACKLOG); goal chips wrap on desktop at 1440 (2 lines for Giảm mỡ nhanh) |
| 11/10/2026 | ag-02 | Batch of 6 items on feat/ui-ag-02: ag-02.1 training polish (persisted checks, ChipGroup durations, exact copy), ag-02.2 404 & 500 error pages, ag-02.3 language settings, ag-02.4 notification settings, ag-02.5 delete account confirmation flow with toast, ag-02.6 static /install and /paywall pages. All 5 gates passed on branch tip. | Ready for Claude Code merge |
| 11/10/2026 | cc-07 | Micros phone: group chips scroll only the list (offset from scrollRef, reduced-motion aware); wrapper overflow-clip + list overscroll-contain, so the header and chip bar stay put. Probe cc07 (390/1440) and a tap-chip step in hydration; verified the step fails on the old code. Edges: micros-header, micros-card pass | Micros phone header collapse (BACKLOG); scroll-spy lock timing mid-scroll (not yet tested) |
| 11/10/2026 | ag-01 | Training screen (Antigravity, rebased onto feat/ui and merged by Claude Code): training page, phase checklist, duration selector, rest-day card, salt and sodium cards, tip banner, lib/training.ts with unit tests; /training added to hydration.py | Training backlog (BACKLOG) |
| 11/10/2026 | cc-04 | AppHeader sub on food detail, new food, entry and setup (phone) screens; setup step bars via AppHeader `progress` (StepBars moved to components/ui); food favourite heart in the header actions; onboarding-header removed; /add sticky group headers cover the 12 px side bleed; entry meal chips as ChipGroup (3 cols phone, 5 desktop); tests cc04 + header alignment pairs | Micros phone header collapse (BACKLOG); sticky-header crop decision (OPEN_QUESTIONS) |
| 11/10/2026 | ui-04b-fix-1 | Client runtime mock day in Asia/Ho_Chi_Minh; full Vietnamese weekday names ("Thứ Hai"…"Thứ Bảy", "Chủ nhật"); desktop subtitle formatter; Option B summary inset panel (surface-dark, 16px radius, no raw hex); formatAmount mg 1 decimal under 100; disabled date nav handlers when missing; desktop header alignment pairs for /today and /micros; opaque sticky chip bar on /micros | Ready for review |
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

## Found (cc-14)
Smoke on prod :3101 (`npm run probe:all`): 35 PASS, 21 FAIL of 56 route × width runs. Screenshots: `apps/web/tests/probes/out/smoke-<route>-<width>.png`.
- **/foods, 390 and 1280:** no redirect to /add, though the brief expects one. The page is the old catalog scaffold (0f734dd) with no header. Screenshots smoke-foods-390.png, smoke-foods-1280.png. Real bug: OPEN_QUESTIONS cc-14.
- **/login, 390 and 1280:** never reaches networkidle within 30 s. A fetch to `/diary?_rsc=…` stays pending. /diary is not a route (curl returns 404 in 9 ms) and no source file links to it. The source of the fetch is not found. Reproduced in two runs. Screenshots smoke-login-390.png, smoke-login-1280.png. Real bug: OPEN_QUESTIONS cc-14.
- **Header rule, 17 FAILs (not bugs by design):** /signin, /signin/check-email, /signin/expired, /signup and the 404 URL at both widths (no `<header>` in those design files); /add at 390 (sheet, no `<header>` in its design); /admin/review at both widths (no design file); /profile and /profile/weight at 1280 (AppHeader is `lg:hidden`, the sidebar is the desktop chrome); /setup/goal and /setup/profile at 1280 (desktop setup design has no `<header>`). Decision needed: OPEN_QUESTIONS cc-14.
- No console, hydration, horizontal-scroll or text-overflow failures on any route.

## Gate summary (cc-14)
- `npm run typecheck` ok. `npm run test`: 20 files, 248 pass. `npm run build` ok, 26 routes.
- Prod server on :3101 (`npm run build`, `npm run start -- -p 3101`). Gates run as separate commands in `npm run check` order: check's build step rewrites `.next` under a running server, so the build ran first and the rest ran after it.
- `npm run test:align` (ALIGN_BASE_URL=http://localhost:3101): all pairs pass.
- `npm run test:hydration`: 0 hydration errors on all routes.
- `npm run probe:all` (ALIGN_BASE_URL=http://localhost:3101): 13 PASS, 2 REPORT (ag04_audit, screenshots), 1 FAIL (smoke: 35 PASS / 21 FAIL of 56), 1 SKIP (cc02-final, dev only).
- Edges: no UI change, so no new edge groups.

## Quality Gate Summary (ag-01)
- `ALIGN_BASE_URL=http://localhost:3101 npm run check` on feat/ui with cc-04 and ag-01: all 5 gates passed (tsc --noEmit, vitest: 169 passed in 15 files, build: 19/19 routes, test:align: all pairs aligned, test:hydration: 0 errors incl. /training at 390 and 1440).
- Probes: cc02-final, cc03, cc04, cc05, cc06: no problems.
- Edges: training-content (phase-checklist, rest-day-card) and training-summary (salt-summary-card, sodium-progress-card) are not in tests/alignment.py, so not checked by the gate.


## Quality Gate Summary (cc-12b)
- Gates on feat/ui-cc-12b, rebased onto origin/feat/ui (already up to date): tsc --noEmit ok, vitest 248 pass in 20 files (trends.test.ts 25 pass), build ok (26 routes), test:align all pairs pass (≤ 1 px; /trends trends-rows 390 4 pairs, 1440 4 pairs), test:hydration 0 errors (/trends 390 and 1440). Each step of `npm run check` was run as its own command, because the build would overwrite the .next folder under the running server.
- Probes on prod :3101: cc03–cc12, cc12a, cc12b and screenshots.py all pass. cc02-final passes on dev :3101 only.
- cc12b (16 checks): the 2.380 kcal bar uses the đạt token (bg-blue) and is labelled "trong mục tiêu"; no red bar above the minimum; the calcium row reads "Mục tiêu: 1.200–1.500 mg" on /trends and "1.200–1.500 mg" on /micros; the kcal legend lists exactly Trong mục tiêu, Thiếu, Hôm nay (đang ghi); date window ends today with "nay"; nav; Saira and Manrope.
- cc12a: its calcium assertion changed from "1.200 mg" to "1.200–1.500 mg" (the range is now part of the spec); the rest is unchanged and still passes.
- Edges: /trends 390 trends-rows (4 pairs) pass; /trends 1440 trends-rows (4 pairs) pass; /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass.
- Screenshots: `apps/web/.screenshots/cc12b-trends-390.png`, `cc12b-trends-1440.png`.

## Quality Gate Summary (cc-12a)
- Merges: feat/ui-ag-03 (Trends, 3 commits, a clean merge) and feat/ui-ag-04 (audit docs, 1 commit, a clean merge). No conflicts; no Antigravity code changed.
- Gates on feat/ui-cc-12a: tsc --noEmit ok, vitest 243 pass in 20 files (trends.test.ts 20 pass, including the date window, kcal rule and profile targets), build ok (26 routes), test:align all pairs pass (≤ 1 px; /trends trends-rows 390 4 pairs and 1440 4 pairs), test:hydration 0 errors (/trends at 390 and 1440). Each step of `npm run check` was run as its own command, because the build would overwrite the .next folder under the running server.
- Probes on prod :3101: cc03–cc12, cc12a and screenshots.py pass. cc02-final passes on dev :3101 only.
- cc12a: window 05–11/10 ends today and the last bar reads "11 · nay"; calcium 1.200 mg on /trends and 1.200–1.500 mg on /micros; no red bar above the range; /micros → Xu hướng → /trends → back to /micros; title and protein number in Saira Condensed, body and headings in Manrope.
- Edges: /trends 390 trends-rows (4 pairs) pass; /trends 1440 trends-rows (4 pairs) pass; /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass.
- Screenshots: `apps/web/.screenshots/cc12a-trends-390.png`, `cc12a-trends-1440.png`, `cc12a-micros-link-390.png`.

## Quality Gate Summary (cc-12)
- Gates on feat/ui-cc-12: tsc --noEmit ok, vitest 223 pass in 19 files, build ok (25 routes), test:align all pairs pass (≤ 1 px, prod :3101), test:hydration 0 errors. Probes on prod :3101: cc03, cc04, cc05, cc06, cc07, cc08, cc09, cc10, cc11, cc12, screenshots.py all pass. cc02-final passes on dev :3101 only (its dev link is hidden in production, as before).
- Parity result: 10 fixed, 15 left as decided, 12 questions (docs/parity-cc12.md; OPEN_QUESTIONS cc-12).
- Calendar check (cc12.py): 1440 centred dialog, 390 bottom sheet, Esc closes and focus returns to the date.
- Edges: /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass; /today 390 today-header, meal-card pass; /today 1440 today-header, desktop-meal pass; /profile 390 profile-header, profile-row pass; /profile 1440 profile-row (9 pairs) pass; /setup/profile 1440 setup-row (2 pairs) pass; /setup/goal 1440 daily-targets (3 pairs) pass; /foods/food-cha-la 390 and 1440 food-detail (3 pairs) pass.
- Probe change: cc07 now finds the stat line by its prefix "đã đạt" (the copy is "đã đạt mục tiêu").
- Screenshots: `apps/web/.screenshots/cc12-<screen>-{390,1440}.png` (sweep), `cc12-CalendarPicker-1440.png`, `cc12-copy-report.txt`.

## Quality Gate Summary (cc-11)
- Gates on feat/ui-cc-11, production build on :3101: tsc --noEmit ok, vitest 223 pass in 19 files, build ok (25 routes), test:align all pairs pass (<= 1 px; new past-day rows included), test:hydration 0 errors, cc03–cc11 pass (cc11: no problems), cc02-final passes on the dev server (dev only, as before). Each step of `npm run check` was run as its own command, because test:align needs a running server.
- Edges: /today 390 today-header (1 pair), meal-card (10 pairs) pass; /today 1440 today-header (1 pair), desktop-meal (15 pairs) pass; past day /today?date=<yesterday> 390 today-header (1 pair), meal-card (9 pairs) pass; 1440 today-header (1 pair), desktop-meal (15 pairs) pass; /profile 390 and 1440 profile-row (9 pairs) pass.
- Screenshots: `apps/web/.screenshots/cc11-past-locked-390.png`, `cc11-desktop-calendar-1440.png`, `cc11-lacking-390.png`.

## Quality Gate Summary (cc-10)
- Gates on feat/ui-cc-10, production build served on :3101: tsc --noEmit ok, vitest 217 pass in 18 files, build ok (25 routes), test:align all pairs pass (<= 1 px), test:hydration 0 errors, cc03–cc10 pass (cc10: no problems), screenshots.py ok. cc02-final: fails on the production build by design (its dev-only sign-in link "Mô phỏng mở link (dev)" is hidden there); passes on the dev server (:3101). Its first dev run timed out on a cold compile of /setup/profile; the rerun passed. Each step of `npm run check` was run as its own command, because test:align needs a running server.
- Edges: /today 390 today-header (2 pairs), meal-card (10 pairs) pass; /today 1440 today-header (2 pairs), desktop-meal (15 pairs) pass; /profile 390 profile-row (9 pairs) pass; /profile 1440 profile-row (9 pairs) pass. Past-day views (390 and 1440) are not in tests/alignment.py, so they were checked on screenshots only: cc10-past-day-390.png, cc10-past-empty-390.png, cc10-today-1440.png.
- Screenshots: `apps/web/.screenshots/cc10-copy-sheet-390.png`, `cc10-past-day-390.png`, `cc10-calendar-390.png`, `cc10-today-1440.png`, `cc10-past-empty-390.png`.

## Quality Gate Summary (cc-04)
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: all 5 gates passed (tsc --noEmit, vitest: 158 passed in 14 files, build: 19/19 routes, test:align: all pairs aligned incl. food-header and entry-header, test:hydration: 0 errors).
- Probes: cc02-final, cc03, cc04 (back buttons, step bars, heart, meal chip grid, /add sticky coverage over 122 scroll positions), cc05, cc06: no problems.
- Edges: food-header (mobile & desktop 1 pair each pass), entry-header (mobile & desktop 1 pair each pass), entry (mobile & desktop 3 pairs each pass), add-list (mobile & desktop pass), setup-row (desktop pass), daily-targets (mobile & desktop pass), food-detail (mobile & desktop pass).
- Screenshots: `apps/web/.screenshots/cc04-food-detail-390.png`, `cc04-setup-profile-390.png`, `cc04-entry-1440.png`, `cc04-add-sticky-390.png`.


## Quality Gate Summary (ui-04b-fix-1)
- `npm run check`: All 5 gates passed (tsc --noEmit, vitest: 107 passed in 12 files, build: 19/19 routes static/dynamic, test:align: 16 checks passed, test:hydration: 0 errors).
- Edges: today-header (mobile & desktop 1 pair each pass), micros-header (mobile & desktop 1 pair each pass), daily-targets (mobile & desktop), setup-row, add-list (mobile & desktop), meal-card (mobile), micros-card (mobile & desktop), portion (mobile & desktop), food-detail (mobile & desktop), desktop-meal (desktop) all pass.
- Screenshots: `apps/web/.screenshots/today-header-390.png`, `apps/web/.screenshots/today-header-1440.png`, `apps/web/.screenshots/micros-header-390.png`, `apps/web/.screenshots/micros-stuck-390.png`.
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
| 11/10/2026 | cc-03 | Favourites (Yêu thích): `lib/favourites.ts` stores ids in localStorage under `h1t_favourite_foods_v1` (validated, guarded, loaded after mount through diary-store). Heart on /foods/[id] with the existing Toast. /add: Yêu thích chip after Tất cả, flat favourites list ranked by search, empty state with Bỏ lọc. Grouped rows show a 14 px heart. | Dong: favourites table when accounts exist. Cross-tab sync (storage event) not built |
| 11/10/2026 | cc-05 | Edit entry and undo, part 1: `/entry/[id]` (portion, meal, Lưu, Xoá món này, unknown id). Sample items get an edit layer in sessionStorage (`h1t_sample_edits_v1`), resolved by name to MOCK_FOODS. Totals, meal kcal and Micros come from the edits. Undo for the last delete, in the toast (5 s). Pure logic in `lib/diary-edits.ts`. | Antigravity: link Today rows to /entry/{item.id} (after ui-04b). Part 2 with Today wiring |

| 11/10/2026 | cc-06 | Merge cc-03 and cc-05 onto ui-04b. Ownership update. Review fixes (pure runtime date, AppHeader props, Micros stuck header, inline meal chips, one toast). Today rows open Edit entry. | Part 2 of entry flow done; next task from the user |
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

## Quality Gate Outputs (cc-03)
- Branch `feat/ui-cc-favourites` from `feat/ui` d2c3387 (already has cc-02). Not pushed. Not merged: see the merge note below.
- Tests written first: `lib/__tests__/favourites.test.ts` (16 tests). The favourite-filter test in `food-categories.test.ts` became 5 tests (net +4). It failed before the code and passes now.
- `npm run typecheck`: exit 0. `npm run test`: 12 files, 112 passed.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Build compiled. `test:align` pairs: add-list 390 3, add-list 1440 3, food-detail 390 4, food-detail 1440 4 (the new heart row is in the group). `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc03.py`: no problems at 390 and 1440. Heart saves and un-saves, Yêu thích lists Chà là only, empty state and Bỏ lọc, reload keeps the favourite, 14 px aria-hidden heart in the grouped list, one × in the search box.
- `npm run probe -- tests/probes/cc02-final.py`: no problems after two expectation changes: the Yêu thích chip is now shown, and there are 11 filter chips (was 10).
- Edges: `/add` @ 390 and 1440 (add-list) pass. `/foods/food-cha-la` @ 390 and 1440 (food-detail) pass.
- Review fix: an id for a food that no longer exists no longer shows a blank "Không có “”" in the Yêu thích view.
- Screenshots: `apps/web/.screenshots/cc03-detail-heart-390.png`, `cc03-add-fav-390.png`, `cc03-add-grouped-heart-390.png`, `cc03-add-fav-empty-1440.png`.
- Merge: not done. Antigravity's ui-04b is not committed, and `nutrition-fortifykitchen` has uncommitted AGENTS.md and PROGRESS.md changes. Stopped with "ready, waiting for ui-04b".

## Quality Gate Outputs (cc-05)
- Branch `feat/ui-cc-edit-entry` from `feat/ui-cc-favourites` (07d6b82, includes cc-03). Not pushed, not merged.
- Tests first: `lib/__tests__/diary-edits.test.ts` (28 tests). Before the code it failed on the missing module. Now it passes.
- `npm run typecheck`: exit 0. `npm run test`: 13 files, 140 passed.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Build compiled. `test:align` pairs unchanged for the existing groups. `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc05.py`: no problems at 390 and 1440. Yến mạch 90 g: breakfast 459 → 573 kcal, day 1.041 → 1.155. Moved to Bữa tối: breakfast 231, dinner 342, day 1.155. Delete Yogurt kefir: toast shows, Hoàn tác puts it back in its place. Delete Chuối without undo: gone after reload, and the moved edit and restored item survive. `/entry/no-such-item`: empty state.
- Edges: `/entry/item-1` @ 390 and 1440 (entry group) pass, 4 pairs each. Checked with the shared helper from `tests/alignment.py`, because that file does not list the route yet (see OPEN_QUESTIONS).
- cc-02 and cc-03 probes: no problems (regression check after the store change).
- Screenshots: `apps/web/.screenshots/cc05-entry-390.png`, `cc05-entry-1440.png`, `cc05-undo-toast-390.png`.
- Design check: the undo toast matches the design (message, Hoàn tác, countdown). The entry card matches the design's fields and preview. The meal control uses the shared sheet instead of inline chips (see OPEN_QUESTIONS).
- Review fixes: a damaged stored list of added entries now reads as empty. It no longer clears the sample edits or crashes the entry screen (`parseAddedEntries`, with tests). `amountsOfEntry` removed, since `amountsOfNumbers` covers entries.
- Merge: not done. Ready for review.

## Quality Gate Outputs (cc-06)
- Rebased `feat/ui-cc-favourites` then `feat/ui-cc-edit-entry` onto `feat/ui` f935803 (only OPEN_QUESTIONS conflicted, both sides kept). Typecheck and tests passed after each.
- Ownership: Claude Code owns apps/web and merges `feat/ui`; Antigravity works on `feat/ui-ag-*` only (AGENTS.md, .agent/rules/antigravity.md, CLAUDE.md).
- Fixes: `withRuntimeDate` (pure, tested) replaces the `syncSampleDayToday` mutation, applied in the diary store after mount. AppHeader: `rightAction`, `desktopSubtitle` and `dateLabel` removed (`actions`, `subtitle`, `date`). Micros phone layout: header and chip bar fixed, only the body scrolls. Edit entry: inline meal chips, one toast system (`components/diary-toast.tsx`, 5 s undo), UndoToast and the MealSwitcher `title` prop removed. `/entry/item-1` added to alignment.py.
- Next dev "1 Issue": not reproduced here (fresh load, client navigation and seeded storage, old and new code, 390 and 1440, no console warnings or badge). `hydration.py` now fails on any React/Next console warning and on the dev badge, on /today, /micros, /add and /entry/item-1 at both widths.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. 14 test files, 158 tests. Pairs: daily-targets 390 3 / 1440 3, setup-row 1440 2, add-list 390 3 / 1440 3, today-header 390 1 / 1440 1, micros-header 390 1 / 1440 1, entry 390 4 / 1440 4. `test:hydration`: 16 checks pass.
- Probes `cc02-final`, `cc03`, `cc05`, `cc06`: no problems. cc06: Today row → edit 90 g → totals 1.155; delete shows one toast, Hoàn tác restores; no Issue badge; Micros header stays at top, chip bar fixed.
- Screenshots: `apps/web/.screenshots/cc06-today-390.png`, `cc06-micros-stuck-390.png`, `cc06-entry-chips-390.png`, `cc06-today-1440.png`.
