# New foods, 21/10/2026 (c): Bánh khoai nướng Minh Hào with swappable ingredients

For Hao's server import (Dong's importer, unchanged) and the web change in this branch. Data: `docs/data/new-foods-2026-10-21c.json`, 7 rows, all new: the 6 ingredient foods the catalogue did not have, and the cake itself as **one** row (it replaces the two yogurt rows that were in PR #40). The cake's recipe, with its alternatives, is `apps/web/tests/fixtures/dish-recipes.json` (slimmed into `lib/data/dish-recipes.slim.json` by `npm run prebuild`). Nothing imported.

**Public recipe (Hao, 21/10 13:40):** the cake's ingredients and amounts are public so users can change them in Thành phần. This lifts the "no dish parts, recipe private" rule for this one cake only; the other Minh Hào rows stay private.

Values are copied from the USDA FoodData Central CSVs (SR Legacy 2018-04, Foundation 2026-04-30) and the live catalogue's rows (NIN for khoai tím), rounded as in `round_nutrients.py`. The cake follows Hao's raw rule (21/10 13:15): per 100 g of the raw mix, no baking loss, 1 miếng = raw mix / 10.

The live catalogue was read on 21/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1299 foods in 3 pages (`limit=500`). None of the 7 keys or names exists.

## New foods

| Action | Food | Category | Source | Source id | Source name | kcal | Protein g | Fat g | Carbs g | Counted nutrients | Portions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| New | Chiết xuất vani | gia_vi | usda_sr_legacy | FDC 173471 | Vanilla extract [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/173471/nutrients) | 288 | 0.1 | 0.1 | 12.7 | 22/22 | 100 g; 1 muỗng canh = 13 g; 1 muỗng cà phê = 4.2 g |
| New | Siro cây phong | an_vat | usda_sr_legacy | FDC 169661 | Syrups, maple [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169661/nutrients) | 260 | 0 | 0.1 | 67 | 22/22 | 100 g; 1 muỗng canh = 20 g |
| New | Bột hạnh nhân | beo | usda_foundation | FDC 2261420 | Flour, almond [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/2261420/nutrients) | 622 | 26.2 | 50.2 | 16.2 | 15/22 | 100 g |
| New | Bột nở | gia_vi | usda_sr_legacy | FDC 172803 | Leavening agents, baking powder, double-acting, sodium aluminum sulfate [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/172803/nutrients) | 53 | 0 | 0 | 27.7 | 22/22 | 100 g; 1 muỗng cà phê = 4.6 g |
| New | Chocolate đen 70–85 % | an_vat | usda_sr_legacy | FDC 170273 | Chocolate, dark, 70-85% cacao solids [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170273/nutrients) | 598 | 7.8 | 42.6 | 45.9 | 19/22 | 100 g |
| New | Sữa chua thường (nguyên kem, không đường) | sua | usda_sr_legacy | FDC 171284 | Yogurt, plain, whole milk [link](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171284/nutrients) | 61 | 3.5 | 3.2 | 4.7 | 22/22 | 100 g; 1 chén = 245 g |
| New | Bánh khoai nướng Minh Hào | mon_viet | fortify_kitchen | fortify_kitchen:banh-khoai-nuong | Công thức riêng của Fortify Kitchen; giá trị tính từ nguyên liệu (USDA/NIN/nhãn sản phẩm) | 210.6 | 6.1 | 10.6 | 22.8 | 20/22 | 1 miếng (1/10 khuôn) = 102.8 g; 100 g |

## The recipe (Thành phần)

One pan 20×20 cm = 1027.9 g raw = 10 miếng (102.8 g each). A portion scales every part (1 miếng = 0.1 of the amounts below). The catalogue row each part resolves to is found by `source|source_id`, never by name.

| Part | Source id | Grams per pan | Alternatives (same grams) |
|---|---|---|---|
| Khoai tím | vn_nin NIN 2008:khoai-tim-song | 300.0 |  |
| Sữa chua thường (nguyên kem, không đường) | usda_sr_legacy FDC 171284 | 122.5 | Sữa chua Hy Lạp không đường (FDC 171304) |
| Bột hạnh nhân | usda_foundation FDC 2261420 | 95.0 | Hạt bí (sấy khô) (FDC 170556) |
| Chuối | usda_sr_legacy FDC 173944 | 200.0 |  |
| Trứng gà (sống) | usda_sr_legacy FDC 171287 | 150.0 |  |
| Chocolate đen 70–85 % | usda_sr_legacy FDC 170273 | 80.0 |  |
| Hạnh nhân | usda_sr_legacy FDC 170567 | 15.0 | Hạt bí (sấy khô) (FDC 170556) |
| Siro cây phong | usda_sr_legacy FDC 169661 | 20.0 | Mật ong (FDC 169640) |
| Mật mía (USDA, chung) | usda_sr_legacy FDC 168820 | 20.0 |  |
| Chiết xuất vani | usda_sr_legacy FDC 173471 | 13.0 |  |
| Bột quế | usda_sr_legacy FDC 171320 | 7.8 |  |
| Bột nở | usda_sr_legacy FDC 172803 | 4.6 |  |

A person picks an alternative in the part's **Đổi nguyên liệu** select; the grams stay (and can be changed as before), Khôi phục puts everything back, and a changed cake is logged as one row "Bánh khoai nướng Minh Hào · đã chỉnh" (the existing one-off food), exactly as a changed Phở bò.

## Estimates and judgement calls

- Hao's "2 tbsp sweetener: the average of maple syrup and molasses" is two parts of 20 g each (USDA tbsp 20 g each), which adds up to the same numbers as the average. Maple syrup can be swapped for honey (Mật ong, already in the catalogue).
- Yogurt ½ cup = 122.5 g (USDA cup 245 g, the same cup USDA lists for the Greek yogurt record, which has no cup weight of its own). The default is plain whole-milk yogurt (USDA SR 171284); the alternative is the catalogue's Sữa chua Hy Lạp không đường (whole milk, USDA SR 171304).
- Almond flour 1 cup = 95 g, USDA's "cup, ground" for almonds (just under Hao's 96–112 g); values from the Foundation "Flour, almond" (15/22 counted micros). Its alternative, and the sliced almonds' alternative, is Hạt bí (sấy khô) (USDA SR 170556), already in the catalogue, at the same grams: pumpkin seed kernels stand in for ground ones.
- Khoai tím: the catalogue has no baked row, so the raw NIN row is applied to the 300 g raw weight (no baking loss under the raw rule, so no change in grams).
- Vanilla extract 13 g (USDA tbsp), cinnamon 7.8 g (USDA tbsp), baking powder 4.6 g (USDA tsp), eggs 3 × 50 g, banana 200 g, dark chocolate 80 g (USDA 70–85 %, 19/22 micros), sliced almonds 15 g.
- A nutrient is kept only when the parts that have it make up at least 90 % of the mass (the rule of the earlier recipe rows): cholesterol, sugars, trans_fat, vitamin C and vitamin D are left out. The values of the whole row are the sum of its parts, so a changed cake's totals follow the same arithmetic.

## Missing nutrients (left out)

- **Chiết xuất vani**: none of the 22
- **Siro cây phong**: none of the 22
- **Bột hạnh nhân**: vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k, b5, b12
- **Bột nở**: none of the 22
- **Chocolate đen 70–85 %**: vitamin_c, vitamin_d, folate
- **Sữa chua thường (nguyên kem, không đường)**: none of the 22
- **Bánh khoai nướng Minh Hào**: vitamin_c, vitamin_d

## Dry run

`go test ./cmd/importfoods` passes. The importer's parse path and completeness report, run without `DATABASE_URL`:

```bash
cd apps/api
go run ./cmd/importfoods --dry-run --file ../../docs/data/new-foods-2026-10-21c.json
```

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 7 food records from ../../docs/data/new-foods-2026-10-21c.json
Completeness Report: 92.2% average coverage of the 22 counted nutrients across 7 foods
```

## How Hao imports this

See `docs/data/new-foods-2026-10-21c-import.md`. **Import the data before the web deploy**: until the six ingredient foods and the cake exist in the catalogue, the cake has no Thành phần numbers.
