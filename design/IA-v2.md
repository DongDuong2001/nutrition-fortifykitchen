# H1T MICRO — Information architecture v2

Decided 12/10/2026 (Hao); revised 12/10 19:30 (Tổng quan = trends over a period with sub-tabs; Nhật ký owns the day, incl. its Vi chất and Ngày tập). Replaces the Hôm nay / Vi chất / Ngày tập / Hồ sơ tab layout. All copy Vietnamese, Cobalt Sign tokens and fonts, every rule in AGENTS.md still applies (no over-limit, targets from the profile, past days read-only, null ≠ 0).

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

## Headers (decided 12/10 19:35)
- The H1T MICRO wordmark appears only on Tổng quan (phone header). Every other screen shows its own name as the title: Nhật ký, Khám phá, Cài đặt; pushed screens show back + their name (e.g. "Vi chất", "Hồ sơ").
- Phone: tab screens use AppHeader `tab` (title in Saira Condensed, optional right action); Nhật ký's title row carries the date nav; pushed screens use AppHeader `sub` (44 px back, title, one subtitle line). The ink band is used only where the screen has an ink hero (Tổng quan, Nhật ký day summary); other screens get a paper header so the page doesn't start with a heavy dark block.
- Desktop (≥ 1024 px): no full-width ink header band on any screen. The DesktopSidebar carries the wordmark and nav; the content column starts with a plain title row on paper (Saira title, optional subtitle, actions right; back button inline before the title on pushed screens), aligned to the content grid, with the same top padding on every screen. Ink appears only inside cards (hero/summary cards), never as a band stretching to the top of the window. Sheets and dialogs on desktop are centred dialogs (max ~560 px), never full-height panels.

## Routes
| Route | Screen | Kind |
|---|---|---|
| `/` | Tổng quan › Tóm tắt | tab + sub-tab, default landing after sign-in/setup |
| `/trends` | Tổng quan › Năng lượng | sub-tab |
| `/trends/micros` | Tổng quan › Vi chất (period averages) | sub-tab |
| `/trends/body` | Tổng quan › Cơ thể | sub-tab |
| `/diary` (`?date=`) | Nhật ký | tab |
| `/micros` (`?date=`) | the day's Vi chất (22 counted, grouped) | pushed from Nhật ký (owner: Nhật ký) |
| `/micros/[nutrient]` (`?date=`) | nutrient detail | pushed screen (back → /micros) |
| `/training` (`?date=`) | the day's Ngày tập (minutes, salt, checklist) | pushed from Nhật ký (owner: Nhật ký) |
| `/explore` | Khám phá | tab |
| `/explore/[category]` | food category / "giàu <chất>" list | pushed screen |
| `/foods/[id]` | food detail | pushed screen |
| `/foods/new` | create food | pushed screen |
| `/settings` | Cài đặt (profile card on top) | tab |
| `/settings/profile`, `/settings/profile/weight` | Hồ sơ (body, goal, training default), weight log | pushed screens |
| `/settings/targets` | Mục tiêu mỗi ngày (read-only, from the profile) | pushed screen |
| `/settings/language`, `/settings/notifications`, `/settings/delete-account` | as now | pushed screens |
| `/add`, `/entry/[id]` | add sheet, edit entry | sheets (desktop dialog) |

Redirects (permanent): `/today` → `/diary` (keep `?date=`), `/profile` → `/settings/profile`, `/profile/weight` → `/settings/profile/weight`, `/foods` → `/explore`.
Pushed screens use AppHeader `sub` with a back button (router.back, fallback: the owning tab). The bottom nav stays visible and highlights the owning tab. Past dates on `/micros` and `/training` are read-only.

## Tổng quan (dashboard): trends, insights, changes, composition
Tổng quan is about a period, never about logging. It never lists food and has no per-day controls. Period control shared by all sub-tabs and remembered: heading "Trung bình mỗi ngày · 06–12/10" with ‹ › to step through periods (no future) and a 7 / 30 ngày switch; periods end on today by default. Sub-tab bar under the header (phone: underline tabs, scrollable if needed, 44 px targets, `role="tablist"` of links; desktop: the same tabs in the page header). Switching sub-tabs needs no back button.

1. **Tóm tắt** (`/`):
   - A slim "Hôm nay" line at the top: "Còn 909 kcal · Ghi bữa tối" → the add sheet for the meal by the clock (if that meal is logged, the next empty one; if all logged, "Xem nhật ký" → `/diary`). This is the only today element.
   - Period summary: average kcal vs target and "N/7 ngày đạt"; average protein vs target; weight change over the period.
   - Changes vs the previous period: the biggest moves, facts only (e.g. "Canxi trung bình +18 % so với tuần trước", "Đạm −12 g/ngày").
   - Insights: at most three facts (protein gap, lowest nutrient over the period, logging streak).
   - Each block links to its sub-tab.
2. **Năng lượng** (`/trends`): kcal chart with the target band, average and days on target (above range = đạt, below minimum = level red "Thiếu"); macro composition (share of kcal from đạm / tinh bột / béo per day and on average, vs the coach ranges); protein average.
3. **Vi chất** (`/trends/micros`): average % of target per counted nutrient over the period, lowest first, with how many days each reached its target (Cronometer's Report). Tap → nutrient detail.
4. **Cơ thể** (`/trends/body`): weight chart from the weight log, change over the period and since start; body composition later (only if the user logs it; no fields added now).
Desktop: two-column grid where a sub-tab has two kinds of content.

## Nhật ký (diary): owns the day
Job: log, fix and read one day (any date).
- Header: date with ‹ › and calendar (as now). Under it the day summary: kcal dial + four macro bars (the only full breakdown of a day) and "còn N kcal".
- Two compact rows under the summary, both for the date shown: "8/22 vi chất · Thiếu: Vitamin D, Canxi" → `/micros?date=`; "Ngày tập 60′ · muối 7–10,5 g" → `/training?date=` (today: change the minutes there; past days read-only).
- When the header scrolls away, a slim sticky bar remains (kcal eaten / target, còn N).
- Meals with ONE "+" and a "⋯" menu per header ("Chép hôm qua", "Lưu thành Bữa của tôi").
- Past days: read-only exactly as now; their Vi chất and Ngày tập open read-only.

## Khám phá (explore) — v1, data only
Job: find a food and understand it.
- Search (same index as the add sheet), category chips (the 10 categories), "Gần đây", "Yêu thích", "Món của tôi", "Bữa của tôi" (saved meals: a named set of foods with portions, logged in one tap; created from a diary meal's "⋯" or from Khám phá).
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
- Bữa của tôi in the add sheet: one tap adds every food of the saved meal to the chosen meal (one undo toast).
- Quick add: "Chỉ ghi kcal" entry (name optional, kcal required, macros optional, micros unknown = null).
- Target: a repeat meal in 2 taps ([+] → recent).

## Build order (one task each, Claude Code)
1. Navigation shell: tabs, sidebar, routes, redirects, back behaviour; existing content moved, no new content.
2. Nhật ký owns the day (summary, Vi chất and Ngày tập rows, ?date= on /micros and /training) + Tổng quan sub-tabs (Tóm tắt, Năng lượng, Vi chất, Cơ thể).
3. Cài đặt with Hồ sơ inside; `/settings/targets`.
4. Khám phá v1.
5. Faster logging, including Bữa của tôi.

Not now: water tracking (waits for a coach rule); expenditure/activity ring (no activity data).
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
