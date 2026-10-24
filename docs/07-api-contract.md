# 7. Nutrition API Contract for Backend (Go API & Supabase)

Build plan and decisions: docs/08-backend-plan.md (wins where they differ).

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
- **Used by screens**: `/setup/profile`, `/setup/goal`, `/settings/profile`, `/settings/profile/weight`.

#### `GET /api/v1/me`
Fetches the authenticated user's profile and calculated daily targets.
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
  "display_name": "Dong",
  "targets": { ... },
  "updated_at": "2026-10-12T07:30:00Z",
  "level": 2,
  "levelSeen": 1
}
```
- **`level`, `levelSeen`** (migration 000021, camelCase like `macroMode` and `updatedAt`; the older fields stay snake_case): whole numbers 0–5, both 0 for a new profile. `level` is the user's Level, set by an admin or a coach (until the coach screens exist, by SQL: `docs/runbooks/migrate-1023.md`). `levelSeen` is the last Level the user was shown the Level-up celebration or card for. A user with no profile row gets `404 PROFILE_MISSING` as before (no Level yet means Level 0).

#### `PUT /api/v1/me/profile`
Updates profile settings.
- **Request Body**:
```json
{
  "sex": "male",
  "birth_year": 2003,
  "weight_kg": 70.5,
  "goal": "build",
  "period_mode": false,
  "training_minutes_default": 60,
  "display_name": "Dong"
}
```
- **Field Definitions**:
  - `sex`: `"male"` | `"female"`.
  - `birth_year`: Integer between `1920` and `2015`.
  - `weight_kg`: Decimal number between `25.0` and `300.0`.
  - `goal`: `"build"` (Tăng cơ), `"maintain"` (Giữ cân), `"cut"` (Giảm mỡ), `"deep_cut"` (Giảm mỡ nhanh).
  - `period_mode`: Boolean. Effective only when `sex === "female"`. If `sex === "male"`, backend normalizes to `false`.
  - `training_minutes_default`: Integer between `0` and `120` (presets: `0`, `45`, `60`, `90`, `120`).
  - `display_name`: Optional string.
  - `levelSeen`: Optional. A whole number from `0` to `5`. Left out: unchanged. Outside 0–5, not a whole number, or `null`: `400`, `error.fields.levelSeen`. Above the stored `level` is saved as the level (a user with no profile row yet is at Level 0, so 0), and the rest of the save is applied: a profile write queued offline before the coach lowered the Level still goes through.
  - `level`: **Never accepted.** A request that sends the key (any value, `null` included) is refused with `400 VALIDATION_FAILED`, `error.fields.level = "level is set by your coach"`, and nothing of that save is applied. The web never sends it.
  - Every other field behaves as before: a save without `levelSeen` keeps `level` and `levelSeen` as stored.

#### `DELETE /api/v1/me`
Permanently deletes the authenticated user's account and cascades all personal records.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "status": "account deleted"
}
```

---

### 2.2. Weight Logs
Tracks body weight history over time.
- **Used by screens**: `/settings/profile/weight`.

#### `GET /api/v1/me/weight`
Returns historical weight logs in reverse chronological order.
- **Query Parameters**: `from` (optional date), `to` (optional date).
- **Response `200 OK`**:
```json
[
  {
    "id": "e0b5f137-567a-4c28-9fa4-8cf69db4b839",
    "log_date": "2026-10-12",
    "weight_kg": 70.5,
    "created_at": "2026-10-12T06:30:00Z"
  },
  {
    "id": "a1c4d210-432b-4d19-8eb3-7be58da3a728",
    "log_date": "2026-10-05",
    "weight_kg": 69.8,
    "created_at": "2026-10-05T07:00:00Z"
  }
]
```

