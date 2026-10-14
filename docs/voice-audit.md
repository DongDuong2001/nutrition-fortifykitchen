# Kiểm toán giọng văn & chuỗi tiếng Việt (`ag-16` — Voice Audit)

Báo cáo rà soát toàn bộ **688** chuỗi tiếng Việt hiển thị cho người dùng (nhãn, nút bấm, tiêu đề, trạng thái trống, thông báo nổi, lỗi, xác nhận, gợi ý, nhận xét, thiết lập ban đầu, xác thực, gói Pro, nhắc nhở, `aria-label`) trong `apps/web/{app,components,lib,hooks}`.

---

## 1. Từ điển động từ & thuật ngữ chuẩn (Verb & Term Glossary)

Mỗi hành động dùng **một động từ duy nhất** xuyên suốt ứng dụng:

| Hành động / Khái niệm | Từ chuẩn sử dụng | Không dùng |
|---|---|---|
| Thêm món / bữa ăn vào nhật ký | **Thêm** (`Thêm món`, `Thêm vào Bữa sáng`, `Thêm bữa đầu tiên`, `Nhắc thêm bữa sáng`) | `Ghi bữa ăn`, `Ghi món`, `Nhập món` |
| Ghi chỉ số nhanh (cân nặng, kcal lẻ) | **Ghi** (`Ghi cân`, `Ghi nhanh`) | `Nhập cân`, `Log cân` |
| Tạo món tự định nghĩa | **Tạo** (`Tạo món mới`, `Tạo đồ uống mới`) | `Thêm thực phẩm mới`, `Tự tạo` |
| Lưu thay đổi / lưu mẫu bữa ăn | **Lưu** (`Lưu`, `Lưu thay đổi`, `Lưu thành Bữa ăn của tôi`, `Lưu tên`) | `Cập nhật`, `Hoàn thành` |
| Xoá mục ghi / bữa ăn / tài khoản | **Xoá** (chính tả `oá`: `Xoá món này`, `Xoá bữa này`, `Xoá tìm kiếm`) | `Xóa` (`óa`), `Gỡ` |
| Bỏ chọn / bỏ bộ lọc / bỏ yêu thích | **Bỏ** (`Bỏ lọc`, `Bỏ yêu thích`) | `Huỷ lọc`, `Xoá lọc` |
| Huỷ thao tác trong hộp thoại | **Huỷ** (chính tả `uỷ`) | `Hủy` (`ủy`), `Thoát` |
| Đóng tấm trượt / hộp thoại | **Đóng** | `Tắt`, `Đóng lại` |
| Điều hướng về trang trước | **Quay lại** | `Trở về`, `Quay về` (trừ nút hành động đặc thù `Về hôm nay`) |
| Sửa thông tin / đổi lựa chọn | **Sửa** / **Đổi** (`Sửa trong Hồ sơ`, `Đổi bữa`, `Đổi mật khẩu`) | `Chỉnh sửa`, `Thay đổi` |
| Mở / xem chi tiết | **Xem** / **Mở** (`Xem chi tiết`, `Xem nhật ký`, `Mở Ngày tập`) | `Đi tới`, `Truy cập` |
| Đánh dấu mục trong buổi tập | **Đánh dấu** (`Mục đã đánh dấu`) | `Tick` |
| Nhóm chất sinh năng lượng | **Năng lượng** (`kcal`), **Đạm**, **Tinh bột**, **Chất béo**, **Chất xơ** | `Calo`, `Carb`, `Protein`, `Lipid`, rút gọn `Béo` làm nhãn |
| Tính năng lưu bữa & món riêng | **Bữa ăn của tôi**, **Món của tôi** | `Bữa của tôi`, `Món tự tạo`, `Công thức tự tạo` |
| Số liệu dinh dưỡng của thực phẩm | **dữ liệu** (`Chưa có dữ liệu`, `Đủ dữ liệu cả 22 chất`) | Trộn lẫn `số liệu` và `dữ liệu` |
| Đơn vị phần trăm & định dạng số | **`50%`** (không khoảng trắng trước `%`), **`1.041`**, **`2,5`** | `50 %`, `1,041`, `2.5` |

---

## 2. Bảng đề xuất chỉnh sửa theo màn hình & thành phần

> Chỉ liệt kê các chuỗi cần cải thiện. Các chuỗi đã đạt chuẩn giọng văn, chính tả và quy tắc sản phẩm được tổng hợp trong số lượng **Đạt (OK)** ở cuối mỗi nhóm.

### 2.1. Khung ứng dụng, trang lỗi, ngoại tuyến & cài đặt PWA
*Phạm vi: `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/offline/page.tsx`, `app/install/page.tsx`, `app/manifest.ts`, `components/app-header.tsx`, `components/bottom-nav.tsx`, `components/desktop-sidebar.tsx`, `components/sw-register.tsx`*

