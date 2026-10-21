# New foods, 21/10/2026 (b): Bánh khoai nướng Minh Hào

For Hao's server import (Dong's importer, unchanged). Data only: `docs/data/new-foods-2026-10-21b.json`, 2 rows, both new (no live row is updated). No web, migration, API or database change; nothing imported. The `fortify_kitchen` source code and the "Fortify Kitchen" tag are already on `main` (PR #39).

Values are copied from the USDA FoodData Central CSVs (SR Legacy 2018-04, Foundation 2026-04-30) and the live catalogue's NIN row, and rounded as in `round_nutrients.py` (energy, protein, carbs, fat, fiber to 1 decimal; every other nutrient to 3 significant figures). A nutrient the sources do not cover is left out, never 0 or null. Values are per 100 g. What is estimated is listed under Flags.

The live catalogue was read on 21/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1299 foods in 3 pages (`limit=500`). Neither row's `source` + `source_id` or name exists, so the importer's upsert only inserts.

## New foods

| Action | Food | Category | Source | Source id | Source name | kcal | Protein g | Fat g | Carbs g | Counted nutrients | Portions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| New | Bánh khoai nướng Minh Hào (sữa chua thường) | an_vat | fortify_kitchen | fortify_kitchen:banh-khoai-nuong-sua-chua-thuong | Công thức riêng của Fortify Kitchen; giá trị tính từ nguyên liệu (USDA/NIN/nhãn sản phẩm) | 247.7 | 7.1 | 12.5 | 26.9 | 20/22 | 1 miếng (1/10 khuôn) = 87.4 g; 100 g |
| New | Bánh khoai nướng Minh Hào (sữa chua Hy Lạp) | an_vat | fortify_kitchen | fortify_kitchen:banh-khoai-nuong-sua-chua-hy-lap | Công thức riêng của Fortify Kitchen; giá trị tính từ nguyên liệu (USDA/NIN/nhãn sản phẩm) | 252.8 | 7.9 | 12.7 | 26.8 | 20/22 | 1 miếng (1/10 khuôn) = 87.4 g; 100 g |

"Counted nutrients" is how many of the importer's 22 counted micronutrients the row has.

## Flags

Both rows, with the percentages used. Hao updates them when a real pan is weighed.

- Ước tính: khối lượng thành phẩm chưa cân, hao hụt khi nướng 15 %
- Ước tính: một nguyên liệu dùng số trung bình của hai loại tương đương; một nguyên liệu dùng số của dạng sống thay cho dạng đã nướng
- Vi chất chỉ giữ khi các nguyên liệu có số liệu chiếm ≥ 90 % khối lượng

## Minh Hào rows (Fortify Kitchen)

Brand "Fortify Kitchen", source `fortify_kitchen`. The recipe is private and stays outside the repo: this file, the JSON, the commits and the PR carry only the final values per 100 g and the portions, no ingredient list, amounts or method. The rows are plain foods with no dish parts (no Thành phần, nothing editable). Category `an_vat` (Đồ ngọt & ăn vặt), like the Easygym cake. The two rows are the two yogurt choices of one cake; they share one pan size (1 miếng = 1/10 of the pan).

## Missing nutrients (left out)

- **Bánh khoai nướng Minh Hào (sữa chua thường)**: vitamin_c, vitamin_d
- **Bánh khoai nướng Minh Hào (sữa chua Hy Lạp)**: vitamin_c, vitamin_d

Other nutrients below the 90 % coverage rule (cholesterol, sugars, trans_fat among them) are also left out; the rule is the one the earlier recipe rows used (`dish_build/dishlib.py`).

## Dry run

`go test ./cmd/importfoods` passes. The importer's parse path and completeness report, run without `DATABASE_URL`:

```bash
cd apps/api
go run ./cmd/importfoods --dry-run --file ../../docs/data/new-foods-2026-10-21b.json
```

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 2 food records from ../../docs/data/new-foods-2026-10-21b.json
Completeness Report: 90.9% average coverage of the 22 counted nutrients across 2 foods
```

## How Hao imports this

See `docs/data/new-foods-2026-10-21b-import.md` (Docker commands, dump first, rollback).
