# Vietnamese Copy Audit Summary (cc-56)

Audit performed for H1T MICRO application strings. Scope excludes portion panel, Khay, and egg screens currently in active rewrite (cc-53b).

- **Total strings reviewed across codebase**: 1.796
- **Strings requiring modification**: 83 (P1: 13, P2: 52, P3: 18)
- **Strings evaluated as clear and compliant**: 1713

---

## 1. Top 15 Rewrites

| Current | Proposed | Why |
|---|---|---|
| Ghi theo quả, viên | Ghi theo trái, viên | Bỏ từ ngữ miền Bắc 'quả', dùng 'trái' chuẩn phương ngữ TP.HCM. |
| Chọn khẩu phần như 1 quả hay 1 viên, rồi chạm + hoặc − để ghi 2, 3 quả. Kcal và vi chất nhân theo. | Chọn khẩu phần như 1 trái hay 1 viên, rồi bấm + hoặc − để ghi 2, 3 trái. App tự nhân kcal và vi chất. | Dùng 'trái' thay vì 'quả'; thay câu cụt bằng câu chủ động nêu rõ kết quả tính toán. |
| 1 bát | 1 chén | Bỏ từ miền Bắc 'bát', dùng từ 'chén' tự nhiên cho người dùng phía Nam. |
| Chỉ với nữ · Iron 18 → 28 mg/ngày | Dành cho nữ — Sắt 18 → 28 mg/ngày | Việt hóa tên khoáng chất 'Iron' thành 'Sắt'; thay chấm giữa bằng gạch ngang. |
| Kéo xuống, chọn Thêm vào MH chính | Kéo xuống, chọn Thêm vào Màn hình chính | Viết rõ 'Màn hình chính' khớp với nhãn menu thực tế của iOS thay vì viết tắt 'MH chính'. |
| Không lưu được món vào máy này. Bộ nhớ đầy hoặc đang bị chặn. Thử lại sau khi giải phóng dung lượng. | Chưa lưu được món vô máy này do bộ nhớ đầy. Dọn bớt bộ nhớ rồi thử lại nha. | Bỏ văn phong quan liêu ('đang bị chặn', 'giải phóng dung lượng'); hướng dẫn xử lý tự nhiên. |
| Chọn nguyên liệu có sẵn trong app và nhập số gram. Kcal và đủ 22 vi chất được tính tự động. Món lưu vào tài khoản, máy khác cũng thấy. Món đóng gói có nhãn? Chọn Tự nhập ở trên. | Chọn nguyên liệu có sẵn và gõ số gam. App tự tính kcal và 22 vi chất rồi lưu vô tài khoản. Có nhãn dinh dưỡng? Chọn Tự nhập ở trên. | Xóa câu bị động ('được tính tự động'); sửa 'gram' thành 'gam'; rút gọn từ 39 xuống 26 từ. |
| Chạm vào nút + Thêm ở dòng tên bữa để thêm món vào bữa ăn đó. | Chạm + Thêm ở tên bữa để thêm món vô bữa này. | Bỏ cụm rườm rà ('Chạm vào nút', 'ở dòng tên bữa'); dùng 'vô bữa' tự nhiên, rút từ 16 xuống 10 từ. |
| Chạm biểu tượng chia sẻ để tạo ảnh tóm tắt ngày: tên, Level, kcal và vi chất. Chia sẻ cho HLV hoặc đăng lên mạng xã hội nhanh chóng. | Bấm icon chia sẻ để tạo ảnh ngày ăn (Level, kcal, vi chất) gửi cho HLV hoặc bạn bè. | Bỏ từ sáo rỗng 'nhanh chóng', bỏ dấu hai chấm ngắt câu; rút gọn xúc tích. |
| Điện thoại rung nhẹ khi bạn lưu, xóa hay hoàn tác một món. Không thích thì tắt ở đây. | Điện thoại rung nhẹ khi lưu, xóa hay hoàn tác món. Bạn có thể tắt bất kỳ lúc nào. | Thay câu cộc lốc 'Không thích thì tắt ở đây' bằng thông báo trung tính, lịch sự. |
| Bạn có thể sửa mục tiêu bất cứ lúc nào trong Cài đặt. | Đổi mục tiêu bất kỳ lúc nào trong Cài đặt. | Bỏ khuôn mẫu dịch tiếng Anh 'Bạn có thể...'; dùng mệnh lệnh trực tiếp. |
| Gõ tên món bạn vừa ăn, ví dụ “phở”, rồi chạm vào món đúng nhất. Bữa ăn sẽ được chọn sẵn theo khung giờ ăn hoặc tùy vào lựa chọn của bạn. | Gõ tên món vừa ăn (như “phở”) rồi chạm chọn món. App tự chọn sẵn bữa theo giờ hiện tại, hoặc bạn tự chọn lại. | Bỏ văn phong dịch ('sẽ được chọn sẵn... tùy vào lựa chọn'); hành văn tự nhiên. |
| Đăng nhập hệ thống | Đăng nhập vô app | Bỏ từ văn phòng 'hệ thống'; dùng từ 'vô app' gần gũi, đúng ngữ cảnh ứng dụng di động. |
| Giới thiệu đang được cập nhật. | Chưa có thông tin giới thiệu. | Bỏ mẫu câu hành chính bị động 'đang được cập nhật'. |
| Nếu một thực phẩm chưa có dữ liệu phân tích của vi chất nhất định, hệ thống thể hiện dấu gạch ngang (—), tuyệt đối không tự ý gán bằng 0 gây hiểu lầm thiếu hụt. | Khi món chưa có số liệu vi chất, app hiện dấu gạch ngang (—), không gán bằng 0 để tránh báo thiếu sai. | Bỏ khẩu khí quan cách ('hệ thống thể hiện', 'tuyệt đối không tự ý gán', 'gây hiểu lầm thiếu hụt'). |

