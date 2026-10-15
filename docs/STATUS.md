# Web status for Dong

Newest first. Updated with every web merge. Do not edit apps/api, migrations or docs/dong-checklist.md from the web side.

## Web: merged

| Task | Commit | Date | What |
|---|---|---|---|
| cc-24 | see git log (cc-24) | 15/10 | Dong's new screens follow the UI rules (presentation only): leaderboard rows show only name and score, coaches, admin review, privacy, terms, global error page and the coach application sheet use tokens, 44 px targets, shared primitives and real alignment pairs; icon wrapper decorative unless labelled; coach profile and legal pages back via lib/nav; cc_24 probe |
| cc-23 | see git log (cc-23) | 15/10 | Compare foods, 2 or 3 side by side at /foods/compare?ids=: 100 g or serving basis, macros then Vitamin then Khoáng chất, highest known value marked (no mark on ties or a lone value), unknown "—"; entries: So sánh on /foods/[id] (picker sheet) and the So sánh mode of /add; /admin/review keeps Cài đặt active; lib/food-compare + tests, cc_23 probe |
| cc2-32 | see git log (cc2-32) | 15/10 | Nhật ký is folded into Hôm nay at "/": /diary and /today redirect to / (keep ?date=); the diary screen is deleted; every link, back fallback (a past day keeps ?date=) and the PWA shortcut point at Hôm nay; cache version 2026-10-15.2; a food logged in ml keeps its portion on Hôm nay; an emptied sample day has no negative amounts (nothing below 0, no source = dash); Về hôm nay on past days (phone); Khám phá: banner line wraps, coaches heading in normal case; shared probes walk /; cc2_32 probe |
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

## Open for Dong (Resolved / Status)

- [x] auth-actions live code is behind NEXT_PUBLIC_API_MODE: confirmed, all functions in `lib/auth-actions.ts` check `isLiveMode()` and route to Supabase Auth when live.
- [x] /healthz returns err.Error() when the DB is down: fixed in `apps/api/cmd/server/main.go`, removed error string from HTTP response envelope and logged internally via Zerolog.
- [x] Auth callback builds redirect from Host header: fixed in `apps/web/app/auth/callback/route.ts` using `process.env.NEXT_PUBLIC_SITE_URL` fallback to `origin`.
- [x] hCaptcha site key fallback hard-coded in components/auth/hcaptcha.tsx: fixed, hard-coded fallback removed, returns null if unconfigured.
- [x] Migration 000008 partial unique index breaks importfoods ON CONFLICT: resolved via sequential migration `migrations/000009_foods_plain_unique_index.up.sql` replacing partial index with plain unique index without modifying historical migration 000008.
- [x] Add extensions to search_path in pkg/database/postgres.go: fixed, search_path set to `"nutrition, public, extensions"`.
- [x] Portion IDs come back as zero UUIDs: fixed in `apps/api/internal/nutrition/repository.go` and `service.go`.
- [x] Duplicate "Bún chả Hà Nội" in seed: fixed, duplicate removed from `data/seed_foods.json`.
- [x] The 12 drinks tip_vi advice text: fixed in `data/seed_foods.json`, advice removed in favor of pure factual ingredient descriptions.
- [x] Macro label parity: unified "Chất béo" across `apps/web/lib/period.ts`, `apps/api/internal/trends/trends.go`, and `packages/vectors/period.json`.
- [x] Profile display_name validation: enforced 40-character maximum and whitespace trimming in `apps/api/internal/profile/service.go`.
- [x] (cc-24) /admin/review authorization & coach application endpoints: Migration 000010 added role to nutrition.profiles and coach_applications table with RLS; RequireRole and RequireAdmin middlewares active in Go API; coaching package implemented in apps/api/internal/coaching with POST /coaches/apply, GET /coaches/my-application, and admin review routes.
- Note: `cmd/importfoods` supports batch import for >= 1.000 foods; `data/seed_foods.json` contains the verified 44 foundational foods for tests and dev DB.
- [x] (cc-26) Share image of Hôm nay: day-summary card as a 1080×1920 PNG, shared from a sheet behind the share icon in the Hôm nay header (any day; disabled with a visible reason when the day is empty). Drawn client side on a canvas, no dependency, works offline.
