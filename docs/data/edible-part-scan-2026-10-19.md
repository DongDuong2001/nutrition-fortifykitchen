# Quét phần ăn được, 19/10/2026 (cc-67 phần 2)

Quy tắc (Hao 19/10): trái cây và món bán kèm phần bỏ đi (vỏ, hạt, xương, vỏ sò) ghi theo gam phần ăn được. Không còn đơn vị trái, quả, con, miếng cho các món này. Giá trị dinh dưỡng đã tính trên 100 g phần ăn được (USDA, NIN). Trứng là ngoại lệ: vẫn ghi theo quả, app tự trừ vỏ.

Nguồn quét: 877 món trong `food-research/h1t-foods-*.json` (file mới hơn thay file cũ, kể cả h1t-foods-units-import.json) và 50 món mẫu của web (lib/mock). Mã phân loại: `apps/web/scripts/edible-part.ts`. Chạy lại: `npm run scan:edible` trong apps/web.

## Tóm tắt

| Nhóm | Số món bỏ đơn vị |
|---|---|
| có vỏ, hạt, lõi hoặc xương (chuối, bơ, dừa, mía, bắp, tôm, cua, ốc, sò, cánh gà, sườn) | 56 |
| trái cây | 82 |
| cá nguyên con hoặc khúc có xương | 43 |
| Tổng | 181 |

Web: món mẫu (lib/mock) đã bỏ đơn vị. Trái cây thật bỏ đơn vị ngay khi nạp danh mục (`weighedFruit` trong lib/mock/foods.ts, cả api-client và danh mục lưu máy). Cá, hải sản, ốc, cua, món còn xương và chuối, bơ, dừa, mía, bắp nằm trong DB: Dong chạy importer với `docs/data/edible-part-portions-2026-10-19.json`.
Món mẫu web còn đơn vị sau khi lọc: không có.

## Món bỏ đơn vị (giữ lại 100 g và các khẩu phần theo gam)

