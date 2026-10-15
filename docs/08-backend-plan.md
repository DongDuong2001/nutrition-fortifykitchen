# H1T MICRO — Backend master plan (for Dong)

As of 12/10/2026 · Hao. Living version: the shared doc "H1T MICRO — Backend master plan (for Dong)"; this file is its repo copy. Status lines per phase are updated here.

## Purpose

Release 1 of the backend makes the finished web app real: sign-in, profile, diary, foods, favourites, saved meals, weight and trends stored in Supabase behind the Go API. Payments and the coach knowledge pipeline come in Release 2.

The web app (apps/web) is already built on mock data for every screen. Each backend phase below unlocks a set of screens, so Hao's side can switch them from mocks to the API one phase at a time.

**How to use this plan**

- Dong owns everything in it: apps/api, migrations/, lib/api-client, lib/supabase-client and app/(auth)/login. Hao's coders never touch these.
- Each phase has a goal, the work, acceptance criteria and a ready-to-paste Antigravity prompt (section "Antigravity setup and prompts").
- docs/07-api-contract.md holds the request and response shapes the screens use today. This plan decides how to build them; where the two differ, this plan wins and docs/07 is updated in the same phase.
- Questions go in OPEN_QUESTIONS.md with the prefix (api-pN), so Hao's reviewer sees them.

## Current state (feat/ui, 12/10)

The API scaffold runs but serves only food search, custom food, one diary log and a daily summary; everything else the screens need is new.

| Area | What exists | Gap for Release 1 |
| --- | --- | --- |
| Go API (apps/api) | Go 1.24, chi, pgx pool, Sentry, CORS, /healthz; modules diary, nutrition, payment, vault | No profile, weight, entries edit/delete, favourites, recents, saved meals, trends; no Zerolog; no OpenAPI |
| Auth | Supabase JWT middleware; admin = profiles.role "admin" (looked up per request) | Profile row on first sign-in; tests for expired/invalid tokens |
| Routes | GET /foods, POST /foods/custom, POST /diary/logs, GET /diary/daily, admin drafts, payment and vault webhooks | Rebuild on the docs/07 paths (/days/{date}/entries, /entries/{id}, …) |
| Database | migration 000001: nutrition.foods, diary_logs (nutrients_snapshot), user_targets, coach_drafts | Profiles, weight, training per day, favourites, recents, saved meals, food categories and portions, entry kind |
| Food data | Table only | Import USDA SR Legacy + Foundation, CNF, VN food table into the 22 counted nutrients (+ catalog) |
| Web (apps/web) | All IA v2 screens on mocks: Tổng quan, Nhật ký, Khám phá, Cài đặt, add sheet; targets and period maths in lib/targets.ts, lib/period.ts | Data layer switched from mocks to lib/api-client per phase |
| Contract | docs/07-api-contract.md (resources, errors, open questions 1–7) | OpenAPI spec generated from it; typed client |

Repo rules that still apply: work on feature branches, Hao's UI work merges into feat/ui, main is Dong's. Never commit secrets; .env.example lists every variable.

## Decisions

Ten rules are fixed by Hao; five need Dong's answer before the phase that uses them, each with a recommendation.

**Fixed (do not change without Hao)**

1. Scope Release 1 = core only: auth, profile, weight, foods + search, diary, training minutes, favourites, recents, saved meals, targets, day summary, trends. Payments (PayOS) and the coach vault wait for Release 2.
2. Targets are computed on both sides: the web for instant UI, the Go API for every server response. One shared test-vector file keeps them equal (section "Coach targets").
3. Unknown is never zero: a nutrient the source doesn't have is NULL in the database, null in JSON, "—" on screen. Sums and averages skip nulls; a day where every value is null stays null.
4. Past days are read-only: any write to a date before today (Asia/Ho_Chi_Minh) returns 409 PAST_DAY_READ_ONLY.
5. Dates are YYYY-MM-DD in Asia/Ho_Chi_Minh; timestamps are UTC ISO 8601.
6. A diary entry snapshots its nutrients at write time, so later edits to a food never change history.
7. Quick kcal entries: kind "quick", food_id NULL, calories required, nutrients NULL, never in recents.
8. No over-limit judgement in the API either: a value above a target range is "met", never a warning.
9. Advice comes only from coach rules (Release 2); the API returns facts, never recommendations.
10. Supabase Auth (magic link + Google) is the only sign-in; the Go API verifies the Supabase JWT.

