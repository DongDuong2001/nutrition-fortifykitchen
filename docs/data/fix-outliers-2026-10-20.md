# Outlier check, 20/10/2026

Data only: `docs/data/fix-outliers-2026-10-20.json` holds **9 full-row upserts**: the sweet-potato micronutrient swap (Khoai tím and Khoai lang trắng, raw and boiled; Khoai lang nghệ and Khoai mật, section 2), the Khoai lang luộc row that held raw values (section 2b) and the shell calcium of Ốc bươu and Ốc đá (section 2c). All on Hao's decision. No migration, no API or DB change was made.

## Result

- **The 201 mg magnesium in Khoai lang is what the original NIN 2007 table prints**, so it is not a digitisation error. The scan therefore found **no clear data error**: no live row differs from its own source record *and* is an outlier. Every other flagged NIN row also equals its source.
- **Hao decided to replace the sweet-potato micronutrients with USDA anyway** (raw FDC 168482, boiled FDC 168484), because the NIN print is almost certainly wrong for magnesium. For Khoai lang nghệ and Khoai mật (NIN 2009) every value the 2007 table prints is kept and USDA raw FDC 168482 supplies only Mg, K, Na and the nutrients NIN does not have. Two more rows were fixed after review (Khoai lang luộc, Ốc bươu and Ốc đá, sections 2b and 2c). Every row keeps its `source` and `source_id`, so the import updates the 9 existing rows and creates nothing.
- 8 other rows in 6 groups are still **doubtful** and need Hao's call (section 3).

The live catalogue was read on 20/10/2026 from `GET /api/v1/foods` on lehongkhanh.vn: 1,278 foods (3 pages of 500; the count was 1,273 earlier today).

## 1. Verification against the original NIN 2007 table

Source: *Bảng thành phần thực phẩm Việt Nam*, Viện Dinh dưỡng, NXB Y học, 2007 (FAO copy: `https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf`). The page was also rendered and read as an image, not only as text.

| Live row | NIN code | Table (PDF p.) | Table says | Live value | Verdict |
|---|---|---|---|---|---|
| Khoai tím; Khoai lang trắng | 2008 "Khoai lang" (Sweet potato, white) | p.46 (printed 31) | Mg **201**, K 210, Na 31, Ca 34, Fe 1.00, P 49, Zn 0.20, Cu 260 µg, Mn 0.390, source code 1 | Mg 201, K 210 | **Source really says 201.** Replaced by USDA on Hao's decision (section 2). |
| Khoai tím (luộc); Khoai lang trắng (luộc) | 2008002 | not in the 2007 table | no printed record | Mg 197.06, K 205.88 | Derived from 2008 (every value is 2008 × 0.98). Follows 2008; replaced by USDA boiled (section 2). |
| Khoai lang nghệ; Khoai mật | 2009 "Khoai lang nghệ" (Sweet potato, yellow) | p.47 (printed 32) | Mg `-`, K `-`, Na `-` (not analysed). Printed: Ca 36, Fe 0.90, P 56, vit C 30 | Mg 68, K 107, Na 350 | **Cannot be verified against the 2007 table.** Mg, K and Na come only from NIN's online lookup (`viendinhduong.vn`, the snapshot in `food-research/vn_nin`). Mg, K, Na replaced by USDA raw; every printed value kept (section 2). |

Notes: the NIN online lookup is a later, partly revised dataset, not a copy of the print (for example it rescales Lá lốt, and it lowers calcium for Ốc nhồi and Ốc vặn). So a value that matches the lookup but not the print is "unverified", not "wrong". On 2008 the lookup matches the print for every micronutrient; it differs on energy (124 vs 119 kcal) and carbs (29.8 vs 28.5 g).

Khoai tím and Khoai lang trắng are **the same NIN record (2008)** with two names; there is no purple-sweet-potato source behind Khoai tím. Khoai mật is likewise a copy of 2009.

## 2. Applied: sweet-potato micronutrients from USDA

The NIN print says 201, so this is a **choice, not a correction of a typo**: Hao decided that USDA is the better reference for these rows. Mg is the loudest value, but selenium (7.1 vs 0.6 µg) and raw vitamin C (23 vs 2.4 mg) also differ a lot, so the whole micronutrient set comes from one source.