| file:line | current | proposed | why |
|---|---|---|---|
| `app/layout.tsx:24` | `"H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu"` | `"H1T MICRO \| Dinh dưỡng & vi chất chuyên sâu"` | Không viết hoa từng từ kiểu tiếng Anh |
| `app/layout.tsx:25` | `"Ứng dụng theo dõi macro dinh dưỡng, vi chất và muối luyện tập chuyên sâu."` | `"Ứng dụng theo dõi năng lượng, đa lượng, vi chất và muối ngày tập."` | Thay từ tiếng Anh `"macro"` bằng `"đa lượng"` |
| `app/error.tsx:26` | `"Không thể kết nối máy chủ dinh dưỡng lúc này. Dữ liệu bạn vừa ghi trên máy vẫn được giữ nguyên."` | `"Chưa kết nối được máy chủ lúc này. Nhật ký trên máy bạn vẫn được giữ nguyên."` | Tự nhiên hơn, bỏ cụm máy móc `"máy chủ dinh dưỡng"` |
| `app/not-found.tsx:16` | `"Liên kết này không tồn tại hoặc đã được chuyển sang mục khác."` | `"Trang này không tồn tại hoặc đã chuyển sang mục khác. Bạn quay về Tổng quan nhé."` | Gợi ý rõ bước tiếp theo, giọng văn gần gũi |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.1:** 64 chuỗi.

---

### 2.2. Đăng nhập, đăng ký & thiết lập ban đầu (Auth & Onboarding)
*Phạm vi: `app/signin/**`, `app/signup/page.tsx`, `app/reset-password/page.tsx`, `app/login/page.tsx`, `components/onboarding/**`, `lib/onboarding.ts`, `lib/auth-actions.ts`*

| file:line | current | proposed | why |
|---|---|---|---|
| `app/signup/page.tsx:7` | `"Theo dõi đầy đủ vi chất, không chỉ calo"` | `"Theo dõi đầy đủ 22 vi chất, không chỉ kcal"` | Thống nhất `"kcal"` thay `"calo"`, nêu rõ 22 vi chất |
| `app/signup/page.tsx:9` | `"Ghi bữa ăn, xem đủ 22 vitamin và khoáng chất, và nhận mục tiêu tính theo cơ thể bạn."` | `"Thêm bữa ăn, xem đủ 22 vitamin và khoáng chất cùng mục tiêu tính theo cơ thể bạn."` | Đồng nhất động từ `"Thêm bữa ăn"` |
| `app/signup/page.tsx:20` | `label="1 set là đủ"` | `label="Một hiệp là đủ"` | Thay từ tiếng Anh `"set"` bằng `"hiệp"` |
| `app/signup/page.tsx:23` | `"1 SET LÀ ĐỦ"` | `"MỘT HIỆP LÀ ĐỦ"` | Thay từ tiếng Anh `"SET"` bằng `"HIỆP"` |
| `app/signup/page.tsx:33` | `"Bắt đầu ghi bữa ăn"` | `"Bắt đầu thêm bữa ăn"` | Đồng nhất động từ `"thêm bữa ăn"` |
| `app/signin/check-email/page.tsx:74` | `"Mở ứng dụng Mail"` | `"Mở ứng dụng email"` | `"email"` tự nhiên trên mọi thiết bị |
| `app/signin/check-email/page.tsx:90` | `"Mô phỏng mở liên kết (dev)"` | `"Mở liên kết mẫu (bản thử)"` | Bỏ từ `"Mô phỏng"` và `"dev"` (xem mục §4) |
| `app/signin/check-email/page.tsx:94` | `"Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo."` | `"Chưa thấy email? Kiểm tra hộp thư rác (Spam) hoặc mục Quảng cáo."` | Việt hoá `"hộp thư rác"` dễ hiểu hơn |
| `app/login/page.tsx:16` | `"Chế độ phát triển (Mock Auth)"` | `"Bản thử nghiệm (đăng nhập mẫu)"` | Không lộ thuật ngữ kỹ thuật `"Mock Auth"` |
| `app/login/page.tsx:36` | `"Vào thẳng ứng dụng (Mock User)"` | `"Vào thẳng ứng dụng (tài khoản mẫu)"` | Không lộ thuật ngữ kỹ thuật `"Mock User"` |
| `components/onboarding/setup-form.tsx:151` | `"Bước 1/2 · Về bạn"` | `"Bước 1 / 2 · Về bạn"` | Đồng nhất khoảng trắng `"Bước 1 / 2"` với dòng 114 |
| `components/onboarding/setup-summary.tsx:32` | `"Bắt đầu ghi bữa đầu tiên"` | `"Thêm bữa đầu tiên"` | Đồng nhất với `overview-parts.tsx:85` (xem mục §4) |
| `components/onboarding/setup-summary.tsx:71` | `"Bắt đầu ghi bữa đầu tiên"` | `"Thêm bữa đầu tiên"` | Đồng nhất với dòng 32 và bảng động từ |
| `lib/onboarding.ts:128` | `label: "Béo (0,5–1 g/kg)"` | `label: "Chất béo (0,5–1 g/kg)"` | Đồng nhất `"Chất béo"` với bảng mục tiêu |
| `lib/auth-actions.ts:192` | `"Bạn đang ngoại tuyến"` | `"Bạn đang ngoại tuyến. Kiểm tra kết nối mạng rồi thử lại nhé."` | Lỗi hành động cần hướng dẫn bước tiếp theo |
| `lib/auth-actions.ts:194` | `"Chưa gửi được yêu cầu, thử lại sau"` | `"Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé."` | Tự nhiên, xưng `"bạn"` rõ ràng |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.2:** 92 chuỗi.