**Open for Dong (recommendation first)**

| # | Question | Recommendation | Needed by |
| --- | --- | --- | --- |
| D1 | Where does the API run? | Render, Singapore region, next to Fortify; Supabase project in Singapore (Vercel was considered: Go there runs as serverless functions, which breaks the connection pool and adds cold starts) | Phase 0 |
| D2 | Legacy /login page | 308 redirect to /signin, then delete the page | Phase 1 |
| D3 | Offline writes | Client replays queued calls; each write carries a client UUID and is idempotent. A batch endpoint can come later | Phase 3 |
| D4 | Food search engine | Postgres: unaccent + pg_trgm on a normalised Vietnamese name; Meilisearch only if p95 > 150 ms on the full catalog | Phase 2 |
| D5 | Who owns lib/api-client | Generated from apps/api/openapi.yaml with orval (types + fetch functions), committed by Dong; Hao's coders only import it | Phase 0 |

## Architecture

One Go modular monolith in front of Supabase Postgres; the web never queries the database directly.

Request path: Web app (Next.js on Vercel, lib/api-client, signs in with Supabase Auth) → HTTPS + Supabase JWT → Go API on Render: auth (verify JWT, user id from token) → handler (validate, 422 on bad input) → service (rules, targets, past-day 409) → repository (the only SQL) → Supabase Postgres (schema nutrition, RLS on, unknown = NULL). cmd/importfoods loads food sources into Postgres. Shared test vectors are checked by both vitest and go test.

**Modules (apps/api/internal)**

| Module | Owns | Tables |
| --- | --- | --- |
| auth | JWT check, current user, admin role | — |
| profile | profile, weight log, training default | profiles, weight_logs |
| foods | catalog, search, categories, portions, rich-in lists, custom foods | foods, food_portions, nutrients |
| diary | entries, quick kcal, copy day/meal, delete meal, training minutes per day, day summary | diary_logs, day_training |
| library | favourites, recents, saved meals | user_favourites, user_recents, saved_meals, saved_meal_items |
| targets | coach rules (port of lib/targets.ts) | — (computed) |
| trends | period averages, days on target, comparison, streak (port of lib/period.ts) | reads diary_logs, weight_logs |
| payment, vault | kept as they are, Release 2 | existing |

Each module keeps the scaffold's handler → service → repository split. Services hold the rules and have unit tests; repositories are the only code with SQL.

**Cross-cutting rules**

- Logging: Zerolog JSON with request_id, user_id, route, status, duration; Sentry for 5xx only.
- Errors: one envelope `{"error":{"code":"PAST_DAY_READ_ONLY","message":"…"}}` with the codes in docs/07 §4. Messages in Vietnamese are the web's job; the API sends stable codes.
- Validation: every request body validated in the handler (units, ranges, required fields) → 422 VALIDATION_FAILED with field names.
- Idempotency: every create takes a client-generated UUID `id`; a repeat with the same id returns the existing row (200), never a duplicate.
- Time: "today" is computed in Asia/Ho_Chi_Minh on the server; never trust a client clock for the read-only rule.
- Pagination: cursor-based (`?cursor=&limit=`, max 50) for search and lists.
- Security: user_id always comes from the JWT, never from the body or path. Row Level Security is enabled on every user table as a second fence (policy user_id = auth.uid()), even though the API is the only client.
- Contract first: apps/api/openapi.yaml is written or changed before the handler; CI fails if the generated client is out of date.

## Data model

Five new migrations (000002–000006) add what the screens use; 000001 stays and is altered, never edited. All tables live in schema `nutrition`, all user tables have RLS on, and every migration has a matching .down.sql.

**000002 — profiles and weight (Phase 1)**

```sql
CREATE TABLE nutrition.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sex TEXT NOT NULL CHECK (sex IN ('male','female')),
  birth_year INT NOT NULL CHECK (birth_year BETWEEN 1920 AND 2015),
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 25 AND 300),
  goal TEXT NOT NULL CHECK (goal IN ('gain','maintain','cut','cut_fast')),
  training_minutes_default INT NOT NULL DEFAULT 60 CHECK (training_minutes_default IN (0,45,60,90,120)),
  near_period BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'vi',
  reminders JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE nutrition.weight_logs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 25 AND 300),
  PRIMARY KEY (user_id, log_date)
);
```