**Source per row.** Raw rows (`NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`): USDA SR Legacy **FDC 168482** "Sweet potato, raw, unprepared". Boiled rows (`NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`): **FDC 168484** "Sweet potato, cooked, boiled, without skin". Yellow-variety rows (`NIN 2009` Khoai lang nghệ, `NIN 2009:khoai-mat-song` Khoai mật): the 2007 NIN print, plus **FDC 168482** raw for the gaps (see "Yellow variety" below). The brief named 168483 for boiled; 168483 is *baked in skin*, so 168484 was used (as agreed). The catalogue already uses 168483 and 168484 for "Khoai lang (nướng, cả vỏ)" and "Khoai lang (luộc, bỏ vỏ)".

**What was replaced (white and purple rows).** 21 of the 22 counted micronutrients (calcium, copper, iron, magnesium, manganese, phosphorus, potassium, selenium, sodium, zinc, vitamins C, D, E, K, B1, B2, B3, B5, B6, folate, B12), rounded as the other import files are (3 significant figures). Where USDA's value equals the live one the number is simply unchanged: raw vitamin E, K, B5 and folate. Vitamin D and B12 did not exist on the live rows; USDA reports a measured 0 for both, so they are added as 0. The yellow-variety rows are handled differently (below).

**What was kept, and one deliberate exception.**
- **Vitamin A stays at NIN's value in the white, purple and yellow rows** (12.5 µg raw / 12.25 µg boiled for white and purple; **122.5 µg for the yellow rows**). FDC 168482 is orange-fleshed sweet potato (709 µg RAE; boiled 787). Hao asked whether 709 fits the yellow variety: **it does not.** NIN measured β-carotene 1470 µg for Khoai lang nghệ (2007 table, p.47), which is 122.5 µg RAE; USDA's orange flesh has β-carotene 8509 µg, 5.8× more. For the white and purple rows the gap is about 60×. Say if Hao prefers USDA's value anyway.
- **Energy, protein, carbs, fat, fiber, water and fatty acids stay NIN** (the brief asks for micronutrients only). So each row now mixes sources: USDA micros on NIN macros. NIN raw is 124 kcal, 29.8 g carbs, 68 g water; USDA raw is 86 kcal, 20.1 g carbs, 77 g water. This gap is not part of this change and is left for Hao.
- `source`, `source_id`, `name`, `name_vi`, `category`, `brand` (null), `tip_vi` (null) and the portions are exactly as live, so the upsert hits the existing rows. `source` is still `vn_nin` because the upsert key must not change.

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

**Yellow variety, before / after** (Khoai lang nghệ `NIN 2009` and Khoai mật `NIN 2009:khoai-mat-song`, identical values). The rule: every value the 2007 NIN table prints for 2009 is kept; USDA SR Legacy **FDC 168482** (raw) supplies only Mg, K, Na and the nutrients NIN does not have.

| Nutrient | Before (live) | After | Source of the "after" |
|---|---|---|---|
| Calcium (mg) | 36 | 36 (unchanged) | NIN 2007 table (p.47), as printed |
| Iron (mg) | 0.9 | 0.9 (unchanged) | NIN 2007 table (p.47), as printed |
| Phosphorus (mg) | 56 | 56 (unchanged) | NIN 2007 table (p.47), as printed |
| Vitamin A (µg RAE) | 122.5 | 122.5 (unchanged) | NIN 2007 table (p.47): β-carotene 1470 µg = 122.5 µg RAE |
| Vitamin C (mg) | 30 | 30 (unchanged) | NIN 2007 table (p.47), as printed |
| B1 (mg) | 0.12 | 0.12 (unchanged) | NIN 2007 table (p.47), as printed |
| B2 (mg) | 0.05 | 0.05 (unchanged) | NIN 2007 table (p.47), as printed |
| B3 (mg) | 0.6 | 0.6 (unchanged) | NIN 2007 table (p.47), as printed |
| Magnesium (mg) | 68 | 25 | USDA FDC 168482 (the 2007 table prints `-`; the "before" is the NIN online lookup only) |
| Potassium (mg) | 107 | 337 | USDA FDC 168482 (the 2007 table prints `-`; the "before" is the NIN online lookup only) |
| Sodium (mg) | 350 | 55 | USDA FDC 168482 (the 2007 table prints `-`; the "before" is the NIN online lookup only) |
| Zinc (mg) | absent | 0.3 | USDA FDC 168482 (NIN has no value) |
| Copper (mg) | absent | 0.151 | USDA FDC 168482 (NIN has no value) |
| Manganese (mg) | absent | 0.258 | USDA FDC 168482 (NIN has no value) |
| Selenium (µg) | absent | 0.6 | USDA FDC 168482 (NIN has no value) |
| Vitamin D (µg) | absent | 0 | USDA FDC 168482 (NIN has no value) |
| Vitamin E (mg) | absent | 0.26 | USDA FDC 168482 (NIN has no value) |
| Vitamin K (µg) | absent | 1.8 | USDA FDC 168482 (NIN has no value) |
| B5 (mg) | absent | 0.8 | USDA FDC 168482 (NIN has no value) |
| B6 (mg) | absent | 0.209 | USDA FDC 168482 (NIN has no value) |
| Folate (µg) | absent | 11 | USDA FDC 168482 (NIN has no value) |
| B12 (µg) | absent | 0 | USDA FDC 168482 (NIN has no value) |