---

## 2. Standardized Terminology

To eliminate inconsistency across screens, standard terms are established as single sources of truth:

| Concept | Standard Term | Disallowed Variants | Rule & Context |
|---|---|---|---|
| Food / Dish | **món** | thực phẩm, thức ăn, món ăn | Dùng `món` trong nhật ký, danh mục và bữa ăn (`thêm món`, `chọn món`). Cụm `thực phẩm bổ sung` giữ nguyên cho phân loại TPBS. |
| Log / Add action | **Ghi** (nhật ký) / **Thêm** (danh sách) | nhập món, lưu món | `Ghi món` khi ghi nhận vào nhật ký hôm nay. `+ Thêm` khi bấm thêm món vào khay hoặc bữa. |
| Classifier | **trái** | quả | Người dùng TP.HCM: dùng `trái` (trái bơ, 2 trái chuối). Tuyệt đối không dùng `quả`. |
| Bowl unit | **chén** | bát | Dùng `chén` (1 chén cơm, nửa chén). Tuyệt đối không dùng `bát`. |
| Preposition | **vô** | vào | Dùng `vô` ở ngữ cảnh tự nhiên (`thêm món vô bữa`, `vô app`). Giữ `vào` ở văn cảnh trang trọng hoặc pháp lý. |
| Snack meal | **Bữa phụ** | Snack, bữa xế, ăn vặt | Thống nhất tên gọi 4 bữa: Bữa sáng, Bữa trưa, Bữa tối, Bữa phụ. |
| Weight unit | **gam** (văn xuôi) / **g** (sau số) | gram, grams, gr | Viết `100 g`, `50 g` (có khoảng trắng). Trong câu hướng dẫn viết `gam` (`nhập gam`, `tính theo gam`). |
| Energy unit | **kcal** | Kcal, KCAL, calo | Viết `kcal` chữ thường (`1.041 kcal`), định dạng số kiểu Việt Nam (dấu chấm phân cách nghìn). |
| Customization | **chỉnh** / **sửa** | tùy chỉnh, thao tác | Thay thế từ văn phòng Hán-Việt `tùy chỉnh` bằng `chỉnh` (`chỉnh ngày`, `tự chỉnh`). |
| User pronoun | **bạn** (dùng chừng mực) | quý khách, người dùng | Dùng `bạn` khi cần làm rõ chủ ngữ; lược bỏ khi câu mệnh lệnh trực tiếp đã rõ nghĩa. |

---

## 3. Copy Guidelines for AGENTS.md (10 Rules)

