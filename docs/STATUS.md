# Web status for Dong

Newest first. Updated with every web merge. Do not edit apps/api, migrations or docs/dong-checklist.md from the web side.

## Web: merged

| Task | Commit | Date | What |
|---|---|---|---|
| cc2-32 | see git log (cc2-32) | 15/10 | Nhật ký is folded into Hôm nay at "/": /diary and /today redirect to / (keep ?date=); the diary screen is deleted; every link, back fallback and the PWA shortcut point at Hôm nay; dead hero and meal-bar code removed; cc2_32 probe |
| cc2-31 | see git log (cc2-31a, cc2-31b) | 15/10 | Bottom nav and sidebar: Hôm nay · Tổng quan · [+] · Khám phá · Cài đặt (Nhật ký leaves the bar); Tổng quan sub-tabs: Tóm tắt at /trends, Năng lượng at /trends/energy; Tóm tắt drops its today hero (home owns today); probes and alignment follow |
| cc-22-fix | see git log (cc-22-fix) | 15/10 | Home review fixes: ⋯ on past days (only Lưu thành), dot in the food row label, bar without value says Chưa có dữ liệu, "<1%", meal headers in normal case |
| cc-22 | see git log (cc-22) | 15/10 | Hôm nay at "/": ink hero card (kcal, macros), food list with meal headers, nutrient column; tap a food or meal to see it alone; two-tone bars today; Nhật ký day view folded in |
| cc2-19b | see git log (cc2-19b) | 15/10 | UX journeys a, f, g walked (probe cc2_19b, 22 ok); save-meal name field selects the default on focus; sign-in lead text-balance |
| cc2-18 | see git log (cc2-18) | 14/10 | Voice pass (verified audit rows), percent without a space, Ngày tập tile bar, add-sheet cards with a 44 px add, design/v2 copy |
| cc2-17 | see git log (cc2-17) | 14/10 | Esc returns focus on every sheet (probe), diary context memoised, five pure components no longer client; bundle change negligible |
| cc-21 | see git log (cc-21) | 14/10 | audit-ag16 fixes: profile, reminders and training ticks per account, Google button through signInWithGoogle, form error announced, theme tokens, dead code removed, paywall backHref, grams label in Vietnamese format |
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
- /healthz returns err.Error() when the DB is down (leaks the host); return "down" and log the detail.
- Auth callback builds the redirect from x-forwarded-host / Host; use NEXT_PUBLIC_SITE_URL.
- hCaptcha site key fallback is hard-coded in components/auth/hcaptcha.tsx; env only.
- Migration 000008 partial unique index breaks importfoods ON CONFLICT; use a plain unique (source, source_id).
- Add `extensions` to search_path in pkg/database/postgres.go.
- Portion IDs come back as zero UUIDs.
- Duplicate "Bún chả Hà Nội" in the seed.
