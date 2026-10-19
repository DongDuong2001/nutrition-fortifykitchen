# Overnight run, 20/10/2026

**PR:** https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/20 (`feat/overnight-1020` → `main`, not merged)

Overnight run 20/10. One branch, `feat/overnight-1020`, off origin/main 0d232ad; origin/main merged in before this PR (no new commits). Each part is its own commit(s) with a prefix, so any part can be reverted alone. **Not merged, not deployed; no DB, migrations or server touched.** Each commit was gated in a clean worktree at that commit (gate:fast after each commit, gate:full at the end of each part).

| Part | Commit(s) |
|---|---|
| 1 gates | 8f62a2e |
| 2 cc-65 | 4a6cac1 |
| 3 cc-62 | 047a36a |
| 4 cc-66 | 356f41c (lossless), 9e07a7d (visible) |
| 5 cc-64 | 2b0b7a3 |
| 6 cc-72 | 27e8c31 |
| 7 probes | c7c99f1 |
| 8 api | 912bdac, 4cae778, 2126093, 3afacbd (Go), b0a0a2a (web) |

## Part 1: faster gates (`gates:`)
**Changed**
- Every probe timed once, one at a time: `docs/probe-times.md`, slowest first. 109 probes, **51.6 min** (cc_19 165 s, smoke 150 s, cc_42_onboarding 146 s, …).
- Fastest safe worker count: 3, 4 and 6 on a 39-probe subset holding 75 % of the serial time (all probes ≥ 30 s plus the toast/clock ones): 859 s / 663 s / **491 s**. No probe failed only under load, so **6 is the new default** in `run_all.py`; the "rerun alone on failure" rule stays.
- `npm run gate:fast`: typecheck, `vitest related` to the files changed vs origin/main, and only the probes whose new `# PROBE_COVERS:` globs match. The match follows imports from the changed files to the pages and layouts that use them (smoke.py when nothing matches, at most 12, narrowest first), on a fresh demo build with its own server. `npm run probe:covers -- <file>` shows the pick.
- `npm run gate:full`: typecheck, all unit tests, build:demo once, one server, then test:align, test:hydration and probe:all in parallel (smoke once, inside probe:all), then stop it.
- Per-probe timeout 900 s → 180 s; the probe that hits it is printed by name (only cc_19 comes near it, at 163–165 s).
- 10 probes marked "candidate to retire" in docs/probe-times.md (screenshot-only and superseded ones), not deleted.

**Gate time, old vs new**: old full gate (`npm run check` one step after another, ~210 s, plus `probe:all` one at a time, 3,096 s) ≈ **55 min**; new **`gate:full` 10.5–10.8 min** (627–691 s per part tonight). `gate:fast` after a commit: **~2 min** (116–127 s). `probe:smoke`: 160 s.

## Part 2: cc-65 tests and cleanup (`cc-65:`)
**Changed**
- Tests: midnight rollover at 23:59:50 and an add queued offline before midnight saved to its own day after it, each in Ho Chi Minh and Los Angeles (`vn-time.test`, 7); the real api-client and mergeServerDay against an in-memory API: 401 then renew, 409 PAST_DAY_READ_ONLY (final), a replayed client uuid makes no second row, one entry edited on two devices (`sync-fake-api.test`, 4); a 3,000-food catalogue: page 17 failing never swaps the copy, a full IndexedDB keeps the foods, search timed at ~1.8 ms a query (`catalog-3000.test`, 5); sw.js and lib/pwa.ts `routeFor` also agree on /auth, /join and lookalikes.
- `npm run check:live-bundle` (builds live into `.next-live`, fails if mock markers ship), documented in AGENTS.md, not in CI. **Red today**: 3 of 4 markers ship (the sample user and two mock food ids), see OPEN_QUESTIONS.
- One `lib/vn-time.ts` (zone, day key, date parts, clock, midnight) replaces the copies in date, format, day-archive and meal-slot; `useId` for the unit area's gram field; one `isLiveMode`; removed CompareBar, OverviewCard, releaseById and 9 unused icons.
- 11 `data-testid` attributes (add-fab, day-prev/next, portion-add, tray-review/add/toggle, meal-header, meal-add, food-search, auth-submit); cc_67_taps and cc_53_units use them with explicit waits; 8 probes tagged smoke (`npm run probe:smoke`, 160 s); a quarantine list in run_all.py (reason + expiry).

