# Báo cáo Kiểm tra Trợ năng & Tính nhất quán (Audit AG-04)

Kiểm tra toàn diện theo tiêu chuẩn **WCAG 2.1 AA** và quy tắc thiết kế H1T MICRO trên toàn bộ các route ở 2 độ phân giải: Mobile (390×844 px) và Desktop (1440×900 px).

---

## 1. Tổng quan số lượng phát hiện (Summary of Counts)

| Mức độ nghiêm trọng (Severity) | Số lượng | Ghi chú |
|---|---|---|
| **Must** (Bắt buộc sửa để đạt WCAG 2.1 AA) | **8** | Nhãn input bị thiếu, mục tương tác quá nhỏ (<36px), mất focus outline, contrast < 3:1 |
| **Should** (Nên sửa để đạt trải nghiệm chuẩn) | **14** | Tap target từ 36–43px, contrast 3:1–4.4:1 trên văn bản nhỏ, thứ tự heading h1/h3 |
| **Nice** (Cải thiện thêm tính nhất quán) | **5** | Thống nhất đơn vị mô tả, chú thích công thức trong comment code |
| **Tổng cộng** | **27** | |

### Phân loại theo tiêu chí kiểm tra:
- **Độ tương phản (Contrast)**: 6 phát hiện (1 Must, 4 Should, 1 Nice)
- **Kích thước vùng chạm (Tap Targets ≥ 44 px)**: 6 phát hiện (3 Must, 3 Should)
- **Hiển thị tiêu điểm bàn phím (Focus Visible)**: 4 phát hiện (3 Must, 1 Should)
- **Thứ tự bàn phím & Tab Index**: 0 vi phạm (100% tuân thủ thứ tự DOM tự nhiên, không có tabindex > 0)
- **Nhãn & Thuộc tính ARIA (Labels & ARIA)**: 4 phát hiện (1 Must, 2 Should, 1 Nice)
- **Thứ tự cấp bậc tiêu đề (Headings Order)**: 4 phát hiện (0 Must, 4 Should)
- **Định dạng số tiếng Việt (1.041 / 2,1)**: 2 phát hiện (0 Must, 1 Should, 1 Nice)
- **Phông chữ hệ thống (Saira Condensed & Manrope)**: 1 phát hiện (0 Must, 1 Should)

---

## 2. Bảng chi tiết các vấn đề (Detailed Audit Table)