---

### 2.3. Tổng quan: Tóm tắt, Năng lượng, Vi chất, Cơ thể (`/`, `/trends/**`)
*Phạm vi: `app/(dashboard)/page.tsx`, `app/trends/**`, `components/overview/**`, `lib/overview.ts`, `lib/overview-board.ts`, `lib/overview-detail.ts`, `lib/period.ts`, `lib/weight-log.ts`, `lib/format.ts`*

| file:line | current | proposed | why |
|---|---|---|---|
| `components/overview/energy-tab.tsx:23` | `{ key: "fat", label: "Béo", pct: fat, className: "bg-amber" }` | `{ key: "fat", label: "Chất béo", pct: fat, className: "bg-amber" }` | Đồng nhất `"Chất béo"` với bảng điểm ngay phía trên |
| `components/overview/energy-tab.tsx:30` | `` `Đạm ${protein}%, tinh bột ${carbs}%, béo ${fat}%` `` | `` `Đạm ${protein}%, tinh bột ${carbs}%, chất béo ${fat}%` `` | Đồng nhất `"chất béo"` trong `aria-label` |
| `components/overview/energy-tab.tsx:157` | `"* Chất xơ chỉ tính các món có số liệu chất xơ."` | `"* Chất xơ chỉ tính từ các món có dữ liệu chất xơ."` | Thống nhất `"dữ liệu"` thay `"số liệu"` |
| `components/overview/micro-card.tsx:38` | `"Chưa có số liệu vi chất trong kỳ"` | `"Chưa có dữ liệu vi chất trong kỳ"` | Thống nhất `"dữ liệu"` thay `"số liệu"` |
| `components/overview/micros-tab.tsx:96` | `` `${board.unknown} chất chưa có số liệu` : "Đủ số liệu cả 22 chất" `` | `` `${board.unknown} chất chưa có dữ liệu` : "Đủ dữ liệu cả 22 chất" `` | Thống nhất `"dữ liệu"` (dòng 154 cùng file đã dùng `"dữ liệu"`) |
| `components/overview/micros-tab.tsx:175` | `label: "Chưa có số liệu"` | `label: "Chưa có dữ liệu"` | Thống nhất `"dữ liệu"` |
| `components/overview/micros-tab.tsx:193` | `"Chưa có món nào có số liệu trong kỳ này"` | `"Chưa có món nào có dữ liệu trong kỳ này"` | Thống nhất `"dữ liệu"` |
| `components/overview/parts/nutrient-grid.tsx:47` | `` `${s.name}: chưa có số liệu` `` | `` `${s.name}: chưa có dữ liệu` `` | Thống nhất `"dữ liệu"` trong `aria-label` |
| `components/overview/parts/nutrient-grid.tsx:74` | `"Chưa có số liệu"` | `"Chưa có dữ liệu"` | Thống nhất `"dữ liệu"` |
| `components/overview/body-tab.tsx:184` | `sub="Không đổi theo cân"` | `sub="Cố định theo giới tính và độ tuổi"` | Giải thích rõ vì sao mục tiêu giữ nguyên |
| `lib/overview-board.ts:69` | `"Chưa đủ số liệu trong kỳ"` | `"Chưa đủ dữ liệu trong kỳ"` | Thống nhất `"dữ liệu"` (xem mục §4) |
| `lib/overview-detail.ts:265` | `"Chưa có món nào trong nhật ký có số liệu chất này"` | `"Chưa có món nào trong nhật ký có dữ liệu chất này"` | Thống nhất `"dữ liệu"` (xem mục §4) |
| `lib/period.ts:171` | `{ key: "fat", label: "Béo", unit: "g" }` | `{ key: "fat", label: "Chất béo", unit: "g" }` | Đồng nhất `"Chất béo"` (xem mục §4) |
| `lib/format.ts:195` | `` `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))} %` `` | `` `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))}%` `` | Quy tắc cứng `50%` không có khoảng trắng trước `%` |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.3:** 118 chuỗi.

---

