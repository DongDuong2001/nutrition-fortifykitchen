Verified against b80896c on 2026-10-14; every row is an exact match.

# Kiểm toán Giọng điệu & Văn bản Tiếng Việt (Voice Audit — ag-16 / ag-17)

Tài liệu này rà soát toàn bộ chuỗi văn bản tiếng Việt hiển thị cho người dùng (nhãn, nút bấm, tiêu đề, trạng thái trống, thông báo nhanh/toast, lỗi, xác nhận, gợi ý, nhận xét, thiết lập ban đầu, xác thực, gói Pro, nhắc nhở, `aria-label`) trong `apps/web/app`, `apps/web/components`, `apps/web/lib` và `apps/web/hooks`.

---

## 1. Bảng thuật ngữ động từ & danh từ chuẩn (Verb & Term Glossary)

Một hành động chỉ dùng một động từ duy nhất trên toàn ứng dụng; một khái niệm chỉ dùng một danh từ duy nhất:

| Hành động / Khái niệm | Từ chuẩn duy nhất | Không dùng |
|---|---|---|
| Ghi một món hoặc bữa ăn vào nhật ký | **Thêm** (`Thêm món`, `Thêm vào Bữa sáng`, `Thêm bữa đầu tiên`, `Thêm nhanh`) | `Ghi món`, `Ghi bữa`, `Nhập món`, `Log` |
| Lưu thay đổi biểu mẫu / cài đặt / khẩu phần | **Lưu** (`Lưu`, `Lưu thay đổi`, `Lưu mật khẩu`, `Tự động lưu`) | `Cập nhật`, `Áp dụng`, `Xác nhận lưu` |
| Thay đổi thông tin đã có | **Sửa** (`Sửa`, `Sửa trong Hồ sơ`, `Sửa tên bữa`) | `Chỉnh sửa`, `Thay đổi`, `Cập nhật` |
| Loại bỏ món, bữa ăn, tài khoản | **Xoá** (chính tả dấu sắc trên `a`: `Xoá`, `Xoá món này`, `Xoá bữa này`) | `Xóa`, `Gỡ`, `Loại bỏ`, `Huỷ bỏ` |
| Bỏ lọc / bỏ yêu thích | **Bỏ** (`Bỏ lọc`, `Bỏ yêu thích`) | `Xoá lọc`, `Huỷ yêu thích` |
| Đóng hộp thoại / không thực hiện thao tác | **Huỷ** (dấu hỏi trên `y`: `Huỷ`) hoặc **Đóng** (`Đóng` cho nút `×`) | `Hủy`, `Thoát`, `Đóng lại` |
| Khôi phục thao tác vừa xoá/thêm | **Hoàn tác** | `Quay lại`, `Khôi phục`, `Undo` |
| Sao chép bữa ăn hôm qua | **Chép hôm qua** | `Sao chép ngày hôm qua`, `Copy hôm qua` |
| Điều hướng về trang trước | **Quay lại** (cho nút `aria-label`) / **Về `<Tên trang>`** (cho liên kết cụ thể) | `Trở lại`, `Quay về trang trước` |
| Đa lượng (Macronutrients) | **Đạm**, **Tinh bột**, **Chất béo**, **Chất xơ** | `Protein`, `Carb`, `Béo` (đứng một mình làm nhãn chính), `Xơ` |
| Giá trị chưa được phân tích (`null`) | **Chưa có dữ liệu** (hiển thị ký hiệu `—`) | `Chưa có số liệu`, `Dữ liệu không khả dụng`, `Không xác định` |
| Bữa ăn đã lưu của người dùng | **Bữa ăn của tôi** | `Bữa đã lưu`, `Thực đơn mẫu`, `Combo của tôi` |
| Nguồn quy tắc dinh dưỡng | **huấn luyện viên** | `coach`, `HLV`, `chuyên gia` |
| Chính tả & định dạng số | **Xoá**, **Tuỳ**, **Huỷ**; phần trăm viết liền **50%**; số kiểu Việt **1.041** và **2,5** | `Xóa`, `Tùy`, `Hủy`; `50 %` (có khoảng trắng); `1,041` hoặc `2.5` |

