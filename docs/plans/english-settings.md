# Cài đặt (settings/profile) strings: full list

Complete list of Vietnamese-diacritic strings in the Cài đặt area, to be extracted fully as the proof. Source: `tools/extract.cjs` over the TypeScript AST (JSX text, string and template literals, JSX attributes), then a second pass for visible strings without diacritics (part D). Line numbers are for main at `8eeb7b7`.

**290 strings** in **23 files**, 229 distinct. Plus 1 metadata string(s) in settings routes (counted under SEO, part E) and about 20 visible strings without diacritics (part D). The count in summary.json (`settingsStrings`) is 290.

Columns: **line**, **where** (text = JSX text; attribute name; `prop x` = object property; `expr in JSX` = literal inside `{...}`; `call x` = argument of a call), **type** (toast, status message, error/validation, confirm dialog), **flags** (`I` interpolated template, `P` plural candidate, `N` text next to nested JSX element, `E` text around a `{expr}`), **text**.

## A. Routes and files

| Route | Screen file | Notes |
|---|---|---|
| /settings (tab) | components/settings/settings-home-screen.tsx | app/(app)/(tabs)/settings/page.tsx is a 5-line wrapper; @sheet/settings/page.tsx re-exports the default slot (no strings) |
| /settings/profile | components/settings/profile-edit-screen.tsx + profile-cards.tsx | cards: birth year, sex, weight, goal, default training day, Bự/Bé group, app preferences, legal links |
| /settings/profile/weight | app/(app)/settings/profile/weight/page.tsx | page holds its own UI |
| /settings/targets | components/settings/targets-screen.tsx + target-rows.ts | read-only target list, custom-target entry |
| /settings/targets/macros | components/settings/macro-targets-screen.tsx (453 LOC) | macro split editor, presets from lib/targets.ts |
| /settings/account | components/settings/account-screen.tsx | uses lib/display-name.ts, lib/sign-out-flow.ts, components/sync/sync-list.tsx |
| /settings/account/password | components/settings/password-screen.tsx | uses components/auth/* |
| /settings/coach | components/settings/coach-screen.tsx | join / leave coach; uses lib/level-copy.ts |
| /settings/notifications | app/(app)/settings/notifications/page.tsx (251 LOC) | reminder switches, browser permission |
| /settings/language | app/(app)/settings/language/page.tsx | language, decimal separator, energy unit radios (persisted, not yet consumed) |
| /settings/data-sources | app/(app)/settings/data-sources/page.tsx + lib/data-sources.ts | metadata export counted under SEO |
| /settings/delete-account | app/(app)/settings/delete-account/page.tsx | typed confirmation |
| /settings/whats-new | app/(app)/settings/whats-new/page.tsx | page chrome only; release text is in lib/releases.ts (Release notes area) |
| (sheets) | components/settings/sign-out-confirm.tsx, custom-target-sheet.tsx | confirm and edit sheets |

Files with no Vietnamese-diacritic string but part of the area: settings-icons.tsx, settings-row.tsx, use-account.ts, components/profile/level-badge.tsx (hard-coded "LEVEL" and `Level ${level}` aria-label, see D), app/(app)/settings/{account,coach,profile,targets,targets/macros,account/password}/page.tsx wrappers.

| File | strings |
|---|---:|
| `components/settings/profile-cards.tsx` | 51 |
| `components/settings/macro-targets-screen.tsx` | 38 |
| `app/(app)/settings/notifications/page.tsx` | 25 |
| `app/(app)/settings/delete-account/page.tsx` | 20 |
| `components/settings/settings-home-screen.tsx` | 17 |
| `components/settings/targets-screen.tsx` | 16 |
| `components/settings/target-rows.ts` | 14 |
| `app/(app)/settings/profile/weight/page.tsx` | 13 |
| `components/settings/account-screen.tsx` | 13 |
| `components/settings/sign-out-confirm.tsx` | 12 |
| `components/settings/coach-screen.tsx` | 10 |
| `lib/data-sources.ts` | 10 |
| `app/(app)/settings/language/page.tsx` | 9 |
| `components/settings/password-screen.tsx` | 9 |
| `lib/targets.ts` | 7 |
| `app/(app)/settings/whats-new/page.tsx` | 6 |
| `components/settings/custom-target-sheet.tsx` | 6 |
| `components/settings/profile-edit-screen.tsx` | 3 |
| `lib/custom-targets.ts` | 3 |
| `lib/display-name.ts` | 3 |
| `app/(app)/settings/data-sources/page.tsx` | 2 |
| `components/settings/profile-summary.ts` | 2 |
| `lib/sign-out-flow.ts` | 1 |
| **Total** | **290** |

Breakdown: attributes 103, text 75, literals/other 112. Attribute strings by name: label 32, aria-label 23, title 20, hint 10, backLabel 5, reason 4, placeholder 2, subtitle 2, unit 2, note 2, aria-valuetext 1.
Flags: interpolated 21, plural candidates 6, nested-JSX 5, expr-interleaved 13.

## B. Every string, by file

### `app/(app)/settings/data-sources/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 17 | title |  |  | Nguồn dữ liệu |
| 25 | text |  |  | Các cơ sở dữ liệu dinh dưỡng |

### `app/(app)/settings/delete-account/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 14 | literal |  |  | Nhật ký bữa ăn và ngày tập |
| 15 | literal |  |  | Món và công thức bạn tự tạo |
| 16 | literal |  |  | Hồ sơ, cân nặng và mục tiêu |
| 17 | literal |  |  | Cài đặt nhắc nhở |
| 27 | literal | confirm dialog |  | XOÁ |
| 30 | literal | confirm dialog |  | XÓA |
| 34 | call setToastMessage | toast |  | Bản thử chưa hỗ trợ xóa tài khoản. Dữ liệu hiện chỉ lưu trên thiết bị của bạn. |
| 41 | call setToastMessage | toast |  | Tính năng tải CSV sẽ mở khi kết nối máy chủ. |
| 52 | title | confirm dialog |  | Xóa tài khoản |
| 54 | backLabel |  |  | Quay lại |
| 78 | text | confirm dialog |  | Xóa vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục. |
| 89 | text | confirm dialog |  | Khi nào xong |
| 91 | text | confirm dialog |  | Tài khoản được xóa ngay khi bạn xác nhận. Xong thì bạn được đăng xuất và quay về trang đăng nhập. |
| 102 | text |  |  | Tải dữ liệu về (CSV) |
| 104 | text |  |  | Nên tải trước, vì xóa xong không lấy lại được. |
| 109 | text | confirm dialog | N | Gõ Xóa để xác nhận |
| 114 | placeholder | confirm dialog |  | Xóa |
| 134 | expr in JSX | confirm dialog |  | Gõ Xóa vào ô trên để mở nút xóa. |
| 138 | text | confirm dialog |  | Hủy |
| 149 | text | confirm dialog |  | Xóa tài khoản |

### `app/(app)/settings/language/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 89 | title |  |  | Ngôn ngữ |
| 91 | backLabel |  |  | Quay lại |
| 98 | title |  |  | Ngôn ngữ |
| 100 | prop label |  |  | Tiếng Việt |
| 109 | title |  |  | Đơn vị · Dấu thập phân |
| 111 | prop label |  |  | Dấu phẩy (2,5) |
| 112 | prop label |  |  | Dấu chấm (2.5) |
| 120 | title |  |  | Đơn vị · Năng lượng |
| 130 | text |  |  | Tự động lưu |

### `app/(app)/settings/notifications/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 47 | prop label |  |  | Nhắc thêm bữa sáng |
| 55 | prop label |  |  | Nhắc thêm bữa trưa |
| 63 | prop label |  |  | Nhắc thêm bữa tối |
| 71 | prop label |  |  | Nhắc muối khi tập |
| 72 | prop hint |  |  | Mỗi 20 phút |
| 78 | prop label |  |  | Tổng kết tối |
| 123 | literal | status message |  | Đã bật quyền thông báo |
| 125 | literal | status message |  | Trình duyệt đang chặn thông báo. Bạn mở cài đặt trình duyệt để cấp quyền nhé. |
| 128 | literal | status message |  | Đã bật quyền thông báo |
| 131 | literal | status message |  | Đã bật quyền thông báo |
| 138 | title |  |  | Nhắc nhở |
| 138 | backLabel |  |  | Quay lại |
| 145 | text |  |  | Nhận nhắc ghi bữa ăn |
| 146 | text |  |  | Bật thông báo để nhắc bạn ghi bữa ăn và bổ sung muối khi tập. |
| 147 | text |  |  | Bạn bật hoặc tắt từng loại nhắc nhở ở màn hình trước. |
| 150 | text |  |  | Bật thông báo |
| 153 | text |  |  | Để sau |
| 165 | title |  |  | Nhắc nhở |
| 167 | backLabel |  |  | Quay lại |
| 173 | aria-label |  |  | Quyền thông báo |
| 177 | text |  |  | Thông báo cần quyền của trình duyệt |
| 191 | text |  |  | Bật quyền thông báo |
| 199 | aria-label |  |  | Các loại nhắc nhở |
| 204 | expr in JSX |  | I | Đổi giờ ${row.label}, hiện tại ${timeVal} |
| 246 | text |  |  | Tự động lưu |

### `app/(app)/settings/profile/weight/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 63 | aria-label |  |  | Cân nặng hôm nay |
| 64 | label |  |  | Cân nặng hôm nay |
| 69 | aria-label |  |  | Giảm 0,1 kg |
| 92 | aria-label |  |  | Tăng 0,1 kg |
| 99 | text |  |  | Dùng để tính kcal, đạm và chất béo mỗi ngày. |
| 103 | aria-label |  |  | Mục tiêu sẽ cập nhật |
| 104 | text |  |  | Mục tiêu sẽ cập nhật |
| 107 | label |  |  | Năng lượng |
| 108 | label |  |  | Đạm |
| 117 | text |  |  | Nhập cân nặng để xem mục tiêu |
| 119 | text |  |  | Tính lại theo cân nặng mới. |
| 123 | text |  |  | Lưu |
| 130 | title |  |  | Cân nặng |

### `app/(app)/settings/whats-new/page.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 31 | title |  |  | Có gì mới |
| 32 | subtitle |  | I | Cập nhật gần nhất ${RELEASES[0].date} |
| 34 | backLabel |  |  | Quay lại |
| 41 | text |  | E | Cập nhật |
| 49 | text |  |  | Xem hướng dẫn |
| 52 | text |  | PE | bước trên Hôm nay. Bạn bỏ qua được ở mọi bước. |

### `components/settings/account-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 42 | call setError | error/validation |  | Đã lưu trên máy này, chưa gửi lên máy chủ được. Thử lại sau. |
| 47 | label |  |  | Tên hiển thị |
| 49 | hint |  |  | Hiện trên ảnh chia sẻ |
| 80 | aria-label |  |  | Tài khoản |
| 81 | text |  |  | Bạn chưa đăng nhập. |
| 86 | text |  |  | Đăng nhập |
| 110 | prop error | error/validation |  | Chưa đăng xuất được. Kiểm tra mạng rồi thử lại nhé. |
| 129 | prop error | error/validation |  | Chưa kiểm tra được món nào chưa lưu. Kiểm tra mạng rồi thử lại nhé. |
| 154 | title |  |  | Tài khoản |
| 160 | aria-label |  |  | Thông tin tài khoản |
| 174 | label |  |  | Đổi mật khẩu |
| 174 | label |  |  | Đặt mật khẩu |
| 182 | text |  |  | Đăng xuất |

### `components/settings/coach-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 42 | title |  |  | Huấn luyện viên |
| 51 | text |  |  | Nhập mã để HLV theo dõi và mở thêm chỉ số trong Hôm nay. |
| 53 | label |  |  | Mã huấn luyện viên |
| 65 | placeholder |  |  | Mã gồm 10 ký tự |
| 88 | text |  |  | Level là gì? |
| 92 | text |  |  | Rời HLV |
| 99 | title | confirm dialog |  | Rời huấn luyện viên? |
| 109 | expr in JSX | confirm dialog | I | Rời ${coach.name} |
| 109 | expr in JSX | confirm dialog |  | Rời HLV |
| 112 | text | confirm dialog |  | Hủy |

### `components/settings/custom-target-sheet.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 47 | title |  | I | Mục tiêu ${row.label} |
| 47 | title |  |  | Mục tiêu |
| 57 | expr in JSX |  | I | Mặc định: ${formatAmount(row.defaultValue, unit)} ${unit}${row.detail ? ' (${row.detail})' : ""}. |
| 61 | text |  | NE | Mục tiêu mỗi ngày ( |
| 81 | text |  |  | Lưu |
| 84 | text |  |  | Về mặc định |

### `components/settings/macro-targets-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 93 | aria-valuetext |  | I | ${value} phần trăm |
| 141 | title |  |  | Mục tiêu đa lượng |
| 144 | text |  |  | Huỷ |
| 155 | text |  | N | Lưu |
| 155 | text |  |  | mục tiêu đa lượng |
| 261 | call notify | toast |  | Đã lưu mục tiêu đa lượng mới |
| 279 | call notify | toast |  | Đã lưu mục tiêu đa lượng mới |
| 302 | prop name |  |  | Đạm |
| 302 | prop word |  |  | đạm |
| 302 | prop fixedAria |  |  | Số gram đạm cố định |
| 303 | prop name |  |  | Tinh bột |
| 303 | prop word |  |  | tinh bột |
| 303 | prop fixedAria |  |  | Số gram tinh bột cố định |
| 304 | prop name |  |  | Chất béo |
| 304 | prop word |  |  | chất béo |
| 304 | prop fixedAria |  |  | Số gram chất béo cố định |
| 315 | text |  |  | Chia tỉ lệ đạm, tinh bột và chất béo theo mục tiêu của bạn |
| 319 | text |  |  | Mục tiêu năng lượng |
| 321 | text |  |  | Năng lượng mục tiêu |
| 328 | text |  | E | Tính từ hồ sơ ( |
| 328 | text |  | E | kg) và mục tiêu thể trạng. Số kcal này dùng làm cơ sở chia các chất đa lượng. |
| 335 | text |  |  | Chia theo đa lượng |
| 336 | text |  |  | Chọn phương pháp phân bổ dinh dưỡng đa lượng |
| 341 | label |  |  | Cách chia đa lượng |
| 345 | prop label |  |  | Tỉ lệ |
| 346 | prop label |  |  | Cố định |
| 354 | expr in JSX |  |  | Tỉ lệ chia năng lượng thành đạm, tinh bột và chất béo. Khi cân nặng thay đổi, số gram tự cập nhật để giữ vững tỉ lệ này. |
| 356 | expr in JSX |  |  | Cố định trực tiếp số gram đạm, tinh bột và chất béo mỗi ngày. Tổng năng lượng sẽ được tính tự động từ số gram này. |
| 358 | expr in JSX |  |  | Chế độ Keto phân bổ năng lượng cực thấp từ tinh bột (5%), vừa phải đạm (20%) và rất giàu chất béo (75%). |
| 373 | aria-label |  | I | Giảm tỉ lệ phần trăm ${r.word} |
| 379 | aria-label |  | I | Tỉ lệ phần trăm ${r.word} |
| 382 | aria-label |  | I | Tăng tỉ lệ phần trăm ${r.word} |
| 398 | label |  | I | Tỉ lệ ${r.word} |
| 412 | text |  | E | Tổng |
| 419 | text |  | E | Tổng ba tỉ lệ phải bằng đúng 100% (hiện tại: |
| 419 | text |  | E | %). Hãy điều chỉnh lại các ô nhập. |
| 425 | text |  |  | Gợi ý tỉ lệ phổ biến |
| 447 | text |  |  | Khôi phục mặc định theo HLV |

### `components/settings/password-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 46 | literal | toast |  | Đã đổi mật khẩu |
| 46 | literal | toast |  | Đã đặt mật khẩu |
| 55 | aria-label |  |  | Đổi mật khẩu |
| 55 | aria-label |  |  | Đặt mật khẩu |
| 59 | label |  |  | Mật khẩu hiện tại |
| 74 | text |  |  | Lưu mật khẩu |
| 84 | literal |  |  | Mật khẩu |
| 84 | literal |  |  | Đổi mật khẩu |
| 84 | literal |  |  | Đặt mật khẩu |

### `components/settings/profile-cards.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 28 | prop label |  |  | Nữ |
| 138 | label |  |  | Năm sinh |
| 139 | hint |  |  | Dùng để chọn mức khuyến nghị theo tuổi. |
| 150 | label |  |  | Năm sinh |
| 151 | text |  |  | Dùng để chọn mức khuyến nghị theo tuổi. |
| 177 | aria-label |  |  | Cơ thể |
| 178 | text |  |  | Cơ thể |
| 179 | label |  |  | Giới tính |
| 179 | reason |  |  | Chỉ dùng để chọn mức khuyến nghị vi chất cho bạn. |
| 193 | text |  |  | Gần/đang trong kỳ |
| 194 | text |  |  | Chỉ với nữ · Iron lên 28 mg/ngày |
| 199 | aria-label |  |  | Gần/đang trong kỳ |
| 207 | label |  |  | Cân nặng |
| 208 | hint |  |  | Dùng để tính kcal, đạm và chất béo. |
| 227 | aria-label |  |  | Mục tiêu |
| 228 | text |  |  | Mục tiêu |
| 229 | label |  |  | Mục tiêu |
| 229 | reason |  |  | Dùng để chọn số kcal mỗi kg cân nặng. |
| 240 | label |  |  | Ngày tập mặc định |
| 240 | unit |  |  | phút |
| 240 | reason |  |  | Dùng để tính lượng muối khi tập. |
| 245 | prop label |  |  | Nghỉ |
| 246 | prop ariaLabel |  |  | Nghỉ |
| 246 | prop ariaLabel |  | IP | ${option.minutes} phút |
| 270 | label |  |  | Nhóm Bự / Bé |
| 270 | unit |  |  | liều khi tập |
| 270 | reason |  |  | Dùng để chọn liều khi tập. |
| 276 | prop ariaLabel |  |  | liều thấp |
| 276 | prop ariaLabel |  |  | liều cao |
| 288 | literal |  |  | Tiếng Việt |
| 317 | literal |  |  | Tiếng Việt |
| 319 | literal |  |  | Đã bật |
| 319 | literal |  |  | Đã tắt |
| 323 | aria-label |  |  | Ứng dụng |
| 324 | text |  |  | Ứng dụng |
| 329 | label |  |  | Xem lại hướng dẫn |
| 330 | hint |  |  | Ghi bữa ăn đầu tiên · 1 phút |
| 337 | text |  |  | Mới |
| 340 | label |  |  | Có gì mới |
| 345 | label |  |  | Mẹo trên từng màn hình |
| 346 | hint |  |  | Bật lại để xem mẹo lần đầu |
| 355 | aria-label |  |  | Mẹo trên từng màn hình |
| 364 | label |  |  | Rung khi chạm |
| 365 | hint |  |  | Rung nhẹ khi lưu, xóa hay hoàn tác |
| 370 | aria-label |  |  | Rung khi chạm |
| 374 | label |  |  | Ngôn ngữ |
| 375 | label |  |  | Nhắc nhở |
| 376 | label |  |  | Nguồn dữ liệu |
| 377 | label |  |  | Thêm vào màn hình chính |
| 379 | label |  |  | Điều khoản dịch vụ |
| 380 | label |  |  | Chính sách bảo mật |

### `components/settings/profile-edit-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 20 | title |  |  | Hồ sơ |
| 35 | aria-label |  |  | Mục tiêu mỗi ngày |
| 39 | label |  |  | Mục tiêu mỗi ngày tính từ hồ sơ này |

### `components/settings/profile-summary.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 6 | literal |  |  | Nữ |
| 16 | literal |  |  | Hồ sơ của bạn |

### `components/settings/settings-home-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 38 | text |  |  | Mục tiêu mỗi ngày |
| 43 | text |  | E | đạm |
| 56 | text |  |  | Xem các gói và quyền lợi của tài khoản |
| 62 | text |  |  | Xem gói |
| 76 | title |  |  | Cài đặt |
| 83 | aria-label |  |  | Của bạn |
| 84 | text |  |  | Của bạn |
| 85 | label |  |  | Mục tiêu mỗi ngày |
| 91 | label |  |  | Huấn luyện viên |
| 92 | hint |  |  | Nhập mã để HLV theo dõi bạn |
| 102 | label |  |  | Học viên |
| 103 | hint |  |  | Level và nhật ký của học viên |
| 112 | label |  |  | Tài khoản |
| 113 | hint |  |  | Chưa đăng nhập |
| 126 | text |  |  | Vùng nguy hiểm |
| 132 | text |  |  | Xóa tài khoản |
| 133 | hint |  |  | Có bước xác nhận trước khi xóa |

### `components/settings/sign-out-confirm.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 49 | title | confirm dialog |  | Đăng xuất? |
| 51 | text | confirm dialog | E | Còn |
| 51 | text | confirm dialog | PE | món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này. |
| 54 | expr in JSX | confirm dialog | I | Đang đồng bộ… ${Math.min(progress.done, progress.total)}/${progress.total} |
| 54 | expr in JSX | confirm dialog |  | Đang đồng bộ… |
| 57 | text | confirm dialog | E | Còn |
| 57 | text | confirm dialog | PE | món chưa đồng bộ được: |
| 63 | expr in JSX | confirm dialog |  | Đang đồng bộ… |
| 63 | expr in JSX | confirm dialog |  | Đồng bộ rồi đăng xuất |
| 67 | text | confirm dialog |  | Xem các món |
| 71 | expr in JSX | confirm dialog | IP | Vẫn đăng xuất (mất ${failure.left} món) |
| 71 | expr in JSX | confirm dialog | IP | Vẫn đăng xuất (mất ${count} món) |

### `components/settings/target-rows.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 63 | literal |  | I | Tối đa ${formatAmount(limit.limit, unit)} ${unit} |
| 64 | literal |  | I | ${text}, chỉ tính từ thực phẩm bổ sung |
| 89 | prop detail |  |  | Gần/đang trong kỳ: quy tắc của huấn luyện viên |
| 103 | prop title |  |  | Năng lượng và đa lượng |
| 110 | prop label |  |  | Đạm |
| 111 | prop label |  |  | Chất béo |
| 113 | prop label |  |  | Tinh bột |
| 114 | prop detail |  |  | Phần còn lại: (kcal − đạm × 4 − béo × 9) ÷ 4 |
| 119 | prop label |  |  | Chất xơ* |
| 120 | prop detail |  | I | ${FIBER_G_PER_1000_KCAL} g mỗi 1.000 kcal, tối đa ${FIBER_MAX_G[profile.sex]} g |
| 126 | prop title |  |  | Khoáng chất |
| 131 | prop label |  |  | Muối |
| 132 | prop detail |  |  | Nền 4–6 g + 1–1,5 g mỗi 20 phút tập |
| 139 | prop title |  |  | Vitamin và khoáng khác |

### `components/settings/targets-screen.tsx`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 21 | literal |  |  | Đạm |
| 22 | literal |  |  | Chất béo |
| 23 | literal |  |  | Tinh bột |
| 24 | literal |  |  | Chất xơ* |
| 25 | literal |  |  | Muối |
| 40 | literal |  |  | Theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính của bạn |
| 59 | title |  |  | Mục tiêu mỗi ngày |
| 62 | subtitle |  | I | Tính từ hồ sơ · ${sexLabel(profile.sex)} · ${formatNumber(profile.weightKg)} kg · ${goalName(profile.goal)} |
| 74 | note |  |  | * Chất xơ: tạm thời, chưa có quy tắc của huấn luyện viên. |
| 75 | note |  | I | Trừ muối. ${DRI_NOTE}. |
| 83 | text |  |  | Cân nặng, mục tiêu và ngày tập mặc định sửa trong Hồ sơ. Bạn cũng có thể tùy chỉnh tỉ lệ đa lượng riêng. |
| 86 | text |  | N | Tùy chỉnh tỉ lệ đa lượng |
| 90 | text |  | N | Sửa trong Hồ sơ |
| 145 | text |  |  | tự đặt |
| 156 | aria-label |  | I | ${row.label}, ${row.value}${row.custom ? ", tự đặt" : ""}. Bấm để đặt mục tiêu riêng |
| 156 | aria-label |  |  | , tự đặt |

### `lib/custom-targets.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 37 | prop error | error/validation |  | Nhập một số lớn hơn 0 |
| 39 | prop error | error/validation |  | Nhập một số lớn hơn 0 |
| 40 | prop error | error/validation |  | Số này quá lớn |

### `lib/data-sources.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 15 | prop name |  |  | USDA FoodData Central (Hoa Kỳ) |
| 16 | prop description |  |  | Bộ Nông nghiệp Hoa Kỳ; cơ sở dữ liệu thành phần thực phẩm có đầy đủ dữ liệu vi chất. |
| 21 | prop description |  |  | Tệp Dinh dưỡng Canada (Canadian Nutrient File); dữ liệu phân tích thực phẩm từ Bộ Y tế Canada. |
| 25 | prop name |  |  | Bảng thành phần thực phẩm Việt Nam |
| 26 | prop description |  |  | Viện Dinh dưỡng Quốc gia Việt Nam; dữ liệu dinh dưỡng cho các món ăn và nguyên liệu Việt Nam. |
| 30 | prop name |  |  | Của tôi |
| 31 | prop description |  |  | Món ăn và nguyên liệu do bạn tự tạo từ nhãn dinh dưỡng bao bì. |
| 36 | prop title |  |  | Cách đọc số liệu |
| 37 | prop bullet1 |  |  | Ký hiệu “—” nghĩa là chưa có dữ liệu từ nguồn phân tích, không phải bằng 0. |
| 38 | prop bullet2 |  |  | Vi chất chưa có dữ liệu không được tính là 0 trong tổng ngày, tránh làm sai lệch đánh giá dinh dưỡng. |

### `lib/display-name.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 31 | literal | error/validation |  | Nhập tên hiển thị |
| 32 | literal | error/validation | I | Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự |
| 33 | literal | error/validation |  | Tên cần có ít nhất một chữ cái hoặc chữ số |

### `lib/sign-out-flow.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 30 | prop reason | error/validation |  | chưa gửi được |

### `lib/targets.ts`

| line | where | type | flags | text |
|---:|---|---|---|---|
| 41 | prop name |  |  | Cân bằng |
| 42 | prop description |  |  | 25% Đạm · 55% Tinh bột · 20% Chất béo |
| 47 | prop name |  |  | Tăng cơ cao đạm |
| 48 | prop description |  |  | 30% Đạm · 45% Tinh bột · 25% Chất béo |
| 53 | prop name |  |  | Giảm mỡ |
| 54 | prop description |  |  | 35% Đạm · 35% Tinh bột · 30% Chất béo |
| 60 | prop description |  |  | 20% Đạm · 5% Tinh bột · 75% Chất béo |

## C. Index by special type

**Toasts and status messages: 10**

- `app/(app)/settings/delete-account/page.tsx:34` Bản thử chưa hỗ trợ xóa tài khoản. Dữ liệu hiện chỉ lưu trên thiết bị của bạn.
- `app/(app)/settings/delete-account/page.tsx:41` Tính năng tải CSV sẽ mở khi kết nối máy chủ.
- `app/(app)/settings/notifications/page.tsx:123` Đã bật quyền thông báo
- `app/(app)/settings/notifications/page.tsx:125` Trình duyệt đang chặn thông báo. Bạn mở cài đặt trình duyệt để cấp quyền nhé.
- `app/(app)/settings/notifications/page.tsx:128` Đã bật quyền thông báo
- `app/(app)/settings/notifications/page.tsx:131` Đã bật quyền thông báo
- `components/settings/macro-targets-screen.tsx:261` Đã lưu mục tiêu đa lượng mới
- `components/settings/macro-targets-screen.tsx:279` Đã lưu mục tiêu đa lượng mới
- `components/settings/password-screen.tsx:46` Đã đổi mật khẩu
- `components/settings/password-screen.tsx:46` Đã đặt mật khẩu

**Error / validation messages: 10**

- `components/settings/account-screen.tsx:42` Đã lưu trên máy này, chưa gửi lên máy chủ được. Thử lại sau.
- `components/settings/account-screen.tsx:110` Chưa đăng xuất được. Kiểm tra mạng rồi thử lại nhé.
- `components/settings/account-screen.tsx:129` Chưa kiểm tra được món nào chưa lưu. Kiểm tra mạng rồi thử lại nhé.
- `lib/custom-targets.ts:37` Nhập một số lớn hơn 0
- `lib/custom-targets.ts:39` Nhập một số lớn hơn 0
- `lib/custom-targets.ts:40` Số này quá lớn
- `lib/display-name.ts:31` Nhập tên hiển thị
- `lib/display-name.ts:32` Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự
- `lib/display-name.ts:33` Tên cần có ít nhất một chữ cái hoặc chữ số
- `lib/sign-out-flow.ts:30` chưa gửi được

**Confirm dialogs (sign-out, leave coach, delete account): 27**

- `app/(app)/settings/delete-account/page.tsx:27` XOÁ
- `app/(app)/settings/delete-account/page.tsx:30` XÓA
- `app/(app)/settings/delete-account/page.tsx:52` Xóa tài khoản
- `app/(app)/settings/delete-account/page.tsx:78` Xóa vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục.
- `app/(app)/settings/delete-account/page.tsx:89` Khi nào xong
- `app/(app)/settings/delete-account/page.tsx:91` Tài khoản được xóa ngay khi bạn xác nhận. Xong thì bạn được đăng xuất và quay về trang đăng nhập.
- `app/(app)/settings/delete-account/page.tsx:109` Gõ Xóa để xác nhận
- `app/(app)/settings/delete-account/page.tsx:114` Xóa
- `app/(app)/settings/delete-account/page.tsx:134` Gõ Xóa vào ô trên để mở nút xóa.
- `app/(app)/settings/delete-account/page.tsx:138` Hủy
- `app/(app)/settings/delete-account/page.tsx:149` Xóa tài khoản
- `components/settings/coach-screen.tsx:99` Rời huấn luyện viên?
- `components/settings/coach-screen.tsx:109` Rời ${coach.name}
- `components/settings/coach-screen.tsx:109` Rời HLV
- `components/settings/coach-screen.tsx:112` Hủy
- `components/settings/sign-out-confirm.tsx:49` Đăng xuất?
- `components/settings/sign-out-confirm.tsx:51` Còn
- `components/settings/sign-out-confirm.tsx:51` món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.
- `components/settings/sign-out-confirm.tsx:54` Đang đồng bộ… ${Math.min(progress.done, progress.total)}/${progress.total}
- `components/settings/sign-out-confirm.tsx:54` Đang đồng bộ…
- `components/settings/sign-out-confirm.tsx:57` Còn
- `components/settings/sign-out-confirm.tsx:57` món chưa đồng bộ được:
- `components/settings/sign-out-confirm.tsx:63` Đang đồng bộ…
- `components/settings/sign-out-confirm.tsx:63` Đồng bộ rồi đăng xuất
- `components/settings/sign-out-confirm.tsx:67` Xem các món
- `components/settings/sign-out-confirm.tsx:71` Vẫn đăng xuất (mất ${failure.left} món)
- `components/settings/sign-out-confirm.tsx:71` Vẫn đăng xuất (mất ${count} món)

**placeholder attributes: 2**

- `app/(app)/settings/delete-account/page.tsx:114` Xóa
- `components/settings/coach-screen.tsx:65` Mã gồm 10 ký tự

**title attributes (headers and sheets): 20**

- `app/(app)/settings/data-sources/page.tsx:17` Nguồn dữ liệu
- `app/(app)/settings/delete-account/page.tsx:52` Xóa tài khoản
- `app/(app)/settings/language/page.tsx:89` Ngôn ngữ
- `app/(app)/settings/language/page.tsx:98` Ngôn ngữ
- `app/(app)/settings/language/page.tsx:109` Đơn vị · Dấu thập phân
- `app/(app)/settings/language/page.tsx:120` Đơn vị · Năng lượng
- `app/(app)/settings/notifications/page.tsx:138` Nhắc nhở
- `app/(app)/settings/notifications/page.tsx:165` Nhắc nhở
- `app/(app)/settings/profile/weight/page.tsx:130` Cân nặng
- `app/(app)/settings/whats-new/page.tsx:31` Có gì mới
- `components/settings/account-screen.tsx:154` Tài khoản
- `components/settings/coach-screen.tsx:42` Huấn luyện viên
- `components/settings/coach-screen.tsx:99` Rời huấn luyện viên?
- `components/settings/custom-target-sheet.tsx:47` Mục tiêu ${row.label}
- `components/settings/custom-target-sheet.tsx:47` Mục tiêu
- `components/settings/macro-targets-screen.tsx:141` Mục tiêu đa lượng
- `components/settings/profile-edit-screen.tsx:20` Hồ sơ
- `components/settings/settings-home-screen.tsx:76` Cài đặt
- `components/settings/sign-out-confirm.tsx:49` Đăng xuất?
- `components/settings/targets-screen.tsx:59` Mục tiêu mỗi ngày

**aria-label / aria-valuetext: 31**

- `app/(app)/settings/notifications/page.tsx:173` Quyền thông báo
- `app/(app)/settings/notifications/page.tsx:199` Các loại nhắc nhở
- `app/(app)/settings/profile/weight/page.tsx:63` Cân nặng hôm nay
- `app/(app)/settings/profile/weight/page.tsx:69` Giảm 0,1 kg
- `app/(app)/settings/profile/weight/page.tsx:92` Tăng 0,1 kg
- `app/(app)/settings/profile/weight/page.tsx:103` Mục tiêu sẽ cập nhật
- `components/settings/account-screen.tsx:80` Tài khoản
- `components/settings/account-screen.tsx:160` Thông tin tài khoản
- `components/settings/macro-targets-screen.tsx:93` ${value} phần trăm
- `components/settings/macro-targets-screen.tsx:302` Số gram đạm cố định
- `components/settings/macro-targets-screen.tsx:303` Số gram tinh bột cố định
- `components/settings/macro-targets-screen.tsx:304` Số gram chất béo cố định
- `components/settings/macro-targets-screen.tsx:373` Giảm tỉ lệ phần trăm ${r.word}
- `components/settings/macro-targets-screen.tsx:379` Tỉ lệ phần trăm ${r.word}
- `components/settings/macro-targets-screen.tsx:382` Tăng tỉ lệ phần trăm ${r.word}
- `components/settings/password-screen.tsx:55` Đổi mật khẩu
- `components/settings/password-screen.tsx:55` Đặt mật khẩu
- `components/settings/profile-cards.tsx:177` Cơ thể
- `components/settings/profile-cards.tsx:199` Gần/đang trong kỳ
- `components/settings/profile-cards.tsx:227` Mục tiêu
- `components/settings/profile-cards.tsx:246` Nghỉ
- `components/settings/profile-cards.tsx:246` ${option.minutes} phút
- `components/settings/profile-cards.tsx:276` liều thấp
- `components/settings/profile-cards.tsx:276` liều cao
- `components/settings/profile-cards.tsx:323` Ứng dụng
- `components/settings/profile-cards.tsx:355` Mẹo trên từng màn hình
- `components/settings/profile-cards.tsx:370` Rung khi chạm
- `components/settings/profile-edit-screen.tsx:35` Mục tiêu mỗi ngày
- `components/settings/settings-home-screen.tsx:83` Của bạn
- `components/settings/targets-screen.tsx:156` ${row.label}, ${row.value}${row.custom ? ", tự đặt" : ""}. Bấm để đặt mục tiêu riêng
- `components/settings/targets-screen.tsx:156` , tự đặt

Note: the toast lines come from `setToastMessage`/`notify` inside settings code. Other toasts reachable from settings screens are produced in lib/diary-store.tsx (profile/target saves go through `useDiary`), see part D.

## D. Visible strings the diacritic scan misses (settings files only)

Vietnamese or neutral labels with no diacritic, found by the second pass (`tools/nodia.cjs`); these also need extraction or an explicit decision to keep as-is:

- `components/settings/profile-cards.tsx:27`: Nam (Vietnamese (sex option); also components/settings/profile-summary.ts:6)
- `components/settings/coach-screen.tsx:72`: Tham gia (Vietnamese (button))
- `components/settings/account-screen.tsx:165`: Email (label, same word in en)
- `components/settings/profile-cards.tsx:317`: English (language name (endonym, keep))
- `app/(app)/settings/language/page.tsx:101`: English (language name (endonym, keep))
- `app/(app)/settings/language/page.tsx:122-123`: kcal / kJ (unit labels)
- `components/settings/target-rows.ts:106, targets-screen.tsx:122`: Kcal (row label)
- `components/settings/macro-targets-screen.tsx:347, lib/targets.ts:59`: Keto (preset name)
- `components/settings/settings-home-screen.tsx:55`: H1T MICRO Pro (brand + plan name)
- `components/profile/level-badge.tsx:37`: LEVEL (and aria-label `Level ${level}` at :31) (product term; the repo says the UI word is "Level", never "Mức" (lib/coaching-link.ts header))
- `lib/data-sources.ts:20`: CNF (Canada) (source name)
- `app/(app)/settings/delete-account/page.tsx:28`: XOA (typed-confirmation token (logic, accepted besides XOÁ, XÓA at lines 25-31))
- `units in JSX text`: kg, g, kcal (macro-targets-screen.tsx:130,324,392,414; profile-cards.tsx:212; weight/page.tsx:88)

## E. Metadata exported by settings routes (counted under SEO, not in the total above)

- `app/(app)/settings/data-sources/page.tsx:8` Nguồn dữ liệu \| H1T MICRO

## F. Strings reached from settings but owned by other areas

The proof is not self-contained: these modules supply text that Cài đặt screens render, so they must be extracted in the same pass (or Cài đặt will show mixed languages). Counts are UI strings in the module; `used` lists the imports the settings files take.

| Module | strings | used by settings |
|---|---:|---|
| `lib/releases.ts` | 193 | RELEASES (whats-new/page.tsx subtitle and list) |
| `components/sync/sync-list.tsx` | 21 | SyncList (account-screen.tsx, the unsynced items under sign-out) |
| `lib/training.ts` | 20 | getTrainingDurations, TRAINING_SIZE_NAME (profile-cards.tsx, target-rows.ts) |
| `lib/auth-actions.ts` | 17 | currentAccount, currentAccountId, signOut, updatePassword + their Vietnamese error strings |
| `lib/level-copy.ts` | 15 | NO_COACH_TEXT, WRONG_CODE, leaveConfirm, levelSourceText (coach-screen.tsx) |
| `lib/onboarding.ts` | 15 | goalName, goalOptions, parseBirthYear, parseWeightKg, validateSetupDraft (goal and validation text) |
| `lib/diary-store.tsx` | 11 | useDiary: toasts raised when a profile/target is saved (diary-store.tsx toast templates) |
| `lib/format.ts` | 9 | formatNumber, formatAmount (see formats.md) |
| `lib/rda.ts` | 7 | DRI stage label `{Nam or Nữ} {stage} tuổi` (rda.ts:87) via target-rows.ts |
| `components/ui/app-header.tsx` | 6 | AppHeader (default back label, date strings) |
| `lib/api-client.ts` | 5 | callEngine (account-screen.tsx unsynced count) |
| `lib/nav.ts` | 4 | tab labels |
| `components/coaching/level-explainer-sheet.tsx` | 3 | LevelExplainerSheet (coach-screen.tsx) |
| `components/auth/new-password-fields.tsx` | 3 | password fields and errors (password-screen.tsx) |
| `components/auth/password-field.tsx` | 2 | password field (password-screen.tsx) |
| `components/ui/sheet.tsx` | 1 | Sheet close button label |
| `hooks/use-coaching.ts` | 1 | useCoaching (default name 'Bạn') |
| `components/pwa/install-row.tsx` | 1 | InstallRow (profile-cards.tsx 'Thêm vào màn hình chính' row) |

Strings in modules the settings files import and that count under other areas: 334 (some, like releases.ts, are only partly reachable). Counted in the Cài đặt area although they live in lib/: lib/data-sources.ts (10), lib/targets.ts (7), lib/custom-targets.ts (3), lib/display-name.ts (3), lib/sign-out-flow.ts (1).

For the modules most tied to settings, the strings themselves:

**lib/onboarding.ts** (15)

- :54 Tăng cơ
- :54 Ăn dư một chút để lên cơ
- :55 Giữ cân
- :55 Duy trì cân nặng hiện tại
- :56 Giảm mỡ
- :56 Thâm hụt vừa phải, giữ cơ
- :57 Giảm mỡ nhanh
- :57 Ngắn hạn — tối đa 4–6 tuần
- :87 Nhập năm sinh từ 1920 đến 2015
- :92 Nhập cân nặng từ 30 đến 300 kg
- :138 Năng lượng
- :142 Đạm (2,2 g/kg)
- :146 Chất béo (1 g/kg)
- :154 Gửi lại liên kết (sau ${formatNumber(secondsLeft)} giây)
- :155 Gửi lại liên kết

**lib/level-copy.ts** (15)

- :6 Mã không đúng. Kiểm tra lại với HLV của bạn.
- :7 Bạn chưa có huấn luyện viên
- :8 Có huấn luyện viên? Nhập mã để HLV theo dõi và mở thêm chỉ số
- :9 Hỏi HLV để lên Level
- :12 Tham gia theo dõi với ${coachName}?
- :16 Rời ${coachName}? Level của bạn sẽ về 0 và Hôm nay hiện danh sách cơ bản.
- :20 Level ${level} · do HLV đặt
- :30 Bạn đang được ${coachName} theo dõi · Level ${notice.to}
- :31 ${coachName} đã đổi Level của bạn thành ${notice.to}
- :34 ${coachName} đã nâng bạn lên Level ${notice.to}: thêm ${added.join(", ")}
- :35 ${coachName} đã nâng bạn lên Level ${notice.to}
- :41  và chi tiết béo, xơ
- :42 ${count} vi chất cơ bản · chưa có huấn luyện viên
- :43 ${count} vi chất cơ bản
- :44 ${count} vi chất${extras}

**lib/training.ts** (20)

- :33 Bé
- :33 Bự
- :114 Nghỉ
- :115 45 phút
- :116 60 phút
- :117 90 phút
- :118 120 phút
- :152 ✓ Đã ghi ${logged[id]}
- :152 ✓ Đã dùng
- :160 Chà là
- :163 Bột củ dền (Dalahouse)
- :164 Tăng lưu chuyển dinh dưỡng
- :180 Muối · phút ${startMin}–${endMin}
- :185 Tinh bột nhanh
- :186 Red Bull · Red Bull + mật mía · mật mía Golden Barrel
- :196 Trước tập
- :201 Trong tập · ${trainingMinutes} phút
- :214 Ngủ đủ 7–9 tiếng
- :219 Giữ mức đạm ${targetRangeText(targets.protein, "g")}
- :224 Năng lượng giữ ${targetRangeText(targets.calories, "kcal")}

**lib/rda.ts** (7)

- :57 tính cho magie từ thuốc và thực phẩm bổ sung, không tính cho thức ăn thường
- :64 tính cho vitamin A (retinol) từ thực phẩm bổ sung, không tính cho thức ăn thường
- :66 tính cho vitamin E tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường
- :70 tính cho niacin tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường
- :73 tính cho axit folic tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường
- :87 ${sex === "male" ? "Nam" : "Nữ"} ${DRI_STAGE_LABEL[bandOf(age)]} tuổi
- :87 Nữ

**components/auth/new-password-fields.tsx** (3)

- :15 Mật khẩu mới
- :33 Ít nhất 8 ký tự, có chữ và số
- :40 Nhập lại mật khẩu

**components/auth/password-field.tsx** (2)

- :45 Ẩn mật khẩu
- :45 Hiện mật khẩu

**components/pwa/install-row.tsx** (1)

- :28 Cài ứng dụng lên điện thoại

**hooks/use-coaching.ts** (1)

- :82 Bạn

## G. What the language page already does

`/settings/language` (app/(app)/settings/language/page.tsx:69-135) lets the user pick Tiếng Việt / English (:98-103), decimal comma / dot (:109-116) and kcal / kJ (:120-127). `lib/settings.ts` stores `language`, `decimalSeparator`, `energyUnit` (:8-10, defaults :33-35, parse :67-69). `profile-cards.tsx:316-317` only reads it to show the current language name on the Hồ sơ row. Nothing else in app, components, hooks or lib reads these three fields, so choosing English changes nothing yet.

## Commands used

```
node tools/extract.cjs raw.json && node tools/classify.cjs raw.json     # area = settings: components/settings/*, components/profile/*, app/(app)/settings/**, app/(app)/(tabs)/settings, lib/{data-sources,targets,custom-targets,display-name,sign-out-flow}.ts
node tools/gen-settings.cjs                                              # this file
node tools/nodia.cjs components/settings/* components/profile/* app/(app)/settings/**/page.tsx lib/{data-sources,targets,custom-targets,display-name,sign-out-flow,settings,profile}.ts   # part D
node tools/imports.cjs                                                    # part F (import graph of settings files, resolves @/ and relative)
find app/(app)/settings app/(app)/(tabs)/settings -name page.tsx; wc -l components/settings/*   # route and size tables
```