**Skipped / why**
- The 8 probes the brief names as red on main all pass on 0d232ad (PRs 17–19 fixed them), so none were quarantined for that. Only cc_26 and cc_44 were red; they were quarantined here and are fixed and back in Part 7.
- apiClient.copyYesterday/logMeal/logSavedMeal: already gone on main. Plus, X, chevrons, Search and Trash icons kept for cc-66's icon swap.
- A provider-level renderHook test: no jsdom/testing-library in the repo (npm install); the rollover is tested at the module level with the store's own timer arithmetic and the real sync engine.
- Live-bundle fix: needs the mock catalogue behind a dynamic import (touches Dong's api-client); in OPEN_QUESTIONS.

## Part 3: cc-62 sheet physics (`cc-62:`)
**Changed**
- Release by velocity over the last ≤ 80 ms (0 after 100 ms still), an upward release never closes, close on a flick (> 0.4 px/ms) or when pos + 499·v passes half the sheet (`lib/sheet-physics.ts`).
- The release is a **spring from `motion` 13.5.1** (pinned, older than two weeks): `animate` on the transform string from the live position with the release velocity (close bounce 0, snap back 0.15 after a flick, visualDuration 0.3). It is **imported on the first pointerdown on a sheet**, its own chunk `sheet-spring`, **18.5 kB gzip, in no route's first-load JS**. Reduced motion or a chunk not loaded yet keeps the CSS release.
- Grab-back: a new grab stops a running spring where it is. A sheet sliding away can be grabbed back: on /add any close, clearing closingRef and the timer; on a Sheet a drag close.
- The scrim follows the drag; the title block drags too; snap haptic on close. The logic is in `sheet-drag-controller.ts` (no React; unit tested with a mocked animate).
- Pull to refresh 120·(1 − e^(−dy/120)) with an 8 px slop and a tick at 64 px; the switch knob slides; reduced motion keeps push/Back as a 120 ms cross-fade and the spinner breathes; press in 100 ms, out 160 ms.
- Xóa bữa này deletes at once, Hoàn tác for **8 s**; "Nhập số gam lớn hơn 0" (role=alert, aria-describedby) under a gram field; quick-add checks a field on blur.
- A sheet over /add gets a lighter scrim (`--color-scrim-2`) and /add steps back to .97 (the `scale` property); 12 px fade edges under the /add header, above the Khay bar and above the CTA bar (solid, no border).
- Probe `cc_62_sheet` (real CDP touches at 390x844, 13 checks): slow 60 px stays, flick closes, down-then-up stays, grab while closing reopens (on /add and on a Sheet), the title drags, the chunk loads only after a touch. **Frames of a flick and release: `docs/screenshots/cc-62/strip-flick.png`.**

**Skipped / why**: reduced-motion bars "120 ms fade" (a fill changes length; nothing to fade, it snaps). A Sheet closed by ✕/scrim/Esc can't be grabbed back (its `open` belongs to the screen). Both are in OPEN_QUESTIONS.

## Part 4: cc-66 design system (`cc-66:`)
**Changed**
- **Lossless commit (0.00 % pixel diff on all 16 screens: Hôm nay, + Thêm, portion, Tổng quan, Khám phá, Cài đặt, Mục tiêu, Có gì mới × 390/1440).** Tokens: radius card 18 / sheet 20; a rem type scale (2xs 10 … display 34 px at a 16 px root, font size only); z scale sticky 10 / nav 40 / sheet 50 / toast 55 / tour 60 (install sheet on the sheet layer, spotlight on tour). `--color-text` = ink. Deleted blue, paper, red, muted-dark and level-*-dark.
- Codemods, as idempotent scripts: 258 size/radius/z, 303 colours (blue→cobalt never level-blue, paper→page, red→destructive, muted-dark→secondary, emerald→success, no `var(--x,#hex)`), 581 type (`text-[Npx]` → tokens or exact rem; the share image stays px). The landing footer reads tokens.
- **Text now follows the phone/browser text size**: checked at 125 % in `docs/screenshots/cc-66/*-text125`.
- **Visible commit (0.8–2.4 % of pixels per screen):**
  - D10: cards get a semi-transparent ink ring (`shadow-ring`) over a 1 px transparent border, so nothing inside moves. Ink-tinted shadow scale, `shadow-card` and `shadow-sheet`. Chips use an inset ring in both states, so there's **no 2 px jump**. No FAB shadow.
  - S16: `prefers-contrast: more` (darker edges, strong secondary, scrim .55) and reduced-transparency (landing header solid).
  - S10: 44 class lists that named an unloaded weight now name the weight actually drawn (no visual change; audit probe `cc_66_weights`).
  - S11: tracking-display / label / caps. S12: leading 1.1 on the share name and the coach name.
- **Before/after/diff pairs: `docs/screenshots/cc-66/{before,after,diff}`** plus the 125 % sets.

**Skipped / why**: Parts 4–6 of the brief (PillButton md/sm/tertiary + IconButton and migrating ~70 controls, ChipRow/Row/Notice/EmptyState/SectionTitle, the ~180 off-scale spacings, `<Card>` for 62 surfaces). Each is a per-screen refactor with its own visual check; they didn't fit tonight, and the tokens they need are in. tracking-label is left off the hero's macro cells (fitted to 76 of 77.5 px, cc-45). At 125 % text Hôm nay's meal-pill kcal wraps and nutrient names truncate (design call, OPEN_QUESTIONS).

## Part 5: cc-64 phone feel, motion, worst case (`cc-64:`)
**Changed**
- Phone feel: N2 safe-area bottom on sheets and the /add list; N3 sheets ≤ 100dvh − 24 px with their own scroll, `interactive-widget=resizes-content`; N6 top safe area on the auth shell and landing header; N7 dvh (27 places); N8 no text selection or link callout on controls (the share image keeps its callout); N9 search keyboard hints, macro fields that keep what is typed (parse on blur); N10 portrait.
- **P1: a moved Hôm nay row now glides** (WAAPI). Probe `cc_64_flip`: off its place for 12 frames, then at rest; no slide under reduced motion.
- R1: the kcal count writes its text nodes (no React render per frame), only on add/delete. R2: rows tint instead of scale 0.99. R3: bars animate transform only.
- A1 Khay bar in Expand; A2 the first content after the skeleton fades in; A5 Khay + colour; A6 the select bar enters like a toast; P5 hard cut on 2 GB / 4-core devices; "Có gì mới" opens at idle ≥ 600 ms after Hôm nay.
- Probe **`cc_64_worst_case`** (worst-case data seeded by the probe into demo storage only; 390 and 320 px, 125 % text, offline). It found two overflows (hero pills, search field), both fixed; green now: no visible overflow, no NaN/Infinity, unknown kcal never "0 kcal".

**Skipped / why** (time; listed in OPEN_QUESTIONS for a follow-up): A3, A4, A7, A8; Part 2b (link-page tint, tray card collapse, toast update/swipe/press-pause, Thành phần prefetch, spotlight panels, link-page loops); P4, P9, P10 and the landing items P2/P3/P6/P7/P8; the cc_57 4×-CPU before/after measurement. N3 keyboard: Playwright's iPhone emulation has no keyboard, so no visualViewport listener; please check on an iPhone.

## Part 6: cc-72 (`cc-72:`)
- A calendar icon next to the date at the top of Hôm nay, in the icon set's style (the set's Calendar path, stroke 1.8, drawn inline in the header like its chevrons, so the header does not pull the whole icon module into every route). Phone: inside the date button (16 px, 44 px tall control). Desktop: before the full date (18 px). Still one control (checked against ui-ux-pro-max: affordance, 44 px, no duplicate control).
- **Release 2026-10-20b**: "Bấm vào ngày để mở lịch" (text as given), plus "Kéo bảng xuống mượt hơn", "Xóa bữa không cần hỏi lại", "Chữ to theo máy bạn" and "Gõ số dễ hơn" (5 items; cap 8). Tour: one step on the date (fallback the day arrow).
- releases.test, cc_46 and cc_tutorials updated; sw.js **2026-10-20.2**.