---

## 2. Bảng đề xuất chỉnh sửa theo màn hình & thành phần

> Chỉ liệt kê các chuỗi cần chỉnh sửa để cải thiện giọng điệu hoặc tuân thủ quy tắc cứng; các chuỗi đạt chuẩn được tính trong phần Tổng kết ở mục 4. Mọi dòng dưới đây đều khớp chính xác với mã nguồn tại commit `b80896c`.

### 2.1. Khung ứng dụng, Điều hướng & Trang trạng thái (`app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/offline/page.tsx`, `components/ui/*`, `components/pwa/*`)

| file:line | current | proposed | why |
|---|---|---|---|
| `app/layout.tsx:24` | `"H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu"` | `"H1T MICRO \| Theo dõi vi chất & dinh dưỡng mỗi ngày"` | Tự nhiên, cụ thể lợi ích cho bạn và bỏ viết hoa tuỳ tiện giữa câu. |
| `app/layout.tsx:25` | `"Theo dõi 22 vi chất và macro dinh dưỡng chuyên sâu cho vận động và tập luyện."` | `"Theo dõi 22 vi chất, năng lượng và đa lượng chuyên sâu cho vận động và tập luyện."` | Thay từ tiếng Anh `"macro"` bằng thuật ngữ tiếng Việt tự nhiên. |

### 2.2. Xác thực (Auth) & Thiết lập ban đầu (Onboarding / Setup) (`app/signin/*`, `app/signup/*`, `app/reset-password/*`, `app/setup/*`, `components/auth/*`, `components/onboarding/*`, `lib/onboarding.ts`, `lib/auth-actions.ts`)

| file:line | current | proposed | why |
|---|---|---|---|
| `app/signup/page.tsx:7` | `"Theo dõi đầy đủ vi chất, không chỉ calo"` | `"Theo dõi đủ 22 vi chất, không chỉ kcal"` | Ngắn gọn, cụ thể con số 22 vi chất và đồng nhất đơn vị `kcal`. |
| `app/signup/page.tsx:9` | `"Ghi bữa ăn trong vài giây, thấy ngay còn thiếu gì"` | `"Thêm bữa ăn trong vài giây, thấy ngay còn thiếu gì"` | Đồng nhất động từ `"Thêm bữa ăn"` theo bảng thuật ngữ. |
| `app/signup/page.tsx:33` | `"Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của huấn luyện viên Lê Hồng Khánh."` | `"Thêm bữa ăn, theo dõi vi chất và bám sát mục tiêu của huấn luyện viên Lê Hồng Khánh."` | Đồng nhất động từ `"Thêm bữa ăn"` theo bảng thuật ngữ. |
| `app/signin/check-email/page.tsx:74` | `"Mở ứng dụng Mail"` | `"Mở ứng dụng Email"` | Tự nhiên trên cả điện thoại Android, iOS và máy tính (không chỉ Apple Mail). |
| `app/signin/check-email/page.tsx:90` | `"Mô phỏng mở liên kết (dev)"` | `"Mở thẳng liên kết đăng nhập (bản thử)"` | Việt hoá `"Mô phỏng ... (dev)"` cho rõ hành động và đồng nhất từ `"bản thử"`. |
| `app/signin/check-email/page.tsx:94` | `"Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo."` | `"Chưa thấy email? Bạn kiểm tra thêm hộp thư Rác (Spam) hoặc Quảng cáo nhé."` | Giọng điệu ấm áp, xưng `"bạn"` tự nhiên và hướng dẫn cụ thể. |
| `components/onboarding/setup-summary.tsx:32` | `"Bắt đầu ghi bữa đầu tiên"` | `"Thêm bữa đầu tiên"` | Đồng nhất động từ `"Thêm"` với nút `"Thêm bữa đầu tiên"` ở Tổng quan. |
| `components/onboarding/setup-summary.tsx:71` | `"Bắt đầu ghi bữa đầu tiên"` | `"Thêm bữa đầu tiên"` | Đồng nhất động từ `"Thêm"` giữa bản điện thoại và máy tính. |
| `lib/onboarding.ts:128` | `label: "Béo (0,5–1 g/kg)"` | `label: "Chất béo (0,5–1 g/kg)"` | Đồng nhất danh từ `"Chất béo"` thay vì `"Béo"` đứng một mình. |
| `lib/auth-actions.ts:59` | `const RETRY_LATER = "Chưa xử lý được. Thử lại sau ít phút.";` | `const RETRY_LATER = "Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé.";` | Nêu rõ nguyên nhân và xưng `"bạn"` tự nhiên. |

