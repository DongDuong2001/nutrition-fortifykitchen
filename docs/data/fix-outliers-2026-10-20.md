# Outlier check, 20/10/2026

Data only: `docs/data/fix-outliers-2026-10-20.json` is **an empty importer file (`[]`, 0 rows)**. No migration, no API or DB change was made.

## Result

- **The 201 mg magnesium in Khoai lang is what the original NIN 2007 table prints**, so it is not a digitisation error. Per the brief, NIN 2008 and 2008002 were **not changed**. The same applies to every other flagged NIN row: each one equals its source.
- **No live row is a clear data error.** The scan found no row whose live value differs from its own source record *and* is an outlier. So there is nothing to upsert, and no before/after to show.
- 17 rows are **doubtful** and need Hao's call (section 3). The biggest group is the sweet-potato family (6 rows). A ready swap to USDA values is in section 2 if Hao wants it.

The live catalogue was read on 20/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1,278 foods (3 pages of 500; the count was 1,273 earlier today).

## 1. Verification against the original NIN 2007 table

Source: *Bảng thành phần thực phẩm Việt Nam*, Viện Dinh dưỡng, NXB Y học, 2007 (FAO copy: `https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf`). The page was also rendered and read as an image, not only as text.

| Live row | NIN code | Table (PDF p.) | Table says | Live value | Verdict |
|---|---|---|---|---|---|
| Khoai tím; Khoai lang trắng | 2008 "Khoai lang" (Sweet potato, white) | p.46 (printed 31) | Mg **201**, K 210, Na 31, Ca 34, Fe 1.00, P 49, Zn 0.20, Cu 260 µg, Mn 0.390, source code 1 | Mg 201, K 210 | **Source really says 201. Unchanged.** |
| Khoai tím (luộc); Khoai lang trắng (luộc) | 2008002 | not in the 2007 table | no printed record | Mg 197.06, K 205.88 | Derived from 2008 (every value is 2008 × 0.98). Follows 2008. **Unchanged.** |
| Khoai lang nghệ; Khoai mật | 2009 "Khoai lang nghệ" (Sweet potato, yellow) | p.47 (printed 32) | Mg `-`, K `-`, Na `-` (not analysed). Printed: Ca 36, Fe 0.90, P 56, vit C 30 | Mg 68, K 107, Na 350 | **Cannot be verified against the 2007 table.** Mg, K and Na come only from NIN's online lookup (`viendinhduong.vn`, the snapshot in `food-research/vn_nin`). Not changed; see D3. |

Notes: the NIN online lookup is a later, partly revised dataset, not a copy of the print (for example it rescales Lá lốt, and it lowers calcium for Ốc nhồi and Ốc vặn). So a value that matches the lookup but not the print is "unverified", not "wrong". On 2008 the lookup matches the print for every micronutrient; it differs on energy (124 vs 119 kcal) and carbs (29.8 vs 28.5 g).

Khoai tím and Khoai lang trắng are **the same NIN record (2008)** with two names; there is no purple-sweet-potato source behind Khoai tím. Khoai mật is likewise a copy of 2009.

## 2. If Hao decides to replace the sweet-potato micronutrients (not applied)

Not done, because the source says 201. If Hao wants the USDA values anyway, these are the replacement numbers per 100 g. Note on the FDC numbers in the brief: **168482 is raw, 168483 is *baked in skin*, 168484 is boiled without skin.** The catalogue already uses 168483/168484 correctly for "Khoai lang (nướng, cả vỏ)" and "Khoai lang (luộc, bỏ vỏ)".

