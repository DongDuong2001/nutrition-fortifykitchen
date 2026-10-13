# H1T MICRO — Backend checklist for Dong (13/10/2026)

The web app is feature-complete on mock data. This list is everything the backend needs so we can switch screen by screen to real data. Work top to bottom: each section unblocks the next. Tick a box only when its "Done when" line is true.

Sources: docs/audit-ag10.md, docs/08-backend-plan.md, docs/07-api-contract.md, OPEN_QUESTIONS.md. This file replaces docs/dong-checklist.md.

---

## 0. Working agreement
- [ ] Work on `feat/api` (branch from `origin/feat/ui`); merge to `feat/ui` with `--ff-only` after rebasing, so web gates stay green.
- [ ] Before any commit: `git checkout -- packages/vectors/targets.json` unless you meant to change it.
- [ ] Don't edit `apps/web/**` except `lib/api-client*`, `lib/supabase-client*`, `lib/auth-actions.ts` and their tests. Anything else: ask Hao first.
- [ ] After each section: run `go vet ./... && go test ./...` and, in `apps/web`, `npm run check` (typecheck + tests); paste the result in PROGRESS.md.

---

## 1. Security blockers (before anything is connected)
- [x] **Rich-in SQL injection.** `apps/api/internal/nutrition/repository.go` builds `per_100g->>'%s'` with `fmt.Sprintf` from the query param. Whitelist the nutrient key against the catalog (or use a parameter).
  Done when: a test sends `calcium'; DROP TABLE foods;--` and gets 400, and valid keys still work.
- [x] **Unverified JWT fallback.** Remove `parser.ParseUnverified` in `apps/api/internal/auth/middleware.go`. Missing `SUPABASE_JWT_SECRET` = the server refuses to start.
  Done when: an unsigned or badly signed token gets 401 in a test.

## 2. One contract
- [x] Make `docs/07-api-contract.md`, `apps/api/openapi.yaml` and the Go handlers agree: routes (`PUT /me/profile`, `GET /me/weight`, `PUT /me/weight/{date}`, `DELETE /me`, `DELETE /foods/custom/{id}`, `DELETE /days/{date}/meals/{meal}`), the response envelope (`{"data": …}` or not — pick one), goal enums (`build`/`deep_cut` vs `gain`/`cut_fast`).
  Done when: an OpenAPI lint passes and a contract test hits every route in the spec.
- [x] Error shape: one envelope with a stable `code` the web can map to Vietnamese messages (`PAST_DAY_READ_ONLY`, `RATE_LIMIT_EXCEEDED`, `VALIDATION`, `NOT_FOUND`, `UNAUTHORIZED`).

## 3. Auth (Supabase)
- [ ] Supabase project (ask Hao for access or create it and share it): Google, magic link and email + password enabled; reset-password redirect `/reset-password`; site URL and redirect URLs for local (3000), staging and prod.
- [ ] `profiles.display_name` (optional) through `GET /me` and `PUT /me/profile`.
- [ ] Replace the MOCK bodies in `apps/web/lib/auth-actions.ts` with Supabase calls: `signInWithPassword`, `signUpWithPassword`, `requestMagicLink`, `signInWithGoogle`, `sendPasswordReset`, `updatePassword`, `signOut`, `currentAccount`. The UI calls only this file. Keep its tests (mock the client).
- [ ] Magic link signs in **when the link is opened**, not when it is requested (the mock does the latter; delete the MOCK block).
- [ ] `signOut()` ends the Supabase session and clears local tokens.
  Done when: sign up → set up profile → sign out → sign in again works on staging with all three providers.

## 4. Food data
- [ ] Real import with `cmd/importfoods`: Vietnam FCT + USDA Foundation/SR Legacy (+ CNF if useful), `ON CONFLICT (source, source_id)`. Target ≥ 1.000 foods, Vietnamese names first.
- [ ] Unknown nutrient = `null`, never `0`. Every food keeps `source` and `source_id` (the web shows the source on food detail).
- [ ] **Drinks:** the web is adding an "Đồ uống" category. Import sourced drinks (water, tea, coffee, milk, soy milk, juices, sugarcane juice, coconut water, soft drinks, beer) with category `beverage`.
- [ ] Portions per food (`food_portions`): at least the common Vietnamese portion (chén, tô, ly, quả) plus 100 g.
  Done when: `GET /foods?q=pho` and `?q=nuoc mia` return sensible top hits; completeness report shows % of the 22 counted nutrients per food.

## 5. API gaps from the audit
- [x] Recents: `POST /days/{date}/entries` upserts `user_recents` (with the last portion).
- [x] Undo: restoring a soft-deleted entry within 10 s (`PATCH /entries/{id}` with `{"restore": true}` or a `POST /entries/{id}/restore`).
- [x] Weigh-in on a past date doesn't overwrite `profiles.weight_kg` (only today or the latest date does).
- [x] `/trends`: 22-nutrient averages, previous-period comparison, weight summary; shared vectors `packages/vectors/period.json` with a parity test against `apps/web/lib/period.ts`.
- [x] `lib/__tests__/vectors-gen.test.ts` compares against committed vectors instead of rewriting `packages/vectors/targets.json` on every run.

## 6. Data the new Tổng quan screens need (from tonight's UI)
One call per screen is the goal; these can be fields on `/trends` or `/days/{date}`.
- [x] Per-day series for the period (7 or 30 days): kcal, đạm, chất béo, tinh bột, chất xơ, and whether the day was a training day.
- [x] Days on target per metric (`met`/`of`) and the change vs the previous period.
- [x] Today: kcal eaten per meal (sáng, trưa, phụ, tối) and the minimum target.
- [x] Per nutrient (22 counted) for the period: average amount, target, % and level (Thiếu <50 / Trung bình 50–79 / Gần đủ 80–99 / Đạt ≥100), sorted lowest first.
- [x] Per nutrient: the top 3 logged foods that contributed most in the period.
- [x] Weigh-ins in the period (date, kg) and targets that depend on weight (kcal, đạm, kali) before → now when weight changed.

## 7. Web client and switch-over
- [ ] Generate `apps/web/lib/api-client.ts` from `openapi.yaml` (orval in CI), keeping the function names the UI already calls where possible.
- [ ] `NEXT_PUBLIC_API_MODE=mock|live` (default mock). Mock mode must keep every web gate identical.
- [ ] Offline: keep the localStorage diary as a cache/outbox; entries created offline sync with `client_id` idempotency.
  Done when: in live mode on staging, logging a meal, Gần đây, Bữa ăn của tôi, weight and Tổng quan all work against the API.

## 8. Ops
- [ ] CI (`.github/workflows/api.yml`): provision Supabase's `auth.users` before migrations.
- [ ] Hosting decision with Hao (Render Singapore for the Go API + Supabase, web on Vercel?) and a staging environment.
- [ ] Env vars documented in `docs/integration.md`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_MODE`.
- [ ] Rate limiter and RLS from api-p6 verified on staging (a second user can't read the first user's diary).

---

Questions or blockers: add a line under "Dong" in OPEN_QUESTIONS.md and tell Hao.