### 2.3. Tổng quan (`/` · `/trends` · `/trends/micros` · `/trends/body`, `components/overview/*`, `lib/overview-*.ts`, `lib/period.ts`, `lib/format.ts`)

| file:line | current | proposed | why |
|---|---|---|---|
| `components/overview/energy-tab.tsx:23` | `{ key: "fat", label: "Béo", share: fat, bg: "bg-ink" }` | `{ key: "fat", label: "Chất béo", share: fat, bg: "bg-ink" }` | Đồng nhất nhãn `"Chất béo"` với bảng điểm ngay phía trên. |
| `components/overview/energy-tab.tsx:31` | ``aria-label={`Đạm ${protein}%, béo ${fat}%, tinh bột ${carbs}% của kcal trung bình`}`` | ``aria-label={`Đạm ${protein}%, chất béo ${fat}%, tinh bột ${carbs}% của kcal trung bình`}`` | Đồng nhất thuật ngữ `"chất béo"` trong nhãn trợ năng. |
| `components/overview/energy-tab.tsx:157` | `"* Chất xơ chỉ tính các món có số liệu chất xơ."` | `"* Chất xơ chỉ tính từ các món đã có dữ liệu chất xơ."` | Đồng nhất thuật ngữ `"dữ liệu"` thay cho `"số liệu"`. |
| `components/overview/micro-card.tsx:38` | `"Chưa có số liệu vi chất trong kỳ"` | `"Chưa có dữ liệu vi chất trong kỳ này"` | Đồng nhất `"Chưa có dữ liệu"` trên toàn ứng dụng. |
| `components/overview/micros-tab.tsx:96` | `` `${board.unknown} chất chưa có số liệu` : "Đủ số liệu cả 22 chất" `` | `` `${board.unknown} chất chưa có dữ liệu` : "Đủ dữ liệu cả 22 chất" `` | Đồng nhất thuật ngữ `"dữ liệu"` thay cho `"số liệu"`. |
| `components/overview/micros-tab.tsx:175` | `<SectionTitle as="p">Chưa có số liệu</SectionTitle>` | `<SectionTitle as="p">Chưa có dữ liệu</SectionTitle>` | Đồng nhất thuật ngữ `"Chưa có dữ liệu"` cho giá trị `null`. |
| `components/overview/micros-tab.tsx:193` | `"Chưa có món nào có số liệu trong kỳ này"` | `"Chưa có món nào có dữ liệu chất này trong kỳ"` | Đồng nhất `"dữ liệu"` và nói rõ phạm vi của vi chất đang xem. |
| `components/overview/parts/nutrient-grid.tsx:47` | `const level = s.level ? getLevelLabel(s.level) : "chưa có số liệu";` | `const level = s.level ? getLevelLabel(s.level) : "chưa có dữ liệu";` | Đồng nhất thuật ngữ `"chưa có dữ liệu"` trong `aria-label`. |
| `components/overview/parts/nutrient-grid.tsx:74` | `"Chưa có số liệu"` | `"Chưa có dữ liệu"` | Đồng nhất thuật ngữ `"Chưa có dữ liệu"` khi chạm ô vi chất. |
| `lib/overview-board.ts:69` | `"Chưa đủ số liệu trong kỳ"` | `"Chưa có dữ liệu trong kỳ này"` | Đồng nhất `"Chưa có dữ liệu"` và tránh hiểu nhầm với trạng thái `< 3 ngày`. |
| `lib/overview-detail.ts:265` | `"Chưa có món nào trong nhật ký có số liệu chất này"` | `"Chưa có món nào trong kỳ có dữ liệu về chất này"` | Đồng nhất `"dữ liệu"` và khớp với phạm vi kỳ đang chọn. |
| `lib/period.ts:171` | `{ key: "fat", label: "Béo", unit: "g" }` | `{ key: "fat", label: "Chất béo", unit: "g" }` | Đồng nhất danh từ `"Chất béo"` trong chuỗi xu hướng. |
| `lib/format.ts:195` | `` `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))} %` `` | `` `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))}%` `` | Quy tắc cứng: viết liền dấu phần trăm (`50%`, không có khoảng trắng). |

