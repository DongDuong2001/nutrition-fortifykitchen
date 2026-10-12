# H1T MICRO — Information architecture v2

Decided 12/10/2026 (Hao). Replaces the Hôm nay / Vi chất / Ngày tập / Hồ sơ tab layout. All copy Vietnamese, Cobalt Sign tokens and fonts, every rule in AGENTS.md still applies (no over-limit, targets from the profile, past days read-only, null ≠ 0).

## Why
- Today mixed dashboard, food log and (on desktop) a 40-row nutrient list; "how am I doing" was not visible at a glance.
- Tabs were organised by data type. Vi chất and Ngày tập are glanced at once a day but each took a tab; Trends was hidden; food could only be found inside "add".
- Hồ sơ mixed body data, goals, targets, app settings, Pro and account actions on one ~1.800 px page.
- Logging had friction: two add buttons per meal, recents still needed a portion step.

## Navigation
Phone bottom nav (5 slots): **Tổng quan · Nhật ký · [+] · Khám phá · Cài đặt**
- [+] opens the add sheet from every tab; the meal is picked from the time of day (as today).
- Desktop: DesktopSidebar with the same four items plus a primary "Thêm món" button.
- Tab labels and icons stay identical on phone and desktop.

## Routes
| Route | Screen | Kind |
|---|---|---|
| `/` | Tổng quan (dashboard) | tab, default landing after sign-in/setup |
| `/diary` (`?date=`) | Nhật ký | tab |
| `/explore` | Khám phá | tab |
| `/explore/[category]` | food category / "giàu <chất>" list | pushed screen |
| `/foods/[id]` | food detail (reached from Khám phá, add sheet, diary) | pushed screen |
| `/foods/new` | create food | pushed screen |
| `/settings` | Cài đặt (profile card on top) | tab |
| `/settings/profile`, `/settings/profile/weight` | Hồ sơ (body, goal, weight) | pushed screens |
| `/settings/targets` | Mục tiêu mỗi ngày (read-only, from the profile) | pushed screen |
| `/settings/language`, `/settings/notifications`, `/settings/delete-account` | as now | pushed screens |
| `/micros`, `/micros/[nutrient]` | Vi chất, nutrient detail | pushed screens (no tab) |
| `/training` | Ngày tập (salt plan + checklist) | pushed screen (no tab) |
| `/trends` | Xu hướng | pushed screen (no tab) |
| `/add`, `/entry/[id]` | add sheet, edit entry | sheets (desktop dialog) |

Redirects (permanent): `/today` → `/diary` (keep `?date=`), `/profile` → `/settings/profile`, `/profile/weight` → `/settings/profile/weight`, `/foods` → `/explore`.
Pushed screens use AppHeader `sub` with a back button that returns to where the user came from (fallback: the owning tab — Vi chất/Xu hướng/Ngày tập → Tổng quan, foods → Khám phá, settings pages → Cài đặt). The bottom nav stays visible on pushed screens and highlights the owning tab.

## Tổng quan (dashboard)
Job: how am I doing today, and what is the next thing to do. Read-only; no food rows.
1. Hero (ink): kcal dial + four macro bars (as now) + "còn N kcal".
2. Next action: one primary button for the meal by time of day ("Ghi bữa tối") → add sheet with that meal; if every meal is logged, "Xem nhật ký".
3. Bữa ăn hôm nay: one compact row per meal (name · kcal or "Chưa ghi") → `/diary` scrolled to that meal.
4. Vi chất: "8/22 đã đạt" + the two lowest → `/micros`.
5. Ngày tập: today's minutes + salt range ("60′ · muối 7–10,5 g") → `/training`. Hidden on a rest day except a "Nghỉ" line.
6. 7 ngày: kcal-on-target strip (same rule as Trends: above range = đạt) → `/trends`.
7. Insights (facts only until coach rules exist): at most three short lines derived from data, e.g. "Còn 42 g đạm để đạt mục tiêu", "Thiếu nhiều nhất: Canxi (28%)", "Đã ghi 5 ngày liên tiếp". No advice, no food suggestions, no warnings above a range.
Desktop: two columns (hero + next action + meals left; Vi chất, Ngày tập, 7 ngày, insights right).

## Nhật ký (diary)
Job: log and fix food for a day.
- Header: date with ‹ › and calendar (as now); a compact energy bar (kcal + P/C/F) that stays visible while scrolling.
- Training chip on the day ("Ngày tập 60′" / "Nghỉ") → small sheet to change today's minutes (today only; past days read-only). Changing it updates kcal target and salt everywhere.
- Meals list as now, with ONE add control per meal header ("+").
- Per-meal "Chép hôm qua" in the meal's menu (today only); the whole-day copy stays when the day is empty.
- Footer: Vi chất summary row ("8/22 đã đạt · Thiếu: Vitamin D, Canxi") → `/micros` for that day.
- Past days: read-only exactly as now.

