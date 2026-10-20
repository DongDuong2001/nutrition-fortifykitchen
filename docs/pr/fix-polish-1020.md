# fix/polish-1020: one interruption per open, an update that does not get in the way, a lighter add list, and the small accessibility fixes

**Stacked on `feat/fluid-add`: merge that PR first, then this one** (this branch contains its commits; the diff against `main` shows both until the first is in). Open for Hao's review, not merged.

Not in this PR (as asked): desktop max-width, the Tổng quan empty state.

## What changed (the brief's items)

| # | What | Where |
|---|---|---|
| 1 | **One interruption per app open.** Có gì mới > the install pop-up > a first-time tip, and at most one of them opens per page load. Each says whether it has something to show (`setInterruptionDue`) and asks before it opens (`claimInterruption`); a higher-ranked one that is due holds the others back. They no longer wait for each other in loops of their own (a tip used to hold Có gì mới back, and Có gì mới the pop-up). A tip also never opens over a field that has focus or a sheet that is still moving, and tries again 400 ms later. | `lib/interruption.ts`, `components/whats-new/whats-new-host.tsx`, `components/pwa/install-prompt.tsx`, `components/onboarding/onboarding-layer.tsx` |
| 2 | **"Có bản mới".** The toast comes once the page is idle, sits right above the bottom nav and **the screens leave room for it** (`--update-bar-h`: the tab frame's padding, Hôm nay's list height, the diary toast's place), so it never covers a row; it goes after 5 s. The update is applied when the app goes to the background (a reload nobody sees) or by the next cold open, never while writes wait (cc-68); Tải lại still applies it at once. | `components/pwa/update-offer.tsx`, `lib/update-phase.ts`, `lib/update-bar.ts` |
| 3 | **The /add list draws a few rows of each category** (5 of each, 30 for a search) with "Xem thêm (n món)"; the rest of the list's rows are not in the DOM. | `components/foods/food-list.tsx` (`ADD_LIST_LIMITS`), `add-screen.tsx` |
| 4 | **Portion sheet:** a visible ✕ (44 px, "Đóng"), Esc closes it (the Sheet already did; now checked), focus goes back to the row that opened it (`data-food-id`), not to the search field (which raised the keyboard). | `components/ui/portion-panel.tsx`, `add-screen.tsx` |
| 5 | **Hit areas:** the meal header gets a 44 px hit area by `::before` (+ Thêm had one already); the look does not change. | `components/home/food-list.tsx` |
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

- /add: [390](../screenshots/polish-1020/add-390.png) · [1440](../screenshots/polish-1020/add-1440.png) (5 rows of each category, "Xem thêm (n món)")
- Portion sheet with the ✕: [390](../screenshots/polish-1020/portion-390.png) · [1440](../screenshots/polish-1020/portion-1440.png)
- Hôm nay with "Có bản mới" above the bottom nav and room left for it: [390](../screenshots/polish-1020/home-update-390.png) · [1440](../screenshots/polish-1020/home-update-1440.png)

## Gates

```
gate:full: 656 s wall clock   (fix/polish-1020 head 66b6c91, port 3126)
  typecheck       ok      0 s
  vitest          ok      6 s
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

## For Hao

1. **"Mid-sheet" read as "a sheet that is moving".** A tip waits (and tries again 400 ms later) while a sheet is moving or a field someone typed in has focus; it may come over the add sheet's own empty search field, because the add tips belong there. If you meant "any sheet open", it is one condition in `interruptionBlockedByUi` (`lib/interruption.ts`).
2. **After Có gì mới, a tip waits for the next app open** (one interruption per open, as asked). The first-run tour still blocks everything, as before.
3. **The update bar reserves 64 px** (`--update-bar-h`) while it shows, and select mode on Hôm nay covers it (the select bar has the same place). Say if select mode should push it up instead.
4. **5 per category / 30 for a search is my number**, with "Xem thêm (n món)" (it used to read "Xem thêm"). Tell me if you want a different count; it is `ADD_LIST_LIMITS`.
5. **The meal header's 44 px hit area is clipped at the scroller edge for the first meal** (its top edge is the top of the scrolling area); the probe checks the second meal. The look is unchanged.
6. **Time to open /add at the live catalogue size was not measured in a browser** (the demo build has 43 foods; the 683-food numbers are server-rendered counts in a unit test). Worth a look on the real build.
7. **The hand-run update check changes `public/sw.js` for a few seconds** (`_sw_update.py`, `_polish_update_check.py`; not in any gate, because Playwright cannot route the browser's own sw.js fetch). It restores the file.

