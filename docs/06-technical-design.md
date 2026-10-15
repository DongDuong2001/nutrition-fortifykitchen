# 6. Technical Design Document

Build Nutrition Web as a fourth app in the existing monorepo, `apps/nutrition-web`, on the same NestJS API, PostgreSQL database and login. The coach's knowledge comes from his Obsidian vault into versioned database records, and nothing reaches users until Hào publishes it.

## Stack review: Dong's proposal (for decision)

Recommendation: adopt Dong's direction (Next.js, Go, Supabase, OpenAPI, Sentry + Zerolog) for Release 1, and add Redis, Meilisearch and Asynq in Release 2 when a measured need appears. The sections from Architecture to Testing below still describe the earlier NestJS baseline. They will be rewritten once Dong confirms the decisions at the end of this section.

| Component | Dong's proposal | Recommendation | Reason |
| --- | --- | --- | --- |
| Web frontend | Next.js (React + TypeScript) | Keep | Same as customer-web. Components, Tailwind setup and the current tracker UI carry over. |
| Backend API | Go | Keep if Dong owns it | Fast and cheap to host. Cost: the coach rules (`computeTargets`) are TypeScript today and must be ported to Go. Fortify login lives in NestJS. |
| Database | Supabase | Keep, use Postgres + Auth | Also gives realtime, storage, pg\_cron and full-text search, which cover most of Release 1 without extra services. |
| Cache and real-time | Redis | Release 2 | A personal diary needs no live push. Refetch on tab focus covers sync across devices. Cache only matters under load. |
| Search engine | Meilisearch (or Typesense) | Release 2 | The food list is a few hundred items. Postgres `unaccent` + `pg_trgm` matches "pho" to "phở". Meilisearch adds typo tolerance once the list reaches thousands. |
| BE → FE data sync | OpenAPI / Swagger (Hào) | Keep, high priority | Generated typed client (e.g. orval + TanStack Query). Keeps Go and TypeScript types from drifting. |
| Cron jobs | Redis + Asynq | Release 2 | Release 1 has almost no background jobs. Supabase pg\_cron or a Render cron job covers weekly summaries and knowledge publishing. |
| Monitoring | Sentry + Zerolog | Keep | Sentry on web and API from day one. Zerolog is the standard Go logger. |

**Release 1 stack:** Next.js web on Vercel · Go API · Supabase Postgres + Auth · OpenAPI-generated client · Sentry + Zerolog. Food search on Postgres, scheduled jobs on pg\_cron. Three hosted pieces instead of five.

**Release 2 triggers** (add the service when the trigger is met):

- Meilisearch: food list over \~2,000 items, or search p95 above 200 ms
- Redis cache: API p95 above 300 ms on read endpoints under real traffic
- Redis + Asynq: a real queue workload (emails, imports, notifications) that pg\_cron cannot handle

**Risks**

- **Coach rules in two languages.** The coach's knowledge must be the single source for every recommendation. With Go, the API computes targets and gaps; the web only displays them. No copy of the rules in TypeScript.
- **Accounts.** "Anyone can sign up, linked to Fortify" means either Supabase Auth with an optional Fortify link, or the Go API verifying Fortify's `fk_token`. The first is simpler for users outside Fortify.
- **Timeline.** Each extra service adds setup, environment variables, deployment and alerts. In a one-month Release 1 that time comes out of features.
- **Cost.** Release 1 = one Go host + Supabase (free tier, then Pro). Adding Redis and Meilisearch roughly doubles the bill before there are users.
- **Two databases.** Fortify stays on Render Postgres; Nutrition Web on Supabase. Cross-app data (linked accounts, subscriber discount) goes through the APIs, never shared tables.

**Decisions for Dong**

- [ ] Dong builds and owns the Go API; Hào owns the web and the OpenAPI client
- [ ] Login: Supabase Auth with optional Fortify account link, or shared Fortify login
- [ ] Defer Redis, Meilisearch and Asynq to Release 2 with the triggers above
- [ ] Coach rules computed only in the Go API (web displays results)
- [ ] Go API hosting: Render (Singapore) next to Fortify, or Fly.io / another provider
- [ ] Supabase region: Singapore

## Architecture

&#91;embedded content: architecture · 3 front ends, 1 API, 1 database, shared packages\]

