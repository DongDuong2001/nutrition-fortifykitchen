# H1T MICRO — Design handoff for Claude Code

This repo holds the approved UI design (`design/`) and the project docs (`docs/`) for **H1T MICRO**. It is a Cronometer-style calorie and micronutrient tracker. It is a mobile-first PWA with one desktop layout, and all copy is in Vietnamese.

Treat the design files as the **visual source of truth**. Rebuild them as real components; do not ship them as-is.

## What's in `design/`

| Path | What it is |
|---|---|
| `design/screens/*.dc.html` | One file per screen, 390×844 phone or 1440 desktop. Plain HTML with inline styles; open any file in a text editor. |
| `design/screens/canvas.json` | Screen list, titles and grouping. Pages: brand, phone, browser, desktop. |
| `design/SPEC.md` | Tokens, component rules, sample data and coach rules (read this first). |

### How to read a `.dc.html` file

- **Markup:** the markup inside `<x-dc>` is the screen.
- **Data:** `{{x.y}}` placeholders are filled by `renderVals()` in the `<script type="text/x-dc">` block at the bottom. That function holds the sample data and small UI logic, for example bar colours.
- **Loops and conditionals:** `<sc-for list=… as=…>` is a loop and `<sc-if value=…>` is a conditional. Map them to `.map()` and `&&` in React.
- **Ignore these:**
  - `Browser*.dc.html` files only wrap a phone screen in a Safari frame.
  - The `h` prop exists only so those frames can mount the screen at a shorter height.
  - The `<x-dc>`, `<helmet>` and `support.js` wrappers belong to the design tool.

## Screen → route map (phone)

| Screen file | Route |
|---|---|
| SignUp, SignIn, CheckEmail, LinkExpired | /signup, /signin, /signin/check-email, /signin/expired |
| SetupProfile, SetupGoal | /setup/profile, /setup/goal |
| EmptyToday, Today, TodayAdded, TodayUndo, CopyYesterday, CalendarPicker | /today. TodayAdded/TodayUndo are toasts; CopyYesterday and CalendarPicker are sheets. |
| PastDay | /today/:date |
| AddFood, MealSwitcher, SearchEmpty | /add?meal=… (MealSwitcher is a sheet) |
| FoodDetail, CreateFood | /foods/:id, /foods/new |
| EditEntry | /entry/:id |
| Micros, MicrosVitamins, NutrientDetail | /micros, /micros/vitamin, /micros/:nutrient |
| Trends | /trends |
| Training, TrainingRest | /training |
| Profile, EditWeight, ChangeGoal, Language, Notifications, DeleteAccount | /profile, /profile/weight, /profile/goal, /profile/language, /profile/notifications, /profile/delete |
| InstallApp, Paywall | /install, /pro |
| NotFound, ServerError, TodayStates (loading/offline) | 404, error boundary, loading/offline states |

**Desktop (≥1024 px):** DesktopSignUp, DesktopSetup, DesktopToday, DesktopAddFood (dialog), DesktopMicros, DesktopTraining, DesktopProfile. These use the same routes as phone, with a responsive layout: a sidebar replaces the bottom nav.

## Key design rules

- **Fonts:**
  - Be Vietnam Pro for everything.
  - Saira italic 800 (font-stretch 118%) only for titles and hero numbers 20 px and up.
  - Tabular numbers. Vietnamese number format: 1.041 and 2,1.
- **Nutrient names (Hao, 17/10):** the exception to "copy is Vietnamese": mineral and vitamin names are English everywhere (Sodium, Calcium, Iron, Vitamin B1, Folate), from the catalogue in `apps/web/lib/nutrients.ts`; macros (Tinh bột, Đạm, Chất béo, Chất xơ) and the words around a name stay Vietnamese.
- **Colours:**
  - ink #0A0A0B (header/nav)
  - page #F5F5F7
  - card #FFFFFF with radius 18
  - text #1D1D1F
  - secondary #5B6170
  - action blue #1E55F0
  - sky #A9D1F7 (accent on black only)
  - red #D93036 (destructive)
