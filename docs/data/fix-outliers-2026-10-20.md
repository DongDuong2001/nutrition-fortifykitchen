# Outlier check, 20/10/2026

Data only: `docs/data/fix-outliers-2026-10-20.json` holds **4 full-row upserts** (Khoai tím and Khoai lang trắng, raw and boiled), applied on Hao's decision (section 2). No migration, no API or DB change was made.

## Result

- **The 201 mg magnesium in Khoai lang is what the original NIN 2007 table prints**, so it is not a digitisation error. The scan therefore found **no clear data error**: no live row differs from its own source record *and* is an outlier. Every other flagged NIN row also equals its source.
- **Hao decided to replace the sweet-potato micronutrients with USDA anyway** (raw FDC 168482, boiled FDC 168484), because the NIN print is almost certainly wrong for magnesium. That is the only change in this file (section 2). The rows keep `source = vn_nin` and their `source_id`, so the import updates the 4 existing rows and creates nothing.
- 12 other rows in 8 groups are **doubtful** and need Hao's call (section 3). Khoai lang nghệ and Khoai mật were not in the swap and are unchanged.

The live catalogue was read on 20/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1,278 foods (3 pages of 500; the count was 1,273 earlier today).

## 1. Verification against the original NIN 2007 table

Source: *Bảng thành phần thực phẩm Việt Nam*, Viện Dinh dưỡng, NXB Y học, 2007 (FAO copy: `https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf`). The page was also rendered and read as an image, not only as text.

| Live row | NIN code | Table (PDF p.) | Table says | Live value | Verdict |
|---|---|---|---|---|---|
| Khoai tím; Khoai lang trắng | 2008 "Khoai lang" (Sweet potato, white) | p.46 (printed 31) | Mg **201**, K 210, Na 31, Ca 34, Fe 1.00, P 49, Zn 0.20, Cu 260 µg, Mn 0.390, source code 1 | Mg 201, K 210 | **Source really says 201.** Replaced by USDA on Hao's decision (section 2). |
| Khoai tím (luộc); Khoai lang trắng (luộc) | 2008002 | not in the 2007 table | no printed record | Mg 197.06, K 205.88 | Derived from 2008 (every value is 2008 × 0.98). Follows 2008; replaced by USDA boiled (section 2). |
| Khoai lang nghệ; Khoai mật | 2009 "Khoai lang nghệ" (Sweet potato, yellow) | p.47 (printed 32) | Mg `-`, K `-`, Na `-` (not analysed). Printed: Ca 36, Fe 0.90, P 56, vit C 30 | Mg 68, K 107, Na 350 | **Cannot be verified against the 2007 table.** Mg, K and Na come only from NIN's online lookup (`viendinhduong.vn`, the snapshot in `food-research/vn_nin`). Not changed; see D3. |

Notes: the NIN online lookup is a later, partly revised dataset, not a copy of the print (for example it rescales Lá lốt, and it lowers calcium for Ốc nhồi and Ốc vặn). So a value that matches the lookup but not the print is "unverified", not "wrong". On 2008 the lookup matches the print for every micronutrient; it differs on energy (124 vs 119 kcal) and carbs (29.8 vs 28.5 g).

Khoai tím and Khoai lang trắng are **the same NIN record (2008)** with two names; there is no purple-sweet-potato source behind Khoai tím. Khoai mật is likewise a copy of 2009.

## 2. Applied: sweet-potato micronutrients from USDA

The NIN print says 201, so this is a **choice, not a correction of a typo**: Hao decided that USDA is the better reference for these rows. Mg is the loudest value, but selenium (7.1 vs 0.6 µg) and raw vitamin C (23 vs 2.4 mg) also differ a lot, so the whole micronutrient set comes from one source.