The enum values must match lib/profile.ts exactly; check that file before writing the migration. profiles.weight_kg is the latest weigh-in and is updated with each weight_logs insert in one transaction.

**000003 — foods (Phase 2)**

- `nutrition.foods`: add `category TEXT NOT NULL DEFAULT 'mon_viet'` (the 10 keys: tinh_bot, dam, beo, sua, rau, trai_cay, mon_viet, an_vat, bo_sung, cua_toi), `name_vi TEXT`, `name_search TEXT` (lower-case, accents stripped, kept in sync by a trigger), `source TEXT` (usda_sr, usda_foundation, cnf, vn_table, custom), `source_id TEXT`, `per_100g JSONB` (nutrient key → number or null).
- `nutrition.food_portions(food_id, label_vi, grams, sort)` for chips such as "1 chén · 40 g".
- `nutrition.nutrients(key, name_vi, unit, counted BOOLEAN, group_key, sort)` seeded from docs/nutrient-catalog.md (22 counted, ~58 total).
- Extensions `unaccent`, `pg_trgm`; GIN trigram index on name_search; btree on category; expression indexes on `(per_100g->>'calcium')::numeric` etc. for the eight rich-in nutrients.

**000004 — diary (Phase 3)**

- `nutrition.diary_logs`: add `kind TEXT NOT NULL DEFAULT 'food' CHECK (kind IN ('food','quick'))`, make `food_id` nullable with a CHECK (kind = 'food') = (food_id IS NOT NULL), add `meal TEXT NOT NULL` (sang, trua, truoc_tap, toi, phu — check lib for the exact keys), `portion_label TEXT`, `grams NUMERIC`, `calories NUMERIC NOT NULL`, `name_snapshot TEXT`, `client_id UUID UNIQUE` (idempotency), `deleted_at TIMESTAMPTZ` (soft delete for undo).
- `nutrition.day_training(user_id, log_date, minutes, PRIMARY KEY (user_id, log_date))`: a day without a row uses the profile default.
- Index `(user_id, log_date) WHERE deleted_at IS NULL`.

**000005 — library (Phase 4)**

- `user_favourites(user_id, food_id, created_at, PK (user_id, food_id))`.
- `user_recents(user_id, food_id, last_portion_label, last_grams, used_at, PK (user_id, food_id))`, upserted on every food entry, capped at 30 per user by a nightly pg_cron job.
- `saved_meals(id, user_id, name, created_at, updated_at)` and `saved_meal_items(saved_meal_id, food_id, portion_label, grams, sort)`.

**000006 — RLS and grants (Phase 6)**

RLS policies on every user table (select/insert/update/delete where user_id = auth.uid()); the API connects with a role that bypasses RLS only for admin jobs, and with the user's JWT claims set for normal requests if Dong prefers full RLS enforcement. `user_targets` from 000001 is kept but unused in Release 1 (targets are computed).

## API endpoints (Release 1)

All routes live under /api/v1 and need a valid Supabase JWT except /healthz and food reads. Request and response bodies follow docs/07; this table is the build list.

