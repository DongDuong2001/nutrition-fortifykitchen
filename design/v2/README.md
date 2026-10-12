# IA v2 screen designs (cc-15)

Static HTML mockups for the IA v2 tabs: Tổng quan, Nhật ký, Khám phá and Cài đặt, plus the add flow and navigation. Design only, no app code. Each file shows the 390 px phone and the 1280 px desktop side by side, one pair per state. Inline CSS copies the Cobalt Sign tokens from `apps/web/app/globals.css`, each with a comment naming the token. Fonts: Manrope and Saira Condensed from Google Fonts. Board notes are in English, UI copy is Vietnamese, numbers use vi-VN format.

**Source gap:** `IA-v2.md` was not on feat/ui or on disk (searched `Documents/HITMicro` and the three worktrees), so these screens follow the cc-15 brief and the current app. Route names and the exact tab contents need checking against that file once Claude Code #2 commits it.

| Screen | HTML | PNG (390 / 1280) |
| --- | --- | --- |
| Tổng quan | `tong-quan.html` | `png/tong-quan-390.png`, `png/tong-quan-1280.png` |
| Nhật ký | `nhat-ky.html` | `png/nhat-ky-390.png`, `png/nhat-ky-1280.png` |
| Cài đặt + /settings/targets | `cai-dat.html` | `png/cai-dat-390.png`, `png/cai-dat-1280.png` |
| Khám phá + food detail | `kham-pha.html` | `png/kham-pha-390.png`, `png/kham-pha-1280.png` |
| Add flow | `add-sheet.html` | `png/add-sheet-390.png`, `png/add-sheet-1280.png` |
| Navigation | `nav.html` | `png/nav-390.png`, `png/nav-1280.png` |

## Screens

**Tổng quan (`tong-quan.html`).** The dark hero keeps the existing pattern: a kcal dial on the left, four macro bars with 10 slanted segments on the right, and the footer "Mục tiêu 1.950–2.275 kcal · còn 909 kcal". `còn` is measured against the minimum target, as the app does now. Below the hero: one primary "Thêm vào Bữa tối" button, where the next meal is the first one still empty after the logged meals, then today's meals as rows (tapping a row opens Nhật ký), a Vi chất card (8/22, linking to /micros), an Ngày tập card with the salt range (7–10,5 g = 4–6 g base plus 1–1,5 g per 20 min), a 7-day strip, and up to three facts. The strip draws the 1.950 kcal line inside each column, so bar heights and the line can't drift apart. States: nothing logged (dial at 0, every meal "Chưa có món", a "Chép hôm qua" secondary button and a guidance line) and rest day (salt card shows no extra salt, "Không có: ngày nghỉ").

**Nhật ký (`nhat-ky.html`).** The date header has a training chip ("Ngày tập 60′"), and a sticky energy bar sits under it (1.041 kcal, the target range, "còn 909", one 10-segment bar). Each meal header has one + (add to that meal) and one ⋯ (menu). The ⋯ menu holds "Chép hôm qua" (copy the meal from yesterday) and "Xoá bữa này" in destructive text. Deleting needs a confirm step (not drawn here). The training chip opens a sheet with Nghỉ, 45′, 60′, 90′, 120′ and a fact line (60′ gives 3–4,5 g of salt). On desktop it's a centred dialog. Past days are read-only, as cc-11 decided: no +, no ⋯, no training chip, and a "Chỉ xem" pill. The sample is Thứ Sáu 09/10 from `lib/mock/yesterday.ts` with the foods' catalogue energy, totalling 1.532 kcal. The footer row links to Vi chất. The empty day has a "Chép hôm qua · 4 bữa" CTA and one + per meal.

**Cài đặt (`cai-dat.html`).** Profile, Mục tiêu mỗi ngày, Ứng dụng (Ngôn ngữ, Nhắc nhở, Cài như ứng dụng), a Pro card, Tài khoản, and a Vùng nguy hiểm card with Xoá tài khoản. The danger zone doesn't delete on tap: it opens the existing confirm page. The Pro copy is neutral ("Xem các gói và quyền lợi của tài khoản") because the repo has no Pro content. /settings/targets has the goal chips (2×2), the weight field, the default training chips, and the calculated targets with their formulas: 30–35 kcal/kg, 1,6–2,2 g/kg protein, 0,5–1 g/kg fat, fibre 30–40 g, salt, iron 8 mg for men. Carbs show 254 g with no formula, since the mock doesn't have one.