**Source per row.** Raw rows (`NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`): USDA SR Legacy **FDC 168482** "Sweet potato, raw, unprepared". Boiled rows (`NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`): **FDC 168484** "Sweet potato, cooked, boiled, without skin". The brief named 168483 for boiled; 168483 is *baked in skin*, so 168484 was used (as agreed). The catalogue already uses 168483 and 168484 for "Khoai lang (nướng, cả vỏ)" and "Khoai lang (luộc, bỏ vỏ)".

**What was replaced.** 21 of the 22 counted micronutrients (calcium, copper, iron, magnesium, manganese, phosphorus, potassium, selenium, sodium, zinc, vitamins C, D, E, K, B1, B2, B3, B5, B6, folate, B12), rounded as the other import files are (3 significant figures). Where USDA's value equals the live one the number is simply unchanged: raw vitamin E, K, B5 and folate. Vitamin D and B12 did not exist on the live rows; USDA reports a measured 0 for both, so they are added as 0.

**What was kept, and one deliberate exception.**
- **Vitamin A stays at NIN's 12.5 µg (raw) / 12.25 µg (boiled).** FDC 168482 is orange-fleshed sweet potato (709 µg RAE; boiled 787), which would overstate a white or purple sweet potato by about 60×. Say if Hao prefers USDA's value anyway.
- **Energy, protein, carbs, fat, fiber, water and fatty acids stay NIN** (the brief asks for micronutrients only). So each row now mixes sources: USDA micros on NIN macros. NIN raw is 124 kcal, 29.8 g carbs, 68 g water; USDA raw is 86 kcal, 20.1 g carbs, 77 g water. This gap is not part of this change and is left for Hao.
- `source`, `source_id`, `name`, `name_vi`, `category`, `brand` (null), `tip_vi` (null) and the portions are exactly as live, so the upsert hits the 4 existing rows. `source` is still `vn_nin` because the upsert key must not change.

**Before / after** (per 100 g; identical for Khoai tím and Khoai lang trắng, which share one NIN record):

| Nutrient | Raw before | Raw after (FDC 168482) | Boiled before | Boiled after (FDC 168484) |
|---|---|---|---|---|
| Magnesium (mg) | 201 | 25 | 197.06 | 18 |
| Potassium (mg) | 210 | 337 | 205.88 | 230 |
| Sodium (mg) | 31 | 55 | 30.39 | 27 |
| Calcium (mg) | 34 | 30 | 33.33 | 27 |
| Iron (mg) | 1 | 0.61 | 0.98 | 0.72 |
| Phosphorus (mg) | 49.4 | 47 | 48.43 | 32 |
| Zinc (mg) | 0.2 | 0.3 | 0.2 | 0.2 |
| Copper (mg) | 0.26 | 0.151 | 0.25 | 0.094 |
| Manganese (mg) | 0.39 | 0.258 | 0.38 | 0.266 |
| Selenium (µg) | 7.1 | 0.6 | 6.96 | 0.2 |
| Vitamin A (µg) | 12.5 | 12.5 (kept) | 12.25 | 12.25 (kept) |
| Vitamin C (mg) | 23 | 2.4 | 22.55 | 12.8 |
| Vitamin D (µg) | absent | 0 | absent | 0 |
| Vitamin E (mg) | 0.26 | 0.26 | 0.25 | 0.94 |
| Vitamin K (µg) | 1.8 | 1.8 | 1.76 | 2.1 |
| B1 (mg) | 0.05 | 0.078 | 0.03 | 0.056 |
| B2 (mg) | 0.05 | 0.061 | 0.03 | 0.047 |
| B3 (mg) | 0.6 | 0.557 | 0.35 | 0.538 |
| B5 (mg) | 0.8 | 0.8 | 0.47 | 0.581 |
| B6 (mg) | 0.21 | 0.209 | 0.12 | 0.165 |
| Folate (µg) | 11 | 11 | 5.39 | 6 |
| B12 (µg) | absent | 0 | absent | 0 |