1. **Giọng văn trung tính, gọn gàng, tự nhiên**: Nói thẳng vào việc cần làm và kết quả đạt được, không hoa mỹ hay sáo rỗng.
2. **Chuẩn phương ngữ TP.HCM**: Dùng `trái` (không dùng `quả`), `chén` (không dùng `bát`), `vô` khi tự nhiên (`vô app`, `vô bữa`).
3. **Tuyệt đối tránh câu bị động**: Thay `Kcal được tính tự động` bằng `App tự tính kcal`; thay `Món được lưu` bằng `Món lưu vô tài khoản`.
4. **Bỏ từ ngữ văn phòng / Hán-Việt rườm rà**: Bỏ `thực hiện`, `tiến hành`, `vui lòng`, `hệ thống`, `khả dụng`, `thao tác`; thay `tùy chỉnh` bằng `chỉnh`.
5. **Tránh khuôn mẫu dịch tiếng Anh (calques)**: Bỏ các câu mở đầu bằng `Chạm để...`, `Bạn có thể...`, `Hãy...`; đi thẳng vào động từ hành động.
6. **Không lạm dụng dấu câu làm ngữ pháp**: Không chèn dấu hai chấm (`:`), dấu chấm lửng (`...`) hay chấm giữa (`·`) ngắt ngang giữa câu.
7. **Độ dài tip và tour ngắn gọn**: Mỗi mẹo chỉ gồm 1–2 câu ngắn, tối đa không quá 20 từ để tránh quá tải thị giác.
8. **Đơn vị và số chuẩn Việt Nam**: Viết `100 g`, `1,5 lon` (dấu phẩy thập phân), `1.041 kcal` (dấu chấm hàng nghìn), `kcal` viết thường.
9. **Nhất quán danh xưng**: Xưng hô `bạn` một cách tiết chế; ưu tiên câu lược chủ ngữ khi hướng dẫn thao tác trên màn hình.
10. **Thông báo lỗi mang tính xây dựng**: Dùng `Chưa lưu được...` thay vì `Không lưu được...`; luôn gợi ý cách xử lý tiếp theo kèm từ `nha` nhẹ nhàng.

---

## 4. Tutorial & Onboarding Flow Critique

Rà soát toàn bộ luồng hướng dẫn từ khi mở app lần đầu đến các bản cập nhật 'Có gì mới':

1. **Trùng lặp gây mệt mỏi ở ngày đầu tiên (Banner Blindness)**:
   - Ngay sau Onboarding 4 bước (`onboarding-layer.tsx`), người dùng vừa vào Hôm nay đã lập tức chạm mặt các thẻ Spotlight (`meal-add`, `home-logged`, `sheet-drag`).
   - Mẹo `meal-add` ("Chạm vào nút + Thêm ở dòng tên bữa...") nhắc lại y hệt bước 1 của Onboarding vừa hoàn thành cách đó 10 giây.
   - **Đề xuất**: Tự động đánh dấu `used: ["meal-add"]` ngay khi người dùng hoàn thành Onboarding để không kích hoạt lại mẹo này.

2. **Chồng chéo giữa 'Có gì mới' và Spotlight Tips**:
   - Thao tác kéo xuống để làm mới danh sách vừa có một mẹo riêng trong Spotlight (`pull-refresh`: "Ở đầu danh sách món, kéo xuống rồi thả..."), vừa xuất hiện thành một bước tour trong bản cập nhật 18c ("Kéo xuống để tải lại").
   - Tương tự, mẹo chạm xem nguồn vi chất (`nutrient-sources`) và mẹo trạng thái lưu (`unsaved`) cũng bị lặp lại ở cả hai nơi.
   - **Đề xuất**: Đồng bộ cờ `used` giữa bước tour và thẻ Spotlight; nếu người dùng đã xem bước tour tương ứng thì tự động ẩn Spotlight tip đó.

3. **Lỗi ngữ cảnh khi bấm 'Thử ngay' từ Có gì mới**:
   - Khi người dùng bấm 'Thử ngay' ở sheet Có gì mới trên màn hình Hôm nay, tour của bản 18e (Ngày tập) chạy 3 bước: Nhóm Bự/Bé, Đánh dấu để ghi, và Thêm món riêng.
   - Cả 3 bước này đều thuộc màn hình `/training`, nhưng do tour chạy trên Hôm nay nên hệ thống fallback cả 3 bước về nút `Ngày tập 0/3 ›` trên header.
   - Người dùng bấm 'Tiếp' 3 lần liên tục chỉ thấy vòng tròn chỉ vào đúng một nút `Ngày tập` với 3 đoạn text khác nhau giải thích về Bự/Bé và Đánh dấu món.
   - **Đề xuất**: Khi tour của một bản phát hành chứa các bước không nằm trên Hôm nay, bước đầu tiên phải điều hướng mở đúng sheet hoặc màn hình đó (ví dụ mở Ngày tập), thay vì fallback hàng loạt vào một nút trên header.

4. **Bất nhất động từ chỉ dẫn**:
   - Các bước tour dùng lộn xộn giữa: `Chạm`, `Bấm`, `Chọn`, `Thử giữ`, `Kéo`.
   - **Đề xuất**: Chuẩn hóa: `Chạm` cho nút/dòng trên màn hình cảm ứng, `Giữ` cho thao tác long-press, `Kéo` cho cử chỉ vuốt kéo (swipe/pull).
