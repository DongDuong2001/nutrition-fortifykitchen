# Dong Handover Checklist

A concise checklist of all backend and API deliverables waiting on Dong, grouped by category.
Sources: [docs/audit-ag10.md](docs/audit-ag10.md), [docs/08-backend-plan.md](docs/08-backend-plan.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

---

## 1. Blocker (Before Staging / Production)

- [ ] **SQL Injection in rich-in**: Parameterize or whitelist `nutrient` in `apps/api/internal/nutrition/repository.go#L179` (`fmt.Sprintf` directly interpolating query param into `per_100g->>'%s'`). *(Source: [docs/audit-ag10.md#L119](docs/audit-ag10.md#L119) Q1, [docs/08-backend-plan.md#L235](docs/08-backend-plan.md#L235) P6)*
- [ ] **Unverified JWT Fallback**: Remove the insecure `parser.ParseUnverified` fallback in `apps/api/internal/auth/middleware.go#L82` when `SUPABASE_JWT_SECRET` is unset. *(Source: [docs/audit-ag10.md#L119](docs/audit-ag10.md#L119) Q1, [docs/08-backend-plan.md#L235](docs/08-backend-plan.md#L235) P6)*

---

## 2. API & Contract

- [ ] **Contract, OpenAPI, and Code Drift**: Synchronize [docs/07-api-contract.md](docs/07-api-contract.md), `apps/api/openapi.yaml`, and Go code on endpoints, missing routes (`PUT /me/profile`, `GET /me/weight`, `PUT /me/weight/{date}`, `DELETE /me`, `DELETE /foods/custom/{id}`, `DELETE /days/{date}/meals/{meal}`), wrapper envelope (`{"data": ...}` vs top-level object), and goal enums (`build`/`deep_cut` vs `gain`/`cut_fast`). *(Source: [docs/audit-ag10.md#L120](docs/audit-ag10.md#L120) Q2, [docs/07-api-contract.md](docs/07-api-contract.md))*
- [ ] **Generated Web API Client**: Configure `orval` in CI and generate `apps/web/lib/api-client.ts` matching the agreed OpenAPI spec (currently calling legacy `/diary/daily` scaffold endpoints). *(Source: [docs/audit-ag10.md#L121](docs/audit-ag10.md#L121) Q3, [docs/08-backend-plan.md#L47](docs/08-backend-plan.md#L47) P0)*
- [ ] **Recents Not Upserted on Food Entry**: Wire `libraryRepo.UpsertRecent` into `diaryService.CreateEntry` (`POST /days/{date}/entries`) for food entries so `/recents` populates on daily logging. *(Source: [docs/audit-ag10.md#L123](docs/audit-ag10.md#L123) Q5, [docs/08-backend-plan.md#L155](docs/08-backend-plan.md#L155) P4)*
- [ ] **Soft-Delete Undo Path**: Support restoring a soft-deleted entry via `PATCH /entries/{id}` within 10 seconds (currently rejected by `WHERE deleted_at IS NULL` in `diary/repository.go#L174`). *(Source: [docs/audit-ag10.md#L124](docs/audit-ag10.md#L124) Q6, [docs/08-backend-plan.md#L135](docs/08-backend-plan.md#L135) P3)*
- [ ] **Past-Date Weight Overwriting Current Weight**: In `PUT /me/weight/{date}`, update `profiles.weight_kg` only if `date` is today (or latest date), rather than overwriting current profile weight when logging past history. *(Source: [docs/audit-ag10.md#L126](docs/audit-ag10.md#L126) Q8, [docs/08-backend-plan.md#L68](docs/08-backend-plan.md#L68) P1)*
- [ ] **Trends Parity & Vector Tests**: Complete `internal/trends/trends.go` with 22 nutrient averages, previous-period comparison, weight summary, and generate/test shared vector `packages/vectors/period.json`. *(Source: [docs/audit-ag10.md#L125](docs/audit-ag10.md#L125) Q7, [docs/08-backend-plan.md#L183](docs/08-backend-plan.md#L183) P5)*
- [ ] **Fix `vectors-gen.test.ts` File Overwriting**: Update `apps/web/lib/__tests__/vectors-gen.test.ts` to assert against committed vector files instead of mutating `packages/vectors/targets.json` during normal `npm test` runs. *(Source: [docs/audit-ag10.md#L82](docs/audit-ag10.md#L82) §3)*

---

## 3. Data & Foods Catalog

- [ ] **Full Food Catalog Import (≥1,000 foods)**: Import datasets from Vietnam Food Composition Table, USDA Foundation & SR Legacy, and CNF Canada using `cmd/importfoods` with `ON CONFLICT (source, source_id)` (currently only 30 mock items exist). *(Source: [docs/audit-ag10.md#L122](docs/audit-ag10.md#L122) Q4, [docs/08-backend-plan.md#L100](docs/08-backend-plan.md#L100) P2, [OPEN_QUESTIONS.md#L7](OPEN_QUESTIONS.md#L7))*

---

## 4. Auth & Profile

- [ ] **Profiles `display_name`**: Add optional `display_name` column to `profiles` table and wire through `GET /me` and `PUT /me/profile`. *(Source: [OPEN_QUESTIONS.md#L150](OPEN_QUESTIONS.md#L150) cc-18)*
- [ ] **Email + Password Provider**: Enable email/password authentication alongside Google and Magic Link in Supabase. *(Source: [OPEN_QUESTIONS.md#L151](OPEN_QUESTIONS.md#L151) cc-18)*
- [ ] **Wire Real Auth Actions**: Replace localStorage mock behind `apps/web/lib/auth-actions.ts` with real Supabase Auth calls (`signInWithPassword`, `signUpWithPassword`, `sendPasswordReset`, `updatePassword`, `signOut`, `currentAccount`). *(Source: [OPEN_QUESTIONS.md#L151](OPEN_QUESTIONS.md#L151) cc-18)*
- [ ] **Password Reset Redirect**: Configure Supabase Auth email redirect URL to `/reset-password`. *(Source: [OPEN_QUESTIONS.md#L152](OPEN_QUESTIONS.md#L152) cc-18)*
- [ ] **Sign-Out Session Invalidation**: Ensure `signOut()` invalidates the active server session and Supabase tokens. *(Source: [OPEN_QUESTIONS.md#L153](OPEN_QUESTIONS.md#L153) cc-18, [docs/audit-ag10.md#L48](docs/audit-ag10.md#L48))*

---

## 5. Ops & CI

- [ ] **CI Auth Schema Dependency**: Fix `.github/workflows/api.yml` to provision Supabase `auth.users` schema before running migrations, preventing `000002_profiles_and_weight.up.sql` foreign key failure in CI. *(Source: [docs/audit-ag10.md#L126](docs/audit-ag10.md#L126) Q8, [docs/08-backend-plan.md#L49](docs/08-backend-plan.md#L49) P0)*
- [ ] **Hosting Decision**: Confirm backend and web hosting architecture (e.g. Render Singapore for Go API + Supabase vs Vercel for Next.js web). *(Source: [docs/08-backend-plan.md#L240](docs/08-backend-plan.md#L240) P6)*
