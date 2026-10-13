# Vietnamese UI Copy Audit (`ag-11`)

## Executive Summary

### Issue Counts by Rule (71 rows identified)

| Rule Code | Audit Rule | Issue Count | Impact |
|---|---|---:|---|
| **R1 (`no-english`)** | No English left in the UI (except brand `H1T MICRO`, units) | **18** | High (entire `/admin/review` screen, raw `food.source` tokens, `"link"`/`"Spam"`/`"SET"`/`"starch"`) |
| **R2 (`sentence-case`)** | Sentence case for labels and headings; no ALL-CAPS source strings or Title Case | **18** | Medium – High (`layout.tsx`, `diary-screen.tsx`, `profile-cards.tsx`, `AppHeader`, `/signin`, `/signup`) |
| **R3 (`vn-numbers`)** | Vietnamese number formatting (`1.041`; `2,5`; `50%` with no space) | **11** | High (`formatPercent` adds a space `"50 %"`, raw `gramsInput` bypasses `formatAmount`) |
| **R4 (`vn-dates`)** | Vietnamese date formatting (`"Hôm nay 12/10"`, `"Hôm qua 11/10"`, `"Thứ Hai 05/10"`) | **3** | Medium (`copy-yesterday-sheet.tsx`, `formatDesktopDate`, `calendar-sheet.tsx`) |
| **R5 (`one-term`)** | One term per concept (`Tinh bột` vs `Carb`, `Bữa ăn của tôi`, `Béo` vs `Chất béo`) | **17** | High (visible on food rows, meal `⋯` menu, food detail, overview, and target settings) |
| **R6 (`same-verb`)** | Same action uses the same verb everywhere (`Thêm` vs `Ghi`, `Về Nhật ký`) | **7** | Medium – High (overview banner, wrong back-button destination label on `/entry/[id]`) |
| **R7 (`facts-only`)** | Facts only; no over-limit `"vượt"` warnings, no `"Coach"` tags in the UI | **8** | Critical (violates core product rules in `calendar-sheet.tsx`, `target-rows.ts`, `targets-screen.tsx`, `paywall`, `signup`) |
| **R8 (`natural-vi`)** | Short, natural Vietnamese; no bracketed placeholders `[...]` or stiff phrasing | **6** | High (`[GIÁ/THÁNG]` on `/paywall`, `"58 chỉ số"` contradicting `"22 vi chất"`, hardcoded `14:05`) |

*(Note: There are **71 confirmed rows** in Section 2; rows that violate two rules simultaneously are counted under each applicable rule above).*

### Top 10 Most Visible Problems on First-Seen Screens

