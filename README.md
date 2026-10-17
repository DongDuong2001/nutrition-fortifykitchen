# H1T MICRO - Nutrition & Micronutrient Platform

A high-performance monorepo platform engineered for 22-micronutrient tracking, energy and macronutrient balance, idempotent meal logging, progressive coaching workflows, and mobile-first PWA offline capabilities.

---

## 1. Overview & Architecture

H1T MICRO delivers precision nutritional tracking calibrated against official dietary guidelines, including the Vietnamese Food Composition Table (National Institute of Nutrition, Ministry of Health) and USDA FoodData Central.

### High-Level Architecture

```
[ Next.js 16 Web Client / PWA ] (Port 3000 in Docker / 3100 in dev)
          |
          | HTTPS / HTTPOnly Cookies (Same-Origin via Caddy)
          v
[ Caddy 2 Reverse Proxy ] (Ports 80 / 443, Automatic Let's Encrypt TLS)
    |                  |
    | /api/*           | /*
    v                  v
[ Go 1.24+ API ]   [ Next.js Web App ]
    |
    +---> [ Supabase Auth ] (ECC P-256 JWKS validation)
    |
    +---> [ PostgreSQL 17 Database ] (Supabase Session Pooler / Port 5432)
```

### Technology Stack

- **Frontend Client (`apps/web`)**:
  - Framework: Next.js 16.4+ (App Router, Turbopack / Webpack build pipeline)
  - Core Library: React 19, TypeScript 5.x
  - Styling & Design Tokens: Tailwind CSS v4, H1T MICRO color and spacing tokens
  - Icons: Official `@mynaui/icons-react` suite unified via centralized adapter (`components/ui/icons.tsx`)
  - Authentication: Supabase Auth (`@supabase/ssr`) with secure HTTPOnly cookies and PKCE callback flow
  - Offline Engine: Custom Service Worker (`public/sw.js`) with app shell precaching, runtime caching, and client offline outbox synchronization

- **Backend API (`apps/api`)**:
  - Language: Go 1.24+ Modular Monolith
  - HTTP Router: Chi v5 (`github.com/go-chi/chi/v5`)
  - Database Driver: `pgx/v5` via `pgxpool` (session mode, search_path: `nutrition, public, extensions`)
  - JWT Verification: Dual ECC P-256 (ES256 via JWKS cache) and HMAC (HS256)
  - Bot Protection: hCaptcha verification middleware
  - DoS Defense: `MaxBodySize` payload limiter (2 MB) and per-user write rate limiter (60 writes/min)
  - Observability: Zerolog structured JSON logging and Sentry error tracking

- **Database Engine (`migrations/`)**:
  - PostgreSQL 17 (Supabase compatible)
  - Isolated Schema: `nutrition`
  - Advanced Indexing: Trigram search (`pg_trgm`), unaccent text matching, expressions for rich-in nutrient queries, and partial indexes for active diary logs

---

## 2. Key Architectural Concepts for Maintainers

### 2.1 Multi-Device Synchronization & Offline Architecture
- **Client Store (`apps/web/lib/diary-store.tsx`)**:
  - The client maintains state for today and viewed dates.
  - When offline or during network latency, created/updated entries are saved to an offline outbox in `localStorage` under `h1t_offline_outbox_v1_<accountId>`.
  - Background synchronization (`syncOfflineOutbox`) replays queued actions idempotently using UUIDv4 entry IDs.
- **Revalidation on Focus / Visibility**:
  - `refreshRemoteDay(iso)` triggers automatically whenever the browser tab becomes active (`visibilitychange`), receives focus (`window.onfocus`), or reconnects (`window.online`).
  - Remote entries from `apiClient.getDay(iso)` reconcile cleanly with the local state while preserving entries still pending in the offline outbox.
- **Same-Origin API Routing**:
  - In production, Caddy reverse-proxies requests to `/api/*` directly to the Go API container (`api:8080`).
  - `NEXT_PUBLIC_API_URL` should be configured as `/api/v1` (same-origin with the apex domain `lehongkhanh.vn`). This prevents Safari ITP and modern browser third-party cookie restrictions from dropping the `sb-access-token` HTTPOnly session cookie.

### 2.2 Custom Food Privacy & Data Isolation
- Standard foods in the catalog have `is_custom = false` and `created_by = NULL`.
- Custom foods created by a user have `is_custom = true` and `created_by = $userID`.
- The `OptionalAuthenticate` middleware (`apps/api/internal/auth/middleware.go`) extracts user tokens if present without blocking unauthenticated guests:
  - Unauthenticated guests can search and view standard foods only (`is_custom = false`).
  - Authenticated users see both standard foods and their own custom foods (`is_custom = false OR created_by = $userID`).
  - Accessing another user's custom food directly via `/api/v1/foods/{id}` returns `404 Not Found`.