### 2.4. Nhật ký, Vi chất trong ngày & Ngày tập (`/diary`, `/micros/**`, `/training`)
*Phạm vi: `app/diary/page.tsx`, `app/micros/**`, `app/(dashboard)/training/page.tsx`, `components/diary/**`, `components/today/**`, `components/micros/**`, `components/training/**`, `components/calendar-picker.tsx`, `lib/diary-rows.ts`, `lib/quick-entry.ts`, `lib/training.ts`, `lib/nutrient-detail.ts`, `lib/mock/sample-day.ts`*

| file:line | current | proposed | why |
|---|---|---|---|
| `components/diary/diary-screen.tsx:252` | `{ key: "fat", label: "Béo", color: "bg-amber" }` | `{ key: "fat", label: "Chất béo", color: "bg-amber" }` | Đồng nhất `"Chất béo"` trên thẻ tổng hợp Nhật ký |
| `lib/mock/sample-day.ts:173` | `label: "Béo"` | `label: "Chất béo"` | Đồng nhất `"Chất béo"` trong dữ liệu mẫu |
| `lib/mock/sample-day.ts:445` | `name: "Folate (B9)"` | `name: "Vitamin B9"` | Khớp tên chuẩn `"Vitamin B9"` trong `docs/nutrient-catalog.md` |
| `lib/diary-rows.ts:8` | `part("Béo", fat)` | `part("Chất béo", fat)` | Đồng nhất `"Chất béo"` ở dòng phụ món ăn (xem mục §4) |
| `lib/quick-entry.ts:78` | `Béo ${show(entry.fat)}` | `Chất béo ${show(entry.fat)}` | Đồng nhất `"Chất béo"` cho mục thêm nhanh (xem mục §4) |
| `app/(dashboard)/training/page.tsx:136` | `"Tick đã lưu của ngày này. Chỉ xem."` | `"Mục đã đánh dấu của ngày này · Chỉ xem."` | Thay từ tiếng Anh `"Tick"` bằng tiếng Việt (xem mục §4) |
| `components/training/sodium-progress-card.tsx:76` | `"Đã đạt mức tối thiểu. Mỗi lần ghi muối trong tập sẽ cộng vào đây."` | `"Mỗi lần đánh dấu muối trong buổi tập sẽ cộng vào đây."` | Tránh báo sai khi chưa đạt và khớp hành động đánh dấu |
| `lib/training.ts:163` | `"Không dồn vào cuối buổi · quá ~1 g một lần dễ gây khó chịu bụng"` | `"Chia đều theo từng chặng 20 phút, không dồn vào cuối buổi"` | Bỏ lời khuyên sức khoẻ ngoài quy tắc huấn luyện viên |
| `lib/training.ts:183` | `"Cần định lượng chính xác để tính phần còn lại trong ngày"` | `"Cân hoặc đong rõ lượng muối để tính đúng phần còn lại trong ngày"` | Cụ thể hành động thay vì văn phong hành chính |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.4:** 134 chuỗi.

---

### 2.5. Thêm món, Khám phá, Chi tiết món & Sửa mục ghi (`/add`, `/explore/**`, `/foods/**`, `/entry/[id]`)
*Phạm vi: `app/add/page.tsx`, `app/explore/**`, `app/foods/**`, `app/entry/[id]/page.tsx`, `components/explore/**`, `components/foods/**`, `components/meal-switcher.tsx`, `components/ui/portion-panel.tsx`*

