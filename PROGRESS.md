# Progress

## Now working
| Task | Owner | Files / routes |
|---|---|---|
| 13/10/2026 | cc2-15c | Final. Diary in localStorage (entries, sample edits, Gần đây; an old sessionStorage copy moves once, lib/storage-keys.ts), demo mode has its own _demo keys (diary, recents, favourites, saved meals), no profile outside demo goes to /setup/profile from every tab route (components/first-run/setup-gate.tsx), Tổng quan counts today in the 1–2 days line, Bột củ dền is demo-only at the catalogue read (browsableFoods). Probes: cc2_15c.py (54 ok), cc2_15b, hydration, cc2_12 and smoke updated. Gates on :3102: typecheck, test 523, build, test:align, test:hydration, probe:all 31 PASS 0 FAIL, smoke 104 PASS. Edges: unchanged screens, align pass. Claims: lib/diary-store.tsx, lib/storage-keys.ts (new), lib/demo.ts, lib/first-run.ts, lib/mock/** (demo filtering only), lib/recent-foods.ts, hooks/use-food-browse.ts, app/explore/** (catalogue read only), components/first-run/** (new setup gate), components/overview/** (the 1–2 days line), OPEN_QUESTIONS.md, tests/probes/cc2_15c.py and the probes the storage change breaks (hydration, cc2_12, smoke). |
| 13/10/2026 | cc-18b | One sign-in form: /signin and /signup each have one email field, one "hoặc", one primary button, and a quiet "Gửi liên kết … qua email" (magic link, same email). Copy: "liên kết" for "link" on the auth screens (signin, check-email, expired, forgot). OPEN_QUESTIONS: toast question closed; demo-only sample account waits for cc2-15b. Claims: app/signin/**, app/signup/**, components/onboarding/** (sign-in and sign-up forms only, not setup-form.tsx or setup-summary.tsx), components/auth/**, lib/auth-actions.ts + test, tests/probes/cc_18.py, and only the sign-in and sign-up steps of tests/probes/cc2_15.py, ag07.py, cc02-final.py. Final. components/onboarding/email-password-form.tsx replaces password-sign-in-form.tsx and sign-up-password-form.tsx (both removed): one Email, Mật khẩu (show/hide), primary Đăng nhập or Đăng ký, and a quiet "Gửi liên kết đăng nhập qua email" or "… đăng ký qua email" that sends the magic link to the same email and checks only the email. /signin and /signup: one email input, one hoặc, one primary button (cc_18 asserts it). Copy: "liên kết" on signin, check-email, expired and forgot. Gates on prod :3101: typecheck clean, vitest 504, build ok, test:align 46 PASS 0 FAIL, test:hydration exit 0, probe:all 29 PASS, 2 REPORT, 0 FAIL, 1 SKIP (the full run after the last probe edit), smoke PASS. cc_18 86 ok. Open: the mock sample account → demo only waits for cc2-15b (OPEN_QUESTIONS). Claim released. |
| 13/10/2026 | cc2-15b | Final. Empty start for new users, sample data behind demo mode (Hao 13/10). lib/demo.ts (isDemo: NODE_ENV development, localStorage h1t_demo_v1 = 1, ?demo=1 sets and ?demo=0 clears; resolveDemo is pure and tested); the store starts from an empty day, loads the sample day, history, seeded Gần đây and sample weights only in demo mode (lib/mock/history and weight-log return nothing otherwise); a new account has no entries, no history, no seeded Gần đây. Empty states: Nhật ký (one line, + buttons; Chép hôm qua only when yesterday has entries), Tổng quan (Chưa có ngày nào được ghi + Thêm bữa đầu tiên; 1–2 days keep Chưa đủ dữ liệu), Khám phá Gần đây, Yêu thích, Bữa ăn của tôi, Món của tôi; Cơ thể hides Dữ liệu mẫu outside demo. /setup/done lists Năng lượng, Đạm, Chất béo, Tinh bột, Muối (default training minutes) with Row, list fills the card. Probes: tests/probes/_demo.py (one import per probe, also tests/alignment.py), smoke.py has the empty-account pass, cc2_15b.py (112 ok). Gates on :3102: typecheck, test 513, build, test:align, test:hydration, probe:all 30 PASS 0 FAIL, smoke 104 PASS. Edges: setup-targets card rows share one Row grid (list fills the card). |
| 13/10/2026 | cc2-15 | Final. First run (sign-up to first meal). Setup form: autocomplete bday-year, enterKeyHint, Enter moves birth year to weight, inline validation on blur, last step button "Hoàn tất". New /setup/done (components/onboarding/setup-summary.tsx): "Mục tiêu mỗi ngày: 1.950–2.275 kcal · đạm 104–143 g" from lib/targets via the profile, one button "Bắt đầu ghi bữa đầu tiên" to /add?meal=<clock>, text link "Để sau"; "Xem tổng quan" once an entry exists. lib/first-run.ts (tests first, 7): needs-setup, needs-first-meal, ready. Taps before/after: setup 2 phone / 1 desktop (unchanged), first meal after setup 3 (before: land on /, Ghi bữa, food, Thêm = 3, now summary button, food, Thêm = 3, no detour through the overview). Step 4 skipped: ag-13 has no gate numbers (OPEN_QUESTIONS). Probe cc2_15.py 60 checks at 390 and 1280; cc02-final, cc2_07, cc2_unify, smoke, ag04_audit follow /setup/done. Gates on prod :3102: typecheck, vitest 472, build, test:align, test:hydration pass; probe:all 28 PASS, 2 REPORT, 0 FAIL, 1 SKIP; smoke PASS. Edges: no new align group (summary is one card). Screenshots: apps/web/.screenshots/cc2-15-{profile,goal,summary,first-meal}-{390,1280}.png. Claim released. | Done |
| 13/10/2026 | cc-18 | Account and password sign-in (Hao 13/10: name and email on the account screen; email + password sign-in beside Google and the magic link; no avatar, no export). Claims: app/settings/account/** (new), app/signin/**, app/signup/**, app/reset-password/** (new), components/settings/**, components/onboarding/** (sign-in forms only), components/auth/** (new, shared password and email fields), lib/auth-actions.ts (new) + test, lib/profile.ts (displayName only) + test, design/IA-v2.md (Cài đặt and Routes), tests/probes/cc_18.py, the sign-out location in tests/probes/cc09.py, cc2_03.py, cc_16.py, and one route line each in tests/probes/smoke.py and tests/alignment.py. Routes: /settings/account, /settings/account/password, /signin/forgot, /reset-password. Final. Built: Tài khoản row under the profile card (hint = email), /settings/account (Tên hiển thị, Email, Đổi/Đặt mật khẩu, Đăng xuất), /settings/account/password (show/hide 44 px, wrong-current message, toast), /signin email + password above the magic link with "Quên mật khẩu?", /signup password + confirm, /signin/forgot, /reset-password; lib/auth-actions.ts is a MOCK (localStorage, SHA-256 hashes). Tests: auth-actions (validators and mock flows), profile displayName, profile-summary title. Gates on prod :3101 after the rebase onto feat/ui a09e5ea (cc2-15): typecheck clean, vitest 500, build ok, test:align 46 PASS 0 FAIL (account-row: 3 pairs at 390 and 1440), test:hydration exit 0, probe:all 28 PASS, 2 REPORT, 1 FAIL, 1 SKIP. The FAIL was cc2_15 (its sign-up step used get_by_label("Email"), which is now two fields); the probe now fills the magic-link field (the last one), and cc2_15 alone passes: 60 ok, 0 FAIL. The same one-line fix went into ag07.py (item 4) and cc02-final.py (dev only). A full probe:all rerun after those three probe edits was not done. cc_18 probe 68 ok, 0 FAIL; smoke PASS (both new no-header routes listed). Edges: account-row pass (test:align). Password and auth screens have no align group. Open for Dong: OPEN_QUESTIONS cc-18 (6 lines). Claim released. |
| 13/10/2026 | cc-17b | Final. Copy fixes from docs/copy-audit-ag11.md ([CC1 claim] rows) and Hao's 13/10 decisions: Ngày tập, Vi chất (titles and empty state, now "Thêm món"), Tinh bột nhanh, Chất béo, huấn luyện viên, 50%, Thêm vào màn hình chính, Vitamin B9. Left for their owners: micros/[nutrient] "Quay lại Vi chất" and nutrient-detail contributing-foods (outside the claim). Gates on prod :3101: typecheck, vitest 454, build, test:align, test:hydration, probe:all 26 PASS, 2 REPORT, 0 FAIL, 1 SKIP (smoke PASS). Edges: micros-card pass (test:align, 38 checks); no settings or training align group exists yet. Claim released. |
| 13/10/2026 | cc2-14 | PWA. app/manifest.ts (name, short_name, lang vi, standalone, paper/ink, icons 192/512/maskable, shortcuts Thêm món and Nhật ký); layout viewport (themeColor, viewport-fit cover), appleWebApp, apple-touch-icon, favicon; icon public/icons/icon.svg + PNGs via scripts/icons.mjs (sharp); public/sw.js (precache shell + build assets, cache-first static, network-first pages, never auth or /api, update waits for Tải lại); lib/pwa.ts + 11 tests (sw.js is run in the test to check it matches); /offline; /install (button, iOS 3 steps, Đã cài trên máy này, no bottom nav per IA-v2); AppShell bottom padding adds safe-area-inset-bottom. Probe cc2_14.py. Gates (production build on :3102): typecheck, vitest 450, build, test:align, test:hydration pass; probe:all 26 PASS, 2 REPORT, 0 FAIL, 1 SKIP; smoke PASS. Edges: install-header, offline-header pass. Screenshots: apps/web/.screenshots/cc2-14-*.png. | Done |
| 13/10/2026 | cc2-12b | Review fixes for cc2-12. The feature is "Bữa ăn của tôi" everywhere in apps/web and design/IA-v2.md (probe cc2_12 asserts none of the old name is left). Quick kcal entries store blank Đạm, Tinh bột, Béo and fibre as null, never 0 (a typed 0 stays 0): totals sum known values only, the meal row shows "Đạm — · Tinh bột — · Béo —", /entry/[id] shows empty fields with a — placeholder, the dial and bars move by kcal only. Tests first (quick-entry, day-totals, quick-entry-diary). Gates (production build on :3102): typecheck, vitest 439, build, test:align, test:hydration pass; probe:all 25 PASS, 2 REPORT, 0 FAIL, 1 SKIP; smoke PASS. | cc2-14 |
| 13/10/2026 | cc2-12 | Faster logging + Bữa ăn của tôi (IA v2 step 5). Add sheet: Gần đây rows (tap = add with the last portion and a 5 s Hoàn tác, chevron = portion panel; favourites too, without history the panel opens), Bữa ăn của tôi rows (one tap adds every food, one undo), Chỉ ghi kcal (kcal required, name optional, macros optional, micros null, Ghi nhanh label, editable on /entry/[id]). Nhật ký ⋯ → Lưu thành Bữa ăn của tôi (name sheet, also from a past day). Khám phá: Bữa ăn của tôi section with rename and delete (confirm) and /explore/meals. Logic with tests first: lib/saved-meals.ts, lib/quick-entry.ts, lastPortionOf, mealPortions. Repeat meal in 2 taps measured in cc2_12.py (390 and 1280, 108 checks). Gates (production build on :3102, rebased on origin/feat/ui): typecheck, vitest 434, build, test:align, test:hydration pass; probe:all 0 FAIL after cc2_10 followed the new ⋯ rules; smoke PASS. | cc2-14 |
| 13/10/2026 | cc-17 | Final. Ngày tập and the Vi chất phone header. Route is app/(dashboard)/training (the brief said app/training). Ticks per day: lib/training-checklist.ts (new, key h1t_training_checklist_v1, stores { minutes, ticked } per date; old key h1t_training_checks_v1 no longer read), today editable, past days read-only with their saved ticks, unknown date has nothing ticked; pre-ticks removed. Duration chips: 3 equal columns on the phone (3 + 2, sixth cell empty; 5 columns wrapped "60 phút" and "120 phút" at 390), 5 on desktop. Carb nhanh copy matches the design; colour and padding differences in OPEN_QUESTIONS. /micros phone: summary folds to "8/22 vi chất đã đạt" once the list scrolls past the header, and the list stays still on screen; desktop unchanged. Probes: tests/probes/cc_17.py (70 checks, 390 and 1280); cc06 and cc07 updated for the fold (chip bar keeps its gap under the header; summary found by text). Gates on prod :3101, rebased on feat/ui 3bb4197: typecheck clean, vitest 447 pass (39 files), build pass, test:align pass, test:hydration pass, probe:all 26 PASS, 2 REPORT, 0 FAIL, 1 SKIP, smoke 68 of 68. Edges: training-content pass (cc_17, 390 and 1280), micros-card pass (test:align). Screenshots: apps/web/.screenshots/cc-17-{training,micros}-{top,scrolled}-{390,1280}.png. Claim released. |
| 13/10/2026 | cc2-11 | Nhật ký fixes + Khám phá v1 (categories, Giàu lists, food detail), then the 13/10 review fixes: food detail has a Tùy chỉnh chip and shows the gram input only when it is selected (custom portion label "<n> g"); Giàu titles keep the vitamin letter (Giàu vitamin D, Giàu canxi) on the list screen and the /explore index via richName() with a unit test; vitamin order B9 before B12 in the catalog (food detail and /micros agree); probes ag07 follows the chip. Gates (production build on :3102): typecheck, vitest 391, build, test:align, test:hydration pass; probe:all 23 PASS, 2 REPORT, 0 FAIL, 1 SKIP (ag07 fixed in this commit, rerun 48/48); smoke PASS. | cc2-12 faster logging + Bữa của tôi |

| 13/10/2026 | cc-16 | Final. Cài đặt, Hồ sơ and Mục tiêu (IA v2 step 3) on prod :3101. Cleanup: components/profile deleted; BodyCard, GoalCard and AppCard now in components/settings/profile-cards.tsx; one dark Pro offer (16 px title); AppCard hint removed; Đăng xuất in destructive text; Chất xơ* row shows the rule only. Probes: cc09 and cc2_03 check the menu and red text on /settings; cc2_07 checks the Cài đặt content (it was slow, about 3.5 min, not hung); ag06 reminders and cc08 targets moved to /settings and /settings/targets. Gates on prod: typecheck clean, vitest 400 pass (corrected by cc-17 on 13/10: 389 was stale, the rebased branch runs 400), build pass, test:align pass, test:hydration pass, probe:all 24 PASS, 2 REPORT, 0 FAIL, 1 SKIP (cc02-final, dev only), smoke 66 of 66 at 390 and 1280, all on the build rebased onto feat/ui (cc2-11 and the ag-10 docs). Edges: settings-row, profile-row and targets-row pass per card. Screenshots: apps/web/.screenshots/cc-16-{settings,profile,targets}-{390,1280}.png. Merged into feat/ui ff-only. Open: OPEN_QUESTIONS cc-16 (Dong: Đăng xuất does not clear a session yet). | Done |
| 13/10/2026 | cc-16 | IA v2 step 3, Cài đặt. /settings: profile card (Hồ sơ của bạn, sub "Nam · sinh 2003 · 65 kg · Giữ cân"), Mục tiêu mỗi ngày row (kcal · đạm from lib/targets), Ứng dụng (reused AppCard), dark H1T MICRO Pro offer, Tài khoản (Đăng xuất), Vùng nguy hiểm (Xoá tài khoản). /settings/profile: Cơ thể and Mục tiêu cards reused from components/profile, birth year FormRow htmlFor, link to /settings/targets. /settings/targets: read-only, formulas and values from components/settings/target-rows.ts (tests first, 6 cases, expected values from design/v2/cai-dat.html), VN 2016 values marked *. profile-summary.ts with tests (3). Gates so far: vitest 389 pass, tsc clean for source; probe cc_16.py 198 OK / 0 FAIL on the dev server at 3101 (screenshots .screenshots/cc-16-*). Edges (per card): settings-row, profile-row, targets-row pass. Not run: prod build (blocked, see OPEN_QUESTIONS cc-16), test:align, test:hydration, probe:all (cc09 and cc2_03 fail on the old menu location; cc2_07 hangs), smoke. No merge into feat/ui. | Hao: delete apps/web/.next/dev (stale types break next build); then the prod gates and merge. Open items cc-16 in OPEN_QUESTIONS. |
| 13/10/2026 | api-p6 | Phase 6 — Hardening & Launch: Migration 000006 (RLS hardening across all tables and custom foods), user write rate limiter middleware (60 writes/minute/user with 429 RATE_LIMIT_EXCEEDED and Retry-After), k6 load testing script scripts/loadtest.js with p95 < 300ms threshold, phase status lines updated to done in docs/08-backend-plan.md. Quality gates: go vet, go test, npm run typecheck in apps/web, vitest 380 tests pass. | Complete (Release 1 done) |
| 13/10/2026 | api-p5 | Phase 5 — Coach Targets & Trends: Ported targets.ts to Go internal/targets (all coach rules, VN2016 reference values), generated packages/vectors/targets.json via vitest, verified exact equality in Go TestSharedTargetVectors, added targets to /me and /days/{date}, ported period.ts to Go internal/trends, implemented trends repository, service and GET /trends endpoint with days, offset, averages, days on target, macro composition, streak. Quality gates: go vet, go test (shared vector parity pass), vitest 380 tests pass, apps/web typecheck clean. | Phase 6 (api-p6) |

| 13/10/2026 | api-p4 | Phase 4 — Library (Favourites, Recents, Saved Meals): Migration 000005 (user_favourites, user_recents with 30-per-user cap, saved_meals and saved_meal_items with RLS), library repository/service/handlers (GET/POST/DELETE /favourites, GET /recents with last portion, GET/POST/DELETE /saved-meals, POST /days/{date}/entries/from-saved/{id}?meal= adding all items with recents tracking), openapi.yaml updated. Quality gates: go vet, go test (including add-from-saved and recents tests), vitest 379 tests pass, apps/web typecheck clean. | Phase 5 (api-p5) |

| 13/10/2026 | api-p3 | Phase 3 — Diary Core & Guard: Migration 000004 (kind 'food'/'quick', nullable food_id with invariant check, client_id idempotency, portion columns, soft delete deleted_at, day_training table with RLS), Asia/Ho_Chi_Minh server-side date and PAST_DAY_READ_ONLY guard (409 on any write to past days), diary endpoints (GET /days/{date} null-aware totals, POST /days/{date}/entries for food & quick kcal, PATCH/DELETE /entries/{id} with soft delete, POST /days/{date}/copy-yesterday, DELETE /days/{date}/meals/{meal}, PUT /days/{date}/training), openapi.yaml updated. Quality gates: go vet, go test (past-day guard and null-aware totals tests pass), vitest 379 tests pass, apps/web typecheck clean. | Phase 4 (api-p4) |

| 13/10/2026 | api-p2 | Phase 2 — Foods Catalog & Search: Migration 000003 (foods categories, unaccent + pg_trgm name_search trigger, food_portions, nutrients table, rich-in expression indexes), seeds/001_nutrients.sql (57 nutrients, 22 counted), data/nutrient-map.yaml and data/SOURCES.md, cmd/importfoods CLI with dry-run and completeness reporting, 30 mock foods seed dataset with portions and nutrients, nutrition endpoints (GET /foods search with unaccent + trigram, GET /foods/{id}, GET /foods/rich-in/{nutrient}, POST /foods/custom with 100g scaling, DELETE /foods/custom/{id}), openapi.yaml updated. Quality gates: go vet, go test (including scaling tests), vitest (379 tests), npm run typecheck all pass. | Phase 3 (api-p3) |

| 13/10/2026 | api-p1 | Phase 1 — Auth, Profile & Weight: Migration 000002 (profiles, weight_logs with RLS), profile repository, service and HTTP handlers (GET /me, PUT /me/profile, GET /me/weight, PUT /me/weight/{date} atomic weigh-in + profile weight update, DELETE /me cascade), 308 redirect from /login to /signin, removal of legacy login page. All unit tests pass in Go and Vitest. | Phase 2 (api-p2) |
| 13/10/2026 | api-p0 | Phase 0 — Foundations: Zerolog JSON logger + request tracing middleware, centralized config loader, standard error envelope + status codes from docs/07 §4, 422 validator helper, openapi.yaml 3.1 skeleton for core routes, Makefile targets (migrate-up, migrate-down), and GitHub Actions api.yml CI workflow. Quality gates: go vet, go test, npm run typecheck in apps/web all pass. | Phase 1 (api-p1) |
| 12/10/2026 | cc2-10 | IA v2 step 2. Tổng quan (/, /trends, /trends/micros, /trends/body): sub-tab bar (tablist of links) and one period control (heading, ‹ ›, 7/30, in the URL as ?p= and ?o= so the tabs carry it); Tóm tắt (slim Hôm nay line with Ghi bữa by the clock, Kỳ này, So với kỳ trước, Nhận xét, Chưa đủ dữ liệu under 3 days), Năng lượng (composition ring, kcal chart with target band, protein), Vi chất (22 nutrients, lowest first, N/x ngày đạt), Cơ thể (weight chart from the sample log). Logic in lib/overview.ts with tests. Nhật ký (/diary, components/diary): title row with date nav, ink day summary, Vi chất and Ngày tập rows with ?date=, slim sticky bar, one + and a ⋯ menu per meal (Chép hôm qua, Lưu thành Bữa của tôi disabled, Xoá bữa này with a confirm step and one undo; deleteMealIn tests first). /micros, /micros/[nutrient], /training take ?date= (read-only for past days, back to /diary?date=); the old trend link goes to /trends/micros. Old Today layout removed (components/today, components/trends). Nav ownership: micros and training under Nhật ký, trends/* under Tổng quan. Probe cc2_10.py (clock fixed at 18:00); cc12a/cc12b retired (covered by cc2_10), cc10/cc11/cc2_04/cc2_05/cc2_07/cc2_08, alignment groups and hydration routes follow the new IA. Gates on a production build at :3102: typecheck, vitest 379, build, test:align, test:hydration pass; probe:all 21 PASS, 2 REPORT, 0 FAIL, 1 SKIP; smoke 62/62. Edges: today-header, meal-card, overview-rows, overview-comp, overview-micro-l/r, overview-stats pass. Note: the cc2-09 progress commit also removed the old /trends page, so feat/ui had no /trends between 09c3805 and this merge. | cc2-11 |
| 12/10/2026 | cc2-09 | Data and logic, no screen changes. design/IA-v2.md: Xoá bữa này (with a confirm step) in the ⋯ menu and a "Decided 12/10 21:00" list. One Python resolver (scripts/python.mjs, python3 → python → py, UTF-8 output) behind test:align, test:hydration and probe:all (scripts/py.mjs). One mock source: lib/mock/history.ts gives the 29 days before today entries (three gap days), lib/day-totals.ts turns any day into DayTotals (22 counted nutrients, value or null, null never 0), lib/mock/trends.ts is trendSeries() built from it, pastDayData reads the same totals so Nhật ký and Tổng quan agree; lib/mock/weight-log.ts has 30 daily weigh-ins around 65 kg. lib/period.ts (tests first): period(today, 7|30, offset), URL params, averages over finished logged days, days on target, macro composition, comparison with the previous period, insights (max 3), logging streak, weight summary; nextMeal in lib/meal-slot.ts; formatSigned, formatPercent, formatPeriodRange in lib/format.ts. cc10.py uses a gap day as its empty day. Gates (production build on :3102): typecheck, vitest 359 pass, build, test:align, test:hydration pass; smoke 58/58 on the committed code; probe:all 21 PASS, 2 REPORT, 1 FAIL (smoke only saw the cc2-10 route files that were added to the work tree during the run, not part of this commit). | cc2-10 |
| 12/10/2026 | cc-15c | IA v2 mockups redone for the 12/10 19:35 revision (design/v2 only, no app code). tong-quan.html: four sub-tabs (Tóm tắt, Năng lượng, Vi chất, Cơ thể) with the shared period control, the under-3-days state, 7 days drawn as 06–12/10. nhat-ky.html: the day (ink summary, Vi chất and Ngày tập rows, one + and ⋯ per meal with Chép hôm qua and Lưu thành Bữa của tôi), past and empty day, /micros?date= and /training?date= pushed. cai-dat.html: Cài đặt with profile card, Hồ sơ pushed (same fields), read-only Mục tiêu mỗi ngày with formulas. kham-pha.html and add-sheet.html: Bữa của tôi (sample, empty state, one tap adds every food with one undo toast), paper headers. nav.html: sub-tab bar and period at 390 and 1280, desktop pushed screen without ink band. README: Headers, Not now, open questions. PNGs at 390 and 1280: 0 horizontal scroll, 0 targets under 44 px, 0 text under 4.5:1 (1.864 elements), 0 ink bands on desktop. | Hao: four open items in design/v2/README (Xoá bữa này, mock dates and values not in sync, weight history sample, 17 Vi chất without day data). Next: IA v2 steps 2–3 in apps/web (Tổng quan sub-tabs, Nhật ký day routes, Hồ sơ and read-only targets). |
| 12/10/2026 | cc2-08 | IA v2 header pass (design/IA-v2.md revised copy, Headers decisions section added). AppHeader rewritten: `sub` and `tab` are one paper title row at every width (44 px back inline before the title, Saira 24/32 px, one subtitle line, actions right, `summary` as an ink card below); `daily` keeps the phone ink band only for `/` (wordmark, sr-only h1 Tổng quan) and `/diary` (title Nhật ký); desktop has no ink band anywhere, same 32 px top padding (`flush`/`layout="wide"` for padded mains). Wordmark gone from every other header (Pro lockup removed). Profile and weight lose their separate desktop h1. Probe cc2_08.py (213 checks at 390 and 1280). alignment.py: food-header and entry-header rows removed, header group now sits on the title row. probe.mjs falls back to `py` when python3 is the Windows Store stub. | Step 2: split Today into Tổng quan and Nhật ký; Hao's answers in OPEN_QUESTIONS (cc2-08) |
| 12/10/2026 | cc2-07 | IA v2 step 1, navigation shell (design/IA-v2.md added, with a Navigation section). Bottom nav Tổng quan · Nhật ký · [+] · Khám phá · Cài đặt and DesktopSidebar (same four items + primary Thêm món), tab from the URL (lib/nav.ts, tests first). / and /diary share components/today/today-screen.tsx; /explore (search + categories, food opens /foods/[id]); /settings and /settings/profile[/weight] serve the Hồ sơ content. /micros, /micros/[nutrient], /training, /trends use AppHeader sub with back (history, else owning tab) and highlight Tổng quan. next.config.ts serves 308 redirects /today→/diary (query kept), /profile, /profile/weight, /foods (lib/redirects.ts). Links, usePastDayRedirect and setup final redirect updated; AppShell, useFoodBrowse, FoodSearchField, FoodEmptyState shared with the add sheet. Probe cc2_07.py (163 checks). Older probes use the new URLs; smoke covers /login (header exempt) and /explore. run_all.py and probe.mjs fixed for Windows. | Step 2: split Today into Tổng quan + Nhật ký (stop-gap Ngày tập and Vi chất links go away) |
| 12/10/2026 | cc-15b | ag-08 merged (cherry-picked onto feat/ui, PROGRESS rows kept). docs/07-api-contract.md: training endpoint returns minutes only (salt targets client-side, §3.2); one entry path POST /days/{date}/entries, PATCH and DELETE /entries/{id}; quick kcal is an entry with kind "quick" (food_id and nutrients null, not in recents), open question 7 for Dong; IA v2 routes (/, /diary, /explore, /settings, /settings/profile, /settings/targets). design/v2: one-line Ngày tập card (rest: Nghỉ · muối 4–6 g), next meal follows the clock, Thêm món as a persistent sidebar button, sky focus ring on dark surfaces, Nguồn tốt của ≥ 20 % per portion, Thiếu copy, insights in order, toast 5 s. README: 16 questions decided 12/10, routes, SPEC.md superseded. PNGs re-rendered at 390 and 1280: 0 horizontal overflow, 0 targets under 44 px, 0 text under 4.5:1. | Claude Code #2: layout.tsx "26 vi chất" → 22 (design/v2/README 15). Dong: docs/07 §5 item 7. Hao: Pro card and Xoá tài khoản copy (README 13). |
| 12/10/2026 | ag-08 | API contract for Dong (docs/07-api-contract.md in English): overview & conventions (Supabase auth, Asia/Ho_Chi_Minh dates, null vs 0, client-side vi-VN number formatting), request/response schemas for 13 resources (profile, weight log, diary day, entries add/edit/delete, copy yesterday, training minutes, foods catalog, rich-in, favourites, recents, custom foods, quick kcal, trends), business invariants (past days read-only 409 PAST_DAY_READ_ONLY, targets computation boundary, user data isolation), unified error envelope and UI error codes, open questions checklist for Dong. | Ready for merge |
| 12/10/2026 | cc-15 | design/v2/nav.html: phone bottom nav with each of the five slots active (Tổng quan · Nhật ký · + · Khám phá · Cài đặt), a keyboard focus sample (sky ring on dark, 10.4:1), and the four desktop sidebars at 1024 px and up. design/v2/add-sheet.html (committed earlier): recents with one-tap rows and chevrons, undo toast, Chỉ ghi kcal, portion panel with five aligned rows; PNGs in design/v2/png. | README, claim release |
| 12/10/2026 | cc-15 | design/v2/kham-pha.html: Khám phá (search, category chips, Gần đây, Yêu thích, Món của tôi empty state, Giàu Canxi) and food detail for Yến mạch (portions, per-portion macros, Nguồn tốt của, all 22 vi chất as % of target; 15 with no mock value show a dash). PNGs in design/v2/png. | add-sheet, nav, README |
| 12/10/2026 | cc-15 | design/v2/cai-dat.html: Cài đặt tab (profile, Mục tiêu mỗi ngày row, Ứng dụng, Pro card, Tài khoản, Vùng nguy hiểm with Xoá tài khoản) and /settings/targets (goal chips, weight, default training, calculated targets from the coach rules and the mock). PNGs in design/v2/png. | kham-pha, add-sheet, nav, README |
| 12/10/2026 | cc-15 | design/v2/nhat-ky.html: Nhật ký with five states: today (one + per meal header, ⋯ menu with Chép hôm qua, sticky energy bar, Vi chất row), training sheet (Nghỉ, 45′, 60′, 90′, 120′), per-meal menu (Xoá bữa này in destructive text), past day Thứ Sáu 09/10 read-only (1.532 kcal, from the mock catalogue), empty day with Chép hôm qua. PNGs in design/v2/png. | kham-pha, add-sheet, cai-dat, nav, README |
| 12/10/2026 | cc-15 | design/v2/tong-quan.html: Tổng quan, phone 390 and desktop 1280 side by side, three states (food logged, nothing logged, rest day). Dial, 10-segment bars and 7-day strip from lib/mock; facts-only insights. PNGs in design/v2/png. Checks: no horizontal scroll at 390, every target ≥44 px, text ≥4.5:1 (render_check, not committed). IA-v2.md was not on disk or on feat/ui. | nhat-ky, cai-dat, kham-pha, add-sheet, nav, README |
| 12/10/2026 | cc2-06 | --color-track-on-dark is #666A75: 3.44:1 on ink, 3.15:1 on the surface-dark panel (both in the CSS comment). cc2_03.py checks the ring against the colour of the panel it sits on (the ring check is in cc2_03.py only, not cc2_05.py). cc2-05 dial question marked decided. | None |
| 12/10/2026 | cc2-05 | Profile drives day.user: the desktop label uses goalName and formatNumber (70,5 kg, not 70.5), tests first (90 min / 70,5 kg / Tăng cơ move the label and the salt total); cc2_05.py edits the profile and checks /today and /training at 1440. Dial ring uses --color-track-on-dark #60646E (3.14:1 on ink). ag04_audit_results.json ignored. /admin/review on Cobalt Sign tokens. --color-on-dark and --color-on-accent replace text-white (32 files, no visual change). Decided questions marked. | Dial ring is 2.88:1 on the inset panel (OPEN_QUESTIONS cc2-05) |
| 12/10/2026 | cc2-04 | Sweep of app and components. bg-white is bg-card (same #FFFFFF) in 16 files. Dial numbers use formatNumber. Profile values are no longer fixed: the training and micros desktop subtitles read the profile's goal and weight (sample: Giữ cân · 65 kg); Today's desktop salt card, the Mẹo line and the salt summary read calculateSaltTarget for the day's minutes; Kali mục tiêu reads targets.potassium. The fallback "Thứ Bảy, 10/10/2026" is gone. Text is unchanged for the sample profile. Probe cc2_04.py (25 checks). Design calls in OPEN_QUESTIONS (cc2-04). | Queue complete. Waiting for Hao's answers in OPEN_QUESTIONS (cc2-04, cc-14b done, cc2-02 /add heading) |
| 12/10/2026 | cc2-03 | Audit items in docs/audit-ag04.md done (rows marked): Profile "Đăng xuất", "Vùng nguy hiểm" and "Xoá tài khoản" use text-destructive-text; CalorieDial track uses muted-on-dark (already 5.96:1 on ink, so no new token); AppHeader date button is aria-busy="true" until its label resolves. Probe tests/probes/cc2_03.py (14 checks). | Task 4 (cc2-04 sweep) |
| 12/10/2026 | cc2-02 | ag-06 merged (6 commits rebased onto feat/ui; audit status table and PROGRESS rows kept). One visible h1 per page at 390 and 1440: the Today empty state hides its sr-only h1 at 1024 px and up (the daily header has one there), the Today loading skeleton gets a desktop h1, and the /add phone sheet has a sr-only h1 "Thêm món" (OPEN_QUESTIONS cc2-02). Profile reminders row is empty until mounted, then Đã bật / Đã tắt. ag06.py checks the h1 rule on 15 routes plus the Today states. Remote branches feat/ui-ag-06 and feat/ui-cc-10 deleted after the merge. | Task 3 (cc2-03 audit items) |
| 12/10/2026 | cc2-01 finish | Rebased onto feat/ui 8cf2c92. Nutrient detail uses targetRangeText (targetLabel removed, tests moved). Detail header rows and both cards carry data-align-group (nutrient-header, nutrient-card), with alignment rows at 390 and 1440 for /micros/calcium. Detail skeleton is motion-safe. Training loading subtitle is empty, not 10/10. Lane rules in AGENTS.md and CLAUDE.md: each Claude Code works in its own clone. Smoke: setup goal and profile exempt from the header at 1024 px and up (cc-14b decided 12/10); /foods judged on /add. Gate summary below. | Task 2 (cc2-02, ag-06 merge) |
| 12/10/2026 | cc-14b | Merged ag-07 (rebased onto feat/ui, 7 commits, PROGRESS rows kept). --color-destructive-text is #C4373C (5.30:1 on #FFFFFF, 4.70:1 on #F3F1EC; CSS comment updated). /foods/[id] label keeps only focus-within:ring-2 focus-within:ring-blue. Smoke header rule decided 12/10 (Hao): no header required on /signin, /signin/check-email, /signin/expired, /signup, the 404 URL, /admin/review, and /add below 1024 px; the DesktopSidebar counts as the header at ≥1024 px. /login skipped in smoke (Dong's link to /diary). Smoke 50 PASS / 4 FAIL of 54. | /foods stays failing until cc2-01 merges; setup at 1280 has no header (OPEN_QUESTIONS cc-14b); /login for Dong |
| 12/10/2026 | cc-14 | Whole-app smoke probe tests/probes/smoke.py: 27 page.tsx routes plus the 404 URL, at 390×844 and 1280×800 (56 runs). Checks console and hydration errors, horizontal scroll, a visible header, and text overflow (scroll containers and sr-only skipped). /foods is asserted to redirect to /add. Screenshots in apps/web/tests/probes/out/. tests/probes/run_all.py and npm run probe:all run every probe in one table: cc02-final only with PROBE_DEV=1; ag04_audit and screenshots are REPORT (no exit gate). No app code changed. | Found (cc-14) below: 2 real bugs (/foods, /login); 17 header-rule FAILs need a decision (OPEN_QUESTIONS cc-14) |
| 12/10/2026 | ag-07 | Accessibility fixes (audit-ag04): gram input h-full in 44px label and focus ring in /foods/[id], htmlFor/id linking in /foods/new FormRows, --color-destructive-text token (#C83A3F, >=4.5:1 contrast on white & paper) for required '*', magic-link email input keyboard focus ring, Vietnamese salt comment 1–1,5 g in training.ts, ag07.py verification probe (46/46 checks passed). | Ready for merge |
| 12/10/2026 | cc2-01 step 4 | Probe tests/probes/cc2_01.py: detail opens from the Canxi row (390 and 1440), range and 28 %, "—" for a null amount, no Gợi ý section, /foods redirect, date label without comma; screenshots to .screenshots/cc2-01-*. Gate summary in "Quality Gate Summary (cc2-01)". The probe is not run yet. | Install Playwright (user approval), then run test:align, test:hydration and cc2_01, then merge |
| 12/10/2026 | cc-12b | Trends: a day above the max counts as on target (countDaysOnTarget is min-only; max kept for display), tests first (calcium 1.600, magnesium 800 and potassium 7.000 count as đạt). Kcal legend has three items again: Trong mục tiêu, Thiếu, striped Hôm nay (đang ghi), tokens only. Nutrient rows show "Mục tiêu: 1.200–1.500 mg" through targetRangeText (same formatter as /micros), min only when there is no max. The list header reads "Mục tiêu / ngày". Mock: the third day of the 7-day series (2.380 kcal) is above the 2.275 kcal max; the 30-day window reuses those seven days, so it has one over-range day too. cc12a's calcium assertion updated to the range. | Over-range bar in the desktop chart not separately checked; cc-13 audit findings |
| 12/10/2026 | cc2-01 step 3 | Scaffold /foods catalog removed (app/(dashboard)/foods/page.tsx and the unused components/foods/food-card.tsx). app/foods/page.tsx is a permanent redirect to /add (308, checked on :3102). No link to the catalog existed in nav, sidebar or screens. /foods/[id] and /foods/new stay. | Probe cc2_01 checks the redirect |
| 12/10/2026 | cc2-01 step 2 | Date labels without a comma: formatDayLabel gives "Hôm nay 12/10", "Hôm qua 11/10", "Thứ Hai 05/10", "Chủ nhật 04/10" (tests changed first). Same rule for withRuntimeDate dateLabel, the mock day label and the Training fallback. Desktop long date ("Thứ Bảy, 10/10/2026") unchanged. cc10.py expects the new text. | Phone design uses "Thứ Năm 08/10" too (OPEN_QUESTIONS cc-12 date labels) |
| 12/10/2026 | cc2-01 step 1 | Nutrient detail (/micros/[nutrient]) from any Vi chất row (all 59 rows link now). Ink header with amount vs target ("1.200–1.500 mg"), 28 % and 10-segment level bar with label, 7-day history (value = share of target, "—" for days with nothing logged), today's top 5 foods for that nutrient. Row builder moved to lib/nutrient-rows.ts; lib/nutrient-detail.ts and lib/nutrient-sources.ts with tests first (266 unit tests pass). Read-only, no "Gợi ý để bù". Visual check in the built-in pane at 390 and 1440 (no screenshot file: Playwright is not installed here). | Step 2 date labels; Playwright install needed for probes and screenshots |
| 12/10/2026 | ag-06 | Fixed audit Musts (focus rings in /add, checkbox tap area & aria-label in /training, time input overlay in /settings/notifications, focus-within ring in entry-editor and portion-panel) and quick Shoulds (CalorieDial kcal contrast to text-muted-on-dark, + Thêm 44px tap targets on Today mobile & desktop, h1 in daily AppHeader, setup-form h2 sr-only on mobile, switch off-state border). Updated user-facing count from 21 to 22 vi chất in /paywall. Profile reminders row shows 'Đã bật' / 'Đã tắt' based on active state. Added ag06.py probe with 15 assertions passing. | Ready for Claude Code merge |
| 11/10/2026 | cc-12a | Merged feat/ui-ag-03 (Trends) and feat/ui-ag-04 (docs/audit-ag04.md, tests/probes/ag04_audit.py) with no conflicts. Trends: the 7- and 30-day windows end today (anchorTrendDays, set after mount); targets come from the profile (trendTargetsFrom(calculateTargets)), so calcium 1.200–1.500, magnesium 600–750, potassium from weight, iron 8/18/28; a kcal day above the range is on target, not red (kcalOnTarget); legend Trong mục tiêu / Thiếu; Saira Condensed for the title and the protein number. /micros links to /trends (phone footer row under the summary, desktop link in the stat row). Units added to the Trends rows (TB and Mục tiêu). | Audit findings (cc-13); Trends has no over-range sample day in the mock, so the over case is covered by unit test only |
| 11/10/2026 | cc-12 | Design parity sweep of the 25 screens (docs/parity-cc12.md, probe cc12.py: copy diff + screenshots + calendar check). Fixed 10: Micros footnote and "đã đạt mục tiêu"; FoodDetail "Khẩu phần" label; CreateFood micro example list; calendar is a centred dialog at ≥1024 px (Esc closes, focus returns to the date; components/ui/sheet.tsx `desktopDialog`); TodayStates offline heading; Profile "Nhắc nhở" shows "Đã bật"; setup desktop "Bước 1/2 · Về bạn" and "Mục tiêu mỗi ngày"; SignUp desktop "TẠO TÀI KHOẢN". 15 left as decided and 12 questions (OPEN_QUESTIONS cc-12). Design files need support.js (not in the repo), so layout was checked from source, not rendered. | NutrientDetail is a placeholder (OPEN_QUESTIONS cc-12); vi chất count 21 vs 22 |
| 11/10/2026 | cc-11 | Past days are read-only: rows are not links, no + Thêm and no Chép hôm qua; /entry/… and /add with a past ?date= go back to that day's Today (usePastDayRedirect). Desktop: the date in the header subtitle opens the same calendar (no future days). "Thiếu nhiều nhất" and the x/22 count come from the day's own nutrients vs targets (lib/lacking.ts, lowest % first, tests first), so logging a calcium-rich food changes the list. BACKLOG line removed. Copy sheet subtitle "Thứ Bảy, 10/10". docs/03-srs.md iron men 8 mg. Past-day views added to tests/alignment.py. cc11.py. | Past-day Vi chất detail (none, by design); desktop calendar is the phone bottom sheet (no centred dialog yet) |
| 11/10/2026 | cc-10 | Copy yesterday: "Chép hôm qua" sheet (four meals, snack unticked, Chép N bữa) copies the mock yesterday entries into today with one 5 s undo toast (lib/day-history.ts with tests first). Past days: ?date= on /today, AppHeader ‹ › work, › off on today, past days show their own data (yesterday mock; other days empty), formatDayLabel labels. Calendar picker (Sheet, month grid, no future days) opens from the phone date label. Hồ sơ: Năm sinh is a row that opens the FormRow (same validation, saves on blur or Enter). Iron men 8 mg (lib/targets.ts, tests updated; SRS conflict in OPEN_QUESTIONS). cc10.py and cc09 birth-year steps updated. CLAUDE.md: switch back to feat/ui-cc-* after merge. | Past-day add and edit (date-aware /add), desktop day picker, Vi chất detail on past days (see OPEN_QUESTIONS cc-10) |
| 11/10/2026 | cc-09 | Merged ag-02 (8 commits cherry-picked onto feat/ui; PROGRESS and OPEN_QUESTIONS conflicts resolved, app code identical to 013b268). Hồ sơ menu: Ứng dụng card (Ngôn ngữ shows the saved language → /settings/language, Nhắc nhở → /settings/notifications, Cài như ứng dụng → /install), Pro banner Xem gói → /paywall, Đăng xuất → /signin (link only), Vùng nguy hiểm card with Xoá tài khoản → /settings/delete-account. Birth year FormRow with setup validation (saves on blur or Enter). Default training time ChipGroup lg (Nghỉ, 45, 60, 90, 120); /training follows it until the URL names a duration. Goal chips 2×2 at 1440. hydration.py adds the 5 new routes and a 404 URL (its console 404 is exempt there only). cc09.py. Gates: tsc ok, vitest 195 pass, build ok, test:align pass (prod :3101), test:hydration pass (prod), cc03–cc09 pass (prod), cc02-final pass (dev only: its sign-in link is hidden in production). Edges: /profile 390 profile-header, profile-row (9 pairs) pass; /profile 1440 profile-row (9 pairs) pass | Đăng xuất clears nothing (OPEN_QUESTIONS, Dong); Tải CSV not built; install row name to confirm (OPEN_QUESTIONS); training chips tight at 390 |
| 11/10/2026 | cc-08 | Profile store (lib/profile.ts, localStorage h1t_profile_v1, seeded from the setup draft or the sample user) drives the targets: diary store applies calculateTargets after mount, so Today, Micros, food detail and PortionPanel follow it. /profile (phone + desktop, ChipGroup lg sex and goal, period switch for Nữ with 18→28 mg note, daily targets) and /profile/weight (FormRow, setup validation, live target preview). Onboarding finish saves to the profile. DesktopSidebar replaces the inline copies on Today and Micros. Weight shows 65 kg / 70,5 kg. Gates: tsc ok, vitest 189 pass, build ok, test:align pass (incl. profile-header/row, weight-header/row at 390 and 1440), test:hydration pass (/profile, /profile/weight added), cc06 pass, cc07 pass, cc08 pass (prod :3101). Edges: /profile 390 profile-header, profile-row pass; /profile 1440 profile-row pass; /profile/weight 390 weight-header, weight-row pass; /profile/weight 1440 weight-row pass | Ngày tập default and birth year editing; Ứng dụng/Pro/logout rows; Thiếu nhiều nhất from real data (BACKLOG); goal chips wrap on desktop at 1440 (2 lines for Giảm mỡ nhanh) |
| 11/10/2026 | ag-02 | Batch of 6 items on feat/ui-ag-02: ag-02.1 training polish (persisted checks, ChipGroup durations, exact copy), ag-02.2 404 & 500 error pages, ag-02.3 language settings, ag-02.4 notification settings, ag-02.5 delete account confirmation flow with toast, ag-02.6 static /install and /paywall pages. All 5 gates passed on branch tip. | Ready for Claude Code merge |
| 11/10/2026 | cc-07 | Micros phone: group chips scroll only the list (offset from scrollRef, reduced-motion aware); wrapper overflow-clip + list overscroll-contain, so the header and chip bar stay put. Probe cc07 (390/1440) and a tap-chip step in hydration; verified the step fails on the old code. Edges: micros-header, micros-card pass | Micros phone header collapse (BACKLOG); scroll-spy lock timing mid-scroll (not yet tested) |
| 11/10/2026 | ag-01 | Training screen (Antigravity, rebased onto feat/ui and merged by Claude Code): training page, phase checklist, duration selector, rest-day card, salt and sodium cards, tip banner, lib/training.ts with unit tests; /training added to hydration.py | Training backlog (BACKLOG) |
| 11/10/2026 | cc-04 | AppHeader sub on food detail, new food, entry and setup (phone) screens; setup step bars via AppHeader `progress` (StepBars moved to components/ui); food favourite heart in the header actions; onboarding-header removed; /add sticky group headers cover the 12 px side bleed; entry meal chips as ChipGroup (3 cols phone, 5 desktop); tests cc04 + header alignment pairs | Micros phone header collapse (BACKLOG); sticky-header crop decision (OPEN_QUESTIONS) |
| 11/10/2026 | ui-04b-fix-1 | Client runtime mock day in Asia/Ho_Chi_Minh; full Vietnamese weekday names ("Thứ Hai"…"Thứ Bảy", "Chủ nhật"); desktop subtitle formatter; Option B summary inset panel (surface-dark, 16px radius, no raw hex); formatAmount mg 1 decimal under 100; disabled date nav handlers when missing; desktop header alignment pairs for /today and /micros; opaque sticky chip bar on /micros | Ready for review |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | TASK ui-04: Vi chất screen |
| 10/10/2026 | ui-04 | Layout corrections for Vi chất (/micros): ink header date row + title + 8/22 stat in Saira Condensed, horizontal category chips on paper, 4-col equal grid legend, groups reordered (Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan), 2-line nutrient rows | Next tasks |
| 10/10/2026 | ui-04-fix | Vi chất sticky headers, scroll-spy, balanced desktop columns, sample breakdown data, alignment & range targets | Next tasks |
| 11/10/2026 | ui-04-fix-2 | Sticky group header bug fixed via overflow-clip; sample data totals consistency & invariant tests | TASK ui-05: Add food flow |
| 11/10/2026 | ui-05 | Add food flow: search with diacritics & fuzzy fallback, food detail, create custom food, meal switcher sheet, desktop add food modal dialog, reactive diary store with sessionStorage, toast alerts, dynamic Today and Micros updates | Next tasks |
| 11/10/2026 | ui-05-fix | Hydration bug fix, Asia/Ho_Chi_Minh default meal slot, layout primitives (ChipGroup, StatGroup, FormRow), 5-row portion panel alignment & 2-col desktop micros, return focus to opener on modal close, Playwright alignment & hydration tests | Next tasks |
| 11/10/2026 | ui-05-fix-2 | Meal default fallback & neutral placeholder, sessionStorage hydration visibility assertions, content-based alignment verification & desktop meal fix, adaptive precision & Vietnamese nutrient synonyms, single PortionPanel component, FormRow inputs, npm scripts & AGENTS.md documentation | Next tasks |
| 11/10/2026 | ui-05-fix-3 | Nutrient catalog keys & Vitamin B* naming, useMealSlot client resolution hook, desktop Today left text alignment (-mx-2), content-based data-align-edge checks, probe scripts (hydration & screenshots) | Next tasks |
| 11/10/2026 | ui-05-fix-4 | Put test:hydration into npm run check gates, remove dead vitamin remap in micros page, read targets from calculateTargets in PortionPanel & food detail (incl. vitamin_k %), remove playwright test permission from .claude/settings.json | ui-05 approved |
| 11/10/2026 | ui-04b | Shared AppHeader (daily, sub, tab variants), adopted in /today, /micros, /micros/[nutrient], /profile, /training, and /dev/ui; formatDayLabel timezone & yesterday support; alignment checks today-header and micros-header | Ready for review |

## Found (cc-14)
Smoke on prod :3101 (`npm run probe:all`): 35 PASS, 21 FAIL of 56 route × width runs. Screenshots: `apps/web/tests/probes/out/smoke-<route>-<width>.png`.
- **/foods, 390 and 1280:** no redirect to /add, though the brief expects one. The page is the old catalog scaffold (0f734dd) with no header. Screenshots smoke-foods-390.png, smoke-foods-1280.png. Real bug: OPEN_QUESTIONS cc-14.
- **/login, 390 and 1280:** never reaches networkidle within 30 s. A fetch to `/diary?_rsc=…` stays pending. /diary is not a route (curl returns 404 in 9 ms). Cause: `app/(auth)/login/page.tsx:150` links "Đăng ký hoặc dùng thử" to /diary. (The first write-up said no source file linked to it; that was wrong, because the grep was cut off by `head`.) Screenshots smoke-login-390.png, smoke-login-1280.png. Dong's file: OPEN_QUESTIONS cc-14. Smoke skips /login until it is fixed.
- **Header rule, 17 FAILs (not bugs by design):** /signin, /signin/check-email, /signin/expired, /signup and the 404 URL at both widths (no `<header>` in those design files); /add at 390 (sheet, no `<header>` in its design); /admin/review at both widths (no design file); /profile and /profile/weight at 1280 (AppHeader is `lg:hidden`, the sidebar is the desktop chrome); /setup/goal and /setup/profile at 1280 (desktop setup design has no `<header>`). Decided 12/10 (see cc-14b): the listed screens need no header, and a visible DesktopSidebar counts at ≥1024 px.
- No console, hydration, horizontal-scroll or text-overflow failures on any route.