| Phase | Method | Path | Does | Screens it unlocks |
| --- | --- | --- | --- | --- |
| 1 | GET | /me | Profile + computed targets for today; 404 PROFILE_MISSING before setup | All (targets), Cài đặt |
| 1 | PUT | /me/profile | Create or update profile (setup, Hồ sơ) | Setup, Hồ sơ |
| 1 | GET | /me/weight?from=&to= | Weight log | Cơ thể |
| 1 | PUT | /me/weight/{date} | Upsert a weigh-in (today or past) | Cân nặng |
| 1 | DELETE | /me | Delete account and all data | Xoá tài khoản |
| 2 | GET | /foods?q=&category=&cursor=&limit= | Search + category browse | Add sheet, Khám phá |
| 2 | GET | /foods/{id} | Detail: per_100g, portions, category | Food detail |
| 2 | GET | /foods/rich-in/{nutrient}?basis=100g\|portion | Ranked list, nulls excluded | Giàu… lists |
| 2 | POST / PATCH / DELETE | /foods/custom, /foods/custom/{id} | Món của tôi | Create food |
| 3 | GET | /days/{date} | Entries by meal, training minutes, day totals (null-aware), targets for that day | Nhật ký, day Vi chất, Ngày tập |
| 3 | POST | /days/{date}/entries | Add food or quick entry (client UUID) | Add sheet |
| 3 | PATCH / DELETE | /entries/{id} | Edit portion or meal; soft delete (undo = PATCH deleted_at null within 10 s) | Edit entry, undo |
| 3 | POST | /days/{date}/copy-from/{source} | Copy a whole day or `?meal=` from another day | Chép hôm qua |
| 3 | DELETE | /days/{date}/meals/{meal} | Xoá bữa này (soft, one undo) | Nhật ký ⋯ menu |
| 3 | PUT | /days/{date}/training | Training minutes for that day | Ngày tập |
| 4 | GET / PUT / DELETE | /me/favourites, /me/favourites/{foodId} | Yêu thích | Add sheet, Khám phá |
| 4 | GET | /me/recents | Gần đây with last portion | Add sheet one-tap |
| 4 | GET / POST / PATCH / DELETE | /me/saved-meals, /me/saved-meals/{id} | Bữa của tôi | Khám phá, add sheet |
| 4 | POST | /days/{date}/entries/from-saved/{id}?meal= | Add every item of a saved meal | Add sheet |
| 5 | GET | /trends?days=7\|30&offset=0 | Period averages (kcal, macros, 22 nutrients), days on target, composition, comparison with previous period, streak, weight summary | Tổng quan sub-tabs |

Every write to a date before today returns 409 PAST_DAY_READ_ONLY, including copy-from targets, training and meal deletes. Reads of past days are always allowed.

## Coach targets and period maths

The Go API ports two TypeScript files and proves it matches them with one shared set of test vectors, so web and API can never disagree on a target or an average.

**What to port**

- apps/web/lib/targets.ts → internal/targets: kcal/kg by goal (Tăng cơ 35–40, Giữ cân 30–35, Giảm mỡ 25–30, Giảm mỡ nhanh 20–25); protein 1,6–2,2 g/kg; fat 0,5–1 g/kg; salt 4–6 g/day + 1–1,5 g per 20 min training, sodium = salt × 393 rounded to 10 mg; potassium 80–100 mg/kg; calcium 1.200–1.500 mg, magnesium 50 % of calcium; iron 8 mg men, 18 mg women, 28 mg near or in period; zinc 12 mg men, 8 mg women; other vitamins from the VN 2016 table (marked "*" in the UI). Read the TS file, not this list, as the source: it has the rounding rules.
- apps/web/lib/period.ts and lib/day-totals.ts → internal/trends: period(today, 7|30, offset), averages over finished logged days only (today excluded, null skipped, never 0), days on target (above range counts as met), macro composition (% of kcal), comparison with the previous period, logging streak, weight summary.

**Shared test vectors**

1. Hao's side adds `packages/vectors/targets.json` and `packages/vectors/period.json`: input → expected output cases written by a script that runs the TypeScript functions (about 40 target cases across sex, goal, weight, training minutes, near_period; about 20 period cases with gaps, nulls, 7 and 30 days).
2. `vitest` reads the same files and must pass (guards the TS side).
3. Dong's `go test ./internal/targets ./internal/trends` reads them from the repo and must pass with exact equality after the same rounding.
4. Any rule change starts in the TS file, regenerates the vectors, and the Go side follows in the same PR. CI runs both.

The API returns targets inside `/me` and `/days/{date}` (`targets: {key: {min, max, unit}}`), and the web keeps computing its own for instant feedback; the vectors keep the two equal.

## Food data import

A repeatable Go command (`apps/api/cmd/importfoods`) loads four sources into nutrition.foods with the same nutrient keys the web uses, and a food missing a value keeps it NULL.

