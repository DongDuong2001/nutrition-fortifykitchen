# 4. Information Architecture & Wireframes

Release 1 has 7 screens around the diary; Release 2 adds coach recommendations, Upgrade and the admin knowledge review; trends and custom foods come later.

## Sitemap

&#91;embedded content: sitemap · public and signed-in screens\]

Dashed boxes come later or sit outside the app (Fortify Kitchen, opened from an "Order" link on Fortify foods). Only Hào sees the Admin area.

## Key user flows

1. **First visit (R1):** Landing page → Sign up → Profile setup (sex, age, weight, goal, consent) → Diary for today.
2. **Log a meal (R1):** Diary → "Add food" on a meal → search → choose serving and quantity → preview → Add → back on the diary with totals updated.
3. **Check my numbers (R1):** Diary → energy and macro summary → Nutrient report for vitamins, minerals and electrolytes.
4. **Meet a paid feature (R2):** free user taps the locked "Coach recs" card → Upgrade → choose plan → pay → card unlocks.
5. **Training day (R2, paid):** Diary → training card → choose 60 / 90 minutes → targets update → quick-add the coach's pre- and intra-workout items.
6. **Publish coach knowledge (R2, admin):** coach updates Obsidian → import → Knowledge review shows old → new values → Hào publishes or rejects.

## Screens

| Screen | Main content, top to bottom | Primary action | Release |
| --- | --- | --- | --- |
| Landing | Headline, 3 benefits (Vietnamese foods, full micronutrients free, coach-backed targets), screenshot | Sign up | 1 |
| Sign up / Log in | Email, password, consent checkbox for diet and body data, language switch | Create account | 1 |
| Profile setup | Sex, age, weight, goal chips with kcal/kg, period option for women | Save and go to diary | 1 |
| Diary (home) | Day picker, energy ring + macro bars, 4 meal cards with entries; from R2 a training card and "Đang thiếu" card (locked for free users) | Add food | 1 |
| Add food (sheet) | Search box, category chips, result list with kcal per serving, detail: serving, quantity, preview | Add | 1 |
| Nutrient report | Energy and macros, electrolytes and minerals, reference vitamins; % bars with status | Tap a nutrient for top foods (R2, paid) | 1 |
| Profile & settings | Profile fields, language, plan, export data, delete account, disclaimer | Save | 1 |
| Upgrade | Free vs paid comparison, price, payment | Upgrade | 2 |
| Knowledge review (admin) | Draft version, list of changes (old → new), validation errors, publish / reject, version history with rollback | Publish | 2 |
| Trends | 7- and 30-day averages against targets, weight log | — | Later |
| Custom foods | Create a food or recipe from ingredients | Save | Later |

Phone layout (360–430 px): one column, sticky bottom bar with Diary, Report, Profile; Add food opens as a bottom sheet. Desktop (≥ 1024 px): diary on the left, energy and suggestions on the right, as in the current tracker.

## Update after scaffold review (10/10/2026)

The [design canvas](https://claude.ai/artifact/VoPTTkL4uq818xzb4mYjdY) is now the visual source of truth and replaces the wireframes above. The scaffold's routes change to match it:

| Scaffold route | Becomes |
| --- | --- |
| `(dashboard)/diary` | `/today`, `/today/[date]` |
| `(dashboard)/foods` | `/add?meal=`, `/foods/[id]`, `/foods/new` |
| `(dashboard)/micros` | `/micros`, `/micros/vitamin`, `/micros/[nutrient]` |
| `(dashboard)/training` | `/training` |
| `(dashboard)/profile` | `/profile` + `/weight`, `/goal`, `/language`, `/notifications`, `/delete` |
| `(auth)/login` | `/signup`, `/signin`, `/signin/check-email`, `/signin/expired`, `/setup/profile`, `/setup/goal` |
| (new) | `/entry/[id]`, `/trends`, `/install`, `/pro` |
| `admin/review` | stays (back office) |

**Bottom nav:** Hôm nay, Vi chất, + (Thêm món), Ngày tập, Hồ sơ.

**Desktop (≥1024 px):** a sidebar replaces the bottom nav, and Add food opens as a dialog.