Energy, protein, carbs, fat, fiber and water are unchanged. An earlier version of this file replaced the seven printed values with USDA's orange-fleshed ones (for example vitamin C 30 to 2.4 mg); that was reverted on review, so the net change on each yellow row is the 14 USDA values above (3 replaced, 11 added) and nothing else.

Rows changed in section 2: white and purple raw rows 17 values changed or added, boiled rows 20, yellow rows 14.

### 2b. Khoai lang luộc: boiled name, raw values

`usda_foundation` / `food-khoai-lang` ("Khoai lang luộc", `tinh_bot`) held USDA *raw* sweet potato (86 kcal, K 337, Na 55) under a boiled name, with 11 keys and no magnesium. Its nutrient map is now replaced as a whole by USDA SR Legacy **FDC 168484**, "Sweet potato, cooked, boiled, without skin" (3 significant figures, as the other import files). `source`, `source_id`, `name`/`name_vi`, `category`, `tip_vi` ("Nguồn carb chậm tự nhiên và beta-carotene dồi dào.") and the two portions (1 củ 150 g, 100 g) are exactly as live. The values equal the live row `usda_sr_legacy` / `FDC 168484` "Khoai lang (luộc, bỏ vỏ)", except where that row rounds harder (for example B3 0.54 against 0.538 here).

Per 100 g, before / after:

| Nutrient | Before (live) | After (FDC 168484) |
|---|---|---|
| Energy (kcal) | 86 | 76 |
| Protein (g) | 1.6 | 1.37 |
| Carbs (g) | 20.1 | 17.7 |
| Fat (g) | 0.1 | 0.14 |
| Fiber (g) | 3 | 2.5 |
| Sugars (g) | absent | 5.74 |
| Water (g) | absent | 80.1 |
| Alcohol (g) | absent | 0 |
| Saturated fat (g) | absent | 0.031 |
| Trans fat (g) | absent | 0 |
| Monounsaturated fat (g) | absent | 0 |
| Polyunsaturated fat (g) | absent | 0.061 |
| Cholesterol (mg) | absent | 0 |
| Calcium (mg) | absent | 27 |
| Iron (mg) | absent | 0.72 |
| Magnesium (mg) | absent | 18 |
| Phosphorus (mg) | absent | 32 |
| Potassium (mg) | 337 | 230 |
| Sodium (mg) | 55 | 27 |
| Zinc (mg) | absent | 0.2 |
| Copper (mg) | absent | 0.094 |
| Manganese (mg) | 0.26 | 0.266 |
| Selenium (µg) | absent | 0.2 |
| Vitamin A (µg RAE) | 709 | 787 |
| Vitamin C (mg) | 2.4 | 12.8 |
| Vitamin D (µg) | absent | 0 |
| Vitamin E (mg) | absent | 0.94 |
| Vitamin K (µg) | absent | 2.1 |
| B1 (mg) | absent | 0.056 |
| B2 (mg) | absent | 0.047 |
| B3 (mg) | absent | 0.538 |
| B5 (mg) | absent | 0.581 |
| B6 (mg) | absent | 0.165 |
| Folate (µg) | absent | 6 |
| B12 (µg) | absent | 0 |
| Net carbs (g) | 17.1 | removed |