| Nutrient | Live raw (2008) | USDA raw FDC 168482 | Live boiled (2008002) | USDA boiled FDC 168484 |
|---|---|---|---|---|
| Magnesium | 201 | 25 | 197.06 | 18 |
| Potassium | 210 | 337 | 205.88 | 230 |
| Sodium | 31 | 55 | 30.39 | 27 |
| Calcium | 34 | 30 | 33.33 | 27 |
| Iron | 1 | 0.61 | 0.98 | 0.72 |
| Phosphorus | 49.4 | 47 | 48.43 | 32 |
| Zinc | 0.2 | 0.3 | 0.2 | 0.2 |
| Copper | 0.26 | 0.151 | 0.25 | 0.094 |
| Manganese | 0.39 | 0.258 | 0.38 | 0.266 |
| Selenium | 7.1 | 0.6 | 6.96 | 0.2 |
| Vitamin C | 23 | 2.4 | 22.55 | 12.8 |

Magnesium is the only mineral that is far out; selenium (7.1 vs 0.6 µg) and vitamin C raw (23 vs 2.4 mg) also differ a lot, so a swap should replace the whole micronutrient set from one source, not Mg alone. The importer replaces the whole nutrient map on upsert, so a fix file must carry the complete row (name, category, all nutrients, portions). That file was not generated; it is quick to make once the choice is made.

## 3. Whole-catalogue scan

**Method.** 
1. *Source consistency:* every `usda_sr_legacy`/`usda_foundation` row with an FDC id (431) was compared with the USDA CSVs in `food-research/usda`, and every `vn_nin` row (202) with the NIN lookup snapshot. 34 values in 3 rows differ, all derived rows (a blended "Berries đông lạnh", and Mồng tơi (nấu chín) FDC 169400, which keeps raw minerals with retention-adjusted vitamins). None is an outlier. 
2. *Group maxima:* 844 rows (the 434 `bo_sung` rows are excluded: 427 are label doses of supplements, which have no food-group comparator). Each micronutrient (22) was compared with the highest value in the matching USDA group (SR Legacy 2018-04 + Foundation 2026-04-30), separately for wet (water ≥ 60 g) and dry foods, and flagged above 3× that maximum and above a small per-nutrient floor. Tubers use a roots-only group (greens, juices and chips removed), which is why the sweet potato rows are caught: roots top out at 51 mg Mg. 
3. *Tier 2 (lower confidence):* non-USDA rows above 2× the group's 95th percentile (69 values in 46 rows). All were reviewed; they are mostly real extremes (fish sauce sodium, chili vitamin C, nuts). Only the shell-inclusive calcium values below are kept.
4. *Print check:* every flagged NIN row was matched to its printed 2007 record by code and English name.

Result: 19 flags in 18 rows in step 2. 10 are doubtful (below), 8 are legitimate (section 4).

### Doubtful rows for Hao (none changed)

| # | Live row (source, source_id) | Nutrient | Live | Original NIN 2007 | Reference | Note |
|---|---|---|---|---|---|---|
| D1 | Khoai tím, Khoai lang trắng (vn_nin, `NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`) | Mg | 201 | 201 (p.46) | USDA raw 25 (8×) | Source-faithful. Swap in section 2. |
| D2 | Khoai tím (luộc), Khoai lang trắng (luộc) (`NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`) | Mg | 197.06 | derived from 2008 | USDA boiled 18 (11×) | Follows D1. |
| D3 | Khoai lang nghệ (`NIN 2009`), Khoai mật (`NIN 2009:khoai-mat-song`) | Mg / K / Na | 68 / 107 / 350 | `-` / `-` / `-` (p.47) | USDA raw 25 / 337 / 55 | Not in the 2007 table. Na 350 is 6× USDA, K 107 is a third of USDA. Origin is the online lookup only. |
| D4 | Cơm dừa già (vn_nin, `NIN 3001`) | Fe, Zn | 30, 5 | 30, 5 (p.67) | USDA coconut meat raw Fe 2.43, Zn 1.1 (12×, 4.5×) | Source-faithful. Probably an error in the NIN table itself. |
| D5 | Củ cái (khoai cái) (`NIN 2002`) | Zn | 11 | 11 (p.40) | USDA yam raw 0.24, taro 0.23 (~45×) | Source-faithful. |
| D6 | Lá lốt (`NIN 4046`) | P | 651.53 | 980 (p.148) | USDA fresh herbs 48–66; leafy veg max 197 | The lookup is 0.665× the print for every mineral. P is implausible in both versions. |
| D7 | Ốc bươu (`NIN 8041`), Ốc đá (`NIN 8042`) | Ca | 1310, 1660 | 1310, 1660 (p.429–430) | USDA snail 10 | Same shell-calcium pattern that NIN already corrected for the sibling rows Ốc nhồi (1357 to 11) and Ốc vặn (1356 to 10) in the lookup. Best candidate for a fix, but no corrected NIN value exists for these two. USDA snail Ca 10 would match what NIN did for the siblings. |
| D8 | Rạm (`NIN 8046`) | Ca | 3520 | 3520 (p.434) | USDA crab 46–89 | Whole crab with shell; group max (1229) is a dried or cheese item. |
| D9 | Tép (tép gạo) (`NIN 8049`), Trai sông (`NIN 8054`), Cua đồng (`NIN 8034`) | Ca | 910, 668, 826 | 910, 668, **120** (p.437, 442, 422) | USDA crab 46–89 | Same whole-animal pattern, lower confidence. Cua đồng: the lookup (826) differs from the print (120). |
| D10 | Cá cơm cả xương (khô) (asean, `PhilFCT G150`) | Ca, P | 2469, 1762 | n/a | USDA dried small fish with bones 1000+ | Plausible for a whole dried fish; listed for completeness. |

