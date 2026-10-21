# feat/ngay-mau: Ngày ăn mẫu (template days), Part A

Job 4 of the 22/10 overnight run (added by review-0205; brief: prompts/overnight-1022-job4-ngay-mau.md). Stacked on feat/compare-in-add, which is stacked on feat/v3-redesign: merge #45, then the compare PR, then this one. Front end only; the templates are device-only data, like saved meals and the macro split.

## What it does
- **Save a day** (NMSave): Hôm nay's ⋯ › "Lưu ngày này thành mẫu" opens a sheet with:
  - "N món · X kcal";
  - the name (Ngày tập on a training day);
  - the Ngày tập | Ngày nghỉ | Khác segmented control;
  - Lưu mẫu, then a toast.

  Empty meals are left out. The item is offered on any day that has food.
- **List** (NMList): Khám phá › Của bạn › "Ngày ăn mẫu · N mẫu" (indigo calendar tile) opens /explore/ngay-mau. Each card shows the tag, the count, the kcal and a level bar against today's target. "+ Tạo ngày mẫu" opens Hôm nay, because a template is made from a day.
- **Editor** (NMEditor, without "Tự áp dụng"): /explore/ngay-mau/[id] covers:
  - the name and the tag;
  - the meals and their foods (remove only: change a template's foods by saving a day again);
  - "Áp dụng cho hôm nay";
  - "Xóa mẫu" last, in red, with a confirm.
- **Apply** (NMEmpty + NMPicker):
  - **The pill:** on an empty day, the "Chép ngày mẫu" pill sits at the top of the meals card. Its × hides it for that day only.
  - **The picker:** "Chọn ngày mẫu" lists "Hôm qua" first (when yesterday has food), then the templates. "Chép vào <ngày>" copies through the existing copy path, with one toast and Hoàn tác (undo removes exactly what was copied).
  - **No templates yet:** the picker shows only Hôm qua and the empty state "Chưa có ngày mẫu. Ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu."
- **Tutorials:**
  - Release 2026-10-21c gains "Ngày ăn mẫu" and two Hôm nay steps: the ⋯ save item (falls back to the hero) and the pill (falls back to the meal pill).
  - A one-time tip on the pill (`day-template`).
  - tutorial-targets is green.

## Code
- `lib/day-templates.ts` and `lib/device-store.ts`, pure and tested first: build, rename, retag, remove a food, delete, parse, a storage round trip, apply (count and kcal from the foods' real values), and the pill's per-date ×.
- `hooks/use-day-templates.ts`, `components/templates/*`, `components/home/{save-day-sheet,template-picker-sheet,meal-dot}`, `app/(app)/explore/ngay-mau/**`.
- `lib/nav` backFallback: Back goes editor → list → Khám phá.

## Decisions for Hao (also in OPEN_QUESTIONS)
- **Hôm qua card:** it copies what the old copy sheet ticked by default (every meal with food but the snack, or the snack alone). The per-meal ticks are no longer reachable from the empty day, and components/copy-yesterday-sheet.tsx stays in the tree, unused. Delete it, or reopen it from the card?
- **Editor:** foods can be removed but not added.
- **Part B** (auto-apply, "Dự kiến"): not built.
- **Dong:** a `day_templates` table so templates sync between devices. Until then they stay on the device.

## New copy (drafts)
- **From the brief:**
  - "Lưu ngày này thành mẫu", "Lưu mẫu", "Tên mẫu", "Nhãn", "Ngày tập | Ngày nghỉ | Khác";
  - "Mẫu nằm trong Khám phá › Của bạn › Ngày ăn mẫu";
  - "Ngày ăn mẫu", "Áp dụng cả ngày bằng một chạm", "Tạo ngày mẫu";
  - "Mẹo: ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu.";
  - "Các bữa", "Tổng", "Đủ để so mục tiêu khi áp dụng";
  - "Áp dụng cho hôm nay", "Xóa mẫu", "Lưu";
  - "Chép ngày mẫu", "Ẩn gợi ý ngày mẫu hôm nay / hôm qua", "Chọn ngày mẫu", "Chép vào <day>", "Hôm qua", "Hôm kia";
  - the picker's empty state;
  - the toast "Đã chép <name> · N món".
- **Added:**
  - "Chép lại cả ngày bằng một chạm";
  - "Đã lưu <name> · N món · X kcal";
  - ". N món chưa có kcal nên chưa chép";
  - "Các món của mẫu này không còn trong danh sách.";
  - "Món không còn", "Bỏ khỏi mẫu", "Mẫu cần ít nhất một món.";
  - "Không tìm thấy ngày mẫu này.", "Về Ngày ăn mẫu";
  - the delete confirm "Xóa <name>?" with "Ngày mẫu này (N món) sẽ bị xóa. Các món đã ghi trong nhật ký không đổi.";
  - "Quay lại Khám phá", "Quay lại Ngày ăn mẫu";
  - the release item, the two tour steps and the tip.

## Gates
- gate:fast after the commits: all green.
- gate:full: see the PR body.
- tests/probes/ngay_mau.py covers save, the list and its count, rename, remove, the empty-day pill, the picker, copy, the entries and kcal, Hoàn tác, Hôm qua, the ×, and delete, at 390 and 1280.

## Screenshots
.screenshots/ngay-mau/NM{Save,SaveToast,List,Editor,Empty,Picker,PickerEmpty,Toast}-{390,1280}.png in the worktree (gitignored). They are compared with design/v3/ngay-mau/renders/NM*.png. The differences:
- the real numbers, and the real Hôm nay behind the sheets;
- the extra Hôm qua card;
- no Part B lines.
