# cc-12 design parity sweep

Scope: the 25 screens in the cc-12 brief, compared with `design/screens/*.dc.html` at 390 px, and the Desktop variant at 1440 px where one exists.

How it was checked:

- **Copy:** `apps/web/tests/probes/cc12.py` reads the static copy of each design file and checks it against our rendered page text at both widths. Output: `apps/web/.screenshots/cc12-copy-report.txt`.
- **Layout:** the design files are templates that need their `support.js` runtime, which is not in the repo, so they do not render on their own. Layout was compared by reading the design source (markup, inline styles, sample values) against our screenshots `apps/web/.screenshots/cc12-<screen>-{390,1440}.png`.
- **Calendar:** the probe checks the 1440 dialog is centred, the 390 sheet is bottom-anchored, Esc closes it and focus returns to the date button.
- Design sample dates (10/10) differ from the real date (11/10). Those are data, not copy, and are not listed below.

Result key: **fixed** (changed in this commit) · **left-as-decided** (kept on purpose, reason given) · **question** (logged in OPEN_QUESTIONS).

| Screen | Difference | Result |
| --- | --- | --- |
| Micros (390, 1440) | Footnote wording and order: our "Giá trị tham khảo … · Mục tiêu …" vs design "Mục tiêu … · tham khảo khuyến nghị …(2016)." | fixed (copy matches design) |
| Micros (390) | Stat label "đã đạt" vs design "đã đạt mục tiêu" | fixed |
| Micros (390) | Legend shows "Thiếu" over "<50%"; design puts the range in brackets | left-as-decided: 4-column equal grid with name and range stacked (ui-04). Brackets would wrap at 390 |
| Micros (390, 1440) | Group counts: design "Khoáng chất · 5/9" and "8/21"; ours "5/10" and "8/22" | question (catalogue has 22 tracked items, design 21; see OPEN_QUESTIONS) |
| Micros (1440) | Desktop "Gợi ý món để bù phần còn thiếu hôm nay" suggestion list is not built | question (needs food suggestion rules) |
| MicrosVitamins (390, 1440) | Same as Micros above | as Micros |
| NutrientDetail (390) | Page is a placeholder ("đang được xây dựng theo lộ trình"). Design has the full screen: 28 %, 331 / 1.200 mg, sources, "Gợi ý để bù" | question (whole screen unbuilt; OPEN_QUESTIONS) |
| Today (1440) | Desktop "Thiếu nhiều nhất" and sample values match; no difference found | — |
| AddFood (390, 1440) | Design "Tự chọn theo giờ trong ngày · chạm để đổi", recents, groups match. Default meal is time-based (Bữa tối here, design Trước tập) | left-as-decided: sample data and time-based default |
| FoodDetail (390) | "Khẩu phần" label missing above portion chips | fixed |
| FoodDetail (390) | "Hợp dùng trước tập" tag under the title is not built (no use-case field on foods) | question |
| FoodDetail (390) | Tip reads "Nên dùng 30 g đầu buổi tập · carb chậm. 2–3 quả trước tập 30–45 phút." Design shows only "Mẹo: 2–3 quả trước tập 30–45 phút." (the "Nên dùng …" line is the add-list hint) | question (one tip field or two) |
| CreateFood (390) | "+ Thêm vi chất (Natri, Canxi, Sắt, Kali, Vitamin D…)" vs design "(Natri, Canxi, Sắt…)" | fixed |
| SearchEmpty (390) | Copy matches | — |
| EditEntry (390) | Design header brand line "H1T MICRO" absent; title is the food name (cc-04 decision) | left-as-decided (cc-04) |
| MealSwitcher (390) | Sheet title and list match; sample kcal values are data | left-as-decided: data |
| CopyYesterday (390) | Day label "Thứ Sáu, 09/10" (comma) vs design "Thứ Sáu 09/10"; mock meal kcal differ from design | left-as-decided: comma used throughout the app; mock day already in OPEN_QUESTIONS (cc-10) |
| CalendarPicker (390) | Background Today values and the day list match | — |
| CalendarPicker (1440) | Phone bottom sheet at desktop | fixed: centred dialog at ≥1024 px; Esc closes; focus returns to the date (checked by cc12.py) |
| TodayAdded (390) | Toast copy "Đã thêm Chà là 30 g vào Trước tập" and today's totals | data (sample totals) |
| TodayStates (loading) | Hidden heading "Hôm nay — Đang tải" and "Đang tải…" | — (already present) |
| TodayStates (offline) | Hidden heading "Hôm nay — Ngoại tuyến" missing | fixed |
| TodayStates (offline) | Offline banner "Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng." present | — |
| TodayStates (offline) | Per-item "Chờ đồng bộ" marker in design; no sync queue exists | question (behaviour: offline sync) |
| PastDay (390) | Day label comma (as CopyYesterday) | left-as-decided |
| PastDay (390) | "Đang xem ngày cũ · vẫn sửa được" | left-as-decided: past days are read-only (cc-10) |
| PastDay (390) | "Xem chi tiết từng vi chất" link dropped | left-as-decided (cc-10, OPEN_QUESTIONS) |
| PastDay (390) | "15/21 vi chất đạt" | question (21 vs 22 count) |
| Profile (390, 1440) | "Nhắc nhở" row has no status; design shows "Đã bật" | fixed (shows "Đã bật" when any reminder is on; no status when all off, since the design gives no "off" copy) |
| Profile (1440) | "Ngày tập mặc định" shown as chips, design as "60 phút" | left-as-decided (cc-09 ChipGroup) |
| Profile (1440) | "Tải dữ liệu CSV" card not built | question (cc-08, OPEN_QUESTIONS) |
| Profile (1440) | "Gần/đang trong kỳ" and "Chỉ với Nữ · sắt 18 → 28 mg/ngày" shown only for Nữ | left-as-decided (data state; design sample is Nam) |
| Profile (390, 1440) | Subtitle "ban@email.com · Gói Miễn phí" | question (cc-08, no account data yet) |
| EditWeight (390) | "Ngày cân", "Lần cân trước" history, "Tính lại theo cân nặng mới (65,4 → 65,0 kg)." | question (cc-08: no weight log data) |
| SetupProfile (390) | Women's note "Với nữ, bạn có thể bật …18 lên 28 mg/ngày." | left-as-decided: shown only when Nữ is selected (already in the form) |
| SetupProfile (1440) | Step label "Bước 1/2 · Về bạn" missing on desktop | fixed |
| SetupProfile (1440), SetupGoal (1440) | Section heading "Mục tiêu của bạn mỗi ngày" vs design "Mục tiêu mỗi ngày" | fixed |
| SetupProfile (390) | Step shown as step bars with "Bước 1 / 2" in the header; design shows the same text in its title | left-as-decided (cc-04 AppHeader) |
| SetupGoal (390) | Copy matches | — |
| SignUp (390) | Subtitle "theo dõi vi chất" vs design "theo dõi 26 chất dinh dưỡng" | question (product claim on the count; see OPEN_QUESTIONS) |
| SignUp (1440) | Desktop heading "TẠO TÀI KHOẢN" missing | fixed |
| SignUp (1440) | Desktop helper "Chúng tôi gửi link vào email, không cần mật khẩu." (comma); phone uses an em dash | left-as-decided: phone wording on both widths |
| SignUp (1440) | Left panel "Theo dõi đầy đủ vi chất, không chỉ calo" vs design "Theo dõi 26 chất dinh dưỡng, không chỉ calo" | question (same count claim) |
| SignIn (390) | Copy matches | — |
| CheckEmail (390) | "email của bạn" vs design "ban@email.com"; the address shows when one is pending, and nothing is pending in the probe | left-as-decided: data state |
| CheckEmail (390) | Resend timer "sau 44 giây" vs "sau 45 giây" | left-as-decided: live countdown |
| LinkExpired (390) | Copy matches | — |
| HeadingCompare | Style reference, not a screen | not compared |