#### `PUT /api/v1/me/weight/{date}`
Upserts a weigh-in for the specified date (`YYYY-MM-DD`).
- **Request Body**:
```json
{
  "weight_kg": 70.5
}
```
- **Response `200 OK`**:
```json
{
  "log_date": "2026-10-12",
  "weight_kg": 70.5
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
- **Used by screens**: `/` (Tổng quan), `/diary` (Nhật ký), `/micros` (Vi chất).

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
      "slot": "pre_workout",
      "name_vi": "Trước tập",
      "total_kcal": 0,
      "entries": []
    }
  ]
}
```
*Note*: `pre_workout` is the canonical slot identifier in the API and database; `preworkout` is accepted as an alias by the API endpoints.

---

### 2.4. Diary Entry Mutations (Add / Edit / Delete)
Manages food entries and quick kcal entries logged into specific meals. There is one entry path: create with `POST /api/v1/days/{date}/entries`, edit and delete with `/api/v1/entries/{id}`.
- **Used by screens**: `/add` (sheet), `/explore` and food detail `/foods/[id]`, `/entry/[id]`.

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

**Quick kcal entry.** Logs an energy total with no food (the "Chỉ ghi kcal" flow on `/add`). Send the same `POST /api/v1/days/{date}/entries` with `kind: "quick"`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "kind": "quick",
  "meal_slot": "snack",
  "calories": 350
}
```
- `food_id` is `null` and `nutrients` is `null`. `null` means unknown, never 0 (see §1.5).
- The entry is never added to recents.
- **Response `201 Created`**: the entry with `"kind": "quick"` and the updated `day_summary`. The day summary adds `calories` only. Null nutrients are skipped in the totals, not counted as 0.

#### `PATCH /api/v1/entries/{id}`
Edits the portion (grams) or switches the meal slot (`meal_slot`). For `kind: "quick"`, only `calories` and `meal_slot` change.
- **Request Body**:
```json
{
  "grams": 200,
  "serving_label": "200 g",
  "meal_slot": "dinner"
}
```
- **Response `200 OK`**: Returns the updated entry object and recalculated `day_summary`.

#### `DELETE /api/v1/entries/{id}`
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
- **Used by screens**: Bottom sheet "Chép hôm qua" from the meal menu ⋯ and the empty-day CTA on `/diary`, and the nothing-logged state on `/`.

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
Sets the day's training minutes. Salt and sodium targets are computed on the client (§3.2), so this endpoint returns minutes only.
- **Used by screens**: `/training`, `/diary`, `/` (Tổng quan "Đổi").

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
  "training_minutes": 60
}
```
- *Optional, only if Dong chooses server-side targets (§5, question 4)*: the response could also return salt targets. Not part of this contract.

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
- **Used by screens**: Row "Yêu thích" on `/explore` and `/add`, heart button on `/foods/[id]`.

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
- **Used by screens**: Row "Gần đây" on `/explore` and `/add`.

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
- **Used by screens**: `/foods/new`, category "Món của tôi" on `/explore` and `/add`.

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