### 2.4. Nhật ký (`/diary`), Vi chất (`/micros`) & Ngày tập (`/training`) (`components/diary/*`, `components/micros/*`, `components/training/*`, `lib/diary-*.ts`, `lib/quick-entry.ts`, `lib/training.ts`)

| file:line | current | proposed | why |
|---|---|---|---|
| `lib/mock/sample-day.ts:172` | `label: "Béo"` | `label: "Chất béo"` | Đồng nhất nhãn `"Chất béo"` trên dữ liệu mẫu Nhật ký. |
| `lib/diary-rows.ts:8` | ``return `${part("Đạm", protein)} · ${part("Tinh bột", carbs)} · ${part("Béo", fat)}`;`` | ``return `${part("Đạm", protein)} · ${part("Tinh bột", carbs)} · ${part("Chất béo", fat)}`;`` | Đồng nhất `"Chất béo"` ở dòng phụ của món ăn trong Nhật ký. |
| `lib/quick-entry.ts:78` | ``return `Đạm ${show(entry.protein)} · Tinh bột ${show(entry.carbs)} · Béo ${show(entry.fat)}`;`` | ``return `Đạm ${show(entry.protein)} · Tinh bột ${show(entry.carbs)} · Chất béo ${show(entry.fat)}`;`` | Đồng nhất `"Chất béo"` ở dòng phụ của món thêm nhanh. |
| `app/(dashboard)/training/page.tsx:143` | `"Ngày này chưa có thời lượng tập đã ghi. Chỉ xem."` | `"Ngày này chưa lưu thời lượng tập · Chỉ xem"` | Tự nhiên, ngắn gọn hơn cấu trúc bị động `"thời lượng tập đã ghi"`. |
| `components/training/sodium-progress-card.tsx:77` | `"Đã đạt mức tối thiểu. Mỗi lần ghi muối trong tập sẽ cộng vào đây."` | `"Đã đạt mức tối thiểu. Natri từ các bữa ăn hôm nay được cộng tự động vào đây."` | Đúng thực tế hoạt động của ứng dụng (Natri lấy từ bữa ăn, không cộng từ nút tick). |
| `lib/training.ts:135` | `loggedNote("pre-cha-la", "✓ Đã đánh dấu")` | `loggedNote("pre-cha-la", "✓ Đã dùng")` | Gần gũi, tự nhiên với người tập thay vì từ kỹ thuật `"Đã đánh dấu"`. |
| `lib/training.ts:158` | `loggedNote(id, "✓ Đã đánh dấu")` | `loggedNote(id, "✓ Đã dùng")` | Đồng nhất `"✓ Đã dùng"` cho các cữ muối trong buổi tập. |
| `lib/training.ts:196` | ``text: `Đạm vẫn ${targetRangeText(targets.protein, "g")}` `` | ``text: `Giữ mức đạm ${targetRangeText(targets.protein, "g")}` `` | Rõ hành động cần làm trong ngày nghỉ, song hành với `"Năng lượng giữ..."`. |

### 2.5. Khám phá (`/explore`), Thêm món (`/add`), Sửa món (`/entry/[id]`), Chi tiết & Tạo món (`/foods/*`, `components/add/*`, `components/foods/*`, `components/ui/portion-panel.tsx`)

