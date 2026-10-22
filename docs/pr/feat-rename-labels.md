# feat/rename-labels: clearer names, and a shorter add toast

Front end only (apps/web). **Stacks on `feat/v3-cleanup` (#48)**, which stacks on `feat/ngay-mau` (#47 → #46 → #45 → #44). Retarget as the stack merges. No route path, storage key, category key or API field changes (`cua_toi`, `/explore/meals`, `/explore/ngay-mau`, the `h1t_*` keys are as they were). No behaviour change beyond the toast time. Commits by Vu Thien Minh Hao.

## A. Three names
| Was | Is | Where |
|---|---|---|
| Món của tôi | **Món ăn của tôi** | `food-categories.ts` label (so the `/explore/cua_toi` header, the add-sheet chip and the category lists follow), Khám phá › Của bạn row, the recipe page's heading and its line "Món ăn của tôi · N phần · N nguyên liệu" |
| Tùy chỉnh thành món của tôi | **Tùy chỉnh món này** | the button on a recipe dish |
| Bữa ăn của tôi | **Bữa ăn đã lưu** | Của bạn row, the `/explore/meals` header (subtitle now **Thêm lại cả bữa bằng một chạm**), the add sheet's carousel, the empty state, the manage sheet ("Xóa Bữa ăn đã lưu", "Bữa ăn đã lưu này (N món) sẽ bị xóa") |
| Ngày mẫu / ngày mẫu | **Ngày ăn mẫu / ngày ăn mẫu** | the picker ("Chọn ngày ăn mẫu", its radio group), the list ("Chưa có ngày ăn mẫu", "+ Tạo ngày ăn mẫu"), the editor, the hide-pill label ("Ẩn gợi ý ngày ăn mẫu hôm nay"), the tip |

Found by grep over all of `apps/web` (components, app routes, lib, hooks, releases, tips, tour, "Có gì mới", probes, unit tests) and docs: 29 source files, 7 unit-test files and 15 probes changed (comments included, so a grep for the old names is clean in source). Past docs (`docs/`, `design/`) are history and are left alone, and so is the text of the past release entries: "Món của tôi được lưu" (2026-10-18c) is untouched and its test still expects it.

Two judgement calls (both in OPEN_QUESTIONS):
- **"Chép ngày mẫu" stays.** "Chép ngày ăn mẫu" does not fit the pill: the card is 148 px at 360 and 178 px at 390 and the button beside its × is 100 and 130 px, so the longer label wrapped to two lines and was cut off. As the brief says, the pill, its tip and its tour step keep "Chép ngày mẫu". (That old label already wraps to two lines in the same pill and is cut off at 360; the card's layout is a separate question.)
- **"Lưu thành Bữa ăn của tôi" is now "Lưu vào Bữa ăn đã lưu"** ("Lưu thành Bữa ăn đã lưu" reads wrongly); the hint in the empty state and the toast "Đã lưu <tên> vào Bữa ăn đã lưu · N món" follow it.
- The recipe line is 13 px now: at 15 px the longer "Món ăn của tôi · 1 phần · 2 nguyên liệu" wrapped to two lines between the Back and the heart at 390.

**Release.** One item in the open entry (2026-10-21c, not live yet): *Đổi tên cho dễ hiểu — Món ăn của tôi, Bữa ăn đã lưu, Ngày ăn mẫu.* (title and body, because an item holds no colon). The same entry's Ngày ăn mẫu body already said "Chép ngày mẫu" and stays so. No new release id; no past entry rewritten. Tour steps and tips that name a label were checked: they name "Chép ngày mẫu" and "Lưu ngày này thành mẫu", both unchanged.

**Tests and probes updated** for the new names: `lib/__tests__` (food-categories, releases, tips, recipe, dish-edit, recipe-dishes, catalog-chunks) and 15 probes (`cc2_10`, `cc2_11`, `cc2_12`, `cc2_15b`, `cc2_19b`, `cc2_22`, `cc2_23`, `cc2_32`, `cc_22`, `cc_27b`, `cc_42_onboarding`, `cc_46`, `cc_52_training`, `cc_tutorials`, `ngay_mau`). New probe `rename_labels.py` (below).

### No label cut off or wrapping at 360 px and at 150 % text (`rename_labels.py`)
At 360, at 360 with the root text at 150 % and at 390:
- **Của bạn**: Yêu thích, Bữa ăn đã lưu · N bữa, Món ăn của tôi · N món and Ngày ăn mẫu · N mẫu are each **one line at 100 % and never cut off**. At **150 % text** the count wraps under the name ("Bữa ăn đã lưu · 0 / bữa"): two lines, nothing cut off, as the layout rule for names allows.
- Headers: `/explore/cua_toi` "Món ăn của tôi", `/explore/meals` "Bữa ăn đã lưu" with its new subtitle, `/explore/ngay-mau` "Ngày ăn mẫu": one h1, not cut off, none of the old names on the page.
- The button "Tùy chỉnh món này" and the recipe line are one line and not cut off at 100 %.
- The pill: reported in the probe (see above), not asserted.
Screenshots (`apps/web/.screenshots/v3-rename/`, gitignored): `cua-ban-{360,360-text150,390}.png` (the Của bạn card), `food-page-*.png` (the recipe dish with "Tùy chỉnh món này"), `recipe-page-*.png` (the page of the recipe it makes), `pill-*.png`.

## B. The add toast
`lib/add-toast.ts`: `ADD_TOAST_MS` 8000 → **4000**. It is only the toast `addedToast` builds, the add of a portion or a recent. Kept: `UNDO_TOAST_MS` (8 s, the delete undo and its text "Hoàn tác trong 8 giây"), the notice, added and update toasts; consecutive adds into the same meal still update the toast in place and restart its timer; touch pauses it; swipe dismisses it (`toast_undo.py`, `lib/__tests__/toast-pause.test.ts`, `toast-swipe.test.ts` are green; they read the countdown, not 8 s). `add-toast.test.ts` asserts 5000. No probe waited on 8 s.
Flag for review (OPEN_QUESTIONS): the tray add, a copy, a saved meal and a Ngày ăn mẫu also show an "undoable" toast, but they use `UNDO_TOAST_MS` and so stay at 8 s, as the brief says to keep it; a person sees a 4 s toast after one add and an 8 s one after a tray add.

## Gates
gate:fast after each commit: green. gate:full: see the end of this file.