1. **Sources, in priority order:** VN food composition table (Vietnamese dishes and names), USDA FoodData Central Foundation, USDA SR Legacy, Canadian Nutrient File. NCCDB comes later. Download files into `data/raw/` (git-ignored) and record each file's version and licence in `data/SOURCES.md`.
2. **Nutrient mapping:** one YAML file `data/nutrient-map.yaml` maps each source's nutrient id to our key and unit (e.g. USDA 1087 → calcium, mg). Unit conversions are explicit (µg ↔ mg, IU → µg for vitamin D and A with the stated factor). Unmapped nutrients are dropped and listed in the import report.
3. **Missing vs zero:** a nutrient absent from the source = NULL; a source value of 0 stays 0 only when the source marks it as measured. Never fill gaps from another source in Release 1 (it mixes data quality silently).
4. **Names and categories:** Vietnamese name from the VN table, else a curated translation list `data/names-vi.csv` for the ~500 most common foods; others keep the English name and are hidden from search until named. Category from a mapping of source food groups to our 10 keys, overridable per food in `data/category-overrides.csv`.
5. **Portions:** source household measures converted to grams, plus Vietnamese portions (chén, bát, muỗng, quả) from `data/portions-vi.csv`.
6. **Idempotent runs:** upsert by (source, source_id); a dry-run flag prints counts and the first 20 diffs; a report lists foods with fewer than 10 of the 22 counted nutrients.
7. **Acceptance:** at least 1.000 named, categorised Vietnamese-searchable foods; the 30 foods in the web mocks exist with matching values (±1 %); search "com" finds "Cơm gạo lứt"; rich-in Canxi returns no food with a NULL calcium.

## Phases

Seven phases run in order; each ends with green CI, an updated openapi.yaml and client, and a short PROGRESS.md entry. Phases 2 and 1 can overlap if Dong has the time.

1. **Phase 0 — Foundations.** Zerolog, config from env with .env.example, error envelope and codes, request validation helper, openapi.yaml skeleton + orval client generation into lib/api-client, Supabase CLI local stack (`supabase start`) with migrations applied, `make test` running go test against a local Postgres, CI (GitHub Actions) for go vet, go test, migration up/down, client freshness. Decide D1 and D5.
    - Done when: `make dev` starts API + local Supabase; /healthz green; CI green on a PR; the generated client compiles in apps/web.
    - Status: done
2. **Phase 1 — Auth, profile, weight.** Migration 000002; GET /me, PUT /me/profile, weight endpoints, DELETE /me; profile created at setup; D2 done.
    - Done when: a new user signs in, finishes setup, reloads and keeps the profile; invalid/expired JWT → 401; another user's data is unreachable (test).
    - Status: done
3. **Phase 2 — Foods.** Migration 000003, import command, search with unaccent + trigram, detail, portions, rich-in, custom foods; D4 measured.
    - Done when: import acceptance criteria pass; search p95 < 150 ms on the full catalog locally; no NULL counted as 0 anywhere (test).
    - Status: done
4. **Phase 3 — Diary.** Migration 000004; /days/{date}, entries create/edit/delete with soft delete and undo, quick kcal, copy day or meal, delete meal, training minutes; past-day guard; idempotent client UUIDs; D3 agreed.
    - Done when: every write to yesterday returns 409; replaying the same POST twice creates one entry; day totals match the web's lib/day-totals for the mock day.
    - Status: done
5. **Phase 4 — Library.** Migration 000005; favourites, recents (upserted on each food entry, last portion kept), saved meals with add-from-saved.
    - Done when: one-tap add from a recent uses its last portion; a saved meal adds all its items in one call and one undo.
    - Status: done
6. **Phase 5 — Targets and trends.** internal/targets and internal/trends ports; shared vectors pass; targets in /me and /days/{date}; GET /trends.
    - Done when: Go and vitest both pass the same vector files; /trends for the mock history equals the web's lib/period output.
    - Status: done
7. **Phase 6 — Hardening and launch.** Migration 000006 (RLS), rate limit (60 writes/min/user), structured logs reviewed, Sentry alerts, Supabase backups confirmed, staging + production deploys, load test (50 users logging a day each), security pass (no user_id from input, no SQL string building).
    - Done when: staging serves the web build end to end; a k6 run shows p95 < 300 ms for /days/{date} and POST entries; Hao signs off the cutover checklist.
    - Status: done

**Later (Release 2):** PayOS payments and plans, coach vault import and published rules, coach advice in the app, push reminders, a batch sync endpoint if replay proves slow.