| file:line | current | proposed | why |
|---|---|---|---|
| `app/explore/rich/[nutrient]/page.tsx:53` | `Chưa có món nào có dữ liệu về {name}.` | `Chưa có món nào có dữ liệu {name}. Bạn có thể tự tạo món mới từ nhãn bao bì.` | Hướng dẫn bước tiếp theo khi danh sách trống. |
| `app/explore/rich/[nutrient]/page.tsx:60` | ``meta={row.pct === null ? row.basis : `${row.pct} % mục tiêu ngày · ${row.basis}`}`` | ``meta={row.pct === null ? row.basis : `${row.pct}% mục tiêu ngày · ${row.basis}`}`` | Quy tắc cứng: viết liền dấu phần trăm (`50%`, không có khoảng trắng). |
| `components/foods/food-micros.tsx:10` | `if (row.share > 0 && row.share < 0.1) return "< 0,1 %";` | `if (row.share > 0 && row.share < 0.1) return "< 0,1%";` | Quy tắc cứng: viết liền dấu phần trăm (`< 0,1%`). |
| `components/foods/food-micros.tsx:11` | ``return row.share > 0 && row.share < 1 ? `${formatNumber(row.share, { decimals: 1 })} %` : `${row.pct} %`;`` | ``return row.share > 0 && row.share < 1 ? `${formatNumber(row.share, { decimals: 1 })}%` : `${row.pct}%`;`` | Quy tắc cứng: viết liền dấu phần trăm (`50%`). |
| `components/foods/food-micros.tsx:63` | `"Từ 20 % mục tiêu ngày mỗi khẩu phần"` | `"Từ 20% mục tiêu ngày mỗi khẩu phần"` | Quy tắc cứng: viết liền dấu phần trăm (`20%`). |
| `components/foods/food-micros.tsx:70` | `{r.name} · {r.pct} %` | `{r.name} · {r.pct}%` | Quy tắc cứng: viết liền dấu phần trăm (`50%`). |
| `components/foods/food-empty-state.tsx:58` | `"Danh sách đồ uống chỉ có món có số liệu từ nguồn đã dùng. Bạn có thể tự tạo đồ uống."` | `"Chưa có đồ uống có sẵn dữ liệu phân tích. Bạn có thể tự tạo đồ uống từ nhãn bao bì."` | Thay cụm dịch máy `"từ nguồn đã dùng"` bằng câu tiếng Việt tự nhiên, cụ thể. |
| `components/foods/entry-editor.tsx:138` | `<FormRow label="Béo (g)" htmlFor="entry-quick-fat">` | `<FormRow label="Chất béo (g)" htmlFor="entry-quick-fat">` | Đồng nhất nhãn `"Chất béo (g)"`. |
| `components/foods/entry-editor.tsx:142` | `"Thêm nhanh: vi chất của món này chưa có dữ liệu. Để trống một chất nếu chưa biết: hiện là —."` | `"Món thêm nhanh không tính vào 22 vi chất. Ô bỏ trống sẽ hiện là — (chưa có dữ liệu), không tính là 0."` | Giải thích tự nhiên, mạch lạc thay cho câu ghép hai dấu hai chấm. |
| `components/foods/entry-editor.tsx:218` | ``<Stat value={preview ? `${formatAmount(preview.fat, "g")} g` : "—"} label="Béo" />`` | ``<Stat value={preview ? `${formatAmount(preview.fat, "g")} g` : "—"} label="Chất béo" />`` | Đồng nhất nhãn `"Chất béo"`. |
| `components/ui/portion-panel.tsx:197` | ``{ id: "fat", value: `${formatAmount(macroPreview.fat, "g")} g`, label: "Béo" }`` | ``{ id: "fat", value: `${formatAmount(macroPreview.fat, "g")} g`, label: "Chất béo" }`` | Đồng nhất nhãn `"Chất béo"` trong bảng chọn khẩu phần. |
| `app/foods/[id]/page.tsx:221` | ``{ id: "fat", value: `${formatAmount(macros.fat, "g")} g`, label: "Béo" }`` | ``{ id: "fat", value: `${formatAmount(macros.fat, "g")} g`, label: "Chất béo" }`` | Đồng nhất nhãn `"Chất béo"` trên trang chi tiết món. |
| `app/foods/new/page.tsx:50` | `if (!val.trim()) err = "Vui lòng nhập tên món ăn.";` | `if (!val.trim()) err = "Nhập tên món ăn";` | Bỏ `"Vui lòng"`, đồng nhất kiểu câu ngắn gọn với các thông báo lỗi khác (`"Nhập mật khẩu"`, `"Nhập kcal lớn hơn 0"`). |
| `app/foods/new/page.tsx:57` | `if (isNaN(num) || num < 0) err = "Năng lượng không hợp lệ.";` | `if (isNaN(num) || num < 0) err = "Nhập số năng lượng từ 0 trở lên";` | Cho biết rõ cách sửa thay vì chỉ báo `"không hợp lệ"`. |
| `app/foods/new/page.tsx:256` | `<FormRow label="Béo (g)" htmlFor="cf-fat">` | `<FormRow label="Chất béo (g)" htmlFor="cf-fat">` | Đồng nhất nhãn `"Chất béo (g)"`. |