The current tracker code in `apps/customer-web/src/features/nutrition/` is the starting point: its `data/nutrients.ts` (targets) and `data/foods.ts` (food data) move into `packages/nutrition`.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web | Next.js 15, React 19, Tailwind 4, TanStack Query, `@mynaui/icons-react` | Unified modern icon system via centralized adapter |
| API | NestJS module `nutrition` in `apps/api`, DDD-lite folders like other modules | Reuses auth guard, rate limits, response format |
| Database | PostgreSQL via Prisma (`packages/database`) | Same database; 5 new tables in Release 1, 3 more in Release 2 |
| Shared logic | `packages/nutrition`: coach rule set, target calculation, nutrient list, food seed data | One source of truth, unit-tested |
| Hosting | Web on Vercel; API and database on Render (Singapore), as today | No new providers |

## Data model (new tables)

| Table | Key fields | Release | Notes |
| --- | --- | --- | --- |
| `NutritionProfile` | `userId` (1:1 User), `sex`, `birthYear`, `weightKg`, `goal` (BULK, MAINTAIN, CUT, DEEP\_CUT), `onPeriod`, `language`, `consentAt` | 1 | `consentAt` required |
| `Food` | `id`, `source` (COACH, FORTIFY, GENERIC, CUSTOM), `menuItemId?`, `nameVi`, `nameEn`, `category`, `per100` (JSON, 26 nutrients), `servings` (JSON), `coachNoteRef?`, `isEstimate`, `dataSource`, `checkedAt`, `ownerUserId?` | 1 | COACH rows come from a knowledge version; CUSTOM rows belong to one user (later) |
| `DiaryEntry` | `id`, `userId`, `date` (DATE), `meal`, `foodId?`, `nameVi`, `nameEn`, `grams`, `per100` (JSON snapshot), `createdAt` | 1 | Index on (`userId`, `date`) |
| `KnowledgeVersion` | `id`, `version`, `status` (DRAFT, PUBLISHED, REJECTED, ARCHIVED), `sourceCommit`, `importedAt`, `publishedBy?`, `publishedAt?` | 1 | Release 1 loads version 1 from `docs/coach-food-list.md` |
| `KnowledgeRule` | `versionId`, `ruleId`, `unit`, `min?`, `max?`, `value?`, `appliesTo` (JSON), `noteRef`, `text` | 1 | One row per number the coach sets (e.g. `salt_g_per_day`) |
| `KnowledgeNote` | `versionId`, `noteRef`, `title`, `body` | 2 | Plain-text notes, later the only material AI explanations may use |
| `TrainingDay` | `userId`, `date`, `minutes` | 2 | Paid feature |
| `UserPlan` | `userId`, `plan` (FREE, PAID), `status`, `startsAt`, `endsAt`, `paymentRef?` | 2 | Server-side check for paid features |

Store `birthYear`, not age, so targets stay right over time. Nutrient JSON uses the 26 keys already in `nutrients.ts`.

## API endpoints

JSON, behind the existing `JwtAuthGuard` except the public food list; admin routes also need the admin role, paid routes an active paid plan.