## Antigravity setup and prompts

Dong runs one Antigravity task per phase on its own branch, then reviews and merges it himself; each prompt below is complete and can be pasted as is.

**One-time setup**

1. `git fetch && git switch -c feat/api origin/feat/ui && git push -u origin feat/api` — the integration branch for all backend work (it starts from feat/ui so the contract, docs and web code are present).
2. Create `.agent/rules/api.md` with the rules block below and commit it on feat/api.
3. Each phase: `git switch -c feat/api-p<N> feat/api`, run the prompt, review, then `git switch feat/api && git merge --ff-only feat/api-p<N> && git push`.

```markdown
# API rules (apps/api, migrations, lib/api-client) — read before every task
- Read docs/08-backend-plan.md and docs/07-api-contract.md first; the plan wins when they differ, and you update docs/07 in the same task.
- Never edit apps/web (except regenerating lib/api-client and lib/supabase-client), design/, PROGRESS.md rows of other agents.
- Contract first: change apps/api/openapi.yaml, regenerate the client, then write the handler.
- handler -> service -> repository; SQL only in repositories; services have table tests.
- user_id only from the JWT. Never build SQL with string concatenation.
- Unknown nutrient = NULL / null, never 0. Past-day writes = 409 PAST_DAY_READ_ONLY. Dates YYYY-MM-DD in Asia/Ho_Chi_Minh.
- Every create accepts a client UUID and is idempotent.
- Migrations: new numbered file + .down.sql; never edit an applied migration.
- One commit per item, message "api-p<N>: item <k> - <what>". Author Dong's git identity. No AI names or trailers.
- Gates before you finish: go vet ./..., go test ./..., migrations up and down on local Supabase, client freshness check, CI green.
- Stuck after two tries: skip the item, write why in PROGRESS.md under "API", continue.
```

**Prompt template (fill N and the phase block)**

```text
Task api-p<N>: <phase name> for the H1T MICRO Go API. Read .agent/rules/api.md, docs/08-backend-plan.md (sections Decisions, Architecture, Data model, API endpoints, Phases → Phase <N>) and docs/07-api-contract.md before starting.
Branch: git switch -c feat/api-p<N> feat/api. Never commit to feat/api or main.
Files you may touch: apps/api/**, migrations/**, lib/api-client/**, docs/07-api-contract.md, docs/08-backend-plan.md (status lines only), packages/vectors/** (read-only unless the phase says otherwise), .github/workflows/api.yml, PROGRESS.md (one row under "API").
Items (one commit each, tests first for every service):
<paste the items of the phase, one per line, from the Phase blocks below>
Gates: go vet ./..., go test ./..., migrations up+down on local Supabase, client regenerated and compiling in apps/web (npm run typecheck in apps/web), CI green.
Finish with a PROGRESS.md row: phase, items done/skipped, gates, open questions (also in OPEN_QUESTIONS.md as "(api-p<N>)").
If an item is stuck after two tries, skip it, note why, continue.
```

**Phase blocks to paste into the template**