- `net_carbs` (17.1) is removed with the old map. It is a legacy key on 8 old seed rows only (no USDA-imported row has it) and is just carbs minus fiber; with the new values it would be 15.2. Say if it should stay.
- Magnesium is now present (18 mg). Vitamin A rises from 709 to 787 µg RAE, carbs fall from 20.1 to 17.7 g and energy from 86 to 76 kcal, as expected for boiled.
- This row and `FDC 168484` now describe the same food; the catalogue keeps both.

### 2c. Ốc bươu and Ốc đá: shell calcium

NIN 2007 prints calcium 1310 mg (`NIN 8041`, p.429) and 1660 mg (`NIN 8042`, p.430), which includes the shell. NIN's own lookup already corrected the sibling rows Ốc nhồi (1357 to 11) and Ốc vặn (1356 to 10). Calcium is set to **10 mg**, USDA SR Legacy FDC 167744 "Mollusks, snail, raw". Nothing else on these rows changes (full-row upsert; the other nutrients, `name_vi`, category and portions are as live; `name` is the NIN lookup's English name).

| Row | Nutrient | Before | After | Source of the "after" |
|---|---|---|---|---|
| Ốc bươu (`NIN 8041`) | Calcium (mg) | 1310 | 10 | USDA FDC 167744 (SR Legacy) |
| Ốc đá (`NIN 8042`) | Calcium (mg) | 1660 | 10 | USDA FDC 167744 (SR Legacy) |

Unchanged on both rows: energy (84 / 63), protein (11.1 / 11.2), fat (0.7 / 0.3), carbs (8.3 / 3.9), phosphorus (64 / 83) and water (76.8 / 80.3), all as the 2007 table prints them.

## 3. Whole-catalogue scan

**Method.** 
1. *Source consistency:* every `usda_sr_legacy`/`usda_foundation` row with an FDC id (431) was compared with the USDA CSVs in `food-research/usda`, and every `vn_nin` row (202) with the NIN lookup snapshot. 34 values in 3 rows differ, all derived rows (a blended "Berries đông lạnh", and Mồng tơi (nấu chín) FDC 169400, which keeps raw minerals with retention-adjusted vitamins). None is an outlier. 
2. *Group maxima:* 844 rows (the 434 `bo_sung` rows are excluded: 427 are label doses of supplements, which have no food-group comparator). Each micronutrient (22) was compared with the highest value in the matching USDA group (SR Legacy 2018-04 + Foundation 2026-04-30), separately for wet (water ≥ 60 g) and dry foods, and flagged above 3× that maximum and above a small per-nutrient floor. Tubers use a roots-only group (greens, juices and chips removed), which is why the sweet potato rows are caught: roots top out at 51 mg Mg. 
3. *Tier 2 (lower confidence):* non-USDA rows above 2× the group's 95th percentile (69 values in 46 rows). All were reviewed; they are mostly real extremes (fish sauce sodium, chili vitamin C, nuts). Only the shell-inclusive calcium values below are kept.
4. *Print check:* every flagged NIN row was matched to its printed 2007 record by code and English name.

Result: 19 flags in 18 rows in step 2. 10 groups below were doubtful: D1, D2 and D3 (the 6 sweet-potato rows) were resolved by section 2 and D7 (Ốc bươu, Ốc đá) by section 2c; the other 6 groups (8 rows) remain open. The other flagged rows are legitimate (section 4).

### Doubtful rows for Hao (D1 to D3 resolved in section 2, D7 in section 2c; the rest not changed)