| Món | Nguồn và mã | Nhóm | Loại | Đơn vị hiện có (bỏ) | Giữ | Việc cần làm |
|---|---|---|---|---|---|---|
| Cá bống | vn_nin NIN 8001 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá bơn (chín) | usda_sr_legacy FDC 174197 | dam | fish | 1 con vừa (cá 350 g); 1 con nhỏ (cá 200 g); 1 con lớn (cá 500 g) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá bơn (sống) | usda_sr_legacy FDC 174196 | dam | fish | 1 con vừa (cá 350 g); 1 con nhỏ (cá 200 g); 1 con lớn (cá 500 g) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chạch | vn_nin NIN 8028 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chép (chín) | usda_sr_legacy FDC 174185 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chép (sống) | usda_sr_legacy FDC 171952 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chim (cá chim đen) | vn_nin NIN 8060 | dam | fish | 1 con cá chim (phần ăn được) | 100 g; 1 lạng (100 g) | Bỏ các khẩu phần đơn vị trong DB |
| Cá chim (chín) | usda_sr_legacy FDC 173683 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chim (sống) | usda_sr_legacy FDC 173682 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá chim trắng | vn_nin NIN 8061 | dam | fish | 1 con cá chim trắng (phần ăn được) | 100 g; 1 lạng (100 g) | Bỏ các khẩu phần đơn vị trong DB |
| Cá diếc (sống) | vn_nin NIN 8006 | dam | fish | 1 con vừa (cá 150 g); 1 con nhỏ (cá 100 g); 1 con lớn (cá 250 g) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá diêu hồng (chín) | usda_sr_legacy FDC 175177:ca-dieu-hong-chin | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá diêu hồng (sống) | usda_sr_legacy FDC 175176:ca-dieu-hong-song | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá đối | vn_nin NIN 8009 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá đù (sống) | usda_sr_legacy FDC 174192 | dam | fish | 1 con vừa (cá 250 g); 1 con nhỏ (cá 150 g); 1 con lớn (cá 350 g) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá kèo | vn_nin NIN 8010:ca-keo-song | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá linh | vn_nin NIN 8032:ca-linh-song | dam | fish | 1 con | 1 chén; 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá lóc (sống) | usda_sr_legacy FDC 173680 | dam | fish | 1 khúc cá lóc | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá lóc/cá quả (chín) | usda_sr_legacy FDC 175127 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá lóc/cá quả (sống) | vn_nin NIN 8022 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá mè | vn_nin NIN 8014 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá mòi (tươi) | vn_nin NIN 8015 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá mòi đóng hộp (ngâm dầu, cả xương) | usda_sr_legacy FDC 175139 | dam | fish | 1 con nhỏ | 1 hộp (đã ráo); 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá mòi đóng hộp (sốt cà chua, cả xương) | usda_sr_legacy FDC 175140 | dam | fish | 1 con nhỏ | 1 hộp (đã ráo); 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá mối (sống) | vn_nin NIN 8017 | dam | fish | 1 con vừa (cá 120 g); 1 con nhỏ (cá 80 g); 1 con lớn (cá 200 g) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá nục (chín) | usda_sr_legacy FDC 171994 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá nục (sống, NIN) | vn_nin NIN 8020 | dam | fish | 1 con cá nục (phần ăn được) | 100 g; 1 lạng (100 g) | Bỏ các khẩu phần đơn vị trong DB |
| Cá nục (sống) | usda_sr_legacy FDC 173672 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá nục luộc (chín) | vn_nin NIN 8020002 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá nục nướng (chín) | vn_nin NIN 8020014 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá phèn | vn_nin NIN 8021 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá rô đồng (sống) | usda_sr_legacy FDC 173678 | dam | fish | 1 con cá rô đồng (phần ăn được) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá rô đồng (sống) | vn_nin NIN 8023 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá rô phi (chín) | usda_sr_legacy FDC 175177 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá rô phi (sống) | usda_sr_legacy FDC 175176 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá saba Na Uy (chín) | usda_sr_legacy FDC 175120 | dam | fish | 1 miếng vừa (nửa con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá saba Na Uy (sống) | usda_sr_legacy FDC 175119 | dam | fish | 1 miếng vừa (nửa con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá thát lát/cá lác (sống) | vn_nin NIN 8013 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá thu (sống) | usda_sr_legacy FDC 173673 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá trắm cỏ (cá trắm) | vn_nin NIN 8029 | dam | fish | 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá trê | vn_nin NIN 8030 | dam | fish | 1 con vừa; 1 miếng vừa (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá trích (chín) | usda_sr_legacy FDC 175117 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cá trích (sống) | usda_sr_legacy FDC 175116 | dam | fish | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Berries đông lạnh (hỗn hợp) | usda_sr_legacy FDC 168173:berries-dong-lanh-hon-hop | trai_cay | fruit | 1 nắm; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bơ vỏ tím | vn_nin NIN 5041 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 muỗng canh (nghiền) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bơ vỏ xanh | vn_nin NIN 5042 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 muỗng canh (nghiền) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bưởi | usda_sr_legacy FDC 167754 | trai_cay | fruit | 1 miếng vừa (1/4 trái); 1 múi; 1 chén (múi) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bưởi da xanh | vn_table food-buoi | trai_cay | fruit | 1 múi | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bưởi Năm Roi | vn_nin NIN 5001:buoi-nam-roi-song | trai_cay | fruit | 1 miếng vừa (1/4 trái); 1 múi; 1 chén (tép bưởi) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cam | usda_sr_legacy FDC 169097 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cam sành | usda_sr_legacy FDC 169097:cam-sanh-song | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cam sành | vn_nin NIN 5002:cam-sanh-song | trai_cay | fruit | 1 quả vừa (bỏ vỏ); 1 múi | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chà là | usda_foundation food-cha-la | trai_cay | fruit | 1 quả; 1 nắm (3 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chà là Medjool | usda_sr_legacy FDC 168191 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chà là Sanwan (Deglet Noor) | usda_sr_legacy FDC 171726 | trai_cay | fruit | 1 quả; 1 nắm (4 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chanh dây | usda_sr_legacy FDC 169108 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chanh ta | vn_nin NIN 5003 | trai_cay | fruit | 1 quả; 1 lát | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cherry | usda_sr_legacy FDC 171719 | trai_cay | fruit | 1 quả; 1 nắm (10 quả); 1 chén (bỏ hạt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chôm chôm | vn_nin NIN 5004 | trai_cay | fruit | 1 quả; 1 nắm (10 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối | usda_sr_legacy FDC 173944 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 chén (cắt lát) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối | usda_foundation food-chuoi | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối sứ | usda_sr_legacy FDC 173944:chuoi-su-song | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối sứ (chuối tây) | vn_nin NIN 5006 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối tiêu | vn_nin NIN 5007 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cóc | vn_nin NIN 5043 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cơm dừa già (cùi dừa) | vn_nin NIN 3001 | trai_cay | fruit | 1 miếng nhỏ; 1 chén (nạo) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cơm dừa non (cùi dừa non) | vn_nin NIN 3002 | trai_cay | fruit | 1 trái (cùi); 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dâu da (dâu gia) | vn_nin NIN 5008 | trai_cay | fruit | 1 quả; 1 nắm (5 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dâu tằm (sống) | usda_sr_legacy FDC 169913 | trai_cay | fruit | 1 nắm; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dâu tây | usda_sr_legacy FDC 168173 | trai_cay | fruit | 1 quả nhỏ; 1 quả vừa; 1 quả lớn; 1 chén (đông lạnh) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dưa bở | vn_nin NIN 5010 | trai_cay | fruit | 1 miếng vừa (1/8 quả); 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dưa hấu | usda_sr_legacy FDC 167765 | trai_cay | fruit | 1 miếng nhỏ; 1 miếng vừa; 1 chén (cắt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dưa hồng | vn_nin NIN 5012 | trai_cay | fruit | 1 miếng vừa (1/8 quả); 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dưa lê | vn_nin NIN 5013 | trai_cay | fruit | 1 miếng vừa (1/8 quả); 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dưa lưới | usda_sr_legacy FDC 169092 | trai_cay | fruit | 1 miếng nhỏ; 1 miếng vừa; 1 chén (cắt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Dứa ta (khóm) | vn_nin NIN 5014 | trai_cay | fruit | 1 miếng vừa; 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Đào | usda_sr_legacy FDC 169928 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Đu đủ | usda_sr_legacy FDC 169926 | trai_cay | fruit | 1 miếng vừa; 1 chén (miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Hồng giòn | usda_sr_legacy FDC 169941 | trai_cay | fruit | 1 trái vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Hồng mềm (hồng đỏ) | vn_nin NIN 5020 | trai_cay | fruit | 1 trái vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Hồng xiêm | usda_sr_legacy FDC 167759 | trai_cay | fruit | 1 trái vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Khế | usda_sr_legacy FDC 171715 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Kiwi vàng | usda_sr_legacy FDC 168211 | trai_cay | fruit | 1 trái | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Kiwi xanh | usda_foundation FDC 327046 | trai_cay | fruit | 1 trái; 1 chén (cắt lát) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Lê | usda_sr_legacy FDC 168177 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Lựu | usda_sr_legacy FDC 169134 | trai_cay | fruit | 1 trái lớn (hạt); 1 chén (hạt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mãng cầu ta (na) | usda_sr_legacy FDC 168175 | trai_cay | fruit | 1 trái vừa; 1 chén (thịt quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mãng cầu xiêm | usda_sr_legacy FDC 167761 | trai_cay | fruit | 1 trái lớn; 1 chén (thịt quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mắc coọc | vn_nin NIN 5026 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Măng cụt | vn_nin NIN 5061 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mâm xôi | usda_sr_legacy FDC 168209 | trai_cay | fruit | 1 nắm; 1 chén (đông lạnh) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mận Hà Nội | usda_sr_legacy FDC 169949 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mận khô (prunes) | usda_sr_legacy FDC 168162 | trai_cay | fruit | 1 quả; 1 nắm (5 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Me chín | usda_sr_legacy FDC 167763 | trai_cay | fruit | 1 nắm (cơm me); 1 chén (cơm me) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mít | usda_sr_legacy FDC 174687 | trai_cay | fruit | 1 múi; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mít dai | vn_nin NIN 5028 | trai_cay | fruit | 1 múi; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mít mật | vn_nin NIN 5030 | trai_cay | fruit | 1 múi; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mơ khô | usda_sr_legacy FDC 173941 | trai_cay | fruit | 1 miếng (nửa quả); 1 nắm | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Mơ tươi | vn_nin NIN 5031 | trai_cay | fruit | 1 quả; 1 nắm (5 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nhãn | usda_sr_legacy FDC 169089 | trai_cay | fruit | 1 quả; 1 nắm (10 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nhãn sấy khô (long nhãn) | vn_nin NIN 5036 | trai_cay | fruit | 1 nắm; 1 muỗng canh | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nho khô | usda_sr_legacy FDC 168166 | trai_cay | fruit | 1 nắm nhỏ; 1 muỗng canh | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nho xanh | usda_sr_legacy FDC 174683 | trai_cay | fruit | 1 nắm; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nhót | vn_nin NIN 5039 | trai_cay | fruit | 1 quả; 1 nắm (10 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ổi | usda_sr_legacy FDC 173044 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 chén (cắt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Quả bơ | usda_foundation food-bo | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Quýt | usda_sr_legacy FDC 169105 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Roi (mận miền Nam) | usda_sr_legacy FDC 168171 | trai_cay | fruit | 1 quả | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sấu chín | vn_nin NIN 5049 | trai_cay | fruit | 1 quả; 1 nắm (5 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sầu riêng | vn_nin NIN 5048 | trai_cay | fruit | 1 múi; 1 chén (cơm) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sơri (acerola) | usda_sr_legacy FDC 171686 | trai_cay | fruit | 1 quả; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sung khô | usda_sr_legacy FDC 174665 | trai_cay | fruit | 1 quả; 1 nắm (3 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Táo (cả vỏ) | usda_sr_legacy FDC 171688 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Táo Envy | usda_foundation food-tao | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Táo ta | vn_nin NIN 5050 | trai_cay | fruit | 1 quả; 1 nắm (5 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Táo xanh | usda_sr_legacy FDC 168203 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Thanh long ruột đỏ | asean PhilFCT E117 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Thanh long ruột trắng | vn_nin NIN 5044:thanh-long-ruot-trang-song | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 miếng vừa (1/2 trái) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Thơm (dứa) | usda_sr_legacy FDC 169124 | trai_cay | fruit | 1 miếng nhỏ; 1 miếng vừa; 1 miếng lớn; 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Vải | usda_sr_legacy FDC 169086 | trai_cay | fruit | 1 quả; 1 nắm (10 quả) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Việt quất | usda_sr_legacy FDC 173950 | trai_cay | fruit | 1 nắm; 1 chén (đông lạnh) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Vú sữa | vn_nin NIN 5054 | trai_cay | fruit | 1 trái vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Xoài cát Hòa Lộc | vn_nin NIN 5055:xoai-cat-hoa-loc-song | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Xoài chín | usda_sr_legacy FDC 169910 | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Xoài keo (chín) | usda_sr_legacy FDC 169910:xoai-keo-song | trai_cay | fruit | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 chén (cắt miếng) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Bắp/ngô ngọt (chín) | usda_sr_legacy FDC 169999 | tinh_bot | other | 1 trái nhỏ; 1 trái vừa; 1 trái lớn; 1 chén (hạt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cánh gà (chín) | usda_sr_legacy FDC 173630 | dam | other | 1 cái | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cánh gà (sống) | usda_sr_legacy FDC 172390 | dam | other | 1 cái | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chân giò heo (sống) | usda_sr_legacy FDC 168226 | dam | other | 1 miếng lớn (khúc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chim cút (chín) | usda_sr_legacy FDC 169902 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chim cút (sống) | usda_sr_legacy FDC 172418 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối xanh (luộc) | vn_nin NIN 4019002 | rau | other | 1 quả (bỏ vỏ) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Chuối xanh (sống) | vn_nin NIN 4019 | rau | other | 1 quả (bỏ vỏ) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cua biển (chín) | usda_sr_legacy FDC 172007 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cua biển (sống) | usda_sr_legacy FDC 171968 | dam | other | 1 con cua biển (thịt) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cua biển (sống) | vn_nin NIN 8033 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Cua đồng | vn_nin NIN 8034 | dam | other | 1 con; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ếch (thịt đùi) | vn_nin NIN 7080 | dam | other | 1 con; 1 cái (cặp đùi) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Gà nguyên con có da (chín) | usda_sr_legacy FDC 171450 | dam | other | 1 miếng nhỏ; 1 miếng vừa; 1 miếng lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Gà nguyên con có da (sống) | usda_sr_legacy FDC 171447 | dam | other | 1 miếng nhỏ; 1 miếng vừa; 1 miếng lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Gấc (quả) | vn_nin NIN 4034 | rau | other | 1 muỗng canh (màng gấc) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ghẹ | vn_nin NIN 8035 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ghẹ (chín) | usda_sr_legacy FDC 174205 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ghẹ (sống) | usda_sr_legacy FDC 174204 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Hàu (chín) | usda_sr_legacy FDC 174250 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Hàu (sống) | usda_sr_legacy FDC 174219 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Má đùi gà có da (chín) | usda_sr_legacy FDC 173617 | dam | other | 1 cái | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Má đùi gà có da (sống) | usda_sr_legacy FDC 172378 | dam | other | 1 cái | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nghêu (chín) | usda_sr_legacy FDC 171975 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Nghêu (sống) | usda_sr_legacy FDC 174214 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ngô nếp cả bắp (chín) | vn_nin NIN 1023 | tinh_bot | other | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc | asean PhilFCT G129 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc bươu | vn_nin NIN 8041 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc đá | vn_nin NIN 8042 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc hương | usda_sr_legacy FDC 171983:oc-huong-song | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc móng tay (luộc) | vn_nin NIN 8074002 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc nhồi | vn_nin NIN 8043 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Ốc vặn | vn_nin NIN 8044 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Quả bơ | usda_sr_legacy FDC 171705 | beo | other | 1 trái nhỏ; 1 trái vừa; 1 trái lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Rạm | vn_nin NIN 8046 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sò điệp (chín) | usda_sr_legacy FDC 167742 | dam | other | 1 con vừa; 1 dĩa nhỏ (5 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sò điệp (sống) | usda_sr_legacy FDC 174220 | dam | other | 1 con vừa; 1 dĩa nhỏ (5 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sò huyết | vn_nin NIN 8048:so-huyet-song | dam | other | 1 con; 1 dĩa nhỏ (10 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sò lông (chín) | usda_sr_legacy FDC 171975:so-long-hap | dam | other | 1 con; 1 dĩa nhỏ (10 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sò lông (sống) | usda_sr_legacy FDC 174214:so-long-song | dam | other | 1 con; 1 dĩa nhỏ (10 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sườn bò (chín) | usda_sr_legacy FDC 168613 | dam | other | 1 miếng vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sườn bò (sống) | usda_sr_legacy FDC 169439 | dam | other | 1 miếng vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sườn non heo (chín) | usda_sr_legacy FDC 167854 | dam | other | 1 miếng vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Sườn non heo (sống) | usda_sr_legacy FDC 167853 | dam | other | 1 miếng vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm (chín) | usda_sr_legacy FDC 171971 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm (sống) | usda_sr_legacy FDC 174210 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm đồng (chín) | vn_nin NIN 8052014 | dam | other | 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm đồng (sống) | vn_nin NIN 8052 | dam | other | 1 con; 1 chén | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm sú (chín) | vn_nin NIN 8051014:tom-su-nuong | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm sú (sống) | vn_nin NIN 8051:tom-su-song | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm thẻ chân trắng (chín) | usda_sr_legacy FDC 171971:tom-the-luoc | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tôm thẻ chân trắng (sống) | usda_sr_legacy FDC 174210:tom-the-song | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Trai sông (trai nước ngọt) | vn_nin NIN 8054 | dam | other | 1 con | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Tu hài | vn_nin NIN 8094 | dam | other | 1 con vừa | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Vẹm (chín) | usda_sr_legacy FDC 174217 | dam | other | 1 con; 1 dĩa nhỏ (10 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |
| Vẹm (sống) | usda_sr_legacy FDC 174216 | dam | other | 1 con nhỏ; 1 con vừa; 1 con lớn; 1 dĩa nhỏ (10 con) | 100 g | Bỏ các khẩu phần đơn vị trong DB |

## Đổi tên gợi ý (tên giữ ngắn, không có thịt quả, bỏ vỏ)

| Tên hiện có | Nguồn và mã | Tên mới | Lý do |
|---|---|---|---|
| Quả bơ | usda_sr_legacy FDC 171705 | Bơ (trái) | Bơ lạt và Bơ đậu phộng đã có, nên chỉ cần thẻ ngắn để phân biệt |
| Táo (cả vỏ) | usda_sr_legacy FDC 171688 | Táo | bỏ chữ vỏ trong tên |
| Dưa leo (cả vỏ) | usda_sr_legacy FDC 168409 | Dưa leo | bỏ chữ vỏ trong tên |
| Hạt gai dầu (bóc vỏ) | usda_sr_legacy FDC 170148 | Hạt gai dầu | bỏ chữ vỏ trong tên |
| Quả bơ | usda_foundation food-bo | Bơ (trái) | Bơ lạt và Bơ đậu phộng đã có, nên chỉ cần thẻ ngắn để phân biệt |

Tên có vỏ như Bơ vỏ tím, Bơ vỏ xanh là tên giống, giữ nguyên.

## Giữ đơn vị có chủ ý

| Lý do | Số món | Ví dụ |
|---|---|---|
| không có phần bỏ đi (thịt, nội tạng, đồ chế biến) | 311 | Dầu olive, Hạt bí (sấy khô), Hạt bí (rang), Yogurt kefir, Thịt bò thăn (sống), Thịt bò thăn (chín) |
| rau: phần bỏ đi nhỏ, đơn vị chén, cây, quả vẫn dùng được | 152 | Kim chi, Dưa cải chua, Cà chua (sống), Cà chua (chín), Bạc hà, Tía tô |
| đồ uống: ghi theo ly, chai, lon | 50 | Matcha, Nước dừa, Red Bull (nước tăng lực), Cà phê đen, Trà xanh, Matcha Satoen |
| củ, khoai: giữ đơn vị củ (vỏ mỏng, nhiều dòng ghi sẵn bỏ vỏ), Hao quyết nếu muốn đổi sang gam | 50 | Củ dền luộc, Củ dền sống, Khoai lang luộc bỏ vỏ (chín), Khoai lang nướng cả vỏ (chín), Khoai tây (sống), Khoai tây (chín) |
| trứng: vẫn ghi theo quả, app tự trừ vỏ | 9 | Trứng gà (sống), Trứng gà luộc, Trứng vịt, Trứng cút, Hột vịt lộn, Trứng gà |
| thực phẩm bổ sung: ghi theo viên | 2 | Whey protein isolate (không vị), Psyllium husk NOW |
| món ăn: ghi theo phần | 69 | Bún đậu mắm tôm, Bún riêu cua, Bún mắm, Bún thịt nướng, Bún mọc, Hủ tiếu Nam Vang |
