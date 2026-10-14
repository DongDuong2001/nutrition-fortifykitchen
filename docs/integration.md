# H1T MICRO — Integration & Operations Guide

## 1. Environment Variables

### Backend (`apps/api`)
| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `PORT` | HTTP port for the Go API server | `8080` (Antigravity dev: `3100`, Claude Code: `3101`) | Yes |
| `DATABASE_URL` | PostgreSQL connection string (Supabase or direct pool) | `postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require` | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret used to verify bearer tokens HMAC-SHA256 | Long secret from Supabase Dashboard > Project Settings > API | Yes |
| `ENVIRONMENT` | Environment name | `development`, `staging`, `production` | Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | `http://localhost:3000,http://localhost:3100,https://staging.h1tmicro.app` | Yes |
| `SENTRY_DSN` | Sentry error monitoring DSN (5xx errors only) | Optional | No |

### Frontend (`apps/web`)
| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Go REST API | `http://localhost:8080/api/v1` or staging URL | Yes |
| `NEXT_PUBLIC_API_MODE` | API connection mode: `mock` (default) or `live` | `mock` / `live` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://<ref>.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anonymous key | `eyJhbGciOi...` | Yes |

---

## 2. Infrastructure & Hosting Decisions

1. **Go API**:
   - Platform: Render (Web Service), Singapore region (`ap-southeast-1`), co-located with Supabase Singapore.
   - Run command: `./bin/server`
   - Health check path: `/healthz`
   - Auto-deploy from branch `feat/api` (staging) and `main` (production).

2. **Database**:
   - Supabase PostgreSQL, Singapore region (`ap-southeast-1`).
   - Connection pool: pgx connection pool with max 25 connections in Go monolith.
   - Backup strategy: 3-pillar model (Supabase PITR, daily offsite GitHub Actions backup to S3/R2 at 02:00 VN, and pre-migration `make db-backup`). Complete runbook in `docs/09-disaster-recovery.md`.

3. **Frontend**:
   - Vercel (Edge Network + Serverless SSR Next.js 16).
   - Custom domain: `h1tmicro.app` (production), `staging.h1tmicro.app` (staging).

---

## 3. Supabase Auth Configuration

1. **Providers**:
   - **Email / Password**: Enabled.
   - **Magic Link (OTP)**: Enabled. Signs in only when the callback link is opened in browser.
   - **Google OAuth**: Enabled. Client ID & Secret configured in Google Cloud Console.

2. **URL Configuration**:
   - Site URL: `https://h1tmicro.app`
   - Staging Redirect URL: `https://staging.h1tmicro.app/**`
   - Local Redirect URLs:
     - `http://localhost:3000/**`
     - `http://localhost:3100/**`
     - `http://localhost:3101/**`
     - `http://localhost:3102/**`
   - Reset Password Redirect: `/reset-password`

---

## 4. Security Verification

### Row Level Security (RLS)
Every table under schema `nutrition` has RLS enabled with isolation policies:
```sql
CREATE POLICY user_isolation_policy ON nutrition.<table_name>
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
- Verification: Create two user accounts (User A, User B). Verify that `GET /days/{date}` or `GET /favourites` authenticated as User A returns only User A's data, and querying User B's entries yields empty/forbidden results.

### Write Rate Limiting
- A sliding-window token limiter limits each authenticated user to 60 writes per minute across mutation endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- Upon exceeding 60 writes/minute, API responds with HTTP 429:
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "write rate limit exceeded"
    }
  }
  ```
  and includes the `Retry-After: <seconds>` HTTP header.
