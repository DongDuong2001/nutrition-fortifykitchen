# Web status for Dong

Newest first. Updated with every web merge. Do not edit apps/api, migrations or docs/dong-checklist.md from the web side.

## Web: merged

| Task | Commit | Date | What |
|---|---|---|---|
| cc2-17 | see git log (cc2-17) | 14/10 | Esc returns focus on every sheet (probe), diary context memoised, five pure components no longer client; bundle change negligible |
| cc2-24 | see git log (cc2-24) | 14/10 | One period control on all four Tổng quan tabs; one days-met rule (finished days only, "3/6 ngày đạt"); this file |
| cc2-16 | fa7bead | 14/10 | Midnight rollover (entries of earlier days filed by date), long names, unknown nutrients as "—", offline notice asserted |
| cc2-23 | e61bcb2 | 14/10 | Khám phá carousels, Cài đặt profile card and groups |
| i-2a | ed4102c | 14/10 | NEXT_PUBLIC_API_MODE switch for sign-in (default mock, live opt-in) |
| cc2-22 | 2437ab2 | 14/10 | Nhật ký tiles and meal cards, tall add sheet, 56 px rows, Đồ uống, Tạo món mới |
| cc2-21 | e825541 | 14/10 | Tổng quan Năng lượng, Vi chất, Cơ thể in the Tóm tắt system |
| cc2-20 | 17da4da | 13/10 | Tổng quan Tóm tắt, direction B |

## Web needs from backend

All from docs/dong-checklist.md §6 (data the new Tổng quan screens need):
- cc2-20 Tóm tắt: per-day series (kcal, đạm, weight) for 7 and 30 days; per-meal kcal today; 22-nutrient levels per period.
- cc2-21 Năng lượng: fat, carbs and fibre per day; training-day flag per day (training vs rest averages).
- cc2-21 Vi chất: top foods per nutrient for the period (which logged foods gave the most).
- cc2-21 Cơ thể: weigh-ins with dates, targets before and after a weight change.
- cc2-16: entries carry their own date (the web files earlier days by `addedAt`); the API should return the entry date.

## Open for Dong

- auth-actions live code is not behind NEXT_PUBLIC_API_MODE (web side switched in i-2a; confirm the live path).
- Food import has 44 foods, not ≥ 1.000, but the checklist box is ticked.
- The 12 drinks have made-up source_ids ("drink-nuoc-mia") and tip_vi advice text, which breaks the sourced-data and facts-only rules.
- feat/api was merged into feat/ui with a merge commit instead of a rebase + ff.