| file:line | current | proposed | why |
|---|---|---|---|
| `app/explore/rich/[nutrient]/page.tsx:60` | `` `${row.pct} % mục tiêu ngày · ${row.basis}` `` | `` `${row.pct}% mục tiêu ngày · ${row.basis}` `` | Quy tắc cứng `50%` không có khoảng trắng trước `%` |
| `components/foods/food-micros.tsx:10` | `if (row.share < 0.1) return "< 0,1 %";` | `if (row.share < 0.1) return "<0,1%";` | Quy tắc cứng không khoảng trắng trước `%` (xem mục §4) |
| `components/foods/food-micros.tsx:11` | `` `${formatNumber(row.share, { decimals: 1 })} %` : `${row.pct} %` `` | `` `${formatNumber(row.share, { decimals: 1 })}%` : `${row.pct}%` `` | Quy tắc cứng `50%` không có khoảng trắng trước `%` |
| `components/foods/food-micros.tsx:63` | `"Từ 20 % mục tiêu ngày mỗi khẩu phần"` | `"Từ 20% mục tiêu ngày mỗi khẩu phần"` | Quy tắc cứng `20%` không có khoảng trắng trước `%` |
| `components/foods/food-micros.tsx:70` | `{r.name} · {r.pct} %` | `{r.name} · {r.pct}%` | Quy tắc cứng `50%` không khoảng trắng trước `%` (xem mục §4) |
| `components/foods/food-empty-state.tsx:58` | `"Danh sách đồ uống chỉ có món có số liệu từ nguồn đã dùng. Bạn có thể tự tạo đồ uống."` | `"Danh sách đồ uống chỉ hiện món có dữ liệu từ nguồn đã kiểm chứng. Bạn có thể tạo đồ uống mới."` | Thay `"số liệu"` bằng `"dữ liệu"`, câu tự nhiên |
| `components/foods/entry-editor.tsx:132` | `"Thêm nhanh: vi chất của món này chưa có dữ liệu. Để trống một chất nếu chưa biết: hiện là —."` | `"Mục thêm nhanh chưa có dữ liệu vi chất. Để trống chất bạn chưa biết (sẽ hiện —)."` | Bỏ hai dấu hai chấm liên tiếp, ngắn gọn hơn |
| `components/foods/entry-editor.tsx:149` | `aria-label="Số gam"` | `aria-label="Khối lượng theo gam"` | Đồng nhất với `app/foods/[id]/page.tsx:199` (xem mục §4) |
| `components/ui/portion-panel.tsx:149` | `aria-label="Số gam"` | `aria-label="Khối lượng theo gam"` | Đồng nhất với `app/foods/[id]/page.tsx:199` |
| `components/ui/portion-panel.tsx:195` | `{ label: "Béo", val: scaled.fat, unit: "g" }` | `{ label: "Chất béo", val: scaled.fat, unit: "g" }` | Đồng nhất `"Chất béo"` |
| `app/foods/[id]/page.tsx:227` | `{ label: "Béo", val: scaled.fat, unit: "g" }` | `{ label: "Chất béo", val: scaled.fat, unit: "g" }` | Đồng nhất `"Chất béo"` |
| `app/foods/new/page.tsx:50` | `"Vui lòng nhập tên món ăn."` | `"Nhập tên món ăn"` | Bỏ `"Vui lòng"`, đồng nhất kiểu lỗi ngắn gọn |
| `app/foods/new/page.tsx:53` | `"Khẩu phần phải lớn hơn 0."` | `"Nhập khối lượng khẩu phần lớn hơn 0"` | Nói rõ hành động tiếp theo cho người dùng |
| `app/foods/new/page.tsx:57` | `"Năng lượng không hợp lệ."` | `"Nhập số kcal từ 0 trở lên"` | Cụ thể điều kiện hợp lệ thay vì báo chung chung |
| `app/foods/new/page.tsx:168` | `label="Lượng mỗi khẩu phần"` | `label="Khối lượng khẩu phần"` | Tự nhiên, rõ nghĩa hơn `"Lượng mỗi khẩu phần"` |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.5:** 109 chuỗi.

---

### 2.6. Cài đặt, Hồ sơ, Nguồn dữ liệu, Gói Pro & Duyệt món (`/settings/**`, `/paywall`, `/admin/review`)
*Phạm vi: `app/settings/**`, `app/paywall/page.tsx`, `app/admin/review/page.tsx`, `components/settings/**`, `components/data-sources/**`, `lib/data-sources.ts`, `lib/target-rows.ts`*