- Diary entries snapshot nutrient totals and names at the time of logging (`nutrition.diary_entries`), ensuring that future changes or deletions of food items never corrupt past historical logs.

### 2.3 Portion Scaling & Input Clamping
- Portion handling lives in `apps/web/lib/portion.ts`.
- **Upper Limit Guard**: `MAX_GRAMS_PER_PORTION = 5000` (5 kg). All inputs parsed via `parseGramsInput` are clamped to prevent accidental overflow (e.g. typing 100000 instead of 100.0) from ballooning daily calorie calculations.
- Decimal formatting supports Vietnamese comma notation (`2,5 g`) as well as standard dots (`2.5 g`).

### 2.4 Macro Targets & Interaction
- Macro target configuration lives at `/settings/targets/macros`:
  - **Ratios (%) Mode**: Allows adjusting Protein / Carbs / Fat percentages constrained to 100% total.
  - **Fixed (g) Mode**: Direct gram inputs for bodybuilding and specific clinical protocols.
  - **Keto Mode**: 70% Fat, 25% Protein, 5% Carbs preset.
- Meal logging supports HTML5 drag-and-drop between meal slots with visual drop indicators, and long-press (500 ms + haptic) multi-select mode for batch deletion with an instant undo toast.

### 2.5 Coaching & Roles
- Roles (`user`, `coach`, `admin`) are defined exclusively in `nutrition.profiles.role`.
- Levels (Level 0: self-managed; Levels 1 to 5: progressive nutrient guidance) determine which nutrients are surfaced on the daily dashboard (`lib/level-nutrients.ts`).
- Admin review portal (`/admin/review`) allows administrators to inspect meal plans and coach applications.

---

## 3. Repository Layout

```
.
|-- apps/
|   |-- api/                       # Go 1.24+ Modular Monolith backend
|   |   |-- cmd/
|   |   |   |-- server/            # API server entrypoint (router, middlewares, graceful shutdown)
|   |   |   `-- importfoods/       # Catalog ingestion tool (seeds 22 nutrients and food catalog)
|   |   |-- internal/
|   |   |   |-- auth/              # JWT verification (JWKS/HMAC), hCaptcha, RBAC, OptionalAuth
|   |   |   |-- config/            # Centralized environment configuration with production validator
|   |   |   |-- diary/             # Daily food logging, meal slot summaries, copy yesterday
|   |   |   |-- library/           # Favourites, user recents, saved meals ("Bua an cua toi")
|   |   |   |-- logger/            # Zerolog structured request logger
|   |   |   |-- nutrition/         # Food catalog, trigram search, rich-in nutrient filters
|   |   |   |-- payment/           # PayOS VietQR payment gateway integration
|   |   |   |-- profile/           # User body metrics, daily targets, weight logs
|   |   |   |-- ratelimit/         # In-memory sliding window write rate limiter
|   |   |   |-- targets/           # Coach target calculations (deterministic Go parity)
|   |   |   |-- trends/            # Period trends aggregation (averages, streak, daily series)
|   |   |   `-- vault/             # Coach markdown draft ingestion via GitHub webhooks
|   |   `-- pkg/                   # Reusable packages (database connection pool, response helpers)
|   `-- web/                       # Next.js 16.4+ web application
|       |-- app/                   # App Router routes, layouts, error boundaries, SEO metadata
|       |-- components/            # UI components (atoms, cards, sheets, headers, navigation)
|       |-- hooks/                 # Custom React hooks (food browse, navigation history, PWA)
|       `-- lib/                   # API client, targets calculation, levels, formatting, PWA helpers
|-- deploy/                        # Production deployment manifests and run scripts
|   |-- Caddyfile                  # Caddy 2 reverse-proxy configuration
|   |-- docker-compose.prod.yml    # Production 3-tier container stack (web, api, caddy)
|   |-- deploy.sh                  # Zero-downtime production deployment and rollback script
|   |-- setup-server.sh            # Idempotent VPS provisioner (Docker, UFW, Swap, Fail2ban)
|   `-- .env.prod.example          # Production environment variable template
|-- migrations/                    # Sequential SQL schema migrations (000001 to 000011)
|-- docs/                          # Comprehensive architectural and operational documentation
|-- scripts/                       # Database backup, restore, port management, and test runners
|-- packages/
|   `-- vectors/                   # Shared test vectors validating Go and TypeScript parity
|-- docker-compose.yml             # Local PostgreSQL 17 development service (localhost bound)
`-- .env.example                   # Unified environment variable template
```