## Gate summary (cc-14)
- `npm run typecheck` ok. `npm run test`: 20 files, 248 pass. `npm run build` ok, 26 routes.
- Prod server on :3101 (`npm run build`, `npm run start -- -p 3101`). Gates run as separate commands in `npm run check` order: check's build step rewrites `.next` under a running server, so the build ran first and the rest ran after it.
- `npm run test:align` (ALIGN_BASE_URL=http://localhost:3101): all pairs pass.
- `npm run test:hydration`: 0 hydration errors on all routes.
- `npm run probe:all` (ALIGN_BASE_URL=http://localhost:3101): 13 PASS, 2 REPORT (ag04_audit, screenshots), 1 FAIL (smoke: 35 PASS / 21 FAIL of 56), 1 SKIP (cc02-final, dev only).
- Edges: no UI change, so no new edge groups.
## Gate summary (cc-14b)
- Branch feat/ui-cc-14b: ag-07 rebased onto feat/ui (80bb6f2), fast-forwarded in, then the cc-14b edits.
- `npm run typecheck` ok. `npm run test`: 20 files, 248 pass. `npm run build` ok.
- Prod server on :3101. Gates run as separate commands in `npm run check` order (check's build step rewrites `.next` under a running server).
- `npm run test:align` (ALIGN_BASE_URL=http://localhost:3101): all pairs pass. `npm run test:hydration`: 0 hydration errors.
- `npm run probe:all` (ALIGN_BASE_URL=http://localhost:3101): 14 PASS (includes ag07.py), 2 REPORT (ag04_audit, screenshots), 1 FAIL (smoke: 50 PASS / 4 FAIL of 54), 1 SKIP (cc02-final, dev only).
- Smoke FAILs: /foods at 390 and 1280 (expected until cc2-01 merges). /setup/goal and /setup/profile at 1280: no header and no sidebar. Setup is not on the decided list, so the check stays strict. Brief expected only /foods; this is the difference (OPEN_QUESTIONS cc-14b).
- Edges: no layout change in this task.

## Quality Gate Summary (ag-07)
- Branch: `feat/ui-ag-07` on port 3100 (`ALIGN_BASE_URL=http://localhost:3100`).
- Gates:
  - `npm run typecheck`: clean (`tsc --noEmit` passed, 0 errors).
  - `npm run test`: 248 tests passed in 20 test files.
  - `npm run build`: 26 routes compiled cleanly.
  - `npm run test:align`: all pairs passed (<= 1px difference across 390 and 1440).
  - `npm run test:hydration`: all 28 route checks passed (0 hydration errors across 390 and 1440 with sessionStorage).
- Probes:
  - `ag07.py`: 46/46 checks passed at both 390 mobile and 1440 desktop:
    - Item 1 (/foods/[id]): `#fd-size` input fills 44px label (`h-full`, height 44px) and shows visible focus ring on wrapper (`focus-visible:ring-2 ring-blue`).
    - Item 2 (/foods/new): all inputs (`cf-name`, `cf-size`, `cf-kcal`, `cf-pro`, `cf-carbs`, `cf-fat`) linked to labels via `htmlFor`/`id`; clicking labels focuses inputs.
    - Item 3: `--color-destructive-text` (#C83A3F) for required `*` achieves 5.08:1 on #FFFFFF and 4.50:1 on #F3F1EC (both >= 4.5:1).
    - Item 4 (/signin): magic link email input has visible focus ring on Tab (`focus-visible:ring-2 focus-visible:ring-blue`).
  - Note: `ag06.py` is committed on branch `feat/ui-ag-06` (not yet merged into `feat/ui`, and out of allowed files list for ag-07).

## Quality Gate Summary (ag-06)
- Gates:
  - `npm run typecheck` ok (tsc --noEmit: 0 errors).
  - `npm run test` ok (vitest: 243 passed in 20 files).
  - `npm run build` ok (26/26 routes generated).
  - `test:align` ok on port 3100 (<= 1px difference on all pairs: daily-targets, setup-row, add-list, today-header, micros-header, trends-rows, entry, food-header, entry-header, profile-header, profile-row, weight-header, weight-row, meal-card, desktop-meal).
  - `test:hydration` ok on port 3100 (0 errors, 14 routes tested at 390 and 1440 with sessionStorage).
- Probes:
  - `ag06.py`: 15/15 assertions passed on production server (add search focus ring, checklist aria-labels & tap container, notifications time input overlayed tap target, entry grams focus ring, today mobile & desktop + Thêm >= 44x44 px tap targets, micros h1 title, paywall 22 vi chất copy, profile reminder Đã bật / Đã tắt state toggle).
- Edges:
  - /today 390 today-header, meal-card (10 pairs) pass; /today 1440 today-header, desktop-meal (15 pairs) pass.
  - /micros 390 micros-header (1 pair), micros-card (38 items) pass; /micros 1440 micros-header (1 pair), micros-card (38 items) pass.
  - /profile 390 profile-header (1 pair), profile-row (9 pairs) pass; /profile 1440 profile-row (9 pairs) pass.
  - /entry/item-1 390 and 1440 entry (3 pairs), entry-header (1 pair) pass.

## Quality Gate Summary (ag-01)
- `ALIGN_BASE_URL=http://localhost:3101 npm run check` on feat/ui with cc-04 and ag-01: all 5 gates passed (tsc --noEmit, vitest: 169 passed in 15 files, build: 19/19 routes, test:align: all pairs aligned, test:hydration: 0 errors incl. /training at 390 and 1440).
- Probes: cc02-final, cc03, cc04, cc05, cc06: no problems.
- Edges: training-content (phase-checklist, rest-day-card) and training-summary (salt-summary-card, sodium-progress-card) are not in tests/alignment.py, so not checked by the gate.


## Quality Gate Summary (cc2-07)
- Branch feat/ui-cc2-07 from feat/ui 4ccbbe5. Port 3102, prod build. Merged with --ff-only into feat/ui.
- Gates on prod :3102, each as its own command: typecheck ok; vitest 290 pass in 25 files (20 new: nav, redirects); build ok; test:align all pairs pass (adds /explore); test:hydration 0 errors (adds /, /explore, /settings); probe:all 21 PASS, 2 REPORT, 0 FAIL, 1 SKIP (cc02-final, dev only). Smoke 58 of 58 PASS.
- Edges: add-list on /explore (search, chips, first row) pass at 390 and 1440; micros-header, profile-row, weight-row unchanged and pass. The desktop back button sits above the title so the title keeps the card edge.
- Redirects checked on :3102: /today?date=... , /profile, /profile/weight, /foods all 308 with the query kept.
- Smoke: no new exemptions for new routes. /login is no longer skipped (its /diary link is a route now) and is added to the no-header list, the same as /signin (Dong's file). /foods special case removed (no page.tsx).
- This machine has no python3 on PATH: a python3 shim to the py-launcher Python was used for the run. scripts/probe.mjs and run_all.py now work on Windows.
- Screenshots: apps/web/.screenshots/cc2-07-nav-390-{overview,diary,explore,settings}.png, cc2-07-sidebar-1280-{overview,diary,explore,settings}.png, cc2-07-explore-390.png, cc2-07-explore-1280.png, cc2-07-micros-390.png.

## Quality Gate Summary (cc2-06)
- Branch feat/ui-cc2-06 from feat/ui 16cd49f. Port 3102, prod build. Merged with --ff-only into feat/ui.
- Gates on prod :3102, each step as its own command: typecheck ok; vitest 270 pass in 23 files; build ok; test:align pass; test:hydration 0 errors; probe:all 20 PASS, 2 REPORT, 0 FAIL, 1 SKIP (cc02-final, dev only). Smoke 54 of 54 PASS.
- cc2_03.py reads the dial's real panel colour and requires 3:1 on both ink and that panel (the ring check was added to cc2_03.py only; cc2_05.py has none). Screenshots: apps/web/.screenshots/cc2-06-today-390.png, cc2-06-today-1440.png.

## Quality Gate Summary (cc2-05)
- Branch feat/ui-cc2-05 from feat/ui b3fb6bc, one commit per item. Port 3102, prod build. Merged with --ff-only into feat/ui.
- Gates on prod :3102, each step as its own command: typecheck ok; vitest 270 pass in 23 files (2 new in date.test.ts); build ok; test:align pass; test:hydration 0 errors; probe:all 20 PASS, 2 REPORT, 0 FAIL, 1 SKIP (cc02-final, dev only). Smoke 54 of 54 PASS.
- cc2_05.py: edits the profile through the UI (70 kg, Tăng cơ, 90 phút); /today at 1440 shows "Ngày tập 90′ · Tăng cơ · 70 kg", the salt card for 90 phút and the 8,5 g total; /training follows.
- Found by the tests: the desktop label showed the weight with an English decimal (70.5 kg). Now formatNumber.
- Text-white rename: 18 routes at 390 and 1440 before and after. 33 of 36 files byte-identical; the other 3 differ by 3-48 pixels, and the same page differs from itself by the same amount (render noise).
- Dial ring: --color-track-on-dark #60646E is 3.14:1 on ink, but 2.88:1 on the surface-dark panel the dial sits on. Kept as decided; #666A75 passes both (OPEN_QUESTIONS cc2-05). cc2_03.py now checks the ring against ink.
- Screenshots: apps/web/.screenshots/cc2-05-today-390.png, cc2-05-today-1440.png, cc2-05-admin-390.png, cc2-05-admin-1280.png.

## Quality Gate Summary (cc2-04)
- Branch feat/ui-cc2-04 from feat/ui 7271002. Port 3102, prod build. Merged with --ff-only into feat/ui.
- Gates on prod :3102, each step as its own command: `npm run typecheck` ok; `npm run test` 268 pass in 23 files; `npm run build` ok; `npm run test:align` all pairs pass (≤ 1 px); `npm run test:hydration` 0 errors; `npm run probe:all` 19 PASS, 2 REPORT (ag04_audit, screenshots), 0 FAIL, 1 SKIP (cc02-final, dev only). Smoke 54 of 54 PASS.
- cc2_04.py: 25 of 25 checks. No bg-white on /today, /micros, /add, /foods/new, /settings/notifications, /paywall, /profile at 390 and 1440. Training and micros subtitles show Giữ cân · 65 kg from the profile, and no 10/10/2026. Today desktop shows 7–10,5 g, 4–6 g, 3–4,5 g and 5.200–6.500 mg from the calculators, and the dial label reads 1.041 (vi format).
- Sweep results. Raw hex: none in components except the Google logo colours (brand, kept); in app only admin/review, dev/ui and login (Dong's, not edited). font-mono: only login and admin/review. English number formats in UI copy: none found (the one toLocaleString is vi-VN, now formatNumber). text-white on ink, blue and surface-dark is kept (no on-dark token yet). All of these are in OPEN_QUESTIONS (cc2-04).
- Note: a few values in the Today and micros desktop copy were fixed numbers that duplicated the calculators. They now come from the calculators and the profile, which gives the same text for the sample user.

## Quality Gate Summary (cc2-03)
- Branch feat/ui-cc2-03 from feat/ui 814b3c1. Port 3102, prod build. Merged with --ff-only into feat/ui.
- Gates on prod :3102, each step as its own command: `npm run typecheck` ok; `npm run test` 268 pass in 23 files; `npm run build` ok; `npm run test:align` all pairs pass (≤ 1 px); `npm run test:hydration` 0 errors; `npm run probe:all` 18 PASS, 2 REPORT (ag04_audit, screenshots), 0 FAIL, 1 SKIP (cc02-final, dev only). Smoke 54 of 54 PASS.
- cc2_03.py: 14 of 14 checks at 390 and 1440. Profile labels are rgb(196, 55, 60) (#C4373C, the destructive-text token). Dial track is rgb(140, 146, 160) (muted-on-dark): 5.96:1 on ink, 5.46:1 on the inset panel, against 1.33:1 for the old level-empty-dark (the audit said 1.8:1; measured here). The date button is aria-busy="true" before its label resolves (seen by a MutationObserver) and has no aria-busy after mount.
- Decisions: "Xoá tài khoản" on Profile also uses destructive-text (same small red text, same row group). No new token was needed, since muted-on-dark passes. The track is now a lighter gray ring behind the blue arc; screenshot `apps/web/.screenshots/cc2-03-today-dial-390.png`.

## Quality Gate Summary (cc2-02)
- Branch feat/ui-cc2-02 from feat/ui ccf9115. ag-06's six commits rebased onto it (cherry-pick, no merge commits). Conflicts: docs/audit-ag04.md (per row, the status marker wins; where both sides had one, feat/ui kept, so ag-07's foods fixes stay "Đã sửa") and PROGRESS.md (both sides kept). Merged with --ff-only into feat/ui. Port 3102, prod build.
- Gates on prod :3102, each step as its own command: `npm run typecheck` ok; `npm run test` 268 pass in 23 files; `npm run build` ok (26 routes); `npm run test:align` all pairs pass (≤ 1 px); `npm run test:hydration` 0 errors; `npm run probe:all` 17 PASS, 2 REPORT (ag04_audit, screenshots), 0 FAIL, 1 SKIP (cc02-final, dev only by design). Smoke 54 of 54 PASS.
- ag06.py: 46 of 46 checks pass. One visible h1 on /today (normal, loading, empty, offline), /micros, /micros/calcium, /add, /training, /profile, /profile/weight, /trends, /entry/item-1, /foods/food-cha-la, /setup/goal, /setup/profile at 390 and 1440. Reminders: server HTML has no "Đã bật" or "Đã tắt"; after mount the row shows "Đã bật".
- The "two h1" on Today did not reproduce in this code. At 390 the only h1 is the sr-only "Hôm nay" (the daily header gets no title on phones, so it renders no h1). At 1440 the only visible h1 is "HÔM NAY" (the sr-only one is inside the lg:hidden container). The real duplicate was the empty state at 1440 (sr-only "Hôm nay — Ngày đầu tiên" next to the daily header's h1), now hidden at lg. Two smaller gaps were fixed: the desktop loading skeleton had no h1, and /add on a phone had none.
- Environment, not repo: `scripts/free-port.js` calls `lsof`, which is missing on Windows, so it reports "Port is free" while the port is in use. The stale server was stopped by PID with PowerShell (Get-NetTCPConnection). Fix the script before relying on `port:free` on Windows.

## Quality Gate Summary (cc2-01 finish)
- Branch feat/ui-cc2-01, rebased onto origin/feat/ui 8cf2c92 (OPEN_QUESTIONS and PROGRESS conflicts kept both sides). Merged with --ff-only into feat/ui. Port 3102, prod build.
- Playwright and Chromium installed on this machine (approved by Hao): `py -m pip install playwright`, `py -m playwright install chromium`. Nothing committed for it.
- Gates on prod :3102, each step as its own command (the build ran before the server started): `npm run typecheck` ok; `npm run test` 268 pass in 23 files; `npm run build` ok (26 routes); `npm run test:align` all pairs pass (≤ 1 px); `npm run test:hydration` 0 errors; `npm run probe:all` 16 PASS, 2 REPORT (ag04_audit, screenshots), 0 FAIL, 1 SKIP (cc02-final, dev only by design).
- Smoke: `tests/probes/smoke.py` 54 of 54 PASS at 390 and 1280. /foods (redirect) passes because the header rule is judged on the page it lands on (/add, bottom sheet below 1024 px). Setup goal and profile have no header at 1024 px and up (decided 12/10, OPEN_QUESTIONS cc-14b).
- Edges: /micros/calcium 390 nutrient-header (1 pair), nutrient-card (1 pair) pass; /micros/calcium 1440 nutrient-header (1 pair), nutrient-card (1 pair) pass.
- Environment, not repo: `python3` here is the Microsoft Store stub, so the npm Python scripts ran through a `python3.cmd` shim (`py -3`) kept outside the repo. `PYTHONIOENCODING=utf-8` is needed for hydration.py (the console is cp1252). `npm run probe -- <file>` rejects Windows backslash paths and cannot run `python3` here, so smoke was run with `py -3` directly.

## Quality Gate Summary (cc2-01)
- Branch feat/ui-cc2-01 (Claude Code #2, port 3102), rebased onto origin/feat/ui d78342c (cc-12b); PROGRESS conflicts kept both rows. Not merged, not pushed: the Playwright gates could not run (below).
- Gates run: tsc --noEmit ok; vitest 271 pass in 23 files (new: nutrient-rows 4, nutrient-detail 13, nutrient-sources 6; format and date labels changed first); build ok (26 routes, prod start on :3102 checked).
- Not run: test:align, test:hydration and every probe (cc2_01 and the older ones). Python here has no playwright module, and AGENTS.md says not to install it. `npm run check` was not run as one command for the same reason. cc2_01.py only passes py_compile.
- Checked by hand in the built-in browser (not saved as files): /micros/calcium at 390 (28 %, 331 / 1.200–1.500 mg, 7-day history, Đã có từ món ăn hôm nay) and at 1440 (560 px column); /micros/water (no target) shows 1.450 g today and "—" for yesterday's unknown day (no 0). 59 unique /micros/ links on /micros.
- /foods: 308 to /add on dev and prod. Dates: "Hôm nay 12/10" pattern in lib/format.ts and tests.
- ag-06: origin/feat/ui-ag-06 does not exist, so step 5 was not run.
- Edges: not checked (test:align is not run); the detail page has no data-align-group yet.

## Quality Gate Summary (cc-12b)
- Gates on feat/ui-cc-12b, rebased onto origin/feat/ui (already up to date): tsc --noEmit ok, vitest 248 pass in 20 files (trends.test.ts 25 pass), build ok (26 routes), test:align all pairs pass (≤ 1 px; /trends trends-rows 390 4 pairs, 1440 4 pairs), test:hydration 0 errors (/trends 390 and 1440). Each step of `npm run check` was run as its own command, because the build would overwrite the .next folder under the running server.
- Probes on prod :3101: cc03–cc12, cc12a, cc12b and screenshots.py all pass. cc02-final passes on dev :3101 only.
- cc12b (16 checks): the 2.380 kcal bar uses the đạt token (bg-blue) and is labelled "trong mục tiêu"; no red bar above the minimum; the calcium row reads "Mục tiêu: 1.200–1.500 mg" on /trends and "1.200–1.500 mg" on /micros; the kcal legend lists exactly Trong mục tiêu, Thiếu, Hôm nay (đang ghi); date window ends today with "nay"; nav; Saira and Manrope.
- cc12a: its calcium assertion changed from "1.200 mg" to "1.200–1.500 mg" (the range is now part of the spec); the rest is unchanged and still passes.
- Edges: /trends 390 trends-rows (4 pairs) pass; /trends 1440 trends-rows (4 pairs) pass; /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass.
- Screenshots: `apps/web/.screenshots/cc12b-trends-390.png`, `cc12b-trends-1440.png`.

## Quality Gate Summary (cc-12a)
- Merges: feat/ui-ag-03 (Trends, 3 commits, a clean merge) and feat/ui-ag-04 (audit docs, 1 commit, a clean merge). No conflicts; no Antigravity code changed.
- Gates on feat/ui-cc-12a: tsc --noEmit ok, vitest 243 pass in 20 files (trends.test.ts 20 pass, including the date window, kcal rule and profile targets), build ok (26 routes), test:align all pairs pass (≤ 1 px; /trends trends-rows 390 4 pairs and 1440 4 pairs), test:hydration 0 errors (/trends at 390 and 1440). Each step of `npm run check` was run as its own command, because the build would overwrite the .next folder under the running server.
- Probes on prod :3101: cc03–cc12, cc12a and screenshots.py pass. cc02-final passes on dev :3101 only.
- cc12a: window 05–11/10 ends today and the last bar reads "11 · nay"; calcium 1.200 mg on /trends and 1.200–1.500 mg on /micros; no red bar above the range; /micros → Xu hướng → /trends → back to /micros; title and protein number in Saira Condensed, body and headings in Manrope.
- Edges: /trends 390 trends-rows (4 pairs) pass; /trends 1440 trends-rows (4 pairs) pass; /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass.
- Screenshots: `apps/web/.screenshots/cc12a-trends-390.png`, `cc12a-trends-1440.png`, `cc12a-micros-link-390.png`.

## Quality Gate Summary (cc-12)
- Gates on feat/ui-cc-12: tsc --noEmit ok, vitest 223 pass in 19 files, build ok (25 routes), test:align all pairs pass (≤ 1 px, prod :3101), test:hydration 0 errors. Probes on prod :3101: cc03, cc04, cc05, cc06, cc07, cc08, cc09, cc10, cc11, cc12, screenshots.py all pass. cc02-final passes on dev :3101 only (its dev link is hidden in production, as before).
- Parity result: 10 fixed, 15 left as decided, 12 questions (docs/parity-cc12.md; OPEN_QUESTIONS cc-12).
- Calendar check (cc12.py): 1440 centred dialog, 390 bottom sheet, Esc closes and focus returns to the date.
- Edges: /micros 390 micros-header, micros-card pass; /micros 1440 micros-header, micros-card pass; /today 390 today-header, meal-card pass; /today 1440 today-header, desktop-meal pass; /profile 390 profile-header, profile-row pass; /profile 1440 profile-row (9 pairs) pass; /setup/profile 1440 setup-row (2 pairs) pass; /setup/goal 1440 daily-targets (3 pairs) pass; /foods/food-cha-la 390 and 1440 food-detail (3 pairs) pass.
- Probe change: cc07 now finds the stat line by its prefix "đã đạt" (the copy is "đã đạt mục tiêu").
- Screenshots: `apps/web/.screenshots/cc12-<screen>-{390,1440}.png` (sweep), `cc12-CalendarPicker-1440.png`, `cc12-copy-report.txt`.

## Quality Gate Summary (cc-11)
- Gates on feat/ui-cc-11, production build on :3101: tsc --noEmit ok, vitest 223 pass in 19 files, build ok (25 routes), test:align all pairs pass (<= 1 px; new past-day rows included), test:hydration 0 errors, cc03–cc11 pass (cc11: no problems), cc02-final passes on the dev server (dev only, as before). Each step of `npm run check` was run as its own command, because test:align needs a running server.
- Edges: /today 390 today-header (1 pair), meal-card (10 pairs) pass; /today 1440 today-header (1 pair), desktop-meal (15 pairs) pass; past day /today?date=<yesterday> 390 today-header (1 pair), meal-card (9 pairs) pass; 1440 today-header (1 pair), desktop-meal (15 pairs) pass; /profile 390 and 1440 profile-row (9 pairs) pass.
- Screenshots: `apps/web/.screenshots/cc11-past-locked-390.png`, `cc11-desktop-calendar-1440.png`, `cc11-lacking-390.png`.

## Quality Gate Summary (cc-10)
- Gates on feat/ui-cc-10, production build served on :3101: tsc --noEmit ok, vitest 217 pass in 18 files, build ok (25 routes), test:align all pairs pass (<= 1 px), test:hydration 0 errors, cc03–cc10 pass (cc10: no problems), screenshots.py ok. cc02-final: fails on the production build by design (its dev-only sign-in link "Mô phỏng mở link (dev)" is hidden there); passes on the dev server (:3101). Its first dev run timed out on a cold compile of /setup/profile; the rerun passed. Each step of `npm run check` was run as its own command, because test:align needs a running server.
- Edges: /today 390 today-header (2 pairs), meal-card (10 pairs) pass; /today 1440 today-header (2 pairs), desktop-meal (15 pairs) pass; /profile 390 profile-row (9 pairs) pass; /profile 1440 profile-row (9 pairs) pass. Past-day views (390 and 1440) are not in tests/alignment.py, so they were checked on screenshots only: cc10-past-day-390.png, cc10-past-empty-390.png, cc10-today-1440.png.
- Screenshots: `apps/web/.screenshots/cc10-copy-sheet-390.png`, `cc10-past-day-390.png`, `cc10-calendar-390.png`, `cc10-today-1440.png`, `cc10-past-empty-390.png`.

## Quality Gate Summary (cc-04)
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: all 5 gates passed (tsc --noEmit, vitest: 158 passed in 14 files, build: 19/19 routes, test:align: all pairs aligned incl. food-header and entry-header, test:hydration: 0 errors).
- Probes: cc02-final, cc03, cc04 (back buttons, step bars, heart, meal chip grid, /add sticky coverage over 122 scroll positions), cc05, cc06: no problems.
- Edges: food-header (mobile & desktop 1 pair each pass), entry-header (mobile & desktop 1 pair each pass), entry (mobile & desktop 3 pairs each pass), add-list (mobile & desktop pass), setup-row (desktop pass), daily-targets (mobile & desktop pass), food-detail (mobile & desktop pass).
- Screenshots: `apps/web/.screenshots/cc04-food-detail-390.png`, `cc04-setup-profile-390.png`, `cc04-entry-1440.png`, `cc04-add-sticky-390.png`.


## Quality Gate Summary (ui-04b-fix-1)
- `npm run check`: All 5 gates passed (tsc --noEmit, vitest: 107 passed in 12 files, build: 19/19 routes static/dynamic, test:align: 16 checks passed, test:hydration: 0 errors).
- Edges: today-header (mobile & desktop 1 pair each pass), micros-header (mobile & desktop 1 pair each pass), daily-targets (mobile & desktop), setup-row, add-list (mobile & desktop), meal-card (mobile), micros-card (mobile & desktop), portion (mobile & desktop), food-detail (mobile & desktop), desktop-meal (desktop) all pass.
- Screenshots: `apps/web/.screenshots/today-header-390.png`, `apps/web/.screenshots/today-header-1440.png`, `apps/web/.screenshots/micros-header-390.png`, `apps/web/.screenshots/micros-stuck-390.png`.
- Edges: today-header (1 pair pass), micros-header (1 pair pass), daily-targets (mobile & desktop), setup-row, add-list (mobile & desktop), meal-card (mobile), micros-card (mobile & desktop), portion (mobile & desktop), food-detail (mobile & desktop), desktop-meal (desktop) all pass.


## Quality Gate Outputs (ui-05-fix-4)
- Raw `npm run check` output:
```
> nutrition-web@0.1.0 check
> npm run typecheck && npm run test && npm run build && npm run test:align && npm run test:hydration


> nutrition-web@0.1.0 typecheck
> tsc --noEmit


> nutrition-web@0.1.0 test
> vitest run


 RUN  v5.0.3 /Users/haovu310/Documents/HITMicro/nutrition-fortifykitchen/apps/web


 ❯ lib/__tests__/portion.test.ts [queued]

 Test Files 0 passed (7)
      Tests 0 passed (0)
   Start at 13:49:55
   Duration 0ms
 ✓ lib/__tests__/levels.test.ts (10 tests) 3ms
 ✓ lib/__tests__/targets.test.ts (9 tests) 3ms
 ✓ lib/__tests__/format.test.ts (4 tests) 12ms
 ✓ lib/__tests__/portion.test.ts (5 tests) 2ms
 ✓ lib/__tests__/meal-slot.test.ts (8 tests) 13ms
 ✓ lib/__tests__/search.test.ts (7 tests) 3ms
 ✓ lib/__tests__/nutrients.test.ts (10 tests) 13ms

 Test Files  7 passed (7)
      Tests  53 passed (53)
   Start at  13:49:55
   Duration  169ms (transform 65%, import 17%, tests 13%, worker 5%)


> nutrition-web@0.1.0 build
> next build --webpack

▲ Next.js 16.4.0 (webpack)
✓ Running next.config took 4ms

  Creating an optimized production build ...
✓ Compiled successfully in 1092ms
  Finished TypeScript in 251ms    ✓ Finished TypeScript in 251ms 
  Collecting page data using 11 workers in 423ms    ✓ Collecting page data using 11 workers in 423ms 
✓ Generating static pages using 11 workers (13/13) in 129ms
  Collecting build traces in 2.4s    ✓ Collecting build traces in 2.4s 
  Finalizing page optimization in 2.4s    ✓ Finalizing page optimization in 2.4s 

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /add
├ ○ /admin/review
├ ○ /dev/ui
├ ○ /foods
├ ƒ /foods/[id]
├ ○ /foods/new
├ ○ /login
├ ○ /micros
├ ƒ /micros/[nutrient]
├ ○ /profile
├ ○ /today
└ ○ /training


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


> nutrition-web@0.1.0 test:align
> python3 tests/alignment.py

=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 38})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 15})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 38})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

All alignment checks passed cleanly (<= 1px difference)!

> nutrition-web@0.1.0 test:hydration
> python3 tests/probes/hydration.py

=== Running Hydration Reload Check against http://localhost:3100 ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /today
[PASS] 0 hydration errors on /add with sessionStorage loaded
[PASS] Recent search chip 'Hạt điều test' is visible on /add

All hydration checks passed cleanly (0 hydration errors, sessionStorage entries rendered)!
```

## Quality Gate Outputs (ui-05-fix-3)
- `npx tsc --noEmit`: 0 errors (clean).
- `npm test`:
```
 Test Files  7 passed (7)
      Tests  53 passed (53)
   Duration  209ms
```
- Invariant tests passed:
  - All nutrient keys in `MOCK_FOODS` and `SAMPLE_DAY` exist in `NUTRIENT_CATALOG`.
  - Adding Chà là 30 g increases diary `b6` (1.1 → 1.15 mg, 88%).
- `npm run build`: 13/13 pages compiled statically, 0 errors.
- `npm run probe -- tests/probes/hydration.py`:
  - 0 hydration console errors on `/today` and `/add` with sessionStorage loaded.
  - Seeded entry 'Chà là hạt dẻ test' visible on `/today`.
  - Recent search chip 'Hạt điều test' visible on `/add`.
- Alignment self-check (`npm run test:align`):
  - Mobile (390px):
    - Edges: `/today` (`meal-card` 10 elements) pass.
    - Edges: `/micros` (`micros-card` 38 elements) pass.
    - Edges: `/add` (`portion` 5 elements) pass.
    - Edges: `/foods/food-cha-la` (`food-detail` 3 elements) pass.
  - Desktop (1440px):
    - Edges: `/today` (`desktop-meal` 15 elements: title `Bữa ăn`, meal headers, meal items, + Thêm món) pass.
    - Edges: `/micros` (`micros-card` 38 elements) pass.
    - Edges: `/add` (`portion` 5 elements) pass.
    - Edges: `/foods/food-cha-la` (`food-detail` 3 elements) pass.
- Screenshots verified:
  - `apps/web/.screenshots/today-desktop-1440.png`: card title "Bữa ăn", meal headers ("Bữa sáng", "Bữa trưa", "Trước tập") and food items share exact left text edge.
  - `apps/web/.screenshots/micros-mobile-b6-increase-390.png`: Vitamin B6 row increased to 1,15 / 1,3 mg · 88% after adding Chà là 30g; Vitamin B* naming consistent.

| 11/10/2026 | cc-01 | Onboarding in Cobalt Sign: /signup (split on desktop), /signin, /signin/check-email, /signin/expired, /setup/profile and /setup/goal (one card on desktop). Mock auth and profile save behind lib/api-client.ts. Goal kcal and daily targets from lib/targets.ts. Local sub-screen header | Swap the local header for AppHeader (ui-04b). Wire Supabase auth and profile save (Dong) |
| 11/10/2026 | cc-02 | Food categories (10 keys, order and labels in lib/food-categories.ts, web-side mock). /add: one scrolling filter row (Tất cả, Yêu thích, categories with foods) and recents as { foodId, servingLabel }. Tất cả groups by category with sticky headers. Shared FoodList and ChipRow on phone and desktop | Dong: category column on foods (OPEN_QUESTIONS). Favourites store for Yêu thích |
| 11/10/2026 | cc-02 fix | Search clear: one × (native hidden). /add opens with no food: phone panel after a tap, desktop empty state. Yêu thích hidden until favourites exist. Filter row wraps from 1024 px; phone scrolls with a left fade once scrolled. formatAmount for amounts with units (kcal and mg whole, g and µg one decimal under 100, under 1 up to two decimals). Vitamin B6 label. Sticky header on card with divider. bottom-nav storage guarded | Dong: category column. Favourites store |
| 11/10/2026 | cc-02 final | Rebased onto feat/ui 42ac9d6 (ui-05-fix-4). Re-applied cc-02 on the useMealSlot add page. Folate label is now "Vitamin B9". Hydration probe moved to h1t_recent_foods_v2. Onboarding and add-list alignment checks re-added with pair counts. BACKLOG: typed vitamins map | Dong: category column. Favourites store |
| 11/10/2026 | cc-03 | Favourites (Yêu thích): `lib/favourites.ts` stores ids in localStorage under `h1t_favourite_foods_v1` (validated, guarded, loaded after mount through diary-store). Heart on /foods/[id] with the existing Toast. /add: Yêu thích chip after Tất cả, flat favourites list ranked by search, empty state with Bỏ lọc. Grouped rows show a 14 px heart. | Dong: favourites table when accounts exist. Cross-tab sync (storage event) not built |
| 11/10/2026 | cc-05 | Edit entry and undo, part 1: `/entry/[id]` (portion, meal, Lưu, Xoá món này, unknown id). Sample items get an edit layer in sessionStorage (`h1t_sample_edits_v1`), resolved by name to MOCK_FOODS. Totals, meal kcal and Micros come from the edits. Undo for the last delete, in the toast (5 s). Pure logic in `lib/diary-edits.ts`. | Antigravity: link Today rows to /entry/{item.id} (after ui-04b). Part 2 with Today wiring |

| 11/10/2026 | cc-06 | Merge cc-03 and cc-05 onto ui-04b. Ownership update. Review fixes (pure runtime date, AppHeader props, Micros stuck header, inline meal chips, one toast). Today rows open Edit entry. | Part 2 of entry flow done; next task from the user |
## Quality Gate Outputs (ui-05)
- `npx tsc --noEmit`: 0 errors (clean).
- `npx vitest run`:
```
 Test Files  7 passed (7)
      Tests  48 passed (48)
   Duration  150ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 876ms
  Finished TypeScript in 193ms
  Collecting page data using 11 workers in 429ms
✓ Generating static pages using 11 workers (13/13) in 148ms
  Collecting build traces in 2.4s
  Finalizing page optimization in 2.4s
```
- Visual verification screenshots (Playwright):
  - `apps/web/.screenshots/ui05-search-empty-390.png` (390x844: SearchEmpty for "banh trang tron" with suggestions & + Tạo món mới)
  - `apps/web/.screenshots/ui05-meal-switcher-390.png` (390x844: MealSwitcher sheet with 5 slots & time hint)
  - `apps/web/.screenshots/ui05-food-detail-390.png` (390x844: FoodDetail for Chà là with servings, macros & micros breakdown)
  - `apps/web/.screenshots/ui05-today-added-390.png` (390x844: Today screen showing floating Toast, 1.125 kcal total, 178 kcal Trước tập)
  - `apps/web/.screenshots/ui05-micros-updated-390.png` (390x844: Vi chất report showing Kali updated to 4.097 mg / 79%)
  - `apps/web/.screenshots/ui05-create-food-error-390.png` (390x844: CreateFood form with required field validation alert)
  - `apps/web/.screenshots/ui05-desktop-add-dialog-1440.png` (1440x900: Desktop AddFood dialog modal over Today)
  - `apps/web/.screenshots/ui05-search-empty-1440.png` (1440x900: Desktop SearchEmpty state in 2-pane modal)
  - `apps/web/.screenshots/ui05-food-detail-1440.png` (1440x900: Desktop FoodDetail screen)
  - `apps/web/.screenshots/ui05-create-food-error-1440.png` (1440x900: Desktop CreateFood screen with validation error)
  - `apps/web/.screenshots/ui05-today-1440.png` (1440x900: Desktop Today screen with meal + Thêm links)
  - `apps/web/.screenshots/ui05-micros-1440.png` (1440x900: Desktop Micros 2-column balanced report)

## Quality Gate Outputs (ui-05-fix)
- `npx tsc --noEmit`: 0 errors (clean).
- `npm test`:
```
 Test Files  7 passed (7)
      Tests  49 passed (49)
   Duration  185ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 944ms
  Finished TypeScript in 193ms
  Collecting page data using 11 workers in 510ms
✓ Generating static pages using 11 workers (13/13) in 139ms
  Collecting build traces in 2.3s
  Finalizing page optimization in 2.3s
```
- `npm run test:align`:
```
=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 65})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 14})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 65})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

=== Hydration reload tests with sessionStorage ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] 0 hydration errors on /add with sessionStorage loaded

All alignment and hydration tests passed cleanly (<= 1px difference, 0 hydration errors)!
```
- Alignment Edge Self-Check:
  - /today: Edges: meal-card (10 rows), desktop-meal (14 rows) pass.
  - /micros: Edges: micros-card (65 rows) pass.
  - /add: Edges: portion (5 rows) pass.
  - /foods/[id]: Edges: food-detail (3 rows) pass.
- Visual inspection screenshots (Playwright):
  - `apps/web/.screenshots/portion-panel-390.png` (390x844: mobile portion panel dock with 5-row alignment, ChipGroup, StatGroup, full-width CTA)
  - `apps/web/.screenshots/portion-panel-1440.png` (1440x900: desktop right pane portion panel with 5-row alignment and 2-column micros table underneath)

## Quality Gate Outputs (ui-05-fix-2)
- `npm run typecheck` (`tsc --noEmit`): 0 errors (clean).
- `npm run test` (`vitest run`):
```
 Test Files  7 passed (7)
      Tests  51 passed (51)
   Duration  145ms
```
- `npm run build` (`next build --webpack`):
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 1354ms
  Finished TypeScript in 224ms
  Collecting page data using 11 workers in 373ms
✓ Generating static pages using 11 workers (13/13) in 129ms
  Collecting build traces in 2.4s
  Finalizing page optimization in 2.4s
```
- Content-based alignment pre-fix failure captured:
```
[FAIL] /today @ desktop (1440px): ['Group "desktop-meal" left mismatch: diff 8.00px between <h3 class="m-0 text-[15px] font-bold text-text"> (301.0) and <span class="truncate text-text font-normal"> (309.0)', ...]
```
- `npm run test:align` post-fix:
```
=== Starting Alignment and Hydration Tests ===
[PASS] /today @ mobile (390px) (checked groups: {'meal-card': 10})
[PASS] /micros @ mobile (390px) (checked groups: {'micros-card': 65})
[PASS] /add @ mobile (390px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ mobile (390px) (checked groups: {'food-detail': 3})
[PASS] /today @ desktop (1440px) (checked groups: {'desktop-meal': 14})
[PASS] /micros @ desktop (1440px) (checked groups: {'micros-card': 65})
[PASS] /add @ desktop (1440px) (checked groups: {'portion': 5})
[PASS] /foods/food-cha-la @ desktop (1440px) (checked groups: {'food-detail': 3})

=== Hydration reload tests with sessionStorage ===
[PASS] 0 hydration errors on /today with sessionStorage loaded
[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /today
[PASS] 0 hydration errors on /add with sessionStorage loaded
[PASS] Recent search chip 'Hạt điều test' is visible on /add

All alignment and hydration tests passed cleanly (<= 1px difference, 0 hydration errors)!
```
- Alignment Edge Self-Check:
  - /today: Edges: desktop-meal (14 rows), meal-card (10 rows) pass.
  - /micros: Edges: micros-card (65 rows) pass.
  - /add: Edges: portion (5 rows) pass.
  - /foods/[id]: Edges: food-detail (3 rows) pass.
- Visual inspection screenshots (Playwright):
  - `apps/web/.screenshots/add-portion-mobile.png` (390x844: mobile dock with 4 derived serving columns, aligned 4-col macro stats, 0,7g & 0,1g decimal commas)
  - `apps/web/.screenshots/add-portion-desktop.png` (1440x900: desktop right pane portion panel with 4 columns, B6 (Pyridoxine) synonym, 0,05 mg precision)
  - `apps/web/.screenshots/today-meals-desktop.png` (1440x900: desktop meal list with item links and + Thêm món aligned to exact same left edge as meal title)


## Quality Gate Outputs (cc-01)
- `npm run typecheck`: exit 0.
- `npm test`: 8 files, 61 tests passed (`lib/__tests__/onboarding.test.ts`: 12 tests, written first from the coach rules in SPEC.md).
- `npm run build`: compiled, TypeScript finished. `/signup`, `/signin`, `/signin/check-email`, `/signin/expired`, `/setup/profile`, `/setup/goal` are all static.
- `BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`, since Homebrew python3 has no Playwright): all checks pass, 0 hydration errors. cc-01 pairs compared: `/setup/goal` @ 390 [daily-targets, left/right] 3 pairs; `/setup/goal` @ 1440 [daily-targets, left/right] 3 pairs; `/setup/profile` @ 1440 [setup-row, top/bottom] 2 pairs.
- `setup-row` top and bottom at 1440: all three rows at y 211.5–285.5. Sex chip height 52 px, same as the inputs.
- Screenshots: `apps/web/.screenshots/cc01-fix2-setup-goal-390.png`, `cc01-fix2-setup-profile-1440.png`. Chip comparison: `cc01-fix2-{base,border,md}-{add,food}-{390,1440}.png` (base = feat/ui chip, border = committed border fix, md = final).
- `size="md"` ChipGroup is byte-identical to the feat/ui (ui-05-fix) render of `/add?meal=snack` and `/foods/food-cha-la` at 390 and 1440. The `size="lg"` chips do not affect those screens.
- Playwright (port 3101), 390×844 and 1440×900: `/signup` copy has no "26 chất"; "Mở ứng dụng Mail" goes to `mailto:`; dev link goes to `/setup/profile`; profile back goes to `/signin/check-email`; a weight error clears on the next valid edit; the iron note shows only for Nữ; on 1440, Enter in the weight field lands on `/today`. No console errors.
- Full flow passed earlier: signup → check-email → profile → goal → /today.
- Screenshots: `apps/web/.screenshots/cc01-gate-{signup,setup-profile}-{390,1440}.png`
- Edges: daily-targets (setup-goal at 390 and 1440) pass, left/right, 3 pairs each. setup-row (setup-profile at 1440) passes, top/bottom, 2 pairs.
- Edges: signup, signin, check-email, expired have no data-align-group rows (n/a).
- Cleanup: "Mở ứng dụng Mail" is phone only (`lg:hidden`, checked at 390 visible and 1440 hidden). `size="lg"` inactive chip has a 2 px grabber border (52 px, `#D5D8DF`). `size="md"` re-checked byte-identical to feat/ui for /add and /foods/food-cha-la at 390 and 1440.

## Quality Gate Outputs (cc-02)
- `npm run typecheck`: exit 0.
- `npm test`: 10 files, 80 tests passed. 19 are new: `lib/__tests__/food-categories.test.ts` (11) and `lib/__tests__/recent-foods.test.ts` (8), written first.
- `npm run build`: compiled, TypeScript finished.
- `BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`): add-list pairs compared, left edges aligned: `/add?meal=snack` @ 390, 3 pairs; @ 1440, 3 pairs. 0 hydration errors.
- Playwright at 390 and 1440: scrolled grouped list, the stuck header is opaque and on top of the rows. Rau củ shows 3 foods. Chuoi with Trái cây shows Chuối, with the category in its meta line. Tapping the recent "Yến mạch 60 g" sets 60 g in the portion panel, and the search box stays empty. Empty category + query shows "Bỏ lọc", which returns to Tất cả. No console errors.
- `size="md"` ChipGroup is not changed on this branch.
- Screenshots: `apps/web/.screenshots/cc02-add-{all,category,search}-{390,1440}.png`.

## Quality Gate Outputs (cc-02 fix)
- Rebased onto `feat/ui` 39322e7 (ui-05-fix-2). Conflicts: PROGRESS (kept every row and block), add page (cc-02 re-applied on Antigravity's PortionPanel structure), chip-group (inline grid kept, size prop added), alignment.py (Antigravity's version kept, onboarding and add-list checks re-added), recents hydration test (moved to `h1t_recent_foods_v2`).
- `npm run typecheck`: exit 0. `npm run test`: 90 passed.
- `npm run build`: compiled. Ran against the production build too, but Playwright's `networkidle` timed out on `next start` in this sandbox, so `test:align` and the probe ran on the dev server at 3101.
- `ALIGN_BASE_URL=http://localhost:3101 npm run test:align` (with `PATH=/usr/bin:$PATH`): all pass, 0 hydration errors. Pairs: daily-targets 390 3, daily-targets 1440 3, setup-row 1440 2 (top/bottom), add-list 390 3, add-list 1440 3.
- `npm run probe -- tests/probes/cc02-final.py`: no problems. One × in the search box at 390 and 1440, native clear hidden. /add opens with no panel at 390 and the empty state at 1440. Chà là 30 g shows 0,3 mg and Vitamin B6 at 1440. All 10 filter chips inside the viewport at 1440, Yêu thích hidden. Recent Yến mạch 60 g opens the panel at 60 g at both widths, search box stays empty. Left fade appears only after scrolling at 390. Today kcal has no decimals. Onboarding flow reaches /today.
- Screenshots: `apps/web/.screenshots/cc02-final-add-open-390.png`, `cc02-final-add-chala-1440.png`, `cc02-final-today-390.png`.
- Not re-checked on this branch: the `size="md"` ChipGroup byte-identity. The class string is the same as before, but the add page has changed, so there is no clean baseline.

## Quality Gate Outputs (cc-02 final)
- Rebased onto `feat/ui` 42ac9d6 (ui-05-fix-4). Conflicts: OPEN_QUESTIONS and PROGRESS (kept both sides), add page (cc-02 re-applied on the `useMealSlot` / `overrideSlot` version), nutrients.ts and its test (Antigravity's taken, B6 change dropped), diary-store (Antigravity's composite logic kept, unit strings switched to formatAmount), alignment.py (Antigravity's taken, onboarding checks re-added).
- `tests/probes/hydration.py`: seeds `h1t_recent_foods_v2` with `{ foodId: 'food-hat-dieu', servingLabel: '30 g' }` and checks the chip "Hạt điều rang".
- `vitamin folate`: label changed from "Folate (B9)" to "Vitamin B9", so no English B-vitamin name shows on Micros. The probe checks this.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Typecheck exit 0. Tests 92 passed (11 files). Build compiled. `test:align` pairs: daily-targets 390 3, daily-targets 1440 3, setup-row 1440 2 (top/bottom), add-list 390 3, add-list 1440 3. `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc02-final.py`: no problems (see the list in the cc-02 gate block above).
- Ran against the dev server on 3101, which was running while `npm run check` built. Next 16 writes dev and build output to separate folders.
- Screenshots: `apps/web/.screenshots/cc02-final-add-open-390.png`, `cc02-final-add-chala-1440.png`, `cc02-final-today-390.png`.

## Quality Gate Outputs (cc-03)
- Branch `feat/ui-cc-favourites` from `feat/ui` d2c3387 (already has cc-02). Not pushed. Not merged: see the merge note below.
- Tests written first: `lib/__tests__/favourites.test.ts` (16 tests). The favourite-filter test in `food-categories.test.ts` became 5 tests (net +4). It failed before the code and passes now.
- `npm run typecheck`: exit 0. `npm run test`: 12 files, 112 passed.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Build compiled. `test:align` pairs: add-list 390 3, add-list 1440 3, food-detail 390 4, food-detail 1440 4 (the new heart row is in the group). `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc03.py`: no problems at 390 and 1440. Heart saves and un-saves, Yêu thích lists Chà là only, empty state and Bỏ lọc, reload keeps the favourite, 14 px aria-hidden heart in the grouped list, one × in the search box.
- `npm run probe -- tests/probes/cc02-final.py`: no problems after two expectation changes: the Yêu thích chip is now shown, and there are 11 filter chips (was 10).
- Edges: `/add` @ 390 and 1440 (add-list) pass. `/foods/food-cha-la` @ 390 and 1440 (food-detail) pass.
- Review fix: an id for a food that no longer exists no longer shows a blank "Không có “”" in the Yêu thích view.
- Screenshots: `apps/web/.screenshots/cc03-detail-heart-390.png`, `cc03-add-fav-390.png`, `cc03-add-grouped-heart-390.png`, `cc03-add-fav-empty-1440.png`.
- Merge: not done. Antigravity's ui-04b is not committed, and `nutrition-fortifykitchen` has uncommitted AGENTS.md and PROGRESS.md changes. Stopped with "ready, waiting for ui-04b".

## Quality Gate Outputs (cc-05)
- Branch `feat/ui-cc-edit-entry` from `feat/ui-cc-favourites` (07d6b82, includes cc-03). Not pushed, not merged.
- Tests first: `lib/__tests__/diary-edits.test.ts` (28 tests). Before the code it failed on the missing module. Now it passes.
- `npm run typecheck`: exit 0. `npm run test`: 13 files, 140 passed.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. Build compiled. `test:align` pairs unchanged for the existing groups. `test:hydration`: 0 hydration errors.
- `npm run probe -- tests/probes/cc05.py`: no problems at 390 and 1440. Yến mạch 90 g: breakfast 459 → 573 kcal, day 1.041 → 1.155. Moved to Bữa tối: breakfast 231, dinner 342, day 1.155. Delete Yogurt kefir: toast shows, Hoàn tác puts it back in its place. Delete Chuối without undo: gone after reload, and the moved edit and restored item survive. `/entry/no-such-item`: empty state.
- Edges: `/entry/item-1` @ 390 and 1440 (entry group) pass, 4 pairs each. Checked with the shared helper from `tests/alignment.py`, because that file does not list the route yet (see OPEN_QUESTIONS).
- cc-02 and cc-03 probes: no problems (regression check after the store change).
- Screenshots: `apps/web/.screenshots/cc05-entry-390.png`, `cc05-entry-1440.png`, `cc05-undo-toast-390.png`.
- Design check: the undo toast matches the design (message, Hoàn tác, countdown). The entry card matches the design's fields and preview. The meal control uses the shared sheet instead of inline chips (see OPEN_QUESTIONS).
- Review fixes: a damaged stored list of added entries now reads as empty. It no longer clears the sample edits or crashes the entry screen (`parseAddedEntries`, with tests). `amountsOfEntry` removed, since `amountsOfNumbers` covers entries.
- Merge: not done. Ready for review.

## Quality Gate Outputs (cc-06)
- Rebased `feat/ui-cc-favourites` then `feat/ui-cc-edit-entry` onto `feat/ui` f935803 (only OPEN_QUESTIONS conflicted, both sides kept). Typecheck and tests passed after each.
- Ownership: Claude Code owns apps/web and merges `feat/ui`; Antigravity works on `feat/ui-ag-*` only (AGENTS.md, .agent/rules/antigravity.md, CLAUDE.md).
- Fixes: `withRuntimeDate` (pure, tested) replaces the `syncSampleDayToday` mutation, applied in the diary store after mount. AppHeader: `rightAction`, `desktopSubtitle` and `dateLabel` removed (`actions`, `subtitle`, `date`). Micros phone layout: header and chip bar fixed, only the body scrolls. Edit entry: inline meal chips, one toast system (`components/diary-toast.tsx`, 5 s undo), UndoToast and the MealSwitcher `title` prop removed. `/entry/item-1` added to alignment.py.
- Next dev "1 Issue": not reproduced here (fresh load, client navigation and seeded storage, old and new code, 390 and 1440, no console warnings or badge). `hydration.py` now fails on any React/Next console warning and on the dev badge, on /today, /micros, /add and /entry/item-1 at both widths.
- `ALIGN_BASE_URL=http://localhost:3101 npm run check`: passes. 14 test files, 158 tests. Pairs: daily-targets 390 3 / 1440 3, setup-row 1440 2, add-list 390 3 / 1440 3, today-header 390 1 / 1440 1, micros-header 390 1 / 1440 1, entry 390 4 / 1440 4. `test:hydration`: 16 checks pass.
- Probes `cc02-final`, `cc03`, `cc05`, `cc06`: no problems. cc06: Today row → edit 90 g → totals 1.155; delete shows one toast, Hoàn tác restores; no Issue badge; Micros header stays at top, chip bar fixed.
- Screenshots: `apps/web/.screenshots/cc06-today-390.png`, `cc06-micros-stuck-390.png`, `cc06-entry-chips-390.png`, `cc06-today-1440.png`.

## Gate summary (cc2-08)
- Branch feat/ui-cc2-08 from origin/feat/ui 45c7085. Served as a production build on :3102 (a `next dev` from this clone already held port 3000).
- `npm run typecheck` ok. `npm run test`: 25 files, 290 pass. `npm run build` ok.
- test:align (ALIGN_BASE_URL=http://localhost:3102): all pairs pass. test:hydration: 0 hydration errors.
- `probe:all`: 22 PASS, 2 REPORT (ag04_audit, screenshots), 0 FAIL, 1 SKIP (cc02-final, dev only). smoke: 58 PASS / 0 FAIL of 58. cc2_08: 213 ok, 0 fail.
- Edges: today-header, micros-header, profile-header, weight-header (title row vs cards), nutrient-header pass at 390 and 1440. food-header and entry-header removed (title vs own subtitle only).
- Screenshots: apps/web/.screenshots/cc2-08-{home,diary,micros,settings,profile}-{390,1280}.png.

## Night shift
- 13/10 cc2-unify: unified AppHeader (ink on phone, paper on desktop), design/UI-RULES.md, SectionTitle, radius and spacing sweep, probe cc2_unify.py. Merged (commit in git log: "unify: ...").
- 13/10 docs08: docs/08-backend-plan.md added, pointers in AGENTS.md and docs/07-api-contract.md. Committed on feat/ui-cc2-docs08 and merged locally; push to origin/feat/ui was blocked by the permission classifier (docs only; typecheck, smoke 62/62).
- 13/10 cc2-11: built, reviewed, probes cc10/cc12 fixed; stuck: unexpected uncommitted edits in app/foods/[id]/page.tsx and app/explore/rich/[nutrient]/page.tsx (not from this run), so not merged. pushed: no.