| file:line | current | proposed | why |
|---|---|---|---|
| `app/settings/notifications/page.tsx:32` | `label: "Nhắc ghi bữa sáng"` | `label: "Nhắc thêm bữa sáng"` | Đồng nhất động từ `"thêm bữa"` |
| `app/settings/notifications/page.tsx:39` | `label: "Nhắc ghi bữa trưa"` | `label: "Nhắc thêm bữa trưa"` | Đồng nhất động từ `"thêm bữa"` |
| `app/settings/notifications/page.tsx:46` | `label: "Nhắc ghi bữa tối"` | `label: "Nhắc thêm bữa tối"` | Đồng nhất động từ `"thêm bữa"` |
| `app/settings/notifications/page.tsx:53` | `subtitle: "15 phút trước giờ tập để chuẩn bị muối & tinh bột"` | `subtitle: "15 phút trước giờ tập để chuẩn bị muối và tinh bột"` | Dùng `"và"` thay ký hiệu `"&"` |
| `app/settings/delete-account/page.tsx:12` | `"Món và công thức bạn tự tạo"` | `"Món của tôi và Bữa ăn của tôi"` | Dùng đúng tên tính năng trong ứng dụng |
| `app/settings/delete-account/page.tsx:29` | `"Chưa hỗ trợ xoá tài khoản trong bản thử"` | `"Bản thử chưa hỗ trợ xoá tài khoản. Bạn có thể đăng xuất trong mục Tài khoản."` | Thêm hướng dẫn bước tiếp theo |
| `app/settings/delete-account/page.tsx:36` | `"Chưa hỗ trợ tải dữ liệu trong bản thử"` | `"Bản thử chưa hỗ trợ tải dữ liệu về máy."` | Câu chủ động, tự nhiên hơn |
| `app/settings/delete-account/page.tsx:73` | `"Bạn có thể tải nhật ký và món tự tạo về máy trước khi xoá."` | `"Bạn có thể tải nhật ký và Món của tôi về máy trước khi xoá."` | Đồng nhất thuật ngữ `"Món của tôi"` |
| `app/paywall/page.tsx:26` | `"Sắp mở thanh toán — dùng thử miễn phí trong lúc chờ"` | `"Cổng thanh toán sắp mở — bạn đang được dùng miễn phí đầy đủ tính năng"` | Ấm áp, rõ quyền lợi của người dùng |
| `lib/data-sources.ts:16` | `"Nguồn chính cho thực phẩm nguyên bản, thịt cá, trứng, sữa, hạt và rau củ phổ biến. Đầy đủ số liệu cho cả 22 vi chất."` | `"Nguồn chính cho thực phẩm nguyên bản, thịt cá, trứng, sữa, hạt và rau củ phổ biến. Đầy đủ dữ liệu cho cả 22 vi chất."` | Thống nhất `"dữ liệu"` thay `"số liệu"` |
| `lib/data-sources.ts:26` | `"Dùng cho món ăn, nguyên liệu và thực phẩm chế biến đặc thù tại Việt Nam. Một số vi chất vi lượng (như Selen, Vitamin K) chưa có số liệu trong bảng gốc."` | `"Dùng cho món ăn, nguyên liệu và thực phẩm chế biến đặc thù tại Việt Nam. Một số vi chất (như Selen, Vitamin K) chưa có dữ liệu trong bảng gốc."` | Thống nhất `"dữ liệu"`, bỏ lặp `"vi chất vi lượng"` |
| `lib/data-sources.ts:36` | `"Năng lượng và đa lượng lấy theo nhãn sản phẩm; vi chất chỉ hiển thị các chất nhà sản xuất công bố trên bao bì, các chất còn lại để trống (chưa có số liệu)."` | `"Năng lượng và đa lượng lấy theo nhãn sản phẩm; vi chất chỉ hiện các chất được công bố trên bao bì, các chất còn lại để trống (chưa có dữ liệu)."` | Thống nhất `"dữ liệu"`, câu gọn hơn |
| `app/admin/review/page.tsx:100` | `"Chưa chọn dữ liệu"` | `"Chưa chọn món cần duyệt"` | Cụ thể ngữ cảnh thay vì `"dữ liệu"` chung chung |
| `app/admin/review/page.tsx:102` | `"Hãy chọn một mục bên danh sách chờ để kiểm tra chi tiết."` | `"Chọn một món ở danh sách bên trái để kiểm tra chi tiết."` | Bỏ `"Hãy"`, chỉ dẫn trực tiếp |
| `app/admin/review/page.tsx:146` | `"Tất cả thực phẩm người dùng đóng góp đã được xử lý."` | `"Tất cả món chờ duyệt đã được xử lý."` | Ngắn gọn, bỏ câu bị động dài |

- **Chuỗi giữ nguyên (OK) trong nhóm 2.6:** 98 chuỗi.

---

## 3. Tổng kết số lượng (Totals)

| Nhóm màn hình / thành phần | Tổng số chuỗi tìm thấy | Đề xuất sửa (Changed) | Giữ nguyên (Unchanged / OK) |
|---|---:|---:|---:|
| 2.1. Khung ứng dụng, trang lỗi, ngoại tuyến & PWA | 68 | 4 | 64 |
| 2.2. Đăng nhập, đăng ký & thiết lập ban đầu | 108 | 16 | 92 |
| 2.3. Tổng quan (`/`, `/trends/**`) | 132 | 14 | 118 |
| 2.4. Nhật ký, Vi chất & Ngày tập (`/diary`, `/micros/**`, `/training`) | 143 | 9 | 134 |
| 2.5. Thêm món, Khám phá, Chi tiết món & Sửa mục ghi | 124 | 15 | 109 |
| 2.6. Cài đặt, Hồ sơ, Nguồn dữ liệu, Gói Pro & Duyệt món | 113 | 15 | 98 |
| **Tổng cộng** | **688** | **73** | **615** |

---

## 4. Chuỗi đang được kiểm tra trong `tests/probes/*.py` & `lib/__tests__/*.test.ts`

Khi cập nhật các chuỗi tiếng Việt ở trên, lập trình viên cần cập nhật đồng bộ các tệp probe và unit test dưới đây để không làm gãy cổng kiểm tra:

### 4.1. Các đề xuất sửa ở Mục 2 có liên kết trực tiếp với Probe / Unit Test