Rows changed: 4 (raw rows 17 values changed or added, boiled rows 20). Not in this file: Khoai lang nghệ and Khoai mật (`NIN 2009`, see D3), which share the family but were not part of the decision.

## 3. Whole-catalogue scan

**Method.** 
1. *Source consistency:* every `usda_sr_legacy`/`usda_foundation` row with an FDC id (431) was compared with the USDA CSVs in `food-research/usda`, and every `vn_nin` row (202) with the NIN lookup snapshot. 34 values in 3 rows differ, all derived rows (a blended "Berries đông lạnh", and Mồng tơi (nấu chín) FDC 169400, which keeps raw minerals with retention-adjusted vitamins). None is an outlier. 
2. *Group maxima:* 844 rows (the 434 `bo_sung` rows are excluded: 427 are label doses of supplements, which have no food-group comparator). Each micronutrient (22) was compared with the highest value in the matching USDA group (SR Legacy 2018-04 + Foundation 2026-04-30), separately for wet (water ≥ 60 g) and dry foods, and flagged above 3× that maximum and above a small per-nutrient floor. Tubers use a roots-only group (greens, juices and chips removed), which is why the sweet potato rows are caught: roots top out at 51 mg Mg. 
3. *Tier 2 (lower confidence):* non-USDA rows above 2× the group's 95th percentile (69 values in 46 rows). All were reviewed; they are mostly real extremes (fish sauce sodium, chili vitamin C, nuts). Only the shell-inclusive calcium values below are kept.
4. *Print check:* every flagged NIN row was matched to its printed 2007 record by code and English name.

Result: 19 flags in 18 rows in step 2. 10 of the groups below were doubtful: D1 and D2 (the 4 sweet-potato rows) were resolved by the swap in section 2, the other 8 groups (12 rows) remain open. The other flagged rows are legitimate (section 4).

### Doubtful rows for Hao (D1 and D2 resolved in section 2; the rest not changed)

| # | Live row (source, source_id) | Nutrient | Live | Original NIN 2007 | Reference | Note |
|---|---|---|---|---|---|---|
| D1 | Khoai tím, Khoai lang trắng (vn_nin, `NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`) | Mg | 201 | 201 (p.46) | USDA raw 25 (8×) | Source-faithful. **Resolved: swapped to USDA (section 2).** |
| D2 | Khoai tím (luộc), Khoai lang trắng (luộc) (`NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`) | Mg | 197.06 | derived from 2008 | USDA boiled 18 (11×) | Follows D1. **Resolved: swapped to USDA boiled (section 2).** |
| D3 | Khoai lang nghệ (`NIN 2009`), Khoai mật (`NIN 2009:khoai-mat-song`) | Mg / K / Na | 68 / 107 / 350 | `-` / `-` / `-` (p.47) | USDA raw 25 / 337 / 55 | Not in the 2007 table. Na 350 is 6× USDA, K 107 is a third of USDA. Origin is the online lookup only. Same family as D1; the same USDA swap (FDC 168482) would apply if Hao wants it. |
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
Loaded 4 food records from ../../docs/data/fix-outliers-2026-10-20.json
Completeness Report: 100.0% average coverage of the 22 counted nutrients across 4 foods
```

The dry run only parses the file and never opens the database. Separately checked against the live catalogue read of 20/10/2026: each of the 4 `source` + `source_id` pairs exists, and each record's `name`, `name_vi`, `category` and portions equal the live row, so the real run updates 4 rows and inserts none. The importer replaces the whole nutrient map and the portions on upsert, which is why every record carries the complete row.

The real import, for Dong, from `apps/api` with `DATABASE_URL` set (upsert on `source` + `source_id`, safe to re-run):

```bash
go run ./cmd/importfoods --file ../../docs/data/fix-outliers-2026-10-20.json
```

## Reproducing

The scripts and inputs (live snapshot, parsed 2007 table, USDA reference builder) are in `food-research/outlier_scan_1020/` (not in git). Printed-table page numbers are PDF pages of the FAO file.
