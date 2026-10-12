# IA v2 screen designs (cc-15, revised cc-15b)

Static HTML mockups for the IA v2 tabs: Tổng quan, Nhật ký, Khám phá and Cài đặt, plus the add sheet and navigation. Design only, no app code. Each file shows the 390 px phone and the 1280 px desktop side by side, one pair per state. Inline CSS copies the Cobalt Sign tokens from `apps/web/app/globals.css`, each with a comment naming the token. Fonts: Manrope and Saira Condensed from Google Fonts. Board notes are in English, UI copy is Vietnamese, numbers use vi-VN format.

**Source of truth.** `design/SPEC.md` is superseded by `design/IA-v2.md` and `apps/web/app/globals.css`. `IA-v2.md` is still not on feat/ui, so the decisions in the list below (decided 12/10) stand in for it until it lands.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Tổng quan (tab 1) |
| `/diary` | Nhật ký (tab 2); a past day is `/diary?date=YYYY-MM-DD`, read-only |
| `/add` | Thêm món sheet, kept as it is |
| `/explore` | Khám phá (tab 3), beside the `/add` sheet, not replacing it |
| `/micros` | Vi chất, linked from Tổng quan and the Nhật ký footer |
| `/training` | Ngày tập breakdown (existing page, not redrawn here) |
| `/settings` | Cài đặt (tab 4) |
| `/settings/profile` | Hồ sơ |
| `/settings/profile/weight` | Cân nặng (not drawn here) |
| `/settings/targets` | Mục tiêu mỗi ngày |

## Screens

| Screen | HTML | PNG (390 / 1280) |
| --- | --- | --- |
| Tổng quan | `tong-quan.html` | `png/tong-quan-390.png`, `png/tong-quan-1280.png` |
| Nhật ký | `nhat-ky.html` | `png/nhat-ky-390.png`, `png/nhat-ky-1280.png` |
| Cài đặt + /settings/targets | `cai-dat.html` | `png/cai-dat-390.png`, `png/cai-dat-1280.png` |
| Khám phá + food detail | `kham-pha.html` | `png/kham-pha-390.png`, `png/kham-pha-1280.png` |
| Add flow | `add-sheet.html` | `png/add-sheet-390.png`, `png/add-sheet-1280.png` |
| Navigation | `nav.html` | `png/nav-390.png`, `png/nav-1280.png` |

**Tổng quan (`tong-quan.html`).** The dark hero keeps the existing pattern: a kcal dial on the left, four macro bars with 10 slanted segments on the right, and the footer "Mục tiêu 1.950–2.275 kcal · còn 909 kcal". `còn` is measured against the minimum target, as the app does now. Below the hero: one primary button "Thêm vào Bữa tối", then today's meals as rows (tapping a row opens Nhật ký), a Vi chất card (8/22, linking to /micros), an Ngày tập card, a 7-day strip, and up to three facts. The Ngày tập card is one line: "Ngày tập 60′ · muối 7–10,5 g" with "Đổi". On a rest day it reads "Nghỉ · muối 4–6 g". The breakdown lives only on /training. The strip draws the 1.950 kcal line inside each column, so bar heights and the line can't drift apart. Next meal follows the clock as `useMealSlot` does (sample time 18:00, so Bữa tối): if that meal is logged, the next empty meal; if all are logged, "Xem nhật ký". Insights, in order, facts only: protein left to target ("Còn 42 g đạm…"), lowest nutrient ("Thấp nhất…: Vitamin D, 14 %"), logging streak ("Đã ghi nhật ký 7 trên 7 ngày gần nhất"). States: nothing logged (dial at 0, every meal "Chưa có món", a "Chép hôm qua" secondary button and a guidance line) and rest day.

**Nhật ký (`nhat-ky.html`).** The date header has a training chip ("Ngày tập 60′"), and a sticky energy bar sits under it (1.041 kcal, the target range, "còn 909", one 10-segment bar). Each meal header has one + (add to that meal) and one ⋯ (menu). The ⋯ menu holds "Chép hôm qua" (copy the meal from yesterday) and "Xoá bữa này" in destructive text. Deleting needs a confirm step (not drawn here). The training chip opens a sheet with Nghỉ, 45′, 60′, 90′, 120′ and a fact line ("Ngày tập 60′ · muối 7–10,5 g. Nghỉ · muối 4–6 g."). On desktop it's a centred dialog. Past days are read-only, as cc-11 decided: no +, no ⋯, no training chip, and a "Chỉ xem" pill. Training minutes on a past day show read-only once stored (note only: yesterday's training is not in the mock, so none is drawn). The sample is Thứ Sáu 09/10 from `lib/mock/yesterday.ts` with the foods' catalogue energy, totalling 1.532 kcal. The footer row links to Vi chất. The empty day has a "Chép hôm qua · 4 bữa" CTA and one + per meal.

