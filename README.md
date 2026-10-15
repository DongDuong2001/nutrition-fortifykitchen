# H1T MICRO - Nutrition & Micronutrient Platform

A high-performance monorepo platform engineered for 22-micronutrient tracking, energy and macronutrient balance, idempotent meal logging, progressive coaching workflows, and mobile-first PWA offline capabilities.

---

## 1. Overview & Architecture

H1T MICRO delivers precision nutritional tracking calibrated against official dietary guidelines, including the Vietnamese Food Composition Table (National Institute of Nutrition, Ministry of Health) and USDA FoodData Central.

The platform follows a clean separation between an authenticated Go API service and a Next.js App Router client:

```
[ Next.js 16 Web Client / PWA ]
          |
          | HTTPS / HTTPOnly Cookies / Bearer JWT
          v
[ Go 1.24+ Modular Monolith API ]  <--->  [ Supabase Auth (ECC P-256 JWKS) ]
          |
          | pgxpool (Session Mode, Port 5432)
          v
[ PostgreSQL 17 Database (nutrition schema, RLS, pg_trgm) ]
```

### Technology Stack

- **Frontend Client (`apps/web`)**:
  - Framework: Next.js 16.4+ (App Router, Turbopack / Webpack build pipeline)
  - Core Library: React 19, TypeScript 5.x
  - Styling & Design System: Tailwind CSS v4, H1T MICRO design tokens
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

## 2. Repository Layout

```
.
|-- apps/
|   |-- api/                       # Go 1.24+ Modular Monolith backend
|   |   |-- cmd/
|   |   |   |-- server/            # API server entrypoint (router, middlewares, graceful shutdown)
|   |   |   `-- importfoods/       # Catalog ingestion tool (seeds 22 nutrients and food catalog)
|   |   |-- internal/
|   |   |   |-- auth/              # JWT verification (JWKS/HMAC), hCaptcha, RBAC middleware
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
|-- migrations/                    # Sequential SQL schema migrations (000001 to 000009)
|-- docs/                          # Comprehensive architectural and operational documentation
|-- scripts/                       # Database backup, restore, port management, and test runners
|-- packages/
|   `-- vectors/                   # Shared test vectors validating Go and TypeScript parity
|-- docker-compose.yml             # Local PostgreSQL 17 development service (localhost bound)
`-- .env.example                   # Unified environment variable template
```

---

## 3. Core Capabilities & Product Features

### Information Architecture v2 (IA-v2) Navigation
- **Hom nay (`/`)**: Daily coach dashboard with calorie dial, macro distribution, 4 meal slots (Breakfast, Lunch, Dinner, Snack), and 14-nutrient status column.
- **Tong quan (`/trends`)**: Periodic analytics across 7-day and 30-day windows:
  - Tom tat (`/trends`): High-level intake vs targets, day-on-target metrics, key moves.
  - Nang luong (`/trends/energy`): Caloric progression and macronutrient composition.
  - Vi chat (`/trends/micros`): 22-micronutrient completion rates and deficit rankings.
  - Co the (`/trends/body`): Body weight history and tracking.
- **Ghi nhanh (`/add`)**: Fast food logging, 1-tap re-logging from recent foods, and saved meal insertion.
- **Kham pha (`/explore`)**: Food catalog search, 10 food categories, "Giau..." micronutrient food lists, featured coaches directory (`/explore/coaches`), and community leaderboard (`/explore/leaderboard`).
- **Cai dat (`/settings`)**: Profile body data, daily targets, account management, notification reminders, data sources, Terms of Service (`/terms`), and Privacy Policy (`/privacy`).

### Progressive Coaching & Level System
- **Nutritional Mastery Tiers (Level 1 to 5)**:
  - Level 1: Nguoi moi bat dau (1-day streak)
  - Level 2: Ky luat co ban (3-day streak, 12 vi chat dat chuan)
  - Level 3: Can bang vi chat (7-day streak, 16 vi chat dat chuan)
  - Level 4: Dinh duong toi uu (14-day streak, 20 vi chat dat chuan)
  - Level 5: Bac thay H1T (Certified Coach level)
- **Coach Application & Verification**: Automatic advancement caps at Level 4. Level 4 users unlock the Coach Application workflow. Level 5 promotion requires administrative verification via the Admin Review portal (`/admin/review`).

### SEO & Legal Compliance
- **Robots.txt & Sitemap**: Native Next.js metadata routes (`/robots.txt` and `/sitemap.xml`) exposing public exploration routes while blocking private user data from search indexing.
- **Chinh sach bao mat (`/privacy`)**: Discloses exact data collection, PostgreSQL Row Level Security (RLS) isolation, zero advertising data sales, and user account deletion rights.
- **Dieu khoan dich vu (`/terms`)**: Contains explicit health and medical disclaimers declaring H1T MICRO as an educational tracking platform, not a provider of clinical medical diagnosis.

---

## 4. Prerequisites

Ensure the following tools are installed on your workstation:
- **Go**: Version 1.24 or higher
- **Node.js**: Version 22 LTS or higher
- **npm**: Version 10 or higher
- **Docker & Docker Compose**: Version 24+
- **PostgreSQL Client (`psql`)** or `golang-migrate` CLI (optional for manual migrations)

---

## 5. Step-by-Step Running Guide

### Step 1: Environment Configuration

Clone the repository and prepare your local environment file:

```bash
cp .env.example .env
```

Review `.env` and configure credentials:
- For local development with default settings, the database connection string is `postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable`.
- For mock frontend mode, set `NEXT_PUBLIC_API_MODE=mock`.
- For live backend connectivity, set `NEXT_PUBLIC_API_MODE=live` and provide valid Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWKS_URL`).