- **P0:** 1 Zerolog logger + request logging middleware; 2 config loader + .env.example; 3 error envelope + codes from docs/07 §4; 4 validation helper returning 422 with fields; 5 openapi.yaml skeleton for existing routes + orval config generating lib/api-client; 6 Supabase CLI local stack + Makefile targets dev/test/migrate; 7 GitHub Actions workflow api.yml (vet, test, migrate up/down, client freshness).
- **P1:** 1 migration 000002 profiles + weight_logs (+down, RLS policies); 2 profile repository/service/handler: GET /me, PUT /me/profile (validate enums against apps/web/lib/profile.ts); 3 weight endpoints GET /me/weight, PUT /me/weight/{date} updating profiles.weight_kg in one transaction; 4 DELETE /me (cascade + auth user deletion via Supabase admin API); 5 /login: 308 redirect to /signin; 6 tests: 401 cases, cross-user isolation.
- **P2:** 1 migration 000003 (category, name fields, portions, nutrients table, extensions, indexes); 2 nutrients seed from docs/nutrient-catalog.md; 3 cmd/importfoods with nutrient-map.yaml, dry-run, report; 4 import VN table + USDA Foundation + SR Legacy + CNF; 5 GET /foods search (unaccent + trigram, category filter, cursor); 6 GET /foods/{id}; 7 GET /foods/rich-in/{nutrient}; 8 custom foods CRUD; 9 benchmark search p95 and record it.
- **P3:** 1 migration 000004 (diary_logs columns, day_training); 2 server-side today + PAST_DAY_READ_ONLY guard used by every write; 3 GET /days/{date} with null-aware totals; 4 POST entries (food and quick, client UUID idempotency, nutrient snapshot); 5 PATCH/DELETE /entries/{id} with soft delete + undo; 6 copy-from (day and ?meal=); 7 DELETE /days/{date}/meals/{meal}; 8 PUT /days/{date}/training; 9 tests mirroring the web mock day totals.
- **P4:** 1 migration 000005; 2 favourites; 3 recents upsert on food entries + GET with last portion + 30-per-user cap job; 4 saved meals CRUD; 5 add-from-saved.
- **P5:** 1 internal/targets port of apps/web/lib/targets.ts; 2 internal/trends port of lib/period.ts + lib/day-totals.ts; 3 go tests reading packages/vectors/targets.json and period.json (exact equality); 4 targets in /me and /days/{date}; 5 GET /trends.
- **P6:** 1 migration 000006 RLS on all user tables; 2 rate limiting; 3 Sentry alerts + log review; 4 staging and production deploy configs (Render, Singapore) with secrets in the host; 5 k6 load test script + results; 6 security checklist pass; 7 cutover checklist in docs/08.

## Testing, environments and working together

Three environments, one contract and a weekly sync keep the two halves moving without stepping on each other.

**Testing**

- Unit: table tests for every service (targets, trends, past-day guard, idempotency, null maths).
- Integration: handlers against local Supabase Postgres, seeded with the web mock day and 29-day history so numbers can be compared with the web.
- Contract: shared vectors (targets, period) on both sides; the generated client must compile in apps/web on every PR.
- End to end (Hao's side): the web probes run against staging once a phase lands.

**Environments**

| Env | API | Database | Web | Data |
| --- | --- | --- | --- | --- |
| Local | `make dev` (port 8080) | Supabase CLI | `npm run dev` with NEXT_PUBLIC_DATA_SOURCE=api | Seed script |
| Staging | Render, Singapore | Supabase project hitmicro-staging | Vercel preview of feat/ui | Imported foods + test users |
| Production | Render, Singapore | Supabase project hitmicro-prod | Vercel production | Real users |

Secrets (host settings only, listed in .env.example): DATABASE_URL, SUPABASE_URL, SUPABASE_JWT_SECRET (or JWKS URL), SUPABASE_SERVICE_ROLE_KEY (admin jobs only), SENTRY_DSN, ENVIRONMENT, CORS_ORIGINS, PORT.

**Web integration (Hao's side, per phase)**

- The web adds a data-source switch (`NEXT_PUBLIC_DATA_SOURCE=mock|api`) behind its diary store, so each screen moves from mocks to lib/api-client when its phase lands, and the mock stays for demos and probes.
- Order: Phase 1 → setup, Hồ sơ, Cài đặt, weight; Phase 2 → add sheet search, Khám phá, food detail; Phase 3 → Nhật ký and day screens; Phase 4 → favourites, recents, Bữa của tôi; Phase 5 → Tổng quan.
- Offline queue (D3) lands on the web with Phase 3: writes go to a local queue first and replay in order with their client UUIDs.

**Working agreement**

- Branches: Dong works on feat/api and feat/api-p<N>; Hao's coders on feat/ui and their task branches. Hao merges feat/api into feat/ui after each phase (no shared files, so no conflicts expected). main receives both at release.
- Ownership: apps/api, migrations, lib/api-client, lib/supabase-client, app/(auth)/login = Dong; everything else in apps/web and design/ = Hao.
- Changes to the contract: a PR touching openapi.yaml or docs/07 tags Hao; breaking changes need a new path or a version bump, never a silent change.
- Questions: OPEN_QUESTIONS.md with "(api-pN)"; decisions copied into this plan's Decisions section.
- Weekly 30-minute sync: last phase done, next phase, open questions, staging status.
- Status line per phase here and in PROGRESS.md: not started / in progress / done (commit).