**Cài đặt (`cai-dat.html`).** Profile, Mục tiêu mỗi ngày, Ứng dụng (Ngôn ngữ, Nhắc nhở, Cài như ứng dụng), a Pro card, Tài khoản, and a Vùng nguy hiểm card with Xoá tài khoản. The danger zone doesn't delete on tap: it opens the existing confirm page. The Pro copy is a neutral placeholder ("Xem các gói và quyền lợi của tài khoản") until Hao sends the text. /settings/targets has the goal chips (2×2), the weight field, the default training chips, and the calculated targets with their formulas: 30–35 kcal/kg, 1,6–2,2 g/kg protein, 0,5–1 g/kg fat, fibre 30–40 g, salt, iron 8 mg for men. Carbs show 254 g with no formula, since the mock doesn't have one.

**Khám phá (`kham-pha.html`).** Search with a visible label, a horizontally scrolling category row (the chip row scrolls inside itself, so the page doesn't), Gần đây and Yêu thích as rows with a 44 px + to add with the last portion, Món của tôi with an empty state and a "Tạo món mới" button (the mock has no custom foods), and Giàu Canxi, a list of foods by calcium per 100 g with its share of the 1.200 mg target. Food detail (Yến mạch, 60 g): portion chips (60 g, 1 chén · 40 g, 100 g), per-portion macros, "Nguồn tốt của" chips with the rule "≥ 20 % mục tiêu ngày mỗi khẩu phần", all 22 vi chất as values and % of target, a favourite toggle, and "Thêm vào Bữa sáng". Seven nutrients have a value in the mock for this portion; three reach 20 % (Sắt 32 %, Phốt pho 35 %, Vitamin B1 23 %), which are the chips. The other 15 show a dash, with the line "Chưa có dữ liệu cho 15 trong 22", so no value is invented. Per-portion bars are one blue colour, not the level colours, because a single food's share doesn't mean a daily deficit.

**Add flow (`add-sheet.html`).** Four states. (1) Recents: "Thêm vào: Bữa sáng" opens a meal switcher, and each recent row is two controls: the name and kcal (one tap adds with the last portion) and a 44 px chevron (opens the portion panel). "Chỉ ghi kcal" is at the foot. (2) Undo toast: after a one-tap add, a toast sits above the nav with "Hoàn tác" in sky, `role="status"`, 5 s, matching the copy-yesterday undo. (3) Chỉ ghi kcal: kcal field with `inputmode="numeric"` and "Thêm 350 kcal". It is a quick entry: `kind "quick"`, `food_id` null, `nutrients` null (unknown, never 0), not added to Gần đây. (4) Portion panel: portion chips and five aligned rows (Kcal, Đạm, Tinh bột, Béo, Chất xơ), with one primary action. Desktop uses the centred dialog from `sheet.tsx`.

**Navigation (`nav.html`).** Phone bottom nav with five slots: Tổng quan · Nhật ký · + · Khám phá · Cài đặt. Training is no longer a tab. Each tab is shown active. The active tab gets white text and the slanted sky bar, plus `aria-current`. Desktop sidebar from 1024 px: four tabs, and a persistent primary "Thêm món" button under the brand. Thêm món is not in page headers.

## Decided 12/10

Each open question from the first cc-15 pass, with the answer. Items 14 and 15 are notes for other files, not edits in this folder.

1. **IA-v2.md location.** Still not on feat/ui. Decided 12/10: Khám phá sits at `/explore`, beside the `/add` sheet, which stays. Route names follow the list above.
2. **Next meal.** Decided 12/10: follows the clock, as `useMealSlot` does (17:00–20:59 is Bữa tối). If that meal is logged, the next empty meal; if all are logged, "Xem nhật ký". Sample time 18:00.
3. **"Nguồn tốt của".** Decided 12/10: a portion counts when it gives ≥ 20 % of a daily target, per portion (not per 100 g).
4. **Chỉ ghi kcal.** Decided 12/10: a food-less entry is `kind: "quick"` with `food_id` null and `nutrients` null (unknown, never 0), and it is not added to recents. Dong's question is item 7 in `docs/07-api-contract.md` §5.
5. **Level colours as text.** Decided 12/10: level yellow and level green are never text on light surfaces. Labels stay ink; colour is only on the bars.
6. **Focus ring on dark.** Decided 12/10: the ring is sky on dark surfaces (ink header, hero, energy bar, Pro card, toast, bottom nav, sidebar) and blue elsewhere. Implemented in each file's CSS.
7. **Dial arc.** Decided 12/10: `--color-level-blue-dark` (#5C86F2) on ink, not #1238D6. Already the value in every file.
8. **Rest-day salt.** Decided 12/10: Tổng quan reads "Nghỉ · muối 4–6 g". On /training the copy is "Ngày nghỉ: không cần bù", replacing "Không có: ngày nghỉ".
9. **Below-minimum colour.** Decided 12/10: a day below 1.950 kcal stays `--color-level-red` with "Thiếu", the same as Trends.
10. **Insights.** Decided 12/10: three facts, in this order: protein left to target, lowest nutrient, logging streak. Facts only, no advice.
11. **Past days.** Decided 12/10: a past day shows its training minutes read-only once they are stored. Note only; not drawn.
12. **Undo duration.** Decided 12/10: 5 s, as in the copy-yesterday toast.
13. **Pro and account copy.** Waiting for Hao. The Pro card and the Xoá tài khoản sub-copy stay placeholders until Hao sends the text.
14. **SPEC.md.** Decided 12/10: `design/SPEC.md` is superseded by `design/IA-v2.md` and `globals.css`. Not edited in this change.
15. **Metadata count.** Decided 12/10: `apps/web/app/layout.tsx` metadata "26 vi chất" must become 22. This is for Claude Code #2's next task; `apps/web` is not edited here.
16. **Desktop add.** Decided 12/10: Thêm món is a persistent primary button in the `DesktopSidebar`, not in page headers. Implemented in every desktop frame.

## Existing components this changes

- `components/ui/bottom-nav.tsx` and `components/ui/desktop-sidebar.tsx`: tabs change from Hôm nay / Vi chất / + / Ngày tập / Hồ sơ to Tổng quan / Nhật ký / + / Khám phá / Cài đặt. `SidebarTab` changes too. The DesktopSidebar gets the persistent Thêm món primary button (decided 16).
- `components/ui/calorie-dial.tsx`: the dial arc on dark uses `--color-level-blue-dark` (#5C86F2, 5.4:1 on ink) instead of #1238D6, which is too dark there.
- `components/ui/toast.tsx`: needs an action button (Hoàn tác), a 5 s timer and `role="status"`.
- `components/ui/portion-panel.tsx`: reuse for the chevron panel; the five rows must share one grid.
- `components/ui/sheet.tsx`: reuse for the training sheet, the meal menu, the add flow and Chỉ ghi kcal (phone sheet, desktop dialog).
- `globals.css`: the focus-visible ring is sky on dark surfaces, blue elsewhere (decided 6).
- New components: `EnergyBar` (sticky, 10 segments), `TrainingChip` with its sheet, `MealHeader` (one + and one ⋯), `MealMenu` (popover on desktop), `Vi chất` footer row, `DayStrip` (7 days with the target line), `FactsList` (max three, facts only).
- `/settings/targets` is a new route. It reuses `ChipGroup`, `FormRow` and `StatGroup`.
- `/foods/[id]` gets the 22-nutrient list (as % of target) and the "Nguồn tốt của" chips.

## Still open

- Pro card and Xoá tài khoản copy: waiting for Hao (decided 13).
- The all-logged state ("Xem nhật ký") and the /training page are described here but not drawn.
- Quick kcal entry schema: Dong, `docs/07-api-contract.md` §5 item 7.

## Checks

Checks are recorded with each render (see the PNG commit). The rules are: no horizontal scroll on the document at 390 px; every `a`, `button`, `input` and role=button/switch inside the frames is at least 44×44 px (phone bottom-nav items are 56 px); every text node at ≥ 4.5:1 against its computed background.

Decorative elements are not covered: the empty bar segments (#E6E1D7 on white, 1.3:1) and the dividers are below 3:1. Each bar's value is printed next to it, so the bar is supplementary.
