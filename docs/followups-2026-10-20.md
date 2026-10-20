# Follow-ups, 20/10/2026

## Part A: PR #20 finished and merged
**PR #20 merge commit: `fc24b09`** (merge commit into main, no squash), https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/20. origin/main had no new commits to merge first. Before the merge: gate:full all green (108 PASS, 0 FAIL), `go vet ./...` clean, `go test ./...` ok. GitHub CI on the merge commit: CI, API CI and Release guard green (the merge went through while CI was still running; it finished green).

| Commit | What |
|---|---|
| 8241134, b521356 `cc-66:` | 125 % / 150 % text on Hôm nay: the wordmark is a logo (fixed px, one line), the date beside it wraps before its last word; a meal pill keeps "459 kcal" on one line (the label gives way first, then the kcal takes a second line of the pill); nutrient rows show the full name with the amount under it; the portion panel's ×N buttons move under their label when squeezed. 0.00 % pixel change at 100 % on all 16 screens. cc_64_worst_case covers the portion panel, Mục tiêu and 150 %. |
| 5afbf4f `cc-64:` | Low-end hard cut only when `navigator.deviceMemory` is reported and ≤ 2, never by core count. |
| 273a8b3 `cc-72:` | Release 2026-10-20b keeps the three given items and its date tour. |

Screenshots: `docs/screenshots/pr20-text/` (before / after / diff at 100 %, 125 %, 150 %).

## Part B: one PR, not merged (Hao reviews)
**PR: https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/25** (`feat/followups-1020` → `main`), from main fc24b09 with origin/main merged in twice (7967c76 hotfix/late-writes, 16f7e1f the probe/pill fix). Final gate:full all green (110 PASS, 0 FAIL), go vet / go test clean.

### Done
- **Logo → Hôm nay** (asked during the run, `home:`): the H1T MICRO wordmark on the phone header and the desktop sidebar links to Hôm nay; release 2026-10-21a item with a 1-step tour.
- **B1 size** (`size:`): every route back within +1 kB of 0d232ad (most well under): the onboarding layer loads after the first paint, `HOME_ROUTE` in its own module, the 404's header loads only on a 404. /signin 205.8 (−4.6), /landing 201.1 (−4.5), /app 296.4 (−3.2), /add 321.9 (−0.5), /foods 282.6 (−6.8), /entry 266.5 (−7.6), /micros 260.6 (−13.9), /trends 270.2 (−13.7), /explore 278.7 (−3.9), /settings 281.2 (−6.3), /settings/profile 277.4 (−6.3), /training 289.7 (−4.1). The hotfix's unstick run and header sync status still run on load.
- **B2 cc-66 parts 4–6** (`cc-66:`): PillButton sizes / tertiary / danger, IconButton, Notice, EmptyState, SectionTitle sizes, ChipGroup scroll, Card `li` / `padding={false}`; lossless migrations (0.00 % on the 8 screens × 2 widths and 19 more), the hotfix's Chưa lưu buttons and sign-out lines; 33 off-scale spacings rounded up outside Hôm nay. Shots in `docs/screenshots/cc-66b/`.
- **B3 cc-64 leftovers** (`cc-64:`): A3, A4, A7, A8; 2b link-page tint, tray collapse, toasts (grouped in place, swipe, pause while pressed), Thành phần prefetch, spotlight render/scan savings, link-page loops still on phones; P4, P10; landing P2, P3, P6, P7, P8; cc_57 4×-CPU before/after (no long tasks either way, timings within noise); probe cc_64_followups; release 2026-10-21a item "Vuốt ngang để tắt thông báo".
- sw.js `2026-10-21.1` (past the hotfix's 2026-10-20.3).

### Skipped, and why
- B1: the sheet drag controller and the portion code stay in first load (needed on the first touch; the budget is met without moving them).
- B2: ~40 raw pills, ~10 icon buttons and ~30 card surfaces that do not match a primitive exactly (normalising them moves pixels: a design call). Hôm nay's fitted hero / nutrient column / food list, the Khay bar, the share image and the landing/link/legal pages keep their spacing.
- B3: the spotlight's four-panel dim (loses the hole's round corners); P9 content-visibility on catalogue rows (tried and dropped: the /add list's end moved while rows rendered). P1, P5, R1–R3, A1, A2, A5, A6 were already done in PR #20.
- Not touched, owned by the hotfix session: the › arrow / Chưa lưu pill in app-header and probe cc_67_part3 (it failed on main 7967c76 too; fixed by PR #23 and green after the second merge).

### Open questions (OPEN_QUESTIONS.md, "Follow-ups 20/10/2026")
- Normalise the remaining raw pills / icon buttons to md/sm (my pick) or leave them.
- Card `as={Link}` + `lift={false}` for the ~30 differing card surfaces (my pick) or leave them.
- The spacing rounding: keep (my pick), round down where airy, or undo.
- Spotlight dim: keep the round-cornered shadow (my pick), square panels, or an SVG mask.
- Toast grouping: plain adds only (my pick) or the one-tap adds with Hoàn tác too.
- For the hotfix session: its `*:hidden` in app-header also hides the sr-only page `<h1>` while Chưa lưu / Ngoại tuyến shows on a phone.

### Notes
- `cc_62_sheet` is flaky on main too (1 run in 3–4); `cc_19` runs 163–174 s against the 180 s cap.
- Another session ran its own server on port 3101 during this run; these gates and probes used port 3121 (`PORT=3121`) to stay off it.
