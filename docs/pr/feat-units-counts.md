# feat/ui-cc-units-counts: units and counts (overnight 22→23/10, PR 3)

From the Chrome audit of main f13f64c, demo build.

## 1. Grams everywhere except eggs and chanh
**Before:** "Khoai lang · 1 củ" in Gần đây, and "114 kcal / 1 củ" in the list.

**Change** (`defaultServing`, lib/portion):
- A food weighed in grams is now listed by its gram (or ml) serving, else 100 g, whatever unit its data lists first.
- The list meta, the group macro line ("26,6 g tinh bột"), a recent's fallback and the Minh Hào cards read it.
- The portion panel opens on the same grams, so the row and the panel agree. The one food this moves is a food weighed in grams whose data lists an ml serving first: Yogurt kefir (200 ml) opened at 100 and now opens at 200, the amount its row shows.

**Kept**
- Eggs keep the quả (egg sizes, as before).
- **Chanh and chanh dây** go by the quả. `weighedFruit` kept no quả for any fruit (cc-67); it now keeps theirs, first, and the panel opens on 1 quả (units mode, with Gam beside it).
- Supplements (viên, muỗng), Món Việt dishes (tô, phần, dĩa) and cans (lon) keep their unit, as `portionModeOf` has done since cc-53. See open question 1.
- A recent logged with an old unit keeps its own label.

**The foods this changes**
These are foods whose default serving was a count, and they now read per 100 g (or their gram serving). No data was changed: the rule is in the web, so it covers the whole live catalogue as it is.

- **Demo catalogue (lib/mock):**
  - Mật mía (1 muỗng)
  - Bánh tráng nướng (1 cái)
  - Bánh khoai nướng Minh Hào (1 miếng)
  - Đậu hũ trắng (1 bìa)
  - Rau muống (1 dĩa luộc)
  - Sữa tươi không đường (1 hộp 180 ml)
  - Khoai lang luộc (1 củ)
  - Hạt điều rang (1 nắm)
  - Hạnh nhân (1 nắm)
  - Bông cải xanh (1 chén hấp)
  - Lòng trắng trứng gà (1 lòng trắng)
  - Lòng đỏ trứng gà (1 lòng đỏ)
  - Dầu ăn (1 muỗng canh)
  - the dish parts Hành lá (1 cây nhỏ), Hành tây (1 củ nhỏ), Giá đỗ (1 chén), Húng lủi (1 nắm), Nước lọc (1 chai 500 ml).
- **Demo data:** yesterday's Khoai lang "1 củ" → "150 g", and Bông cải xanh "1 chén hấp" → "100 g" (the Gần đây the audit saw).
- **Live catalogue:** I could not query production. The last snapshot here (food-research/batch4-live-foods.json, 17/10, 699 foods) has 35 rows with a count first; the rule covers every one of them, and any added since.
  - Changed: Bánh tráng nướng, Mật mía, Hạnh nhân, Hạt điều rang, Đậu hũ trắng, Bông cải xanh, Rau muống, Sữa tươi không đường, Khoai lang luộc, and the drinks by the ly, chai, hộp or quả: Cà phê sữa đá, Cà phê đen đá, Nước cam ép tươi, Nước dừa tươi, Nước lọc, Nước mía, Nước mía tắc, Sữa tươi tiệt trùng, Sữa đậu nành, Trà đá.
  - Unchanged: Trứng gà (egg); Bia and Nước ngọt có ga Cola (lon); 7 Món Việt, 1 supplement and 1 user food (by their unit). The fruit rows (Bưởi 3 múi, Chuối 1 quả, Quả bơ 1/2 quả, Táo 1 quả) were already grams through weighedFruit.

## 2. Tổng quan counts the micros like Hôm nay
**Before:** for the same day, Tổng quan said "Vi chất đạt 8/22" and Hôm nay "5/8 đạt".

