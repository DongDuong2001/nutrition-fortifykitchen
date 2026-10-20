# fix/polish-1020: one interruption per open, an update that does not get in the way, a lighter add list, and the small accessibility fixes

**Stacked on `feat/fluid-add`: merge that PR first, then this one** (this branch contains its commits; the diff against `main` shows both until the first is in). Open for Hao's review, not merged.

Not in this PR (as asked): desktop max-width, the Tổng quan empty state.

## What changed (the brief's items)

| # | What | Where |
|---|---|---|
| 1 | **One interruption per app open.** Có gì mới > the install pop-up > a first-time tip, and at most one of them opens per page load. Each says whether it has something to show (`setInterruptionDue`) and asks before it opens (`claimInterruption`); a higher-ranked one that is due holds the others back. They no longer wait for each other in loops of their own (a tip used to hold Có gì mới back, and Có gì mới the pop-up). A tip also never opens over a field that has focus or a sheet that is still moving, and tries again 400 ms later. | `lib/interruption.ts`, `components/whats-new/whats-new-host.tsx`, `components/pwa/install-prompt.tsx`, `components/onboarding/onboarding-layer.tsx` |
| 2 | **"Có bản mới".** The toast comes once the page is idle, sits right above the bottom nav and **the screens leave room for it** (`--update-bar-h`: the tab frame's padding, Hôm nay's list height, the diary toast's place), so it never covers a row; it goes after 10 s. The update is applied when the app goes to the background (a reload nobody sees) or by the next cold open, never while writes wait (cc-68); Tải lại still applies it at once. | `components/pwa/update-offer.tsx`, `lib/update-phase.ts`, `lib/update-bar.ts` |
| 3 | **The /add list draws a few rows of each category** (5 of each, 30 for a search) with "Xem thêm <nhóm> (n món)"; the rest of the list's rows are not in the DOM. | `components/foods/food-list.tsx` (`ADD_LIST_LIMITS`), `add-screen.tsx` |
| 4 | **Portion sheet:** a visible ✕ (44 px, "Đóng"), Esc closes it (the Sheet already did; now checked), focus goes back to the control that opened it, not to the search field (which raised the keyboard). | `components/ui/portion-panel.tsx`, `add-screen.tsx` |
| 5 | **Hit areas:** the meal header (and + Thêm) take the 4 px of paper above them as hit area and no pixel of a row (see Review fixes, 18); the look does not change. | `components/home/food-list.tsx` |
| 6 | **Landmarks:** smoke.py now fails a screen without exactly one `<main>` and one h1; the offenders are fixed (the list is under "Landmarks" below). The nutrient row's aria-label reads its real target ("Canxi, 150 mg trên mục tiêu 1.000 mg, 15%, Thiếu"), and nothing when it is unknown, never "— mục tiêu". | `lib/home.ts` (`nutrientRowLabel`), `components/home/nutrient-column.tsx`, the landmark fixes below |
| 7 | **/add search:** typing leaves the header where it is and starts the new results at the top; the carousels fold away with Expand instead of cutting out; the primary buttons (the portion sheet's, the tray's) wrap to two lines at 360 px with 150 % text instead of clipping; the "Bấm + để nhân…" line is gone. | `add-screen.tsx`, `add-tray.tsx`, `portion-panel.tsx`, `lib/portion.ts` |

## Measured

**The /add list** (`_fluid_add_measure.py` `addlist`, headless Chromium; JSON in `docs/pr/fluid-add-probe-polish-before.json` and `-after.json`):

| | Before | After |
|---|---|---|
| Demo catalogue (43 foods): DOM nodes | 616 | 488 |
| Demo: food rows drawn | 49 | 34 |
| Demo: Tab stops | 140 | 112 |
| Demo: time to the first food row at 4x CPU throttle | 104.6 ms | 106.9 ms (unchanged: 43 foods are cheap either way) |
| **Live-sized catalogue (683 foods, 10 categories, server-rendered count)**: rows | 500 | 50 |
| Live-sized: DOM nodes | 4,551 | 501 |
| Live-sized: Tab stops | 1,010 | 110 |

The live-sized row is a unit test (`components/foods/__tests__/food-list.test.tsx`, server-rendered), not a browser timing: the demo build only has 43 foods, so the time to open at the live size was **not measured in a browser** (see For Hao).

**Landmarks** (`smoke.py` now fails any screen without exactly one visible `<main>` and one h1; 144/144 pass): `<main>` was added to `/entry/[id]`, `/foods/new`, `/setup/goal`, `/setup/profile`, `/landing`, `/reset-password`, `/signin`, `/signin/check-email`, `/signin/expired`, `/signin/forgot` and `/signup`, and Hôm nay's content wrapper and the /add screen (standalone) are a `<main>` too. The /add sheet drawn over a tab is a dialog, not a second main.

## Screenshots (390 and 1440)

Written by `tests/probes/_polish_shots.py` (not a gate probe), looked at one by one:

- /add: [390](../screenshots/polish-1020/add-390.png) · [1440](../screenshots/polish-1020/add-1440.png) (5 rows of each category, "Xem thêm <nhóm> (n món)")
- Portion sheet with the ✕: [390](../screenshots/polish-1020/portion-390.png) · [1440](../screenshots/polish-1020/portion-1440.png)
- Hôm nay with "Có bản mới" above the bottom nav and room left for it: [390](../screenshots/polish-1020/home-update-390.png) · [1440](../screenshots/polish-1020/home-update-1440.png)

## Review fixes (21/10, after Hao's review; feat/fluid-add merged in first)

| # | What | Where |
|---|---|---|
| 10 | **A background update cannot lose work.** The update reloads only when the outbox is empty **and** nothing is in hand: one small registry, `lib/unsaved-work.ts`. The add sheet marks a tray with foods, an open portion sheet and the Chỉ ghi kcal form; every other form is noticed without wiring each one: `UnsavedWorkWatch` (root layout) listens once for a trusted `input` in a text, number, date… field or a textarea or select (not a search box), and counts it until its form is submitted or the address changes (setup, /foods/new, the entry editor and the settings forms). Tải lại while something is in hand says so ("Có bản mới · bạn xong việc đang làm là tải lại") and waits. **Multi-tab:** the takeover reaches every tab; a tab that did not ask keeps its old code until its own next `visibilitychange` to the background with nothing waiting or held (`shouldReloadStaleTab`); the tab that asked checks again at `controllerchange`. The stale comment in `pwa-register.tsx` is rewritten. Hand-run check (`_polish_update_check.py`): a tray of 2 + update waiting + page hidden → still there; another tab applies the update → a tab with a typed-in form does not reload, hidden or not. | `lib/unsaved-work.ts`, `components/unsaved-work-watch.tsx`, `lib/update-phase.ts`, `components/pwa/{pwa-register,update-offer}.tsx`, `components/add/add-screen.tsx` |
| 11 | **Release note.** One entry for #32 and #33, id **2026-10-21c** (next unused on origin/main: its top is 2026-10-21b), four items in plain spoken Vietnamese (the sheet over the screen, Hoàn tác after every add, the lighter list with ✕, the update notice); `sw.js` VERSION 2026-10-21.5 (origin/main has .4). **No tour and no tip, on purpose:** every control in it is a labelled button a newcomer finds by itself (+, ✕, Xem thêm, Hoàn tác) and no gesture is new. AGENTS.md says a fix extends the top entry; this is a feature release for two PRs and Hao asked for one entry. Pick the id and the version again on origin/main right before merging (another branch may take them). `tutorial-targets.test.ts` is green; `cc_46.py` and `cc_tutorials.py` follow the new newest release. | `lib/releases.ts`, `public/sw.js` |
| 12 | **Có gì mới wins on a slow start.** The "due" report moved out of the lazy sheet into `WhatsNewDue` (small, not lazy, mounted with Hôm nay). On Hôm nay the install pop-up and the tips wait for that report (up to 6 s after load, then they go on without it). Probe: 450 ms latency, 200 kB/s, CPU ×6, everything due at once → Có gì mới opens, alone. | `components/whats-new/whats-new-due.tsx`, `lib/interruption.ts` |
| 13 | A tip asks `mayInterrupt` before it polls; while the answer is no nothing polls, and the tip stays due (the effect looks again when the state changes, and on the next screen visit). | `components/onboarding/onboarding-layer.tsx` |
| 14 | `data-autofocused` goes at the first pointerdown, key or input in the field. The probe is back to "a tip does not open over a focused field the person touched", with no `fill("c")`, and a second case: untouched, the field the sheet focused itself holds nothing back (the add tips belong there). | `components/add/add-screen.tsx`, `tests/probes/polish_1020.py` |
| 15 | **Landmark.** The `<main>` of Hôm nay is back to wrapping the hero and the list; the header (`<header>`) is outside it. The alignment bucket is fixed in the check, not in the page: the `home-page` group is scoped to its `data-align-container` like a "-header" group. `h1` (screen reader only) on the setup skeleton (from 1024 px; the phone's header has it) and on `GateSkeleton`. Smoke asserts the add sheet over Hôm nay: one `<main>` in the document, and one `h1` outside the inert screen (the sheet's own). | `components/home/home-screen.tsx`, `tests/alignment.py`, `tests/probes/smoke.py` |
| 16 | "Xem thêm Rau củ (12 món)": the category is in the label; focus goes to the first row it brought in. | `components/foods/food-list.tsx` |
| 17 | The portion sheet gives focus back to the real opener (the control pressed before the click: a row behind Xem thêm, a carousel card or its chevron), else to the row by id; after a touch it never focuses the search input (the Android keyboard). | `components/add/add-screen.tsx` |
| 18 | **Meal header hit area: 28 px, not 44 — see For Hao.** The ±10 px pseudo-element reached into the rows above and below. The pill is 24 px and the rows sit against it, so the only free room is the 4 px of paper above it; the hit area now takes that and no row pixel. **+ Thêm keeps its 44 px** (`cc_42_onboarding.py` asserts it) and the same reach into the first row, which the review did not ask about. The probe checks, for the first and the second meal, that the rows' own edge pixels still hit the rows and the paper above the header still hits the header. | `components/home/food-list.tsx` |
| 19 | The 64 px reserve animates (`@property --update-bar-h` as a length, a transition on `:root` over `--m-row`; none under reduced motion), so no row jumps under a finger; the toast stays **10 s** (it was 5). | `app/globals.css`, `lib/update-phase.ts` |
| 20 | `polish_1020.py` asserts the measured numbers with a small margin: rows ≤ 40 (34), Tab stops ≤ 125 (112), nodes ≤ 540 (488); the live-sized unit test ≤ 120 stops (110) and < 550 nodes (501). | `tests/probes/polish_1020.py`, `components/foods/__tests__/food-list.test.tsx` |

## The add toast (`prompts/toast-undo.md`)

| Bug | What | Where |
|---|---|---|
| 1 | **Every add offers Hoàn tác.** A portion-sheet add was the only one left with "Xem". `addFoodEntry` now always makes the undoable toast (8 s); adds into the same meal while it is up update it in place ("Đã thêm 2 món vào …") and its `undoIds` grow, so Hoàn tác takes out all of them; a tray add of N, a recent, a Bữa ăn của tôi, Chỉ ghi kcal and a copy already did. There is still one undo path (`undoCopy`, through the outbox like a delete); the pure part is `lib/add-toast.ts` (unit tests: tray of 3, grouped toast, expired = no-op, another meal, another kind). "Đã lưu vào Món của tôi" keeps Xem → /explore. Probe `toast_undo.py`: a tray of 2 → Hoàn tác → both rows gone, kcal back; a portion add and a second one → one grouped toast → both gone, the rows that were there stay. | `lib/add-toast.ts`, `lib/diary-store.tsx`, `components/diary-toast.tsx` |
| 2 | **A tap no longer freezes the countdown.** Focus pauses the clock only when it is `:focus-visible` (the keyboard's), and resumes on blur; the pointer pause stays press-only. Every action (Hoàn tác, Xem, Thử lại, Xem lý do) ends its toast at once (`onDismiss`). The probe: a tap on the toast body, the bar keeps moving; Tab to the action, it stops; focus leaves, it runs again. | `components/ui/toast.tsx` |

## Gates

```
gate:full: 656 s wall clock   (fix/polish-1020 head 66b6c91, port 3126)
  typecheck       ok      0 s
  vitest          ok      6 s   (166 files, 2097 tests, 1 skipped)
  build:demo      ok      7 s
  test:align      ok     73 s
  test:hydration  ok    109 s
  probe:all       ok    642 s   probe:all: 113 PASS, 4 REPORT, 0 QUAR, 0 FAIL, 1 SKIP
gate:full: all green
```
- The first gate:full run failed `test:align` (`/app` at 1440, group `home-page`: "no pairs compared"). The alignment check buckets a group by its nearest `section` / `main`; the `<main>` I had put around Hôm nay's body left the h1 row outside it. The `<main>` now wraps the header too (66b6c91); the second run is the green one above.
- `cc_42_onboarding.py` and `polish_1020.py` needed the new interruption rules: a tip may come over the add sheet's own empty search field, not over one someone typed in.
- By hand, outside the gate: `_polish_update_check.py` (the update toast: appears once idle, above the nav, gone after 5 s, applied on background; it edits `public/sw.js` for a few seconds and restores it) passes.
- `apps/api` is untouched. No migration, no deploy.
- New: `tests/probes/polish_1020.py` (in the gate), unit tests for the interruption order, the update phase, the add list limits (including the live-sized one) and the nutrient label.

### After the review fixes and the toast (head of the branch, port 3126)

```
gate:full: 696 s wall clock
  typecheck       ok      1 s
  vitest          ok      9 s   (169 files, 2121 tests, 1 skipped)
  build:demo      ok      9 s
  test:align      ok     78 s
  test:hydration  ok    112 s
  probe:all       ok    677 s   probe:all: 115 PASS, 4 REPORT, 0 QUAR, 0 FAIL, 1 SKIP
gate:full: all green
```
- The first run on this round failed `cc_42_onboarding.py`: it asserts a 44 px hit area on + Thêm, which my header change had narrowed too. + Thêm is back as it was (the header's 28 px is the only change; see For Hao 5). Smoke needed two fixes of its own checks (the install pop-up stood over the + in the new sheet check; the sheet's own heading is a second h1 in the document, so the check counts the h1 outside the inert screen).
- By hand, outside the gate: `_polish_update_check.py` (the update toast, the tray / typed form not lost, the second tab) passes; `public/sw.js` is the committed version bump only.
- New probes: `toast_undo.py`, and in `polish_1020.py` the slow start (network and CPU throttled), the touched-field tip, Xem thêm focus, the portion sheet's focus return (row, row behind Xem thêm, carousel chevron), the header and row hit test, measured thresholds. New unit tests: `unsaved-work`, `add-toast`, `interruption` (the report gating), `releases`.
- Not done: a header hit area of 44 px (28, see above); the unsaved-work detector is a heuristic (see For Hao 9); the new probes were each run on the fixed build only, except where the old failure was seen (the first `toast_undo` run was against the fixed build; I did not run it against the old toast).

## For Hao

1. **"Mid-sheet" read as "a sheet that is moving".** A tip waits (and tries again 400 ms later) while a sheet is moving or a field someone typed in has focus; it may come over the add sheet's own empty search field, because the add tips belong there. If you meant "any sheet open", it is one condition in `interruptionBlockedByUi` (`lib/interruption.ts`).
2. **After Có gì mới, a tip waits for the next app open** (one interruption per open, as asked). The first-run tour still blocks everything, as before.
3. **The update bar reserves 64 px** (`--update-bar-h`) while it shows, and select mode on Hôm nay covers it (the select bar has the same place). Say if select mode should push it up instead.
4. **5 per category / 30 for a search is my number**, with "Xem thêm (n món)" (it used to read "Xem thêm"). Tell me if you want a different count; it is `ADD_LIST_LIMITS`.
5. **The meal header's hit area is 28 px, not 44.** The ±10 px extension stole the top 10 px of the row below and 6 px of the row above; the pill is 24 px and the rows are against it, so only the 4 px of paper above is free. 44 px without touching a row needs 16 px more height in the header row (the look changes: the list moves down 16 px per meal). Say if you want that; otherwise it stays 28.
6. **Time to open /add at the live catalogue size was not measured in a browser** (the demo build has 43 foods; the 683-food numbers are server-rendered counts in a unit test). Worth a look on the real build.
7. **The hand-run update check changes `public/sw.js` for a few seconds** (`_sw_update.py`, `_polish_update_check.py`; not in any gate, because Playwright cannot route the browser's own sw.js fetch). It restores the file.
8. **Release id and the AGENTS.md rule.** AGENTS.md says a fix extends the top release instead of a new id; you asked for one entry for #32 and #33, so it is a new id (2026-10-21c), without a tour (nothing a newcomer cannot guess). Pick the id and the `sw.js` version again on origin/main right before merging.
9. **"Unsaved work" is detected, not wired.** Besides the add sheet's own marks, any trusted edit of a text, number, date, textarea or select field (not a search box) counts until its form is submitted or the page changes. A settings screen that saves without a `<form>` submit (on blur) keeps the update waiting until you leave the screen; it never loses anything, it can only wait. `data-no-unsaved` on a field opts it out.
10. **The update toast stays 10 s** (it was 5; the reserve now animates). The ui-ux-pro-max rule says 3–5 s for a toast; this one carries a decision (Tải lại) and the reserve is the same size.