| # | Live row (source, source_id) | Nutrient | Live | Original NIN 2007 | Reference | Note |
|---|---|---|---|---|---|---|
| D1 | Khoai tím, Khoai lang trắng (vn_nin, `NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`) | Mg | 201 | 201 (p.46) | USDA raw 25 (8×) | Source-faithful. **Resolved: swapped to USDA (section 2).** |
| D2 | Khoai tím (luộc), Khoai lang trắng (luộc) (`NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`) | Mg | 197.06 | derived from 2008 | USDA boiled 18 (11×) | Follows D1. **Resolved: swapped to USDA boiled (section 2).** |
| D3 | Khoai lang nghệ (`NIN 2009`), Khoai mật (`NIN 2009:khoai-mat-song`) | Mg / K / Na | 68 / 107 / 350 | `-` / `-` / `-` (p.47) | USDA raw 25 / 337 / 55 | Not in the 2007 table. Na 350 is 6× USDA, K 107 is a third of USDA. Origin is the online lookup only. **Resolved: Mg, K, Na from USDA raw, printed values kept (section 2).** |
| D4 | Cơm dừa già (vn_nin, `NIN 3001`) | Fe, Zn | 30, 5 | 30, 5 (p.67) | USDA coconut meat raw Fe 2.43, Zn 1.1 (12×, 4.5×) | Source-faithful. Probably an error in the NIN table itself. |
| D5 | Củ cái (khoai cái) (`NIN 2002`) | Zn | 11 | 11 (p.40) | USDA yam raw 0.24, taro 0.23 (~45×) | Source-faithful. |
| D6 | Lá lốt (`NIN 4046`) | P | 651.53 | 980 (p.148) | USDA fresh herbs 48–66; leafy veg max 197 | The lookup is 0.665× the print for every mineral. P is implausible in both versions. |
| D7 | Ốc bươu (`NIN 8041`), Ốc đá (`NIN 8042`) | Ca | 1310, 1660 | 1310, 1660 (p.429–430) | USDA snail 10 | Same shell-calcium pattern that NIN already corrected for the sibling rows Ốc nhồi (1357 to 11) and Ốc vặn (1356 to 10) in the lookup. No corrected NIN value exists for these two; USDA snail Ca 10 matches what NIN did for the siblings. **Resolved: Ca set to 10 (section 2c).** |
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

- **Khoai lang luộc** (usda_foundation `food-khoai-lang`) was named boiled but held USDA *raw* sweet potato. **Fixed in section 2b.**
- A few rows carry a slug suffix in `source_id` (for example `FDC 169400:mong-toi-nau-chin`); the importer upserts on the full string, so a fix file must use the suffix exactly.

## 6. Dry run

Run from `apps/api` without `DATABASE_URL` (a dry run never opens the database):

```bash
go run ./cmd/importfoods --dry-run --file ../../docs/data/fix-outliers-2026-10-20.json
```

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 9 food records from ../../docs/data/fix-outliers-2026-10-20.json
Completeness Report: 79.8% average coverage of the 22 counted nutrients across 9 foods
```

(The average is below 100% because Ốc bươu and Ốc đá carry only the 7 values NIN prints; this change adds none to them.)

The dry run only parses the file and never opens the database. Separately checked against the live catalogue re-read on 20/10/2026 (`GET /api/v1/foods`, 1,278 rows): each of the 9 `source` + `source_id` pairs exists, and each record's `name_vi`, `category`, portions and `tip_vi` equal the live row. Macros are unchanged on 8 rows; only Khoai lang luộc changes them, on purpose (section 2b). So the real run **updates 9 rows and inserts none**. The pairs: `vn_nin` `NIN 2008:khoai-tim-song`, `NIN 2008:khoai-lang-trang-song`, `NIN 2008002:khoai-tim-luoc`, `NIN 2008002:khoai-lang-trang-luoc`, `NIN 2009`, `NIN 2009:khoai-mat-song`, `NIN 8041`, `NIN 8042`; `usda_foundation` `food-khoai-lang`. `name` (English) and `brand` are not exposed by the API, so they could not be compared; the importer overwrites both, which Dong should keep in mind. The importer replaces the whole nutrient map and the portions on upsert, which is why every record carries the complete row.

The real import, for Dong, from `apps/api` with `DATABASE_URL` set (upsert on `source` + `source_id`, safe to re-run):

```bash
go run ./cmd/importfoods --file ../../docs/data/fix-outliers-2026-10-20.json
```

## Reproducing

The scripts and inputs (live snapshot, parsed 2007 table, USDA reference builder) are in `food-research/outlier_scan_1020/` (not in git). Printed-table page numbers are PDF pages of the FAO file.