| Chuỗi hiện tại trong mã nguồn | Đề xuất mới | Probe / Unit test đang kiểm tra chuỗi này |
|---|---|---|
| `"Mô phỏng mở liên kết (dev)"` (`app/signin/check-email/page.tsx:90`) | `"Mở liên kết mẫu (bản thử)"` | `tests/probes/cc02-final.py:172` |
| `"Bắt đầu ghi bữa đầu tiên"` (`components/onboarding/setup-summary.tsx:32, 71`) | `"Thêm bữa đầu tiên"` | `tests/probes/cc2_15.py:171`, `tests/probes/cc2_15b.py:144` |
| `aria-label="Số gam"` (`components/foods/entry-editor.tsx:149`) | `aria-label="Khối lượng theo gam"` | `tests/probes/ag06.py:79`, `tests/probes/cc05.py:45`, `tests/probes/cc06.py:79` |
| `"Đạm — · Tinh bột — · Béo —"` (`lib/diary-rows.ts:8`, `lib/quick-entry.ts:78`) | `"Đạm — · Tinh bột — · Chất béo —"` | `tests/probes/cc2_12.py:320`, `lib/__tests__/diary-rows.test.ts`, `lib/__tests__/quick-entry.test.ts` |
| `"Tick đã lưu của ngày này. Chỉ xem."` (`app/(dashboard)/training/page.tsx:136`) | `"Mục đã đánh dấu của ngày này · Chỉ xem."` | `tests/probes/cc_17.py:172` |
| `{r.name} · {r.pct} %` (`components/foods/food-micros.tsx:10, 11, 70`) | `{r.name} · {r.pct}%` | `tests/probes/cc2_11.py:160` (regex `r"(\d+) %"`), `lib/__tests__/food-detail.test.ts` |
| `"Chưa đủ số liệu trong kỳ"` / `"Chưa có món nào trong nhật ký có số liệu chất này"` / `label: "Béo"` / `formatPercent` (`lib/overview-board.ts:69`, `lib/overview-detail.ts:265`, `lib/period.ts:171`, `lib/format.ts:195`) | Đổi `"số liệu"` → `"dữ liệu"`, `"Béo"` → `"Chất béo"`, bỏ khoảng trắng trước `%` | `lib/__tests__/overview-board.test.ts`, `lib/__tests__/overview-detail.test.ts`, `lib/__tests__/period.test.ts`, `lib/__tests__/format-period.test.ts` |

### 4.2. Danh mục chuỗi cố định đang được các Probe (`tests/probes/*.py`) kiểm tra (giữ nguyên)

