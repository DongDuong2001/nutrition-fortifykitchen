# Handover for Dong, 20/10/2026

Dong is out of service; Hao is covering the backend and the data until Dong is back. This is the one page to read first.

## What changed on the API

- **made_at rule (PRs #21, #26).** A diary write is judged by when the user made it, not when it reached the server. The web sends the outbox item's creation time as `made_at` (RFC 3339) on every send and retry. The day is writable when it is no older than yesterday counted from made_at's Ho Chi Minh day. A made_at older than 14 days, or more than 5 minutes ahead of the server clock, is refused for good. Without `made_at` the old rule holds (today and yesterday on the server clock). Code: `apps/api/internal/diary/date.go`.
- **PR #20 API hardening.**
  - A write guard (`internal/csrf`): POST, PUT, PATCH and DELETE on `/api/v1` need `Content-Type: application/json` and a matching `Origin`. The webhooks (`/payments/webhook`, `/vault/webhook`) are exempt.
  - Generic 500s: the error is logged with ids and the client gets a fixed message.
  - `GET /foods?limit=` without `q` allows up to 5,000, so the web loads the catalogue in one request.
  - `kind: vitals` on `/client-errors` (LCP, INP, CLS, FCP, TTFB), logged only, no table.
- **internal/targets (PR #27).** Targets sit at the upper end of the coach's range, US DRI amounts for vitamins and minerals, and tolerable upper limits (UL). The shared-vector tests (`packages/vectors`) now run instead of being skipped.

## Data work done on 20/10 (Hao ran it on the server)

Deployed main `16d276c` at about 14:40 (VERSION 2026-10-21.3). Rollback target: `d22b237`.

Backups taken before the imports: `~/foods-backup-1020.sql` and `~/nutrition-backup-1020.sql` (on the server).

| Import | Rows |
|---|---|
| new-foods-2026-10-20 | 6 new foods |
| new-foods-2026-10-20b | 4 new foods |
| fix-outliers-2026-10-20 | 9 foods corrected |
| fix-kefir-2026-10-20 | 1 food |
| `--edible-portions` | 9 renames |

Details: `docs/data/new-foods-2026-10-20.md`, `new-foods-2026-10-20b.md`, `fix-outliers-2026-10-20.md`, `fix-kefir-2026-10-20.md` (PRs #22 and #24; they are docs and data only, the imports are already in production).

- **Kefir SQL**: `docs/data/remove-kefir-lowfat-2026-10-20.sql` (committed). It moved 26 `diary_logs` and 18 recents to the kept row (`cnf`, CNF 6291) and archived FDC 170904.
- **Red Bull** (food `2d27e50a-3cf8-49f4-ba55-10def014f96f`) got the portion "1 lon (250 ml)" = 260 g (sort 0) by SQL; "100 ml" = 104 g moved to sort 1. This portion is not in any file of this repo, so a re-import from `food-research/` would lose it: see OPEN_QUESTIONS.

## Open items (all yours or Hao's call)

- `profiles.custom_targets` JSONB column and API, spec in `docs/pr/cc-73b-custom-targets.md` (the web side is built and switched off).
- A search-alias column, instead of renaming `name_vi` to make a food findable.
- Doubtful rows in `docs/data/fix-outliers-2026-10-20.md` §3 (not changed, need a source).
- A web job in CI (`gate:fast` and `check:live-bundle` are ready to wire in).
- Session revocation check (needs `auth.sessions`).
- Profile `updated_at` (needs a migration).

## Rules used while Dong is away

1. `pg_dump` first, every time.
2. Run the SQL with ROLLBACK first and read the result, then run it again with COMMIT.
3. Migrations go to staging before production.