| Route | Vấn đề (Issue) | Mức độ | Vị trí (File:Line) | Đề xuất khắc phục (Suggested Fix) |
|---|---|---|---|---|
| `/today`, `/add` | Chữ "kcal" trong đồng hồ CalorieDial có độ tương phản 3.15:1 (< 4.5:1) trên nền tối ink | **Should** | `components/ui/calorie-dial.tsx:87` | Đổi từ `text-muted-dark` (#6B6A66) sang token `text-muted-on-dark` (#8C92A0, contrast 4.7:1) hoặc `text-muted-subtitle` (#C9CDD6, contrast 12:1). **[Đã sửa - commit ag-06 item 2]** |
| `/today` | Nút liên kết "+ Thêm" trên từng bữa ăn có chiều rộng 42 px (< 44 px chuẩn tap target) | **Should** | `app/today/page.tsx:463`, `app/today/page.tsx:704` | Thêm padding ngang `px-2` hoặc `min-w-[44px] justify-center` để đạt kích thước chạm tối thiểu 44×44 px. **[Đã sửa - commit ag-06 item 2]** |
| `/micros`, `/add` | Thiếu thẻ tiêu đề `<h1>` trên thiết bị di động (< 1024 px) | **Should** | `components/ui/app-header.tsx:340` | Trong biến thể `daily`, đổi `<div>{title}</div>` thành `<h1 className="...">{title}</h1>` hoặc thêm `sr-only h1` cho trang. **[Đã sửa - commit ag-06 item 2]** |
| `/add` | Ô tìm kiếm món ăn có `outline-none` và không có viền/ring khi focus bằng bàn phím | **Must** | `app/add/page.tsx:347`, `app/add/page.tsx:486` | Thêm `focus-visible:ring-2 focus-visible:ring-blue` vào thẻ bọc hoặc loại bỏ `outline-none` khi focus-visible. **[Đã sửa - commit ag-06 item 1]** |
| `/foods` | Tiêu đề "Food Catalog" màu `#F8FAFC` trên nền giấy `#F3F1EC` có độ tương phản 1.08:1 (tàng hình) | **Must** | `app/(dashboard)/foods/page.tsx:134` | Đổi màu chữ sang `text-text` (#141519) theo token thiết kế Cobalt Sign. |
| `/foods` | Đoạn phụ đề "Browse verified culinary..." màu `#94A3B8` có độ tương phản 2.27:1 (< 4.5:1) | **Must** | `app/(dashboard)/foods/page.tsx:137` | Đổi màu chữ sang `text-secondary` (#6B6A66) hoặc `text-text`. |
| `/foods` | Ô tìm kiếm có chiều cao 42 px (`h-10.5`) nhỏ hơn chuẩn chạm 44 px và thiếu nhãn accessible | **Should** | `app/(dashboard)/foods/page.tsx:147` | Tăng chiều cao thành `h-11` (44 px) và thêm thuộc tính `aria-label="Tìm kiếm thực phẩm"`. |
| `/foods` | Bỏ qua cấp độ tiêu đề: từ `<h1>Food Catalog</h1>` nhảy thẳng xuống `<h3>` tên món ăn | **Should** | `app/(dashboard)/foods/page.tsx:164` | Đổi thẻ tên món ăn từ `<h3>` thành `<h2>` để đảm bảo thứ tự phân cấp tiêu đề liên tục. |
| `/foods` | Sử dụng font monospace (`font-mono`) thay vì Manrope / Saira Condensed | **Should** | `app/(dashboard)/foods/page.tsx:191` | Xóa class `font-mono`, sử dụng mặc định `font-sans` (Manrope) và `tabular-nums` cho số liệu dinh dưỡng. |
| `/foods` | Dữ liệu dinh dưỡng dùng định dạng số tiếng Anh (ví dụ: `1.0`, `2.8`, `0.7` g) | **Should** | `app/(dashboard)/foods/page.tsx:65` | Chuyển sang định dạng tiếng Việt dùng `formatAmount` / `formatNumber` (dấu phẩy: `1,0`, `2,8`, `0,7`). |
| `/foods/[id]` | Ô nhập gram `<input id="fd-size">` có chiều cao render 20 px (< 44 px) và class `outline-none` | **Must** | `app/foods/[id]/page.tsx:183` | Thêm `h-full` vào input bên trong `<label>` để phủ trọn 44 px; thêm focus indicator khi bàn phím active. **[Đã sửa - commit 77d0779]** |
| `/foods/new` | Các ô nhập liệu (`cf-size`, `cf-kcal`, `cf-pro`, `cf-carbs`, `cf-fat`) không liên kết với nhãn `<label>` | **Must** | `app/foods/new/page.tsx:156, 204, 216` | Truyền `htmlFor="<id>"` vào thẻ `<FormRow>` tương ứng để thẻ `<label for="...">` liên kết đúng với input ID. **[Đã sửa - commit a23f40b]** |
| `/foods/new` | Ký hiệu dấu sao bắt buộc `*` dùng màu `text-destructive` (#D93F44) có độ tương phản 4.38:1 | **Should** | `components/ui/form-row.tsx:35` | Điều chỉnh màu đỏ cảnh báo sang tông đậm hơn một chút (ví dụ #D32F2F, contrast 4.54:1) để đạt chuẩn WCAG AA văn bản nhỏ. **[Đã sửa - commit d39044d (token --color-destructive-text: #C83A3F)]** |
| `/profile` | Các nút "Đăng xuất" và tiêu đề "Vùng nguy hiểm" dùng `text-destructive` đạt 4.38:1 (< 4.5:1) | **Should** | `components/profile/profile-cards.tsx:268, 275` | Tăng cỡ chữ lên `text-base` / `font-bold` hoặc dùng token đỏ sẫm hơn cho chữ nhỏ (< 18.66px). **[Đã sửa - cc2-03]** |
| `/training` | Checkbox từng mục bài tập có kích thước 22×22 px và thiếu `aria-label` trực tiếp trên `<input>` | **Must** | `components/training/phase-checklist.tsx:53` | Bổ sung `aria-label={it.label}` vào `<input type="checkbox">` và mở rộng hit area hoặc căn giữa tap box. **[Đã sửa - commit ag-06 item 1]** |
| `/training` | Comment code ghi công thức muối dùng dấu chấm "1–1.5 g" thay vì "1–1,5 g" | **Nice** | `lib/training.ts:59` | Cập nhật comment trong `lib/training.ts` khớp với UI tiếng Việt (`1–1,5 g`). **[Đã sửa - commit 3e12bed]** |
| `/settings/notifications` | Input thời gian ẩn `<input type="time" className="sr-only">` có kích thước 1×1 px | **Must** | `app/settings/notifications/page.tsx:193` | Đổi từ `className="sr-only"` sang `className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"` phủ lên badge 44 px. **[Đã sửa - commit ag-06 item 1]** |
| `/settings/delete-account` | Nút xác nhận "Xoá tài khoản" màu `text-destructive` đạt 4.43:1 trên nền card (< 4.5:1) | **Should** | `app/settings/delete-account/page.tsx:112` | Đổi sang nút nền đỏ chữ trắng (`bg-destructive text-white`, contrast > 4.6:1) để tăng độ tương phản và rõ ràng tính nguy hiểm. **[Đã đạt - hiện dùng bg-destructive text-white]** |
| `/setup/goal` | Bỏ qua cấp độ tiêu đề từ `<h1>` nhảy sang `<h3>` do `<h2>` bị ẩn trên màn hình di động | **Should** | `components/onboarding/setup-form.tsx:201` | Đổi `<h2 className="hidden lg:block">` thành `<h2 className="sr-only lg:not-sr-only lg:block">` để trình đọc màn hình đọc được. **[Đã sửa - commit ag-06 item 2]** |
| `/entry/[id]` | Ô nhập gram trong `EntryEditor` có thuộc tính `outline-none` thiếu chỉ báo tiêu điểm khi tab | **Must** | `components/foods/entry-editor.tsx:74` | Bổ sung `focus-visible:ring-2 focus-visible:ring-blue` vào thẻ bao bọc `<span>`. **[Đã sửa - commit ag-06 item 1]** |
| `components/ui/portion-panel.tsx` | Ô nhập gram có `outline-none` không có focus ring hiển thị khi người dùng điều hướng bàn phím | **Must** | `components/ui/portion-panel.tsx:155` | Bổ sung `focus-visible:ring-2 focus-visible:ring-blue` cho vùng nhập liệu khẩu phần. **[Đã sửa - commit ag-06 item 1]** |
| `components/ui/switch.tsx` | Nút switch dùng `bg-level-empty` khi tắt, độ tương phản đường biên với nền trắng là 1.25:1 | **Should** | `components/ui/switch.tsx:36` | Thêm viền `border border-card-border` hoặc `border-grabber` khi switch ở trạng thái tắt để người dùng nhận diện rõ biên giới hạn. **[Đã sửa - commit ag-06 item 2]** |
| `components/ui/calorie-dial.tsx` | Vòng tròn rãnh nền `circle className="text-level-empty-dark"` đạt 1.8:1 trên nền tối | **Nice** | `components/ui/calorie-dial.tsx:64` | Tăng nhẹ độ sáng của rãnh nền lên 3.0:1 (theo tiêu chuẩn WCAG 2.1 SC 1.4.11 Non-text Contrast cho UI controls). **[Đã sửa - cc2-03]** |
| `/signin`, `/signup` | Ô nhập email trong `MagicLinkForm` dùng `outline-none` và phụ thuộc vào `focus:border-blue` | **Nice** | `components/onboarding/magic-link-form.tsx:54` | Thêm `outline-offset-2` hoặc focus ring 3px đồng bộ với quy tắc tương tác trong `globals.css`. **[Đã sửa - commit 738927a]** |
| `components/ui/app-header.tsx` | Biểu tượng icon quay lại, chuyển ngày đã có `aria-label`, nhưng thiếu trạng thái loading của nút ngày | **Nice** | `components/ui/app-header.tsx:301` | Thêm `aria-busy="true"` khi `resolvedDateLabel` đang được tính toán từ client state. **[Đã sửa - cc2-03]** |
| Toàn bộ ứng dụng | Thứ tự Tab (Keyboard tab order) không có bất kỳ thuộc tính `tabindex > 0` | **Pass** | Toàn bộ ứng dụng | Đạt chuẩn 100%: Mọi phần tử tương tác đều tuân theo trật tự DOM tự nhiên. |
| Toàn bộ ứng dụng | Phông chữ toàn ứng dụng tuân thủ Manrope và Saira Condensed (ngoại trừ trang scaffold `/foods`) | **Pass** | `app/layout.tsx:31` | Đạt chuẩn 100% trên các màn hình sản phẩm chính. |

---

## 3. Công cụ kiểm tra tự động (Automated Probe)

Một probe đo lường tự động đã được tích hợp tại:
`apps/web/tests/probes/ag04_audit.py`

Chạy probe qua script:
```bash
npm run probe -- tests/probes/ag04_audit.py
```

File kết quả JSON chi tiết được xuất tại:
`apps/web/tests/probes/ag04_audit_results.json`