## Khám phá (explore) — v1, data only
Job: find a food and understand it.
- Search (same index as the add sheet), category chips (the 10 categories), "Gần đây", "Yêu thích", "Món của tôi".
- "Giàu…" lists: foods ranked by one nutrient per 100 g / per usual portion (Canxi, Sắt, Kali, Magie, Đạm, Chất xơ, Vitamin D, Vitamin C).
- Food detail: kcal and macros per portion, the 22 counted nutrients as % of the user's targets for that portion, "Nguồn tốt của: …" (≥ 20% of target per portion), add-to-diary button, favourite toggle.
- Reserved, empty until coach content: "Nên ăn kèm", pros/cons, recipes, tips. Do not render placeholders to users; keep the slots in code only.

## Cài đặt (settings)
- Profile card on top (sex, birth year, weight, goal summary) → `/settings/profile`.
- Mục tiêu mỗi ngày → `/settings/targets`.
- Ứng dụng: Ngôn ngữ, Nhắc nhở, Cài như ứng dụng.
- H1T MICRO Pro card.
- Tài khoản: Đăng xuất, Xoá tài khoản (danger zone).

## Faster logging
- Recents/favourites in the add sheet: tap the row = add with the last used portion (5 s undo toast); the chevron opens the portion panel.
- One "+" per meal header; no second "+ Thêm món" link.
- Quick add: "Chỉ ghi kcal" entry (name optional, kcal required, macros optional, micros unknown = null).
- Target: a repeat meal in 2 taps ([+] → recent).

## Build order (one task each, Claude Code)
1. Navigation shell: tabs, sidebar, routes, redirects, back behaviour; existing content moved, no new content.
2. Split Today into Tổng quan + Nhật ký; training chip.
3. Cài đặt with Hồ sơ inside; `/settings/targets`.
4. Khám phá v1.
5. Faster logging.
Each task: design the new screens with ui-ux-pro-max in Cobalt Sign first (screenshots at 390 and 1280 in the PR summary), tests first for logic, a probe, smoke stays green.

## Navigation (design decisions, cc2-07)
Checked with ui-ux-pro-max (§2 touch: 44 px targets, 8 px gaps; §9 navigation: bottom nav ≤ 5, visible active state, predictable back). Cobalt Sign tokens only, no new colours.

### Phone bottom nav (< 1024 px)
- Bar: `bg-ink`, 72 px tall, content centred at max 560 px with 16 px side padding, five equal columns. The fixed wrapper adds `env(safe-area-inset-bottom)` as bottom padding (0 until the page opts into `viewport-fit=cover`, so no change today).
- Slots, left to right: **Tổng quan** · **Nhật ký** · **[+]** · **Khám phá** · **Cài đặt**.
- Icons: 22 px, 24 viewBox, `stroke="currentColor"`, 1.8 stroke width, round caps and joins, no fill. Tổng quan: four rounded panels (dashboard). Nhật ký: page with three text lines. Khám phá: compass. Cài đặt: three sliders. Same icons in the sidebar.
- Labels: 11 px, semibold, below the icon (gap 2 px), never hidden. Tab names are identical to the sidebar.
- States: inactive `text-muted-on-dark`; hover `text-on-dark`; active `text-on-dark` plus the 20 × 3 px slanted bar (skewX −14°, `bg-blue`) under the label and `aria-current="page"`, so the state is not colour alone. Pressed: scale 0.97 over 150 ms (no motion with `prefers-reduced-motion`).
- Targets: every tab is the full column wide and at least 56 px tall. [+] is a 50 × 50 px `bg-blue` rounded-[14px] button with a white plus, `aria-label="Thêm món"`, in the middle slot; it is a link to `/add` (the meal comes from the time of day).
- Pushed screens (Vi chất, nutrient detail, Ngày tập, Xu hướng, Hồ sơ pages) keep the bar and highlight their owning tab: Tổng quan for Vi chất, Ngày tập and Xu hướng; Khám phá for foods; Cài đặt for settings and Hồ sơ.
- Hidden on: sign-in and setup, the `/add` sheet, `/entry/[id]`, `/settings/delete-account` (a confirm flow), `/install` and `/paywall` (as now).
- Food screens (`/foods/[id]`, `/foods/new`) keep the bar; their sticky add button sits directly above it on a phone and beside the sidebar on desktop.

### Desktop sidebar (≥ 1024 px)
- `DesktopSidebar`: 240 px wide `bg-ink` column with the logo, the primary **Thêm món** button, then the same four items in the same order and with the same icons and labels.
- Items: 44 px minimum height, 22 px icon, 12 px gap, 15 px semibold label. Active `bg-card/10` + `text-on-dark` + `aria-current="page"`; hover `bg-card/5`.
- Thêm món: full-width pill, `bg-blue`, `text-on-accent`, 48 px tall, 18 px plus icon, 15 px bold. It is the only add control in the page chrome (the Today header no longer repeats it). Opens `/add` like the phone [+].
- Pushed screens highlight the owning tab, as on the phone.

### Pushed screens (Vi chất, Ngày tập, Xu hướng)
- Phone: AppHeader `sub` with a 44 px back button (chevron, `aria-label="Quay lại"`), the title and one subtitle line. Desktop: a "‹ Quay lại" text button (44 px tall) above the title in the page header, so the title keeps the left edge of the cards under it.
- Back returns to the previous in-app page; with no in-app history (direct link, reload) it goes to the owning tab (`/`, or `/micros` for a nutrient detail).