## Part 7: probes cc_26 and cc_44 (`probes:`)
- **cc_26**: asserts the 1.1 share-name line height (it asserted 0.9 against 1.05). The "paper above the body" failure was the image's last, partial row (page height × 1080/390 = 2240.4 rows); with 1.1 it's whole and all 348 checks pass. OPEN_QUESTIONS notes the robust fix if it returns.
- **cc_44**: the no-font WebKit overlap is reported as [INFO] (share-sheet never draws without its fonts); with the fonts an overlap still fails.
- Both are off the quarantine list (empty again).

## Part 8: API hardening (`api:`)
See **For Dong** below. Web side: the catalogue in 5,000-food pages with the old paging as the fallback, and vitals reporting.

## gate:full output (branch head)
```
gate:full: 625 s wall clock   (b0a0a2a, clean worktree)
  typecheck       ok      0 s
  vitest          ok      6 s   (154 files, 1917 tests, 2 skipped)
  build:demo      ok     10 s
  test:align      ok     78 s
  test:hydration  ok    109 s
  probe:all       ok    608 s   probe:all: 108 PASS, 4 REPORT, 0 QUAR, 0 FAIL, 1 SKIP (cc02-final, dev only)
gate:full: all green
apps/api: go vet ./... clean; go test ./... ok (16 packages)
```