### 2.6. Cài đặt (`/settings/*`), Paywall (`/paywall`), PWA (`/install`) & Quản trị (`/admin/review`)

| file:line | current | proposed | why |
|---|---|---|---|
| `app/settings/notifications/page.tsx:32` | `label: "Nhắc ghi bữa sáng"` | `label: "Nhắc thêm bữa sáng"` | Đồng nhất động từ `"thêm bữa"` theo bảng thuật ngữ. |
| `app/settings/notifications/page.tsx:39` | `label: "Nhắc ghi bữa trưa"` | `label: "Nhắc thêm bữa trưa"` | Đồng nhất động từ `"thêm bữa"` theo bảng thuật ngữ. |
| `app/settings/notifications/page.tsx:46` | `label: "Nhắc ghi bữa tối"` | `label: "Nhắc thêm bữa tối"` | Đồng nhất động từ `"thêm bữa"` theo bảng thuật ngữ. |
| `app/settings/notifications/page.tsx:102` | `setPermissionStatus("Trình duyệt từ chối quyền thông báo");` | `setPermissionStatus("Trình duyệt đang chặn thông báo. Bạn mở cài đặt trình duyệt để cấp quyền nhé.");` | Hướng dẫn bước tiếp theo khi quyền thông báo bị từ chối. |
| `app/settings/delete-account/page.tsx:29` | `setToastMessage("Chưa hỗ trợ xoá tài khoản trong bản thử");` | `setToastMessage("Bản thử chưa hỗ trợ xoá tài khoản. Dữ liệu hiện chỉ lưu trên thiết bị của bạn.");` | Giải thích rõ ràng và trấn an bạn về dữ liệu trên máy. |
| `app/settings/delete-account/page.tsx:36` | `setToastMessage("Chưa hỗ trợ tải dữ liệu trong bản thử");` | `setToastMessage("Tính năng tải CSV sẽ mở khi kết nối máy chủ.");` | Giải thích cụ thể khi nào tính năng khả dụng. |
| `app/paywall/page.tsx:59` | `"Sắp ra mắt"` | `"Sắp ra mắt — bạn sẽ được thông báo khi mở đăng ký."` | Thêm bước tiếp theo rõ ràng thay vì câu cụt. |
| `app/paywall/page.tsx:67` | `"Gói miễn phí vẫn ghi đủ 22 vi chất."` | `"Gói miễn phí vẫn theo dõi đủ 22 vi chất."` | Vi chất là chỉ số được theo dõi tự động từ món ăn, dùng `"theo dõi"` tự nhiên hơn `"ghi"`. |
| `lib/data-sources.ts:16` | `"Bộ Nông nghiệp Hoa Kỳ; cơ sở dữ liệu thành phần thực phẩm, có số liệu vi chất."` | `"Bộ Nông nghiệp Hoa Kỳ; cơ sở dữ liệu thành phần thực phẩm có đầy đủ dữ liệu vi chất."` | Câu văn tự nhiên và đồng nhất từ `"dữ liệu"`. |
| `lib/data-sources.ts:26` | `"Viện Dinh dưỡng Quốc gia Việt Nam; số liệu dinh dưỡng cho các món ăn và nguyên liệu địa phương."` | `"Viện Dinh dưỡng Quốc gia Việt Nam; dữ liệu dinh dưỡng cho các món ăn và nguyên liệu Việt Nam."` | Tự nhiên hơn cụm `"nguyên liệu địa phương"` (dịch sát từ `"local ingredients"`). |
| `app/admin/review/page.tsx:64` | `"Khu vực quản trị"` | `"Quản trị nội dung"` | Ngắn gọn, đúng chức năng trang thay vì dùng từ hành chính `"Khu vực"`. |
| `app/admin/review/page.tsx:70` | `"Xem và duyệt các bản nháp thực đơn đồng bộ từ kho lưu trữ."` | `"Xem và duyệt các bản nháp thực đơn gửi từ kho nội dung."` | Tự nhiên, bớt mùi kỹ thuật máy móc (`"đồng bộ từ kho lưu trữ"`). |

