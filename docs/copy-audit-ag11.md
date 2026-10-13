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
