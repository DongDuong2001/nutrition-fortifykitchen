# Production Go-Live Launch Checklist & Operational Runbook

This runbook defines the pre-flight verification steps, configuration matrix, and operational sanity checks required prior to opening H1T MICRO to public users.

---

## 1. Domain, DNS & SSL/TLS Configuration

- [ ] **DNS Records**:
  - Apex domain (`h1tmicro.vn`): A record pointing to VPS public IP or CNAME to hosting provider.
  - Subdomains (`www.h1tmicro.vn`, `api.h1tmicro.vn`): Configured with 300s TTL during cutover.
- [ ] **SSL/TLS Certificates**:
  - Enforce TLS 1.3 (fallback TLS 1.2 minimum).
  - Verify automatic renewal via Let's Encrypt (Certbot / Caddy).
  - Test SSL grade via Qualys SSL Labs (target Grade A or A+).
- [ ] **HTTP to HTTPS Redirection**:
  - Confirm all plain HTTP traffic on port 80 returns a 301 Permanent Redirect to `https://`.

---

## 2. Production Environment Variables Matrix

All production secrets must reside in non-committed `.env` files with file mode `chmod 600`.

### Backend API (`apps/api/.env`)
```bash
ENVIRONMENT=production
PORT=8080
# Must use non-default user/password and require SSL
DATABASE_URL=postgresql://<prod_user>:<strong_password>@<db_host>:5432/<prod_db>?sslmode=require
CORS_ALLOWED_ORIGINS=https://h1tmicro.vn,https://www.h1tmicro.vn

# Supabase Auth & JWT
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<prod_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<prod_service_role_key>
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json

# Webhooks & Integrations
PAYOS_CLIENT_ID=<prod_client_id>
PAYOS_API_KEY=<prod_api_key>
PAYOS_CHECKSUM_KEY=<prod_checksum_key>
HCAPTCHA_SECRET_KEY=<prod_hcaptcha_secret>
HCAPTCHA_SITE_KEY=<prod_hcaptcha_site_key>
SENTRY_DSN=https://<key>@sentry.io/<project>
```

### Frontend Web (`apps/web/.env.local` or Hosting Platform Environment)
```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://h1tmicro.vn
NEXT_PUBLIC_API_URL=https://api.h1tmicro.vn/api/v1
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod_anon_key>
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=<prod_hcaptcha_site_key>
```

---

## 3. Supabase Authentication Hardening

1. **URL Configuration**:
   - Site URL: `https://h1tmicro.vn`
   - Redirect URLs whitelist:
     - `https://h1tmicro.vn/auth/callback`
     - `https://h1tmicro.vn/signin`
     - `https://h1tmicro.vn/reset-password`
     - `https://www.h1tmicro.vn/auth/callback`
2. **Email Templates**:
   - Customize Magic Link, Confirmation, and Password Reset templates with official H1T branding.
   - Set OTP expiration to 15 minutes (900 seconds).
3. **Rate Limiting**:
   - Configure Supabase email rate limit: maximum 30 emails per hour per IP.
4. **Third-Party Providers (Google OAuth)**:
   - Verify OAuth consent screen is published to Production (not Testing/Sandbox).
   - Authorize JavaScript origins: `https://h1tmicro.vn`.
   - Authorize redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

---

## 4. Database Pre-Launch Verification

1. **Migrations Status**:
   - Confirm all 8 schema migrations are applied on production:
     - `000001_init_nutrition_schema`
     - `000002_profiles_and_weight`
     - `000003_foods_catalog` (with pg_trgm and unaccent extensions)
     - `000004_diary_core`
     - `000005_library`
     - `000006_rls_hardening`
     - `000007_profiles_display_name`
     - `000008_foods_source_unique`
2. **Catalog Seed**:
   - Verify 22 counted nutrients are seeded in `nutrition.nutrients`.
   - Verify standard food items and beverages are imported via `importfoods`.
3. **Connection Pool Sizing**:
   - Go API pool defaults to `MaxConns = 25`, `MinConns = 5`.
   - Ensure PostgreSQL `max_connections` (in `postgresql.conf`) is set to at least 100 to allow room for API pool, migrations, and administrative connections.
4. **Automated Offsite Backup**:
   - Test `scripts/db-backup.sh` dry-run.
   - Ensure daily cron schedule executes at 02:00 UTC and uploads encrypted dump to S3/Cloudflare R2.

---

## 5. Reverse Proxy & Network Hardening

### Recommended Caddy Configuration
```caddy
h1tmicro.vn, www.h1tmicro.vn {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Frontend proxy
    reverse_proxy 127.0.0.1:3000
}

api.h1tmicro.vn {
    encode gzip zstd

    # Backend Go API proxy
    reverse_proxy 127.0.0.1:8080 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 6. Observability & Health Checks

- [ ] **Health Endpoint**: Configure external monitoring (e.g., UptimeRobot, BetterStack) to poll `https://api.h1tmicro.vn/healthz` every 60 seconds.
- [ ] **Sentry Error Tracking**: Trigger a test error to verify stack traces, release tags, and environment indicators appear in Sentry dashboard.
- [ ] **Log Retention**: Set up log rotation (`logrotate`) on VPS for Docker container logs (`/var/lib/docker/containers/*/*.log`) with 14-day retention and 50MB file rotation limit.

---

## 7. Rollback & Contingency Plan

1. **API Rollback**:
   - If a fatal issue occurs immediately after deployment:
     ```bash
     docker compose down
     docker compose up -d --build
     ```
2. **Database Rollback**:
   - If data corruption or schema failure occurs, invoke:
     ```bash
     ./scripts/db-restore.sh /path/to/pre-migration-snapshot.sql.gz
     ```
3. **Frontend Rollback**:
   - In hosting providers (Vercel/Cloudflare Pages), use one-click Instant Rollback to the previous deployment ID.