#### `PUT /api/v1/foods/custom/{id}`
Replaces the values and portions of one of the user's own custom foods (Sửa món).
- **Request Body**: the same as `POST /api/v1/foods/custom`, with the same checks (`name_vi` required, `serving_size > 0`, no negative macro: `400`) and the same scaling to 100 g. `one_off` is read as on create.
- **The id stays.** Day templates, saved meals and favourites hold the food by id, so they follow the new values. **Diary entries keep the snapshot they were logged with** (`name_snapshot`, `nutrients_snapshot`): editing a food never rewrites a past day. An entry logged after the edit uses the new values.
- Both nutrient columns and both portions (the user's serving and `100 g`) are rewritten in one transaction.
- **Response `200 OK`**: the saved `FoodItem`, as POST returns it (`created_at` is the food's own).
- **`404 NOT_FOUND`** for a food that is another user's, archived, or a catalogue food (never `403`, so ids do not leak); a malformed id is `404` too. `401` without a sign-in.
- No migration: `nutrition.foods` has no `updated_at` column and nothing reads one.

#### `DELETE /api/v1/foods/custom/{id}`
Archives (`is_archived = true`) one of the user's own custom foods: `200 {"success":true}`, `404` when it is not theirs or already archived. Past diary entries keep their snapshot.

### 2.11b. Saved meals ("Bữa ăn của tôi")
A named set of foods with portions, logged in one tap. The web keeps each meal under an id it makes (a uuid) and sends every change through its outbox, so a save sent twice is one meal.
- **Used by screens**: Khám phá › Bữa ăn của tôi, "Lưu bữa này" on Hôm nay.
- `GET /api/v1/saved-meals` → `200 {"items":[{"id","name","items":[{"food_id","portion_label","grams","sort"}],"created_at","updated_at"}]}`.
- `PUT /api/v1/saved-meals/{id}` with `{"name":"Bữa sáng","items":[{"food_id":"<uuid>","portion_label":"1 tô","grams":300,"sort":0}]}` → `200` and the meal. Creates the meal, or replaces its name and items when it exists (a rename is a PUT). `400` for a bad id or a blank name, `409 ID_CONFLICT` when the id is another user's meal. Foods must be in the server's catalogue: a meal with a food made only on the device stays on the device.
- `POST /api/v1/saved-meals` (the server picks the id) and `DELETE /api/v1/saved-meals/{id}` (`404` when it is gone, which the web counts as done) are unchanged.

---

### 2.12. Trends
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

### 2.13. Documents (Tài liệu) and access codes
The coach's documents and rules: markdown text by file name (migration 000017, `apps/api/internal/documents`). A coach or an admin writes them and reads them directly. Every signed-in user sees the list; a learner opens a document with an access code the coach made. A code is 10 symbols from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, compared in any case with spaces and dashes ignored. It works for 30 days unless its coach revokes it, and only its SHA-256 is stored.
- **Used by screens**: `/documents` (Cài đặt › Hỗ trợ › Tài liệu).
- **Names**: `^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$`, no `..`. Content at most 1 000 000 bytes.

| Method and path | Who | Body | Success | Refusals |
|---|---|---|---|---|
| `GET /api/v1/documents` | signed in | | `200 {"items":[{"name":"rules.md","updatedAt":"…"}]}` by name | |
| `POST /api/v1/documents/{name}/open` | signed in, with a code | `{"code":"ABCDEFGH23"}` | `200 {"name","updatedAt","content"}`, `Cache-Control: no-store` | `400` bad name, `403 FORBIDDEN` wrong, expired or revoked code, `404` none |
| `GET /api/v1/documents/{name}` | coach, admin | | `200 {"name","updatedAt","content"}` | `400`, `403` other roles, `404` |
| `PUT /api/v1/documents/{name}` | coach, admin | `{"content":"…","baseUpdatedAt":"…"}`; an edit sends the `updatedAt` it loaded, a new document or an upload leaves it out | `200 {"name","updatedAt"}` | `400` bad name, `403` other roles, `404` an edit of a document that is gone, `409 CONFLICT` someone saved since the edit loaded it, `413` too large |
| `POST /api/v1/document-codes/check` | signed in | `{"code":"…"}` | `200 {"valid":true}` | `403 FORBIDDEN` |
| `POST /api/v1/document-codes` | coach, admin | `{}` | `201 {"id","createdAt","expiresAt","code"}`, the only time the code is sent | `403` other roles |
| `GET /api/v1/document-codes` | coach, admin | | `200 {"items":[{"id","createdAt","expiresAt"}]}`, the caller's live codes, newest first | `403` other roles |
| `DELETE /api/v1/document-codes/{id}` | coach, admin | | `200 {"success":true}`, again when sent again | `400` bad id, `403` other roles |

The code travels in the request body, never the URL, so it stays out of server logs. The web shows a learner's document in a protected reader (no selecting, copying, saving or printing, blurred when the app is left, the reader's account watermarked across it); a browser cannot stop the phone's own screenshot.
Guessing a code is bounded by the per-user write limit (60 a minute); a 50-bit code is out of reach at that rate.


### 2.14. Courses (Khoá học, migration 000022)
Tài liệu as courses: **Khoá → Phần → Bài**. A lesson is a PDF (its pages are images the coach's browser made; the PDF itself is never stored or sent) or markdown text. This replaces §2.13 for the app (the old tables and routes stay until the web stops using them).
- **Envelope:** as the rest of the API, every JSON success is `{"data": …}` (a list is `{"data": {"items": […]}}`) and every error is `{"error": {"code", "message", "fields"?}}`; a page image is the raw WebP bytes. The shapes below are the `data`.
- **Who may open a course** (the coach picks per course): `open` (every signed-in user); `code` (one of that course's own live codes, 10 symbols, only the SHA-256 is stored, 30 days, revocable; a code opens every lesson of that course only); `level` (`profiles.level` ≥ `minLevel`, 1 to 5). A coach or an admin (`profiles.role`) sees everything. **The library (`GET /courses`) never needs access; opening does.** A user who opened a code course stays unlocked while that code is live (not revoked, not lapsed): `course_unlocks` joins the code on every check.
- A lock answers `403 {"error":{"code":"COURSE_LOCKED","fields":{"lock":"code"|"level","minLevel":"3"}}}` (`minLevel` only for a level lock); a wrong, lapsed, revoked or another course's code answers `403 BAD_CODE`. An unknown course, lesson or page, a lesson asked through another course's path, and an id that is not a UUID are all `404`.

| Route | Who | Body / result |
|---|---|---|
| `GET /courses` | signed in | `{items:[{id,title,subtitle,tone,access,minLevel?,lessonCount,doneCount,unlocked,lock?,createdAt,updatedAt}]}` (`tone` 0-7: the gradient pair of the design) |
| `GET /courses/{id}` | open to the caller | the course + `parts:[{id,title,lessons:[{id,title,kind,pageCount,minutes,ready,done,lastPage}]}]`, `lessonCount`, `doneCount`, `resume:{lessonId,page}?` (the first lesson not finished, at the page they stopped on). Learners see only `ready` lessons; `Cache-Control: private, no-store` |
| `POST /courses/{id}/open` | signed in | `{code}` → the same as `GET /courses/{id}` after recording the unlock; 403 `BAD_CODE` |
| `GET /courses/{id}/lessons/{lid}` | open to the caller | one lesson; a written one carries `content` (markdown) |
| `GET /courses/{id}/lessons/{lid}/pages/{n}` | open to the caller | `image/webp`, `Cache-Control: private, no-store`, never a static file |
| `PUT /courses/{id}/lessons/{lid}/progress` | the caller | `{lastPage, completed?}` (1-60; omitted `completed` leaves it; the same call again changes nothing); only for oneself |
| `POST /courses` · `PATCH /courses/{id}` · `DELETE /courses/{id}` | coach, admin | `{title, subtitle?, tone?, access, minLevel?}` (`level` needs 1-5, any other access clears it); delete removes parts, lessons, codes, progress and the page files |
| `POST /courses/{id}/parts` · `PATCH …/parts/{pid}` · `DELETE …/parts/{pid}` · `POST …/parts/reorder` | coach, admin | `{title}`; reorder `{ids}` = every part once |
| `POST /courses/{id}/lessons` | coach, admin | text: `{partId,title,kind:"text",content}` (≤ 1,000,000 bytes); PDF: `{partId,title,kind:"pdf",pageCount}` (1-60), hidden from learners until finished |
| `PATCH …/lessons/{lid}` · `DELETE …/lessons/{lid}` · `POST …/lessons/reorder` | coach, admin | `{title?,partId?,content?}` (a lesson moved to another part goes last; `content` only for a written lesson); reorder `{partId, ids}` |
| `PUT …/lessons/{lid}/pages/{n}` | coach, admin | `{data}`: the page as base64 **WebP** (checked by its RIFF/WEBP header), ≤ 1 MiB decoded; `n` from 1 to the lesson's `pageCount`; **`507 STORAGE_FULL`** when the disk holding `COURSES_DIR` has less than 2 GiB free (nothing is written: no row, no file) |
| `POST …/lessons/{lid}/finish` | coach, admin | the lesson becomes visible once every page is there (`409` until then) |
| `GET/POST /courses/{id}/codes` · `DELETE …/codes/{codeId}` | coach, admin | `POST` returns the value **once** (`{id,code,createdAt,expiresAt}`); the list never has values; only for a course with `access: code`; revoking again is `404` |

- **Caps (MaxBytesReader, 413):** JSON bodies 4 KB; a lesson's text body 1.1 MB (the text itself ≤ 1,000,000 bytes); a page upload body 1.45 MB (≤ 1 MiB of image as base64: the API's CSRF rule only takes JSON bodies from the browser); at most 60 pages a lesson. The 60 page uploads of one PDF have their own limit (180 a minute per user, outside the 60 a minute of other writes).
- **Storage:** `COURSES_DIR` (default `data/courses`; a docker volume in production), `<course id>/<lesson id>/<page>.webp`, written through a temp file and a rename. The API reads a page only after the access check; the files are never served statically.
- **Room:** before a page is written the API asks the disk (statfs) how much is free; below `MinFreeBytes` = 2 GiB (`COURSES_MIN_FREE_BYTES` changes it) it answers `507` with `error.code = "STORAGE_FULL"` and writes nothing. A disk that cannot be read is a `500`, not a guess.
- **Unfinished lessons:** a PDF lesson stays hidden (`ready = false`) with its pages on disk when the coach's tab dies halfway. Each new PDF lesson of a course deletes the course's unfinished PDF lessons older than 24 h, with their folders (a failure of that is logged and never stops the new lesson).
- **No draft state:** a text lesson is visible when saved; a PDF when finished.

---

## 3. Business Invariants Enforced by API

### 3.1. Past Days Are Read-Only
- **Rule**: All calendar dates prior to today (`date < today_VN` evaluated in timezone `Asia/Ho_Chi_Minh`) are immutable.
- **Frontend Behavior**: Past day views (`/diary?date=YYYY-MM-DD`) render a read-only banner (*"Đang xem ngày cũ"*), hide the `+ Thêm` action button and the `Chép hôm qua` bottom sheet, and disable entry editing or deletion.
- **Backend Enforcement**: The Go API **must reject** all write operations (`POST`, `PUT`, `PATCH`, `DELETE`) targeting any past date:
  - Adding food and quick kcal entries (`POST /days/{date}/entries`).
  - Editing or deleting entries (`PATCH /entries/{id}`, `DELETE /entries/{id}`).
  - Copying entries (`POST /days/{date}/copy-yesterday`).
  - Changing training minutes (`PUT /days/{date}/training`).
- **Error Response**:
  - **HTTP Status**: `409 Conflict`.
  - **Error Code**: `PAST_DAY_READ_ONLY`.
  - **Message**: `"Không thể chỉnh sửa dữ liệu của ngày đã qua."`

### 3.2. Nutritional Targets Computation Boundary
- **Current Client Architecture**: Nutritional targets (calories, protein, fat, carbohydrates, fiber, sodium, potassium, calcium, magnesium, iron, zinc, and 22 micronutrients) are computed in real time on the client using pure functions in `apps/web/lib/targets.ts` (`calculateTargets`). When a user updates their body weight (`/settings/profile/weight`), goal, or training duration (`/training`), progress bars across `/`, `/diary` and `/micros` recalculate instantly with zero latency.
- **API Boundary**:
  - The API stores the **raw profile parameters** (`sex`, `birth_year`, `weight_kg`, `goal`, `period_mode`, `training_minutes`).
  - The API is not required to persist static target matrices unless desired for server-side reporting.
  - *Note*: If Dong prefers the Go API to compute targets server-side and return them in `GET /days/{date}` summary payloads, the calculation rules in `lib/targets.ts` can be mirrored in Go (see Section 5 question).

### 3.3. Multi-Tenant User Isolation
- **Favourites (`favourites`)**: Maintained strictly per `user_id`. One user's favourites are never exposed to others.
- **Recents (`recents`)**: Stores up to 20 recently logged items per `user_id` along with their last portion size (`last_serving_label`). Quick kcal entries (`kind: "quick"`) are never added.
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


---

## 5. Open Questions for Dong (Checklist)

The following checklist identifies technical decisions and schema alignments requiring Dong's confirmation:

- [ ] **1. Deprecate or remove legacy `/login` route**:
  - *Context*: The old scaffold page at `apps/web/app/(auth)/login/page.tsx` uses dark raw hex styling and contains a broken link to `/diary` that hangs Next.js prefetching. The active Cobalt Sign authentication flow uses `/signin` and `/signup` (Supabase Magic Link + Google OAuth).
  - *Decision needed*: Should `/login` be permanently removed, or should it issue a 308 redirect to `/signin`?

- [ ] **2. Add `category` column to `nutrition.foods`**:
  - *Context*: The `/add` screen filters foods across 10 standard category keys (`tinh_bot`, `dam`, `beo`, `sua`, `rau`, `trai_cay`, `mon_viet`, `an_vat`, `bo_sung`, `cua_toi`). The `nutrition.foods` table in migration `000001` currently has `id`, `name`, `serving_size_g`, `per_100g_nutrients`, `is_custom`, `created_by`, but no category column.
  - *Proposal*: Add migration `ALTER TABLE nutrition.foods ADD COLUMN category TEXT;` with an index for filtered queries.

- [ ] **3. Offline sync strategy for diary entries**:
  - *Context*: The design specification includes an offline indicator with a *"Chờ đồng bộ"* badge for foods logged while disconnected (`design/screens/TodayStates.dc.html`).
  - *Proposal for Release 1*: The web client buffers pending mutations in local browser storage (`localStorage` / `IndexedDB`). Upon network reconnection (`navigator.onLine`), the client replays standard `POST`/`PATCH`/`DELETE` calls sequentially, relying on client-generated UUIDs (`id`) for idempotent deduplication. Does Dong agree with this client-replay pattern, or would Dong prefer a dedicated batch endpoint `POST /api/v1/diary/sync`?

- [ ] **4. Role of `nutrition.user_targets` vs Client-Side Targets**:
  - *Context*: The web app currently computes targets in real time client-side from the profile using `apps/web/lib/targets.ts` (pure functions with full unit test coverage).
  - *Decision needed*: Should the Go API replicate the `calculateTargets` logic and return a precomputed `target_nutrients` object in `GET /days/{date}` summaries, or should the API simply store profile inputs and leave target visualization to the client?

- [ ] **5. Migrations for user favourites and recent foods**:
  - *Context*: Favourites and Recents are temporarily kept in client storage (`localStorage` and `sessionStorage`). To support multi-device persistence, the backend needs two supporting tables:
    - `nutrition.user_favourites (user_id UUID, food_id UUID, created_at TIMESTAMPTZ, PRIMARY KEY (user_id, food_id))`
    - `nutrition.user_recents (user_id UUID, food_id UUID, last_serving_label TEXT, last_grams NUMERIC, updated_at TIMESTAMPTZ, PRIMARY KEY (user_id, food_id))`
  - *Decision needed*: Can Dong add these tables in the next database migration?

- [ ] **6. Snapshot integrity in `nutrition.diary_logs`**:
  - *Confirmation*: On every entry creation, the Go backend computes `grams = quantity * serving_size_g` and snapshots the resulting nutrient values into `nutrients_snapshot JSONB`. This confirms historical diary logs remain immutable when source food data is updated in the catalog.

- [ ] **7. Quick kcal entries (`kind: "quick"`)**:
  - *Context*: The "Chỉ ghi kcal" flow on `/add` logs a calorie total with no food (`design/v2/add-sheet.html`). It has no macros and no micronutrients, and it must not count as 0 for any of them.
  - *Proposal*: One entry path (`POST /api/v1/days/{date}/entries`) with `kind: "quick"`, `food_id` NULL, `nutrients` NULL (unknown, never 0), `calories` required, and no row in recents. Does Dong agree with a nullable `food_id` and a `kind` column on `nutrition.diary_logs`, or would Dong prefer a placeholder food ("Món khác") with no nutrients?