1. **Over-limit `"vượt mục tiêu"` warning in the date-picker calendar** — [calendar-sheet.tsx:14](apps/web/components/calendar-sheet.tsx#L14) (interpolated into each day button's `aria-label` at line 99): Directly violates the product rule prohibiting over-limit or `"vượt"` warnings anywhere.
2. **Extra space before `%` (`"50 %"` instead of `"50%"`) across Overview, Explore, Food Detail & Target Settings** — [format.ts:195](apps/web/lib/format.ts#L195), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54), [food-micros.tsx:70](apps/web/components/foods/food-micros.tsx#L70), [explore/rich/[nutrient]/page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60), [target-rows.ts:87](apps/web/components/settings/target-rows.ts#L87): Clashes with the decided `50%` format and with `<50%` / `≥100%` on `/micros`.
3. **Mixing `"g carb"` / `"Carb"` with `"Tinh bột"` on every food row and on Food Detail** — [food-meta.ts:14](apps/web/lib/food-meta.ts#L14), [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196), [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193): Overview (`/`), `/settings/targets`, and `/foods/new` use `"Tinh bột"`, whereas food lists on `/add`, `/explore`, and `/foods/[id]` show `"carb"` / `"Carb"`.
4. **`"Lưu thành Bữa của tôi"` button in the Diary meal menu (`⋯`)** — [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95): Diverges from the fixed term **`"Bữa ăn của tôi"`** decided by Hao (13/10).
5. **`"Coach"` / `"coach"` labels visible on Daily Targets, Paywall, and Sign-up** — [target-rows.ts:86](apps/web/components/settings/target-rows.ts#L86), [targets-screen.tsx:36](apps/web/components/settings/targets-screen.tsx#L36), [paywall/page.tsx:23](apps/web/app/paywall/page.tsx#L23), [paywall/page.tsx:37](apps/web/app/paywall/page.tsx#L37), [signup/page.tsx:8](apps/web/app/signup/page.tsx#L8), [signup/page.tsx:33](apps/web/app/signup/page.tsx#L33): Violates the product rule prohibiting `"Coach"` tags or labels in the UI.
6. **Raw data-source identifiers (`"usda"`, `"vn-fct"`, `"custom"`) rendered on food rows and Food Detail** — [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120) and [food-meta.ts:22](apps/web/lib/food-meta.ts#L22): Only `"user"` is mapped to `"Của tôi"`; all other `food.source` values render raw database codes in the UI.
7. **Inconsistent `"Ghi"` vs `"Thêm"` verbs on primary call-to-action buttons** — [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) (`"Ghi bữa tối"`), [micros/page.tsx:310](apps/web/app/micros/page.tsx#L310) (`"+ Ghi món ngay"`), [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) (`"Bắt đầu ghi bữa ăn"`): Navigation (`bottom-nav.tsx`, `desktop-sidebar.tsx`) and `/add` use `"Thêm món"`.
8. **Button labelled `"Về Tổng quan"` that actually navigates to `/diary` (Diary)** — [entry/[id]/page.tsx:44](apps/web/app/entry/[id]/page.tsx#L44): Button copy and link destination disagree.
9. **Literal bracketed placeholders `[GIÁ/THÁNG]`, `[GIÁ/NĂM]`, `Tiết kiệm [X]%`, `[NHÀ CUNG CẤP THANH TOÁN]` on `/paywall`** — [paywall/page.tsx:16](apps/web/app/paywall/page.tsx#L16), [paywall/page.tsx:17](apps/web/app/paywall/page.tsx#L17), [paywall/page.tsx:135](apps/web/app/paywall/page.tsx#L135), along with Title Case `"Gói Miễn phí"` at line 144.
10. **Contradictory micronutrient count (`"58 chỉ số vi chất"` vs `"22 vi chất"`) and missing-data wording (`"chưa có số liệu"` vs `"chưa có dữ liệu"`)** — [micros/page.tsx:304](apps/web/app/micros/page.tsx#L304) says `"58 chỉ số vi chất"` while [layout.tsx:23](apps/web/app/layout.tsx#L23) and [paywall/page.tsx:144](apps/web/app/paywall/page.tsx#L144) say `"22 vi chất"`; the Overview micros tab ([micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37)) uses `"chưa có số liệu"` while `/micros` ([micros/page.tsx:680](apps/web/app/micros/page.tsx#L680)) uses `"chưa có dữ liệu"`.

---

## 1. Inventory of User-Facing Strings (`apps/web/app` & `apps/web/components`)

The tables below list every user-facing string (labels, buttons, headings, hints, toasts, empty states, `aria-label` attributes, and page titles) on the current branch across `apps/web/app`, `apps/web/components`, and shared formatting/catalog helpers in `apps/web/lib` (excluding `apps/web/lib/api-client*`, `apps/web/lib/supabase-client*`, and `apps/web/app/(auth)/login` per scope).

### 1.1. Pages in `apps/web/app`

| Route | File:Line | Text |
|---|---|---|
| Global (Root Layout) | [layout.tsx:22](apps/web/app/layout.tsx#L22) | `H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu` |
| Global (Root Layout) | [layout.tsx:23](apps/web/app/layout.tsx#L23) | `Theo dõi 22 vi chất và macro dinh dưỡng chuyên sâu cho vận động và tập luyện.` |
| Global (Error Boundary) | [error.tsx:45](apps/web/app/error.tsx#L45) | `Không tải được dữ liệu` |
| Global (Error Boundary) | [error.tsx:47](apps/web/app/error.tsx#L47) | `Máy chủ đang bận. Dữ liệu bạn đã ghi vẫn an toàn trên máy.` |
| Global (Error Boundary) | [error.tsx:52](apps/web/app/error.tsx#L52) | `Thử lại` |
| Global (Error Boundary) | [error.tsx:58](apps/web/app/error.tsx#L58) | `Về Tổng quan` |
| Global (Error Boundary) | [error.tsx:63](apps/web/app/error.tsx#L63) | `Mã lỗi: {error.digest \|\| "503"} · {timeStr}` |
| Global (404 Not Found) | [not-found.tsx:12](apps/web/app/not-found.tsx#L12) | `Không tìm thấy trang` |
| Global (404 Not Found) | [not-found.tsx:20](apps/web/app/not-found.tsx#L20) | `Link có thể đã cũ hoặc bị gõ sai.` |
| Global (404 Not Found) | [not-found.tsx:25](apps/web/app/not-found.tsx#L25) | `Về Tổng quan` |
| Global (404 Not Found) | [not-found.tsx:32](apps/web/app/not-found.tsx#L32) | `Đã ghi nhận báo lỗi` / `Báo lỗi` |
| `/training` | [page.tsx:133](apps/web/app/(dashboard)/training/page.tsx#L133) | `{baseLabel} · Chỉ xem` (also line 138) |
| `/training` | [page.tsx:154](apps/web/app/(dashboard)/training/page.tsx#L154) | `NGÀY TẬP` (also line 218) |
| `/training` | [page.tsx:168](apps/web/app/(dashboard)/training/page.tsx#L168) | `Muối: —` / `Ngày này chưa có thời lượng tập đã ghi. Chỉ xem.` (also lines 235–237) |
| `/add` | [page.tsx:186](apps/web/app/add/page.tsx#L186) | `+ Tạo món mới` / `Không thấy món? Tự nhập dinh dưỡng` |
| `/add` | [page.tsx:225](apps/web/app/add/page.tsx#L225) | `Thêm vào: {mealNameVi}` (also line 343) |
| `/add` | [page.tsx:232](apps/web/app/add/page.tsx#L232) | `Tự chọn theo giờ trong ngày · bấm để đổi bữa` |
| `/add` | [page.tsx:239](apps/web/app/add/page.tsx#L239) | `Đóng` (also line 357) |
| `/add` | [page.tsx:255](apps/web/app/add/page.tsx#L255) | `Lọc món theo nhóm` (also line 369) |
| `/add` | [page.tsx:260](apps/web/app/add/page.tsx#L260) | `Gần đây` / `Món gần đây` (also lines 374–375) |
| `/add` | [page.tsx:296](apps/web/app/add/page.tsx#L296) | `Chọn một món để xem khẩu phần` |
| `/add` | [page.tsx:303](apps/web/app/add/page.tsx#L303) | `Enter để thêm · Esc để đóng` |
| `/add` | [page.tsx:323](apps/web/app/add/page.tsx#L323) | `Thêm món vào {mealNameVi}` |
| `/add` | [page.tsx:330](apps/web/app/add/page.tsx#L330) | `Thêm món` |
| `/add` | [page.tsx:339](apps/web/app/add/page.tsx#L339) | `Đổi bữa` |
| `/add` | [page.tsx:350](apps/web/app/add/page.tsx#L350) | `Tự chọn theo giờ trong ngày · chạm để đổi` |
| `/admin/review` | [page.tsx:51](apps/web/app/admin/review/page.tsx#L51) | `Admin RBAC Guarded` |
| `/admin/review` | [page.tsx:54](apps/web/app/admin/review/page.tsx#L54) | `Coach Vault Review` |
| `/admin/review` | [page.tsx:57](apps/web/app/admin/review/page.tsx#L57) | `Review and publish markdown meal plans synchronized from GitHub repository` |
| `/admin/review` | [page.tsx:62](apps/web/app/admin/review/page.tsx#L62) | `Filter drafts` (`all` / `draft` / `published` / `rejected`) |
| `/admin/review` | [page.tsx:105](apps/web/app/admin/review/page.tsx#L105) | `commit: {draft.commit_hash}` |
| `/admin/review` | [page.tsx:122](apps/web/app/admin/review/page.tsx#L122) | `Approve` / `Reject` (line 129) |
| `/admin/review` | [page.tsx:135](apps/web/app/admin/review/page.tsx#L135) | `Status: {draft.status}` |
| `/dev/ui` | [page.tsx:28](apps/web/app/dev/ui/page.tsx#L28) | `Thư viện giao diện H1T MICRO` |
| `/dev/ui` | [page.tsx:30](apps/web/app/dev/ui/page.tsx#L30) | `Kiểm thử thành phần cơ bản (Task 01) — chuẩn hóa tiếng Việt, khoảng cách 4-8-12-16-20-24-32px, mục tiêu chạm 44px.` |
| `/dev/ui` | [page.tsx:48](apps/web/app/dev/ui/page.tsx#L48) | `1. AppHeader — Variant "daily" (Today / Vi chất)` / `HÔM NAY` / `VỀ BẠN` / `HỒ SƠ` / `user@example.com · Gói Miễn phí` |
| `/dev/ui` | [page.tsx:153](apps/web/app/dev/ui/page.tsx#L153) | `Tiếp tục (Primary)` / `Chép hôm qua (Secondary)` / `Xoá món (Destructive)` |
| `/dev/ui` | [page.tsx:179](apps/web/app/dev/ui/page.tsx#L179) | `Tất cả` / `Gần đây` / `Ưa thích` / `Món Việt` |
| `/dev/ui` | [page.tsx:276](apps/web/app/dev/ui/page.tsx#L276) | `Đã lưu món ăn vào bữa trưa` / `Hiện thông báo mẫu` |
| `/entry/[id]` | [page.tsx:42](apps/web/app/entry/[id]/page.tsx#L42) | `Không tìm thấy món này` |
| `/entry/[id]` | [page.tsx:44](apps/web/app/entry/[id]/page.tsx#L44) | `Về Tổng quan` (links to `/diary`) |
| `/explore` | [page.tsx:27](apps/web/app/explore/page.tsx#L27) | `Tất cả` |
| `/explore` | [page.tsx:39](apps/web/app/explore/page.tsx#L39) | `Khám phá` / `Tìm món, lọc theo nhóm, hoặc xem món giàu vi chất` |
| `/explore` | [page.tsx:47](apps/web/app/explore/page.tsx#L47) | `Lọc món theo nhóm` |
| `/explore` | [page.tsx:52](apps/web/app/explore/page.tsx#L52) | `Kết quả cho “{query.trim()}”` / `Không có món nào khớp. Thử từ ngắn hơn, bỏ dấu, hoặc tạo món mới.` / `Tạo món mới` |
| `/explore/[category]` | [page.tsx:24](apps/web/app/explore/[category]/page.tsx#L24) | `{foods.length} món` / `Chưa có món nào trong nhóm này. Tạo món mới để ghi món tự nấu hoặc món không có trong danh sách.` / `Tạo món mới` |
| `/explore/rich/[nutrient]` | [page.tsx:37](apps/web/app/explore/rich/[nutrient]/page.tsx#L37) | `Giàu {name}` / `{unit} mỗi 100 g` / `mỗi khẩu phần` / `Mỗi 100 g` / `Mỗi khẩu phần` / `Món giàu {name}` |
| `/explore/rich/[nutrient]` | [page.tsx:53](apps/web/app/explore/rich/[nutrient]/page.tsx#L53) | `Chưa có món nào có dữ liệu về {name}.` |
| `/explore/rich/[nutrient]` | [page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60) | `{row.pct} % mục tiêu ngày · {row.basis}` |
| `/foods/[id]` | [page.tsx:65](apps/web/app/foods/[id]/page.tsx#L65) | `Đã bỏ khỏi Yêu thích` / `Đã lưu vào Yêu thích` |
| `/foods/[id]` | [page.tsx:83](apps/web/app/foods/[id]/page.tsx#L83) | `${gramsInput} g` (also line 204) |
| `/foods/[id]` | [page.tsx:93](apps/web/app/foods/[id]/page.tsx#L93) | `Không tìm thấy món` / `Món này không còn trong danh sách.` / `Về Khám phá` |
| `/foods/[id]` | [page.tsx:113](apps/web/app/foods/[id]/page.tsx#L113) | `Thêm vào {mealNameVi}` |
| `/foods/[id]` | [page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120) | `${food.source === "user" ? "Của tôi" : food.source} · ${grams} g mỗi khẩu phần` |
| `/foods/[id]` | [page.tsx:127](apps/web/app/foods/[id]/page.tsx#L127) | `Bỏ yêu thích` / `Thêm vào yêu thích` |
| `/foods/[id]` | [page.tsx:150](apps/web/app/foods/[id]/page.tsx#L150) | `Khẩu phần` / `Tùy chỉnh` (line 166) / `Khối lượng theo gam` (line 179) |
| `/foods/[id]` | [page.tsx:195](apps/web/app/foods/[id]/page.tsx#L195) | `kcal` / `Carb` / `Đạm` / `Béo` |
| `/foods/new` | [page.tsx:49](apps/web/app/foods/new/page.tsx#L49) | `Vui lòng nhập tên món ăn.` / `Khẩu phần phải lớn hơn 0.` / `Năng lượng không hợp lệ.` |
| `/foods/new` | [page.tsx:114](apps/web/app/foods/new/page.tsx#L114) | `${parsedSize} ${servingUnit}` |
| `/foods/new` | [page.tsx:130](apps/web/app/foods/new/page.tsx#L130) | `Lưu và thêm vào {mealNameVi}` / `TẠO MÓN MỚI` (line 136) / `Tên món` (line 149) / `Ví dụ: Bánh tráng trộn` (line 158) / `Khẩu phần` (line 166) / `Đơn vị khẩu phần` (line 167) |
| `/foods/new` | [page.tsx:212](apps/web/app/foods/new/page.tsx#L212) | `Dinh dưỡng mỗi khẩu phần` / `Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa biết, không phải 0.` |
| `/foods/new` | [page.tsx:219](apps/web/app/foods/new/page.tsx#L219) | `Năng lượng (kcal)` / `Đạm (g)` / `Tinh bột (g)` / `Béo (g)` |
| `/foods/new` | [page.tsx:271](apps/web/app/foods/new/page.tsx#L271) | `+ Thêm vi chất (Natri, Canxi, Sắt…)` / `Natri (mg)` / `Kali (mg)` / `Canxi (mg)` / `Sắt (mg)` / `Vitamin D (µg)` |
| `/install` | [page.tsx:17](apps/web/app/install/page.tsx#L17) | `THÊM VÀO MÀN HÌNH CHÍNH` / `Quay lại` (line 19) |
| `/install` | [page.tsx:38](apps/web/app/install/page.tsx#L38) | `Mở nhanh như ứng dụng, chạy cả khi mất mạng` |
| `/install` | [page.tsx:46](apps/web/app/install/page.tsx#L46) | `Thiết bị` (`iPhone (Safari)` / `Android (Chrome)`) |
| `/install` | [page.tsx:81](apps/web/app/install/page.tsx#L81) | `Các bước cài đặt trên iPhone` / `Chạm nút Chia sẻ` (line 92) / `ở thanh dưới Safari` / `Chọn “Thêm vào MH chính”` (line 106) / `Chạm “Thêm” ở góc phải` (line 120) |
| `/install` | [page.tsx:140](apps/web/app/install/page.tsx#L140) | `Các bước cài đặt trên Android` / `Chạm menu ba chấm (⋮) ở góc trên Chrome` / `Chọn “Thêm vào Màn hình chính” hoặc “Cài đặt ứng dụng”` (line 163) / `Chạm “Cài đặt” hoặc “Thêm” để xác nhận` / `Đã hiểu` (line 189) |
| `/micros` | [page.tsx:27](apps/web/app/micros/page.tsx#L27) | `Vitamin` / `Khoáng chất` / `Đạm` / `Chất béo` / `Tinh bột` / `Tổng quan` (also lines 218–223) |
| `/micros` | [page.tsx:94](apps/web/app/micros/page.tsx#L94) | ` · Chỉ xem` / ` · Thiếu nhiều nhất: {mostLacking}` (line 99) |
| `/micros` | [page.tsx:233](apps/web/app/micros/page.tsx#L233) | `Vi chất — Đang tải` |
| `/micros` | [page.tsx:277](apps/web/app/micros/page.tsx#L277) | `VI CHẤT` (also lines 297, 335, 452) |
| `/micros` | [page.tsx:285](apps/web/app/micros/page.tsx#L285) | `Bắt đầu ghi món để đo lường` / `đã đạt` / `Chưa ghi món nào ngày này` (line 302) / `Chưa ghi món nào hôm nay` (line 302) |
| `/micros` | [page.tsx:304](apps/web/app/micros/page.tsx#L304) | `Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.` / `Về Nhật ký` / `+ Ghi món ngay` (line 310) |
| `/micros` | [page.tsx:342](apps/web/app/micros/page.tsx#L342) | `Thiếu nhiều nhất` / `đã đạt mục tiêu` / `Xu hướng 7 và 30 ngày` (line 363) |
| `/micros` | [page.tsx:429](apps/web/app/micros/page.tsx#L429) | `* Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).` (also line 519) |
| `/micros` | [page.tsx:463](apps/web/app/micros/page.tsx#L463) | `vi chất đạt` / `Xu hướng ›` (line 465) |
| `/micros` | [page.tsx:533](apps/web/app/micros/page.tsx#L533) | `Thiếu` `<50%` / `Trung bình` `50–79%` / `Gần đủ` `80–99%` / `Đạt` `≥100%` / `Chú thích màu sắc vi chất` (line 541) |
| `/micros` | [page.tsx:668](apps/web/app/micros/page.tsx#L668) | `giá trị tham khảo` / `chưa có dữ liệu` (lines 680, 707) |
| `/micros/[nutrient]` | [page.tsx:77](apps/web/app/micros/[nutrient]/page.tsx#L77) | `Không tìm thấy vi chất.` / `Quay lại Vi chất` (line 79) |
| `/micros/[nutrient]` | [page.tsx:89](apps/web/app/micros/[nutrient]/page.tsx#L89) | `Chi tiết vi chất — Đang tải` |
| `/micros/[nutrient]` | [page.tsx:113](apps/web/app/micros/[nutrient]/page.tsx#L113) | `Vi chất · {date} · Chỉ xem` / `Vi chất · Hôm nay` / `Quay lại` / `Mục tiêu: {targetText}/ngày.` (line 131) / `7 ngày qua` (line 146) / `Đã có từ món ăn của ngày này` / `Đã có từ món ăn hôm nay` (line 153) |
| `/paywall` | [page.tsx:16](apps/web/app/paywall/page.tsx#L16) | `Tháng` · `[GIÁ/THÁNG]` / `Năm` · `[GIÁ/NĂM]` · `Tiết kiệm [X]%` (line 17) |
| `/paywall` | [page.tsx:21](apps/web/app/paywall/page.tsx#L21) | `Gợi ý món theo vi chất còn thiếu` / `Xu hướng 30 & 90 ngày` / `Món & công thức riêng của Coach` / `Xuất dữ liệu CSV` |
| `/paywall` | [page.tsx:36](apps/web/app/paywall/page.tsx#L36) | `PRO` / `Ăn theo Coach, không phải đoán` / `Quay lại` / `Chọn gói` (line 73) |
| `/paywall` | [page.tsx:132](apps/web/app/paywall/page.tsx#L132) | `Tiếp tục thanh toán` / `Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN] · huỷ bất cứ lúc nào` (line 135) / `Khôi phục gói đã mua` (line 139) / `Gói Miễn phí vẫn ghi đủ 22 vi chất.` (line 144) |
| `/settings/delete-account` | [page.tsx:11](apps/web/app/settings/delete-account/page.tsx#L11) | `Nhật ký bữa ăn và ngày tập` / `Món và công thức bạn tự tạo` / `Hồ sơ, cân nặng và mục tiêu` / `Cài đặt nhắc nhở` |
| `/settings/delete-account` | [page.tsx:36](apps/web/app/settings/delete-account/page.tsx#L36) | `Chưa hỗ trợ xoá tài khoản trong bản thử` / `Chưa hỗ trợ tải dữ liệu trong bản thử` (line 41) |
| `/settings/delete-account` | [page.tsx:47](apps/web/app/settings/delete-account/page.tsx#L47) | `XOÁ TÀI KHOẢN` / `Quay lại` (line 49) / `Xoá vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục.` (line 68) / `Tải dữ liệu về (CSV)` (line 89) / `Gõ XOÁ để xác nhận` (line 98) / `XOÁ` (line 109) / `Xoá tài khoản` (line 123) / `Huỷ` (line 133) |
| `/settings/language` | [page.tsx:34](apps/web/app/settings/language/page.tsx#L34) | `NGÔN NGỮ` / `Quay lại` (line 36) / `Ngôn ngữ` (`Tiếng Việt` / `English`) / `Đơn vị · Dấu thập phân` (`Dấu phẩy (2,5)` / `Dấu chấm (2.5)`) / `Đơn vị · Năng lượng` (`kcal` / `kJ`) / `Tự động lưu` (line 187) |
| `/settings/notifications` | [page.tsx:32](apps/web/app/settings/notifications/page.tsx#L32) | `Nhắc ghi bữa sáng` / `Nhắc ghi bữa trưa` / `Nhắc ghi bữa tối` / `Nhắc muối khi tập` (`Mỗi 20 phút`) / `Tổng kết tối` |
| `/settings/notifications` | [page.tsx:96](apps/web/app/settings/notifications/page.tsx#L96) | `Đã bật quyền thông báo` / `Trình duyệt từ chối quyền thông báo` / `NHẮC NHỞ` (line 116) / `Quay lại` (line 118) / `Thông báo cần quyền của trình duyệt` (line 138) / `Bật quyền thông báo` (line 146) / `Đổi giờ {row.label}, hiện tại {timeVal}` (line 186) / `Tự động lưu` (line 218) |
| `/settings/profile/weight` | [page.tsx:61](apps/web/app/settings/profile/weight/page.tsx#L61) | `Cân nặng hôm nay` / `Giảm 0,1 kg` / `Tăng 0,1 kg` / `Mục tiêu sẽ cập nhật` (line 91) / `Năng lượng` / `{cal} · giữ nguyên` / `Đạm` / `Kali` / `Nhập cân nặng để xem mục tiêu` (line 104) / `Tính lại theo cân nặng mới.` (line 109) / `Lưu` (line 113) / `CÂN NẶNG` (line 120) |
| `/signin` | [page.tsx:15](apps/web/app/signin/page.tsx#L15) | `CHÀO MỪNG TRỞ LẠI.` / `Đăng nhập để xem tiếp nhật ký và vi chất của bạn.` / `hoặc` / `Gửi link đăng nhập` (line 25) / `Chưa có tài khoản?` / `Đăng ký` |
| `/signin/check-email` | [page.tsx:54](apps/web/app/signin/check-email/page.tsx#L54) | `KIỂM TRA EMAIL` / `Đã gửi link đăng nhập tới {email}.` (line 58) / `Đã gửi link đăng nhập tới email của bạn.` (line 60) / `Link có hiệu lực 15 phút.` (line 64) / `Mở ứng dụng Mail` (line 72) / `Dùng email khác` (line 80) / `Mô phỏng mở link (dev)` (line 86) / `Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo.` (line 90) |
| `/signin/expired` | [page.tsx:29](apps/web/app/signin/expired/page.tsx#L29) | `LINK ĐÃ HẾT HẠN` / `Link đăng nhập chỉ dùng được một lần và trong 15 phút.` (line 32) / `Gửi link mới` (line 38) / `Quay lại` (line 44) |
| `/signup` | [page.tsx:7](apps/web/app/signup/page.tsx#L7) | `Theo dõi đầy đủ vi chất, không chỉ calo` / `Mục tiêu do Coach Lê Hồng Khánh đặt` / `Ghi bữa ăn trong vài giây, thấy ngay còn thiếu gì` |
| `/signup` | [page.tsx:21](apps/web/app/signup/page.tsx#L21) | `H1T MICRO, 1 set là đủ` / `1 SET LÀ ĐỦ` (line 23) / `VI CHẤT PHẢI ĐỦ.` (line 26) / `Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.` (line 33) |
| `/signup` | [page.tsx:41](apps/web/app/signup/page.tsx#L41) | `Tạo tài khoản` / `hoặc` / `Gửi link đăng nhập` (line 53) / `Chúng tôi gửi link vào email — không cần mật khẩu.` (line 59) / `Đã có tài khoản?` / `Đăng nhập` / `Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế.` (line 76) |

### 1.2. Components in `apps/web/components` & Shared Strings in `apps/web/lib`

| Route / Area | File:Line | Text |
|---|---|---|
| Calendar Sheet | [calendar-sheet.tsx:12](apps/web/components/calendar-sheet.tsx#L12) | `đạt mục tiêu` / `thiếu kcal` / `vượt mục tiêu` / `chưa ghi` |
| Calendar Sheet | [calendar-sheet.tsx:29](apps/web/components/calendar-sheet.tsx#L29) | `Chọn ngày` / `Tháng {Number(m)}, {month.slice(0, 4)}` (line 53) / `Tháng trước` (line 61) / `Tháng sau` (line 73) |
| Calendar Sheet | [calendar-sheet.tsx:97](apps/web/components/calendar-sheet.tsx#L97) | `{weekday} {day} tháng {m}` / `hôm nay` / `chưa tới` / `Đạt mục tiêu kcal` (line 125) / `Thiếu` (line 129) / `Không chấm: chưa ghi` (line 131) |
| Copy Yesterday Sheet | [copy-yesterday-sheet.tsx:32](apps/web/components/copy-yesterday-sheet.tsx#L32) | `{weekday}, {dd}/{mm} · {kcal} kcal` / `Chép bữa hôm qua?` (line 35) / `Đã chép {chosen.length} bữa từ hôm qua` (line 67) / `Hôm qua chưa ghi bữa nào.` (line 72) / `Món đã có hôm nay sẽ không bị ghi đè.` (line 99) / `Chép {chosen.length} bữa` (line 104) / `Chọn bữa để chép` (line 104) / `Huỷ` (line 111) |
| Undo Toast | [diary-toast.tsx:44](apps/web/components/diary-toast.tsx#L44) | `Xem` / `Hoàn tác` |
| Diary (`/diary`) | [diary-screen.tsx:58](apps/web/components/diary/diary-screen.tsx#L58) | `Tiến độ {m.label}` / `Mục tiêu {min}–{max} kcal · thiếu/còn {gap} kcal` (lines 64–68) |
| Diary (`/diary`) | [diary-screen.tsx:178](apps/web/components/diary/diary-screen.tsx#L178) | `Vi chất · chưa có món` / `{achieved}/{total} vi chất · Thiếu: {mostLacking}` / `Ngày tập · Chỉ xem` / `Ngày tập {mins}′ · muối {salt} g` / `Nghỉ · muối {salt} g` |
| Diary (`/diary`) | [diary-screen.tsx:194](apps/web/components/diary/diary-screen.tsx#L194) | `Chọn ngày, {formatDesktopDate}` / `Đã chép {menuMeal.name} từ hôm qua · {copies.length} món` (line 215) / `Nhật ký` (line 233) / `Đang tải…` (line 238) |
| Diary (`/diary`) | [diary-screen.tsx:274](apps/web/components/diary/diary-screen.tsx#L274) | `Chưa ghi` / `Chưa có món` / `Thêm vào {meal.name}` (line 283) / `Tuỳ chọn {meal.name}` (line 292) |
| Diary (`/diary`) | [diary-screen.tsx:346](apps/web/components/diary/diary-screen.tsx#L346) | `Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.` / `Tóm tắt ngày` (line 354) / `Chỉ xem` (line 359) / `còn {remaining} kcal · Mục tiêu {min}–{max}` (line 364) / `Kcal trong ngày` (line 369) |
| Diary (`/diary`) | [diary-screen.tsx:380](apps/web/components/diary/diary-screen.tsx#L380) | `Đang xem ngày cũ` / `Về hôm nay` / `Chưa có món hôm nay` (line 395) / `Chép bữa từ hôm qua, hoặc thêm món vào từng bữa bằng +.` (line 396) / `Chép hôm qua` (line 405) / `Chi tiết trong ngày` (line 412) |
| Meal Menu Sheet (`⋯`) | [meal-menu-sheet.tsx:51](apps/web/components/diary/meal-menu-sheet.tsx#L51) | `Xoá {mealName}?` / `{itemCount} món · {kcal} kcal sẽ bị xoá khỏi {mealName}. Bạn có 5 giây để hoàn tác.` / `Xoá bữa này` / `Huỷ` |
| Meal Menu Sheet (`⋯`) | [meal-menu-sheet.tsx:83](apps/web/components/diary/meal-menu-sheet.tsx#L83) | `Chép hôm qua` / `Chép {yesterdayItemCount} món · {yesterdayKcal} kcal từ hôm qua` / `Hôm qua chưa ghi bữa này` / `Lưu thành Bữa của tôi` (line 95) / `Sẽ có ở bản sau` (line 96) / `Xoá {itemCount} món, có thể hoàn tác` (line 104) / `Bữa này chưa có món` (line 104) / `Đóng` (line 110) |
| Explore (`/explore`) | [explore-sections.tsx:36](apps/web/components/explore/explore-sections.tsx#L36) | `Gần đây` / `Yêu thích` (line 41) / `Chưa có món yêu thích. Bấm ♡ ở trang chi tiết món để lưu.` (line 42) / `Món của tôi` (line 47) / `Của tôi` (line 49) / `Chưa có món nào. Tạo món mới để ghi món tự nấu hoặc món không có trong danh sách.` (line 53) / `Tạo món mới` (line 58) / `Món giàu vi chất` (line 64) / `Giàu {name}` (line 69) / `Xếp theo mỗi 100 g hoặc mỗi khẩu phần` (line 71) |
| Food Search & Empty (`/add`, `/explore`) | [food-search-field.tsx:23](apps/web/components/foods/food-search-field.tsx#L23) | `Tìm món` / `Tìm món: cơm, trứng, chà là…` / `Xoá tìm kiếm` (line 36) |
| Food Search & Empty (`/add`, `/explore`) | [food-empty-state.tsx:36](apps/web/components/foods/food-empty-state.tsx#L36) | `Bỏ lọc` / `Chưa có món yêu thích` (line 45) / `Bấm ♡ ở trang chi tiết món để lưu.` / `Không có “{query}”` (line 53) / `Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.` / `+ Tạo món mới` (line 62) / `Gợi ý gần giống:` (line 70) |
| Entry Editor (`/entry/[id]`) | [entry-editor.tsx:56](apps/web/components/foods/entry-editor.tsx#L56) | `Khối lượng` / `Số gam` (line 61) / `${e.target.value} g` (line 72) / `Khẩu phần` (line 77) / `Chuyển sang bữa` (line 105) / `kcal` · `Đạm` · `Béo` · `Sắt` (lines 120–123) / `Lưu thay đổi` (line 134) / `Xoá món này` (line 141) / `Sau khi xoá sẽ có nút “Hoàn tác” trong 5 giây.` (line 146) |
| Food Micros (`/foods/[id]`) | [food-micros.tsx:10](apps/web/components/foods/food-micros.tsx#L10) | `< 0,1 %` / `${formatNumber(row.share, { decimals: 1 })} %` / `${row.pct} %` / `Chưa có dữ liệu` (line 42) / `{row.name}: {share} mục tiêu ngày` (line 43) / `Khoáng chất` (line 55) / `Vitamin` (line 56) / `Nguồn tốt của` (line 62) / `Từ 20 % mục tiêu ngày mỗi khẩu phần` (line 63) / `{r.name} · {r.pct} %` (line 70) / `Vi chất trong {portionLabel}` (line 83) / `% mục tiêu ngày` (line 84) / `Chưa có dữ liệu cho {unknown} trong {rows.length} vi chất.` (line 100) |
| Meal Switcher | [meal-switcher.tsx:23](apps/web/components/meal-switcher.tsx#L23) | `Mặc định theo giờ: 14:05 → Trước tập` / `Thêm vào bữa nào?` (line 26) / `trống` (line 40) |
| Nutrient Detail | [contributing-foods.tsx:15](apps/web/components/nutrient-detail/contributing-foods.tsx#L15) | `Chưa có món nào có chất này hôm nay.` |
| Nutrient Detail | [nutrient-history.tsx:31](apps/web/components/nutrient-detail/nutrient-history.tsx#L31) | `7 ngày qua` |
| Onboarding & Sign-in | [google-sign-in-button.tsx:24](apps/web/components/onboarding/google-sign-in-button.tsx#L24) | `Tiếp tục với Google` |
| Onboarding & Sign-in | [magic-link-form.tsx:26](apps/web/components/onboarding/magic-link-form.tsx#L26) | `Nhập email hợp lệ, ví dụ ban@email.com` / `Chưa gửi được link. Thử lại sau ít phút.` (line 35) / `Email` (line 44) |
| Initial Setup (`/setup/*`) | [setup-form.tsx:61](apps/web/components/onboarding/setup-form.tsx#L61) | `Nhập cân nặng để xem mục tiêu` / `Tính cho {weight} kg · {sex}` / `Chưa lưu được hồ sơ. Thử lại sau ít phút.` (line 94) / `Bước 1 / 2` · `Bước 2 / 2` / `VỀ BẠN` · `MỤC TIÊU` (line 110) / `Mục tiêu được tính theo cân nặng và giới tính. Bạn có thể sửa bất cứ lúc nào.` (line 120) / `Thông tin cơ thể` (line 131) / `Giới tính` / `Năm sinh` / `Cân nặng (kg)` / `Với nữ, bạn có thể bật “Gần/đang trong kỳ” trên trang Hồ sơ để tăng mục tiêu sắt từ 18 lên 28 mg/ngày.` (line 200) / `Mục tiêu` / `Mục tiêu mỗi ngày` / `Tiếp tục` (line 257) / `Bắt đầu ghi bữa ăn` (lines 267, 277) / `Quay lại` (line 270) |
| Overview (`/`) | [overview-frame.tsx:17](apps/web/components/overview/overview-frame.tsx#L17) | `Tóm tắt` / `Năng lượng` / `Vi chất` / `Cơ thể` / `Đang tải…` (line 53) / `Tổng quan` (line 115) / `Trung bình mỗi ngày · {period.label}` (line 149) / `Kỳ trước` (line 162) / `Kỳ sau` (line 173) / `Độ dài kỳ` (`{n} ngày`, lines 181–186) |
| Overview (`/`) | [overview-parts.tsx:56](apps/web/components/overview/overview-parts.tsx#L56) | `Chưa đủ dữ liệu` / `Kỳ này có {days} ngày đã ghi. Cần ít nhất 3 ngày để xem trung bình, số ngày đạt và xu hướng.` / `Xem nhật ký` (line 65) / `Trung bình {loggedDays} ngày đã ghi xong ({range}).` (line 84) / `{day}/{month} đang ghi, không tính.` (line 85) |
| Overview (`/`) | [summary-tab.tsx:50](apps/web/components/overview/summary-tab.tsx#L50) | `Còn {remaining} kcal` / `Đã đủ kcal tối thiểu` / `Ghi {meal}` (line 60) / `Xem nhật ký` (line 67) / `Kcal` · `Đạm` · `Cân nặng` (lines 89–101) / `Dữ liệu mẫu · hồ sơ {weight} kg` (line 106) / `Chưa đủ số cân trong kỳ` (line 108) / `Kỳ này` (line 121) / `So với kỳ trước` (line 153) / `Nhận xét` (line 170) |
| Overview (`/trends/energy`) | [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27) | `Đạm {protein} %, tinh bột {carbs} %, béo {fat} % của kcal trung bình` / `Kcal mỗi ngày` (line 63) / `đang ghi` · `chưa ghi` · `trong mục tiêu hoặc trên` · `thiếu` (line 77) / `Đạm` · `Tinh bột` · `Béo` (lines 138–146) / `Thành phần kcal` (line 166) / `{row.share} %` (line 182) / `Trong mục tiêu hoặc trên` · `Thiếu` · `Đang ghi` (lines 201–209) / `Trung bình {cal} kcal` (line 215) / `Mục tiêu {min}–{max} kcal. Trên mục tiêu vẫn tính là đạt.` (line 218) / `ngày đạt` (line 223) / `Trung bình` · `Ngày đạt` · `Dưới mục tiêu` (lines 231–239) / `Đạm trung bình {proteinPct} % mục tiêu` (line 250) |
| Overview (`/trends/micros`) | [micros-tab.tsx:27](apps/web/components/overview/micros-tab.tsx#L27) | `Vi chất · % mục tiêu` / `Thấp nhất trước` / `Chưa có số liệu trong kỳ này` (line 37) / `{row.name}: {chưa có số liệu \| {pct} % mục tiêu}` (line 54) / `Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10 % mục tiêu. Chạm một chất để mở chi tiết.` (line 63) / `{withoutAverage} chất chưa có số liệu trong kỳ này, nên chưa có trung bình.` (line 64) |
| Overview (`/trends/body`) | [body-tab.tsx:38](apps/web/components/overview/body-tab.tsx#L38) | `Cân nặng: {first} kg ngày {dd/mm}, {last} kg ngày {dd/mm}` / `Cân nặng` (line 78) / `Dữ liệu mẫu` (line 81) / `Chưa có số cân trong kỳ này.` (line 85) / `Hiện tại` (`kg · hồ sơ {weight} kg`, lines 93–95) / `Kỳ này` (`Từ {dd/mm}`, lines 98–103) / `Từ đầu` (line 106) / `Số cân là dữ liệu mẫu cho đến khi có nhật ký cân thật.` (line 114) |
| Settings (`/settings`) | [settings-home-screen.tsx:20](apps/web/components/settings/settings-home-screen.tsx#L20) | `H1T MICRO Pro` / `Xem các gói và quyền lợi của tài khoản` / `Xem gói` (line 28) / `Cài đặt` (line 40) / `Hồ sơ của bạn` (line 47) / `Mục tiêu` (`Mục tiêu mỗi ngày` · `{cal} · đạm {pro}`, lines 54–58) / `Tài khoản` (`Đăng xuất`, lines 69–72) / `Vùng nguy hiểm` (`Xoá tài khoản` · `Có bước xác nhận trước khi xoá`, lines 75–78) |
| Profile (`/settings/profile`) | [profile-edit-screen.tsx:19](apps/web/components/settings/profile-edit-screen.tsx#L19) | `Hồ sơ` / `Mục tiêu mỗi ngày` (`Mục tiêu mỗi ngày tính từ hồ sơ này`, lines 33–36) |
| Profile (`/settings/profile`) | [profile-summary.ts:6](apps/web/components/settings/profile-summary.ts#L6) | `Nam` / `Nữ` / `{sex} · sinh {birthYear} · {weight} kg · {goal}` (line 11) |
| Profile (`/settings/profile`) | [profile-cards.tsx:19](apps/web/components/settings/profile-cards.tsx#L19) | `Nam` / `Nữ` / `Năm sinh` (lines 65, 72) / `Cơ thể` (line 97) / `Giới tính` (line 100) / `Gần/đang trong kỳ` (`Chỉ với Nữ · sắt 18 → 28 mg/ngày`, lines 121–122) / `Cân nặng` (line 133) / `Mục tiêu` (line 143) / `Ngày tập mặc định` (`phút` · `Nghỉ` · `{minutes} phút`, lines 157–173) / `Ứng dụng` (`Ngôn ngữ` · `Nhắc nhở` · `Cài như ứng dụng` · `Tiếng Việt` · `English` · `Đã bật` · `Đã tắt`, lines 186–206) |
| Daily Targets (`/settings/targets`) | [target-rows.ts:20](apps/web/components/settings/target-rows.ts#L20) | `Vitamin A` .. `Folate (B9)` (line 26) .. `Selen` / `Năng lượng và đa lượng` (line 55) / `Kcal` · `Đạm` · `Béo` · `Tinh bột` (`Phần còn lại: (kcal − đạm × 4 − béo × 9) ÷ 4`) · `Chất xơ*` (`14 g mỗi 1.000 kcal, kẹp theo giới tính`, lines 60–76) / `Khoáng chất` (line 80) / `Muối` (`Nền 4–6 g + 1–1,5 g mỗi 20 phút tập`) · `Kali` · `Canxi` (`Khoảng mục tiêu theo coach`, line 86) · `Magie` (`50 % mục tiêu canxi`, line 87) · `Sắt` (`Nam 8 mg · Nữ 18 mg, đang kinh 28 mg`) · `Kẽm` (`Nam 12 mg · Nữ 8 mg`) / `Vitamin và khoáng khác*` (line 93) |
| Daily Targets (`/settings/targets`) | [targets-screen.tsx:23](apps/web/components/settings/targets-screen.tsx#L23) | `Mục tiêu mỗi ngày` / `Tính từ hồ sơ · {sex} · {weight} kg · {goal}` / `* Chất xơ: tạm thời, chưa có quy tắc của coach.` (line 36) / `* Khuyến nghị dinh dưỡng Việt Nam 2016 (VN 2016). Đây không phải quy tắc của coach.` (line 37) / `Chỉ xem ở đây. Cân nặng, mục tiêu và ngày tập mặc định sửa trong Hồ sơ.` (line 41) / `Sửa trong Hồ sơ` (line 47) |
| Training (`/training`) | [rest-day-card.tsx:37](apps/web/components/training/rest-day-card.tsx#L37) | `Hôm nay nghỉ tập` |
| Training (`/training`) | [salt-summary-card.tsx:29](apps/web/components/training/salt-summary-card.tsx#L29) | `Muối hôm nay` / `Ngày nghỉ: chỉ cần muối nền, không cộng thêm` / `Muối cần hôm nay` / `{base} g cả ngày + {topUp} g khi tập` / `nền cả ngày` · `ngày nghỉ` · `khi tập {trainingMinutes} phút` (lines 68–79) / `Cách tính: 4–6 g/ngày + 1–1,5 g mỗi 20 phút tập` (line 83) |
| Training (`/training`) | [sodium-progress-card.tsx:28](apps/web/components/training/sodium-progress-card.tsx#L28) | `Natri hôm nay` / `Đạt` (line 32) / `Natri {currentFormatted} trên mục tiêu {targetLabel}, đã đạt` (line 43) / `Đã đạt mức tối thiểu. Mỗi lần ghi muối trong tập sẽ cộng vào đây.` (line 76) |
| Training (`/training`) | [training-tip-banner.tsx:15](apps/web/components/training/training-tip-banner.tsx#L15) | `Ngày nghỉ vẫn ăn đủ đạm để cơ phục hồi.` / `Nhấp carb nhẹ theo từng set ở ngưỡng nặng. Nặng mới đốt đường.` / `Mẹo:` (line 27) |
| Shared UI (`ui/`) | [app-header.tsx:87](apps/web/components/ui/app-header.tsx#L87) | `Quay lại` / `Ngày trước` (line 185) / `Chọn ngày, {dateLabel}` (line 193) / `Ngày sau` (line 204) |
| Shared UI (`ui/`) | [bottom-nav.tsx:52](apps/web/components/ui/bottom-nav.tsx#L52) | `Điều hướng chính` / `Thêm món` (line 64) |
| Shared UI (`ui/`) | [desktop-sidebar.tsx:29](apps/web/components/ui/desktop-sidebar.tsx#L29) | `Thêm món` / `Điều hướng chính` (line 31) |
| Shared UI (`ui/`) | [calorie-dial.tsx:42](apps/web/components/ui/calorie-dial.tsx#L42) | `Năng lượng {current} trên mục tiêu {target} đến {targetMax} kcal` |
| Shared UI (`ui/`) | [portion-panel.tsx:85](apps/web/components/ui/portion-panel.tsx#L85) | `bữa ăn` / `Xem chi tiết →` (line 126) / `Khối lượng` (line 145) / `Số gam` (line 150) / `${gramsInput} g` (line 153) / `kcal` · `Carb` · `Đạm` · `Béo` (lines 192–195) / `Thêm vào {mealNameVi}` (line 213) / `Vi chất trong {gramsInput} g:` (line 220) |
| Shared UI (`ui/`) | [sheet.tsx:92](apps/web/components/ui/sheet.tsx#L92) | `Đóng` |
| Formatting & Catalogs (`lib/`) | [format.ts:148](apps/web/lib/format.ts#L148) | `Hôm nay {dd}/{mm}` / `Hôm qua {dd}/{mm}` (line 160) / `{dayName} {dd}/{mm}` (line 164) / `{weekday}, {dd}/{mm}/{yyyy}` (line 176) / `{val} %` (line 195) |
| Formatting & Catalogs (`lib/`) | [nav.ts:8](apps/web/lib/nav.ts#L8) | `Tổng quan` / `Nhật ký` / `Khám phá` / `Cài đặt` |
| Formatting & Catalogs (`lib/`) | [food-categories.ts:25](apps/web/lib/food-categories.ts#L25) | `Tinh bột` / `Đạm` / `Chất béo & hạt` / `Sữa & chế phẩm` / `Rau củ` / `Trái cây` / `Món Việt` / `Đồ ngọt & ăn vặt` / `Thực phẩm bổ sung` / `Món của tôi` |
| Formatting & Catalogs (`lib/`) | [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) | `{kcal} kcal / {label} · {carbs} g carb · {kali} mg kali` / `{portion} · {source}` (line 22) |
| Formatting & Catalogs (`lib/`) | [levels.ts:19](apps/web/lib/levels.ts#L19) | `Thiếu` / `Trung bình` / `Gần đủ` / `Đạt` |
| Formatting & Catalogs (`lib/`) | [meal-slot.ts:4](apps/web/lib/meal-slot.ts#L4) | `Bữa sáng` / `Bữa trưa` / `Trước tập` / `Bữa tối` / `Bữa phụ` |
| Formatting & Catalogs (`lib/`) | [nutrients.ts:28](apps/web/lib/nutrients.ts#L28) | `Năng lượng` / `Đạm` / `Tinh bột tổng` (line 36) / `Carb ròng` (line 37) / `Chất xơ` (line 38) / `Tinh bột (starch)` (line 41) / `Chất béo` (line 46) + full nutrient catalog |
| Formatting & Catalogs (`lib/`) | [onboarding.ts:36](apps/web/lib/onboarding.ts#L36) | `Tăng cơ` / `Giữ cân` / `Giảm mỡ` / `Giảm mỡ nhanh` / `Nhập năm sinh từ 1900 đến {year}` (line 69) / `Nhập cân nặng từ 30 đến 300 kg` (line 74) / `Gửi lại link (sau {n} giây)` (line 140) |
| Formatting & Catalogs (`lib/`) | [period.ts:168](apps/web/lib/period.ts#L168) | `Năng lượng` / `Đạm` / `Tinh bột` / `Béo` / `Đạm dưới {min} g ở {underDays} trên {of} ngày. Trung bình {avg} g.` (line 243) / `Thấp nhất kỳ này: {label}, {pct} mục tiêu.` (line 258) / `Đã ghi nhật ký {streak} ngày liên tiếp.` (line 263) |
| Formatting & Catalogs (`lib/`) | [training.ts:112](apps/web/lib/training.ts#L112) | `Nghỉ` / `45 phút` .. `120 phút` / `Chà là` (`✓ Đã ghi vào Trước tập`, lines 131–132) / `Bột củ dền (Dalahouse)` (`Tăng lưu chuyển dinh dưỡng`, lines 138–139) / `Muối · phút {start}–{end}` (line 156) / `Carb nhanh` (line 165) / `Trước tập` (line 174) / `Trong tập · {mins} phút` (line 179) / `Ngủ đủ 7–9 tiếng` · `Đạm vẫn 104–143 g` · `Năng lượng giữ 1.950–2.275 kcal` (lines 192–202) |

---

## 2. Issues by Rule (`file:line | current | proposed | rule`)

Rule codes:
- **R1 (`no-english`)**: No English left in the UI (except brand `H1T MICRO`, measurement units, and proper nouns).
- **R2 (`sentence-case`)**: Sentence case for labels and headings; no ALL-CAPS source strings or Title Case.
- **R3 (`vn-numbers`)**: Numbers in Vietnamese format (`1.041`; `2,5`; `50%` with no space before `%`).
- **R4 (`vn-dates`)**: Dates formatted as `"Hôm nay 12/10"`, `"Hôm qua 11/10"`, `"Thứ Hai 05/10"`, `"Chủ nhật 04/10"`.
- **R5 (`one-term`)**: One preferred term per concept (`Đạm`, `Tinh bột`, `Béo`, `Món`, `Xoá`, `Bữa ăn của tôi`, etc.).
- **R6 (`same-verb`)**: Same action uses the same verb everywhere (`Thêm`, `Lưu`, `Xoá`, `Chép`, `Sửa`, `Quay lại`).
- **R7 (`facts-only`)**: Facts only; no advice or `"nên"` wording outside coach rules, no over-limit `"vượt"` warnings anywhere, and no `"Coach"` tags in the UI.
- **R8 (`natural-vi`)**: Short, natural Vietnamese; no bracketed placeholders (`[GIÁ/THÁNG]`), stiff machine-translated phrasing, or mismatched context.

| File:Line | Current | Proposed | Rule |
|---|---|---|---|
| [calendar-sheet.tsx:14](apps/web/components/calendar-sheet.tsx#L14) | `over: "vượt mục tiêu"` (interpolated into calendar day `aria-label` at line 99) | `over: "đạt mục tiêu"` | **R7 (`facts-only`)** — Prohibits over-limit or `"vượt"` warnings anywhere |
| [target-rows.ts:86](apps/web/components/settings/target-rows.ts#L86) | `detail: "Khoảng mục tiêu theo coach"` | `detail: "1.200–1.500 mg mỗi ngày"` | **R7 (`facts-only`)** — No `"coach"` tags or labels in the UI |
| [targets-screen.tsx:36](apps/web/components/settings/targets-screen.tsx#L36) | `* Chất xơ: tạm thời, chưa có quy tắc của coach.` & line 37 `* Khuyến nghị dinh dưỡng Việt Nam 2016 (VN 2016). Đây không phải quy tắc của coach.` | `* Chất xơ: mục tiêu tham khảo theo tổng năng lượng.` & `* Theo bảng khuyến nghị dinh dưỡng cho người Việt Nam (2016).` | **R7 (`facts-only`)** — No `"coach"` tags or labels in the UI |
| [paywall/page.tsx:23](apps/web/app/paywall/page.tsx#L23) | `Món & công thức riêng của Coach` | `Thư viện món Việt & món tự tạo không giới hạn` | **R7 (`facts-only`)** — No `"Coach"` tags or labels in the UI |
| [paywall/page.tsx:37](apps/web/app/paywall/page.tsx#L37) | `Ăn theo Coach, không phải đoán` | `Theo dõi sát mục tiêu, không phải đoán` | **R7 (`facts-only`)** — No `"Coach"` tags or labels in the UI |
| [signup/page.tsx:8](apps/web/app/signup/page.tsx#L8) | `Mục tiêu do Coach Lê Hồng Khánh đặt` | `Mục tiêu cá nhân hoá theo ngày tập và ngày nghỉ` | **R7 (`facts-only`)** — No `"Coach"` tags or labels in the UI |
| [signup/page.tsx:33](apps/web/app/signup/page.tsx#L33) | `Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.` | `Thêm món mỗi bữa, theo dõi 22 vi chất và bám sát mục tiêu mỗi ngày.` | **R7 (`facts-only`)** — No `"Coach"` tags or labels in the UI |
| [admin/review/page.tsx:51](apps/web/app/admin/review/page.tsx#L51) | `Admin RBAC Guarded` | `Khu vực quản trị` | **R1 (`no-english`)** — Entire `/admin/review` screen is in English |
| [admin/review/page.tsx:54](apps/web/app/admin/review/page.tsx#L54) | `Coach Vault Review` | `Duyệt nội dung thực đơn` | **R1 (`no-english`)** & **R7 (`facts-only`)** — English + `"Coach"` + Title Case |
| [admin/review/page.tsx:57](apps/web/app/admin/review/page.tsx#L57) | `Review and publish markdown meal plans synchronized from GitHub repository` | `Xem và duyệt các bản nháp thực đơn đồng bộ từ kho lưu trữ.` | **R1 (`no-english`)** — English subtitle |
| [admin/review/page.tsx:62](apps/web/app/admin/review/page.tsx#L62) | `aria-label="Filter drafts"` + filter buttons `all`, `draft`, `published`, `rejected` (line 63) | `aria-label="Lọc bản nháp"` + `Tất cả`, `Bản nháp`, `Đã đăng`, `Từ chối` | **R1 (`no-english`)** — English filter chips and `aria-label` |
| [admin/review/page.tsx:122](apps/web/app/admin/review/page.tsx#L122) | `Approve` / `Reject` (line 129) / `Status: {draft.status}` (line 135) | `Duyệt` / `Từ chối` / `Trạng thái: {statusVi}` | **R1 (`no-english`)** — English action buttons and status badge |
| [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120) | `${food.source === "user" ? "Của tôi" : food.source} · ${grams} g mỗi khẩu phần` | Map `food.source` to Vietnamese labels (`"Món của tôi"`, `"Viện Dinh dưỡng VN"`, `"USDA"`) | **R1 (`no-english`)** & **R5 (`one-term`)** — Leaks raw `food.source` tokens (`"usda"`, `"vn-fct"`, `"custom"`) into the UI |
| [food-meta.ts:22](apps/web/lib/food-meta.ts#L22) | `${portion} · ${food.source === "user" ? "Của tôi" : food.source}` | Map `food.source` to the same Vietnamese labels (`"Món của tôi"`, `"Viện Dinh dưỡng VN"`, `"USDA"`) | **R1 (`no-english`)** & **R5 (`one-term`)** — Renders raw `food.source` tokens when not `"user"` |
| [not-found.tsx:20](apps/web/app/not-found.tsx#L20) | `Link có thể đã cũ hoặc bị gõ sai.` | `Đường dẫn có thể đã cũ hoặc bị gõ sai.` | **R1 (`no-english`)** — Uses English `"Link"` instead of `"Đường dẫn"` / `"Liên kết"` |
| [signin/page.tsx:25](apps/web/app/signin/page.tsx#L25) | `submitLabel="Gửi link đăng nhập"` (and error `Chưa gửi được link. Thử lại sau ít phút.` at [magic-link-form.tsx:35](apps/web/components/onboarding/magic-link-form.tsx#L35)) | `submitLabel="Gửi liên kết đăng nhập"` / `Chưa gửi được liên kết. Thử lại sau ít phút.` | **R1 (`no-english`)** — Uses English `"link"` |
| [signin/check-email/page.tsx:58](apps/web/app/signin/check-email/page.tsx#L58) | `Đã gửi link đăng nhập tới {email}.` / `Đã gửi link đăng nhập tới email của bạn.` (line 60) / `Link có hiệu lực 15 phút.` (line 64) | `Đã gửi liên kết đăng nhập tới {email}.` / `Đã gửi liên kết đăng nhập tới email của bạn.` / `Liên kết có hiệu lực 15 phút.` | **R1 (`no-english`)** — Uses English `"link"` |
| [signin/check-email/page.tsx:72](apps/web/app/signin/check-email/page.tsx#L72) | `Mở ứng dụng Mail` / `Mô phỏng mở link (dev)` (line 86) / `Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo.` (line 90) | `Mở ứng dụng Thư` / `Mở liên kết thử nghiệm` / `Không thấy email? Kiểm tra mục Thư rác hoặc Quảng cáo.` | **R1 (`no-english`)** — Uses `"Mail"`, `"link"`, `"(dev)"`, `"Spam"` |
| [onboarding.ts:140](apps/web/lib/onboarding.ts#L140) | `Gửi lại link (sau ${formatNumber(secondsLeft)} giây)` / `"Gửi lại link"` (line 141) | `Gửi lại liên kết (sau ${formatNumber(secondsLeft)} giây)` / `"Gửi lại liên kết"` | **R1 (`no-english`)** — Uses English `"link"` |
| [signin/expired/page.tsx:29](apps/web/app/signin/expired/page.tsx#L29) | `LINK ĐÃ HẾT HẠN` / `Link đăng nhập chỉ dùng được một lần và trong 15 phút.` (line 32) / `Gửi link mới` (line 38) | `Liên kết đã hết hạn` / `Liên kết đăng nhập chỉ dùng được một lần và trong 15 phút.` / `Gửi liên kết mới` | **R1 (`no-english`)** & **R2 (`sentence-case`)** — Uses `"link"` and ALL-CAPS heading |
| [signup/page.tsx:21](apps/web/app/signup/page.tsx#L21) | `aria-label="H1T MICRO, 1 set là đủ"` / `1 SET LÀ ĐỦ` (line 23) | `aria-label="H1T MICRO, một hiệp là đủ"` / `Một hiệp là đủ` | **R1 (`no-english`)** & **R2 (`sentence-case`)** — Uses English `"SET"` and ALL-CAPS badge |
| [signup/page.tsx:53](apps/web/app/signup/page.tsx#L53) | `submitLabel="Gửi link đăng nhập"` / `Chúng tôi gửi link vào email — không cần mật khẩu.` (line 59) | `submitLabel="Gửi liên kết đăng nhập"` / `Chúng tôi gửi liên kết vào email — không cần mật khẩu.` | **R1 (`no-english`)** — Uses English `"link"` |
| [dev/ui/page.tsx:48](apps/web/app/dev/ui/page.tsx#L48) | `1. AppHeader — Variant "daily" (Today / Vi chất)` / `Light tone` (line 91) / `Dark tone` (line 129) / `Primary` · `Secondary` · `Destructive` (lines 153–155) / `Chip (44px tap targets)` (line 161) / `Mở Sheet Demo` (line 234) | Translate showcase labels on `/dev/ui` into Vietnamese | **R1 (`no-english`)** — English labels on the UI showcase page |
| [layout.tsx:22](apps/web/app/layout.tsx#L22) | `H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu` | `H1T MICRO \| Dinh dưỡng & vi chất chuyên sâu` | **R2 (`sentence-case`)** — Uses Title Case (`Vi chất Chuyên sâu`) |
| [paywall/page.tsx:144](apps/web/app/paywall/page.tsx#L144) | `Gói Miễn phí vẫn ghi đủ 22 vi chất.` | `Gói miễn phí vẫn ghi đủ 22 vi chất.` | **R2 (`sentence-case`)** — Uses Title Case (`Gói Miễn phí`) |
| [profile-cards.tsx:122](apps/web/components/settings/profile-cards.tsx#L122) | `Chỉ với Nữ · sắt 18 → 28 mg/ngày` | `Chỉ với nữ · sắt 18 → 28 mg/ngày` | **R2 (`sentence-case`)** — Capitalizes `Nữ` mid-phrase (whereas [setup-form.tsx:200](apps/web/components/onboarding/setup-form.tsx#L200) uses lowercase `Với nữ`) |
| [diary-screen.tsx:364](apps/web/components/diary/diary-screen.tsx#L364) | `còn {formatNumber(remaining)} kcal · Mục tiêu {formatRange(targetMin, targetMax)}` | `Còn {formatNumber(remaining)} kcal · mục tiêu {formatRange(targetMin, targetMax)}` | **R2 (`sentence-case`)** — Starts with lowercase `còn` and capitalizes `Mục tiêu` after `·` |
| [foods/[id]/page.tsx:65](apps/web/app/foods/[id]/page.tsx#L65) | `Đã bỏ khỏi Yêu thích` / `Đã lưu vào Yêu thích` | `Đã bỏ khỏi yêu thích` / `Đã thêm vào yêu thích` | **R2 (`sentence-case`)** & **R6 (`same-verb`)** — Capitalizes `Yêu thích` mid-sentence and uses `"lưu"` instead of `"thêm"` (line 127 uses `Thêm vào yêu thích`) |
| [install/page.tsx:92](apps/web/app/install/page.tsx#L92) | `Chạm nút Chia sẻ` / `Chọn “Thêm vào MH chính”` (line 106) / `Chọn “Thêm vào Màn hình chính” hoặc “Cài đặt ứng dụng”` (line 163) | `Chạm nút chia sẻ` / `Chọn “Thêm vào màn hình chính”` (unify across iOS and Android without `MH` abbreviation) | **R2 (`sentence-case`)** & **R5 (`one-term`)** — Mid-sentence capitalization and inconsistent `MH chính` abbreviation |
| [training/page.tsx:154](apps/web/app/(dashboard)/training/page.tsx#L154) | `title="NGÀY TẬP"` (also line 218) | `title="Ngày tập"` | **R2 (`sentence-case`)** — Passes ALL-CAPS source string to `AppHeader` (inconsistent with `"Tổng quan"`, `"Nhật ký"`, `"Cài đặt"`, `"Hồ sơ"`) |
| [foods/new/page.tsx:136](apps/web/app/foods/new/page.tsx#L136) | `title="TẠO MÓN MỚI"` | `title="Tạo món mới"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [micros/page.tsx:277](apps/web/app/micros/page.tsx#L277) | `title="VI CHẤT"` (also lines 297, 335, 452) | `title="Vi chất"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [settings/profile/weight/page.tsx:120](apps/web/app/settings/profile/weight/page.tsx#L120) | `title="CÂN NẶNG"` | `title="Cân nặng"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [settings/language/page.tsx:34](apps/web/app/settings/language/page.tsx#L34) | `title="NGÔN NGỮ"` | `title="Ngôn ngữ"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [settings/notifications/page.tsx:116](apps/web/app/settings/notifications/page.tsx#L116) | `title="NHẮC NHỞ"` | `title="Nhắc nhở"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [settings/delete-account/page.tsx:47](apps/web/app/settings/delete-account/page.tsx#L47) | `title="XOÁ TÀI KHOẢN"` | `title="Xoá tài khoản"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [install/page.tsx:17](apps/web/app/install/page.tsx#L17) | `title="THÊM VÀO MÀN HÌNH CHÍNH"` | `title="Thêm vào màn hình chính"` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [setup-form.tsx:110](apps/web/components/onboarding/setup-form.tsx#L110) | `title={step === 1 ? "VỀ BẠN" : "MỤC TIÊU"}` | `title={step === 1 ? "Về bạn" : "Mục tiêu"}` | **R2 (`sentence-case`)** — ALL-CAPS source string |
| [signin/page.tsx:15](apps/web/app/signin/page.tsx#L15) | `CHÀO MỪNG TRỞ LẠI.` (along with `KIỂM TRA EMAIL` at [signin/check-email/page.tsx:54](apps/web/app/signin/check-email/page.tsx#L54) and `VI CHẤT PHẢI ĐỦ.` at [signup/page.tsx:26](apps/web/app/signup/page.tsx#L26)) | `Chào mừng trở lại.` / `Kiểm tra email` / `Vi chất phải đủ.` | **R2 (`sentence-case`)** — ALL-CAPS page headings in source strings |
| [format.ts:195](apps/web/lib/format.ts#L195) | ``return `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))} %`;`` (and caller at [period.ts:258](apps/web/lib/period.ts#L258)) | ``return `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))}%`;`` (`"50%"`, `"+18%"`, `"−12%"`) | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: percent is written `"50%"` with no space, including signed `"+18%"`, `"−12%"`) |
| [explore/rich/[nutrient]/page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60) | `${row.pct} % mục tiêu ngày · ${row.basis}` | `${row.pct}% mục tiêu ngày · ${row.basis}` | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: no space before `%`) |
| [food-micros.tsx:10](apps/web/components/foods/food-micros.tsx#L10) | `"< 0,1 %"` / `` `${formatNumber(row.share, { decimals: 1 })} %` `` / `` `${row.pct} %` `` (line 11), `Từ 20 % mục tiêu ngày mỗi khẩu phần` (line 63), `{r.name} · {r.pct} %` (line 70) | `"<0,1%"` / `` `${formatNumber(row.share, { decimals: 1 })}%` `` / `` `${row.pct}%` `` / `Từ 20% mục tiêu ngày mỗi khẩu phần` / `{r.name} · {r.pct}%` | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: no space before `%`) |
| [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27) | `Đạm ${protein} %, tinh bột ${carbs} %, béo ${fat} % của kcal trung bình` / `{row.share} %` (line 182) / `Đạm trung bình ${proteinPct} % mục tiêu` (line 250) | `Đạm ${protein}%, tinh bột ${carbs}%, béo ${fat}% của kcal trung bình` / `{formatNumber(row.share)}%` / `Đạm trung bình ${proteinPct}% mục tiêu` | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: no space before `%`) |
| [micros-tab.tsx:51](apps/web/components/overview/micros-tab.tsx#L51) | `formatPercent(row.percentage)` / `${row.percentage} % mục tiêu` (line 54) / `Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10 % mục tiêu.` (line 63) | `formatPercent(row.percentage)` (`50%`) / `${row.percentage}% mục tiêu` / `Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10% mục tiêu.` | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: no space before `%`) |
| [target-rows.ts:87](apps/web/components/settings/target-rows.ts#L87) | `detail: "50 % mục tiêu canxi"` | `detail: "50% mục tiêu canxi"` | **R3 (`vn-numbers`)** — **Decided: 50%** (Hao 13/10: no space before `%`) |
| [foods/[id]/page.tsx:83](apps/web/app/foods/[id]/page.tsx#L83) | `portionLabel = selectedMeasure?.label ?? \`${gramsInput} g\`` (also line 204) | `portionLabel = selectedMeasure?.label ?? \`${formatAmount(grams, "g")} g\`` | **R3 (`vn-numbers`)** — Raw `gramsInput` string bypasses Vietnamese number formatting (`1000 g` instead of `1.000 g`, `2.5 g` instead of `2,5 g`) |
| [foods/new/page.tsx:114](apps/web/app/foods/new/page.tsx#L114) | `` `${parsedSize} ${servingUnit}` `` | `` `${formatAmount(parsedSize, servingUnit)} ${servingUnit}` `` | **R3 (`vn-numbers`)** — Interpolates raw JavaScript number `parsedSize` instead of `formatAmount` |
| [entry-editor.tsx:72](apps/web/components/foods/entry-editor.tsx#L72) | `` `${e.target.value} g` `` | `` `${formatAmount(Number(e.target.value) \|\| 0, "g")} g` `` | **R3 (`vn-numbers`)** — Saved portion label bypasses `formatAmount` |
| [portion-panel.tsx:153](apps/web/components/ui/portion-panel.tsx#L153) | `` `${gramsInput} g` `` (and line 220 `Vi chất trong {gramsInput} g:`) | `` `${formatAmount(grams, "g")} g` `` / `Vi chất trong {formatAmount(grams, "g")} g:` | **R3 (`vn-numbers`)** — Displays raw `gramsInput` string directly |
| [diary-edits.ts:149](apps/web/lib/diary-edits.ts#L149) | `` `${edit.grams} g` `` (also lines 294, 302) | `` `${formatAmount(edit.grams, "g")} g` `` | **R3 (`vn-numbers`)** — Interpolates raw `grams` number without `formatAmount` |
| [copy-yesterday-sheet.tsx:32](apps/web/components/copy-yesterday-sheet.tsx#L32) | `${getWeekdayName(yesterday.date)}, ${dd}/${mm} · ${formatNumber(yesterday.calories)} kcal` (e.g. `"Thứ Bảy, 10/10"`) | `${formatDayLabel(yesterday.date, now)} · ${formatNumber(yesterday.calories)} kcal` (e.g. `"Hôm qua 10/10"` with no comma) | **R4 (`vn-dates`)** — Includes a comma after weekday and does not use `"Hôm qua dd/mm"` |
| [format.ts:176](apps/web/lib/format.ts#L176) | ``return `${weekday}, ${parts.day}/${parts.month}/${parts.year}`;`` (e.g. `"Thứ Bảy, 10/10/2026"`) | ``return `${weekday} ${parts.day}/${parts.month}`;`` | **R4 (`vn-dates`)** — `formatDesktopDate` adds a comma and `/yyyy`, diverging from `"Thứ Hai 05/10"` |
| [calendar-sheet.tsx:53](apps/web/components/calendar-sheet.tsx#L53) | `Tháng {Number(m)}, {month.slice(0, 4)}` (e.g. `"Tháng 10, 2026"`) | `Tháng {Number(m)}/{month.slice(0, 4)}` | **R4 (`vn-dates`)** — Uses English-style comma `"Tháng 10, 2026"` |
| [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95) | `Lưu thành Bữa của tôi` | `Lưu thành Bữa ăn của tôi` | **R5 (`one-term`)** — Fixed term decided by Hao (13/10): `"Bữa ăn của tôi"` |
| [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196) | `Carb` | `Tinh bột` | **R5 (`one-term`)** — Mixes `"Carb"` and `"Tinh bột"` across screens (`foods/new`, `overview`, `settings/targets`, `micros` use `"Tinh bột"`) |
| [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193) | `Carb` | `Tinh bột` | **R5 (`one-term`)** — Uses `"Carb"` instead of `"Tinh bột"` |
| [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) | `${formatAmount(carbs, "g")} g carb` | `${formatAmount(carbs, "g")} g tinh bột` | **R5 (`one-term`)** — Uses `"g carb"` in food row subtitles while the rest of the app uses `"Tinh bột"` |
| [nutrients.ts:36](apps/web/lib/nutrients.ts#L36) | `Tinh bột tổng` (`carbs`) & `Carb ròng` (`net_carbs`, line 37) & `Tinh bột (starch)` (`starch`, line 41) | `Tinh bột` & `Tinh bột hấp thu` & `Tinh bột phức` | **R5 (`one-term`)** & **R1 (`no-english`)** — Mixes `"Tinh bột tổng"`, `"Carb ròng"`, and English `"(starch)"` |
| [training.ts:165](apps/web/lib/training.ts#L165) | `label: "Carb nhanh"` | `label: "Tinh bột nhanh"` | **R5 (`one-term`)** — Uses `"Carb"` in the intra-workout checklist |
| [training-tip-banner.tsx:16](apps/web/components/training/training-tip-banner.tsx#L16) | `Nhấp carb nhẹ theo từng set ở ngưỡng nặng. Nặng mới đốt đường.` | `Nhấp tinh bột nhẹ theo từng hiệp ở ngưỡng nặng.` | **R5 (`one-term`)** & **R1 (`no-english`)** — Mixes `"carb"`, English `"set"`, and `"đường"` |
| [micros/page.tsx:30](apps/web/app/micros/page.tsx#L30) | `Chất béo` (also line 221 and [nutrients.ts:46](apps/web/lib/nutrients.ts#L46)) | `Béo` (or unify `"Chất béo"` across all macro labels) | **R5 (`one-term`)** — `overview`, `settings/targets`, `foods/[id]`, `foods/new`, and `entry-editor` use `"Béo"`, whereas `micros` and `nutrients.ts` use `"Chất béo"` |
| [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7) | `Theo dõi đầy đủ vi chất, không chỉ calo` | `Theo dõi đầy đủ vi chất, không chỉ năng lượng (kcal)` | **R5 (`one-term`)** — Only `/signup` uses `"calo"`, while the rest of the app uses `"Năng lượng"` or `"kcal"` |
| [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) | `Ưa thích` | `Yêu thích` | **R5 (`one-term`)** — Uses `"Ưa thích"` while the rest of the app uses `"Yêu thích"` |
| [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) | `Tùy chỉnh` (grave mark on `u`: `ù`) | `Tuỳ chỉnh` (grave mark on `y`: `ỳ`, matching `Tuỳ chọn` at `diary-screen.tsx:292` and `Xoá`/`Huỷ`) | **R5 (`one-term`)** — Inconsistent tone-mark placement (`Tùy` vs `Tuỳ`) |
| [micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37) | `Chưa có số liệu trong kỳ này` / `chưa có số liệu` (lines 54, 64) | `Chưa có dữ liệu trong kỳ này` / `chưa có dữ liệu` | **R5 (`one-term`)** — `/micros` and `food-micros.tsx` use `"chưa có dữ liệu"`, while `/trends/micros` uses `"chưa có số liệu"` |
| [foods/new/page.tsx:214](apps/web/app/foods/new/page.tsx#L214) | `Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa biết, không phải 0.` | `Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.` | **R5 (`one-term`)** — Uses `"chưa biết"` instead of `"chưa có dữ liệu"` |
| [target-rows.ts:26](apps/web/components/settings/target-rows.ts#L26) | `Folate (B9)` (along with `Folate (B9)` at [sample-day.ts:441](apps/web/lib/mock/sample-day.ts#L441) and `Natri (muối)` at [sample-day.ts:238](apps/web/lib/mock/sample-day.ts#L238)) | `Vitamin B9` & `Natri` (matching [nutrients.ts:78](apps/web/lib/nutrients.ts#L78) and [nutrients.ts:95](apps/web/lib/nutrients.ts#L95)) | **R5 (`one-term`)** — Nutrient names diverge from the canonical catalog in `lib/nutrients.ts` |
| [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) | `Ghi {getMealSlotNameVi(next).toLowerCase()}` (e.g. `"Ghi bữa tối"`) | `Thêm vào {getMealSlotNameVi(next).toLowerCase()}` | **R6 (`same-verb`)** — Navigation and `/add` use `"Thêm"`, whereas the Overview banner uses `"Ghi bữa..."` |
| [micros/page.tsx:285](apps/web/app/micros/page.tsx#L285) | `Bắt đầu ghi món để đo lường` / `Chưa ghi món nào hôm nay` (line 302) / `+ Ghi món ngay` (line 310) | `Thêm món để xem vi chất` / `Chưa có món hôm nay` / `+ Thêm món` | **R6 (`same-verb`)** — Uses `"+ Ghi món ngay"` whereas navigation uses `"Thêm món"` |
| [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) | `Bắt đầu ghi bữa ăn` (also line 277) | `Bắt đầu thêm món` | **R6 (`same-verb`)** — Uses `"ghi bữa ăn"` instead of `"thêm món"` |
| [entry/[id]/page.tsx:44](apps/web/app/entry/[id]/page.tsx#L44) | `<Link href="/diary"...>Về Tổng quan</Link>` | `<Link href="/diary"...>Về Nhật ký</Link>` | **R6 (`same-verb`)** & **R8 (`natural-vi`)** — Button label says `"Về Tổng quan"` while `href="/diary"` navigates to **Diary** |
| [micros/[nutrient]/page.tsx:79](apps/web/app/micros/[nutrient]/page.tsx#L79) | `Quay lại Vi chất` | `Về Vi chất` | **R6 (`same-verb`)** — All other not-found states (`error.tsx`, `not-found.tsx`, `foods/[id]`, `micros`) use `"Về <Trang>"`, whereas `micros/[nutrient]` uses `"Quay lại Vi chất"` |
| [profile-cards.tsx:206](apps/web/components/settings/profile-cards.tsx#L206) | `Cài như ứng dụng` (opens `/install`, which is titled `"Thêm vào màn hình chính"`) | `Thêm vào màn hình chính` | **R6 (`same-verb`)** — Row label in Profile differs from the destination `/install` screen title |
| [paywall/page.tsx:16](apps/web/app/paywall/page.tsx#L16) | `[GIÁ/THÁNG]` / `[GIÁ/NĂM]` (line 17) / `Tiết kiệm [X]%` (line 17) / `Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN] · huỷ bất cứ lúc nào` (line 135) | Replace bracketed placeholders with real values or hide unconfigured billing details | **R8 (`natural-vi`)** — Literal `[...]` placeholders rendered directly to end users |
| [micros/page.tsx:304](apps/web/app/micros/page.tsx#L304) | `Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.` | `Thêm món vào nhật ký để theo dõi 22 vi chất mỗi ngày.` | **R8 (`natural-vi`)** — Stiff `"ghi nhận món ăn"` phrasing; `"58 chỉ số vi chất"` contradicts `"22 vi chất"` in `layout.tsx:23`, `paywall/page.tsx:144`, and `day-totals.ts` |
| [energy-tab.tsx:77](apps/web/components/overview/energy-tab.tsx#L77) | `trong mục tiêu hoặc trên` (and line 201 `Trong mục tiêu hoặc trên`) | `đạt mục tiêu` / `Đạt mục tiêu` | **R8 (`natural-vi`)** — Word-for-word calque of `"in target or above"`, unnatural in Vietnamese |
| [contributing-foods.tsx:15](apps/web/components/nutrient-detail/contributing-foods.tsx#L15) | `Chưa có món nào có chất này hôm nay.` | `Chưa có món nào có chất này.` | **R8 (`natural-vi`)** — When viewing a past date via `?date=`, the heading at `micros/[nutrient]/page.tsx:153` switches to `"Đã có từ món ăn của ngày này"`, but the empty state hardcodes `"hôm nay"` |
| [meal-switcher.tsx:23](apps/web/components/meal-switcher.tsx#L23) | `defaultHint = "Mặc định theo giờ: 14:05 → Trước tập"` | `defaultHint = "Tự chọn theo giờ trong ngày"` | **R8 (`natural-vi`)** — Hardcoded sample time `"14:05 → Trước tập"` is inaccurate when `MealSwitcher` is rendered without a custom `defaultHint` |

---

## 3. Glossary of Preferred Terms & Variants Found

The table below lists each concept, its preferred term (or decided term), all variants found in the current codebase with `file:line` references, and items that require **Hao's decision**.

| Concept | Preferred Term | Variants Found & Locations (`file:line`) | Status / Decision |
|---|---|---|---|
| **Saved meals** | **`Bữa ăn của tôi`** | • **`Bữa của tôi`** *(divergent)*: [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95) (`"Lưu thành Bữa của tôi"`) | **Decided by Hao (13/10):** `"Bữa ăn của tôi"` (`cc2-12` is renaming `"Bữa của tôi"` at [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95)). |
| **Percent formatting** | **`50%`**, **`+18%`**, **`−12%`** *(no space)* | • **`50%`** *(no space)*: [micros/page.tsx:533](apps/web/app/micros/page.tsx#L533) (`"<50%"`, `"50–79%"`, `"80–99%"`, `"≥100%"`), [paywall/page.tsx:17](apps/web/app/paywall/page.tsx#L17)<br>• **`50 %`** *(with space — divergent)*: [format.ts:195](apps/web/lib/format.ts#L195) (`formatPercent`), [period.ts:258](apps/web/lib/period.ts#L258), [explore/rich/[nutrient]/page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60), [food-micros.tsx:10](apps/web/components/foods/food-micros.tsx#L10), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [micros-tab.tsx:51](apps/web/components/overview/micros-tab.tsx#L51), [target-rows.ts:87](apps/web/components/settings/target-rows.ts#L87) | **Decided: 50%** (Hao 13/10: percent is written `"50%"` with no space, including signed `"+18%"`, `"−12%"`). |
| **Carbohydrate** | **`Tinh bột`** | • **`Tinh bột`**: [foods/new/page.tsx:243](apps/web/app/foods/new/page.tsx#L243), [micros/page.tsx:31](apps/web/app/micros/page.tsx#L31), [micros/page.tsx:222](apps/web/app/micros/page.tsx#L222), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [energy-tab.tsx:142](apps/web/components/overview/energy-tab.tsx#L142), [target-rows.ts:70](apps/web/components/settings/target-rows.ts#L70), [food-categories.ts:25](apps/web/lib/food-categories.ts#L25), [period.ts:170](apps/web/lib/period.ts#L170), [sample-day.ts:160](apps/web/lib/mock/sample-day.ts#L160)<br>• **`Carb`**: [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196), [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193), [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) (`"g carb"`), [training.ts:165](apps/web/lib/training.ts#L165) (`"Carb nhanh"`), [training-tip-banner.tsx:16](apps/web/components/training/training-tip-banner.tsx#L16)<br>• **`Tinh bột tổng`** / **`Carb ròng`** / **`Tinh bột (starch)`**: [nutrients.ts:36](apps/web/lib/nutrients.ts#L36), [nutrients.ts:37](apps/web/lib/nutrients.ts#L37), [nutrients.ts:41](apps/web/lib/nutrients.ts#L41) | **Needs Hao's decision:** Use **`Tinh bột`** everywhere (including food-row subtitle `g tinh bột` and the 4-column macro grid on `/foods/[id]`), or allow **`Carb`** in narrow cells? |
| **Lipid / Fat** | **`Béo`** *(3–4 column grids)* / **`Chất béo`** *(full name)* | • **`Béo`**: [foods/[id]/page.tsx:198](apps/web/app/foods/[id]/page.tsx#L198), [foods/new/page.tsx:255](apps/web/app/foods/new/page.tsx#L255), [entry-editor.tsx:122](apps/web/components/foods/entry-editor.tsx#L122), [portion-panel.tsx:195](apps/web/components/ui/portion-panel.tsx#L195), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [energy-tab.tsx:146](apps/web/components/overview/energy-tab.tsx#L146), [target-rows.ts:66](apps/web/components/settings/target-rows.ts#L66), [onboarding.ts:128](apps/web/lib/onboarding.ts#L128), [period.ts:171](apps/web/lib/period.ts#L171)<br>• **`Chất béo`**: [micros/page.tsx:30](apps/web/app/micros/page.tsx#L30), [micros/page.tsx:221](apps/web/app/micros/page.tsx#L221), [nutrients.ts:46](apps/web/lib/nutrients.ts#L46), [food-categories.ts:27](apps/web/lib/food-categories.ts#L27) | **Needs Hao's decision:** Standardize on one term (**`Béo`** or **`Chất béo`**) across all screens. |
| **Protein** | **`Đạm`** | • **`Đạm`**: Used consistently across all `app/` and `components/` files ([diary-screen.tsx:58](apps/web/components/diary/diary-screen.tsx#L58), [summary-tab.tsx:95](apps/web/components/overview/summary-tab.tsx#L95), [target-rows.ts:62](apps/web/components/settings/target-rows.ts#L62), [nutrients.ts:59](apps/web/lib/nutrients.ts#L59), etc.) | Consistent (`Đạm`). |
| **Energy / Calories** | **`Năng lượng`** *(label)* / **`kcal`** *(unit)* | • **`Năng lượng`**: [foods/new/page.tsx:219](apps/web/app/foods/new/page.tsx#L219), [overview-frame.tsx:18](apps/web/components/overview/overview-frame.tsx#L18), [settings/profile/weight/page.tsx:93](apps/web/app/settings/profile/weight/page.tsx#L93), [calorie-dial.tsx:42](apps/web/components/ui/calorie-dial.tsx#L42), [nutrients.ts:28](apps/web/lib/nutrients.ts#L28)<br>• **`Kcal`** *(used as a noun label)*: [summary-tab.tsx:89](apps/web/components/overview/summary-tab.tsx#L89), [energy-tab.tsx:63](apps/web/components/overview/energy-tab.tsx#L63), [diary-screen.tsx:369](apps/web/components/diary/diary-screen.tsx#L369), [target-rows.ts:58](apps/web/components/settings/target-rows.ts#L58)<br>• **`calo`**: [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7) | **Needs Hao's decision:** Replace **`calo`** at [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7); confirm whether **`Kcal`** is acceptable as a short column/card heading for **`Năng lượng`**. |
| **User-created foods** | **`Món của tôi`** | • **`Món của tôi`**: [explore-sections.tsx:47](apps/web/components/explore/explore-sections.tsx#L47), [food-categories.ts:34](apps/web/lib/food-categories.ts#L34)<br>• **`Của tôi`** *(badge)*: [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120), [explore-sections.tsx:49](apps/web/components/explore/explore-sections.tsx#L49), [food-meta.ts:22](apps/web/lib/food-meta.ts#L22)<br>• **`món tự tạo`**: [delete-account/page.tsx:68](apps/web/app/settings/delete-account/page.tsx#L68) | **Needs Hao's decision:** Unify on **`Món của tôi`** for both section headings and source badges (or keep short badge `"Của tôi"`), and map raw `"usda"`, `"vn-fct"`, `"custom"` source codes to Vietnamese labels. |
| **Favourites** | **`Yêu thích`** / **`Món yêu thích`** | • **`Yêu thích`**: [explore-sections.tsx:41](apps/web/components/explore/explore-sections.tsx#L41), [foods/[id]/page.tsx:127](apps/web/app/foods/[id]/page.tsx#L127)<br>• **`Ưa thích`**: [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) | Replace `"Ưa thích"` at [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) with **`Yêu thích`**. |
| **Adding food to a meal** | **`Thêm`** / **`Thêm món`** | • **`Thêm món`** / **`Thêm vào {bữa}`**: [bottom-nav.tsx:64](apps/web/components/ui/bottom-nav.tsx#L64), [desktop-sidebar.tsx:29](apps/web/components/ui/desktop-sidebar.tsx#L29), [add/page.tsx:225](apps/web/app/add/page.tsx#L225), [add/page.tsx:330](apps/web/app/add/page.tsx#L330), [foods/[id]/page.tsx:113](apps/web/app/foods/[id]/page.tsx#L113), [diary-screen.tsx:283](apps/web/components/diary/diary-screen.tsx#L283), [portion-panel.tsx:213](apps/web/components/ui/portion-panel.tsx#L213)<br>• **`Ghi món`** / **`Ghi bữa`**: [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) (`"Ghi bữa tối"`), [micros/page.tsx:285](apps/web/app/micros/page.tsx#L285), [micros/page.tsx:310](apps/web/app/micros/page.tsx#L310) (`"+ Ghi món ngay"`), [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) (`"Bắt đầu ghi bữa ăn"`) | **Needs Hao's decision:** Use **`Thêm món`** / **`Thêm vào {bữa}`** for all action buttons (CTAs), and reserve **`đã ghi`** for past/completed state (`"5 ngày đã ghi"`). |
| **Tone-mark placement (`oá`, `uỷ`, `uỳ`)** | **`Xoá`** · **`Huỷ`** · **`Tuỳ`** | • **`Xoá`** & **`Huỷ`**: 100% consistent across the codebase.<br>• **`Tuỳ chọn`** *(mark on y)*: [diary-screen.tsx:292](apps/web/components/diary/diary-screen.tsx#L292)<br>• **`Tùy chỉnh`** *(mark on u — divergent)*: [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) | Change [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) to **`Tuỳ chỉnh`** to match `Xoá`, `Huỷ`, and `Tuỳ chọn`. |
| **Missing nutrient data** | **`Chưa có dữ liệu`** | • **`Chưa có dữ liệu`** / **`chưa có dữ liệu`**: [micros/page.tsx:680](apps/web/app/micros/page.tsx#L680), [food-micros.tsx:42](apps/web/components/foods/food-micros.tsx#L42), [food-micros.tsx:100](apps/web/components/foods/food-micros.tsx#L100)<br>• **`Chưa có số liệu`** / **`chưa có số liệu`**: [micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37), [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54), [micros-tab.tsx:64](apps/web/components/overview/micros-tab.tsx#L64)<br>• **`chưa biết`**: [foods/new/page.tsx:214](apps/web/app/foods/new/page.tsx#L214) | Standardize on **`chưa có dữ liệu`** across `/trends/micros`, `/micros`, `/foods/[id]`, and `/foods/new`. |
| **Sign-in magic link** | **`Liên kết đăng nhập`** | • **`link đăng nhập`** / **`link`**: [signin/page.tsx:25](apps/web/app/signin/page.tsx#L25), [signin/check-email/page.tsx:58](apps/web/app/signin/check-email/page.tsx#L58), [signin/expired/page.tsx:29](apps/web/app/signin/expired/page.tsx#L29), [signup/page.tsx:53](apps/web/app/signup/page.tsx#L53), [magic-link-form.tsx:35](apps/web/components/onboarding/magic-link-form.tsx#L35), [onboarding.ts:140](apps/web/lib/onboarding.ts#L140), [not-found.tsx:20](apps/web/app/not-found.tsx#L20) | **Needs Hao's decision:** Replace **`link`** with **`liên kết`** (for email magic links) and **`đường dẫn`** (for page URLs), or keep **`link`** in the sign-in flow? |
| **Serving vs Weight** | **`Khẩu phần`** *(serving unit)* / **`Khối lượng (g)`** *(grams)* | • **`Khẩu phần`**: [foods/[id]/page.tsx:150](apps/web/app/foods/[id]/page.tsx#L150), [foods/new/page.tsx:166](apps/web/app/foods/new/page.tsx#L166), [entry-editor.tsx:77](apps/web/components/foods/entry-editor.tsx#L77)<br>• **`Khối lượng theo gam`**: [foods/[id]/page.tsx:179](apps/web/app/foods/[id]/page.tsx#L179)<br>• **`Khối lượng`** + `aria-label="Số gam"`: [entry-editor.tsx:56](apps/web/components/foods/entry-editor.tsx#L56), [portion-panel.tsx:145](apps/web/components/ui/portion-panel.tsx#L145) | Unify on **`Khối lượng (g)`** and `aria-label="Khối lượng theo gam"`. |
| **PWA install** | **`Thêm vào màn hình chính`** | • **`Thêm vào màn hình chính`**: [install/page.tsx:17](apps/web/app/install/page.tsx#L17), [install/page.tsx:163](apps/web/app/install/page.tsx#L163)<br>• **`Thêm vào MH chính`**: [install/page.tsx:106](apps/web/app/install/page.tsx#L106)<br>• **`Cài như ứng dụng`**: [profile-cards.tsx:206](apps/web/components/settings/profile-cards.tsx#L206) | Standardize on **`Thêm vào màn hình chính`** (without `MH` abbreviation). |

---

## 4. Fix list for the coder

Every confirmed row from Section 2 is grouped by file below so a single coder can apply the fixes in one pass. Rows that depend on a terminology or product decision from Hao are marked **`Hao`**; rows already decided by Hao on 13/10 (`"Bữa ăn của tôi"` and `"50%"`) are marked **`Decided`**.

### `apps/web/app/(dashboard)/training/page.tsx`
- [training/page.tsx:154](apps/web/app/(dashboard)/training/page.tsx#L154) & [training/page.tsx:218](apps/web/app/(dashboard)/training/page.tsx#L218) (R2): `title="NGÀY TẬP"` → `title="Ngày tập"`

### `apps/web/app/admin/review/page.tsx`
- [admin/review/page.tsx:51](apps/web/app/admin/review/page.tsx#L51) (R1): `Admin RBAC Guarded` → `Khu vực quản trị`
- [admin/review/page.tsx:54](apps/web/app/admin/review/page.tsx#L54) (R1, R7): `Coach Vault Review` → `Duyệt nội dung thực đơn`
- [admin/review/page.tsx:57](apps/web/app/admin/review/page.tsx#L57) (R1): `Review and publish markdown meal plans synchronized from GitHub repository` → `Xem và duyệt các bản nháp thực đơn đồng bộ từ kho lưu trữ.`
- [admin/review/page.tsx:62](apps/web/app/admin/review/page.tsx#L62) & [admin/review/page.tsx:63](apps/web/app/admin/review/page.tsx#L63) (R1): `aria-label="Filter drafts"` + `all` / `draft` / `published` / `rejected` → `aria-label="Lọc bản nháp"` + `Tất cả` / `Bản nháp` / `Đã đăng` / `Từ chối`
- [admin/review/page.tsx:122](apps/web/app/admin/review/page.tsx#L122), [admin/review/page.tsx:129](apps/web/app/admin/review/page.tsx#L129), [admin/review/page.tsx:135](apps/web/app/admin/review/page.tsx#L135) (R1): `Approve` / `Reject` / `Status: {draft.status}` → `Duyệt` / `Từ chối` / `Trạng thái: {statusVi}`

### `apps/web/app/dev/ui/page.tsx`
- [dev/ui/page.tsx:48](apps/web/app/dev/ui/page.tsx#L48), [dev/ui/page.tsx:91](apps/web/app/dev/ui/page.tsx#L91), [dev/ui/page.tsx:129](apps/web/app/dev/ui/page.tsx#L129), [dev/ui/page.tsx:153](apps/web/app/dev/ui/page.tsx#L153), [dev/ui/page.tsx:161](apps/web/app/dev/ui/page.tsx#L161), [dev/ui/page.tsx:234](apps/web/app/dev/ui/page.tsx#L234) (R1): `1. AppHeader — Variant "daily" (Today / Vi chất)` / `Light tone` / `Dark tone` / `Primary` · `Secondary` · `Destructive` / `Chip (44px tap targets)` / `Mở Sheet Demo` → Translate showcase labels into Vietnamese
- [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) (R5): `Ưa thích` → `Yêu thích`

### `apps/web/app/entry/[id]/page.tsx`
- [entry/[id]/page.tsx:44](apps/web/app/entry/[id]/page.tsx#L44) (R6, R8): `<Link href="/diary"...>Về Tổng quan</Link>` → `<Link href="/diary"...>Về Nhật ký</Link>`

### `apps/web/app/explore/rich/[nutrient]/page.tsx`
- [explore/rich/[nutrient]/page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60) (R3 — **Decided: 50%**): `${row.pct} % mục tiêu ngày · ${row.basis}` → `${row.pct}% mục tiêu ngày · ${row.basis}`

### `apps/web/app/foods/[id]/page.tsx`
- [foods/[id]/page.tsx:65](apps/web/app/foods/[id]/page.tsx#L65) (R2, R6): `Đã bỏ khỏi Yêu thích` / `Đã lưu vào Yêu thích` → `Đã bỏ khỏi yêu thích` / `Đã thêm vào yêu thích`
- [foods/[id]/page.tsx:83](apps/web/app/foods/[id]/page.tsx#L83) & [foods/[id]/page.tsx:204](apps/web/app/foods/[id]/page.tsx#L204) (R3): `` `${gramsInput} g` `` → `` `${formatAmount(grams, "g")} g` ``
- [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120) (R1, R5 — **Hao**): `${food.source === "user" ? "Của tôi" : food.source} · ${grams} g mỗi khẩu phần` → Map `food.source` to Vietnamese labels (`"Món của tôi"`, `"Viện Dinh dưỡng VN"`, `"USDA"`)
- [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) (R5): `Tùy chỉnh` → `Tuỳ chỉnh`
- [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196) (R5 — **Hao**): `Carb` → `Tinh bột`

### `apps/web/app/foods/new/page.tsx`
- [foods/new/page.tsx:114](apps/web/app/foods/new/page.tsx#L114) (R3): `` `${parsedSize} ${servingUnit}` `` → `` `${formatAmount(parsedSize, servingUnit)} ${servingUnit}` ``
- [foods/new/page.tsx:136](apps/web/app/foods/new/page.tsx#L136) (R2): `title="TẠO MÓN MỚI"` → `title="Tạo món mới"`
- [foods/new/page.tsx:214](apps/web/app/foods/new/page.tsx#L214) (R5): `Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa biết, không phải 0.` → `Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.`

### `apps/web/app/install/page.tsx`
- [install/page.tsx:17](apps/web/app/install/page.tsx#L17) (R2): `title="THÊM VÀO MÀN HÌNH CHÍNH"` → `title="Thêm vào màn hình chính"`
- [install/page.tsx:92](apps/web/app/install/page.tsx#L92), [install/page.tsx:106](apps/web/app/install/page.tsx#L106), [install/page.tsx:163](apps/web/app/install/page.tsx#L163) (R2, R5): `Chạm nút Chia sẻ` / `Chọn “Thêm vào MH chính”` / `Chọn “Thêm vào Màn hình chính” hoặc “Cài đặt ứng dụng”` → `Chạm nút chia sẻ` / `Chọn “Thêm vào màn hình chính”`

### `apps/web/app/layout.tsx`
- [layout.tsx:22](apps/web/app/layout.tsx#L22) (R2): `H1T MICRO | Dinh dưỡng & Vi chất Chuyên sâu` → `H1T MICRO | Dinh dưỡng & vi chất chuyên sâu`

### `apps/web/app/micros/page.tsx`
- [micros/page.tsx:30](apps/web/app/micros/page.tsx#L30) & [micros/page.tsx:221](apps/web/app/micros/page.tsx#L221) (R5 — **Hao**): `Chất béo` → `Béo` (or unify `"Chất béo"` across all macro labels)
- [micros/page.tsx:277](apps/web/app/micros/page.tsx#L277), [micros/page.tsx:297](apps/web/app/micros/page.tsx#L297), [micros/page.tsx:335](apps/web/app/micros/page.tsx#L335), [micros/page.tsx:452](apps/web/app/micros/page.tsx#L452) (R2): `title="VI CHẤT"` → `title="Vi chất"`
- [micros/page.tsx:285](apps/web/app/micros/page.tsx#L285), [micros/page.tsx:302](apps/web/app/micros/page.tsx#L302), [micros/page.tsx:310](apps/web/app/micros/page.tsx#L310) (R6 — **Hao**): `Bắt đầu ghi món để đo lường` / `Chưa ghi món nào hôm nay` / `+ Ghi món ngay` → `Thêm món để xem vi chất` / `Chưa có món hôm nay` / `+ Thêm món`
- [micros/page.tsx:304](apps/web/app/micros/page.tsx#L304) (R8): `Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.` → `Thêm món vào nhật ký để theo dõi 22 vi chất mỗi ngày.`

### `apps/web/app/micros/[nutrient]/page.tsx`
- [micros/[nutrient]/page.tsx:79](apps/web/app/micros/[nutrient]/page.tsx#L79) (R6): `Quay lại Vi chất` → `Về Vi chất`

### `apps/web/app/not-found.tsx`
- [not-found.tsx:20](apps/web/app/not-found.tsx#L20) (R1 — **Hao**): `Link có thể đã cũ hoặc bị gõ sai.` → `Đường dẫn có thể đã cũ hoặc bị gõ sai.`

### `apps/web/app/paywall/page.tsx`
- [paywall/page.tsx:16](apps/web/app/paywall/page.tsx#L16), [paywall/page.tsx:17](apps/web/app/paywall/page.tsx#L17), [paywall/page.tsx:135](apps/web/app/paywall/page.tsx#L135) (R8 — **Hao**): `[GIÁ/THÁNG]` / `[GIÁ/NĂM]` / `Tiết kiệm [X]%` / `Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN] · huỷ bất cứ lúc nào` → Replace bracketed placeholders with real values or hide unconfigured billing details
- [paywall/page.tsx:23](apps/web/app/paywall/page.tsx#L23) (R7): `Món & công thức riêng của Coach` → `Thư viện món Việt & món tự tạo không giới hạn`
- [paywall/page.tsx:37](apps/web/app/paywall/page.tsx#L37) (R7): `Ăn theo Coach, không phải đoán` → `Theo dõi sát mục tiêu, không phải đoán`
- [paywall/page.tsx:144](apps/web/app/paywall/page.tsx#L144) (R2): `Gói Miễn phí vẫn ghi đủ 22 vi chất.` → `Gói miễn phí vẫn ghi đủ 22 vi chất.`

### `apps/web/app/settings/delete-account/page.tsx`
- [settings/delete-account/page.tsx:47](apps/web/app/settings/delete-account/page.tsx#L47) (R2): `title="XOÁ TÀI KHOẢN"` → `title="Xoá tài khoản"`

### `apps/web/app/settings/language/page.tsx`
- [settings/language/page.tsx:34](apps/web/app/settings/language/page.tsx#L34) (R2): `title="NGÔN NGỮ"` → `title="Ngôn ngữ"`

### `apps/web/app/settings/notifications/page.tsx`
- [settings/notifications/page.tsx:116](apps/web/app/settings/notifications/page.tsx#L116) (R2): `title="NHẮC NHỞ"` → `title="Nhắc nhở"`

### `apps/web/app/settings/profile/weight/page.tsx`
- [settings/profile/weight/page.tsx:120](apps/web/app/settings/profile/weight/page.tsx#L120) (R2): `title="CÂN NẶNG"` → `title="Cân nặng"`

### `apps/web/app/signin/page.tsx`
- [signin/page.tsx:15](apps/web/app/signin/page.tsx#L15) (R2): `CHÀO MỪNG TRỞ LẠI.` → `Chào mừng trở lại.`
- [signin/page.tsx:25](apps/web/app/signin/page.tsx#L25) (R1 — **Hao**): `submitLabel="Gửi link đăng nhập"` → `submitLabel="Gửi liên kết đăng nhập"`

### `apps/web/app/signin/check-email/page.tsx`
- [signin/check-email/page.tsx:54](apps/web/app/signin/check-email/page.tsx#L54) (R2): `KIỂM TRA EMAIL` → `Kiểm tra email`
- [signin/check-email/page.tsx:58](apps/web/app/signin/check-email/page.tsx#L58), [signin/check-email/page.tsx:60](apps/web/app/signin/check-email/page.tsx#L60), [signin/check-email/page.tsx:64](apps/web/app/signin/check-email/page.tsx#L64) (R1 — **Hao**): `Đã gửi link đăng nhập tới {email}.` / `Đã gửi link đăng nhập tới email của bạn.` / `Link có hiệu lực 15 phút.` → `Đã gửi liên kết đăng nhập tới {email}.` / `Đã gửi liên kết đăng nhập tới email của bạn.` / `Liên kết có hiệu lực 15 phút.`
- [signin/check-email/page.tsx:72](apps/web/app/signin/check-email/page.tsx#L72), [signin/check-email/page.tsx:86](apps/web/app/signin/check-email/page.tsx#L86), [signin/check-email/page.tsx:90](apps/web/app/signin/check-email/page.tsx#L90) (R1 — **Hao**): `Mở ứng dụng Mail` / `Mô phỏng mở link (dev)` / `Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo.` → `Mở ứng dụng Thư` / `Mở liên kết thử nghiệm` / `Không thấy email? Kiểm tra mục Thư rác hoặc Quảng cáo.`

### `apps/web/app/signin/expired/page.tsx`
- [signin/expired/page.tsx:29](apps/web/app/signin/expired/page.tsx#L29), [signin/expired/page.tsx:32](apps/web/app/signin/expired/page.tsx#L32), [signin/expired/page.tsx:38](apps/web/app/signin/expired/page.tsx#L38) (R1, R2 — **Hao**): `LINK ĐÃ HẾT HẠN` / `Link đăng nhập chỉ dùng được một lần và trong 15 phút.` / `Gửi link mới` → `Liên kết đã hết hạn` / `Liên kết đăng nhập chỉ dùng được một lần và trong 15 phút.` / `Gửi liên kết mới`

### `apps/web/app/signup/page.tsx`
- [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7) (R5 — **Hao**): `Theo dõi đầy đủ vi chất, không chỉ calo` → `Theo dõi đầy đủ vi chất, không chỉ năng lượng (kcal)`
- [signup/page.tsx:8](apps/web/app/signup/page.tsx#L8) (R7): `Mục tiêu do Coach Lê Hồng Khánh đặt` → `Mục tiêu cá nhân hoá theo ngày tập và ngày nghỉ`
- [signup/page.tsx:21](apps/web/app/signup/page.tsx#L21) & [signup/page.tsx:23](apps/web/app/signup/page.tsx#L23) (R1, R2): `aria-label="H1T MICRO, 1 set là đủ"` / `1 SET LÀ ĐỦ` → `aria-label="H1T MICRO, một hiệp là đủ"` / `Một hiệp là đủ`
- [signup/page.tsx:26](apps/web/app/signup/page.tsx#L26) (R2): `VI CHẤT PHẢI ĐỦ.` → `Vi chất phải đủ.`
- [signup/page.tsx:33](apps/web/app/signup/page.tsx#L33) (R7): `Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.` → `Thêm món mỗi bữa, theo dõi 22 vi chất và bám sát mục tiêu mỗi ngày.`
- [signup/page.tsx:53](apps/web/app/signup/page.tsx#L53) & [signup/page.tsx:59](apps/web/app/signup/page.tsx#L59) (R1 — **Hao**): `submitLabel="Gửi link đăng nhập"` / `Chúng tôi gửi link vào email — không cần mật khẩu.` → `submitLabel="Gửi liên kết đăng nhập"` / `Chúng tôi gửi liên kết vào email — không cần mật khẩu.`

### `apps/web/components/calendar-sheet.tsx`
- [calendar-sheet.tsx:14](apps/web/components/calendar-sheet.tsx#L14) (R7): `over: "vượt mục tiêu"` → `over: "đạt mục tiêu"`
- [calendar-sheet.tsx:53](apps/web/components/calendar-sheet.tsx#L53) (R4): `Tháng {Number(m)}, {month.slice(0, 4)}` → `Tháng {Number(m)}/{month.slice(0, 4)}`

### `apps/web/components/copy-yesterday-sheet.tsx`
- [copy-yesterday-sheet.tsx:32](apps/web/components/copy-yesterday-sheet.tsx#L32) (R4): `${getWeekdayName(yesterday.date)}, ${dd}/${mm} · ${formatNumber(yesterday.calories)} kcal` → `${formatDayLabel(yesterday.date, now)} · ${formatNumber(yesterday.calories)} kcal`

### `apps/web/components/diary/diary-screen.tsx`
- [diary-screen.tsx:364](apps/web/components/diary/diary-screen.tsx#L364) (R2): `còn {formatNumber(remaining)} kcal · Mục tiêu {formatRange(targetMin, targetMax)}` → `Còn {formatNumber(remaining)} kcal · mục tiêu {formatRange(targetMin, targetMax)}`

### `apps/web/components/diary/meal-menu-sheet.tsx`
- [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95) (R5 — **Decided: Bữa ăn của tôi**): `Lưu thành Bữa của tôi` → `Lưu thành Bữa ăn của tôi`

### `apps/web/components/foods/entry-editor.tsx`
- [entry-editor.tsx:72](apps/web/components/foods/entry-editor.tsx#L72) (R3): `` `${e.target.value} g` `` → `` `${formatAmount(Number(e.target.value) || 0, "g")} g` ``

### `apps/web/components/foods/food-micros.tsx`
- [food-micros.tsx:10](apps/web/components/foods/food-micros.tsx#L10), [food-micros.tsx:11](apps/web/components/foods/food-micros.tsx#L11), [food-micros.tsx:63](apps/web/components/foods/food-micros.tsx#L63), [food-micros.tsx:70](apps/web/components/foods/food-micros.tsx#L70) (R3 — **Decided: 50%**): `"< 0,1 %"` / `` `${formatNumber(row.share, { decimals: 1 })} %` `` / `` `${row.pct} %` `` / `Từ 20 % mục tiêu ngày mỗi khẩu phần` / `{r.name} · {r.pct} %` → `"<0,1%"` / `` `${formatNumber(row.share, { decimals: 1 })}%` `` / `` `${row.pct}%` `` / `Từ 20% mục tiêu ngày mỗi khẩu phần` / `{r.name} · {r.pct}%`

### `apps/web/components/meal-switcher.tsx`
- [meal-switcher.tsx:23](apps/web/components/meal-switcher.tsx#L23) (R8): `defaultHint = "Mặc định theo giờ: 14:05 → Trước tập"` → `defaultHint = "Tự chọn theo giờ trong ngày"`

### `apps/web/components/nutrient-detail/contributing-foods.tsx`
- [contributing-foods.tsx:15](apps/web/components/nutrient-detail/contributing-foods.tsx#L15) (R8): `Chưa có món nào có chất này hôm nay.` → `Chưa có món nào có chất này.`

### `apps/web/components/onboarding/magic-link-form.tsx`
- [magic-link-form.tsx:35](apps/web/components/onboarding/magic-link-form.tsx#L35) (R1 — **Hao**): `Chưa gửi được link. Thử lại sau ít phút.` → `Chưa gửi được liên kết. Thử lại sau ít phút.`

### `apps/web/components/onboarding/setup-form.tsx`
- [setup-form.tsx:110](apps/web/components/onboarding/setup-form.tsx#L110) (R2): `title={step === 1 ? "VỀ BẠN" : "MỤC TIÊU"}` → `title={step === 1 ? "Về bạn" : "Mục tiêu"}`
- [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) & [setup-form.tsx:277](apps/web/components/onboarding/setup-form.tsx#L277) (R6 — **Hao**): `Bắt đầu ghi bữa ăn` → `Bắt đầu thêm món`

### `apps/web/components/overview/energy-tab.tsx`
- [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [energy-tab.tsx:182](apps/web/components/overview/energy-tab.tsx#L182), [energy-tab.tsx:250](apps/web/components/overview/energy-tab.tsx#L250) (R3 — **Decided: 50%**): `Đạm ${protein} %, tinh bột ${carbs} %, béo ${fat} % của kcal trung bình` / `{row.share} %` / `Đạm trung bình ${proteinPct} % mục tiêu` → `Đạm ${protein}%, tinh bột ${carbs}%, béo ${fat}% của kcal trung bình` / `{formatNumber(row.share)}%` / `Đạm trung bình ${proteinPct}% mục tiêu`
- [energy-tab.tsx:77](apps/web/components/overview/energy-tab.tsx#L77) & [energy-tab.tsx:201](apps/web/components/overview/energy-tab.tsx#L201) (R8): `trong mục tiêu hoặc trên` / `Trong mục tiêu hoặc trên` → `đạt mục tiêu` / `Đạt mục tiêu`

### `apps/web/components/overview/micros-tab.tsx`
- [micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37), [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54), [micros-tab.tsx:64](apps/web/components/overview/micros-tab.tsx#L64) (R5): `Chưa có số liệu trong kỳ này` / `chưa có số liệu` → `Chưa có dữ liệu trong kỳ này` / `chưa có dữ liệu`
- [micros-tab.tsx:51](apps/web/components/overview/micros-tab.tsx#L51), [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54), [micros-tab.tsx:63](apps/web/components/overview/micros-tab.tsx#L63) (R3 — **Decided: 50%**): `formatPercent(row.percentage)` / `${row.percentage} % mục tiêu` / `Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10 % mục tiêu.` → `formatPercent(row.percentage)` (`50%`) / `${row.percentage}% mục tiêu` / `Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10% mục tiêu.`

### `apps/web/components/overview/summary-tab.tsx`
- [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) (R6 — **Hao**): `Ghi {getMealSlotNameVi(next).toLowerCase()}` → `Thêm vào {getMealSlotNameVi(next).toLowerCase()}`

### `apps/web/components/settings/profile-cards.tsx`
- [profile-cards.tsx:122](apps/web/components/settings/profile-cards.tsx#L122) (R2): `Chỉ với Nữ · sắt 18 → 28 mg/ngày` → `Chỉ với nữ · sắt 18 → 28 mg/ngày`
- [profile-cards.tsx:206](apps/web/components/settings/profile-cards.tsx#L206) (R6): `Cài như ứng dụng` → `Thêm vào màn hình chính`

### `apps/web/components/settings/target-rows.ts`
- [target-rows.ts:26](apps/web/components/settings/target-rows.ts#L26) (R5): `Folate (B9)` → `Vitamin B9`
- [target-rows.ts:86](apps/web/components/settings/target-rows.ts#L86) (R7): `detail: "Khoảng mục tiêu theo coach"` → `detail: "1.200–1.500 mg mỗi ngày"`
- [target-rows.ts:87](apps/web/components/settings/target-rows.ts#L87) (R3 — **Decided: 50%**): `detail: "50 % mục tiêu canxi"` → `detail: "50% mục tiêu canxi"`

### `apps/web/components/settings/targets-screen.tsx`
- [targets-screen.tsx:36](apps/web/components/settings/targets-screen.tsx#L36) & [targets-screen.tsx:37](apps/web/components/settings/targets-screen.tsx#L37) (R7): `* Chất xơ: tạm thời, chưa có quy tắc của coach.` & `* Khuyến nghị dinh dưỡng Việt Nam 2016 (VN 2016). Đây không phải quy tắc của coach.` → `* Chất xơ: mục tiêu tham khảo theo tổng năng lượng.` & `* Theo bảng khuyến nghị dinh dưỡng cho người Việt Nam (2016).`

### `apps/web/components/training/training-tip-banner.tsx`
- [training-tip-banner.tsx:16](apps/web/components/training/training-tip-banner.tsx#L16) (R1, R5 — **Hao**): `Nhấp carb nhẹ theo từng set ở ngưỡng nặng. Nặng mới đốt đường.` → `Nhấp tinh bột nhẹ theo từng hiệp ở ngưỡng nặng.`

### `apps/web/components/ui/portion-panel.tsx`
- [portion-panel.tsx:153](apps/web/components/ui/portion-panel.tsx#L153) & [portion-panel.tsx:220](apps/web/components/ui/portion-panel.tsx#L220) (R3): `` `${gramsInput} g` `` / `Vi chất trong {gramsInput} g:` → `` `${formatAmount(grams, "g")} g` `` / `Vi chất trong {formatAmount(grams, "g")} g:`
- [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193) (R5 — **Hao**): `Carb` → `Tinh bột`

### `apps/web/lib/diary-edits.ts`
- [diary-edits.ts:149](apps/web/lib/diary-edits.ts#L149), [diary-edits.ts:294](apps/web/lib/diary-edits.ts#L294), [diary-edits.ts:302](apps/web/lib/diary-edits.ts#L302) (R3): `` `${edit.grams} g` `` / `` `${grams} g` `` → `` `${formatAmount(edit.grams, "g")} g` `` / `` `${formatAmount(grams, "g")} g` ``

### `apps/web/lib/food-meta.ts`
- [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) (R5 — **Hao**): `${formatAmount(carbs, "g")} g carb` → `${formatAmount(carbs, "g")} g tinh bột`
- [food-meta.ts:22](apps/web/lib/food-meta.ts#L22) (R1, R5 — **Hao**): `${portion} · ${food.source === "user" ? "Của tôi" : food.source}` → Map `food.source` to Vietnamese labels (`"Món của tôi"`, `"Viện Dinh dưỡng VN"`, `"USDA"`)

### `apps/web/lib/format.ts` & `apps/web/lib/period.ts`
- [format.ts:176](apps/web/lib/format.ts#L176) (R4): ``return `${weekday}, ${parts.day}/${parts.month}/${parts.year}`;`` → ``return `${weekday} ${parts.day}/${parts.month}`;``
- [format.ts:195](apps/web/lib/format.ts#L195) & caller [period.ts:258](apps/web/lib/period.ts#L258) (R3 — **Decided: 50%**): ``return `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))} %`;`` → ``return `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))}%`;`` (`"50%"`, `"+18%"`, `"−12%"`)

### `apps/web/lib/mock/sample-day.ts`
- [sample-day.ts:238](apps/web/lib/mock/sample-day.ts#L238) & [sample-day.ts:441](apps/web/lib/mock/sample-day.ts#L441) (R5): `Natri (muối)` & `Folate (B9)` → `Natri` & `Vitamin B9`

### `apps/web/lib/nutrients.ts`
- [nutrients.ts:36](apps/web/lib/nutrients.ts#L36), [nutrients.ts:37](apps/web/lib/nutrients.ts#L37), [nutrients.ts:41](apps/web/lib/nutrients.ts#L41) (R1, R5 — **Hao**): `Tinh bột tổng` / `Carb ròng` / `Tinh bột (starch)` → `Tinh bột` / `Tinh bột hấp thu` / `Tinh bột phức`
- [nutrients.ts:46](apps/web/lib/nutrients.ts#L46) (R5 — **Hao**): `Chất béo` → `Béo` (or unify `"Chất béo"` across all macro labels)

### `apps/web/lib/onboarding.ts`
- [onboarding.ts:140](apps/web/lib/onboarding.ts#L140) & [onboarding.ts:141](apps/web/lib/onboarding.ts#L141) (R1 — **Hao**): `Gửi lại link (sau ${formatNumber(secondsLeft)} giây)` / `"Gửi lại link"` → `Gửi lại liên kết (sau ${formatNumber(secondsLeft)} giây)` / `"Gửi lại liên kết"`

### `apps/web/lib/training.ts`
- [training.ts:165](apps/web/lib/training.ts#L165) (R5 — **Hao**): `label: "Carb nhanh"` → `label: "Tinh bột nhanh"`
