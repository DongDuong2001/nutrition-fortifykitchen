# Audit ngôn ngữ & chuỗi giao diện tiếng Việt (`ag-11`)

## 1. Inventory chuỗi hiển thị (`apps/web/app` & `apps/web/components`)

Bảng dưới đây thống kê toàn bộ chuỗi hiển thị cho người dùng (nhãn, nút bấm, tiêu đề, gợi ý, thông báo toast, trạng thái rỗng, `aria-label`, `title` trang) trong `apps/web/app`, `apps/web/components` và các hàm định dạng/hằng số chuỗi phụ trợ trong `apps/web/lib` (bỏ qua `apps/web/lib/api-client*`, `apps/web/lib/supabase-client*` và `apps/web/app/(auth)/login` theo phạm vi).

### 1.1. Các trang trong `apps/web/app`

| Route | File:Line | Text |
|---|---|---|
| Toàn cục (Root Layout) | [layout.tsx](apps/web/app/layout.tsx#L22) | `H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu` |
| Toàn cục (Root Layout) | [layout.tsx](apps/web/app/layout.tsx#L23) | `Theo dõi năng lượng, đạm và 22 vi chất mỗi ngày.` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L19) | `Không tải được dữ liệu` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L38) | `Chưa kết nối được máy chủ` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L41) | `Dữ liệu hôm nay của bạn vẫn an toàn. Thử tải lại sau vài giây.` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L46) | `Mã lỗi: {error.digest}` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L54) | `Thử lại` |
| Toàn cục (Error Boundary) | [error.tsx](apps/web/app/error.tsx#L58) | `Về Tổng quan` |
| Toàn cục (404 Not Found) | [not-found.tsx](apps/web/app/not-found.tsx#L8) | `Không tìm thấy trang` |
| Toàn cục (404 Not Found) | [not-found.tsx](apps/web/app/not-found.tsx#L17) | `Trang này không tồn tại` |
| Toàn cục (404 Not Found) | [not-found.tsx](apps/web/app/not-found.tsx#L20) | `Link có thể đã cũ hoặc đã đổi địa chỉ.` |
| Toàn cục (404 Not Found) | [not-found.tsx](apps/web/app/not-found.tsx#L25) | `Về Tổng quan` |
| `/overview` | [page.tsx](apps/web/app/(dashboard)/overview/page.tsx#L6) | `Tổng quan \| H1T MICRO` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L118) | `Đang tải lịch tập` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L148) | `Chưa có lịch tập cho hôm nay` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L150) | `Chọn buổi tập trong Hồ sơ để tính mục tiêu đạm và năng lượng.` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L154) | `NGÀY TẬP` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L218) | `NGÀY TẬP` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L223) | `Đổi buổi tập` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L244) | `Hôm nay · {label}` |
| `/training` | [page.tsx](apps/web/app/(dashboard)/training/page.tsx#L287) | `Dinh dưỡng quanh buổi tập` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L82) | `Đã thêm {food.name_vi} vào {mealLabel}` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L113) | `Đã thêm {meal.name_vi} ({count} món) vào {mealLabel}` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L121) | `Đang tải trang thêm món` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L153) | `Huỷ và quay lại` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L159) | `Thêm vào: {mealLabel}` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L168) | `Mặc định theo giờ · chạm để đổi bữa` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L183) | `Khu vực thêm món` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L194) | `Tìm phở, ức gà, trứng…` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L195) | `Tìm món ăn` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L202) | `Xoá từ khoá` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L223) | `Gần đây` / `Yêu thích` / `Bữa ăn của tôi` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L229) | `Gần đây ({recentFoods.length})` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L261) | `Kết quả cho “{trimmed}” ({filteredFoods.length})` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L269) | `Chưa có món “{trimmed}” trong thư viện` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L272) | `Thử từ khoá ngắn hơn, không dấu, hoặc tự tạo món mới.` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L277) | `+ Tạo món “{trimmed}”` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L290) | `Tạo món mới (tự nhập số liệu)` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L304) | `Chưa có món yêu thích` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L306) | `Mở một món bất kỳ rồi bấm biểu tượng trái tim để lưu vào đây.` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L334) | `Chưa có bữa ăn đã lưu` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L336) | `Trong Nhật ký, bấm thực đơn (⋯) của một bữa rồi chọn “Lưu thành Bữa ăn của tôi”.` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L353) | `{meal.items.length} món · {kcal} kcal · {protein} g đạm` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L361) | `Thêm bữa {meal.name_vi}` |
| `/add` | [page.tsx](apps/web/app/add/page.tsx#L387) | `Thêm nhanh {food.name_vi} ({defaultPortion.label})` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L50) | `Admin RBAC Guarded` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L52) | `Coach Vault Review` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L55) | `Review and publish markdown meal plans synchronized from GitHub repository` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L61) | `Filter drafts` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L63) | `all` / `draft` / `published` / `rejected` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L96) | `commit: {draft.commitSha}` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L106) | `Approve` / `Reject` |
| `/admin/review` | [page.tsx](apps/web/app/admin/review/page.tsx#L134) | `Status: {draft.status}` |
| `/dev/ui` | [page.tsx](apps/web/app/dev/ui/page.tsx#L19) | `Cơm tấm sườn bì chả` / `Phở bò tái nạm` / `Ức gà áp chảo` |
| `/dev/ui` | [page.tsx](apps/web/app/dev/ui/page.tsx#L28) | `Thư viện giao diện H1T MICRO` |
| `/dev/ui` | [page.tsx](apps/web/app/dev/ui/page.tsx#L30) | `Kiểm thử thành phần cơ bản (Task 01) — chuẩn hóa tiếng Việt, khoảng cách 4-8-12-16-20-24-32px, mục tiêu chạm 44px.` |
| `/dev/ui` | [page.tsx](apps/web/app/dev/ui/page.tsx#L179) | `Tất cả` / `Gần đây` / `Ưa thích` / `Món Việt` |
| `/dev/ui` | [page.tsx](apps/web/app/dev/ui/page.tsx#L276) | `Đã lưu món ăn vào bữa trưa` / ` Hiện thông báo mẫu` |
| `/diary` | [page.tsx](apps/web/app/diary/page.tsx#L6) | `Nhật ký \| H1T MICRO` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L30) | `Đang tải món đã ghi` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L39) | `Không tìm thấy món đã ghi` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L41) | `Món này có thể đã bị xoá hoặc không tồn tại trong nhật ký hôm nay.` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L45) | `Về Tổng quan` (liên kết trỏ tới `/diary`) |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L61) | `Đã cập nhật {entry.name_vi}` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L69) | `Đã xoá {entry.name_vi}` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L76) | `Đã nhân đôi {entry.name_vi}` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L87) | `Quay lại` |
| `/entry/[id]` | [page.tsx](apps/web/app/entry/[id]/page.tsx#L90) | `Sửa món đã ghi` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L12) | `Đang tải khám phá` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L53) | `Khám phá` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L62) | `Tìm phở, ức gà, cá hồi…` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L63) | `Tìm món ăn` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L69) | `Xoá từ khoá` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L83) | `+ Tạo món mới (tự nhập số liệu)` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L121) | `Gợi ý giàu vi chất` |
| `/explore` | [page.tsx](apps/web/app/explore/page.tsx#L129) | `Giàu {b.nameVi}` |
| `/explore/rich/[nutrient]` | [page.tsx](apps/web/app/explore/rich/[nutrient]/page.tsx#L22) | `Không tìm thấy chất dinh dưỡng` |
| `/explore/rich/[nutrient]` | [page.tsx](apps/web/app/explore/rich/[nutrient]/page.tsx#L27) | `Mục tiêu ngày: {target} {unit} · xếp theo hàm lượng trên 100 g` |
| `/explore/rich/[nutrient]` | [page.tsx](apps/web/app/explore/rich/[nutrient]/page.tsx#L32) | `Giàu {def.nameVi}` |
| `/explore/rich/[nutrient]` | [page.tsx](apps/web/app/explore/rich/[nutrient]/page.tsx#L53) | `Chưa có món nào có dữ liệu về {def.nameVi}.` |
| `/explore/rich/[nutrient]` | [page.tsx](apps/web/app/explore/rich/[nutrient]/page.tsx#L60) | `{row.pct} % mục tiêu ngày` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L65) | `Đã bỏ khỏi Yêu thích` / `Đã lưu vào Yêu thích` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L73) | `Đã thêm {food.name_vi} vào {mealLabel}` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L87) | `Không tìm thấy món` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L91) | `Món này không tồn tại` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L93) | `Món ăn có thể đã bị xoá hoặc đường dẫn không đúng.` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L97) | `Về Khám phá` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L112) | `Quay lại` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L120) | `Của tôi` / `{food.source}` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L127) | `Bỏ yêu thích` / `Thêm vào yêu thích` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L150) | `Khẩu phần` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L166) | `Tùy chỉnh` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L174) | `Khối lượng theo gam` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L194) | `Đạm` / `Carb` / `Béo` / `Xơ` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L211) | `Thêm vào {mealLabel}` |
| `/foods/[id]` | [page.tsx](apps/web/app/foods/[id]/page.tsx#L216) | `Đổi bữa` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L67) | `Vui lòng nhập tên món` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L73) | `Khẩu phần phải lớn hơn 0` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L79) | `Vui lòng nhập năng lượng hợp lệ` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L122) | `Đã lưu “{trimmedName}” và thêm vào {mealNameVi}` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L130) | `Lưu và thêm vào {mealNameVi}` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L136) | `TẠO MÓN MỚI` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L140) | `Quay lại Thêm món` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L143) | `Huỷ` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L151) | `Cơ bản · bắt buộc` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L155) | `Tên món` / `VD: Cơm gạo lứt nhà nấu` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L166) | `Khẩu phần` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L183) | `Đơn vị khẩu phần` (`g`, `ml`, `phần`, `chén`, `cái`, `muỗng`) |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L194) | `Nhãn hiển thị (không bắt buộc)` / `VD: 1 chén vừa` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L210) | `Số liệu cho 1 khẩu phần ({servingSize \|\| "100"} {servingUnit})` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L213) | `Bỏ trống vi chất = "chưa biết" (không tính là 0).` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L219) | `Năng lượng` / `Đạm` / `Tinh bột` / `Béo` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L276) | `Nhập thêm chất xơ & vi chất` |
| `/foods/new` | [page.tsx](apps/web/app/foods/new/page.tsx#L285) | `Chất xơ` / `Natri` / `Canxi` / `Sắt` / `Kali` / `Vitamin C` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L17) | `THÊM VÀO MÀN HÌNH CHÍNH` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L20) | `Quay lại Hồ sơ` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L38) | `Mở nhanh như ứng dụng` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L41) | `Đặt biểu tượng H1T MICRO lên màn hình chính — toàn màn hình, không thanh địa chỉ, không cần App Store.` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L49) | `Chọn hệ điều hành` (`iPhone (Safari)` / `Android (Chrome)`) |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L92) | `Chạm nút Chia sẻ` / `Ở thanh dưới của Safari (biểu tượng ô vuông có mũi tên hướng lên).` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L121) | `Chọn “Thêm vào MH chính”` / `Chọn “Thêm vào Màn hình chính”` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L139) | `Chạm “Thêm” ở góc phải trên` / `Biểu tượng H1T MICRO sẽ xuất hiện ngay trên màn hình chính.` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L149) | `Đang mở từ Zalo, Facebook hay ứng dụng khác? Hãy chạm … → Mở bằng Safari trước, vì trình duyệt trong ứng dụng không có mục này.` |
| `/install` | [page.tsx](apps/web/app/install/page.tsx#L196) | `Đã cài đặt xong` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L277) | `VI CHẤT` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L285) | `Bắt đầu ghi món để đo lường` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L302) | `Chưa ghi món nào hôm nay` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L304) | `Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L310) | `+ Ghi món ngay` / `Về Nhật ký` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L345) | `{stats.recordedCount}/{stats.total} đã ghi nhận · {stats.metCount} đạt ≥80%` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L397) | `Chuyển đổi chế độ xem thời gian` (`Hôm nay` / `TB 7 ngày`) |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L417) | `Lọc nhóm vi chất` (`Tất cả ({count})` / `Vitamin ({count})` / `Khoáng ({count})` / `Khác ({count})`) |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L532) | `<50%` / `50–79%` / `80–99%` / `≥100%` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L540) | `Một vạch = 10% mục tiêu ngày` |
| `/micros` | [page.tsx](apps/web/app/micros/page.tsx#L680) | `chưa có dữ liệu` / `Dưới đây là {unknownRows.length} chỉ số chưa có dữ liệu từ các món đã ghi.` |
| `/micros/[nutrient]` | [page.tsx](apps/web/app/micros/[nutrient]/page.tsx#L73) | `Không tìm thấy vi chất` |
| `/micros/[nutrient]` | [page.tsx](apps/web/app/micros/[nutrient]/page.tsx#L80) | `Quay lại Vi chất` |
| `/micros/[nutrient]` | [page.tsx](apps/web/app/micros/[nutrient]/page.tsx#L114) | `Tổng hôm nay` / `Mục tiêu: {target} {unit}/ngày` |
| `/micros/[nutrient]` | [page.tsx](apps/web/app/micros/[nutrient]/page.tsx#L140) | `Còn thiếu {remaining} {unit} để đạt mục tiêu ngày` / `Đã đạt mục tiêu ngày` |
| `/onboarding/setup` | [page.tsx](apps/web/app/onboarding/setup/page.tsx#L14) | `Đang tải thiết lập` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L16) | `Tháng` · `[GIÁ/THÁNG]` · `/tháng` · `Thanh toán hàng tháng` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L17) | `Năm` · `[GIÁ/NĂM]` · `/năm` · `Tiết kiệm [X]%` · `Thanh toán hàng năm` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L21) | `Đủ 22 vi chất mỗi ngày` / `Mục tiêu theo ngày tập & nghỉ` / `Món & công thức riêng của Coach` / `Xu hướng 7 và 30 ngày` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L37) | `Ăn theo Coach, không phải đoán` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L126) | `Dùng thử 7 ngày miễn phí` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L131) | `Khôi phục giao dịch` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L135) | `Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN] · huỷ bất cứ lúc nào` |
| `/paywall` | [page.tsx](apps/web/app/paywall/page.tsx#L144) | `Bạn đang ở Gói Miễn phí — vẫn ghi được 3 bữa/ngày và xem 5 vi chất cơ bản.` |
| `/profile` | [page.tsx](apps/web/app/profile/page.tsx#L6) | `Hồ sơ \| H1T MICRO` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L39) | `Đã xoá tài khoản và toàn bộ dữ liệu` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L47) | `XOÁ TÀI KHOẢN` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L50) | `Quay lại Hồ sơ` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L64) | `Hành động này không thể hoàn tác` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L67) | `Toàn bộ dữ liệu dưới đây sẽ bị xoá vĩnh viễn khỏi máy chủ H1T MICRO:` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L88) | `Nhập XOÁ để xác nhận` |
| `/settings/delete-account` | [page.tsx](apps/web/app/settings/delete-account/page.tsx#L112) | `Xoá vĩnh viễn tài khoản` / `Huỷ, giữ lại tài khoản` |
| `/settings/language` | [page.tsx](apps/web/app/settings/language/page.tsx#L34) | `NGÔN NGỮ` |
| `/settings/language` | [page.tsx](apps/web/app/settings/language/page.tsx#L48) | `Tiếng Việt` / `English` |
| `/settings/language` | [page.tsx](apps/web/app/settings/language/page.tsx#L81) | `Định dạng số` (`Dấu phẩy (2,5)` / `Dấu chấm (2.5)`) |
| `/settings/language` | [page.tsx](apps/web/app/settings/language/page.tsx#L121) | `Đơn vị` (`Hệ mét (g, kg, ml)` / `Năng lượng: kcal`) |
| `/settings/notifications` | [page.tsx](apps/web/app/settings/notifications/page.tsx#L116) | `NHẮC NHỞ` |
| `/settings/notifications` | [page.tsx](apps/web/app/settings/notifications/page.tsx#L127) | `Đã lưu cài đặt nhắc nhở` |
| `/settings/notifications` | [page.tsx](apps/web/app/settings/notifications/page.tsx#L139) | `Nhắc ghi bữa ăn` |
| `/settings/notifications` | [page.tsx](apps/web/app/settings/notifications/page.tsx#L225) | ` Tổng kết cuối ngày` |
| `/settings/profile/weight` | [page.tsx](apps/web/app/settings/profile/weight/page.tsx#L49) | `Cân nặng hợp lệ từ 30 đến 250 kg` |
| `/settings/profile/weight` | [page.tsx](apps/web/app/settings/profile/weight/page.tsx#L113) | `Lưu` |
| `/settings/profile/weight` | [page.tsx](apps/web/app/settings/profile/weight/page.tsx#L120) | `CÂN NẶNG` |
| `/settings/profile/weight` | [page.tsx](apps/web/app/settings/profile/weight/page.tsx#L128) | `Đã lưu cân nặng {formattedWeight} kg` |
| `/signin` | [page.tsx](apps/web/app/signin/page.tsx#L17) | `Chào mừng trở lại` |
| `/signin` | [page.tsx](apps/web/app/signin/page.tsx#L30) | `Gửi link đăng nhập` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L39) | `Mở hộp thư của bạn` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L58) | `Chạm vào link trong thư để vào thẳng Nhật ký. Link có hiệu lực trong 15 phút.` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L66) | `Mở ứng dụng Mail` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L73) | `Gửi lại link` / `Gửi lại sau 0:{seconds}` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L83) | `Không thấy thư? Kiểm tra mục Quảng cáo hoặc Spam.` |
| `/signin/check-email` | [page.tsx](apps/web/app/signin/check-email/page.tsx#L90) | `Mô phỏng mở link (dev)` |
| `/signin/expired` | [page.tsx](apps/web/app/signin/expired/page.tsx#L29) | `LINK ĐÃ HẾT HẠN` |
| `/signin/expired` | [page.tsx](apps/web/app/signin/expired/page.tsx#L32) | `Link đăng nhập này không còn dùng được` |
| `/signin/expired` | [page.tsx](apps/web/app/signin/expired/page.tsx#L35) | `Mỗi link chỉ có hiệu lực 15 phút và chỉ mở được một lần. Hãy nhận link mới để tiếp tục.` |
| `/signin/expired` | [page.tsx](apps/web/app/signin/expired/page.tsx#L38) | `Gửi link mới` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L7) | `Theo dõi đầy đủ vi chất, không chỉ calo` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L8) | `Mục tiêu do Coach Lê Hồng Khánh đặt` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L9) | `Dữ liệu món Việt và bữa hàng ngày` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L23) | `1 SET LÀ ĐỦ` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L30) | `Ăn đúng mục tiêu mỗi ngày` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L33) | `Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L53) | `Tiếp tục bằng email` |
| `/signup` | [page.tsx](apps/web/app/signup/page.tsx#L68) | `Bằng việc tiếp tục, bạn đồng ý nhận link đăng nhập qua email.` |

### 1.2. Các thành phần trong `apps/web/components` & hằng số chuỗi trong `apps/web/lib`

| Route / Khu vực | File:Line | Text |
|---|---|---|
| Lịch chọn ngày | [calendar-sheet.tsx](apps/web/components/calendar-sheet.tsx#L12) | `đạt mục tiêu` / `dưới mục tiêu` / `vượt mục tiêu` / `chưa ghi` |
| Lịch chọn ngày | [calendar-sheet.tsx](apps/web/components/calendar-sheet.tsx#L39) | `Chọn ngày` |
| Lịch chọn ngày | [calendar-sheet.tsx](apps/web/components/calendar-sheet.tsx#L47) | `Tháng trước` / `Tháng sau` |
| Lịch chọn ngày | [calendar-sheet.tsx](apps/web/components/calendar-sheet.tsx#L53) | `Tháng {m}, {year}` |
| Lịch chọn ngày | [calendar-sheet.tsx](apps/web/components/calendar-sheet.tsx#L118) | `Hôm nay ({date})` |
| Sao chép hôm qua | [copy-yesterday-sheet.tsx](apps/web/components/copy-yesterday-sheet.tsx#L32) | `{weekday}, {dd}/{mm} · {count} món · {kcal} kcal` |
| Sao chép hôm qua | [copy-yesterday-sheet.tsx](apps/web/components/copy-yesterday-sheet.tsx#L38) | `Sao chép bữa từ hôm qua` |
| Sao chép hôm qua | [copy-yesterday-sheet.tsx](apps/web/components/copy-yesterday-sheet.tsx#L83) | `Sao chép vào hôm nay ({totalSelectedCount} món)` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L73) | `Đã sao chép {items.length} món từ hôm qua` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L93) | `Đã tạo bữa {name}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L101) | `Đã nhân đôi {mealLabel}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L117) | `Đã lưu “{trimmed}” vào Bữa ăn của tôi` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L123) | `Đã xoá {count} món khỏi {mealLabel}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L168) | `Ngày trước` / `Ngày tiếp theo` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L178) | `{totalKcal} kcal · {totalProtein} g đạm` / `chưa có món` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L194) | `Nhật ký` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L211) | `+ Sao chép hôm qua` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L219) | `Mở lịch chọn ngày` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L228) | `Về hôm nay` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L274) | `Chưa ghi` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L283) | `Thêm món vào {section.label}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L292) | `Tuỳ chọn {section.label}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L303) | `Chạm + để thêm món vào {section.label.toLowerCase()}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L334) | `+ Thêm bữa phụ` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L345) | `Đã chọn: {entry.name_vi}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L353) | `Sửa khẩu phần` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L364) | `còn {remainingKcal} kcal · Mục tiêu {min}–{max}` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L369) | `Kcal` / `Đạm` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L387) | `Món trong ngày ({allItems.length})` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L395) | `Chưa có món hôm nay` |
| Nhật ký (`/diary`) | [diary-screen.tsx](apps/web/components/diary/diary-screen.tsx#L408) | `+ Thêm món đầu tiên` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L90) | `Sao chép bữa này từ hôm qua` / `Hôm qua chưa ghi bữa này` / `Lấy các món của bữa tương ứng ngày hôm qua` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L95) | `Lưu thành Bữa của tôi` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L101) | `Bữa này chưa có món` / `Gộp các món hiện tại thành mẫu bữa ăn để dùng lại` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L106) | `Nhân đôi bữa này` / `Tạo bản sao toàn bộ món trong bữa này` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L117) | `Xoá tất cả món trong bữa` / `Xoá {itemCount} món khỏi {mealLabel}` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L126) | `Tên bữa ăn của tôi` / `Lưu vào Bữa ăn của tôi` |
| Thực đơn bữa (`⋯`) | [meal-menu-sheet.tsx](apps/web/components/diary/meal-menu-sheet.tsx#L151) | `Xoá {itemCount} món khỏi {mealLabel}?` / `Xoá tất cả` |
| Thêm bữa phụ | [new-snack-sheet.tsx](apps/web/components/diary/new-snack-sheet.tsx#L30) | `Thêm bữa phụ` / `Tên bữa` / `Tạo bữa` |
| Khám phá (`/explore`) | [explore-sections.tsx](apps/web/components/explore/explore-sections.tsx#L41) | `Yêu thích ({favouriteFoods.length})` / `Xem hết` / `Món của tôi ({myFoods.length})` / `Của tôi` / `Đã ghi gần đây` |
| Khám phá (`/explore`) | [explore-sections.tsx](apps/web/components/explore/explore-sections.tsx#L73) | `Bữa ăn của tôi ({savedMeals.length})` / `Quản lý` |
| Khám phá (`/explore`) | [explore-sections.tsx](apps/web/components/explore/explore-sections.tsx#L98) | `Tất cả món ({filteredFoods.length})` / `Chưa có món phù hợp` |
| Sửa món đã ghi | [entry-editor.tsx](apps/web/components/foods/entry-editor.tsx#L56) | `Khối lượng` / `Số gam` / `Khẩu phần` |
| Sửa món đã ghi | [entry-editor.tsx](apps/web/components/foods/entry-editor.tsx#L97) | `Bữa ăn` |
| Sửa món đã ghi | [entry-editor.tsx](apps/web/components/foods/entry-editor.tsx#L118) | `Đạm` / `Béo` / `Xơ` |
| Sửa món đã ghi | [entry-editor.tsx](apps/web/components/foods/entry-editor.tsx#L134) | `Lưu thay đổi` / `Nhân đôi` / `Xoá món` |
| Vi chất trong món | [food-micros.tsx](apps/web/components/foods/food-micros.tsx#L42) | `Chưa có dữ liệu` |
| Vi chất trong món | [food-micros.tsx](apps/web/components/foods/food-micros.tsx#L70) | `< 0,1 %` / `{pct} %` |
| Vi chất trong món | [food-micros.tsx](apps/web/components/foods/food-micros.tsx#L88) | `Ẩn vi chất chưa có dữ liệu ({unknownRows.length})` / `Hiện thêm {unknownRows.length} vi chất chưa có dữ liệu` |
| Đổi bữa ăn | [meal-switcher.tsx](apps/web/components/meal-switcher.tsx#L23) | `Chọn bữa ăn` / `Mặc định theo giờ: 14:05 → Trước tập` / `trống` |
| Chi tiết vi chất | [contributing-foods.tsx](apps/web/components/nutrient-detail/contributing-foods.tsx#L10) | `Đã có từ món ăn hôm nay` / `Đã có từ món ăn của ngày này` |
| Chi tiết vi chất | [contributing-foods.tsx](apps/web/components/nutrient-detail/contributing-foods.tsx#L15) | `Chưa có món nào có chất này hôm nay.` |
| Chi tiết vi chất | [contributing-foods.tsx](apps/web/components/nutrient-detail/contributing-foods.tsx#L22) | `+ Ghi món ngay` |
| Chi tiết vi chất | [nutrient-history.tsx](apps/web/components/nutrient-detail/nutrient-history.tsx#L14) | `7 ngày gần nhất` / `Mục tiêu {target} {unit}` |
| Chi tiết vi chất | [suggested-foods.tsx](apps/web/components/nutrient-detail/suggested-foods.tsx#L16) | `Gợi ý thực phẩm giàu {nutrientName}` |
| Chi tiết vi chất | [suggested-foods.tsx](apps/web/components/nutrient-detail/suggested-foods.tsx#L39) | `Thêm {s.foodName} vào nhật ký` |
| Thiết lập ban đầu | [magic-link-form.tsx](apps/web/components/onboarding/magic-link-form.tsx#L27) | `Vui lòng nhập địa chỉ email hợp lệ` |
| Thiết lập ban đầu | [magic-link-form.tsx](apps/web/components/onboarding/magic-link-form.tsx#L37) | `Email của bạn` / `Không cần mật khẩu — chúng tôi gửi link một chạm vào hộp thư của bạn.` |
| Thiết lập ban đầu | [setup-form.tsx](apps/web/components/onboarding/setup-form.tsx#L110) | `VỀ BẠN` / `MỤC TIÊU` |
| Thiết lập ban đầu | [setup-form.tsx](apps/web/components/onboarding/setup-form.tsx#L119) | `Cân nặng dùng để tính mục tiêu đạm (1,6–2,2 g/kg) và năng lượng mỗi ngày.` |
| Thiết lập ban đầu | [setup-form.tsx](apps/web/components/onboarding/setup-form.tsx#L125) | `Giới tính` / `Chu kỳ kinh nguyệt` / `Tuổi` / `Chiều cao` / `Cân nặng hiện tại` |
| Thiết lập ban đầu | [setup-form.tsx](apps/web/components/onboarding/setup-form.tsx#L202) | `Chọn lịch tập và mục tiêu — chúng tôi tính sẵn kcal, đạm và 22 vi chất cho bạn.` |
| Thiết lập ban đầu | [setup-form.tsx](apps/web/components/onboarding/setup-form.tsx#L267) | `Bắt đầu ghi bữa ăn` |
| Tổng quan (`/overview`) | [energy-tab.tsx](apps/web/components/overview/energy-tab.tsx#L27) | `Đạm {protein} g ({pct} %)` / `Tinh bột {carbs} g ({pct} %)` / `Béo {fat} g ({pct} %)` |
| Tổng quan (`/overview`) | [energy-tab.tsx](apps/web/components/overview/energy-tab.tsx#L63) | `Kcal theo ngày` / `mục tiêu {min}–{max} kcal` |
| Tổng quan (`/overview`) | [energy-tab.tsx](apps/web/components/overview/energy-tab.tsx#L77) | `trong mục tiêu hoặc trên` / `dưới mục tiêu` / `chưa ghi` |
| Tổng quan (`/overview`) | [energy-tab.tsx](apps/web/components/overview/energy-tab.tsx#L114) | `TB mỗi ngày` / `Kcal theo bữa` / `So với mục tiêu` / `Tỉ lệ năng lượng từ đạm · tinh bột · béo` |
| Tổng quan (`/overview`) | [micros-tab.tsx](apps/web/components/overview/micros-tab.tsx#L29) | `TB 7 ngày · một vạch = 10% mục tiêu` / `TB 30 ngày · một vạch = 10% mục tiêu` |
| Tổng quan (`/overview`) | [micros-tab.tsx](apps/web/components/overview/micros-tab.tsx#L37) | `Chưa có số liệu trong kỳ này` / `chưa có số liệu` / `{pct} % mục tiêu` |
| Tổng quan (`/overview`) | [overview-frame.tsx](apps/web/components/overview/overview-frame.tsx#L17) | `Tổng kết` / `Năng lượng` / `Vi chất` |
| Tổng quan (`/overview`) | [overview-frame.tsx](apps/web/components/overview/overview-frame.tsx#L29) | `Hôm nay` / `7 ngày` / `30 ngày` |
| Tổng quan (`/overview`) | [overview-frame.tsx](apps/web/components/overview/overview-frame.tsx#L65) | `Tổng quan` |
| Tổng quan (`/overview`) | [summary-tab.tsx](apps/web/components/overview/summary-tab.tsx#L60) | `Ghi bữa tối` |
| Tổng quan (`/overview`) | [summary-tab.tsx](apps/web/components/overview/summary-tab.tsx#L89) | `Kcal` / `Đạm` / `Đạt ≥80%` / `Xem chi tiết` |
| Tổng quan (`/overview`) | [summary-tab.tsx](apps/web/components/overview/summary-tab.tsx#L130) | `Cần chú ý hôm nay` / `Cần chú ý trong {periodDays} ngày` |
| Tổng quan (`/overview`) | [summary-tab.tsx](apps/web/components/overview/summary-tab.tsx#L194) | `Nhịp 7 ngày` / `{loggedCount}/7 ngày đã ghi` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L44) | `Sửa cân nặng (hiện tại {weight} kg)` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L91) | `Cơ thể & mục tiêu` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L122) | `Chỉ với Nữ · sắt 18 → 28 mg/ngày` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L177) | `Mục tiêu hôm nay` / `Năng lượng` / `Đạm` / `Tinh bột` / `Béo` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L204) | `Thư viện cá nhân` / `Món yêu thích` / `Bữa ăn của tôi` / `Tạo món mới` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L228) | `Ứng dụng` / `Nhắc nhở` / `Ngôn ngữ & đơn vị` / `Cài như ứng dụng` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L249) | `Gợi ý của Coach, xu hướng 30 ngày, món ăn & công thức riêng` |
| Hồ sơ (`/profile`) | [profile-cards.tsx](apps/web/components/profile/profile-cards.tsx#L261) | `Tài khoản` / `Đăng xuất` / `Xoá tài khoản` |
| Ngày tập (`/training`) | [macro-comparison-card.tsx](apps/web/components/training/macro-comparison-card.tsx#L24) | `Mục tiêu dinh dưỡng theo ngày tập` / `Chỉ số` / `Ngày nghỉ` / `Chênh lệch` |
| Ngày tập (`/training`) | [sodium-progress-card.tsx](apps/web/components/training/sodium-progress-card.tsx#L28) | `Natri · Ngày tập` / `mục tiêu bù điện giải` |
| Ngày tập (`/training`) | [training-tip-banner.tsx](apps/web/components/training/training-tip-banner.tsx#L16) | `Nhấp carb nhẹ trước tập giúp giữ sức bền cho từng hiệp nâng. Nặng mới đốt đường.` |
| Thành phần dùng chung (`ui/`) | [app-header.tsx](apps/web/components/ui/app-header.tsx#L83) | `Quay lại` / `Chuyển nhanh giữa các trang` |
| Thành phần dùng chung (`ui/`) | [bottom-nav.tsx](apps/web/components/ui/bottom-nav.tsx#L26) | `Điều hướng chính` (`Tổng quan`, `Nhật ký`, `Thêm món`, `Khám phá`, `Hồ sơ`) |
| Thành phần dùng chung (`ui/`) | [calorie-dial.tsx](apps/web/components/ui/calorie-dial.tsx#L42) | `Năng lượng` / `Mục tiêu {target}` / `Còn lại {remaining}` |
| Thành phần dùng chung (`ui/`) | [portion-panel.tsx](apps/web/components/ui/portion-panel.tsx#L145) | `Khối lượng` / `Số gam` / `Vi chất trong {gramsInput} g:` / `Đạm` / `Carb` / `Béo` / `Xơ` / `Huỷ` |
| Thành phần dùng chung (`ui/`) | [sheet.tsx](apps/web/components/ui/sheet.tsx#L92) | `Đóng` |
| Thành phần dùng chung (`ui/`) | [sidebar-nav.tsx](apps/web/components/ui/sidebar-nav.tsx#L21) | `Thanh bên điều hướng` / `+ Thêm món` |
| Định dạng & danh mục (`lib/`) | [format.ts](apps/web/lib/format.ts#L156) | `Hôm nay {dd}/{mm}` / `Hôm qua {dd}/{mm}` / `Ngày mai {dd}/{mm}` / `{weekday} {dd}/{mm}` / `{weekday}, {dd}/{mm}/{yyyy}` |
| Định dạng & danh mục (`lib/`) | [food-categories.ts](apps/web/lib/food-categories.ts#L22) | `Tất cả` / `Món Việt` / `Đạm & thịt cá` / `Tinh bột` / `Rau & trái cây` / `Chất béo & hạt` / `Đồ uống & sữa` / `Thực phẩm bổ sung` / `Món của tôi` |
| Định dạng & danh mục (`lib/`) | [food-meta.ts](apps/web/lib/food-meta.ts#L14) | `{kcal} kcal · {protein} g đạm · {carbs} g carb` |
| Định dạng & danh mục (`lib/`) | [levels.ts](apps/web/lib/levels.ts#L31) | `Đạt mục tiêu` / `Gần đạt` / `Trung bình` / `Thấp` |
| Định dạng & danh mục (`lib/`) | [meal-slot.ts](apps/web/lib/meal-slot.ts#L15) | `Bữa sáng` / `Trước tập` / `Bữa trưa` / `Bữa phụ` / `Bữa tối` |
| Định dạng & danh mục (`lib/`) | [nutrients.ts](apps/web/lib/nutrients.ts#L28) | `Năng lượng` / `Đạm` / `Tinh bột tổng` / `Carb ròng` / `Chất xơ` / `Đường` / `Chất béo` + 29 vi chất |

---

## 2. Danh sách vấn đề theo 8 quy tắc (`file:line | current | proposed | rule`)

Các mã quy tắc kiểm tra:
- **R1 (`no-english`)**: Không còn tiếng Anh trên giao diện (trừ thương hiệu `H1T MICRO`, đơn vị đo, tên riêng).
- **R2 (`sentence-case`)**: Viết hoa đầu câu (sentence case) cho nhãn và tiêu đề; không viết HOA TOÀN BỘ chuỗi gốc hoặc Title Case.
- **R3 (`vn-numbers`)**: Số theo định dạng tiếng Việt (`1.041`; `2,5`; `50%` liền dấu `%`).
- **R4 (`vn-dates`)**: Ngày theo định dạng `"Hôm nay 12/10"`, `"Hôm qua 11/10"`, `"Thứ Hai 05/10"`, `"Chủ nhật 04/10"`.
- **R5 (`one-term`)**: Một thuật ngữ duy nhất cho mỗi khái niệm (`Đạm`, `Tinh bột`, `Béo`, `Món`, `Xoá`, `Bữa ăn của tôi`, v.v.).
- **R6 (`same-verb`)**: Cùng hành động dùng cùng một động từ ở mọi nơi (`Thêm`, `Lưu`, `Xoá`, `Sao chép`, `Sửa`, `Quay lại`).
- **R7 (`facts-only`)**: Chỉ nêu số liệu thực tế; không khuyên bảo/`"nên"` ngoài quy tắc huấn luyện, không cảnh báo `"vượt"` giới hạn, không gắn nhãn `"Coach"` trên giao diện.
- **R8 (`natural-vi`)**: Tiếng Việt ngắn gọn, tự nhiên; không còn chuỗi giữ chỗ (`[GIÁ/THÁNG]`), câu dịch máy hoặc sai ngữ cảnh.

| File:Line | Current | Proposed | Rule |
|---|---|---|---|
| [calendar-sheet.tsx:14](apps/web/components/calendar-sheet.tsx#L14) | `over: "vượt mục tiêu"` (đọc trong `aria-label` lịch chọn ngày ở dòng 99) | `over: "đạt mục tiêu"` (hoặc `"trên mức tối thiểu"`) | **R7 (`facts-only`)** — Cấm cảnh báo vượt giới hạn hoặc dùng từ `"vượt"` ở bất kỳ đâu |
| [profile-cards.tsx:249](apps/web/components/profile/profile-cards.tsx#L249) | `Gợi ý của Coach, xu hướng 30 ngày, món ăn & công thức riêng` | `Mục tiêu theo ngày tập, xu hướng 30 ngày và thư viện món ăn đầy đủ` | **R7 (`facts-only`)** — Không gắn nhãn `"Coach"` hoặc hứa hẹn tính năng gợi ý/công thức ngoài phạm vi |
| [paywall/page.tsx:23](apps/web/app/paywall/page.tsx#L23) | `Món & công thức riêng của Coach` | `Thư viện món Việt & món tự tạo không giới hạn` | **R7 (`facts-only`)** — Không dùng nhãn `"Coach"` trong UI |
| [paywall/page.tsx:37](apps/web/app/paywall/page.tsx#L37) | `Ăn theo Coach, không phải đoán` | `Theo dõi sát mục tiêu, không phải đoán` | **R7 (`facts-only`)** — Không dùng nhãn `"Coach"` trong UI |
| [signup/page.tsx:8](apps/web/app/signup/page.tsx#L8) | `Mục tiêu do Coach Lê Hồng Khánh đặt` | `Mục tiêu cá nhân hoá theo ngày tập và ngày nghỉ` | **R7 (`facts-only`)** — Không dùng nhãn `"Coach"` trong UI |
| [signup/page.tsx:33](apps/web/app/signup/page.tsx#L33) | `Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.` | `Thêm món mỗi bữa, theo dõi 22 vi chất và bám sát mục tiêu mỗi ngày.` | **R7 (`facts-only`)** — Không dùng nhãn `"Coach"` trong UI |
| [admin/review/page.tsx:50](apps/web/app/admin/review/page.tsx#L50) | `Admin RBAC Guarded` | `Khu vực quản trị` | **R1 (`no-english`)** — Toàn bộ trang `/admin/review` đang viết bằng tiếng Anh |
| [admin/review/page.tsx:52](apps/web/app/admin/review/page.tsx#L52) | `Coach Vault Review` | `Duyệt nội dung thực đơn` | **R1 (`no-english`)** & **R7 (`facts-only`)** — Tiếng Anh + từ `"Coach"` + Title Case |
| [admin/review/page.tsx:55](apps/web/app/admin/review/page.tsx#L55) | `Review and publish markdown meal plans synchronized from GitHub repository` | `Xem và duyệt các bản nháp thực đơn đồng bộ từ kho lưu trữ.` | **R1 (`no-english`)** — Câu mô tả tiếng Anh |
| [admin/review/page.tsx:61](apps/web/app/admin/review/page.tsx#L61) | `aria-label="Filter drafts"` + các nút `all`, `draft`, `published`, `rejected` | `aria-label="Lọc bản nháp"` + `Tất cả`, `Bản nháp`, `Đã đăng`, `Từ chối` | **R1 (`no-english`)** — Nhãn lọc và `aria-label` bằng tiếng Anh |
| [admin/review/page.tsx:108](apps/web/app/admin/review/page.tsx#L108) | `Approve` / `Reject` / `Status: {draft.status}` | `Duyệt` / `Từ chối` / `Trạng thái: {statusVi}` | **R1 (`no-english`)** — Nút hành động và nhãn trạng thái bằng tiếng Anh |
| [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120) | `{food.source === "user" ? "Của tôi" : food.source}` (hiển thị thẳng `"usda"`, `"vn-fct"`, `"custom"`) | Ánh xạ sang nhãn tiếng Việt (`"Món của tôi"`, `"Viện Dinh dưỡng VN"`, `"USDA"`) | **R1 (`no-english`)** & **R5 (`one-term`)** — Rò rỉ mã nguồn dữ liệu thô ra chip giao diện |
| [food-meta.ts:22](apps/web/lib/food-meta.ts#L22) | `food.source === "user" ? "Của tôi" : food.source` | Đồng bộ nhãn nguồn dữ liệu với `foods/[id]/page.tsx` (`"Món của tôi"`) | **R1 (`no-english`)** & **R5 (`one-term`)** — Hiển thị mã `source` thô nếu khác `"user"` |
| [not-found.tsx:20](apps/web/app/not-found.tsx#L20) | `Link có thể đã cũ hoặc đã đổi địa chỉ.` | `Đường dẫn có thể đã cũ hoặc đã đổi địa chỉ.` | **R1 (`no-english`)** — Dùng từ tiếng Anh `"Link"` thay vì `"Đường dẫn"` / `"Liên kết"` |
| [signin/page.tsx:30](apps/web/app/signin/page.tsx#L30) | `Gửi link đăng nhập` | `Gửi liên kết đăng nhập` | **R1 (`no-english`)** — Từ vay mượn `"link"` |
| [signin/check-email/page.tsx:58](apps/web/app/signin/check-email/page.tsx#L58) | `Chạm vào link trong thư để vào thẳng Nhật ký. Link có hiệu lực trong 15 phút.` | `Chạm vào liên kết trong thư để vào thẳng Nhật ký. Liên kết có hiệu lực trong 15 phút.` | **R1 (`no-english`)** — Từ vay mượn `"link"` |
| [signin/check-email/page.tsx:66](apps/web/app/signin/check-email/page.tsx#L66) | `Mở ứng dụng Mail` / `Gửi lại link` / `Không thấy thư? Kiểm tra mục Quảng cáo hoặc Spam.` / `Mô phỏng mở link (dev)` | `Mở ứng dụng Thư` / `Gửi lại liên kết` / `Không thấy thư? Kiểm tra mục Quảng cáo hoặc Thư rác.` / `Mở liên kết thử nghiệm` | **R1 (`no-english`)** — Dùng `"Mail"`, `"link"`, `"Spam"`, `"(dev)"` |
| [signin/expired/page.tsx:29](apps/web/app/signin/expired/page.tsx#L29) | `LINK ĐÃ HẾT HẠN` / `Link đăng nhập này không còn dùng được` / `Gửi link mới` | `Liên kết đã hết hạn` / `Liên kết đăng nhập này không còn dùng được` / `Gửi liên kết mới` | **R1 (`no-english`)** & **R2 (`sentence-case`)** — Dùng `"link"` và viết HOA TOÀN BỘ |
| [signup/page.tsx:23](apps/web/app/signup/page.tsx#L23) | `1 SET LÀ ĐỦ` | `Một hiệp là đủ` (hoặc bỏ chip khẩu hiệu tiếng Anh pha trộn) | **R1 (`no-english`)** & **R2 (`sentence-case`)** — Từ `"SET"` tiếng Anh và viết HOA TOÀN BỘ |
| [signup/page.tsx:68](apps/web/app/signup/page.tsx#L68) | `Bằng việc tiếp tục, bạn đồng ý nhận link đăng nhập qua email.` | `Bằng việc tiếp tục, bạn đồng ý nhận liên kết đăng nhập qua email.` | **R1 (`no-english`)** — Từ `"link"` |
| [magic-link-form.tsx:41](apps/web/components/onboarding/magic-link-form.tsx#L41) | `Không cần mật khẩu — chúng tôi gửi link một chạm vào hộp thư của bạn.` | `Không cần mật khẩu — chúng tôi gửi liên kết đăng nhập vào hộp thư của bạn.` | **R1 (`no-english`)** — Từ `"link"` |
| [dev/ui/page.tsx:49](apps/web/app/dev/ui/page.tsx#L49) | `Variant "daily" — Chế độ xem hàng ngày` / `Light tone` / `Primary` / `Secondary` / `Destructive` / `Chip (44px tap targets)` / `Mở Sheet Demo` | Việt hoá các nhãn trưng bày trong trang `/dev/ui` | **R1 (`no-english`)** — Nhãn tiếng Anh trên trang kiểm thử UI |
| [layout.tsx:22](apps/web/app/layout.tsx#L22) | `H1T MICRO \| Dinh dưỡng & Vi chất Chuyên sâu` | `H1T MICRO \| Dinh dưỡng & vi chất chuyên sâu` | **R2 (`sentence-case`)** — Viết hoa kiểu Title Case (`Vi chất Chuyên sâu`) |
| [paywall/page.tsx:144](apps/web/app/paywall/page.tsx#L144) | `Bạn đang ở Gói Miễn phí — vẫn ghi được 3 bữa/ngày và xem 5 vi chất cơ bản.` | `Bạn đang ở gói miễn phí — vẫn thêm được 3 bữa/ngày và xem 5 vi chất cơ bản.` | **R2 (`sentence-case`)** — Viết hoa `Gói Miễn phí` giữa câu |
| [profile-cards.tsx:122](apps/web/components/profile/profile-cards.tsx#L122) | `Chỉ với Nữ · sắt 18 → 28 mg/ngày` | `Chỉ với nữ · sắt 18 → 28 mg/ngày` | **R2 (`sentence-case`)** — Viết hoa `Nữ` giữa câu |
| [diary-screen.tsx:364](apps/web/components/diary/diary-screen.tsx#L364) | `còn {remainingKcal} kcal · Mục tiêu {min}–{max}` | `Còn {remainingKcal} kcal · mục tiêu {min}–{max}` | **R2 (`sentence-case`)** — Đầu dòng viết thường `còn`, sau dấu `·` lại viết hoa `Mục tiêu` (trong khi `energy-tab.tsx:140` viết `mục tiêu`) |
| [foods/[id]/page.tsx:65](apps/web/app/foods/[id]/page.tsx#L65) | `Đã bỏ khỏi Yêu thích` / `Đã lưu vào Yêu thích` | `Đã bỏ khỏi yêu thích` / `Đã thêm vào yêu thích` | **R2 (`sentence-case`)** & **R6 (`same-verb`)** — Viết hoa `Yêu thích` giữa câu và lệch động từ với `aria-label="Thêm vào yêu thích"` ở dòng 127 |
| [install/page.tsx:92](apps/web/app/install/page.tsx#L92) | `Chạm nút Chia sẻ` / `Chọn “Thêm vào MH chính”` (dòng 121) / `Chọn “Thêm vào Màn hình chính”` (dòng 163) | `Chạm nút chia sẻ` / `Chọn “Thêm vào màn hình chính”` (thống nhất cả iOS và Android, không viết tắt `MH`) | **R2 (`sentence-case`)** & **R5 (`one-term`)** — Viết hoa giữa câu và viết tắt `MH chính` không đồng nhất |
| [training/page.tsx:154](apps/web/app/(dashboard)/training/page.tsx#L154) | `title="NGÀY TẬP"` (cũng ở dòng 218) | `title="Ngày tập"` | **R2 (`sentence-case`)** — Truyền chuỗi ALL-CAPS vào `AppHeader` (component đã có CSS `uppercase`, truyền chuỗi hoa làm trình đọc màn hình đọc từng chữ hoặc lệch với `"Tổng quan"`, `"Nhật ký"`) |
| [foods/new/page.tsx:136](apps/web/app/foods/new/page.tsx#L136) | `title="TẠO MÓN MỚI"` | `title="Tạo món mới"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [micros/page.tsx:277](apps/web/app/micros/page.tsx#L277) | `title="VI CHẤT"` (cũng ở dòng 297, 335, 452) | `title="Vi chất"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [settings/profile/weight/page.tsx:120](apps/web/app/settings/profile/weight/page.tsx#L120) | `title="CÂN NẶNG"` | `title="Cân nặng"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [settings/language/page.tsx:34](apps/web/app/settings/language/page.tsx#L34) | `title="NGÔN NGỮ"` | `title="Ngôn ngữ"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [settings/notifications/page.tsx:116](apps/web/app/settings/notifications/page.tsx#L116) | `title="NHẮC NHỞ"` | `title="Nhắc nhở"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [settings/delete-account/page.tsx:47](apps/web/app/settings/delete-account/page.tsx#L47) | `title="XOÁ TÀI KHOẢN"` | `title="Xoá tài khoản"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [install/page.tsx:17](apps/web/app/install/page.tsx#L17) | `title="THÊM VÀO MÀN HÌNH CHÍNH"` | `title="Thêm vào màn hình chính"` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [setup-form.tsx:110](apps/web/components/onboarding/setup-form.tsx#L110) | `title={step === 1 ? "VỀ BẠN" : "MỤC TIÊU"}` | `title={step === 1 ? "Về bạn" : "Mục tiêu"}` | **R2 (`sentence-case`)** — Chuỗi gốc viết HOA TOÀN BỘ |
| [profile-screen.tsx:26](apps/web/components/profile/profile-screen.tsx#L26) | `title={title.toUpperCase()}` | `title={title}` | **R2 (`sentence-case`)** — Ép `.toUpperCase()` lên chuỗi tiếng Việt trước khi truyền vào `AppHeader` |
| [format.ts:195](apps/web/lib/format.ts#L195) | `return \`${formatNumber(value, decimals)} %\`;` (có khoảng trắng trước `%`) | `return \`${formatNumber(value, decimals)}%\`;` (viết liền `50%`) | **R3 (`vn-numbers`)** — Quy tắc yêu cầu `50%` không có khoảng trắng; hiện `formatPercent` sinh `"50 %"` gây lệch với `micros/page.tsx` (`"≥80%"`, `"10%"`) |
| [explore/rich/[nutrient]/page.tsx:60](apps/web/app/explore/rich/[nutrient]/page.tsx#L60) | `{formatNumber(row.pct)} % mục tiêu ngày` | `{formatNumber(row.pct)}% mục tiêu ngày` | **R3 (`vn-numbers`)** — Thừa khoảng trắng trước `%` |
| [food-micros.tsx:10](apps/web/components/foods/food-micros.tsx#L10) | `"< 0,1 %"` / `` `${formatNumber(pct, 0)} %` `` (cũng ở dòng 63, 70) | `"<0,1%"` / `` `${formatNumber(pct, 0)}%` `` | **R3 (`vn-numbers`)** — Thừa khoảng trắng trước `%` |
| [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27) | `({formatNumber(macro.pct)} %)` / `{row.share} %` (dòng 182, 250) | `({formatNumber(macro.pct)}%)` / `{formatNumber(row.share)}%` | **R3 (`vn-numbers`)** — Thừa khoảng trắng trước `%` và `row.share` chưa qua `formatNumber` |
| [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54) | `${formatNumber(row.pct)} % mục tiêu` (cũng ở dòng 63) | `${formatNumber(row.pct)}% mục tiêu` | **R3 (`vn-numbers`)** — Thừa khoảng trắng trước `%` |
| [foods/[id]/page.tsx:83](apps/web/app/foods/[id]/page.tsx#L83) | `portionLabel = selectedMeasure?.label ?? \`${gramsInput} g\`` (cũng ở dòng 204) | `portionLabel = selectedMeasure?.label ?? formatAmount(parsedGrams, "g")` | **R3 (`vn-numbers`)** — Chuỗi `gramsInput` thô không định dạng dấu phẩy/chấm hàng nghìn tiếng Việt (ví dụ `1000 g` thay vì `1.000 g`, `2.5 g` thay vì `2,5 g`) |
| [foods/new/page.tsx:114](apps/web/app/foods/new/page.tsx#L114) | `` `${parsedSize} ${servingUnit}` `` (và dòng 210 `{servingSize \|\| "100"} {servingUnit}`) | `formatAmount(parsedSize, servingUnit)` | **R3 (`vn-numbers`)** — Nội suy thẳng số thực JavaScript (`parsedSize`) thay vì `formatNumber` |
| [entry-editor.tsx:72](apps/web/components/foods/entry-editor.tsx#L72) | `` `${e.target.value} g` `` | `formatAmount(Number(e.target.value) \|\| 0, "g")` | **R3 (`vn-numbers`)** — Chuỗi khối lượng lưu vào nhật ký không qua `formatNumber` |
| [portion-panel.tsx:153](apps/web/components/ui/portion-panel.tsx#L153) | `Vi chất trong {gramsInput} g:` (và dòng 220) | `Vi chất trong {formatAmount(grams, "g")}:` | **R3 (`vn-numbers`)** — Hiển thị trực tiếp chuỗi `gramsInput` thô |
| [diary-edits.ts:149](apps/web/lib/diary-edits.ts#L149) | `` `${edit.grams} g` `` (cũng ở dòng 294, 302) | `formatAmount(edit.grams, "g")` | **R3 (`vn-numbers`)** — Nội suy số `grams` thô không qua `formatNumber` |
| [copy-yesterday-sheet.tsx:32](apps/web/components/copy-yesterday-sheet.tsx#L32) | `{getWeekdayName(yesterday)}, {yesterday.slice(8)}/{yesterday.slice(5, 7)}` (ví dụ: `"Thứ Bảy, 10/10"`) | `{formatShortDate(yesterday, today)}` (ví dụ: `"Hôm qua 10/10"` hoặc không có dấu phẩy) | **R4 (`vn-dates`)** — Có dấu phẩy sau thứ và không hiển thị `"Hôm qua dd/mm"` theo quy chuẩn |
| [format.ts:176](apps/web/lib/format.ts#L176) | `return \`${getWeekdayName(dateStr)}, ${d}/${m}/${y}\`;` (ví dụ: `"Thứ Bảy, 10/10/2026"`) | `return \`${formatShortDate(dateStr, today)}\`;` (ví dụ: `"Hôm nay 10/10"` hoặc `"Thứ Bảy 10/10"`) | **R4 (`vn-dates`)** — `formatDesktopDate` thêm dấu phẩy và năm `/yyyy` lệch với quy chuẩn `"Thứ Hai 05/10"` |
| [calendar-sheet.tsx:53](apps/web/components/calendar-sheet.tsx#L53) | `Tháng {Number(m)}, {month.slice(0, 4)}` (ví dụ: `"Tháng 10, 2026"`) | `Tháng {Number(m)}/{month.slice(0, 4)}` | **R4 (`vn-dates`)** — Dùng dấu phẩy kiểu tiếng Anh `"Tháng 10, 2026"` |
| [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95) | `Lưu thành Bữa của tôi` | `Lưu thành Bữa ăn của tôi` | **R5 (`one-term`)** — Thuật ngữ cố định đã chốt (Hao 13/10): `"Bữa ăn của tôi"` (hướng dẫn ở `add/page.tsx:336` đã ghi `"Lưu thành Bữa ăn của tôi"`, nhưng nút thật trong sheet vẫn là `"Bữa của tôi"`) |
| [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196) | `Carb` | `Tinh bột` | **R5 (`one-term`)** — Lẫn lộn `"Carb"` và `"Tinh bột"` giữa các màn hình (`foods/new`, `overview`, `profile`, `micros` dùng `"Tinh bột"`) |
| [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193) | `Carb` | `Tinh bột` | **R5 (`one-term`)** — Dùng `"Carb"` thay vì `"Tinh bột"` |
| [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) | `{formatNumber(Math.round(food.carbs_g))} g carb` | `{formatNumber(Math.round(food.carbs_g))} g tinh bột` | **R5 (`one-term`)** — Dùng `"g carb"` dưới dòng phụ của mọi thẻ món ăn trong khi toàn ứng dụng gọi là `"Tinh bột"` |
| [nutrients.ts:36](apps/web/lib/nutrients.ts#L36) | `Tinh bột tổng` (`carbs_g`) & `Carb ròng` (`net_carbs_g`) | `Tinh bột` & `Tinh bột hấp thu` (hoặc thống nhất theo quyết định thuật ngữ) | **R5 (`one-term`)** — Dùng cả `"Tinh bột tổng"` lẫn `"Carb ròng"` trong cùng bảng định nghĩa |
| [training.ts:165](apps/web/lib/training.ts#L165) | `focusNutrient: "Carb nhanh"` / `"Carb + Đạm"` (dòng 176) | `focusNutrient: "Tinh bột hấp thu nhanh"` / `"Tinh bột + Đạm"` | **R5 (`one-term`)** — Dùng `"Carb"` trong thẻ dinh dưỡng quanh buổi tập |
| [training-tip-banner.tsx:16](apps/web/components/training/training-tip-banner.tsx#L16) | `Nhấp carb nhẹ trước tập giúp giữ sức bền cho từng hiệp nâng. Nặng mới đốt đường.` | `Ăn nhẹ tinh bột trước buổi tập giúp giữ sức bền cho từng hiệp nâng.` | **R5 (`one-term`)** & **R8 (`natural-vi`)** — Pha trộn `"carb"` và `"đường"`, diễn đạt khẩu ngữ cứng |
| [micros/page.tsx:30](apps/web/app/micros/page.tsx#L30) | `Chất béo` (cũng ở dòng 221 và `nutrients.ts:46`) | `Béo` (hoặc thống nhất `"Chất béo"` trên toàn bộ thẻ macro) | **R5 (`one-term`)** — Các màn hình `overview`, `profile`, `foods/[id]`, `foods/new`, `entry-editor` dùng `"Béo"`, riêng `micros` và `nutrients.ts` dùng `"Chất béo"` |
| [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7) | `Theo dõi đầy đủ vi chất, không chỉ calo` | `Theo dõi đầy đủ vi chất, không chỉ năng lượng (kcal)` | **R5 (`one-term`)** — Duy nhất trang đăng ký dùng từ `"calo"`, các trang khác dùng `"Năng lượng"` hoặc `"kcal"` |
| [food-categories.ts:33](apps/web/lib/food-categories.ts#L33) | `Thực phẩm bổ sung` | `Món bổ sung` (hoặc giữ `"Thực phẩm bổ sung"` nếu tách riêng khỏi món ăn) | **R5 (`one-term`)** — Kết hợp với `suggested-foods.tsx:16` (`"Gợi ý thực phẩm giàu..."`) dùng `"thực phẩm"` trong khi toàn bộ ứng dụng dùng `"món"` / `"món ăn"` |
| [suggested-foods.tsx:16](apps/web/components/nutrient-detail/suggested-foods.tsx#L16) | `Gợi ý thực phẩm giàu {nutrientName}` | `Món giàu {nutrientName}` (giống `/explore/rich/[nutrient]`) | **R5 (`one-term`)** & **R7 (`facts-only`)** — Dùng `"Gợi ý thực phẩm"` thay vì `"Món giàu..."` |
| [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) | `Ưa thích` | `Yêu thích` | **R5 (`one-term`)** — Dùng `"Ưa thích"` trong khi toàn bộ ứng dụng dùng `"Yêu thích"` |
| [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) | `Tùy chỉnh` (dấu huyền trên `u`: `ù`) | `Tuỳ chỉnh` (dấu huyền trên `y`: `ỳ`, đồng bộ với `Tuỳ chọn` ở `diary-screen.tsx:292` và chuẩn `Xoá`/`Huỷ`) | **R5 (`one-term`)** — Lệch quy tắc bỏ dấu chính tả (`Tùy` vs `Tuỳ`) |
| [micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37) | `Chưa có số liệu trong kỳ này` / `chưa có số liệu` (dòng 54, 64) | `Chưa có dữ liệu trong kỳ này` / `chưa có dữ liệu` | **R5 (`one-term`)** — Trang `/micros` và `food-micros.tsx` dùng `"chưa có dữ liệu"`, còn tab Vi chất của `/overview` lại dùng `"chưa có số liệu"` |
| [foods/new/page.tsx:214](apps/web/app/foods/new/page.tsx#L214) | `Bỏ trống vi chất = "chưa biết" (không tính là 0).` | `Bỏ trống vi chất = chưa có dữ liệu (không tính là 0).` | **R5 (`one-term`)** — Dùng `"chưa biết"` thay vì `"chưa có dữ liệu"` |
| [sample-day.ts:441](apps/web/lib/mock/sample-day.ts#L441) | `Folate (B9)` & `Natri (muối)` (dòng 238) | `Vitamin B9` & `Natri` (đồng bộ với `lib/nutrients.ts:78,95`) | **R5 (`one-term`)** — Tên vi chất trong dữ liệu mẫu lệch với từ điển chuẩn `lib/nutrients.ts` |
| [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) | `Ghi {nextMeal.label.toLowerCase()}` (ví dụ: `"Ghi bữa tối"`) | `Thêm món vào {nextMeal.label.toLowerCase()}` | **R6 (`same-verb`)** — Thanh điều hướng và `/add` dùng động từ `"Thêm món"`, nhưng banner trên Tổng quan lại dùng `"Ghi bữa..."` |
| [micros/page.tsx:285](apps/web/app/micros/page.tsx#L285) | `Bắt đầu ghi món để đo lường` / `Chưa ghi món nào hôm nay` (dòng 302) / `+ Ghi món ngay` (dòng 310) | `Thêm món để xem vi chất` / `Chưa có món hôm nay` / `+ Thêm món` | **R6 (`same-verb`)** — Dùng `"+ Ghi món ngay"` trong khi `/diary` dùng `"+ Thêm món đầu tiên"` và thanh điều hướng dùng `"Thêm món"` |
| [contributing-foods.tsx:22](apps/web/components/nutrient-detail/contributing-foods.tsx#L22) | `+ Ghi món ngay` | `+ Thêm món` | **R6 (`same-verb`)** — Lệch động từ với `"Thêm món"` |
| [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) | `Bắt đầu ghi bữa ăn` (cũng ở dòng 277) | `Bắt đầu thêm món` (hoặc `Vào Nhật ký`) | **R6 (`same-verb`)** — Lệch động từ với `"Thêm món"` |
| [entry/[id]/page.tsx:45](apps/web/app/entry/[id]/page.tsx#L45) | `<Link href="/diary">Về Tổng quan</Link>` | `<Link href="/diary">Về Nhật ký</Link>` | **R6 (`same-verb`)** & **R8 (`natural-vi`)** — Nhãn nút ghi `"Về Tổng quan"` nhưng đường dẫn `href="/diary"` lại đưa về trang **Nhật ký** |
| [micros/[nutrient]/page.tsx:80](apps/web/app/micros/[nutrient]/page.tsx#L80) | `Quay lại Vi chất` | `Về Vi chất` (hoặc thống nhất `"Quay lại <trang>"` trên mọi màn hình lỗi 404) | **R6 (`same-verb`)** — Các trang không tìm thấy khác (`error.tsx`, `not-found.tsx`, `foods/[id]`, `micros`) dùng `"Về <Trang>"`, riêng `micros/[nutrient]` dùng `"Quay lại Vi chất"` |
| [profile-cards.tsx:235](apps/web/components/profile/profile-cards.tsx#L235) | `Cài như ứng dụng` (mở trang `/install` có tiêu đề `"Thêm vào màn hình chính"`) | `Thêm vào màn hình chính` | **R6 (`same-verb`)** — Tên mục trong Hồ sơ khác với tiêu đề trang đích `/install` |
| [paywall/page.tsx:16](apps/web/app/paywall/page.tsx#L16) | `[GIÁ/THÁNG]` / `[GIÁ/NĂM]` (dòng 17) / `Tiết kiệm [X]%` (dòng 17) / `Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN]` (dòng 135) | Điền số liệu thật hoặc ẩn phần giá/nhà cung cấp khi chưa cấu hình thanh toán | **R8 (`natural-vi`)** — Chuỗi giữ chỗ trong ngoặc vuông `[...]` hiển thị trực tiếp cho người dùng cuối |
| [micros/page.tsx:304](apps/web/app/micros/page.tsx#L304) | `Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.` | `Thêm món vào nhật ký để theo dõi 22 vi chất mỗi ngày.` | **R8 (`natural-vi`)** — Cụm `"ghi nhận món ăn"` cứng; con số `"58 chỉ số vi chất"` mâu thuẫn với `"22 vi chất"` ở `layout.tsx:23`, `setup-form.tsx:203`, `paywall/page.tsx:21` và `nutrients.ts` (35 chất tất cả) |
| [energy-tab.tsx:77](apps/web/components/overview/energy-tab.tsx#L77) | `trong mục tiêu hoặc trên` (trong `aria-label` biểu đồ cột 7/30 ngày) | `đạt mục tiêu` | **R8 (`natural-vi`)** — Dịch sát từng chữ từ `"in target or above"`, nghe không tự nhiên trong tiếng Việt |
| [contributing-foods.tsx:15](apps/web/components/nutrient-detail/contributing-foods.tsx#L15) | `Chưa có món nào có chất này hôm nay.` | `{isToday ? "Chưa có món nào có chất này hôm nay." : "Chưa có món nào có chất này trong ngày này."}` | **R8 (`natural-vi`)** — Khi xem ngày cũ qua `?date=`, tiêu đề đã đổi sang `"Đã có từ món ăn của ngày này"` nhưng trạng thái rỗng vẫn cố định chữ `"hôm nay"` |
| [entry/[id]/page.tsx:41](apps/web/app/entry/[id]/page.tsx#L41) | `Món này có thể đã bị xoá hoặc không tồn tại trong nhật ký hôm nay.` | `Món này có thể đã bị xoá hoặc không tồn tại trong nhật ký.` | **R8 (`natural-vi`)** — Người dùng có thể mở món từ ngày khác trong lịch sử, không chỉ `"hôm nay"` |
| [meal-switcher.tsx:23](apps/web/components/meal-switcher.tsx#L23) | `defaultHint = "Mặc định theo giờ: 14:05 → Trước tập"` | Tính động theo giờ thực tế hoặc dùng `"Mặc định theo giờ hiện tại"` | **R8 (`natural-vi`)** — Chuỗi giờ cứng `"14:05 → Trước tập"` hiển thị sai thực tế khi mở `MealSwitcher` mà không truyền `defaultHint` |

---

## 3. Bảng thuật ngữ chuẩn (Glossary) & các biến thể đang tồn tại

Bảng dưới đây tổng hợp mỗi khái niệm, thuật ngữ chuẩn đề xuất (hoặc đã chốt), các biến thể đang xuất hiện trong mã nguồn kèm vị trí `file:line`, và đánh dấu những mục **cần Hao chốt**.

| Khái niệm | Thuật ngữ chuẩn | Các biến thể tìm thấy & vị trí (`file:line`) | Trạng thái / Quyết định |
|---|---|---|---|
| **Mẫu bữa ăn đã lưu** *(Saved meals)* | **Bữa ăn của tôi** | • **Bữa ăn của tôi**: [add/page.tsx:225](apps/web/app/add/page.tsx#L225), [add/page.tsx:336](apps/web/app/add/page.tsx#L336), [diary-screen.tsx:117](apps/web/components/diary/diary-screen.tsx#L117), [meal-menu-sheet.tsx:126](apps/web/components/diary/meal-menu-sheet.tsx#L126), [meal-menu-sheet.tsx:143](apps/web/components/diary/meal-menu-sheet.tsx#L143), [explore-sections.tsx:73](apps/web/components/explore/explore-sections.tsx#L73), [profile-cards.tsx:210](apps/web/components/profile/profile-cards.tsx#L210)<br>• **Bữa của tôi** *(lệch)*: [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95) (`"Lưu thành Bữa của tôi"`)<br>• **Bữa ăn đã lưu** *(trong câu trống)*: [add/page.tsx:334](apps/web/app/add/page.tsx#L334) (`"Chưa có bữa ăn đã lưu"`) | **Đã chốt bởi Hao (13/10):** `"Bữa ăn của tôi"` (`cc2-12` đang đổi `"Bữa của tôi"` ở [meal-menu-sheet.tsx:95](apps/web/components/diary/meal-menu-sheet.tsx#L95)). |
| **Carbohydrate** | **Tinh bột** | • **Tinh bột**: [foods/new/page.tsx:243](apps/web/app/foods/new/page.tsx#L243), [micros/page.tsx:31](apps/web/app/micros/page.tsx#L31), [micros/page.tsx:222](apps/web/app/micros/page.tsx#L222), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [energy-tab.tsx:146](apps/web/components/overview/energy-tab.tsx#L146), [profile-cards.tsx:189](apps/web/components/profile/profile-cards.tsx#L189), [food-categories.ts:25](apps/web/lib/food-categories.ts#L25), [onboarding.ts:126](apps/web/lib/onboarding.ts#L126), [period.ts:170](apps/web/lib/period.ts#L170), [sample-day.ts:160](apps/web/lib/mock/sample-day.ts#L160)<br>• **Carb**: [foods/[id]/page.tsx:196](apps/web/app/foods/[id]/page.tsx#L196), [portion-panel.tsx:193](apps/web/components/ui/portion-panel.tsx#L193), [food-meta.ts:14](apps/web/lib/food-meta.ts#L14) (`"g carb"`), [training.ts:165](apps/web/lib/training.ts#L165) (`"Carb nhanh"`), [training-tip-banner.tsx:16](apps/web/components/training/training-tip-banner.tsx#L16)<br>• **Tinh bột tổng** / **Carb ròng**: [nutrients.ts:36](apps/web/lib/nutrients.ts#L36), [nutrients.ts:37](apps/web/lib/nutrients.ts#L37) | **Cần Hao chốt:** Dùng **`Tinh bột`** ở mọi nơi (kể cả dòng phụ món ăn `g tinh bột` và ô macro 4 cột trên `/foods/[id]`), hay cho phép viết tắt **`Carb`** ở các ô hẹp? |
| **Lipid / Fat** | **Béo** *(trong bảng 3–4 cột)* / **Chất béo** *(tên đầy đủ)* | • **Béo**: [foods/[id]/page.tsx:198](apps/web/app/foods/[id]/page.tsx#L198), [foods/new/page.tsx:255](apps/web/app/foods/new/page.tsx#L255), [entry-editor.tsx:122](apps/web/components/foods/entry-editor.tsx#L122), [portion-panel.tsx:195](apps/web/components/ui/portion-panel.tsx#L195), [energy-tab.tsx:27](apps/web/components/overview/energy-tab.tsx#L27), [energy-tab.tsx:154](apps/web/components/overview/energy-tab.tsx#L154), [profile-cards.tsx:190](apps/web/components/profile/profile-cards.tsx#L190), [onboarding.ts:128](apps/web/lib/onboarding.ts#L128), [period.ts:171](apps/web/lib/period.ts#L171)<br>• **Chất béo**: [micros/page.tsx:30](apps/web/app/micros/page.tsx#L30), [micros/page.tsx:221](apps/web/app/micros/page.tsx#L221), [nutrients.ts:46](apps/web/lib/nutrients.ts#L46), [food-categories.ts:27](apps/web/lib/food-categories.ts#L27) | **Cần Hao chốt:** Thống nhất một từ duy nhất (**`Béo`** hoặc **`Chất béo`**) trên toàn bộ màn hình. |
| **Chất xơ** *(Fiber)* | **Chất xơ** *(hoặc **Xơ** ở ô 4 cột)* | • **Chất xơ**: [foods/new/page.tsx:285](apps/web/app/foods/new/page.tsx#L285), [micros/page.tsx:31](apps/web/app/micros/page.tsx#L31), [nutrients.ts:38](apps/web/lib/nutrients.ts#L38)<br>• **Xơ**: [foods/[id]/page.tsx:200](apps/web/app/foods/[id]/page.tsx#L200), [entry-editor.tsx:126](apps/web/components/foods/entry-editor.tsx#L126), [portion-panel.tsx:197](apps/web/components/ui/portion-panel.tsx#L197) | **Cần Hao chốt:** Đổi **`Xơ`** thành **`Chất xơ`** hay giữ **`Xơ`** trong lưới 4 ô (`Đạm · Tinh bột · Béo · Xơ`)? |
| **Protein** | **Đạm** | • **Đạm**: Dùng nhất quán trên toàn bộ `app/` và `components/` ([layout.tsx:23](apps/web/app/layout.tsx#L23), [diary-screen.tsx:375](apps/web/components/diary/diary-screen.tsx#L375), [summary-tab.tsx:96](apps/web/components/overview/summary-tab.tsx#L96), [nutrients.ts:29](apps/web/lib/nutrients.ts#L29), v.v.) | Đã đồng nhất (`Đạm`). |
| **Năng lượng** *(Calories)* | **Năng lượng** *(nhãn)* / **kcal** *(đơn vị)* | • **Năng lượng**: [foods/new/page.tsx:219](apps/web/app/foods/new/page.tsx#L219), [overview-frame.tsx:18](apps/web/components/overview/overview-frame.tsx#L18), [profile-cards.tsx:188](apps/web/components/profile/profile-cards.tsx#L188), [calorie-dial.tsx:42](apps/web/components/ui/calorie-dial.tsx#L42), [nutrients.ts:28](apps/web/lib/nutrients.ts#L28)<br>• **Kcal** *(dùng như danh từ nhãn ô)*: [summary-tab.tsx:89](apps/web/components/overview/summary-tab.tsx#L89), [energy-tab.tsx:63](apps/web/components/overview/energy-tab.tsx#L63), [energy-tab.tsx:164](apps/web/components/overview/energy-tab.tsx#L164), [diary-screen.tsx:369](apps/web/components/diary/diary-screen.tsx#L369)<br>• **calo**: [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7) | **Cần Hao chốt:** Bỏ từ **`calo`** ở [signup/page.tsx:7](apps/web/app/signup/page.tsx#L7); xác nhận có cho phép dùng **`Kcal`** làm nhãn cột ngắn thay cho **`Năng lượng`** hay không. |
| **Đơn vị thức ăn** *(Food item)* | **Món** / **Món ăn** | • **Món** / **Món ăn**: [add/page.tsx:195](apps/web/app/add/page.tsx#L195), [diary-screen.tsx:387](apps/web/components/diary/diary-screen.tsx#L387), [explore-sections.tsx:98](apps/web/components/explore/explore-sections.tsx#L98), [bottom-nav.tsx:13](apps/web/components/ui/bottom-nav.tsx#L13)<br>• **Thực phẩm**: [suggested-foods.tsx:16](apps/web/components/nutrient-detail/suggested-foods.tsx#L16) (`"Gợi ý thực phẩm giàu..."`), [food-categories.ts:33](apps/web/lib/food-categories.ts#L33) (`"Thực phẩm bổ sung"`) | Đổi [suggested-foods.tsx:16](apps/web/components/nutrient-detail/suggested-foods.tsx#L16) sang **`Món giàu {nutrientName}`** (giống `/explore/rich/[nutrient]`). Giữ `"Thực phẩm bổ sung"` vì là cụm danh từ cố định trong tiếng Việt. |
| **Món do người dùng tự tạo** | **Món của tôi** | • **Món của tôi**: [explore-sections.tsx:45](apps/web/components/explore/explore-sections.tsx#L45), [food-categories.ts:34](apps/web/lib/food-categories.ts#L34)<br>• **Của tôi** *(chip)*: [foods/[id]/page.tsx:120](apps/web/app/foods/[id]/page.tsx#L120), [explore-sections.tsx:49](apps/web/components/explore/explore-sections.tsx#L49), [food-meta.ts:22](apps/web/lib/food-meta.ts#L22)<br>• **món tự tạo**: [delete-account/page.tsx:73](apps/web/app/settings/delete-account/page.tsx#L73) | **Cần Hao chốt:** Thống nhất **`Món của tôi`** cho cả tiêu đề mục và chip nguồn dữ liệu (hoặc giữ chip ngắn `"Của tôi"`). |
| **Danh sách yêu thích** | **Yêu thích** / **Món yêu thích** | • **Yêu thích**: [add/page.tsx:224](apps/web/app/add/page.tsx#L224), [explore-sections.tsx:41](apps/web/components/explore/explore-sections.tsx#L41), [foods/[id]/page.tsx:127](apps/web/app/foods/[id]/page.tsx#L127)<br>• **Món yêu thích**: [profile-cards.tsx:206](apps/web/components/profile/profile-cards.tsx#L206)<br>• **Ưa thích**: [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) | Đổi `"Ưa thích"` ở [dev/ui/page.tsx:180](apps/web/app/dev/ui/page.tsx#L180) sang **`Yêu thích`**. |
| **Hành động thêm món vào bữa** | **Thêm** / **Thêm món** | • **Thêm món** / **Thêm vào {bữa}**: [bottom-nav.tsx:13](apps/web/components/ui/bottom-nav.tsx#L13), [sidebar-nav.tsx:58](apps/web/components/ui/sidebar-nav.tsx#L58), [add/page.tsx:159](apps/web/app/add/page.tsx#L159), [foods/[id]/page.tsx:211](apps/web/app/foods/[id]/page.tsx#L211), [diary-screen.tsx:283](apps/web/components/diary/diary-screen.tsx#L283), [diary-screen.tsx:408](apps/web/components/diary/diary-screen.tsx#L408)<br>• **Ghi món** / **Ghi bữa**: [summary-tab.tsx:60](apps/web/components/overview/summary-tab.tsx#L60) (`"Ghi bữa tối"`), [micros/page.tsx:285](apps/web/app/micros/page.tsx#L285), [micros/page.tsx:310](apps/web/app/micros/page.tsx#L310) (`"+ Ghi món ngay"`), [contributing-foods.tsx:22](apps/web/components/nutrient-detail/contributing-foods.tsx#L22) (`"+ Ghi món ngay"`), [setup-form.tsx:267](apps/web/components/onboarding/setup-form.tsx#L267) (`"Bắt đầu ghi bữa ăn"`) | **Cần Hao chốt:** Dùng **`Thêm món`** cho mọi nút hành động (CTA), và chỉ dùng từ **`đã ghi`** ở dạng quá khứ/trạng thái (`"Món đã ghi"`, `"5/7 ngày đã ghi"`). |
| **Hành động xoá & huỷ & tuỳ** *(Chính tả dấu)* | **Xoá** · **Huỷ** · **Tuỳ** | • **Xoá** & **Huỷ**: Đồng nhất 100% kiểu bỏ dấu mới trên toàn bộ ứng dụng.<br>• **Tuỳ chọn** *(dấu trên y)*: [diary-screen.tsx:292](apps/web/components/diary/diary-screen.tsx#L292)<br>• **Tùy chỉnh** *(dấu trên u — lệch)*: [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) | Đổi [foods/[id]/page.tsx:166](apps/web/app/foods/[id]/page.tsx#L166) thành **`Tuỳ chỉnh`** để khớp quy tắc bỏ dấu với `Xoá`, `Huỷ`, `Tuỳ chọn`. |
| **Vi chất không có trong dữ liệu món** | **Chưa có dữ liệu** | • **Chưa có dữ liệu** / **chưa có dữ liệu**: [micros/page.tsx:680](apps/web/app/micros/page.tsx#L680), [food-micros.tsx:42](apps/web/components/foods/food-micros.tsx#L42), [food-micros.tsx:89](apps/web/components/foods/food-micros.tsx#L89)<br>• **Chưa có số liệu** / **chưa có số liệu**: [micros-tab.tsx:37](apps/web/components/overview/micros-tab.tsx#L37), [micros-tab.tsx:54](apps/web/components/overview/micros-tab.tsx#L54), [micros-tab.tsx:64](apps/web/components/overview/micros-tab.tsx#L64)<br>• **chưa biết**: [foods/new/page.tsx:214](apps/web/app/foods/new/page.tsx#L214) | Thống nhất dùng **`chưa có dữ liệu`** trên cả `/overview`, `/micros`, `/foods/[id]` và `/foods/new`. |
| **Liên kết đăng nhập qua email** | **Liên kết đăng nhập** | • **link đăng nhập** / **link**: [signin/page.tsx:30](apps/web/app/signin/page.tsx#L30), [signin/check-email/page.tsx:58](apps/web/app/signin/check-email/page.tsx#L58), [signin/expired/page.tsx:29](apps/web/app/signin/expired/page.tsx#L29), [signup/page.tsx:68](apps/web/app/signup/page.tsx#L68), [magic-link-form.tsx:41](apps/web/components/onboarding/magic-link-form.tsx#L41), [not-found.tsx:20](apps/web/app/not-found.tsx#L20)<br>• **đường dẫn**: [foods/[id]/page.tsx:93](apps/web/app/foods/[id]/page.tsx#L93) | **Cần Hao chốt:** Đổi toàn bộ **`link`** sang **`liên kết`** (cho email) và **`đường dẫn`** (cho URL trang), hay chấp nhận từ **`link`** trong luồng đăng nhập? |
| **Khẩu phần vs Khối lượng** | **Khẩu phần** *(đơn vị chọn)* / **Khối lượng (g)** *(số gam)* | • **Khẩu phần**: [foods/[id]/page.tsx:150](apps/web/app/foods/[id]/page.tsx#L150), [foods/new/page.tsx:166](apps/web/app/foods/new/page.tsx#L166), [entry-editor.tsx:77](apps/web/components/foods/entry-editor.tsx#L77)<br>• **Khối lượng theo gam**: [foods/[id]/page.tsx:174](apps/web/app/foods/[id]/page.tsx#L174)<br>• **Khối lượng** + `aria-label="Số gam"`: [entry-editor.tsx:56](apps/web/components/foods/entry-editor.tsx#L56), [portion-panel.tsx:145](apps/web/components/ui/portion-panel.tsx#L145) | Thống nhất nhãn **`Khối lượng (g)`** và `aria-label="Khối lượng theo gam"`. |
| **Cài đặt ứng dụng (PWA)** | **Thêm vào màn hình chính** | • **Thêm vào màn hình chính**: [install/page.tsx:17](apps/web/app/install/page.tsx#L17), [install/page.tsx:163](apps/web/app/install/page.tsx#L163)<br>• **Thêm vào MH chính**: [install/page.tsx:121](apps/web/app/install/page.tsx#L121)<br>• **Cài như ứng dụng**: [profile-cards.tsx:235](apps/web/components/profile/profile-cards.tsx#L235) | Thống nhất **`Thêm vào màn hình chính`** (không viết tắt `MH`). |