---

## 3. Các chuỗi đang được kiểm tra trong `tests/probes/*.py` (cần cập nhật cùng lúc khi sửa code)

Khi lập trình viên áp dụng các thay đổi trong bảng trên, cần cập nhật đồng thời các bài kiểm tra tự động sau trong `apps/web/tests/probes/*.py`:

1. **`tests/probes/cc2_15.py:171` & `tests/probes/cc2_15b.py:144`**:
   - Đang kiểm tra `pg.get_by_role("link", name="Bắt đầu ghi bữa đầu tiên")` → cập nhật thành `"Thêm bữa đầu tiên"` (khớp với `components/onboarding/setup-summary.tsx:32,71`).
2. **`tests/probes/cc2_11.py:160`**:
   - Đang tách phần trăm bằng biểu thức chính quy có khoảng trắng `re.search(r"(\d+) %", c)` trên các thẻ `Nguồn tốt của` (`components/foods/food-micros.tsx:70`) → cập nhật thành `re.search(r"(\d+)\s*%", c)` để khớp với `"50%"` không khoảng trắng.
   - Lưu ý thêm tại `tests/probes/cc2_11.py:135`: phép kiểm tra `"% mục tiêu ngày" in first` vẫn khớp với `"${row.pct}% mục tiêu ngày"`, không bị gãy.
3. **`tests/probes/ag06.py:120`**:
   - Đang kiểm tra `"Gói miễn phí vẫn ghi đủ 22 vi chất." in txt` → cập nhật thành `"Gói miễn phí vẫn theo dõi đủ 22 vi chất."` (khớp với `app/paywall/page.tsx:67`).
4. **`tests/probes/cc12.py:197`**:
   - Đối chiếu văn bản hiển thị trên trang với văn bản tĩnh trong `design/screens/*.dc.html` và ghi các dòng khác biệt ra `.screenshots/cc12-copy-report.txt` (không làm fail probe, nhưng nếu đổi `"Béo"` → `"Chất béo"` trên màn hình Nhật ký / Chi tiết món / Sửa món / Tạo món mới thì báo cáo parity sẽ ghi nhận sự khác biệt so với file thiết kế `.dc.html`).

---

## 4. Tổng kết số lượng chuỗi (Totals)

- **Tổng số chuỗi tiếng Việt hiển thị cho người dùng đã rà soát**: **542** chuỗi (trên 101 tệp nguồn trong `apps/web/app`, `apps/web/components`, `apps/web/lib`, `apps/web/hooks`).
- **Số chuỗi đề xuất chỉnh sửa (Changed)**: **60** chuỗi (48 dòng giữ nguyên từ `ag-16` vì khớp chính xác; 12 dòng cập nhật số dòng hoặc văn bản thực tế trong mã nguồn).
- **Số chuỗi đạt chuẩn giữ nguyên (Unchanged / OK)**: **482** chuỗi (88,9% đã tuân thủ đúng giọng điệu ấm áp, ngắn gọn, xưng `"bạn"`, dùng `"Tinh bột"`, `"huấn luyện viên"`, `"Bữa ăn của tôi"`, `"Xoá"`, `"Tuỳ"` và định dạng số `vi-VN`).