- **Nutrient bars:** 10 segments, `n = min(10, floor(pct/10))`.

  | % of target | On light background | On dark background | Label |
  |---|---|---|---|
  | < 50 | red #D93036 | #FF6B6B | Thiếu |
  | 50–79 | yellow #D99A00 | #F5C518 | Trung bình |
  | 80–99 | green #16A34A | #4ADE80 | Gần đủ |
  | ≥ 100 | blue #1E55F0 + "✓ Đạt" | #5C86F2 | Đạt |

  Going over 100% is fine; there is no over-limit colour. Empty segments are #E3E5E9 on light and #2B2D33 on dark.
- **Shapes:** primary CTA is a 52 px pill; chips are 44 px pills; every tap target is ≥44 px.
- **Interaction:**
  - Pressed state: scale(0.97) over 150 ms. Respect `prefers-reduced-motion`.
  - Focus ring: 3 px #1E55F0.
- **Accessibility:** real `<button>`, `<a>` and `<label>` elements; `role="switch"` on switches; dialogs get `aria-modal`; toasts get `role="status"`.
- **Copy:** no "Coach" tags or chips in the UI; tips use "Mẹo:".

## Business rules (all recommendations come only from the coach's rules)

- **Calories (the upper end of the coach's range, Hao 20/10, one number):** 40 kcal/kg (Tăng cơ), 35 (Giữ cân), 30 (Giảm mỡ), 25 (Giảm mỡ nhanh).
- **Macros (upper end, one number):** protein 2.2 g/kg; fat 1.0 g/kg; carbs the remainder; fibre 14 g per 1,000 kcal, at most 40 g (men) / 30 g (women). Fast carbs (30–45 g per training hour) and salt stay ranges.
- **Vitamins and minerals:** the US DRI (RDA, or AI) by sex and age with the Tolerable Upper Intake Level as the maximum: docs/dri-targets-2026-10-20.md.
- **Macro presets:** Cân bằng 25/55/20, Tăng cơ cao đạm 30/45/25, Giảm mỡ 35/35/30, Keto 20/5/75: approved by the coach (17/10).
- **Salt:** 4–6 g/day, plus 1–1.5 g per 20 min of training. Sodium mg = salt g × 393.
- **Minerals:**
  - Calcium 1,200–1,500 mg; magnesium 50% of calcium.
  - Potassium 80–100 mg/kg.
  - Iron 8 mg (men), 18 mg (women), 28 mg when near or in a period.
  - Zinc 12 mg (men), 8 mg (women).
- **Other vitamins:** reference values from Vietnam's 2016 recommended intakes. These still need to be verified.

## Handover while Dong is away (20/10/2026)

Read `docs/dong-handover-2026-10-20.md` first for the backend and the data: the made_at rule, API hardening, the 20/10 food imports, the backups and the open items. Open questions are in `OPEN_QUESTIONS.md` (Handover 20/10/2026).

## Where the code lives

This repo is the project; the repo name `nutrition-fortifykitchen` is legacy. It is a monorepo:
- `apps/web`: Next.js App Router, React 19, Tailwind v4.
- `apps/api`: Go 1.24 modular monolith (chi, pgx).
- `migrations/`: the database schema.
- `tasks/00–04`: sequential task specs. Follow `tasks/00_task_runner_rules.md` for order and quality gates.

## Design overrides the scaffold where they conflict

The scaffold was generated before the design was final. When building, **the design in `design/` wins**:

1. **Task 04 visual direction:** `tasks/04_nextjs_diary_ui.md` asks for a "culinary aesthetic inspired by Fortify Kitchen (dark slate, emerald/sage, amber)". **Ignore that.** Use the H1T MICRO look in `design/`: black header and nav, #F5F5F7 page, white cards, blue #1E55F0.
2. **Tokens:** `apps/web/app/globals.css` uses #2563eb, #0a0a0a and system fonts. Replace the `@theme` tokens with those in "Key design rules" above.
   - Load **Be Vietnam Pro** and **Saira** (italic, variable width) with `next/font/google`.
3. **SegmentedBar:** `components/ui/segmented-bar.tsx` has 8 segments, rounds instead of flooring, and takes a manual `color` prop. Change it to:
   - 10 segments, `n = min(10, floor(pct/10))`.
   - Colour picked automatically from the 4 levels: red, yellow, green, blue.
   - A `tone="light|dark"` prop for the dark header.
4. **Routes:**
   - Rename `(dashboard)/diary` to `/today`.
   - Add `/add`, `/entry/[id]`, `/foods/[id]`, `/foods/new`, `/micros/[nutrient]`, `/trends`, `/setup/*`, `/signup`, `/signin/*`, `/install` and `/pro`, per the route map above.
   - `(dashboard)/foods` becomes the food search and create flow (AddFood, FoodDetail, CreateFood).
   - The bottom nav (`components/layout/bottom-dock.tsx`) has exactly: Hôm nay, Vi chất, + (Thêm món), Ngày tập, Hồ sơ.
5. **Meal slots:** use Bữa sáng, Bữa trưa, Trước tập, Bữa tối and Bữa phụ, not Breakfast/Lunch/Dinner/Snack. The default slot is picked by time of day.
6. **Nutrient count:** 26 nutrients = 5 macros (kcal, protein, carbs, fat, fibre) + 21 micros (9 minerals + 12 vitamins). The scaffold already matches this.
7. **No "Coach" tags or chips in the UI.** Admin coach-draft review (`app/admin/review`) is a back-office screen and stays.
8. **Fortify Kitchen menu sync:** the README lists a Fortify Kitchen menu-sync integration. The product is now standalone, Cronometer-style. **Open decision:** confirm with Hào whether to keep it. Don't build it until confirmed.

## Suggested build order (frontend, after tasks 01–03 pass their gates)

1. Tokens and fonts in `globals.css` and the layout. Shared UI: Header, BottomNav, Sheet, Toast, SegmentedBar, Pill button, Chip, Switch, Card, Row.
2. A pure TypeScript `lib/targets.ts` for the coach rules above, with unit tests. It must match the Go `nutrition` service.
3. **Screens:**
   1. Today
   2. AddFood / FoodDetail / CreateFood
   3. EditEntry
   4. Micros (both tabs) and NutrientDetail
   5. Training
   6. Profile and its sub-screens
   7. Onboarding and auth
   8. Trends, states (loading, offline, 404, error) and the paywall
4. Desktop (≥1024 px): a sidebar replaces the bottom nav, and Add food opens as a centred dialog. See the `Desktop*.dc.html` files.
5. Mock data first, using the sample day in `design/SPEC.md`. Then wire the screens to `lib/api-client.ts` and `hooks/use-diary-log.ts`.

## Visual update 10/10/2026: "Cobalt Sign" (overrides the colours and fonts above)

**Fonts** (all have Vietnamese subsets)
- Display and numbers: **Saira Condensed**, weights 800–900, italic. Use it for the logo, screen titles, hero numbers (kcal, 8/22) and the numbers in macro rows. Numbers are tabular.
- Body and UI: **Manrope**, weights 400/600/700. It replaces Be Vietnam Pro.

**Colours**

| Token | Value |
|---|---|
| page (paper) | #F3F1EC |
| card | #FFFFFF |
| card border | #E0DACF |
| ink (header, nav, text) | #111317 |
| text | #141519 |
| secondary | #6B6A66 |
| cobalt (primary/action) | #1238D6 (white text on it) |
| sky (accent on ink only) | #9EC3FF |
| destructive | #D93F44 |

**Nutrient levels**

| Level | Light surfaces | Dark (ink) surfaces |
|---|---|---|
| Thiếu (<50%) | #D93F44 | #E5484D |
| Trung bình (50–79%) | #B07800 | #E8A400 |
| Gần đủ (80–99%) | #17945F | #1FA971 |
| Đạt (≥100%) | #1238D6 | #5C86F2 |
| empty segment | #E6E1D7 | #2A2C31 |

**Signature motif:** segment bars are slanted parallelograms (`transform: skewX(-14deg)`, radius 1px, gap 3px), echoing the italic "H1T". Use the same slant on the active bottom-nav indicator and the primary pill's pressed state. Do not slant text, cards or inputs.

**Rules**
- The page background is paper (#F3F1EC) at every width. Cards are white with a 1px #E0DACF border.
- Respect reduced motion. On load, the calorie ring fills in 600ms (ease-out) and the bars fill left to right with a 20ms stagger.
