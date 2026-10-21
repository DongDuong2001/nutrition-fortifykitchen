# Minh Hào foods, 21/10/2026 (b, c): bánh khoai nướng and the raw-ingredient rule

For Hao's server import (Dong's importer, unchanged). Data only: `docs/data/new-foods-2026-10-21b.json`, 5 rows: 2 new (Bánh khoai nướng Minh Hào, two yogurt choices) and 3 updates of rows imported on 21/10 (same `source` + `source_id`, so the importer upserts them). No web, migration, API or database change; nothing imported. The `fortify_kitchen` source code and tag are already on `main` (PR #39).

**Hao's rule (21/10 13:15), for every cooked or baked Minh Hào food:** values are per 100 g of the RAW ingredients as weighed before cooking; no cooking or baking loss and no water-uptake estimates; added plain water is not counted (other liquid ingredients are); a portion = the raw batch weight / the number of portions. The five sous vide meat rows already follow it (per raw meat) and are not touched.

Values are copied from the USDA FoodData Central CSVs, the NIN table and product labels, rounded as in `round_nutrients.py` (energy, protein, carbs, fat, fiber to 1 decimal; every other nutrient to 3 significant figures). A nutrient the sources do not cover is left out, never 0 or null. Values are per 100 g.

The live catalogue was read on 21/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1299 foods in 3 pages (`limit=500`). The two new rows' keys and names do not exist. For the three updates, the live row's name, category and portions were compared with the imported JSON: identical; brand and source are copied from that JSON (the API does not return brand or tip).

## Old → new

| Row | Action | kcal/100 g old | new | Portion g old | new | kcal per portion old | new |
|---|---|---|---|---|---|---|---|
| Bánh khoai nướng Minh Hào (sữa chua thường) (version in this PR before the rule; not imported) | Insert | 247.7 | 210.6 | 87.4 | 102.8 | 216 | 216 |
| Bánh khoai nướng Minh Hào (sữa chua Hy Lạp) (version in this PR before the rule; not imported) | Insert | 252.8 | 214.9 | 87.4 | 102.8 | 221 | 221 |
| Sốt cà chua nướng Minh Hào | Update | 45.3 | 34.2 | 170.9 | 226.4 | 77 | 77 |
| Mì Ý sốt cà Minh Hào | Update | 102.2 | 88.9 | 370.9 | 426.4 | 379 | 379 |
| Bò hầm Minh Hào | Update | 110.8 | 107.5 | 427.1 | 440.3 | 473 | 473 |

Why the numbers fall: the old values divided the same nutrients by a smaller, estimated finished weight (an assumed cooking loss and assumed water uptake); the new ones divide by the raw weight. Portion grams rise by the same ratio for the sauce, pasta and stew; the cake's piece is the raw mix / 10. Calories per portion stay the same (the same nutrients, the same number of portions): what changes is kcal per 100 g and the grams a portion is.

## The rows

| Action | Food | Category | Source | Source id | kcal | Protein g | Fat g | Carbs g | Counted nutrients | Portions | tip_vi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Insert | Bánh khoai nướng Minh Hào (sữa chua thường) | an_vat | fortify_kitchen | fortify_kitchen:banh-khoai-nuong-sua-chua-thuong | 210.6 | 6.1 | 10.6 | 22.8 | 20/22 | 1 miếng (1/10 khuôn) = 102.8 g; 100 g | Số gram tính theo nguyên liệu trước khi nướng. |
| Insert | Bánh khoai nướng Minh Hào (sữa chua Hy Lạp) | an_vat | fortify_kitchen | fortify_kitchen:banh-khoai-nuong-sua-chua-hy-lap | 214.9 | 6.7 | 10.8 | 22.8 | 20/22 | 1 miếng (1/10 khuôn) = 102.8 g; 100 g | Số gram tính theo nguyên liệu trước khi nướng. |
| Update | Sốt cà chua nướng Minh Hào | mon_viet | fortify_kitchen | fortify_kitchen:sot-ca-chua-nuong | 34.2 | 1 | 1.6 | 4.7 | 19/22 | 1 phần = 226.4 g; 100 g | Số gram tính theo nguyên liệu trước khi nấu. |
| Update | Mì Ý sốt cà Minh Hào | mon_viet | fortify_kitchen | fortify_kitchen:mi-y-sot-ca | 88.9 | 3.1 | 1.3 | 16.5 | 19/22 | 1 phần = 426.4 g; 100 g | Số gram tính theo nguyên liệu trước khi nấu. |
| Update | Bò hầm Minh Hào | mon_viet | fortify_kitchen | fortify_kitchen:bo-ham | 107.5 | 11 | 2.8 | 10.1 | 21/22 | 1 phần = 440.3 g; 100 g | Số gram tính theo nguyên liệu trước khi nấu. |

Source text for all five: "Công thức riêng của Fortify Kitchen; giá trị tính từ nguyên liệu (USDA/NIN/nhãn sản phẩm)". "Counted nutrients" is how many of the importer's 22 counted micronutrients the row has.

## What an update changes

The importer's upsert rewrites `name`, `name_vi`, `category`, `brand`, `tip_vi` and the nutrients, and replaces the food's portions. For the three updates only `tip_vi` (new), the nutrients and the portions differ from the live row; name, `name_vi`, category, brand and source are copied unchanged. A diary entry already logged stores its own snapshot (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so entries logged before the import keep their old numbers; only new entries use the new values.

## Flags

Only general words; Hao keeps the detailed flags outside the repo.

- Giá trị theo 100 g nguyên liệu trước khi nướng; không tính hao hụt khi nướng
- Ước tính: một nguyên liệu dùng số trung bình của hai loại tương đương; một nguyên liệu dùng số của dạng sống thay cho dạng đã nướng
- Vi chất chỉ giữ khi các nguyên liệu có số liệu chiếm ≥ 90 % khối lượng
- Giá trị theo 100 g nguyên liệu trước khi nấu; không tính hao hụt khi nấu hay nước thêm vào
- Ước tính: vi chất nhóm B có thể lệch (nhãn nguyên liệu); một vi chất để trống vì số nguồn bất thường
- Ước tính: mì chín quy từ giá trị nhãn mì khô, hệ số khô→chín 238 %
- Ước tính: vi chất không có trên nhãn lấy từ USDA (dự phòng); một vi chất để trống vì số nguồn bất thường
- Ước tính: một số nguyên liệu tạm tính theo giả định, vi chất không có trên nhãn lấy từ USDA (dự phòng)

## Minh Hào rows (Fortify Kitchen)

Brand "Fortify Kitchen", source `fortify_kitchen`. The recipes are private and stay outside the repo: this file, the JSON, the commits and the PR carry only the final values per 100 g and the portions, no ingredient list, amounts or method. The rows are plain foods with no dish parts. The cake rows are category `an_vat`, the three updates keep `mon_viet`.

## Missing nutrients (left out)

- **Bánh khoai nướng Minh Hào (sữa chua thường)**: vitamin_c, vitamin_d
- **Bánh khoai nướng Minh Hào (sữa chua Hy Lạp)**: vitamin_c, vitamin_d
- **Sốt cà chua nướng Minh Hào**: vitamin_e, vitamin_k, b1
- **Mì Ý sốt cà Minh Hào**: vitamin_e, vitamin_k, b1
- **Bò hầm Minh Hào**: vitamin_d

Other nutrients below the 90 % coverage rule are also left out; the rule is the one the earlier recipe rows used (`dish_build/dishlib.py`).

## Dry run

`go test ./cmd/importfoods` passes. The importer's parse path and completeness report, run without `DATABASE_URL`:

```bash
cd apps/api
go run ./cmd/importfoods --dry-run --file ../../docs/data/new-foods-2026-10-21b.json
```

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 5 food records from ../../docs/data/new-foods-2026-10-21b.json
Completeness Report: 90.0% average coverage of the 22 counted nutrients across 5 foods
```

## How Hao imports this

See `docs/data/new-foods-2026-10-21b-import.md` (Docker commands, dump first, rollback).