---

## 5. Removed (not found)

Các dòng dưới đây từ bảng `ag-16` đã được gỡ khỏi bảng đề xuất chỉnh sửa (11 dòng không tồn tại hoặc đã được sửa trong mã nguồn tại commit `b80896c`, và 2 dòng khẩu hiệu thương hiệu HIT 1 SET giữ nguyên theo quy tắc #3):

1. `app/error.tsx:26` — `"Không thể kết nối máy chủ dinh dưỡng lúc này. Dữ liệu bạn vừa ghi trên máy vẫn được giữ nguyên."` (không có trong mã nguồn; văn bản thực tế tại `app/error.tsx:47` là `"Máy chủ đang bận. Dữ liệu bạn đã ghi vẫn an toàn trên máy."`, đã tự nhiên và ngắn gọn).
2. `app/not-found.tsx:16` — `"Liên kết này không tồn tại hoặc đã được chuyển sang mục khác."` (không có trong mã nguồn; văn bản thực tế tại `app/not-found.tsx:20` là `"Đường dẫn có thể đã cũ hoặc bị gõ sai."` kèm nút `"Về Tổng quan"` ngay bên dưới, đã đạt chuẩn).
3. `app/signup/page.tsx:20` — `label="1 set là đủ"` (gỡ theo quy tắc #3: giữ nguyên văn bản thương hiệu HIT 1 SET).
4. `app/signup/page.tsx:23` — `"1 SET LÀ ĐỦ"` (gỡ theo quy tắc #3: giữ nguyên văn bản thương hiệu HIT 1 SET).
5. `app/login/page.tsx:16` — `"Chế độ phát triển (Mock Auth)"` (tệp `app/login/page.tsx` không tồn tại trong `apps/web`).
6. `app/login/page.tsx:36` — `"Vào thẳng ứng dụng (Mock User)"` (tệp `app/login/page.tsx` không tồn tại trong `apps/web`).
7. `components/onboarding/setup-form.tsx:151` — `"Bước 1/2 · Về bạn"` (không còn trong mã nguồn; đã được sửa trong `cc2-25` thành `{isProfile ? "Bước 1 / 2 · Về bạn" : "Bước 2 / 2 · Mục tiêu"}`).
8. `lib/auth-actions.ts:192` — `"Bạn đang ngoại tuyến"` (không tồn tại trong `lib/auth-actions.ts`).
9. `components/overview/body-tab.tsx:184` — `sub="Không đổi theo cân"` (không có trong `components/overview/body-tab.tsx`; dòng thực tế tại `body-tab.tsx:237` là `"không đổi"`, đã ngắn gọn).
10. `components/diary/diary-screen.tsx:252` — `{ key: "fat", label: "Béo", color: "bg-amber" }` (không tồn tại trong `components/diary/diary-screen.tsx`; nhãn đa lượng lấy từ `lib/mock/sample-day.ts:172`).
11. `lib/data-sources.ts:35` — `"Cần định lượng chính xác"` (không tồn tại trong `lib/data-sources.ts`; văn bản thực tế tại `lib/data-sources.ts:36` là `title: "Cách đọc số liệu"`, đã đạt chuẩn).
12. `lib/data-sources.ts:36` — `"Số liệu món ăn là ước tính trung bình theo 100 g phần ăn được."` (không tồn tại trong `lib/data-sources.ts`; văn bản thực tế tại `lib/data-sources.ts:37` là `"Ký hiệu “—” nghĩa là chưa có dữ liệu từ nguồn phân tích, không phải bằng 0."`, đã đạt chuẩn).
13. `lib/data-sources.ts:37` — `"Tất cả thực phẩm người dùng đóng góp đều được duyệt thủ công trước khi hiển thị công khai."` (không tồn tại trong `lib/data-sources.ts`; văn bản thực tế tại `lib/data-sources.ts:38` là `"Vi chất chưa có dữ liệu không được tính là 0 trong tổng ngày, tránh làm sai lệch đánh giá dinh dưỡng."`, đã đạt chuẩn).
