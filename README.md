# H1T MICRO - Nutrition & Micronutrient Platform

A high-performance monorepo platform for comprehensive 26-nutrient tracking, idempotent meal logging, training electrolyte management, and menu synchronization.

---

## 1. Architecture & Stack

This repository uses a monorepo structure separating the frontend application and backend service:

- **Frontend (`apps/web`)**:
  - Framework: Next.js 16.4+ (App Router, Turbopack)
  - Runtime & Library: React 19, TypeScript 5.x
  - Styling: Tailwind CSS v4, H1T MICRO design tokens
  - Authentication: Supabase Auth (`@supabase/ssr`)
  - Icons: Localized vector SVG icon suite

- **Backend (`apps/api`)**:
  - Language & Runtime: Go 1.24+ Modular Monolith
  - HTTP Router: `github.com/go-chi/chi/v5`
  - Database Driver: `github.com/jackc/pgx/v5` (via `pgxpool`, session mode)
  - Observability: `github.com/getsentry/sentry-go`

- **Database (`migrations/`)**:
  - PostgreSQL 17 engine (Supabase-compatible)
  - Dedicated schema: `nutrition`
  - Tables: `foods`, `diary_logs`, `user_targets`, `coach_drafts`

- **Third-Party Integrations**:
  - Supabase Auth: JWT Bearer verification, Role-Based Access Control (`app_metadata.role == "admin"`)
  - PayOS: VietQR payment gateway with HMAC-SHA256 signature verification
  - Fortify Kitchen Core API: Upstream menu synchronization via API key headers
  - GitHub Vault: Markdown ingestion from private repositories via Webhook and Fine-grained PAT

---

## 2. Repository Layout

```
.
|-- apps/
|   |-- api/                    # Go 1.24+ Modular Monolith backend
|   |   |-- cmd/server/         # Application entry point
|   |   |-- internal/           # Domain packages (auth, diary, nutrition, vault, payment)
|   |   `-- pkg/                # Shared utilities (database, response)
|   `-- web/                    # Next.js 16.4+ web application
|       |-- app/                # App Router pages and layouts
|       |-- components/         # H1T MICRO UI atoms, cards, and layouts
|       |-- hooks/              # Custom hooks (optimistic diary log, nutrient progress)
|       `-- lib/                # API client, Supabase client, icon suite
|-- migrations/                 # PostgreSQL schema migrations
|-- tasks/                      # Sequential task specifications for AI agents
|-- scripts/                    # Automation and setup helper scripts
|-- docker-compose.yml          # Local PostgreSQL 17 development service
|-- Makefile                    # Common build and development targets
`-- .env.example                # Sample environment variables
```

---

## 3. Getting Started

### Prerequisites

- Go 1.24 or higher
- Node.js 22 or higher
- npm 10 or higher
- Docker and Docker Compose

### Step 1: Environment Setup

Clone the repository and copy the environment template:

```bash
git clone https://github.com/DongDuong2001/nutrition-fortifykitchen.git
cd nutrition-fortifykitchen
cp .env.example .env
```

Populate the required keys in `.env` (database connection, Supabase keys, PayOS credentials, and webhook secrets).

### Step 2: Database Initialization

Start the local PostgreSQL container:

```bash
docker compose up -d
```

Apply database migrations:

```bash
make db-migrate
```

Or apply manually via `psql`:

```bash
psql "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" -f migrations/000001_init_nutrition_schema.up.sql
```

### Step 3: Run the Backend Service

Navigate to `apps/api` and start the server:

```bash
cd apps/api
go mod download
go run ./cmd/server
```

The API service runs on `http://localhost:8080`.

### Step 4: Run the Frontend Application

In a separate terminal, navigate to `apps/web`:

```bash
cd apps/web
npm ci
npm run dev
```

The frontend application runs on `http://localhost:3000`.

---

## 4. Key Capabilities & Logic

### 26-Nutrient Scaling Formula

Nutrient calculation is deterministic based on reference values per 100g:

```
grams = quantity * serving_size_g
nutrient_value = (per_100g_value * grams) / 100
```

This formula is computed across 11 macronutrients, 11 minerals, and 4 vitamins.

### Idempotent Meal Logging

Meal entries use client-generated UUIDs (`crypto.randomUUID()`) passed in the payload. The backend database insert applies `ON CONFLICT (id) DO NOTHING`, ensuring network retries and optimistic front-end operations never create duplicate records.

### H1T MICRO Design System

- High-contrast carbon dark header (`#0A0A0A`) with circular calorie dial indicator.
- Segmented progress bars with 4-tier status thresholds:
  - Deficit (<50%): Coral Red (`#EF4444`)
  - Moderate (50-79%): Amber / Gold (`#EAB308`)
  - Near Target (80-99%): Emerald Green (`#10B981`)
  - Target Reached (>=100%): Electric Blue (`#2563EB`)
- Responsive multi-device adaptation: fixed bottom dock on mobile and multi-column dashboard on desktop.

---

## 5. Testing & Verification

Run backend unit tests:

```bash
cd apps/api
go test -v ./...
```

Run frontend typecheck and production build:

```bash
cd apps/web
npm run typecheck
npm run build
```

---

## 6. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