## First-load JS per route (gzip kB, origin/main 0d232ad → this branch)
| Route | origin/main | this branch | change |
|---|---:|---:|---:|
| /signin | 210.4 | 212.3 | +1.9 |
| /landing | 205.6 | 208.8 | +3.2 |
| /app | 299.6 | 308.3 | +8.7 |
| /add | 322.4 | 331.3 | +8.9 |
| /foods/food-cha-la | 289.4 | 294.7 | +5.3 |
| /entry/item-1 | 274.1 | 278.5 | +4.4 |
| /micros | 274.5 | 277.8 | +3.3 |
| /trends | 283.9 | 287.4 | +3.5 |
| /explore | 282.6 | 289.7 | +7.1 |
| /settings | 287.6 | 293.3 | +5.7 |
| /settings/profile | 283.8 | 289.5 | +5.7 |
| /training | 293.8 | 299.2 | +5.4 |

**Over the 1 kB budget the cc-62/64/66 briefs set.** What grew, by chunk (kept for review, not hidden):
- Every route, about +1.9 kB: the root layout now carries the shared Ho Chi Minh formatters (vn-time) and the vitals loader; the AppHeader gains the calendar glyph and test ids. (The whole icon module had ended up in every route through the header's calendar import; the glyph is now drawn inline, which took /signin from +5.2 to +1.9.)
- Screens with sheets, +1 to +3 kB more: the sheet drag controller and release physics (cc-62); motion itself (18.5 kB gzip) stays out of first load.
- /app and /add, +8.7 and +8.9: also the portion-area alert and quick-add checks (cc-62), the count-up via text nodes, Expand on the Khay bar, the select bar's toast entry and the ring/tracking classes (cc-64/66).
Bringing every route back within 1 kB means moving the drag controller and the portion code behind dynamic imports. Proposed as its own follow-up rather than done in a rush tonight.

## For Dong
Go only, no migrations; `go vet ./...` clean, `go test ./...` green (all 16 packages), with a test for each change.
- **912bdac generic 500s**: coaching, profile, payment, vault, library and nutrition log the error with ids and send a fixed message (as diary/handler.go). JSON-decoder 400s say "Invalid request body". 400s that passed raw service errors through now answer 400 only for our own sentinels (new: ErrSavedMealNameRequired, ErrNameRequired, ErrInvalidServingSize, ErrNegativeMacronutrients, ErrInvalidDraftStatus, ErrDraftNotFound → 404), anything else a logged 500. The auth middleware's 401 text is left (fixed strings already).
- **4cae778 write guard (Dong #2)**: `internal/csrf`, on `/api/v1` after CORS. POST/PUT/PATCH/DELETE must carry `Content-Type: application/json` (charset allowed; a body-less request with no Content-Type passes) and an `Origin` matching `cfg.AllowedOrigins` + `https://lehongkhanh.vn` (or the API host). With no Origin, `Sec-Fetch-Site: same-origin` passes and same-site/cross-site/none are refused. With neither header the request passes (a non-browser client with its own bearer token), unless a Referer names another site. 403 with `CSRF_ORIGIN` or `CSRF_CONTENT_TYPE`. Exempt: `/payments/webhook` and `/vault/webhook`. The web always sends JSON (`/client-errors` uses fetch, not sendBeacon). `auth.MatchOrigin` is shared with validateOrigin. **State-changing GETs: none found.** Anything else that POSTs a non-JSON body to /api/v1 now gets a 403.
- **2126093 catalogue (Dong #4)**: `GET /foods?limit=N` without `q` allows up to 5,000 (searches stay at 500; default 20); the response still echoes `limit`. The web asks for 5,000 and falls back to the old paging by itself. Cold catalogue on the fake API (Fast 4G): 683 foods 1,347 → 1,350 ms (2 → 1 request); 3,000 foods 1,846 → 1,359 ms (6 → 1). Not run against a real database (no DB access tonight): please check a 5,000-row page's query time.
- **3afacbd vitals (Dong #5)**: kind `vitals` on /client-errors (`name` LCP/INP/CLS/FCP/TTFB, `page` without query, `value` ≥ 0 and finite), logged at info with event client_error, no table. The web sends LCP, INP and CLS once per page view, for one view in five (≤ 3 requests per sampled view, inside the 10/min limit).
- **Left for Dong**: #1 CI (your call; `check:live-bundle` and `gate:fast` are ready to wire in), #3 the session revocation check (needs auth.sessions access), and profile `updated_at` (needs a migration).

## Needs Hao (OPEN_QUESTIONS, overnight 20/10 section)
Live bundle still ships mock data; 125 % text squeezes on Hôm nay; cc-66 Parts 4–6 and the cc-64 leftovers as follow-ups; low-end hard-cut threshold (iPhones with 4 cores); keyboard over sheets on a real iPhone; the 8 quarantine-named probes already pass.