**Change:** `microBoard` takes the Level's ids (`countedForLevel`, the list Hôm nay counts), so N is 8, 14, 18 or 22.
- **Tóm tắt's Vi chất card:** x/N, the bar, the change from the last period, the three lowest, and the grid of squares with its counts. It ends with "Đủ 22 vi chất ›" (the Vi chất tab), as Hôm nay's column ends with the same link.
- **The Vi chất tab's hero:** the same count, bar and note ("3 trên 8 vi chất đạt mục tiêu; 0 đang thiếu"), and the bars and their legend of those nutrients.
  - The four level lists below hold all 22, under the heading "Đủ 22 vi chất".
  - Before, the hero listed all 22 bars under its count, so "0 đang thiếu" would have sat above red bars of nutrients not counted.
- **Cần chú ý** (both tabs) names the Level's nutrients, as Hôm nay's "Thiếu nhiều nhất" does. See open question 3.

## 3. TB/ngày
- Tổng quan's Kcal and Đạm big numbers are the period's average of a day. Every macro row of the scoreboard (Tóm tắt and Năng lượng) now says "TB/ngày" beside the number; the weight row does not.
- **Fixed on the way:** at 360 px with 150 % text, the big number already ran under the day squares on main. The number and the squares now share one row that wraps, so the squares go under the number when there is no room. At 390 the row looks as before.

## 4. Hôm nay's footnote
**Before:** "● Thiếu dữ liệu vi chất · chạm tên bữa để xem riêng bữa đó" under every day.

**Change**
- The legend ("● Thiếu dữ liệu vi chất") shows only when a food row carries the grey dot.
- The meal hint is a one-time tip, `meal-focus`, on the meal's name: "Xem riêng một bữa", "Chạm tên bữa để xem riêng bữa đó. Chạm lần nữa để xem cả ngày."
- It is the last of Hôm nay's tips, so the order of the others does not change, and a tap on a meal's name marks it used.

## 5. Khám phá › Nhóm món
- A group with 0 foods is left out (the demo showed "Đồ uống · 0 món").
- While the catalogue loads, every group waits with its skeleton count, as before.

## Release
2026-10-22c, three items, no tour (no new control; the new hint is a tip):
- "Món ghi theo gam"
- "Tổng quan đếm vi chất như Hôm nay"
- "Số trung bình ghi rõ"

`sw.js` VERSION 2026-10-22.4. PR 1 adds "Khẩu phần mở ngay trong bảng" to the same entry and VERSION .3: whichever merges second keeps both items and takes the next free VERSION.

## Tests
- **Unit:**
  - default-serving.test.ts (new): the rule, eggs, units, chanh, and "matches what the panel opens with" for every demo food;
  - overview-board (the Level count at Levels 1, 2 and 4, the change and the lowest);
  - overview-detail (valueNote), tips (meal-focus last), releases;
  - food-group-macro, food-meta and fortify-kitchen follow the default serving.
- **Probe:** units_counts.py (new). Probes that pinned the old behaviour follow it:
  - cc_46 and cc_tutorials know 22c;
  - cc2_20, cc2_21 and cc2_19 read Vi chất over the Level;
  - cc2_07 and cc2_11 expect 10 groups;
  - minh_hao_tab expects the cake per 100 g;
  - cc_46, cc_tutorials, cc_51_haptics and polish_1020 mark meal-focus seen.
- **gate:full:** all green, 798 s, 145 probes (design-floor-landing quarantined as on main).
- **Screenshots** at 390, 360 and 360 at 150 % text: `apps/web/.screenshots/audit-1023/{overview,overview-summary,home,groups,addlist}-*.png`.

## Open questions
1. Should supplements (1 viên), Món Việt dishes (1 tô, 1 phần) and cans (1 lon) also go by grams? I kept their unit, as cc-53 decided ("Ghi theo lon, viên, phần"); say if "grams everywhere" includes them.
2. So sánh's "Theo khẩu phần" and Giàu …'s "theo khẩu phần" still read the data's first serving (1 củ · 150 g). That is a comparison by the usual portion, so I left it; say if it should read 100 g too, which would make it the same as "Theo 100 g".
3. Cần chú ý on Tổng quan now names only the Level's nutrients (at Level 1 it no longer says Vitamin B1). That matches Hôm nay, but a Level 1 account no longer sees the lowest of the other 14 there. They are one tap away in Đủ 22 vi chất. Say if Cần chú ý should keep all 22.

Self-review (ponytail-review): every caller of `defaultServing`, `defaultPortionOf`, `microBoard`, `NutrientBars` and `weighedFruit` checked; nothing to fix.
