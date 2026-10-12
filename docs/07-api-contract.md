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


---

## 2. API Resources & Schemas

### 2.1. User Profile
Manages core biometric parameters and nutritional goal configuration.
- **Used by screens**: `/setup/profile`, `/setup/goal`, `/profile`, `/profile/weight`.

#### `GET /api/v1/profile`
Fetches the authenticated user's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "sex": "male",
  "birth_year": 2003,
  "weight_kg": 65.0,
  "goal": "maintain",
  "period_mode": false,
  "training_minutes_default": 60,
  "updated_at": "2026-10-12T07:30:00Z"
}
```

#### `PUT /api/v1/profile`
Updates profile settings.
- **Request Body**:
```json
{
  "sex": "male",
  "birth_year": 2003,
  "weight_kg": 70.5,
  "goal": "build",
  "period_mode": false,
  "training_minutes_default": 60
}
```
- **Field Definitions**:
  - `sex`: `"male"` | `"female"`.
  - `birth_year`: Integer between `1900` and current calendar year.
  - `weight_kg`: Decimal number between `30.0` and `300.0`.
  - `goal`: `"build"` (Tăng cơ), `"maintain"` (Giữ cân), `"cut"` (Giảm mỡ), `"deep_cut"` (Giảm mỡ nhanh).
  - `period_mode`: Boolean. Effective only when `sex === "female"`. If `sex === "male"`, backend normalizes to `false`.
  - `training_minutes_default`: Integer between `0` and `240` (presets: `0`, `45`, `60`, `90`, `120`).

---

### 2.2. Weight Logs
Tracks body weight history over time.
- **Used by screens**: `/profile/weight`.

#### `GET /api/v1/weight-logs`
Returns historical weight logs in reverse chronological order.
- **Query Parameters**: `limit` (optional integer, default `30`).
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": "e0b5f137-567a-4c28-9fa4-8cf69db4b839",
      "date": "2026-10-12",
      "weight_kg": 70.5,
      "created_at": "2026-10-12T06:30:00Z"
    },
    {
      "id": "a1c4d210-432b-4d19-8eb3-7be58da3a728",
      "date": "2026-10-05",
      "weight_kg": 69.8,
      "created_at": "2026-10-05T07:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/weight-logs`
Records a weight entry for a specified date.
- **Request Body**:
```json
{
  "date": "2026-10-12",
  "weight_kg": 70.5
}
```
- **Response `201 Created`**: Returns the saved weight log item. Also updates the profile's current `weight_kg` if `date` is today.

---

### 2.3. Diary Day
Retrieves all logged meals, food entries, and cumulative daily totals for a calendar date.
- **Used by screens**: `/today`, `/micros`.

#### `GET /api/v1/days/{date}`
- **Path Parameter**: `date` (`YYYY-MM-DD` in `Asia/Ho_Chi_Minh`).
- **Response `200 OK`**:
```json
{
  "date": "2026-10-12",
  "training_minutes": 60,
  "is_read_only": false,
  "summary": {
    "calories": 2045,
    "protein": 138.5,
    "carbs": 242.0,
    "fat": 58.2,
    "fiber": 28.0,
    "sodium": 3120,
    "potassium": 3850,
    "calcium": 920,
    "magnesium": 460,
    "iron": 14.5,
    "zinc": 11.2,
    "vitamin_d": 4.5
  },
  "meals": [
    {
      "slot": "breakfast",
      "name_vi": "Bữa sáng",
      "total_kcal": 480,
      "entries": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
          "food_name": "Phở bò tái chín",
          "meal_slot": "breakfast",
          "serving_label": "1 tô (450 g)",
          "grams": 450,
          "nutrients": {
            "calories": 480,
            "protein": 28.5,
            "carbs": 62.0,
            "fat": 14.0,
            "fiber": 2.5,
            "sodium": 1450,
            "potassium": 420,
            "calcium": 45,
            "iron": 3.8
          },
          "created_at": "2026-10-12T07:15:00Z"
        }
      ]
    },
    {
      "slot": "lunch",
      "name_vi": "Bữa trưa",
      "total_kcal": 650,
      "entries": []
    },
    {
      "slot": "dinner",
      "name_vi": "Bữa tối",
      "total_kcal": 720,
      "entries": []
    },
    {
      "slot": "snack",
      "name_vi": "Bữa phụ",
      "total_kcal": 195,
      "entries": []
    },
    {
      "slot": "preworkout",
      "name_vi": "Trước tập",
      "total_kcal": 0,
      "entries": []
    }
  ]
}
```

