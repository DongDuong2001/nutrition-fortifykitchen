# 7. Nutrition API Contract for Backend (Go API & Supabase)

This document defines the formal API Contract between the Web Frontend (`apps/web`) and the Go Backend API developed by Dong on top of Supabase PostgreSQL 17 (`nutrition` schema).

All resource models, endpoints, and business invariants are derived directly from the active H1T MICRO screens (`apps/web`), system architecture specifications (`docs/00`–`06`, `HANDOFF.md`, `design/SPEC.md`), and the database migration schema (`migrations/000001_init_nutrition_schema.up.sql`).

---

## 1. Overview & Conventions

### 1.1. Purpose & Integration Strategy
The web application currently operates with a typed mock layer (`lib/mock/`, `lib/api-client.ts`, `lib/diary-store.tsx`). This contract establishes the exact RESTful JSON endpoints required to replace mock adapters with real Go API calls while preserving zero-latency client interactions and deterministic UX.

### 1.2. Authentication & User Identity
- **Mechanism**: Supabase Auth sessions (Email Magic Link and Google OAuth).
- **Transport Header**: Every authenticated HTTP request sends the Bearer JWT:
  ```http
  Authorization: Bearer <supabase_access_token>
  ```
- **Backend Token Validation**: The Go API authentication middleware (`internal/auth/middleware.go`) validates the token signature against the Supabase JWT secret / JWKS, extracts the `sub` claim as the authenticated User UUID, and sets it into the request context (`auth.UserIDKey`).
- **User Context Isolation**: The web client **never** transmits `user_id` in request payloads, path parameters, or query strings for personal resources (profile, diary logs, favourites, recents, custom foods). The Go API extracts `user_id` strictly from the verified JWT context to guarantee multi-tenant security and prevent tampering.

### 1.3. Dates, Timezone & "Today" Semantics
- **Business Timezone**: `Asia/Ho_Chi_Minh` (UTC+7). The definition of "Today" (`todayIso`) and calendar date boundaries are strictly evaluated in `Asia/Ho_Chi_Minh`.
- **Date Format**: ISO 8601 calendar date `YYYY-MM-DD` (e.g. `2026-10-12`).
- **Timestamp Format**: ISO 8601 timestamp with offset or UTC Zulu (e.g. `2026-10-12T18:30:00+07:00` or `2026-10-12T11:30:00Z`).

### 1.4. Standard Measurement Units
All nutritional amounts and physiological measurements are transferred as numerical values in standard units:
- **Energy**: `kcal`
- **Macronutrients**: `g` (Protein, Carbohydrates, Fat, Fiber, Sugar, Saturated Fat, etc.)
- **Minerals**: `mg` (Sodium, Potassium, Calcium, Magnesium, Iron, Zinc, Phosphorus, Copper, Manganese). Selenium is measured in `µg` (mcg).
- **Vitamins**:
  - `mg`: Vitamin C, Vitamin E, Vitamin B1, B2, B3, B5, B6.
  - `µg` (mcg): Vitamin A, Vitamin D, Vitamin K, Vitamin B9 (Folate), Vitamin B12.
- **Portion & Food Weight**: `g` (or `ml`).
- **Body Weight**: `kg`.
- **Daily Training Duration**: `minutes` (integer: 0, 45, 60, 90, 120, up to 240).

### 1.5. `null` vs `0` Semantics (Unknown vs Zero)
- `null`: Unknown, unmeasured, or absent from the source nutritional table or food packaging label.
  - In the Vietnamese UI, `null` is rendered as an em-dash (`—`).
  - `null` values do not count against deficiency metrics (not treated as 0% completion).
- `0` (or `0.0`): Tested, verified, or declared as zero.
  - In the UI, `0` renders as `0`.
- **API Requirement**: The API and database must **never convert `null` into `0`**.

### 1.6. Number Formatting Stays Client-Side
- The Go API must return raw numbers (`float64` / `int`, e.g. `2.1`, `70.5`, `1041`, `1200`), never pre-formatted localized strings.
- All Vietnamese locale formatting (`vi-VN`) is executed client-side via `lib/format.ts`:
  - Decimal comma: `2,1` g, `70,5` kg.
  - Thousand dot: `1.041` kcal, `1.200` mg.
