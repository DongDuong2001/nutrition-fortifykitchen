# feat/rename-labels: clearer names, a 4 s add toast, the full "Chép ngày ăn mẫu", and release 2026-10-22a

Front end only (apps/web). **Stacks on `feat/v3-cleanup` (#48)**, which stacks on `feat/ngay-mau` (#47 → #46 → #45 → #44); `feat/v3-cleanup` is merged into this branch (including its ChipScroller fix). Retarget as the stack merges. No route path, storage key, category key or API field changes (`cua_toi`, `/explore/meals`, `/explore/ngay-mau`, the `h1t_*` keys are as they were). Commits by Vu Thien Minh Hao.

## What changed in the second review round
1. **Save-meal wording** ("lưu" twice read badly): the meal ⋯ menu item is **Lưu bữa này** (was "Lưu vào Bữa ăn đã lưu"); the toast **Đã lưu <tên> · N món**; the empty state of Bữa ăn đã lưu **Mở ⋯ ở một bữa trên Hôm nay và chọn Lưu bữa này.** The probes that used the old text follow (`cc2_10`, `cc2_12`, `cc2_19b`, `cc_22`). No tip or tour step named it.
2. **The pill, in full.** The card of an empty day no longer squeezes the pill beside its ×. It now shows its own line ("Chưa có món nào hôm nay", no longer screen-reader only) with the 44 px **×** at the top right, and under it the copy button in a **row of its own: full width, 44 px tall, one line**. The label is the full **Chép ngày ăn mẫu** (the pill, its tip and its tour step). The small glyph before the label steps aside when the row is narrow (a container query: it is hidden at 360 px, shown at 390). Measured by `rename_labels.py`: the row is 132 px wide in a 148 px card at 360 and 162 px in 178 px at 390, one line, inside the card, not cut off. At 150 % text the label (about 170 px) is wider than any card of the phone, so it wraps to a second line inside a taller pill and is never cut off; it cannot be one line there. `docs/screenshots/rename-labels/pill-{360,390,360-text150}.png`.
3. **Every add toast is 4 s**: a single add, a tray add, a copy (a meal, yesterday, a selection), adding a saved meal, applying a Ngày ăn mẫu and Chỉ ghi kcal all use `ADD_TOAST_MS` = 4000. Only a delete's Hoàn tác keeps `UNDO_TOAST_MS` = 8000 with its text "Hoàn tác trong 8 giây"; so does the Chuyển bữa move toast, which parks a delete's toast under it (a move is not an add). In-place update of consecutive adds into the same meal, restarting the timer, pause on touch and swipe to dismiss are unchanged (`toast_undo.py`, `toast-pause.test.ts`, `toast-swipe.test.ts`). `lib/__tests__/add-toast.test.ts` asserts `ADD_TOAST_MS` is 4000 and reads `diary-store.tsx`: every undoable toast is `ADD_TOAST_MS`, every delete toast `UNDO_TOAST_MS` = 8000. `toast_undo.py` reads the countdown bar: a tray add and a portion add last 4 s, a delete 8 s. (An earlier line of this note said the test "asserts 5000": it asserts 4000.)
4. **Release id.** 2026-10-21c is live on main, so every item and tour step this stack added moved out of it into a new entry **2026-10-22a** at the top: Giao diện mới, Nút + ở từng bữa, Nhóm món có biểu tượng màu, Mẹo không làm phiền, So sánh món ngay khi đang thêm, Ngày ăn mẫu, Đổi tên cho dễ hiểu, and six tour steps (a meal's +, Ngày tập, Nhóm món có màu, So sánh món, ⋯ của ngày, Chép ngày ăn mẫu). **2026-10-21c is back to exactly origin/main's text**: its 8 items and its 2 tour steps (`git diff origin/main -- lib/releases.ts` shows only added lines). There were no full-label or fibre items in the stack. 22a's tour has 6 steps (AGENTS says 2–5; it is the six that were already in the stack's tour). `releases.test.ts`, `cc_46.py` and `cc_tutorials.py` follow (the newest release, the 12 history groups, the joined tour of 8 = 21c's two + 22a's six, the skipped-step cases). **sw.js VERSION is `2026-10-22.1`**: the stack already bumped it from main's `2026-10-21.8` (commit cec5649), which is the next value for release 22a; nothing further to bump.
5. This note: the stale line is fixed and the above is listed.

## A. Three names (first round, unchanged)
| Was | Is | Where |
|---|---|---|
| Món của tôi | **Món ăn của tôi** | `food-categories.ts` label (so the `/explore/cua_toi` header, the add-sheet chip and the category lists follow), Khám phá › Của bạn row, the recipe page's heading and its line "Món ăn của tôi · N phần · N nguyên liệu" |
| Tùy chỉnh thành món của tôi | **Tùy chỉnh món này** | the button on a recipe dish |
| Bữa ăn của tôi | **Bữa ăn đã lưu** | Của bạn row, the `/explore/meals` header (subtitle **Thêm lại cả bữa bằng một chạm**), the add sheet's carousel, the empty state, the manage sheet |
| Ngày mẫu / ngày mẫu | **Ngày ăn mẫu / ngày ăn mẫu** | the picker ("Chọn ngày ăn mẫu"), the list, the editor, the hide-pill label, the tip, and now "Chép ngày ăn mẫu" |

Found by grep over all of `apps/web` and docs; the text of past release entries is untouched ("Món của tôi được lưu", 2026-10-18c). The recipe line is 13 px: at 15 px the longer text wrapped to two lines between the Back and the heart at 390.

### No label cut off or wrapping at 360 px and at 150 % text (`rename_labels.py`)
- **Của bạn**: every label is one line at 100 % text and never cut off; at 150 % the count wraps under the name (two lines, nothing cut off).
- Headers (`/explore/cua_toi`, `/explore/meals` with its subtitle, `/explore/ngay-mau`), "Tùy chỉnh món này" and the recipe line: one line, not cut off, none of the old names on the page.
- The pill: see 2 above.
Screenshots in `docs/screenshots/rename-labels/`: `cua-ban-{360,360-text150,390}.png`, `food-page-{360,360-text150}.png`, `recipe-page-360.png`, `pill-{360,390,360-text150}.png`; the full set is in `apps/web/.screenshots/v3-rename/` (gitignored).

## Gates
- gate:fast after each commit: green.
- **gate:full on the final state: all green, 1408 s** (the machine was busy; the gates ran longer than usual). typecheck, lint:design, vitest (all unit tests), build:demo, test:align, test:hydration, probe:all (135 PASS, 4 REPORT, 1 QUAR = design-floor-landing.py, 0 FAIL, 1 SKIP), check:live-bundle.