**Khám phá (`kham-pha.html`).** Search with a visible label, a horizontally scrolling category row (the chip row scrolls inside itself, so the page doesn't), Gần đây and Yêu thích as rows with a 44 px + to add with the last portion, Món của tôi with an empty state and a "Tạo món mới" button (the mock has no custom foods), and Giàu Canxi, a list of foods by calcium per 100 g with its share of the 1.200 mg target. Food detail (Yến mạch, 60 g): portion chips (60 g, 1 chén · 40 g, 100 g), per-portion macros, "Nguồn tốt của" chips, all 22 vi chất as values and % of target, a favourite toggle, and "Thêm vào Bữa sáng". Seven nutrients have a value in the mock for this portion. The other 15 show a dash, with the line "Chưa có dữ liệu cho 15 trong 22", so no value is invented. Per-portion bars are one blue colour, not the level colours, because a single food's share doesn't mean a daily deficit.

**Add flow (`add-sheet.html`).** Four states. (1) Recents: "Thêm vào: Bữa sáng" opens a meal switcher, and each recent row is two controls: the name and kcal (one tap adds with the last portion) and a 44 px chevron (opens the portion panel). "Chỉ ghi kcal" is at the foot. (2) Undo toast: after a one-tap add, a toast sits above the nav with "Hoàn tác" in sky, live region, 5 s, matching the copy-yesterday undo. (3) Chỉ ghi kcal: kcal field with `inputmode="numeric"` and "Thêm 350 kcal". (4) Portion panel: portion chips and five aligned rows (Kcal, Đạm, Tinh bột, Béo, Chất xơ), with one primary action. Desktop uses the centred dialog from `sheet.tsx`.

**Navigation (`nav.html`).** Phone bottom nav with five slots: Tổng quan · Nhật ký · + · Khám phá · Cài đặt. Training is no longer a tab. Each tab is shown active. The active tab gets white text and the slanted sky bar, plus `aria-current`. The keyboard focus sample uses sky on the dark bar (10,4:1), since the global blue ring is about 2,3:1 there. Desktop sidebar: four tabs from 1024 px; Thêm món sits in the page header, not the sidebar.

## Existing components this changes

- `components/ui/bottom-nav.tsx` and `components/ui/desktop-sidebar.tsx`: tabs change from Hôm nay / Vi chất / + / Ngày tập / Hồ sơ to Tổng quan / Nhật ký / + / Khám phá / Cài đặt. `SidebarTab` changes too.
- `components/ui/calorie-dial.tsx`: the dial arc on dark uses `--color-level-blue-dark` (#5C86F2, 5.4:1 on ink) instead of #1238D6, which is too dark there.
- `components/ui/toast.tsx`: needs an action button (Hoàn tác), a 5 s timer and `role="status"`.
- `components/ui/portion-panel.tsx`: reuse for the chevron panel; the five rows must share one grid.
- `components/ui/sheet.tsx`: reuse for the training sheet, the meal menu, the add flow and Chỉ ghi kcal (phone sheet, desktop dialog).
- New components: `EnergyBar` (sticky, 10 segments), `TrainingChip` with its sheet, `MealHeader` (one + and one ⋯), `MealMenu` (popover on desktop), `Vi chất` footer row, `DayStrip` (7 days with the target line), `FactsList` (max three, facts only).
- `/settings/targets` is a new route. It reuses `ChipGroup`, `FormRow` and `StatGroup`.
- `/foods/[id]` gets the 22-nutrient list (as % of target) and the "Nguồn tốt của" chips.

## Checks

Every file was rendered with Playwright at 390×844 and 1280×800 (PNGs above, full page). The DOM checks ran at 390 px:

- **Horizontal scroll:** none on the document at 390 px. The desktop frames sit in an `overflow-x: auto` box, so they scroll inside their own box, and only the chip rows scroll inside themselves.
- **Tap targets:** every `a`, `button`, `input` and role=button/switch inside the phone and desktop frames is at least 44×44 px. Phone bottom-nav items are 56 px.
- **Text contrast:** every text node measured at ≥4.5:1 against its computed background. Two kinds of text needed care. Level yellow (#B07800, 3.8:1) and level green (#17945F, 3.9:1) fail as text on white, so the level labels stay ink and only the bars carry colour. The `--color-muted-on-dark` and `--color-muted-subtitle` tokens pass on ink and surface-dark.

Decorative elements are not covered: the empty bar segments (#E6E1D7 on white, 1.3:1) and the dividers are below 3:1. Each bar's value is printed next to it, so the bar is supplementary.

## Open questions for Hao

1. **IA-v2.md:** where is the file? The route names (tong-quan / nhat-ky / cai-dat / kham-pha) are placeholders until it's committed. Should Khám phá replace `/add` or sit beside it?
2. **Next meal:** the default picks the first empty meal after the logged ones (Bữa tối). Should it follow the clock instead, as `useMealSlot` does?
3. **"Nguồn tốt của":** I propose a portion that gives ≥20 % of a daily target. The docs have no rule for this. Which threshold, and should it be per 100 g or per portion?
4. **Chỉ ghi kcal:** a kcal-only entry has no food, so it wouldn't count toward Vi chất and wouldn't appear in Gần đây. Does the diary API (Dong) need a food-less entry type? Or should it be a "Món khác" food with no nutrients?
5. **Level colours as text:** yellow and green fail 4.5:1 on white. Are they used as text anywhere in the app? If so, pick darker tokens.
6. **Focus ring on dark:** the global `:focus-visible` ring is blue (2,3:1 on ink). Should the ring switch to sky on dark surfaces (nav, sidebar, ink headers)?
7. **Dial arc:** OK to use #5C86F2 on ink instead of #1238D6?
8. **Rest-day salt:** the copy "Không có: ngày nghỉ" for Bù mồ hôi follows the coach rule (no training, no extra salt). Confirm the wording.
9. **Below-minimum colour:** days below 1.950 kcal use `--color-level-red` and the label "Thiếu". Is "Thiếu" the right word for a below-target day, and should the strip use a neutral colour instead?
10. **Insights:** three facts (protein share, calcium share, days at minimum). Which facts should show, and in what order? Facts only, no advice, as the brief says.
11. **Past days:** no training chip and no per-day Vi chất count, because yesterday's training isn't in the mock. Should past days show the training minutes once they're stored?
12. **Undo duration:** 5 s, as in the copy-yesterday toast. OK?
13. **Pro and account copy:** the Pro card and the Xoá tài khoản sub-copy are neutral placeholders. Send the real copy and I'll update them.
14. **SPEC.md is stale:** `design/SPEC.md` still describes Be Vietnam Pro, #1E55F0 and the five-tab nav. These mockups follow `globals.css` (Cobalt Sign), as the brief says. Should SPEC.md be updated in a separate commit?
15. **Metadata count:** `apps/web/app/layout.tsx` says "26 vi chất"; everywhere else it's 22. Not changed here (outside design/v2). Which is right?
16. **Desktop add:** Thêm món is a header button, not a sidebar item. Confirm.