---

### 2.4. Diary Entry Mutations (Add / Edit / Delete)
Manages food items logged into specific meals.
- **Used by screens**: `/add`, `/foods/[id]`, `/entry/[id]`.

#### `POST /api/v1/days/{date}/entries`
Adds a food entry to a meal slot. The client generates a UUID `id` to guarantee idempotency (`ON CONFLICT (id) DO NOTHING`).
- **Request Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
  "meal_slot": "lunch",
  "grams": 300,
  "serving_label": "300 g"
}
```
- **Response `201 Created`**:
```json
{
  "entry": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
    "food_name": "Cơm trắng",
    "meal_slot": "lunch",
    "serving_label": "300 g",
    "grams": 300,
    "nutrients": {
      "calories": 390,
      "protein": 7.8,
      "carbs": 84.6,
      "fat": 0.9,
      "fiber": 1.2,
      "sodium": 3
    },
    "created_at": "2026-10-12T11:45:00Z"
  },
  "day_summary": {
    "calories": 2435,
    "protein": 146.3,
    "carbs": 326.6,
    "fat": 59.1
  }
}
```

#### `PATCH /api/v1/diary/entries/{id}`
Edits the portion (grams) or switches the meal slot (`meal_slot`).
- **Request Body**:
```json
{
  "grams": 200,
  "serving_label": "200 g",
  "meal_slot": "dinner"
}
```
- **Response `200 OK`**: Returns the updated entry object and recalculated `day_summary`.

#### `DELETE /api/v1/diary/entries/{id}`
Deletes an entry from the diary.
- **Response `200 OK`**:
```json
{
  "success": true,
  "deleted_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

### 2.5. Copy Yesterday
Copies entries from yesterday into today, supporting whole-day or meal-by-meal selection.
- **Used by screens**: Bottom sheet "Chép hôm qua" on `/today`.

#### `POST /api/v1/days/{date}/copy-yesterday`
- **Request Body**:
```json
{
  "source_date": "2026-10-11",
  "meal_slots": ["breakfast", "lunch", "dinner"]
}
```
*Note*: `meal_slots` filters which meals to copy. By design, `snack` starts unticked unless chosen by the user.
- **Response `201 Created`**:
```json
{
  "copied_count": 4,
  "entries": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
      "food_name": "Phở bò tái chín",
      "meal_slot": "breakfast",
      "grams": 450,
      "serving_label": "1 tô (450 g)",
      "created_at": "2026-10-12T08:00:00Z"
    }
  ]
}
```
*Note*: The returned array of `entries` contains the newly created IDs so the client can populate `undoIds` for the 5-second undo toast action.

---

### 2.6. Daily Training Minutes
Updates the day's training duration to calculate additional salt and sodium requirements.
- **Used by screens**: `/training`, `/today`.

#### `PUT /api/v1/days/{date}/training`
- **Request Body**:
```json
{
  "training_minutes": 60
}
```
- **Response `200 OK`**:
```json
{
  "date": "2026-10-12",
  "training_minutes": 60,
  "top_up_salt_g": "3–4,5",
  "sodium_target_min_mg": 2751,
  "sodium_target_max_mg": 4127
}
```

---

### 2.7. Foods Catalog & Search
Search and retrieval of standard and custom foods.
- **Used by screens**: `/add`, `/foods/[id]`.

#### `GET /api/v1/foods`
Searches food items with category filtering and pagination.
- **Query Parameters**:
  - `q`: Search keyword (case-insensitive, unaccented fuzzy matching; e.g. `pho` matches `Phở bò`).
  - `category`: Category filter key (`tinh_bot`, `dam`, `beo`, `sua`, `rau`, `trai_cay`, `mon_viet`, `an_vat`, `bo_sung`, `cua_toi`).
  - `page`: Page index (1-based, default `1`).
  - `limit`: Items per page (default `20`).
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
      "name_vi": "Phở bò tái chín",
      "name_en": "Beef Pho",
      "category": "mon_viet",
      "source": "coach",
      "is_custom": false,
      "servings": [
        { "label": "1 tô (450 g)", "grams": 450 },
        { "label": "1 tô nhỏ (350 g)", "grams": 350 },
        { "label": "100 g", "grams": 100 }
      ],
      "per_100g_nutrients": {
        "calories": 107,
        "protein": 6.3,
        "carbs": 13.8,
        "fat": 3.1,
        "fiber": 0.6,
        "sodium": 322,
        "potassium": 93,
        "calcium": 10,
        "iron": 0.8
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### `GET /api/v1/foods/{id}`
Returns complete nutrient breakdown per 100 g and available serving definitions.
- **Response `200 OK`**: Full food object as defined above.

---

### 2.8. Foods Rich in Nutrient
Retrieves foods containing the highest density of a specified nutrient for deficiency compensation.
- **Used by screens**: `/micros/[nutrient]`, `/micros`.

#### `GET /api/v1/foods/rich-in`
- **Query Parameters**:
  - `nutrient`: Nutrient key (e.g. `calcium`, `iron`, `potassium`, `magnesium`, `vitamin_d`, `protein`).
  - `limit`: Number of items (default `10`).
- **Response `200 OK`**:
```json
{
  "nutrient": "calcium",
  "unit": "mg",
  "items": [
    {
      "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861c2",
      "name_vi": "Phô mai Parmesan",
      "category": "sua",
      "amount_per_100g": 1184.0,
      "standard_serving": {
        "label": "1 lát (30 g)",
        "grams": 30,
        "amount": 355.2
      }
    },
    {
      "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861c3",
      "name_vi": "Hạt mè đen",
      "category": "beo",
      "amount_per_100g": 975.0,
      "standard_serving": {
        "label": "1 muỗng (15 g)",
        "grams": 15,
        "amount": 146.3
      }
    }
  ]
}
```

---

### 2.9. Favourites
Manages user-specific favourite foods.
- **Used by screens**: Chip "Yêu thích" on `/add`, heart button on `/foods/[id]`.

#### `GET /api/v1/favourites`
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
      "name_vi": "Phở bò tái chín",
      "category": "mon_viet",
      "added_at": "2026-10-12T05:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/favourites`
- **Request Body**: `{ "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1" }`
- **Response `201 Created`**: `{ "success": true, "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1" }`

#### `DELETE /api/v1/favourites/{food_id}`
- **Response `200 OK`**: `{ "success": true }`

---

### 2.10. Recent Foods
Retrieves recently logged food items with their last-used portion.
- **Used by screens**: Row "Gần đây" on `/add`.

#### `GET /api/v1/recents`
- **Response `200 OK`**:
```json
{
  "items": [
    {
      "food_id": "7b13e9a0-3e28-4b71-a022-793db5f861b1",
      "name_vi": "Phở bò tái chín",
      "last_serving_label": "1 tô (450 g)",
      "last_grams": 450,
      "last_logged_at": "2026-10-12T07:15:00Z"
    }
  ]
}
```

---

### 2.11. Custom Foods ("Món của tôi")
Allows users to create and store custom foods with nutritional values.
- **Used by screens**: `/foods/new`, category "Món của tôi" on `/add`.

#### `POST /api/v1/foods/custom`
- **Request Body**:
```json
{
  "name_vi": "Bánh tráng trộn tự làm",
  "serving_unit": "g",
  "serving_size": 150,
  "calories": 320,
  "protein": 6.5,
  "carbs": 48.0,
  "fat": 11.2,
  "micros": {
    "sodium": 850,
    "calcium": 60,
    "iron": 1.8,
    "potassium": null,
    "vitamin_d": null
  }
}
```
- **Backend Scaling Logic**:
  - Automatically scales raw inputs to 100 g standard: `factor = 100 / serving_size`.
  - Persists with `is_custom: true` and `created_by: auth.uid()`.
  - Creates 2 default servings: the user's portion (`150 g`) and standard `100 g`.
- **Response `201 Created`**: Returns the saved `FoodItem` object.

---

### 2.12. Quick Kcal Entry
Quickly logs estimated energy and macronutrients without picking a catalog food item.
- **Used by screens**: Quick log actions on `/add`.

#### `POST /api/v1/days/{date}/quick-kcal`
- **Request Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "meal_slot": "snack",
  "name_vi": "Ăn vặt nhanh",
  "calories": 250,
  "protein": 5.0,
  "carbs": 30.0,
  "fat": 12.0
}
```
- **Response `201 Created`**: Returns the created diary entry and updated day summary.

---

### 2.13. Trends
Provides aggregated time-series data across 7 or 30 calendar days for energy, macronutrients, and the 5 key coach micronutrients.
- **Used by screens**: `/trends`.

#### `GET /api/v1/trends`
- **Query Parameters**: `window=7` or `window=30` (or `from=YYYY-MM-DD&to=YYYY-MM-DD`).
- **Response `200 OK`**:
```json
{
  "window": 7,
  "start_date": "2026-10-06",
  "end_date": "2026-10-12",
  "days": [
    {
      "date": "2026-10-06",
      "calories": 2050,
      "protein": 115.0,
      "carbs": 260.0,
      "fat": 58.0,
      "fiber": 26.0,
      "calcium": 1250,
      "iron": 11.2,
      "potassium": 2800,
      "magnesium": 620,
      "vitamin_d": 4.2
    },
    {
      "date": "2026-10-12",
      "is_today": true,
      "calories": 1450,
      "protein": 88.0,
      "carbs": 180.0,
      "fat": 42.0,
      "fiber": 18.0,
      "calcium": 890,
      "iron": 8.5,
      "potassium": 2100,
      "magnesium": 410,
      "vitamin_d": 2.8
    }
  ]
}
```


---

## 3. Business Invariants Enforced by API

### 3.1. Past Days Are Read-Only
- **Rule**: All calendar dates prior to today (`date < today_VN` evaluated in timezone `Asia/Ho_Chi_Minh`) are immutable.
- **Frontend Behavior**: Past day views (`/today?date=YYYY-MM-DD`) render a read-only banner (*"Đang xem ngày cũ"*), hide the `+ Thêm` action button and the `Chép hôm qua` bottom sheet, and disable entry editing or deletion.
- **Backend Enforcement**: The Go API **must reject** all write operations (`POST`, `PUT`, `PATCH`, `DELETE`) targeting any past date:
  - Adding food entries (`POST /days/{date}/entries`).
  - Editing or deleting entries (`PATCH /diary/entries/{id}`, `DELETE /diary/entries/{id}`).
  - Copying entries (`POST /days/{date}/copy-yesterday`).
  - Changing training minutes (`PUT /days/{date}/training`).
- **Error Response**:
  - **HTTP Status**: `409 Conflict`.
  - **Error Code**: `PAST_DAY_READ_ONLY`.
  - **Message**: `"Không thể chỉnh sửa dữ liệu của ngày đã qua."`

### 3.2. Nutritional Targets Computation Boundary
- **Current Client Architecture**: Nutritional targets (calories, protein, fat, carbohydrates, fiber, sodium, potassium, calcium, magnesium, iron, zinc, and 22 micronutrients) are computed in real time on the client using pure functions in `apps/web/lib/targets.ts` (`calculateTargets`). When a user updates their body weight (`/profile/weight`), goal, or training duration (`/training`), progress bars across `/today` and `/micros` recalculate instantly with zero latency.
- **API Boundary**:
  - The API stores the **raw profile parameters** (`sex`, `birth_year`, `weight_kg`, `goal`, `period_mode`, `training_minutes`).
  - The API is not required to persist static target matrices unless desired for server-side reporting.
  - *Note*: If Dong prefers the Go API to compute targets server-side and return them in `GET /days/{date}` summary payloads, the calculation rules in `lib/targets.ts` can be mirrored in Go (see Section 5 question).

### 3.3. Multi-Tenant User Isolation
- **Favourites (`favourites`)**: Maintained strictly per `user_id`. One user's favourites are never exposed to others.
- **Recents (`recents`)**: Stores up to 20 recently logged items per `user_id` along with their last portion size (`last_serving_label`).
- **Custom Foods (`is_custom: true`)**:
  - Created with `created_by = auth.uid()`.
  - Visible only to the creating user in their *"Món của tôi"* category (`cua_toi`) and search results.
  - Standard system catalog foods (`is_custom: false`, `source: "coach"`) are shared read-only across all authenticated users.


---

## 4. Error Handling & Standard Error Codes

### 4.1. Unified Error Envelope
All error responses from the Go API (HTTP status $\ge 400$) **must adhere to a single unified JSON structure**:
```json
{
  "code": "ERROR_CODE_STRING",
  "message": "Human-readable description of the error."
}
```

For validation failures with field-level breakdowns, an optional `details` map may be included:
```json
{
  "code": "VALIDATION_FAILED",
  "message": "Validation failed for the submitted payload.",
  "details": {
    "weight_kg": "Weight must be between 30 and 300 kg.",
    "birth_year": "Birth year must be between 1900 and the current year."
  }
}
```

### 4.2. Standard Error Codes Handled by the UI

| HTTP Status | Error Code (`code`) | Meaning | UI Handling |
|---|---|---|---|
| `401` | `UNAUTHORIZED` | Missing or invalid Bearer JWT token | Redirects user to `/signin` |
| `401` | `AUTH_TOKEN_EXPIRED` | Supabase auth token expired | Initiates session refresh or redirects to `/signin` |
| `403` | `FORBIDDEN` | Access denied (e.g. non-owner modifying custom food, or non-admin hitting `/api/v1/admin/*`) | Displays access denied alert and blocks mutation |
| `404` | `FOOD_NOT_FOUND` | Food item not found by ID | Renders not-found state or displays *"Không tìm thấy món này"* (`apps/web/app/foods/[id]/page.tsx`) |
| `404` | `ENTRY_NOT_FOUND` | Diary entry not found | Displays notification that entry is no longer available |
| `409` | `PAST_DAY_READ_ONLY` | Mutation attempted on a date prior to today | Preserves read-only state and displays toast *"Không thể chỉnh sửa dữ liệu của ngày đã qua"* |
| `409` | `ENTRY_ID_CONFLICT` | Client-generated UUID collision | Server applies idempotent `ON CONFLICT DO NOTHING` and returns current entry |
| `422` | `VALIDATION_FAILED` | Payload failed structural validation rules | Displays corresponding validation message below target `<FormRow>` |
| `422` | `INVALID_WEIGHT_RANGE` | Weight outside valid bounds (30–300 kg) | Renders error *"Nhập cân nặng từ 30 đến 300 kg"* on `/profile/weight` |
| `422` | `INVALID_BIRTH_YEAR` | Birth year outside 1900 to current year | Renders error *"Nhập năm sinh từ 1900 đến {năm hiện tại}"* |
| `429` | `RATE_LIMIT_EXCEEDED` | Request rate limit exceeded | Displays rate limit notification *"Thử lại sau ít phút"* |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected backend error | Displays toast *"Chưa lưu được. Thử lại sau ít phút"* or routes to 500 page (`app/error.tsx`) |