### Step 2: Start PostgreSQL Database

Launch the hardened PostgreSQL 17 container:

```bash
docker compose up -d
```

*Note: The database is bound strictly to `127.0.0.1:5432` to prevent unauthorized public network exposure.*

### Step 3: Run Database Migrations

Apply the 9 sequential migrations to provision schemas, extensions, tables, and RLS policies:

```bash
# Option A: Using psql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000001_init_nutrition_schema.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000002_profiles_and_weight.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000003_foods_catalog.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000004_diary_core.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000005_library.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000006_rls_hardening.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000007_profiles_display_name.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000008_foods_source_unique.up.sql
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000009_foods_plain_unique_index.up.sql

# Option B: Using golang-migrate CLI
migrate -path migrations -database "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" up
```

### Step 4: Seed Micronutrients & Food Catalog

Run the import CLI tool to seed the 22 counted micronutrients and standard Vietnamese food catalog:

```bash
cd apps/api
go run ./cmd/importfoods
```

This populates `nutrition.nutrients` with 10 minerals and 12 vitamins, along with the Vietnamese food database and common beverages.

### Step 5: Start the Backend API Service

Run the Go API server:

```bash
cd apps/api
go run ./cmd/server
```

- API Base URL: `http://localhost:8080`
- Health check: `http://localhost:8080/healthz` (verifies API and database pool health)

### Step 6: Start the Frontend Application

In a separate terminal, navigate to `apps/web`:

```bash
cd apps/web
npm install
npm run dev:3100
```

- Web Application URL: `http://localhost:3100`
- To run production build locally:
  ```bash
  npm run build
  npm run start
  ```

---

## 6. Verification & Quality Gates

Before committing changes or deploying releases, execute all quality gates across both workspaces.

### Backend Gates (`apps/api`)

```bash
cd apps/api

# 1. Static analysis & vet
go vet ./...

# 2. Execute full unit test suite
go test -count=1 -v ./...
```

### Frontend Gates (`apps/web`)

```bash
cd apps/web

# 1. Typecheck
npm run typecheck

# 2. Run Vitest test suite (56 test files, 666 unit tests)
npm run test

# 3. Compile production Next.js build (46 static/dynamic/metadata routes)
npm run build
```

---

## 7. Production Hardening & Operational Runbooks

The repository includes dedicated guides for production operations and security:

- **VPS Docker Security Runbook ([docs/10-vps-hardening.md](docs/10-vps-hardening.md))**:
  - Detailed post-mortem of Docker iptables firewall bypass vulnerabilities.
  - Commands for detecting and purging rogue miner processes masquerading as `postgres`.
  - Step-by-step Linux host firewall configuration using `DOCKER-USER` or `ufw-docker`.
  - SSH hardening (disabling password authentication, enforcing key pairs, fail2ban).

- **Production Go-Live Checklist ([docs/11-go-live-checklist.md](docs/11-go-live-checklist.md))**:
  - Pre-flight checklist covering DNS, SSL/TLS, and domain configuration.
  - Production secrets validation matrix.
  - Reverse proxy configurations (Caddy / Nginx) with HTTP/2 and Brotli compression.
  - Supabase Auth production redirect URL whitelisting.

- **Disaster Recovery & Database Backups ([docs/09-disaster-recovery.md](docs/09-disaster-recovery.md))**:
  - Automated daily encrypted backups to S3 / Cloudflare R2 (`scripts/db-backup.sh`).
  - Emergency database restoration procedure (`scripts/db-restore.sh`).

---

## 8. License & Terms

This software is proprietary and confidential. All rights reserved.

Unauthorized copying, reverse engineering, distribution, or public commercial deployment without prior written authorization from the copyright holders is strictly prohibited.

For inquiries or licensing terms, contact: `dongduong840@gmail.com`.
