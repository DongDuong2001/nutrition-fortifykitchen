# Integration: what is next (mock and live modes)

Written 14/10 (night shift, i-2a). One flag decides where sign-in and data come from.

## The switch

| `NEXT_PUBLIC_API_MODE` | Behaviour |
|---|---|
| unset, or anything but `live` (default) | **Mock.** Accounts and the diary live in this browser (localStorage). No network. Gates, probes and demos run without a backend. |
| `live` | **Live.** Sign-in goes to Supabase Auth (`lib/supabase-client.ts`) and data goes to the Go API (`lib/api-client.ts`). |

- `lib/api-mode.ts` is the one place that reads the flag for sign-in (`isLiveMode()`).
- `lib/auth-actions.ts` is the only interface the auth screens call. Live bodies are in that file; the mock bodies are
  `lib/auth-mock.ts`. Both share the validators and the Vietnamese messages.
- Tests: `lib/__tests__/auth-actions.test.ts` (live, Supabase client mocked) and `auth-actions-mock.test.ts` (mock).
- Why a default of mock: on 13/10 the live auth actions replaced the mock outright, and without Supabase variables
  every sign-in probe timed out against `dummy-project.supabase.co`. Hao and the probes need a working local app.

## What Hao must provide for live mode

1. **Supabase project**: URL and anon key → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   In Supabase Auth: enable Email + password, Magic link and Google; add the site URL and the redirect URLs
   `/setup/profile` and `/reset-password`.
2. **API base URL** of the deployed Go API → `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`).
3. **Database URL** (Supabase Postgres) for the Go API and the migrations (`DATABASE_URL`), plus the JWT secret the API
   verifies.
4. **Hosting** for the web app and the API (both need HTTPS); set the three `NEXT_PUBLIC_*` variables and
   `NEXT_PUBLIC_API_MODE=live` at build time (Next inlines them).

## Remaining steps (Dong)

- Run migrations and import the food catalogue (≥ 1.000 foods, docs/08-backend-plan.md Phase 2).
- Check the live flows once with real credentials: sign-up, magic link opened from the email, Google, password reset,
  sign-out, then the diary reads/writes through `apiClient`.
- Delete `lib/auth-mock.ts` and the `isLiveMode()` branches in `lib/auth-actions.ts` before any deployed build
  (mock mode must not ship).
- The probes that sign in (cc2_15, cc2_15b, cc2_15c, cc_18, cc_19) run in mock mode. A live-mode probe needs a test
  account and is out of scope until the project exists.