Low-side differences between the lookup and the print, not outliers, not changed: Cua đồng K 27 (print 266) and B2 0.05 (print 0.51) look like dropped digits in the lookup; Rau ngót vitamin C 53 (print 185); Đậu đũa B3 0.57 (print 1.8).

## 4. Flagged and checked legitimate (equal to their source)

| Row | Flag | Why it is fine |
|---|---|---|
| Bắp/ngô ngọt (FDC 169999), Hạt dẻ luộc (FDC 170166), Khoai mì luộc (`NIN 2004`) | vitamin C vs a grain group | Wrong group in the scan (corn and cassava are vegetables, chestnut is a nut). Values equal USDA / NIN. |
| Cá chim (sống) (FDC 173682) | vitamin D 11 | Wrong group in the scan (name read as a bird). Equals USDA. |
| Đậu gà, hạt khô (FDC 173756) | Mn 4.15 | Wrong group in the scan (name read as chicken). Equals USDA. |
| Sả (FDC 168573) | Mn 5.224 | Equals USDA lemongrass. |
| Matcha, Matcha Satoen (literature, STFCJ 5th rev. 2005) | vitamin K 2900, folate 1200 | The Japanese table's values for powdered tea. |
| Mộc nhĩ (khô) (`NIN 4125`) | B5 21.5, Fe 56.1 | Equals the print's "Jew's ear, dried" record (code 4121, p.223). |

## 5. Also noticed (not outliers, not changed)

- **Khoai lang luộc** (usda_foundation `food-khoai-lang`) is named boiled but its values are USDA *raw* sweet potato (86 kcal, K 337, Na 55); boiled is 76 kcal, K 230. It has no magnesium at all.
- A few rows carry a slug suffix in `source_id` (for example `FDC 169400:mong-toi-nau-chin`); the importer upserts on the full string, so a fix file must use the suffix exactly.

## 6. Dry run

Run from `apps/api` without `DATABASE_URL` (a dry run never opens the database):

```bash
go run ./cmd/importfoods --dry-run --file ../../docs/data/fix-outliers-2026-10-20.json
```

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 0 food records from ../../docs/data/fix-outliers-2026-10-20.json
```

The file is an empty array, so there is no completeness line and the real import would write nothing. **Dong does not need to run it.**

## Reproducing

The scripts and inputs (live snapshot, parsed 2007 table, USDA reference builder) are in `food-research/outlier_scan_1020/` (not in git). Printed-table page numbers are PDF pages of the FAO file.