| Method | Path | Purpose | Release |
| --- | --- | --- | --- |
| GET / PUT | `/nutrition/profile` | Read or save profile and consent | 1 |
| GET | `/nutrition/foods?q=&category=` | Search foods (public) | 1 |
| GET | `/nutrition/diary?date=YYYY-MM-DD` | Entries, targets and totals for a day | 1 |
| POST | `/nutrition/diary/entries` | Add an entry (server copies the food's `per100`) | 1 |
| PATCH / DELETE | `/nutrition/diary/entries/:id` | Change grams or meal / remove | 1 |
| POST | `/nutrition/diary/copy` | Copy entries from one date to another | 1 |
| GET | `/nutrition/me/export` | Download all nutrition data as JSON | 1 |
| DELETE | `/nutrition/me` | Delete all nutrition data | 1 |
| POST | `/nutrition/import` | One-time hand-over of the old tracker's data | 2 |
| PUT | `/nutrition/training/:date` | Set training minutes (paid) | 2 |
| GET | `/nutrition/recommendations?date=` | Coach suggestions for the day (paid) | 2 |
| POST | `/admin/knowledge/import` | Read the vault and create a draft version (admin) | 2 |
| GET | `/admin/knowledge/versions/:id/diff` | Changes against the published version (admin) | 2 |
| POST | `/admin/knowledge/versions/:id/publish` · `/reject` · `/rollback` | Publish, reject or roll back (admin) | 2 |
| POST | `/billing/checkout`, `/billing/confirm` | Start and confirm a paid plan | 2 |

Targets are calculated in `packages/nutrition` from the profile, the day's training minutes and the rules of the published `KnowledgeVersion`; the web app calculates the same locally for instant feedback.

## Authentication

- Reuse `/auth/signup` and `/auth/login`; the API sets the `fk_token` HttpOnly cookie (7 days).
- The web app calls the API through a Next.js rewrite (`/api/*` → API), so the cookie is first-party. Calling the API on another domain directly would rely on third-party cookies, which Safari blocks.
- Add the nutrition web's domain to the API's CORS list for local development (`localhost:3003`).

## Migration from the current tracker

1. Move `data/nutrients.ts` and `data/foods.ts` into `packages/nutrition`; customer-web imports from there so nothing breaks.
2. Turn today's coach numbers (`docs/coach-food-list.md`) into knowledge version 1 and seed `Food` from the food list.
3. Release 2: customer-web gets an "Export to Nutrition Web" button that hands its browser data over once (another domain cannot read it directly), then the Dinh dưỡng tab becomes a link to the new app.

## Coach knowledge pipeline (Release 2)

1. **Write:** the coach keeps one Obsidian note per topic. A block of fields at the top holds the numbers, for example `salt_g_per_day: [4, 6]`, `training_salt_g_per_20min: [1, 1.5]`; the explanation follows in plain text.
2. **Store:** the vault lives in its own private Git repository, so every change has a history.
3. **Import:** Hào presses Import (or a daily job runs). The API reads the vault, validates every field (units, ranges, required ids) and saves a DRAFT `KnowledgeVersion`.
4. **Review:** the Knowledge review screen shows each change, old → new, and any validation errors.
5. **Publish:** Hào publishes. The new version becomes active; the old one is archived and can be rolled back in one click.
6. **Use:** targets, recommendations and, later, AI explanations read only the published version, and each result records which version produced it.

## Month-1 plan (Release 1, proposed — split of work to agree with Dong)

| Week | Work | Lead |
| --- | --- | --- |
| 1 | Monorepo app scaffold, `packages/nutrition`, Prisma tables, knowledge version 1 | Dong + Claude |
| 2 | Profile, diary and food search API; diary and add-food screens | Dong + Claude |
| 3 | Targets and nutrient report, Vietnamese and English, export and delete | Hào + Claude |
| 4 | Testing on phones, coach checks 3 test profiles, deploy, fix | All |

## Deployment

| Item | Setting |
| --- | --- |
| Vercel project | Root `apps/nutrition-web`, build with Turborepo filter, env `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` |
| Domain | Subdomain of the Fortify domain (open question in Overview) |
| API | Same Render service; new module only; no new env vars |
| Database | New tables via Prisma. The repo uses `prisma db push`; with real user data, switch to `prisma migrate` so changes are reviewed and reversible |
| Previews | Vercel preview per pull request, as for customer-web |

## Testing

| Level | What | Tool |
| --- | --- | --- |
| Unit | Every rule in SRS "Calculation rules", incl. the 65 kg / 60 min example; search accent folding | Vitest (already in `apps/api`) |
| API | Each endpoint: auth required, validation, user can only see own data | NestJS e2e + test database |
| End to end | PRD user stories US1–US5 on phone and desktop sizes | Playwright |
| Data | Every food has 26 nutrients; coach foods match `coach-food-list.json` | Script in CI |

## Update after scaffold review (10/10/2026)

Dong's scaffold (`nutrition-fortifykitchen/`) is now the baseline. Where it differs from earlier sections, this section wins.

| Area | Scaffold (now the baseline) | Note |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `@supabase/ssr` | Visuals follow the design canvas, not task 04's "culinary" look |
| Backend | Go 1.24 modular monolith: chi, pgx (pgxpool, session mode, port 5432), golang-jwt | Matches the stack review |
| Database | PostgreSQL 17, schema `nutrition`: `foods`, `diary_logs`, `user_targets`, `coach_drafts` | More tables needed, see SRS |
| Auth | Supabase JWT verified in Go; admin = `app_metadata.role == "admin"` | Matches the review |
| Diary writes | Client-generated UUID + `ON CONFLICT (id) DO NOTHING` (idempotent) | Outbox pattern moves to Release 2 |
| Payments | PayOS (VietQR) with HMAC-SHA256 webhook check | Current choice; can change later |
| Coach knowledge | GitHub Vault: markdown from a private repo via webhook + fine-grained PAT, held in `coach_drafts` until admin review | New, was not in this doc |
| Fortify Kitchen menu sync | Upstream menu sync via API key | Kept for later. Not built in Release 1 |
| Observability | Sentry | **Gap:** Zerolog is not in the scaffold yet |
| API contract | Not present | **Gap:** add the OpenAPI spec agreed in the stack review |
| Deferred | No Redis, Asynq, Meilisearch or public gamification | Matches the stack review |

**To do for Dong:** add Zerolog structured logging and an OpenAPI spec for the diary, nutrition, payment and vault endpoints.