| Tệp Probe | Các chuỗi tiếng Việt đang được assert |
|---|---|
| `ag06.py` | `"Tìm món"`, `"Số gam"`, `"VI CHẤT"`, `"Gói miễn phí vẫn ghi đủ 22 vi chất."`, `"Nhắc nhở"`, `"Đã bật"`, `"Đã tắt"` |
| `ag07.py` | `"Tuỳ chỉnh"`, `"Món mẫu"` |
| `cc02-final.py` | `"Chọn một món để xem khẩu phần"`, `"Xoá tìm kiếm"`, `"Món gần đây"`, `"Lọc món theo nhóm"`, `"Yêu thích"`, `"Gửi liên kết đăng ký qua email"`, `"Mô phỏng mở liên kết (dev)"`, `"Tiếp tục"`, `"Hoàn tất"`, `"Để sau"` |
| `cc03.py` | `"Bỏ yêu thích"`, `"Thêm vào yêu thích"`, `"Đã thêm vào yêu thích"`, `"Đã bỏ khỏi yêu thích"`, `"Chưa có món yêu thích"`, `"Bấm ♡ ở trang chi tiết món để lưu."`, `"Bỏ lọc"`, `"Tất cả"` |
| `cc04.py` | `"Quay lại"`, `"Bước 1 / 2"`, `"Bước 2 / 2"`, `"Thêm vào yêu thích"`, `"Đã thêm vào yêu thích"` |
| `cc05.py`, `cc06.py` | `"Không tìm thấy món này"`, `"Lưu thay đổi"`, `"Xoá món này"`, `"Đã xoá"`, `"Hoàn tác"`, `"Khoáng chất"` |
| `cc08.py`, `cc09.py` | `"Nhập cân nặng từ 30 đến 300 kg"`, `"Nhập năm sinh từ 1900 đến ..."`, `"Lưu"`, `"Nam"`, `"Nữ"`, `"Gần/đang trong kỳ"`, `"Mục tiêu mỗi ngày"`, `"Ứng dụng"`, `"Vùng nguy hiểm"`, `"Năm sinh"` |
| `cc10.py`, `cc11.py` | `"Ngày trước"`, `"Ngày sau"`, `"Đang xem ngày cũ"`, `"Chép hôm qua"`, `"Hôm qua"`, `"Hôm nay"`, `"Chọn ngày"`, `"Tháng trước"`, `"chưa tới"`, `"Chưa ghi"`, `"Về hôm nay"`, `"Thiếu:"` |
| `cc2_07.py`, `cc2_08.py` | `"Điều hướng chính"`, `"Tổng quan"`, `"Nhật ký"`, `"Khám phá"`, `"Cài đặt"`, `"Thêm vào:"`, `"Đóng"`, `"Hồ sơ"`, `"Cân nặng"`, `"Ngôn ngữ"`, `"Nhắc nhở"`, `"Vi chất"`, `"Ngày tập"`, `"Tạo món mới"` |
| `cc2_10.py` | `"Tóm tắt"`, `"Năng lượng"`, `"Vi chất"`, `"Cơ thể"`, `"Trung bình mỗi ngày"`, `"Kỳ trước"`, `"Kỳ sau"`, `"30 ngày"`, `"+ Thêm vào bữa tối"`, `"Tuỳ chọn"`, `"Lưu thành Bữa ăn của tôi"`, `"Xoá bữa này"`, `"Chưa có món"`, `"Hoàn tác"` |
| `cc2_11.py`, `cc2_12.py` | `"Gần đây"`, `"Yêu thích"`, `"Món của tôi"`, `"Bữa ăn của tôi"`, `"Tạo món mới"`, `"Món giàu vi chất"`, `"Không có món nào khớp"`, `"Mỗi khẩu phần"`, `"Nguồn tốt của"`, `"Chưa có dữ liệu cho ... trong 22 vi chất"`, `"Chọn khẩu phần"`, `"Lưu tên"`, `"Xoá Bữa ăn của tôi"`, `"Chưa có Bữa ăn của tôi"`, `"Chỉ thêm kcal"`, `"Nhập kcal lớn hơn 0"`, `"Thêm nhanh"` |
| `cc2_14.py` | `"Thêm món"`, `"Nhật ký"`, `"Bạn đang ngoại tuyến"`, `"Nhật ký trên máy này vẫn dùng được."`, `"Thử lại"`, `"Cài ứng dụng"`, `"Trình duyệt này chưa cho cài ứng dụng"`, `"Các bước cài trên iPhone"`, `"Chia sẻ"`, `"Thêm vào MH chính"`, `"Đã cài trên máy này"` |
| `cc2_15.py`, `cc2_15b.py`, `cc2_15c.py` | `"Bước 1 / 2"`, `"Bước 2 / 2"`, `"Giữ cân"`, `"Tăng cơ"`, `"Bắt đầu ghi bữa đầu tiên"`, `"Xem tổng quan"`, `"Chưa có món hôm nay"`, `"Thêm món vào từng bữa bằng +"`, `"Chưa có ngày nào được ghi"`, `"Thêm bữa đầu tiên"`, `"Chưa có số cân"`, `"Món bạn vừa ghi sẽ hiện ở đây."`, `"Kỳ này có 1 ngày đã ghi"` |
| `cc2_20.py`, `cc2_21.py`, `cc2_22.py`, `cc2_23.py` | `"Còn thiếu"`, `"Theo bữa"`, `"7 ngày qua"`, `"30 ngày qua"`, `"Bảng điểm"`, `"Cần chú ý"`, `"Thiếu nhiều nhất:"`, `"Ngày tập và ngày nghỉ"`, `"Gần mục tiêu nhất"`, `"Xa mục tiêu nhất"`, `"Lần cân sau"`, `"Số lần cân"`, `"Mục tiêu theo cân nặng"`, `"Chưa có đồ uống nào"`, `"Hồ sơ của bạn"`, `"Nguồn dữ liệu"`, `"Thêm vào màn hình chính"`, `"Xoá tài khoản"`, `"H1T MICRO Pro"` |
| `cc_16.py`, `cc_17.py`, `cc_18.py`, `cc_19.py` | `"Khuyến nghị dinh dưỡng Việt Nam 2016"`, `"Sửa trong Hồ sơ"`, `"Thời gian tập"`, `"Tinh bột nhanh"`, `"Tick đã lưu của ngày này"`, `"chưa có thời lượng tập đã ghi"`, `"Xu hướng 7 và 30 ngày"`, `"Tiếp tục với Google"`, `"Đăng nhập"`, `"Đăng ký"`, `"Quên mật khẩu?"`, `"Nhập email hợp lệ, ví dụ ban@email.com"`, `"Nhập mật khẩu"`, `"Hiện mật khẩu"`, `"Ẩn mật khẩu"`, `"Email hoặc mật khẩu không đúng"`, `"Mật khẩu cần ít nhất 8 ký tự"`, `"Mật khẩu cần có ít nhất một chữ và một số"`, `"Mật khẩu nhập lại chưa khớp"`, `"Đổi mật khẩu"`, `"Tên hiển thị tối đa 40 ký tự"`, `"Lưu mật khẩu"`, `"Mật khẩu hiện tại không đúng"`, `"Đã đổi mật khẩu"`, `"Đăng xuất"`, `"Gửi liên kết đặt lại"`, `"Kiểm tra email để đặt lại mật khẩu"`, `"Đặt lại mật khẩu"`, `"Đã đặt lại mật khẩu"`, `"Các cơ sở dữ liệu dinh dưỡng"` |
