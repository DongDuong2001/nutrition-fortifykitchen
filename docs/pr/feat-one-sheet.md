# feat/ui-cc-one-sheet: one sheet in the + flow (overnight 22→23/10, PR 1)

From the Chrome audit of main f13f64c, demo build.

**The problem**
- Tapping a food in the + sheet opened a second dialog (the portion sheet) on top of it.
- The back sheet stepped back to 0.97, so it looked wider than the front one, and Hôm nay showed above both.
- Measured on main at 390: two `[role=dialog]`, 363 and 374 px wide.

## What changed
**The portion is a step inside the + sheet** (`components/ui/sheet-view.tsx`, `components/add/add-screen.tsx`):
- It slides in from the right with the tab-glide tokens (`.m-tab-in`: 12 px, 200 ms, `--ease-out`) and leaves the same way in `--m-switch-out`. Under reduced motion it cross-fades.
- **Header:** ‹ (Quay lại) on the leading side, "Khẩu phần", and ✕ on the trailing side (D-SHT-05 for a later step: Back leading, no Done).
- The list stays mounted under the step (inert while it is covered). Back restores the search text, the scroll and the Khay as they were. The sheet keeps its place and height.
- ✕ and a drag down on the step's header close the whole sheet.
- ‹, Esc and the phone's Back go back one step. Each step has a history entry: `useSheetEntry`, the hook Sheet used inline, is now shared.
- Every path into the portion opens this step:
  - a list row or a search result;
  - a row under the Minh Hào chip;
  - a Gần đây or Hay ăn chevron;
  - a similar food in the empty state.

**So sánh** is a step over the portion (Chọn món để so sánh):
- The picker's body is `ComparePickerBody pushed`: the list fills the step, and there is no Hủy beside its ‹ (never Cancel, Done and Back together).
- ‹ goes back to the portion of the same food.
- **The So sánh return:** confirming opens the comparison. Back from it brings the + sheet back as So sánh left it: the portion step of that food, the search, the filter, the Khay and the list's place.
  - This is a one-shot sessionStorage note (`h1t_add_return_v1`), read only when the screen came from `/foods/compare` and Back landed on the entry the step had (`adoptSheetEntry`).
  - Back again goes to the list, and once more closes the sheet. On main, Back from the comparison found a fresh + sheet, and the next Back did nothing (a dead history entry).

**Unchanged**
- The desktop dialog (≥ 1024) keeps its two panes and its picker dialog.
- A portion sheet opened on its own (food page, Hôm nay row, Ngày tập) is still one sheet.

**Title:** when the food has a Sống | Chín switch, the portion shows the name without the state ("CƠM TRẮNG", not "CƠM TRẮNG (CHÍN)"; "Thịt bò thăn", not "Thịt bò thăn (chín)").
- `switchName` (lib/food-twins) drops only the plain states the switch says: sống, nấu chín, chín, luộc, hấp, hạt khô.
- A cooking word that changes the food (nướng, chiên …) stays, and so does a variety in brackets.

**Removed**
- The stacked portion `<Sheet>` of /add.
- PortionPanel's own close header (the step has the header now).
- The `data-under-sheet` rules in globals.css (nothing uses them now).

## Motion cost (4× CPU)
From `tests/probes/_one_sheet_measure.py`, 390 × 844, demo build, median of 5 runs. Both servers ran the same build type at the same time of night.

| move | build | first frame (ms) | longest frame (ms) | frames > 25 ms | frames > 33 ms |
|---|---|---|---|---|---|
| open 1× | main | 68 | 17 | 0 | 0 |
| open 1× | this branch | 67 | 17 | 0 | 0 |
| back 1× | main | 58 | 17 | 0 | 0 |
| back 1× | this branch | 58 | 17 | 0 | 0 |
| open 4× | main | 67 | 33 | 1 | 1 |
| open 4× | this branch | 67 | 33 | 1 | 1 |
| back 4× | main | 65 | 17 | 0 | 0 |
| back 4× | this branch | 75 | 17 | 0 | 0 |

The step costs what the second sheet cost. The one long frame at 4× on open is the portion panel's first render, on both.

## Probes
`tests/probes/one_sheet_add.py`, new; all green. It checks:
- **390 and 360:** one dialog in every frame from + to Thêm. Back keeps the search, scroll and Khay. The Minh Hào chip and Gần đây open the step.
- **Back, ✕ and drag:** Back from the step goes to the list; ✕ and a drag down close the sheet, and Back from Hôm nay does not bring it back.
- **So sánh:** the step, ‹ back to the portion, and the return from the comparison.
- **The rest:** the title, reduced motion (no transform), and 1024 (food, another food, add: one dialog).

Updated to find the portion as the step: cc_53_units, cc_73b, cc2_12, polish_1020. cc_46 and cc_tutorials know release 22c.

## Release
2026-10-22c: "Khẩu phần mở ngay trong bảng". `sw.js` VERSION 2026-10-22.3.
- No tour and no tip: the ‹ is a labelled Back in plain sight, and it is not on Hôm nay.
- PR 3 (units and counts) adds its items to the same 22c entry; whichever merges second keeps both.

## Design floor
- D-SHT-01: one sheet at a time. Closer than before: only the desktop picker is still a dialog over the add dialog.
- D-SHT-03: swipe down plus a visible ✕, Esc on desktop.
- D-SHT-05: Back leading, Close trailing, no Done in a later step.
- 44 px targets (‹ ✕), focus moves into the step (its ‹), and back to the row that opened it.

## Judgment calls
- **So sánh is a step too, not only the portion:** with the portion inside the sheet, a picker sheet over it would have been the second dialog again.
- **The desktop picker stays a dialog over the add dialog** (two panes, no room problem). Say if it should become the right pane's step.
- **Screenshots** (390, 360 and 360 at 150 % text): `apps/web/.screenshots/audit-1023/{portion,compare,back}-*.png` via `_audit_shots.py`.
