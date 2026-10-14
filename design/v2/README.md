# IA v2 screen designs (cc-15, revised cc-15b, redone cc-15c)

Static HTML mockups for the IA v2 screens: Tổng quan (four sub-tabs), Nhật ký (with the day's Vi chất and Ngày tập), Khám phá, Cài đặt (with Hồ sơ and read-only Mục tiêu), the add sheet and the navigation. Design only, no app code. Each state is a 390 px phone and a 1280 px desktop side by side. Inline CSS copies the Cobalt Sign tokens from `apps/web/app/globals.css`. Fonts: Manrope and Saira Condensed from Google Fonts. Board notes are in English, UI copy is Vietnamese, numbers use vi-VN format.

**Source of truth.** `design/IA-v2.md` (on feat/ui from cc2-07) and `apps/web/app/globals.css`. `design/SPEC.md` is superseded. The decisions below (12/10 and the 12/10 19:35 IA revision) stand where `IA-v2.md` is silent.

## Files

| Screen | HTML | PNG (390 / 1280) |
| --- | --- | --- |
| Tổng quan (four sub-tabs) | `tong-quan.html` | `png/tong-quan-390.png`, `png/tong-quan-1280.png` |
| Nhật ký, Vi chất and Ngày tập of the day | `nhat-ky.html` | `png/nhat-ky-390.png`, `png/nhat-ky-1280.png` |
| Cài đặt, Hồ sơ, Mục tiêu mỗi ngày | `cai-dat.html` | `png/cai-dat-390.png`, `png/cai-dat-1280.png` |
| Khám phá, Bữa ăn của tôi, food detail | `kham-pha.html` | `png/kham-pha-390.png`, `png/kham-pha-1280.png` |
| Add sheet | `add-sheet.html` | `png/add-sheet-390.png`, `png/add-sheet-1280.png` |
| Navigation | `nav.html` | `png/nav-390.png`, `png/nav-1280.png` |

Each PNG is a full-page capture of its file. Each file has states; the state headings are the index.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Tổng quan · Tóm tắt (tab 1, default) |
| `/trends` | Tổng quan · Năng lượng |
| `/trends/micros` | Tổng quan · Vi chất (period, not the day) |
| `/trends/body` | Tổng quan · Cơ thể |
| `/diary` (`?date=`) | Nhật ký (tab 2): owns the day, any date; past dates read-only |
| `/micros?date=` | Vi chất of one day, pushed from Nhật ký (owner tab Nhật ký) |
| `/training?date=` | Ngày tập of one day, pushed from Nhật ký (owner tab Nhật ký) |
| `/explore`, `/foods/[id]` | Khám phá (tab 3) and food detail |
| `/settings` | Cài đặt (tab 4) |
| `/settings/profile`, `/settings/profile/weight` | Hồ sơ (pushed) and cân nặng |
| `/settings/targets` | Mục tiêu mỗi ngày (pushed, read-only) |
| `/add` | Thêm món sheet (desktop: centred dialog) |

## Headers

These rules apply to every frame. A reviewer checks them first.

- **Wordmark.** The H1T MICRO wordmark appears only on Tổng quan (phone header). Every other screen shows its own name as the title: Nhật ký, Khám phá, Cài đặt. Pushed screens show back and their name, for example "Vi chất" or "Hồ sơ".
- **Phone, tab screens.** A tab header: the title in Saira Condensed, with an optional right action. Nhật ký's title row carries the date nav.
- **Phone, pushed screens.** A sub header: a 44 px back button inline before the title, then one subtitle line.
- **Ink band.** Used only where the screen has an ink hero: the Tổng quan header and the Nhật ký day summary. Other screens get a paper header.
- **Desktop (≥ 1024 px).** No full-width ink header band on any screen. The sidebar carries the wordmark and the nav. The content column starts with a plain title row on paper (Saira title, optional subtitle, actions on the right), aligned to the content grid, with the same top padding on every screen. The back button sits inline before the title on pushed screens. Ink appears only inside cards.
- **Dialogs.** Sheets and dialogs on desktop are centred dialogs (about 520 px), never full-height panels.

## Tổng quan (`tong-quan.html`)

Tổng quan is about a period, never about logging: no food lists, no per-day controls. It has four sub-tabs, each its own short screen and URL: Tóm tắt (`/`), Năng lượng (`/trends`), Vi chất (`/trends/micros`), Cơ thể (`/trends/body`). Phone: underline tabs under the ink header, `role="tablist"` of links, 44 px targets. Desktop: the same tabs in the title row. No back button between sub-tabs.

The period control is shared by all four and remembered: the heading "Trung bình mỗi ngày · 06–12/10", ‹ › to step through periods (› is disabled on the current period, so nothing is in the future), and a "7 ngày / 30 ngày" switch. Periods end on today by default. Only the 7-day state is drawn; the 30-day state uses the same layout.

Data: `lib/mock/trends.ts`. Its 7-day series (mock dates 04–10/10) is drawn as 06–12/10, so today is Thứ Hai 12/10. Today is partial and is **excluded** from the averages and the day counts until the day is finished. The prior period (29/09–05/10) comes from the generated part of the 30-day mock.

States in the file:

1. **Tóm tắt, with data.** A slim "Hôm nay" line ("Còn 909 kcal", with "Ghi bữa tối" as the meal by the clock). The period summary: kcal 2.010 vs 1.950–2.275, 4/6 days on target; đạm 109 g vs 104–143 g, 4/6 days; cân nặng 65,0 kg, −0,8 kg in the period. "So với kỳ trước" lists the three biggest changes as facts (Vitamin D −0,5 µg, Canxi −30 mg, Magie −15 mg). Insights, at most three, facts only: protein under 104 g on 2 of 6 days, the lowest nutrient (Vitamin D, 18 %), a 7-day logging streak. Each block links to its sub-tab.
2. **Tóm tắt, under 3 logged days.** "Chưa đủ dữ liệu" with the count and the Nhật ký link. No chart and no empty 0–10 bars.
3. **Năng lượng.** A composition ring for the average kcal (đạm 22 %, tinh bột 52 %, béo 25 %), each with its gram range from the coach rules where one exists. No over-limit colours. A kcal chart per day with the target band (1.950–2.275), average, days on target. Above the range counts as đạt, below the minimum is "Thiếu" in level red, the day still in progress is striped. Protein average with its days on target.
4. **Vi chất.** Average % of target per counted nutrient, lowest first, "N/6 ngày đạt", 10-segment bars, each row links to `/micros/[nutrient]`.
5. **Cơ thể.** Weight chart labelled as sample data, the change over the period and since 01/10. The mock has no weight history, so the numbers are sample values. A note marks progress photos for later.

## Nhật ký (`nhat-ky.html`)

Nhật ký owns the day (any date). It is the only place with a day's full breakdown.

- **Title row** with the date nav ‹ "Hôm nay 12/10" ›. Past days show a "Chỉ xem" pill.
- **Ink day summary:** a kcal dial, four macro bars (10 segments), "còn N kcal". On desktop the summary is an ink card.
- **Two rows for the day:** "8/22 vi chất · Thiếu: Vitamin D, Canxi" → `/micros?date=`, and "Ngày tập 60′ · muối 7–10,5 g" → `/training?date=`.
- **Meals:** one + (add to that meal) and one ⋯ per meal header. The ⋯ menu holds "Chép hôm qua" and "Lưu thành Bữa ăn của tôi". On desktop the menu is a centred dialog.
- **Sticky bar:** a slim ink strip (kcal, còn N kcal, 10-segment bar) replaces the summary when it scrolls away. Phone only; desktop keeps the summary card in view.
- **Past day** (Thứ Sáu 09/10, sample from `lib/mock/yesterday.ts`, 1.532 kcal, below the minimum, so "thiếu 418 kcal"): read-only. No +, no ⋯, rows open read-only screens. The mock has no macro totals for that day, so the bars show "—", not 0.
- **Empty day:** "Chưa có món hôm nay" with "Chép hôm qua · 4 bữa", every meal "Chưa có món".

Pushed day screens (back → Nhật ký, owner tab Nhật ký):

- **Vi chất của ngày** (`/micros?date=`): "8/22 đã đạt", the two lowest, then the grouped list of the 22 counted nutrients from `lib/mock/sample-day.ts` (the list is generated from that file).
- **Ngày tập của ngày** (`/training?date=`): minutes chips (Nghỉ, 45′, 60′, 90′, 120′), salt with its breakdown (4–6 g base, plus 1–1,5 g per 20 minutes), the phase checklist. **Rest day:** "Ngày nghỉ: không cần bù", salt 4–6 g, recovery tips. **Past day:** chips disabled and read-only; no minutes are drawn because the mock does not store them for that day.

## Cài đặt (`cai-dat.html`)

- **Cài đặt** (paper header, no wordmark): the profile card "Hồ sơ của bạn" (sub "Nam · sinh 2003 · 65 kg · Giữ cân", avatar, chevron → `/settings/profile`), Mục tiêu mỗi ngày, Ứng dụng (Ngôn ngữ, Nhắc nhở, Cài như ứng dụng), the Pro card, Tài khoản (email row "ban@email.com" above Đăng xuất), Vùng nguy hiểm (Xoá tài khoản, destructive text, opens the confirm page).
- **Hồ sơ** (pushed, back → Cài đặt): Cơ thể (giới tính chips, năm sinh, cân nặng → `/settings/profile/weight`), Mục tiêu (goal chips 2×2: Tăng cơ, Giữ cân, Giảm mỡ, Giảm mỡ nhanh; default training chips: Nghỉ, 45, 60, 90, 120 phút), and the line "Mục tiêu mỗi ngày tính từ hồ sơ này" → `/settings/targets`. Same fields as today's Hồ sơ, no new fields.
- **Mục tiêu mỗi ngày** (pushed, read-only): no goal chips, weight field or training chips. The computed targets with their formula lines: kcal per kg by goal (Tăng cơ 35–40, Giữ cân 30–35, Giảm mỡ 25–30, Giảm mỡ nhanh 20–25), đạm 1,6–2,2 g/kg, béo 0,5–1 g/kg, tinh bột as the remainder, xơ 14 g per 1.000 kcal (tạm thời), muối 4–6 g plus 1–1,5 g per 20 minutes, kali 80–100 mg/kg, canxi 1.200–1.500 mg, magie 50 % of canxi, sắt and kẽm by sex, and the VN 2016 vitamins and minerals marked "*". One button, "Sửa trong Hồ sơ".

## Khám phá (`kham-pha.html`)

- Paper header "Khám phá" (no wordmark). Search, category chips, Gần đây, Yêu thích, Món của tôi (empty state, "Tạo món mới").
- **Bữa ăn của tôi:** one sample saved meal ("Bữa sáng quen": Yến mạch 60 g, Yogurt kefir 200 ml, Chuối 1 quả, 459 kcal, "Thêm cả bữa vào Bữa sáng"). State 1b shows the empty state: "Chưa có bữa nào. Lưu một bữa từ Nhật ký: ⋯ › Lưu thành Bữa ăn của tôi."
- **Food detail** (Yến mạch): pushed sub header (back inline, title, favourite, one subtitle line), the portion chips, per-portion macros, "Nguồn tốt của" (≥ 20 % of the day's target per portion), all 22 nutrients as % of target, and 15 with no value shown as a dash.

## Add sheet (`add-sheet.html`)

- Four states, as before (recents, undo toast, Chỉ ghi kcal, portion panel) plus a **Bữa ăn của tôi** group above Gần đây. One tap adds every food of the saved meal to the chosen meal, with one undo toast ("Đã thêm 3 món từ Bữa sáng quen vào Bữa sáng · Hoàn tác", 5 s).
- Background header is the paper Nhật ký title row, not the wordmark.
- Desktop: centred dialog.

## Navigation (`nav.html`)

- Bottom nav unchanged: Tổng quan · Nhật ký · + · Khám phá · Cài đặt. Desktop sidebar unchanged.
- The Tổng quan sub-tab bar and the period control at 390 and 1280.
- One desktop pushed screen (Mục tiêu mỗi ngày) to show there is no ink band at the top.

## Decided 12/10 (first pass, still in force)

1. IA-v2.md: Khám phá at `/explore`, beside the `/add` sheet.
2. Next meal follows the clock (`useMealSlot`: 17:00–20:59 is Bữa tối). Sample time 18:00.
3. "Nguồn tốt của": a portion counts at ≥ 20 % of a daily target, per portion (not per 100 g).
4. Chỉ ghi kcal: `kind: "quick"`, `food_id` null, `nutrients` null (unknown, never 0), not in recents. Dong's question is item 7 in `docs/07-api-contract.md` §5.
5. Level colours are never text on light surfaces. Level yellow and level green are only on the bars.
6. Focus ring is sky on dark surfaces and blue elsewhere.
7. Dial arc on ink: `--color-level-blue-dark` (#5C86F2).
8. Rest-day salt: Tổng quan reads "Nghỉ · muối 4–6 g"; /training reads "Ngày nghỉ: không cần bù".
9. Below the minimum stays `--color-level-red` with "Thiếu", as in Trends.
10. Insights: facts only, at most three.
11. Past days show training minutes read-only once stored. Not drawn.
12. Undo: 5 s.
13. Pro and account copy: placeholders until Hao sends the text.
14. `design/SPEC.md` superseded by `design/IA-v2.md` and `globals.css`.
15. `apps/web/app/layout.tsx` metadata "26 vi chất" becomes 22 (Claude Code #2's task).
16. Desktop Thêm món is a persistent primary button in the sidebar, not in page headers.

## Decided 12/10 19:35 (IA revision, cc-15c)

- Tổng quan is a period view with four sub-tabs; no food lists and no per-day controls.
- Nhật ký owns the day. Its Vi chất and Ngày tập are pushed screens for that date, owner tab Nhật ký.
- The header rules above.
- Hồ sơ lives in Cài đặt as a pushed screen with the same fields. Mục tiêu mỗi ngày is read-only and points to Hồ sơ to edit.
- Bữa ăn của tôi: saved meals in Khám phá and in the add sheet. The ⋯ menu saves a meal ("Lưu thành Bữa ăn của tôi") and copies one from yesterday ("Chép hôm qua").
- Averages and day counts exclude today until it is finished.

## Open for Hao

- **Xoá bữa này** is not in the ⋯ menu any more; the brief lists two actions. Say if it should come back (it needs a confirm step).
- **Sample data across mocks is not in sync.** `lib/mock/trends.ts` has today (12/10) at 1.041 kcal, protein 58 g, fat 32 g, calcium 210 mg. `lib/mock/sample-day.ts` has protein 62 g, fat 21 g, calcium 331 mg. The 09/10 trend point (1.640 kcal) differs from `lib/mock/yesterday.ts` (1.532 kcal). Nhật ký uses the diary sample; Tổng quan uses the trends series and excludes today. The mocks should match before the screens are built.
- **Weight history** for Cơ thể is sample data (the mock has none).
- **Vi chất over a period** covers the five nutrients that have a day series in the mock (Vitamin D, Canxi, Magie, Kali, Sắt). The other 17 show when the data exists. The note on the screen says so.

## Not now

- Water tracking (waits for a coach rule).
- Expenditure, BMR and activity (coach targets are kcal per kg; there is no activity data).
- Custom charts.
- Progress photos (need storage from Dong).
- Body-composition fields.

## Checks

Re-rendered 12/10 with Playwright (Chromium), full page, at 390×844 and 1280×800, for all six files. Results are in `png/`.

- **Horizontal scroll:** none on the page at 390 px in any file. Wide desktop frames scroll inside their own figure.
- **Tap targets:** 0 controls under 44 × 44 px in any file (links, buttons, tabs, chips, rows, the bottom nav).
- **Text contrast:** 0 failures among 1.864 text elements per width (4.5:1 for normal text, 3:1 for large text), with colours composited over their real background. Disabled and dimmed text is excluded, as WCAG allows. Decorative bars and dividers are not covered; each bar's value is printed next to it.
- **Headers:** 0 `.hdr` elements inside any desktop frame, so no ink band at the top of a desktop screen. The wordmark appears only in the Tổng quan phone header.
- **Copy:** no over-limit wording in the copy (no "vượt", "cảnh báo" or red warnings above a range).