---

## 4. Local Development Guide

### Prerequisites
- **Go**: Version 1.24 or higher
- **Node.js**: Version 22 LTS or higher
- **npm**: Version 10 or higher
- **Docker & Docker Compose**: Version 24+

### Step 1: Environment Setup

```bash
cp .env.example .env
```

Review `.env`:
- Database connection: `postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable`
- To run frontend in mock mode: `NEXT_PUBLIC_API_MODE=mock`
- To run frontend with live backend: `NEXT_PUBLIC_API_MODE=live` and `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`

### Step 2: Start Local PostgreSQL Database

```bash
docker compose up -d
```
*The container binds strictly to `127.0.0.1:5432`.*

### Step 3: Run Database Migrations

Apply the 11 sequential migrations in order:

```bash
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000001_init_nutrition_schema.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000002_profiles_and_weight.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000003_foods_catalog.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000004_diary_core.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000005_library.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000006_rls_hardening.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000007_profiles_display_name.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000008_foods_source_unique.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000009_foods_plain_unique_index.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000010_user_roles.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000011_diary_nullable_calories.up.sql
```

### Step 4: Seed Food & Micronutrient Catalog

```bash
cd apps/api
go run ./cmd/importfoods
```
Populates `nutrition.nutrients` with 10 minerals and 12 vitamins, standard Vietnamese foods, and common beverages.

### Step 5: Start Backend API

```bash
cd apps/api
go run ./cmd/server
```
- API Base URL: `http://localhost:8080`
- Health check: `http://localhost:8080/healthz`

### Step 6: Start Frontend Application

In another terminal:

```bash
cd apps/web
npm install
npm run dev:3100
```
- Application URL: `http://localhost:3100`

---

## 5. Verification & Quality Gates

Run all quality gates before committing code or merging branches:

### Backend Quality Gates (`apps/api`)
```bash
cd apps/api
go vet ./...
go test -count=1 -v ./...
```

### Frontend Quality Gates (`apps/web`)
```bash
cd apps/web

# 1. Typecheck (zero errors required)
npm run typecheck

# 2. Vitest unit tests (92 suites, 1077 tests)
npm run test

# 3. Production build
npm run build
```

---

## 6. Production Deployment & Operations

### Production Architecture
- Deployment runbook: `docs/deploy.md`
- Production manifests live in `deploy/`:
  - `deploy/docker-compose.prod.yml`: 3 services (`web`, `api`, `caddy`).
  - `deploy/Caddyfile`: Reverse proxy, SSL auto-provisioning, HTTP to HTTPS redirection.
  - `deploy/deploy.sh`: Automated build and zero-downtime deployment script.

### Deploying to VPS
On the VPS (as the `deploy` user in the repository directory):

```bash
deploy/deploy.sh
```
The script will:
1. Pull the latest commits from `main`.
2. Build new Docker images for `web` and `api` in the background.
3. Perform a zero-downtime container swap once the new images pass health checks.
4. Prune dangling Docker images.

### Instant Rollback
If an issue occurs in production, roll back to a specific commit or tag within 1 minute:

```bash
deploy/deploy.sh <previous-commit-or-tag>
# Example: deploy/deploy.sh 2337c46
```

### Operational Runbooks
- **VPS Hardening Guide**: `docs/10-vps-hardening.md` (firewall, fail2ban, docker isolation)
- **Production Go-Live Checklist**: `docs/11-go-live-checklist.md` (pre-flight DNS, TLS, secrets)
- **Disaster Recovery & Backup**: `docs/09-disaster-recovery.md` (database backup and restore procedures)

---

## 7. Maintainer Guidelines

1. **Ponytail Rule (Minimal & Clean)**: Prefer standard libraries, native browser features, and existing utilities over adding heavy dependencies or message brokers (e.g. no Redis, no Kafka, no Asynq for simple client-to-server sync).
2. **Number & String Formatting**: All numbers displayed in Vietnamese UI must use `lib/format.ts` (`1.041` for thousands, `2,1` for decimals).
3. **Commit Integrity**: Commit file-by-file with clean messages. Never include tool names or emojis in commits, code, or documentation.

---

## 8. License

This software is proprietary and confidential. All rights reserved.
For inquiries, contact: `dongduong840@gmail.com`.
