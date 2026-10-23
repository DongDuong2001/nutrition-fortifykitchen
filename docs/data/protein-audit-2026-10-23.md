# Protein audit 23/10/2026: Thịt bò nạc, the fake-id seed rows, and the whole Đạm category

Data job `data/protein-audit-1023`, from `origin/main` 37cdb721. Snapshot: `food-research/live-1023/all.json` (1,306 foods, read 23/10; production was not read again). Nothing here touched production: every SQL, import and check was run only on a throw-away local Postgres seeded from that snapshot (section 9). **Hao runs the SQL and the import after review.**

**Counts.** 231 live rows have category `dam`; 31 rows have a `food-%` source_id (5 of them are in `dam`); together 257 rows were checked. **5 rows are fixed in this PR, 1 duplicate is archived, 35 more are off by more than 20 % but held** (moving them would break the raw/cooked pairs and dish recipes the app reads by `source|source_id`; they come back in a follow-up under the rules in section 12). Cá hồi is reverted and the three dish rows are deferred to the dish-recipes retune. The new pair check finds **52 failing raw/cooked pairs of 127** (27 material, 25 minor). Past diary entries keep their own snapshot (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so nothing already logged changes.

## 0. What changed after the review of the first version

- **No-loss rule (section 2).** `cmd/importfoods` replaces `per_100g_nutrients` whole, so a fix may not drop a nutrient the row has today unless the old value is shown wrong. A script (`protein-audit-2026-10-23-noloss.py`) compares every record with its snapshot row and fails on any loss not listed with a reason; the summary table has a lost / new column.
- **Cá hồi: reverted** (out of the SQL and the JSON). **Ức gà phi lê** now takes USDA raw skinless breast FDC 171077 under the slug key `FDC 171077:uc-ga-phi-le`. **Thịt bò nạc** takes USDA raw lean beef FDC 171779 (keeps b12), within 20 % of NIN 7003. **Bún chả ×2 and Phở gà are dropped** from this PR. Hến, Đậu hũ trắng and Tàu hủ trắng cứng stay, with what each loses listed. Mực stays archived.
- **Pair-consistency check (section 6)** over all 127 pairs in `raw-cooked-pairs.slim.json`, with the failing pairs, a proposed fix for each, and the high-fat raw table (section 7).

## 1. Summary: rows fixed in this PR

Per 100 g. Before = live 23/10; after = the source named in the last column (rounded as the earlier import files: energy, protein, carbs, fat, fiber to 0.1; the rest to 3 significant figures). Every fixed row keeps its **id**, its Vietnamese name, category, tip and portions. "Lost / new" counts tracked nutrients the live row has and the record leaves out (with values), and nutrients the record adds.

| Row (id) | Problem | Before kcal / P / F / C / fib | After | Lost / new | Source and key |
|---|---|---|---|---|---|
| Thịt bò nạc (`b1cb7f07`) | Fake FDC-style id. Values are cooked ground beef (213.33 = 320 kcal / 150 g from the design mock-up), not raw lean beef. 250 g showed ~30 g fat instead of ~10 g. | 213.33 / 26 / 12 / 0 / 0 | 130 / 22.4 / 4.5 / 0 / 0 | lost none · new 24 | USDA SR Legacy 171779 "Beef, composite of trimmed retail cuts, separable lean only, trimmed to 1/8" fat, select, raw"; `usda_foundation` / `food-thit-bo-nac` → `usda_sr_legacy` / `FDC 171779` |
| Ức gà phi lê (`b6c88da5`) | Fake id. Values are cooked roasted chicken breast (FDC 171477) under a name with no cooking word. Data rule: raw for meat unless the name says cooked. | 165 / 31 / 3.6 / 0 / 0 | 120 / 22.5 / 2.6 / 0 / 0 | lost none · new 23 | USDA SR Legacy 171077 "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw"; `usda_foundation` / `food-uc-ga` → `usda_sr_legacy` / `FDC 171077:uc-ga-phi-le` |
| Đậu hũ trắng (`245172d0`) | Fake id. USDA regular-tofu values (exact copy of "Đậu hũ (đậu phụ trắng)", FDC 172476); NIN has Đậu phụ. | 76 / 8.1 / 4.8 / 1.9 / 0.3 | 97 / 10.9 / 5.4 / 1.1 / 0.4 | lost none · new 16 | NIN 3025 Đậu phụ, sống; `vn_table` / `food-dau-hu` → `vn_nin` / `NIN 3025` |
| Tàu hủ trắng cứng (hấp/luộc) (`03bcdfd2`) | Wrong state: the name says steamed/boiled but the values are raw firm tofu (FDC 172475). NIN has Đậu phụ luộc. | 144 / 17.3 / 8.72 / 2.78 / 2.3 | 98 / 11 / 5.5 / 1.1 / 0.4 | lost 4: zeros: b12, cholesterol, trans_fat, vitamin_d · new 0 | NIN 3025002 Đậu phụ luộc; `usda_sr_legacy` / `FDC 172475:tau-hu-trang-hap-luoc` → `vn_nin` / `NIN 3025002` |
| Hến (`d2960a7c`) | Generic food from a regional table (PhilFCT) where NIN has it; 2.3x NIN kcal. | 105 / 8.9 / 1.9 / 13 / 0 | 45 / 4.5 / 0.7 / 5.1 / – | lost 9: cholesterol 65, monounsaturated_fat 0.17, polyunsaturated_fat 0.54, saturated_fat 0.18, vitamin_a 185; zeros: b1, fiber, sugars, vitamin_c · new 2 | NIN 8037 Hến, tươi; `asean` / `PhilFCT G020` → `vn_nin` / `NIN 8037` |

**Archived (not deleted):** Mực (`6028095b`, `usda_sr_legacy` / `FDC 174223`, 92 kcal / 15.6 P / 1.4 F). It is the same food as the live NIN row "Mực ống" (NIN 8040: 73 / 16.3 / 0.9), 26 % higher in kcal and 53 % in fat, and nothing in the app reads its key. `is_archived = true` hides it from search and the library; the row, its portions and every diary entry stay. (Hao: keep.)

Notes on the five fixes:

- **Thịt bò nạc: no code looks the row up by `source` / `source_id`**, so its key moves. Searched `apps/web` (lib, components, tests, scripts), `lib/data/*.json` (pairs and dish recipes) and `lib/training-foods.ts`: `food-thit-bo-nac` appears only in `data/seed_foods.json` and in the demo catalogue (`lib/mock/sample-foods.ts`, `history.ts`, `yesterday.ts`, `portion-panel.test.tsx`), as a mock id, not a live key. The demo values (320 kcal for 150 g, the design mock-up) are left alone; this job is data only. **Source choice:** NIN 7003 "Thịt bò, loại I, tươi" (118 / 21 / 3.8) has no b12 and no carbs, so the record would lose b12. The new record is USDA raw lean beef FDC 171779, which keeps every nutrient the row has and is within 20 % of NIN 7003 on all three (kcal +10 %, protein +7 %, fat +20 %). It is the generic one (composite of retail cuts, lean only), not one cut; 62 USDA raw beef rows pass the same test and keep every old nutrient; the closest to NIN is FDC 173086 (Beef, New Zealand, imported, manufacturing beef, raw: 119 / 21.23 / 3.68). If Hao prefers NIN 7003 itself, the only loss is b12 (2.1, a seed value).
- **Ức gà phi lê** → `usda_sr_legacy` / `FDC 171077:uc-ga-phi-le`, the slug the earlier batches used for a second row on a shared FDC. The plain-key row "Ức gà" (FDC 171077) stays; the two now hold the same numbers (a duplicate to merge later). The cooked rows "Ức gà luộc" and "Ức gà nướng" stay. The old numbers equalled "Ức gà nướng" exactly.
- **Đậu hũ trắng** → NIN 3025 "Đậu phụ, sống" (97 / 10.9 / 5.4); loses nothing. "Đậu hũ (đậu phụ trắng)" (USDA regular tofu, 76 / 8.1 / 4.8) is read by a dish recipe, so it stays and is listed as held; the two tofu rows now differ, which is the finding.
- **Tàu hủ trắng cứng (hấp/luộc)** → NIN 3025002 "Đậu phụ luộc" (98 / 11 / 5.5). It loses 4 nutrients, **all zeros** in the old USDA row (a plant food): b12 0, cholesterol 0, trans_fat 0, vitamin_d 0. The name says "cứng" (firm); NIN does not tell firm from regular, so this is the closest boiled tofu with a real source. The `recipe_calc` row "Tàu hủ chiên nồi chiên không dầu" (199 kcal) was computed in the research from tofu values; its ingredient list is not in the snapshot, so check it after the import.
- **Hến** (ASEAN PhilFCT G020, 105 / 8.9 / 1.9) → NIN 8037 "Hến, tươi" (45 / 4.5 / 0.7), which adds magnesium, potassium. It loses 9 nutrients: **zeros** (b1, fiber, sugars, vitamin_c) and **real values** (cholesterol 65, monounsaturated_fat 0.17, polyunsaturated_fat 0.54, saturated_fat 0.18, vitamin_a 185). The real values belong to the PhilFCT record whose macros are 2.3x NIN, so keeping them next to NIN macros would mix two sources; Hao approved the loss. The ASEAN generic "Ốc" (PhilFCT G129) is within 20 % of NIN 8041 and stays.

**Reverted: Cá hồi** (`87c8e2f8`, `usda_foundation` / `food-ca-hoi`, 208 / 20.4 / 13.4). NIN 8011 (136 / 22 / 5.3) would have dropped omega3 2.5, epa 0.9, dha 1.4, b12 3.2; salmon sold in Vietnam is mostly farmed Atlantic, so the USDA numbers are the closer ones. The row is an exact copy of "Cá hồi (Atlantic, nuôi)" (FDC 175167): **merge them later** (one of the two to be archived once nothing reads either key).

**Deferred: Bún chả Hà Nội ×2 and Phở gà.** NIN 15034 / 15067 are the same dishes and the rows are far above them (kcal +36 % and +7 %, +44 %), but each dish recipe adds up to the old row total, so the fix goes with the dish-recipes retune. Their records are in the held file; each also loses sodium (and potassium for Phở gà), so the retune needs the no-loss rule too.

## 2. The no-loss rule and its check

`cmd/importfoods` upserts with `per_100g_nutrients = EXCLUDED.per_100g`, the whole map. A record that leaves out a nutrient the live row has therefore deletes it. Rule: **a fix may not drop a nutrient the row has today unless the old value is shown wrong.**

`docs/data/protein-audit-2026-10-23-noloss.py` compares each record with its snapshot row (found by key, or through the `UPDATE … SET source, source_id … WHERE id` lines of the source-fix SQL) and exits 1 on any loss that is not listed, with a reason, in `protein-audit-2026-10-23-noloss-allow.json`. Run it from the repo root:

```bash
python3 docs/data/protein-audit-2026-10-23-noloss.py food-research/live-1023/all.json docs/data/protein-audit-2026-10-23.json docs/data/protein-audit-2026-10-23-source-fix.sql --allow docs/data/protein-audit-2026-10-23-noloss-allow.json --list
```

```
ok       usda_sr_legacy|FDC 171779 (Thịt bò nạc): lost 0, new 24
ok       usda_sr_legacy|FDC 171077:uc-ga-phi-le (Ức gà phi lê): lost 0, new 23
ok       vn_nin|NIN 3025 (Đậu hũ trắng): lost 0, new 16
ALLOWED  vn_nin|NIN 3025002 (Tàu hủ trắng cứng (hấp/luộc)): lost 4, new 0
           lost b12 = 0  [allowed]
           lost cholesterol = 0  [allowed]
           lost trans_fat = 0  [allowed]
           lost vitamin_d = 0  [allowed]
ALLOWED  vn_nin|NIN 8037 (Hến): lost 9, new 2
           lost b1 = 0  [allowed]
           lost cholesterol = 65  [allowed]
           lost fiber = 0  [allowed]
           lost monounsaturated_fat = 0.17  [allowed]
           lost polyunsaturated_fat = 0.54  [allowed]
           lost saturated_fat = 0.18  [allowed]
           lost sugars = 0  [allowed]
           lost vitamin_a = 185  [allowed]
           lost vitamin_c = 0  [allowed]
RESULT: pass (no unlisted loss)
```

Result for the import file: **RESULT: pass (no unlisted loss)**, exit 0. The reasons are in the allow file. Run on the held file: 33 of the 33 held NIN records would lose nutrients (NIN prints fewer tracked nutrients than USDA), and 3 of the 3 deferred dish records lose sodium or potassium; the follow-up has to stay inside the rule (section 12).

## 3. Held: off by more than 20 % but not changed in this PR

Rule used: a row is **off** when kcal, protein or fat differs by more than 20 % from the same food in the same state in NIN (else USDA), **and** the gap is at least 10 kcal or 1 g per 100 g (the floor was approved). Rows over 20 % but under the floor are listed in section 5 as "small difference".

**35 rows are off but held.** Moving their source to `vn_nin` changes the key `source|source_id`, and the app reads that key in `apps/web/lib/data/raw-cooked-pairs.slim.json` (the Cân sống / Đã nấu chín switch, `lib/yield.ts`, `lib/food-twins.ts`) and in `lib/data/dish-recipes.slim.json` (the Thành phần of a dish). 160 of the 231 Đạm keys are in the pairs file and 39 in the recipes file. A data-only change would silently break those links. The proposed records are in `docs/data/protein-audit-2026-10-23-held-do-not-import.json` (35 held + 3 deferred dish records; importer format, dry-run passes at 73.2 % coverage; **do not import it**: it breaks the pairs, and several records lose nutrients). **Cut** says whether the NIN row is the same cut as the USDA row or only the nearest (only "same cut" rows move in the follow-up; 21 of 35).

| Row (id) | key now | Dependency | Before kcal / P / F | NIN match | Cut | After | Δ now vs NIN (kcal/P/F/C/fib %) | Lost / new if moved |
|---|---|---|---|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | `usda_sr_legacy\|FDC 167812` | raw/cooked pair | 518 / 9.34 / 53.01 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | nearest: USDA pork belly vs NIN 7018 "nửa nạc nửa mỡ" (lean and fat, 21.5 g fat): not belly | 260 / 16.5 / 21.5 | +99/-43/+147/–/– | lost 7 (b12 0.84, carbs 0, cholesterol 72, fiber 0, sugars 0, vitamin_e 0.39, vitamin_k 0) · new 0 |
| Cá chép (sống) (`1059c25a`) | `usda_sr_legacy\|FDC 171952` | raw/cooked pair | 127 / 17.83 / 5.6 | NIN 8003 Cá chép, tươi | same cut | 96 / 16 / 3.6 | +32/+11/+56/–/– | lost 6 (b12 1.53, carbs 0, cholesterol 66, fiber 0, sugars 0, vitamin_c 1.6) · new 0 |
| Cá diêu hồng (sống) (`3063ec03`) | `usda_sr_legacy\|FDC 175176:ca-dieu-hong-song` | raw/cooked pair | 96 / 20.08 / 1.7 | NIN 8062 Cá điêu hồng | nearest: NIN row has no stated state | 111 / 17.1 / 3.3 | -14/+17/-48/-100/– | lost 20 (b12 1.58, b3 3.903, b5 0.487, b6 0.162, cholesterol 50, copper 0.075, fiber 0, folate 24, magnesium 27, manganese 0.037, monounsaturated_fat 0.498, polyunsaturated_fat 0.363, potassium 302, saturated_fat 0.585, selenium 41.8, sodium 52, sugars 0, vitamin_c 0, vitamin_d 3.1, vitamin_k 1.4) · new 0 |
| Cá ngừ tươi (sống) (`1ac93144`) | `usda_sr_legacy\|FDC 175159` | raw/cooked pair | 109 / 24.4 / 0.49 | NIN 8019 Cá ngừ, tươi | nearest: USDA yellowfin vs NIN generic tuna | 87 / 21 / 0.3 | +25/+16/+63/–/– | lost 7 (b12 2.08, carbs 0, cholesterol 39, fiber 0, sugars 0, trans_fat 0.016, vitamin_d 1.7) · new 0 |
| Cá nục (sống) (`baa7ce9f`) | `usda_sr_legacy\|FDC 173672` | raw/cooked pair | 158 / 20.07 / 7.89 | NIN 8020 Cá nục, tươi | nearest: USDA jack / Pacific mackerel vs NIN "cá nục" (listed as anchovy) | 111 / 20.2 / 3.3 | +42/-1/+139/–/– | lost 7 (b12 4.4, carbs 0, cholesterol 47, fiber 0, sugars 0, vitamin_c 2, vitamin_d 9.1) · new 0 |
| Cá thu (sống) (`5ec507be`) | `usda_sr_legacy\|FDC 173673` | raw/cooked pair | 139 / 19.29 / 6.3 | NIN 8026 Cá thu, tươi | nearest: USDA Spanish mackerel vs NIN mackerel / kingfish | 166 / 18.2 / 10.3 | -16/+6/-39/–/– | lost 15 (b12 2.4, b5 0.75, b6 0.4, carbs 0, cholesterol 76, fiber 0, folate 1, manganese 0.014, selenium 36.5, sugars 0, vitamin_c 1.6, vitamin_d 7.3, vitamin_e 0.69, vitamin_k 0.1, zinc 0.49) · new 0 |
| Cật bò (hầm) (`6f4dabb9`) | `usda_sr_legacy\|FDC 169450` | raw/cooked pair | 158 / 27.27 / 4.65 | NIN 7029002 Bầu dục bò, luộc | same cut | 91 / 16.89 / 2.43 | +74/+61/+91/-100/– | lost 3 (fiber 0, sugars 0, vitamin_k 0) · new 0 |
| Cật bò (sống) (`65b1a772`) | `usda_sr_legacy\|FDC 169449` | raw/cooked pair | 99 / 17.4 / 3.09 | NIN 7029 Bầu dục bò, tươi | same cut | 67 / 12.5 / 1.8 | +48/+39/+72/-3/– | lost 6 (b12 27.5, cholesterol 411, fiber 0, sugars 0, trans_fat 0.1, vitamin_k 0) · new 0 |
| Cật heo (nấu chín) (`b5d44a63`) | `usda_sr_legacy\|FDC 167860` | raw/cooked pair | 151 / 25.4 / 4.7 | NIN 7030002 Bầu dục lợn, luộc | same cut | 110 / 17.57 / 4.19 | +37/+45/+12/-100/– | lost 1 (fiber 0) · new 0 |
| Cật heo (sống) (`1bd282d5`) | `usda_sr_legacy\|FDC 168270` | raw/cooked pair | 100 / 16.46 / 3.25 | NIN 7030 Bầu dục lợn, tươi | same cut | 81 / 13 / 3.1 | +23/+27/+5/-100/– | lost 3 (b12 8.49, cholesterol 319, fiber 0) · new 0 |
| Chân giò heo (sống) (`c6950aa7`) | `usda_sr_legacy\|FDC 168226` | raw/cooked pair | 193 / 19.87 / 11.96 | NIN 7032 Chân giò lợn, tươi | nearest: USDA ham shank half vs NIN "chân giò" (leg) | 230 / 15.7 / 18.6 | -16/+27/-36/–/– | lost 9 (b12 0.54, carbs 0, cholesterol 67, fiber 0, sugars 0, trans_fat 0.095, vitamin_d 0.5, vitamin_e 0.31, vitamin_k 0) · new 0 |
| Đậu hũ (đậu phụ trắng) (`49999be4`) | `usda_sr_legacy\|FDC 172476` | dish recipe | 76 / 8.08 / 4.78 | NIN 3025 Đậu phụ, sống | same cut | 97 / 10.9 / 5.4 | -22/-26/-11/+70/-25 | lost 7 (b12 0, cholesterol 0, sugars 0.62, trans_fat 0, vitamin_d 0, vitamin_e 0.01, vitamin_k 2.4) · new 0 |
| Đậu trắng (hạt khô) (`bcd82617`) | `usda_sr_legacy\|FDC 175202` | raw/cooked pair | 333 / 23.36 / 0.85 | NIN 3008 Đậu trắng (đậu tây), hạt, khô | same cut | 341 / 23.2 / 2.1 | -2/+1/-60/+5/+322 | lost 12 (b12 0, cholesterol 0, copper 0.984, magnesium 190, manganese 1.796, potassium 1795, selenium 12.8, sodium 16, sugars 2.11, trans_fat 0, vitamin_d 0, zinc 3.67) · new 0 |
| Đậu xanh (hạt khô) (`0e027e38`) | `usda_sr_legacy\|FDC 174256` | raw/cooked pair | 347 / 23.86 / 1.15 | NIN 3010 Đậu xanh (đậu tắt), hạt, khô | same cut | 346 / 23.4 / 2.4 | +0/+2/-52/+8/+247 | lost 7 (b12 0, cholesterol 0, manganese 1.035, selenium 8.2, sugars 6.6, trans_fat 0, vitamin_d 0) · new 0 |
| Gà ta (sống) (`c9c2e282`) | `usda_sr_legacy\|FDC 172400` | raw/cooked pair | 258 / 17.55 / 20.33 | NIN 7013 Thịt gà ta, tươi | nearest: USDA stewing hen meat and skin vs NIN "average meat" | 199 / 20.3 / 13.1 | +30/-14/+55/–/– | lost 5 (b12 0.32, carbs 0, cholesterol 71, fiber 0, sugars 0) · new 0 |
| Gan bò (sống) (`28431e98`) | `usda_sr_legacy\|FDC 169451` | raw/cooked pair | 135 / 20.4 / 3.63 | NIN 7039 Gan bò, tươi | same cut | 110 / 17.4 / 3.1 | +23/+17/+17/+30/– | lost 6 (alcohol 0, b12 59.3, cholesterol 275, fiber 0, sugars 0, trans_fat 0.17) · new 0 |
| Gan gà (nấu chín) (`fdd32845`) | `usda_sr_legacy\|FDC 171061` | raw/cooked pair | 167 / 24.5 / 6.51 | NIN 7040002 Gan gà, luộc | same cut | 155 / 25.28 / 4.72 | +8/-3/+38/-69/– | lost 5 (alcohol 0, fiber 0, sugars 0, vitamin_d 0, vitamin_k 0) · new 0 |
| Gan gà (sống) (`8c393043`) | `usda_sr_legacy\|FDC 171060` | raw/cooked pair | 119 / 16.9 / 4.83 | NIN 7040 Gan gà, tươi | same cut | 111 / 18.2 / 3.4 | +7/-7/+42/-64/– | lost 8 (alcohol 0, b12 16.6, cholesterol 345, fiber 0, sugars 0, trans_fat 0.065, vitamin_d 0, vitamin_k 0) · new 0 |
| Lưỡi bò (hầm) (`7081686c`) | `usda_sr_legacy\|FDC 170598` | raw/cooked pair | 284 / 19.29 / 22.3 | NIN 7044002 Lưỡi bò, luộc | same cut | 234 / 19.43 / 17.29 | +21/-1/+29/-100/– | lost 7 (fiber 0, sugars 0, trans_fat 0.84, vitamin_a 0, vitamin_d 0.4, vitamin_e 0.3, vitamin_k 1.2) · new 0 |
| Lưỡi bò (sống) (`f8021f1d`) | `usda_sr_legacy\|FDC 170196` | raw/cooked pair | 224 / 14.9 / 16.09 | NIN 7044 Lưỡi bò, tươi | same cut | 164 / 13.6 / 12.1 | +37/+10/+33/+1740/– | lost 4 (b12 3.79, cholesterol 87, fiber 0, vitamin_a 0) · new 0 |
| Mề gà (luộc) (`a949808e`) | `usda_sr_legacy\|FDC 171457` | raw/cooked pair | 154 / 30.39 / 2.68 | NIN 7048002 Mề gà, luộc | same cut | 127 / 27.31 / 1.67 | +21/+11/+60/-100/– | lost 4 (fiber 0, sugars 0, vitamin_d 0, vitamin_k 0) · new 0 |
| Nạc vai heo (nấu chín) (`606b5bbc`) | `usda_sr_legacy\|FDC 167846` | raw/cooked pair, dish recipe | 230 / 25.33 / 13.54 | NIN 7083002 Thịt lợn nạc vai, luộc | same cut | 126 / 17.65 / 6.18 | +83/+44/+119/–/– | lost 21 (b12 0.86, b3 4.26, b5 0.651, b6 0.317, carbs 0, cholesterol 90, copper 0.124, fiber 0, folate 5, magnesium 20, manganese 0.026, monounsaturated_fat 6.17, polyunsaturated_fat 1.25, potassium 346, saturated_fat 4.79, selenium 37.4, sodium 75, sugars 0, vitamin_c 0.6, vitamin_d 1, vitamin_k 0) · new 0 |
| Sườn non heo (sống) (`cd142e49`) | `usda_sr_legacy\|FDC 167853` | raw/cooked pair | 277 / 15.47 / 23.4 | NIN 7053 Sườn lợn, tươi | nearest: USDA spareribs vs NIN 7053 "sườn lợn": same cut? (bone and fat share unknown) | 187 / 17.9 / 12.8 | +48/-14/+83/–/– | lost 9 (b12 0.38, carbs 0, cholesterol 80, fiber 0, sugars 0, trans_fat 0.222, vitamin_a 0, vitamin_c 0, vitamin_k 0) · new 0 |
| Thăn ngoại bò (sống) (`e0bfb3e9`) | `usda_sr_legacy\|FDC 171814` | raw/cooked pair | 138 / 22.93 / 5.15 | NIN 7005 Thịt bò, lưng, nạc, tươi | same cut | 121 / 23.07 / 3.16 | +14/-1/+63/-100/– | lost 6 (b12 1.13, cholesterol 53, fiber 0, sugars 0, vitamin_a 0, vitamin_c 0) · new 0 |
| Thịt dê (sống) (`f3973d66`) | `usda_sr_legacy\|FDC 175303` | raw/cooked pair | 109 / 20.6 / 2.31 | NIN 7011 Thịt dê, nạc, tươi | nearest: USDA goat vs NIN goat lean meat | 122 / 20.7 / 4.3 | -11/+0/-46/–/– | lost 4 (b12 1.13, carbs 0, cholesterol 57, fiber 0) · new 0 |
| Thịt heo nạc (thăn) nấu chín (`df249c8d`) | `usda_sr_legacy\|FDC 168250` | raw/cooked pair, dish recipe | 143 / 26.2 / 3.51 | NIN 7085002 Thịt lợn nạc thăn, luộc | same cut | 100 / 19.49 / 2.46 | +43/+34/+43/-100/– | lost 23 (b12 0.57, b3 7.43, b5 1.01, b6 0.74, cholesterol 73, copper 0.11, fiber 0, folate 0, magnesium 29, manganese 0.013, monounsaturated_fat 1.33, polyunsaturated_fat 0.51, potassium 421, saturated_fat 1.2, selenium 38.2, sodium 57, sugars 0, trans_fat 0.033, vitamin_a 0, vitamin_c 0, vitamin_d 0.2, vitamin_e 0.08, vitamin_k 0) · new 0 |
| Tim bò (hầm) (`9b52d79e`) | `usda_sr_legacy\|FDC 169448` | raw/cooked pair | 165 / 28.48 / 4.73 | NIN 7055002 Tim bò, luộc | same cut | 131 / 22.06 / 4.41 | +26/+29/+7/-83/– | lost 4 (fiber 0, sugars 0, vitamin_d 0.1, vitamin_k 0.5) · new 0 |
| Tim bò (sống) (`6e406d98`) | `usda_sr_legacy\|FDC 168625` | raw/cooked pair | 112 / 17.72 / 3.94 | NIN 7055 Tim bò, tươi | same cut | 89 / 15 / 3 | +26/+18/+31/-77/– | lost 6 (b12 8.55, cholesterol 124, fiber 0, sugars 0, trans_fat 0.18, vitamin_k 0) · new 0 |
| Tim gà (sống) (`6019bf63`) | `usda_sr_legacy\|FDC 171458` | raw/cooked pair | 153 / 15.55 / 9.33 | NIN 7056 Tim gà, tươi | same cut | 114 / 16 / 5.5 | +34/-3/+70/–/– | lost 4 (b12 7.29, carbs 0.71, cholesterol 136, fiber 0) · new 0 |
| Tim heo (sống) (`d5be8d10`) | `usda_sr_legacy\|FDC 168267` | raw/cooked pair | 118 / 17.27 / 4.36 | NIN 7057 Tim lợn, tươi | same cut | 94 / 15.1 / 3.2 | +26/+14/+36/+11/– | lost 5 (b12 3.79, cholesterol 131, fiber 0, sugars 0, vitamin_e 0.63) · new 0 |
| Tôm (`1c6a0a1a`) | `usda_sr_legacy\|FDC 174210` | raw/cooked pair | 71 / 13.6 / 1.01 | NIN 8051 Tôm biển, tươi | nearest: USDA mixed species vs NIN sea shrimp | 82 / 17.6 / 0.9 | -13/-23/+12/+1/– | lost 7 (b12 1.11, cholesterol 126, fiber 0, sugars 0, trans_fat 0.018, vitamin_c 0, vitamin_k 0.3) · new 0 |
| Tôm luộc (`246422a6`) | `usda_sr_legacy\|FDC 171971` | raw/cooked pair, dish recipe | 119 / 22.8 / 1.7 | NIN 8051002 Tôm biển, luộc | nearest: USDA mixed species vs NIN sea shrimp | 82 / 17.6 / 0.9 | +45/+30/+89/+69/– | lost 5 (fiber 0, sugars 0, trans_fat 0.035, vitamin_c 0, vitamin_k 0.4) · new 0 |
| Tôm thẻ (luộc) (`03e8249c`) | `usda_sr_legacy\|FDC 171971:tom-the-luoc` | raw/cooked pair | 119 / 22.78 / 1.7 | NIN 8051002 Tôm biển, luộc | nearest: USDA mixed species vs NIN sea shrimp | 82 / 17.6 / 0.9 | +45/+29/+89/+69/– | lost 5 (fiber 0, sugars 0, trans_fat 0.035, vitamin_c 0, vitamin_k 0.4) · new 0 |
| Tôm thẻ (tôm chân trắng) (`574722b9`) | `usda_sr_legacy\|FDC 174210:tom-the-song` | raw/cooked pair | 71 / 13.61 / 1.01 | NIN 8051 Tôm biển, tươi | nearest: USDA mixed species vs NIN sea shrimp | 82 / 17.6 / 0.9 | -13/-23/+12/+1/– | lost 7 (b12 1.11, cholesterol 126, fiber 0, sugars 0, trans_fat 0.018, vitamin_c 0, vitamin_k 0.3) · new 0 |
| Ức gà (`74e55541`) | `usda_sr_legacy\|FDC 171077` | raw/cooked pair | 120 / 22.5 / 2.62 | NIN 7089 Thịt gà công nghiệp, lườn, raw | nearest: USDA skinless boneless vs NIN breast (skin status unknown) | 134 / 22.86 / 4.68 | -10/-2/-44/–/– | lost 23 (b1 0.094, b12 0.21, b3 9.6, b5 1.5, b6 0.81, carbs 0, cholesterol 73, copper 0.037, fiber 0, folate 9, magnesium 28, manganese 0.011, monounsaturated_fat 0.69, polyunsaturated_fat 0.42, potassium 334, saturated_fat 0.56, selenium 22.8, sodium 45, sugars 0, trans_fat 0.007, vitamin_c 0, vitamin_d 0, vitamin_k 0) · new 0 |

**The held file cannot be imported as it stands for another reason:** Tôm and Tôm thẻ (tôm chân trắng) would both become `NIN 8051` (Tôm biển, tươi); Tôm luộc and Tôm thẻ (luộc) would both become `NIN 8051002` (Tôm biển, luộc). The unique key allows one row, so one of each pair has to be archived first (they are exact copies of each other today).

Not in the held file, each for a reason:

- **Cá nục (nấu chín)** (`6a8848b1`, `usda_sr_legacy|FDC 171994`): the live row `vn_nin` / `NIN 8020002` already exists (Cá nục (luộc)), so the key cannot move (unique index). It is a duplicate of that row with other numbers (+51/+6/+154/–/– % now vs NIN), and the key is read by the pairs file. Archive it together with the pairs follow-up.
- **Ghẹ (sống)** (`a89b26ea`, `usda_sr_legacy|FDC 174204`): the live row `vn_nin` / `NIN 8035` already exists (Ghẹ), so the key cannot move (unique index). It is a duplicate of that row with other numbers (+61/+52/+54/–/– % now vs NIN), and the key is read by the pairs file. Archive it together with the pairs follow-up.
- **Lươn** (`f5feb98b`, `usda_sr_legacy|FDC 174193`): NIN 8038 Lươn tươi gives 1.5 g fat for eel; eel is a fatty fish (USDA 11.7 g). Looks like a NIN print error, as with the sweet-potato Mg on 20/10. Not changed; Hao decides. (Hao: leave alone.)

## 4. How each row was checked

Data rule (prompt `prompts/data-seed-audit-1023.md`): nothing estimated; generic foods NIN → USDA → label → recipe_calc; a branded product uses its own label first; raw state for meat and fish unless the name says cooked. Fix rule: more than 20 % off on kcal, protein or fat, or the wrong state or cut; every fixed row gets a real source and a before / after; a fix may not lose a tracked nutrient (section 2).

1. **Source id exists and matches the name.** Every `FDC n` in `dam` was looked up in the local USDA copies (SR Legacy 2018-04, Foundation 2026-04-30) and every `NIN n` in the NIN snapshot (853 foods): all exist, and **all 222 rows with an FDC or NIN id equal their source row** (energy, protein, fat, carbs, fiber within 3 %), so none was edited after the import. The names against the USDA descriptions were read one by one; the mismatches are in the notes below.
2. **State.** The state words in the name (sống / tươi, chín / luộc / hấp / nướng / hầm) were compared with the source description. Only by-design cases differ (canned fish, "ốp la", "Edamame (luộc)" = USDA "prepared", processed Giò lụa) and one real one: Tàu hủ trắng cứng (hấp/luộc), fixed above.
3. **NIN first.** For each non-NIN row I looked for the same food in the same state in NIN (67 rows have one: the mapping is listed in section 5, column "Match"; a wrong pairing is a one-line veto). Where NIN has the species and state, NIN is the reference. Rows with no NIN row (most shellfish, many cuts, cooked fish) are compared with their own USDA row, which they equal.
4. **Plausibility.** kcal against 4P + 4C + 9F: **no row is more than 10 % off**. Protein ≤ 100 g: **none above** (highest: Tôm khô 75.6, Cá cơm cả xương (khô) 69, Mực khô 60.1). Rows with fat ≥ 10 g: 56; all are fatty by name or species (ba chỉ, sườn, xay, có da, gà ta, salmon, mackerel, herring, sardine, eel, tongue, eggs, soybean) except **Thịt bò nạc** (12 g, fixed), **Nạc vai heo (nấu chín)** (13.5 g under "nạc", held) and **Cá chim (nấu chín)** and **Cá nục (nấu chín)** (12.1 and 10.1 g, fatty fish, kept).
5. **Duplicates (same food twice).** Identical values: Cá diêu hồng = Cá rô phi (raw and cooked), Nghêu = Sò lông (raw and cooked), Tôm = Tôm thẻ (tôm chân trắng), Tôm luộc = Tôm thẻ (luộc), Cua biển (sống) = Thịt cua (NIN 8033 and 8069), Cá hồi = Cá hồi (Atlantic, nuôi) (kept, merge later), Đậu hũ trắng = Đậu hũ (đậu phụ trắng) (before the fix), Ức gà phi lê = Ức gà nướng (before the fix), and now Ức gà phi lê = Ức gà (FDC 171077). Other numbers: Trứng gà (food-trung-ga) and Trứng gà (sống) differ by 1 kcal; Cá nục (nấu chín) / Ghẹ (sống) / Mực against live NIN rows (section 3). Nothing was archived except Mực: the others are not wrong, they only repeat each other.
6. **Species proxies in NIN rows** (source_id with a `:slug`: Cá kèo → NIN 8010 goby, Cá linh → NIN 8032 mrigal carp, Sò huyết → NIN 8048 oyster, Tôm sú → NIN 8051 sea shrimp): kept as the earlier batches decided.
7. **Branded rows.** The Đạm category has **no branded or label rows**: its sources are `usda_sr_legacy` 167, `vn_nin` 54, `usda_foundation` 5, `asean` 3, `vn_table` 1, `recipe_calc` 1; no `label`. The only protein powder in the catalogue, "Whey Protein Isolate" (`food-whey-protein`), is in `bo_sung` and is a generic row with no brand; it is in the `food-%` list below (kcal +4 %, protein +2 %, fat 1 g against 1.56 g against USDA 173180). No label URL could be tied to it, so it is listed and not changed.
8. **Wrong species or cut, not fixable with a real source:** Cá lóc (nấu chín) is USDA northern pike (snakehead has no cooked row anywhere); Sò lông carries clam values (NIN 8081 looks dried); Thịt vịt bỏ da and Đùi gà bỏ da / Má đùi gà có da are compared with NIN rows whose skin status is not stated, so no cut verdict. These stay as they are.

## 5. Full checked list

Per 100 g, live 23/10: kcal | protein | fat | carbs | fiber. "Δ" is the live value against the match, in %, on the same five (– = the match has no value). "Checked, OK" means within 5 % on kcal, protein and fat or the same source row; "small difference (x %)" is the largest of those three, for rows under 20 % or under the floor.

| Row | Cat. | Key (source, source_id) | kcal | P | F | C | fib | Match | Δ kcal/P/F/C/fib | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Ba chỉ bò (sống) | dam | `usda_sr_legacy\|FDC 172158` | 187 | 20.38 | 11.71 | 0 | 0 | FDC 172158 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ba chỉ heo (sống) | dam | `usda_sr_legacy\|FDC 167812` | 518 | 9.34 | 53.01 | 0 | 0 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | +99/-43/+147/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Bào ngư (sống) | dam | `usda_sr_legacy\|FDC 174212` | 105 | 17.1 | 0.8 | 6 | 0 | FDC 174212 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bạch tuộc (luộc) | dam | `usda_sr_legacy\|FDC 174249` | 164 | 29.82 | 2.08 | 4.4 | 0 | FDC 174249 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bạch tuộc (sống) | dam | `usda_sr_legacy\|FDC 174218` | 82 | 14.91 | 1.04 | 2.2 | 0 | FDC 174218 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bắp bò (hầm) | dam | `usda_sr_legacy\|FDC 169442` | 201 | 33.68 | 6.36 | 0 | 0 | NIN 7094003 Thịt bò, bắp, hấp | +10/+4/+11/–/– | checked, small difference (up to 11 %) |
| Bắp bò (sống) | dam | `usda_sr_legacy\|FDC 169441` | 128 | 21.75 | 3.85 | 0 | 0 | NIN 7094 Thịt bò, bắp, sống | +5/+0/+0/–/– | checked, OK |
| Chim cút (nấu chín) | dam | `usda_sr_legacy\|FDC 169902` | 227 | 25.1 | 14.1 | 0 | 0 | FDC 169902 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Chim cút (sống) | dam | `usda_sr_legacy\|FDC 172418` | 192 | 19.63 | 12.05 | 0 | 0 | FDC 172418 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Chân giò heo (sống) | dam | `usda_sr_legacy\|FDC 168226` | 193 | 19.87 | 11.96 | 0 | 0 | NIN 7032 Chân giò lợn, tươi | -16/+27/-36/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Chân gà (luộc) | dam | `usda_sr_legacy\|FDC 171119` | 215 | 19.4 | 14.6 | 0.2 | 0 | FDC 171119 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cua biển (hấp) | dam | `usda_sr_legacy\|FDC 172007` | 110 | 22.32 | 1.24 | 0.95 | 0 | FDC 172007 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cua biển (sống) | dam | `vn_nin\|NIN 8033` | 103 | 17.5 | 0.6 | 7 | – | NIN 8033 (same NIN row) | 0 (same row) | checked, OK — Identical to "Thịt cua" (NIN 8069): same food twice. |
| Cua đồng | dam | `vn_nin\|NIN 8034` | 87 | 12.3 | 3.3 | 2 | – | NIN 8034 (same NIN row) | 0 (same row) | checked, OK |
| Cá basa / cá tra | dam | `usda_sr_legacy\|FDC 175165` | 119 | 15.2 | 5.94 | 0 | 0 | FDC 175165 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá basa / cá tra nấu chín | dam | `usda_sr_legacy\|FDC 175166` | 144 | 18.4 | 7.19 | 0 | 0 | FDC 175166 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá bơn (chín) | dam | `usda_sr_legacy\|FDC 174197` | 86 | 15.2 | 2.4 | 0 | 0 | FDC 174197 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá bơn (sống) | dam | `usda_sr_legacy\|FDC 174196` | 70 | 12.4 | 1.9 | 0 | 0 | FDC 174196 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá bống | dam | `vn_nin\|NIN 8001` | 70 | 15.8 | 0.8 | 0 | – | NIN 8001 (same NIN row) | 0 (same row) | checked, OK |
| Cá cam (chín) | dam | `usda_sr_legacy\|FDC 174248` | 187 | 29.7 | 6.7 | 0 | 0 | FDC 174248 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá cam (sống) | dam | `usda_sr_legacy\|FDC 175163` | 146 | 23.1 | 5.2 | 0 | 0 | FDC 175163 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chim (nấu chín) | dam | `usda_sr_legacy\|FDC 173683` | 211 | 23.69 | 12.14 | 0 | 0 | FDC 173683 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chim (sống) | dam | `usda_sr_legacy\|FDC 173682` | 164 | 18.48 | 9.47 | 0 | 0 | FDC 173682 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chép (nấu chín) | dam | `usda_sr_legacy\|FDC 174185` | 162 | 22.86 | 7.17 | 0 | 0 | FDC 174185 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chép (sống) | dam | `usda_sr_legacy\|FDC 171952` | 127 | 17.83 | 5.6 | 0 | 0 | NIN 8003 Cá chép, tươi | +32/+11/+56/–/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Cá chạch | dam | `vn_nin\|NIN 8028` | 110 | 20.4 | 3.2 | 0 | – | NIN 8028 (same NIN row) | 0 (same row) | checked, OK |
| Cá chẽm (chín) | dam | `usda_sr_legacy\|FDC 173694` | 124 | 23.6 | 2.6 | 0 | 0 | FDC 173694 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chẽm (sống) | dam | `usda_sr_legacy\|FDC 175142` | 97 | 18.4 | 2 | 0 | 0 | FDC 175142 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá cơm cả xương (khô) | dam | `asean\|PhilFCT G150` | 318 | 69 | 4.7 | 0 | 0 | – | – | listed, no NIN/USDA row to compare |
| Cá cơm cả xương (tươi) | dam | `usda_sr_legacy\|FDC 174182` | 131 | 20.4 | 4.84 | 0 | 0 | FDC 174182 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá diêu hồng (nấu chín) | dam | `usda_sr_legacy\|FDC 175177:ca-dieu-hong-chin` | 128 | 26.15 | 2.65 | 0 | 0 | FDC 175177 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to "Cá rô phi (nấu chín)"; NIN 8062 Cá điêu hồng (111 kcal, 17.1 P) is raw only. |
| Cá diêu hồng (sống) | dam | `usda_sr_legacy\|FDC 175176:ca-dieu-hong-song` | 96 | 20.08 | 1.7 | 0 | 0 | NIN 8062 Cá điêu hồng | -14/+17/-48/-100/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Cá diếc (sống) | dam | `vn_nin\|NIN 8006` | 87 | 17.7 | 1.8 | 0 | – | NIN 8006 (same NIN row) | 0 (same row) | checked, OK |
| Cá hồi | dam | `usda_foundation\|food-ca-hoi` | 208 | 20.4 | 13.4 | 0 | 0 | NIN 8011 Cá hồi, tươi | +53/-7/+153/–/– | REVERTED (off vs NIN, but kept): NIN 8011 would drop omega3 / epa / dha / b12 and Hao prefers the farmed Atlantic USDA row for salmon sold in Vietnam — Exact copy of "Cá hồi (Atlantic, nuôi)" (FDC 175167): merge the two later. Salmon sold in Vietnam is mostly farmed Atlantic, so the USDA numbers stay. |
| Cá hồi (Atlantic, nuôi) | dam | `usda_sr_legacy\|FDC 175167` | 208 | 20.4 | 13.4 | 0 | 0 | FDC 175167 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Exact copy of the generic "Cá hồi" row (`food-ca-hoi`): merge the two later. |
| Cá hồi (Atlantic, nuôi) nấu chín | dam | `usda_sr_legacy\|FDC 175168` | 206 | 22.1 | 12.3 | 0 | 0 | FDC 175168 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá hồi hoang sockeye (nấu chín) | dam | `usda_sr_legacy\|FDC 173692` | 156 | 26.48 | 5.57 | 0 | 0 | FDC 173692 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá hồi hoang sockeye (sống) | dam | `usda_sr_legacy\|FDC 173691` | 131 | 22.25 | 4.69 | 0 | 0 | FDC 173691 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá hồng (chín) | dam | `usda_sr_legacy\|FDC 173699` | 128 | 26.3 | 1.7 | 0 | 0 | FDC 173699 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá hồng (sống) | dam | `usda_sr_legacy\|FDC 173698` | 100 | 20.5 | 1.3 | 0 | 0 | FDC 173698 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá khô (chim, thu, nục, đé) | dam | `vn_nin\|NIN 8012` | 208 | 43.3 | 3.9 | 0 | – | NIN 8012 (same NIN row) | 0 (same row) | checked, OK |
| Cá kiếm (chín) | dam | `usda_sr_legacy\|FDC 173704` | 172 | 23.4 | 7.9 | 0 | 0 | FDC 173704 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá kiếm (sống) | dam | `usda_sr_legacy\|FDC 173703` | 144 | 19.7 | 6.7 | 0 | 0 | FDC 173703 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá kèo | dam | `vn_nin\|NIN 8010:ca-keo-song` | 98 | 20.1 | 2 | 0 | – | NIN 8010:ca-keo-song (same NIN row) | 0 (same row) | checked, OK |
| Cá linh | dam | `vn_nin\|NIN 8032:ca-linh-song` | 127 | 18.8 | 5.7 | 0 | – | NIN 8032:ca-linh-song (same NIN row) | 0 (same row) | checked, OK |
| Cá lóc (cá quả, sống) | dam | `vn_nin\|NIN 8022` | 97 | 18.2 | 2.7 | 0 | – | NIN 8022 (same NIN row) | 0 (same row) | checked, OK |
| Cá lóc (nấu chín) | dam | `usda_sr_legacy\|FDC 175127` | 113 | 24.69 | 0.88 | 0 | 0 | FDC 175127 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — USDA row is northern pike, not snakehead (cá lóc). NIN has snakehead raw only (8022); no cooked NIN/USDA snakehead exists. Species mismatch, not changed. |
| Cá mè | dam | `vn_nin\|NIN 8014` | 144 | 15.4 | 9.1 | 0 | – | NIN 8014 (same NIN row) | 0 (same row) | checked, OK |
| Cá mòi (tươi) | dam | `vn_nin\|NIN 8015` | 124 | 17.5 | 6 | 0 | – | NIN 8015 (same NIN row) | 0 (same row) | checked, OK |
| Cá mòi đóng hộp (ngâm dầu, cả xương) | dam | `usda_sr_legacy\|FDC 175139` | 208 | 24.62 | 11.45 | 0 | 0 | FDC 175139 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá mòi đóng hộp (sốt cà chua, cả xương) | dam | `usda_sr_legacy\|FDC 175140` | 185 | 20.86 | 10.45 | 0.54 | 0.1 | FDC 175140 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá mú (chín) | dam | `usda_sr_legacy\|FDC 171963` | 118 | 24.8 | 1.3 | 0 | 0 | FDC 171963 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá mú (sống) | dam | `usda_sr_legacy\|FDC 171962` | 92 | 19.4 | 1 | 0 | 0 | FDC 171962 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá măng (chín) | dam | `usda_sr_legacy\|FDC 171995` | 190 | 26.3 | 8.6 | 0 | 0 | FDC 171995 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá măng (sống) | dam | `usda_sr_legacy\|FDC 173675` | 148 | 20.5 | 6.7 | 0 | 0 | FDC 173675 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá mối (sống) | dam | `vn_nin\|NIN 8017` | 116 | 22.1 | 3.1 | 0 | – | NIN 8017 (same NIN row) | 0 (same row) | checked, OK |
| Cá ngừ tươi (nấu chín) | dam | `usda_sr_legacy\|FDC 172006` | 130 | 29.15 | 0.59 | 0 | 0 | FDC 172006 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá ngừ tươi (sống) | dam | `usda_sr_legacy\|FDC 175159` | 109 | 24.4 | 0.49 | 0 | 0 | NIN 8019 Cá ngừ, tươi | +25/+16/+63/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Cá ngừ vằn (chín) | dam | `usda_sr_legacy\|FDC 172005` | 132 | 28.2 | 1.3 | 0 | 0 | FDC 172005 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá ngừ vằn (sống) | dam | `usda_sr_legacy\|FDC 175156` | 103 | 22 | 1 | 0 | 0 | FDC 175156 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá ngừ đóng hộp | dam | `usda_foundation\|FDC 334194` | 90 | 19 | 0.94 | 0.08 | – | FDC 334194 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá nục (luộc) | dam | `vn_nin\|NIN 8020002` | 133 | 24.34 | 3.98 | 0 | – | NIN 8020002 (same NIN row) | 0 (same row) | checked, OK |
| Cá nục (nướng) | dam | `vn_nin\|NIN 8020014` | 138 | 25.25 | 4.13 | 0 | – | NIN 8020014 (same NIN row) | 0 (same row) | checked, OK |
| Cá nục (nấu chín) | dam | `usda_sr_legacy\|FDC 171994` | 201 | 25.73 | 10.12 | 0 | 0 | NIN 8020002 Cá nục, luộc | +51/+6/+154/–/– | HELD: duplicate of a live NIN row with other numbers |
| Cá nục (sống) | dam | `usda_sr_legacy\|FDC 173672` | 158 | 20.07 | 7.89 | 0 | 0 | NIN 8020 Cá nục, tươi | +42/-1/+139/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Cá phèn | dam | `vn_nin\|NIN 8021` | 104 | 15.9 | 4.5 | 0 | – | NIN 8021 (same NIN row) | 0 (same row) | checked, OK |
| Cá rô phi (nấu chín) | dam | `usda_sr_legacy\|FDC 175177` | 128 | 26.15 | 2.65 | 0 | 0 | FDC 175177 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to "Cá diêu hồng (nấu chín)"; NIN has only fried tilapia (8024008), a different state. |
| Cá rô phi (sống) | dam | `usda_sr_legacy\|FDC 175176` | 96 | 20.08 | 1.7 | 0 | 0 | NIN 8024 Cá rô phi, tươi | -4/+2/-26/–/– | checked, small difference (up to 26 %, under the 10 kcal / 1 g floor) |
| Cá rô đồng (sống) | dam | `vn_nin\|NIN 8023` | 126 | 19.1 | 5.5 | 0 | – | NIN 8023 (same NIN row) | 0 (same row) | checked, OK |
| Cá saba Na Uy (nướng) | dam | `usda_sr_legacy\|FDC 175120` | 262 | 23.85 | 17.81 | 0 | 0 | FDC 175120 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá saba Na Uy (sống) | dam | `usda_sr_legacy\|FDC 175119` | 205 | 18.6 | 13.89 | 0 | 0 | FDC 175119 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá thu (chín) | dam | `usda_sr_legacy\|FDC 173674` | 158 | 23.6 | 6.3 | 0 | 0 | FDC 173674 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá thu (sống) | dam | `usda_sr_legacy\|FDC 173673` | 139 | 19.29 | 6.3 | 0 | 0 | NIN 8026 Cá thu, tươi | -16/+6/-39/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Cá thát lát (cá lác) | dam | `vn_nin\|NIN 8013` | 71 | 16.7 | 0.5 | 0 | – | NIN 8013 (same NIN row) | 0 (same row) | checked, OK |
| Cá thát lát (luộc) | dam | `vn_nin\|NIN 8013002` | 86 | 20.12 | 0.6 | 0 | – | NIN 8013002 (same NIN row) | 0 (same row) | checked, OK |
| Cá trê | dam | `vn_nin\|NIN 8030` | 173 | 16.5 | 11.9 | 0 | – | NIN 8030 (same NIN row) | 0 (same row) | checked, OK |
| Cá trích (nấu chín) | dam | `usda_sr_legacy\|FDC 175117` | 203 | 23.03 | 11.59 | 0 | 0 | FDC 175117 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá trích (sống) | dam | `usda_sr_legacy\|FDC 175116` | 158 | 17.96 | 9.04 | 0 | 0 | NIN 8031 Cá trích, tươi | -5/+1/-15/–/– | checked, small difference (up to 15 %) |
| Cá trắm cỏ (cá trắm) | dam | `vn_nin\|NIN 8029` | 91 | 17 | 2.6 | 0 | – | NIN 8029 (same NIN row) | 0 (same row) | checked, OK |
| Cá đù (sống) | dam | `usda_sr_legacy\|FDC 174192` | 104 | 17.8 | 3.2 | 0 | 0 | FDC 174192 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá đối | dam | `vn_nin\|NIN 8009` | 108 | 19.5 | 3.3 | 0 | – | NIN 8009 (same NIN row) | 0 (same row) | checked, OK |
| Cánh gà (nướng) | dam | `usda_sr_legacy\|FDC 173630` | 254 | 23.79 | 16.87 | 0 | 0 | FDC 173630 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cánh gà (sống) | dam | `usda_sr_legacy\|FDC 172390` | 191 | 17.52 | 12.85 | 0 | 0 | NIN 7087 Thịt gà công nghiệp, cánh, tươi | +2/-8/+3/–/– | checked, small difference (up to 8 %) |
| Cật bò (hầm) | dam | `usda_sr_legacy\|FDC 169450` | 158 | 27.27 | 4.65 | 0 | 0 | NIN 7029002 Bầu dục bò, luộc | +74/+61/+91/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Cật bò (sống) | dam | `usda_sr_legacy\|FDC 169449` | 99 | 17.4 | 3.09 | 0.29 | 0 | NIN 7029 Bầu dục bò, tươi | +48/+39/+72/-3/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Cật heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167860` | 151 | 25.4 | 4.7 | 0 | 0 | NIN 7030002 Bầu dục lợn, luộc | +37/+45/+12/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Cật heo (sống) | dam | `usda_sr_legacy\|FDC 168270` | 100 | 16.46 | 3.25 | 0 | 0 | NIN 7030 Bầu dục lợn, tươi | +23/+27/+5/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Dạ dày heo (luộc) | dam | `vn_nin\|NIN 7034002` | 106 | 18.2 | 3.6 | 0 | 0 | NIN 7034002 (same NIN row) | 0 (same row) | checked, OK |
| Edamame (luộc) | dam | `usda_sr_legacy\|FDC 168411` | 121 | 11.91 | 5.2 | 8.91 | 5.2 | FDC 168411 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Edamame (đông lạnh, chưa nấu) | dam | `usda_sr_legacy\|FDC 168410` | 109 | 11.22 | 4.73 | 7.61 | 4.8 | FDC 168410 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gan bò (nấu chín) | dam | `usda_sr_legacy\|FDC 168626` | 191 | 29.1 | 5.26 | 5.13 | 0 | FDC 168626 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gan bò (sống) | dam | `usda_sr_legacy\|FDC 169451` | 135 | 20.4 | 3.63 | 3.89 | 0 | NIN 7039 Gan bò, tươi | +23/+17/+17/+30/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Gan gà (nấu chín) | dam | `usda_sr_legacy\|FDC 171061` | 167 | 24.5 | 6.51 | 0.87 | 0 | NIN 7040002 Gan gà, luộc | +8/-3/+38/-69/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Gan gà (sống) | dam | `usda_sr_legacy\|FDC 171060` | 119 | 16.9 | 4.83 | 0.73 | 0 | NIN 7040 Gan gà, tươi | +7/-7/+42/-64/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Gan heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167863` | 165 | 26 | 4.4 | 3.76 | 0 | NIN 7041002 Gan lợn, luộc | +10/+6/-6/+45/– | checked, small difference (up to 10 %) |
| Gan heo (sống) | dam | `usda_sr_legacy\|FDC 167862` | 134 | 21.4 | 3.65 | 2.47 | 0 | NIN 7041 Gan lợn, tươi | +16/+14/+1/+24/– | checked, small difference (up to 16 %) |
| Ghẹ | dam | `vn_nin\|NIN 8035` | 54 | 11.9 | 0.7 | 0 | – | NIN 8035 (same NIN row) | 0 (same row) | checked, OK |
| Ghẹ (hấp) | dam | `usda_sr_legacy\|FDC 174205` | 83 | 17.88 | 0.74 | 0 | 0 | FDC 174205 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ghẹ (sống) | dam | `usda_sr_legacy\|FDC 174204` | 87 | 18.06 | 1.08 | 0.04 | 0 | NIN 8035 Cua ghẹ, tươi | +61/+52/+54/–/– | HELD: duplicate of a live NIN row with other numbers |
| Giò lụa (chả lụa) | dam | `vn_nin\|NIN 7069` | 205 | 16.9 | 15 | 1.8 | – | NIN 7069 (same NIN row) | 0 (same row) | checked, OK |
| Gà nguyên con có da (nướng) | dam | `usda_sr_legacy\|FDC 171450` | 239 | 27.3 | 13.6 | 0 | 0 | FDC 171450 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà nguyên con có da (sống) | dam | `usda_sr_legacy\|FDC 171447` | 215 | 18.6 | 15.06 | 0 | 0 | FDC 171447 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà ta (luộc) | dam | `usda_sr_legacy\|FDC 172401` | 285 | 26.88 | 18.87 | 0 | 0 | FDC 172401 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà ta (sống) | dam | `usda_sr_legacy\|FDC 172400` | 258 | 17.55 | 20.33 | 0 | 0 | NIN 7013 Thịt gà ta, tươi | +30/-14/+55/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Hàu (hấp) | dam | `usda_sr_legacy\|FDC 174250` | 163 | 18.9 | 4.6 | 9.9 | 0 | FDC 174250 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Hàu (sống) | dam | `usda_sr_legacy\|FDC 174219` | 81 | 9.45 | 2.3 | 4.95 | 0 | FDC 174219 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Hải sâm | dam | `vn_nin\|NIN 8036` | 90 | 21.5 | 0.3 | 0.2 | – | NIN 8036 (same NIN row) | 0 (same row) | checked, OK |
| Hến | dam | `asean\|PhilFCT G020` | 105 | 8.9 | 1.9 | 13 | 0 | NIN 8037 Hến, tươi | +133/+98/+171/+155/– | FIXED in this PR |
| Lòng heo (ruột non, luộc) | dam | `vn_nin\|NIN 7047002` | 55 | 9 | 1.6 | 1 | – | NIN 7047002 (same NIN row) | 0 (same row) | checked, OK |
| Lòng trắng trứng gà | dam | `usda_sr_legacy\|FDC 172183` | 52 | 10.9 | 0.2 | 0.7 | 0 | NIN 9003 Lòng trắng trứng gà | +13/+6/+100/-30/– | checked, small difference (up to 100 %, under the 10 kcal / 1 g floor) |
| Lòng đỏ trứng gà | dam | `usda_sr_legacy\|FDC 172184` | 322 | 15.9 | 26.5 | 3.6 | 0 | NIN 9002 Lòng đỏ trứng gà | -2/+17/-11/+260/– | checked, small difference (up to 17 %) |
| Lươn | dam | `usda_sr_legacy\|FDC 174193` | 184 | 18.44 | 11.66 | 0 | 0 | NIN 8038 Lươn, tươi | +42/+0/+677/-100/– | DISPUTED: NIN looks wrong (Hao: leave) — DISPUTED: NIN 8038 gives 1.5 g fat for eel; eel is a fatty fish (USDA 11.7 g). Hao: leave alone. |
| Lươn (nướng) | dam | `usda_sr_legacy\|FDC 174194` | 236 | 23.65 | 14.95 | 0 | 0 | FDC 174194 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Lưỡi bò (hầm) | dam | `usda_sr_legacy\|FDC 170598` | 284 | 19.29 | 22.3 | 0 | 0 | NIN 7044002 Lưỡi bò, luộc | +21/-1/+29/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Lưỡi bò (sống) | dam | `usda_sr_legacy\|FDC 170196` | 224 | 14.9 | 16.09 | 3.68 | 0 | NIN 7044 Lưỡi bò, tươi | +37/+10/+33/+1740/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Miso | dam | `usda_sr_legacy\|FDC 172442` | 198 | 12.79 | 6.01 | 25.37 | 5.4 | FDC 172442 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Má đùi gà có da (nướng) | dam | `usda_sr_legacy\|FDC 173617` | 184 | 24.03 | 8.99 | 0 | 0 | FDC 173617 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Má đùi gà có da (sống) | dam | `usda_sr_legacy\|FDC 172378` | 214 | 16.37 | 15.95 | 0.17 | 0 | FDC 172378 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Mề gà (luộc) | dam | `usda_sr_legacy\|FDC 171457` | 154 | 30.39 | 2.68 | 0 | 0 | NIN 7048002 Mề gà, luộc | +21/+11/+60/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Mề gà (sống) | dam | `usda_sr_legacy\|FDC 171456` | 94 | 17.66 | 2.06 | 0 | 0 | NIN 7048 Mề gà, tươi | -5/-17/+58/-100/– | checked, small difference (up to 58 %, under the 10 kcal / 1 g floor) |
| Mực | dam | `usda_sr_legacy\|FDC 174223` | 92 | 15.6 | 1.38 | 3.08 | 0 | NIN 8040 Mực, tươi | +26/-4/+53/–/– | ARCHIVE in this PR (wrong duplicate of Mực ống, NIN 8040) |
| Mực khô | dam | `vn_nin\|NIN 8039` | 291 | 60.1 | 4.5 | 2.5 | – | NIN 8039 (same NIN row) | 0 (same row) | checked, OK |
| Mực ống | dam | `vn_nin\|NIN 8040` | 73 | 16.3 | 0.9 | 0 | – | NIN 8040 (same NIN row) | 0 (same row) | checked, OK |
| Mực ống (hấp) | dam | `vn_nin\|NIN 8040003` | 115 | 25.47 | 1.41 | 0 | – | NIN 8040003 (same NIN row) | 0 (same row) | checked, OK |
| Natto | dam | `usda_sr_legacy\|FDC 172443` | 211 | 19.4 | 11 | 12.68 | 5.4 | FDC 172443 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Nghêu (hấp) | dam | `usda_sr_legacy\|FDC 171975` | 148 | 25.6 | 1.95 | 5.13 | 0 | FDC 171975 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to the "Sò lông (hấp)" row. |
| Nghêu (sống) | dam | `usda_sr_legacy\|FDC 174214` | 86 | 14.7 | 0.96 | 3.57 | 0 | FDC 174214 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to the "Sò lông (sống)" row. |
| Nạc vai heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167846` | 230 | 25.33 | 13.54 | 0 | 0 | NIN 7083002 Thịt lợn nạc vai, luộc | +83/+44/+119/–/– | HELD (same cut): off >20 %, key used by the app (see Held) — Lean-fat check: name says nạc (lean) but fat is 13.5 g (USDA roasted shoulder, lean only as published). NIN lean shoulder boiled has 6.2 g. |
| Nạc vai heo (sống) | dam | `usda_sr_legacy\|FDC 167845` | 148 | 19.55 | 7.14 | 0 | 0 | NIN 7083 Thịt lợn, nạc vai, tươi | -1/-6/-2/–/– | checked, small difference (up to 6 %) |
| Nạm bò (hầm) | dam | `usda_sr_legacy\|FDC 174047` | 196 | 33.15 | 6 | 0 | 0 | FDC 174047 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Nạm bò (sống) | dam | `usda_sr_legacy\|FDC 174048` | 127 | 21.57 | 3.84 | 0 | 0 | FDC 174048 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ruốc thịt heo (chà bông) | dam | `vn_nin\|NIN 7074` | 369 | 46.6 | 20.3 | 0 | 0 | NIN 7074 (same NIN row) | 0 (same row) | checked, OK |
| Rươi | dam | `vn_nin\|NIN 8047` | 89 | 12.4 | 4.4 | 0 | – | NIN 8047 (same NIN row) | 0 (same row) | checked, OK |
| Rạm | dam | `vn_nin\|NIN 8046` | 77 | 12.9 | 2.8 | 0 | – | NIN 8046 (same NIN row) | 0 (same row) | checked, OK |
| Sò huyết | dam | `vn_nin\|NIN 8048:so-huyet-song` | 51 | 8.8 | 0.4 | 3 | – | NIN 8048:so-huyet-song (same NIN row) | 0 (same row) | checked, OK |
| Sò lông (hấp) | dam | `usda_sr_legacy\|FDC 171975:so-long-hap` | 148 | 25.55 | 1.95 | 5.13 | 0 | FDC 171975 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Sò lông (blood cockle) carries generic clam values, identical to "Nghêu (hấp)". NIN 8081 Sò lông (316 kcal, 54 P) looks like a dried value, so it is not used. |
| Sò lông (sống) | dam | `usda_sr_legacy\|FDC 174214:so-long-song` | 86 | 14.67 | 0.96 | 3.57 | 0 | FDC 174214 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Same as above: identical to "Nghêu (sống)"; NIN 8081 not usable. |
| Sò điệp (hấp) | dam | `usda_sr_legacy\|FDC 167742` | 111 | 20.54 | 0.84 | 5.41 | 0 | FDC 167742 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Sò điệp (sống) | dam | `usda_sr_legacy\|FDC 174220` | 69 | 12.06 | 0.49 | 3.18 | 0 | FDC 174220 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Sườn bò (hầm) | dam | `usda_sr_legacy\|FDC 168613` | 471 | 21.57 | 41.98 | 0 | 0 | FDC 168613 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Sườn bò (sống) | dam | `usda_sr_legacy\|FDC 169439` | 390 | 14.4 | 36.23 | 0.4 | 0 | FDC 169439 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Sườn non heo (hầm) | dam | `usda_sr_legacy\|FDC 167854` | 397 | 29.06 | 30.3 | 0 | 0 | FDC 167854 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Sườn non heo (sống) | dam | `usda_sr_legacy\|FDC 167853` | 277 | 15.47 | 23.4 | 0 | 0 | NIN 7053 Sườn lợn, tươi | +48/-14/+83/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Tempeh | dam | `usda_sr_legacy\|FDC 174272` | 192 | 20.29 | 10.8 | 7.64 | – | FDC 174272 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thăn ngoại bò (sống) | dam | `usda_sr_legacy\|FDC 171814` | 138 | 22.93 | 5.15 | 0 | 0 | NIN 7005 Thịt bò, lưng, nạc, tươi | +14/-1/+63/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Thăn ngoại bò (áp chảo/nướng) | dam | `usda_sr_legacy\|FDC 171813` | 189 | 29.3 | 7.09 | 0 | 0 | FDC 171813 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt ba chỉ heo (luộc) | dam | `vn_nin\|NIN 7018002` | 220 | 14 | 18.2 | 0 | 0 | NIN 7018002 (same NIN row) | 0 (same row) | checked, OK |
| Thịt ba chỉ heo (nướng) | dam | `vn_nin\|NIN 7086` | 401 | 20.5 | 35.2 | 0.6 | – | NIN 7086 (same NIN row) | 0 (same row) | checked, OK |
| Thịt bò khô | dam | `vn_nin\|NIN 7075` | 239 | 51 | 1.6 | 5.2 | – | NIN 7075 (same NIN row) | 0 (same row) | checked, OK |
| Thịt bò nạc | dam | `usda_foundation\|food-thit-bo-nac` | 213.33 | 26 | 12 | 0 | 0 | FDC 171779 | +64/+16/+164/–/– | FIXED in this PR |
| Thịt bò thăn (sống) | dam | `usda_sr_legacy\|FDC 171812` | 153 | 22.1 | 6.52 | 0 | 0 | FDC 171812 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò thăn (áp chảo/nướng) | dam | `usda_sr_legacy\|FDC 171811` | 200 | 29 | 8.39 | 0 | 0 | FDC 171811 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò xay (nấu chín) | dam | `usda_sr_legacy\|FDC 171794` | 230 | 28.4 | 12 | 0 | 0 | FDC 171794 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò xay (sống) | dam | `usda_sr_legacy\|FDC 174030` | 176 | 20 | 10 | 0 | 0 | FDC 174030 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt chân giò heo (luộc) | dam | `vn_nin\|NIN 7032002` | 230 | 15.7 | 18.6 | 0 | 0 | NIN 7032002 (same NIN row) | 0 (same row) | checked, OK |
| Thịt cua | dam | `vn_nin\|NIN 8069` | 103 | 17.5 | 0.6 | 7 | – | NIN 8069 (same NIN row) | 0 (same row) | checked, OK — Identical to "Cua biển (sống)" (NIN 8033): same food twice. |
| Thịt dê (nướng) | dam | `usda_sr_legacy\|FDC 175304` | 143 | 27.1 | 3.03 | 0 | 0 | FDC 175304 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt dê (sống) | dam | `usda_sr_legacy\|FDC 175303` | 109 | 20.6 | 2.31 | 0 | 0 | NIN 7011 Thịt dê, nạc, tươi | -11/+0/-46/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Thịt heo nạc (thăn) | dam | `usda_sr_legacy\|FDC 168249` | 109 | 20.9 | 2.17 | 0 | 0 | NIN 7085 Thịt lợn, nạc thăn, tươi | -8/-9/-25/-100/– | checked, small difference (up to 25 %, under the 10 kcal / 1 g floor) |
| Thịt heo nạc (thăn) nấu chín | dam | `usda_sr_legacy\|FDC 168250` | 143 | 26.2 | 3.51 | 0 | 0 | NIN 7085002 Thịt lợn nạc thăn, luộc | +43/+34/+43/-100/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Thịt heo xay (nấu chín) | dam | `usda_sr_legacy\|FDC 167903` | 297 | 25.69 | 20.77 | 0 | 0 | FDC 167903 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt heo xay (sống) | dam | `usda_sr_legacy\|FDC 167902` | 263 | 16.88 | 21.19 | 0 | 0 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | +1/+2/-1/–/– | checked, OK |
| Thịt vịt bỏ da (nướng) | dam | `usda_sr_legacy\|FDC 172411` | 201 | 23.48 | 11.2 | 0 | 0 | FDC 172411 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt vịt bỏ da (sống) | dam | `usda_sr_legacy\|FDC 172410` | 135 | 18.28 | 5.95 | 0.94 | 0 | FDC 172410 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt vịt có da (nướng) | dam | `usda_sr_legacy\|FDC 172409` | 337 | 19 | 28.4 | 0 | 0 | FDC 172409 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Tim bò (hầm) | dam | `usda_sr_legacy\|FDC 169448` | 165 | 28.48 | 4.73 | 0.15 | 0 | NIN 7055002 Tim bò, luộc | +26/+29/+7/-83/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Tim bò (sống) | dam | `usda_sr_legacy\|FDC 168625` | 112 | 17.72 | 3.94 | 0.14 | 0 | NIN 7055 Tim bò, tươi | +26/+18/+31/-77/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Tim gà (luộc) | dam | `usda_sr_legacy\|FDC 171059` | 185 | 26.41 | 7.92 | 0.1 | 0 | NIN 7056002 Tim gà, luộc | +16/+17/+2/–/– | checked, small difference (up to 17 %) |
| Tim gà (sống) | dam | `usda_sr_legacy\|FDC 171458` | 153 | 15.55 | 9.33 | 0.71 | 0 | NIN 7056 Tim gà, tươi | +34/-3/+70/–/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Tim heo (hầm) | dam | `usda_sr_legacy\|FDC 168268` | 148 | 23.6 | 5.05 | 0.4 | 0 | NIN 7057002 Tim lợn, luộc | +7/+6/+7/-77/– | checked, small difference (up to 7 %) |
| Tim heo (sống) | dam | `usda_sr_legacy\|FDC 168267` | 118 | 17.27 | 4.36 | 1.33 | 0 | NIN 7057 Tim lợn, tươi | +26/+14/+36/+11/– | HELD (same cut): off >20 %, key used by the app (see Held) |
| Tiết heo (luộc) | dam | `vn_nin\|NIN 7059` | 44 | 10.7 | 0.1 | 0 | 0 | NIN 7059 (same NIN row) | 0 (same row) | checked, OK |
| Trai sông (trai nước ngọt) | dam | `vn_nin\|NIN 8054` | 38 | 4.6 | 1.1 | 2.5 | – | NIN 8054 (same NIN row) | 0 (same row) | checked, OK |
| Trứng cút | dam | `usda_sr_legacy\|FDC 172191` | 158 | 13.1 | 11.1 | 0.4 | 0 | NIN 9007 Trứng chim cút | +1/+3/+6/-86/– | checked, small difference (up to 6 %) |
| Trứng gà | dam | `usda_foundation\|food-trung-ga` | 142 | 12.6 | 9.5 | 0.7 | 0 | NIN 9001 Trứng gà ta | -5/-3/-8/-44/– | checked, small difference (up to 8 %) |
| Trứng gà (sống) | dam | `usda_sr_legacy\|FDC 171287` | 143 | 12.6 | 9.5 | 0.7 | 0 | NIN 9001 Trứng gà ta | -5/-3/-8/-44/– | checked, small difference (up to 8 %) |
| Trứng gà chiên (đánh) | dam | `usda_sr_legacy\|FDC 172185` | 154 | 10.6 | 11.7 | 0.6 | 0 | FDC 172185 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Trứng gà luộc | dam | `usda_sr_legacy\|FDC 173424` | 155 | 12.6 | 10.6 | 1.1 | 0 | FDC 173424 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Trứng gà ốp la | dam | `usda_sr_legacy\|FDC 173423` | 196 | 13.6 | 14.8 | 0.8 | 0 | FDC 173423 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Trứng vịt | dam | `usda_sr_legacy\|FDC 172189` | 185 | 12.8 | 13.8 | 1.4 | 0 | NIN 9004 Trứng vịt | +8/-2/+15/-52/– | checked, small difference (up to 15 %) |
| Tu hài | dam | `vn_nin\|NIN 8094` | 42 | 5.37 | 0.44 | 4.03 | – | NIN 8094 (same NIN row) | 0 (same row) | checked, OK |
| Tàu hủ chiên nồi chiên không dầu | dam | `recipe_calc\|recipe:tau-hu-chien-noi-chien-khong-dau` | 199 | 23.9 | 12 | 3.83 | 3.17 | – | – | listed, no NIN/USDA row to compare |
| Tàu hủ trắng cứng (hấp/luộc) | dam | `usda_sr_legacy\|FDC 172475:tau-hu-trang-hap-luoc` | 144 | 17.3 | 8.72 | 2.78 | 2.3 | NIN 3025002 Đậu phụ luộc | +47/+57/+60/+150/+475 | FIXED in this PR |
| Tép (tép gạo) | dam | `vn_nin\|NIN 8049` | 58 | 11.7 | 1.2 | 0 | – | NIN 8049 (same NIN row) | 0 (same row) | checked, OK |
| Tép khô | dam | `vn_nin\|NIN 8050` | 269 | 59.8 | 3 | 0.7 | – | NIN 8050 (same NIN row) | 0 (same row) | checked, OK |
| Tôm | dam | `usda_sr_legacy\|FDC 174210` | 71 | 13.6 | 1.01 | 0.91 | 0 | NIN 8051 Tôm biển, tươi | -13/-23/+12/+1/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Tôm khô | dam | `vn_nin\|NIN 8053` | 347 | 75.6 | 3.8 | 2.5 | – | NIN 8053 (same NIN row) | 0 (same row) | checked, OK |
| Tôm luộc | dam | `usda_sr_legacy\|FDC 171971` | 119 | 22.8 | 1.7 | 1.52 | 0 | NIN 8051002 Tôm biển, luộc | +45/+30/+89/+69/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Tôm sú | dam | `vn_nin\|NIN 8051:tom-su-song` | 82 | 17.6 | 0.9 | 0.9 | – | NIN 8051:tom-su-song (same NIN row) | 0 (same row) | checked, OK |
| Tôm sú (nướng) | dam | `vn_nin\|NIN 8051014:tom-su-nuong` | 124 | 26.67 | 1.36 | 1.36 | – | NIN 8051014:tom-su-nuong (same NIN row) | 0 (same row) | checked, OK |
| Tôm thẻ (luộc) | dam | `usda_sr_legacy\|FDC 171971:tom-the-luoc` | 119 | 22.78 | 1.7 | 1.52 | 0 | NIN 8051002 Tôm biển, luộc | +45/+29/+89/+69/– | HELD (nearest): off >20 %, key used by the app (see Held) — Identical to the "Tôm luộc" row. |
| Tôm thẻ (tôm chân trắng) | dam | `usda_sr_legacy\|FDC 174210:tom-the-song` | 71 | 13.61 | 1.01 | 0.91 | 0 | NIN 8051 Tôm biển, tươi | -13/-23/+12/+1/– | HELD (nearest): off >20 %, key used by the app (see Held) — Identical to the "Tôm" row. |
| Tôm đồng | dam | `vn_nin\|NIN 8052` | 90 | 18.4 | 1.8 | 0 | – | NIN 8052 (same NIN row) | 0 (same row) | checked, OK |
| Tôm đồng (nướng) | dam | `vn_nin\|NIN 8052014` | 136 | 27.88 | 2.73 | 0 | – | NIN 8052014 (same NIN row) | 0 (same row) | checked, OK |
| Vẹm (hấp) | dam | `usda_sr_legacy\|FDC 174217` | 172 | 23.8 | 4.48 | 7.39 | 0 | FDC 174217 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Vẹm (sống) | dam | `usda_sr_legacy\|FDC 174216` | 86 | 11.9 | 2.24 | 3.69 | 0 | FDC 174216 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đùi gà bỏ da | dam | `usda_sr_legacy\|FDC 173627` | 121 | 19.7 | 4.12 | 0 | 0 | FDC 173627 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đùi gà bỏ da nấu chín | dam | `usda_sr_legacy\|FDC 172853` | 176 | 24.6 | 8.63 | 0 | 0 | FDC 172853 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu gà (hạt khô) | dam | `usda_sr_legacy\|FDC 173756` | 378 | 20.47 | 6.04 | 62.95 | 12.2 | FDC 173756 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu gà (luộc) | dam | `usda_sr_legacy\|FDC 173757` | 164 | 8.86 | 2.59 | 27.42 | 7.6 | FDC 173757 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu hũ (đậu phụ trắng) | dam | `usda_sr_legacy\|FDC 172476` | 76 | 8.08 | 4.78 | 1.87 | 0.3 | NIN 3025 Đậu phụ, sống | -22/-26/-11/+70/-25 | HELD (same cut): off >20 %, key used by the app (see Held) |
| Đậu hũ chiên | dam | `usda_sr_legacy\|FDC 172451` | 270 | 18.8 | 20.2 | 8.9 | 3.9 | FDC 172451 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu hũ non | dam | `usda_sr_legacy\|FDC 172449` | 61 | 7.17 | 3.69 | 1.18 | 0.2 | FDC 172449 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu hũ trắng | dam | `vn_table\|food-dau-hu` | 76 | 8.1 | 4.8 | 1.9 | 0.3 | NIN 3025 Đậu phụ, sống | -22/-26/-11/+73/-25 | FIXED in this PR |
| Đậu lăng nâu (hạt khô) | dam | `usda_sr_legacy\|FDC 172420` | 352 | 24.63 | 1.06 | 63.35 | 10.7 | FDC 172420 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu lăng nâu (luộc) | dam | `usda_sr_legacy\|FDC 172421` | 116 | 9.02 | 0.38 | 20.13 | 7.9 | FDC 172421 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu lăng đỏ (hạt khô) | dam | `usda_sr_legacy\|FDC 174284` | 358 | 23.91 | 2.17 | 63.1 | 10.8 | FDC 174284 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu ngự (hạt khô) | dam | `usda_sr_legacy\|FDC 174252` | 338 | 21.46 | 0.69 | 63.38 | 19 | FDC 174252 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu ngự (luộc) | dam | `usda_sr_legacy\|FDC 174253` | 115 | 7.8 | 0.38 | 20.88 | 7 | NIN 3036002 Đậu ngự luộc | -15/-19/-5/-11/– | checked, small difference (up to 19 %) |
| Đậu nành (hạt khô) | dam | `usda_sr_legacy\|FDC 174270` | 446 | 36.49 | 19.94 | 30.16 | 9.3 | NIN 3007 Đậu tương, đậu nành, hạt khô | +7/+7/+8/+4/+107 | checked, small difference (up to 8 %) |
| Đậu nành (luộc) | dam | `usda_sr_legacy\|FDC 174271` | 172 | 18.21 | 8.97 | 8.36 | 6 | FDC 174271 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu trắng (hạt khô) | dam | `usda_sr_legacy\|FDC 175202` | 333 | 23.36 | 0.85 | 60.27 | 15.2 | NIN 3008 Đậu trắng (đậu tây), hạt, khô | -2/+1/-60/+5/+322 | HELD (same cut): off >20 %, key used by the app (see Held) |
| Đậu trắng (luộc) | dam | `usda_sr_legacy\|FDC 175203` | 139 | 9.73 | 0.35 | 25.09 | 6.3 | FDC 175203 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu xanh (hạt khô) | dam | `usda_sr_legacy\|FDC 174256` | 347 | 23.86 | 1.15 | 62.62 | 16.3 | NIN 3010 Đậu xanh (đậu tắt), hạt, khô | +0/+2/-52/+8/+247 | HELD (same cut): off >20 %, key used by the app (see Held) |
| Đậu xanh (luộc) | dam | `usda_sr_legacy\|FDC 174257` | 105 | 7.02 | 0.38 | 19.15 | 7.6 | FDC 174257 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu đen (hạt khô) | dam | `usda_sr_legacy\|FDC 175186` | 339 | 21.25 | 0.9 | 63.25 | 15.5 | NIN 3004 Đậu đen, hạt, khô | -1/-12/-47/+10/+288 | checked, small difference (up to 47 %, under the 10 kcal / 1 g floor) |
| Đậu đen (luộc) | dam | `usda_sr_legacy\|FDC 175187` | 130 | 8.18 | 0.35 | 24.35 | 8.3 | FDC 175187 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu đỏ (hạt khô) | dam | `usda_sr_legacy\|FDC 173744` | 337 | 22.53 | 1.06 | 61.29 | 15.2 | FDC 173744 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu đỏ (luộc) | dam | `usda_sr_legacy\|FDC 175194` | 127 | 8.67 | 0.5 | 22.8 | 7.4 | FDC 175194 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ếch (thịt đùi) | dam | `vn_nin\|NIN 7080` | 90 | 20 | 1.1 | 0 | – | NIN 7080 (same NIN row) | 0 (same row) | checked, OK |
| Ốc | dam | `asean\|PhilFCT G129` | 74 | 12.8 | 0.6 | 4.3 | 0 | – | – | listed, no NIN/USDA row to compare |
| Ốc bươu | dam | `vn_nin\|NIN 8041` | 84 | 11.1 | 0.7 | 8.3 | – | NIN 8041 (same NIN row) | 0 (same row) | checked, OK |
| Ốc hương | dam | `usda_sr_legacy\|FDC 171983:oc-huong-song` | 137 | 23.84 | 0.4 | 7.76 | 0 | FDC 171983 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ốc móng tay (luộc) | dam | `vn_nin\|NIN 8074002` | 123 | 15.89 | 5.65 | 2.05 | – | NIN 8074002 (same NIN row) | 0 (same row) | checked, OK |
| Ốc nhồi | dam | `vn_nin\|NIN 8043` | 84 | 11.9 | 0.7 | 7.6 | – | NIN 8043 (same NIN row) | 0 (same row) | checked, OK |
| Ốc vặn | dam | `vn_nin\|NIN 8044` | 72 | 12.2 | 0.7 | 4.3 | – | NIN 8044 (same NIN row) | 0 (same row) | checked, OK |
| Ốc đá | dam | `vn_nin\|NIN 8042` | 63 | 11.2 | 0.3 | 3.9 | – | NIN 8042 (same NIN row) | 0 (same row) | checked, OK |
| Ức gà | dam | `usda_sr_legacy\|FDC 171077` | 120 | 22.5 | 2.62 | 0 | 0 | NIN 7089 Thịt gà công nghiệp, lườn, raw | -10/-2/-44/–/– | HELD (nearest): off >20 %, key used by the app (see Held) |
| Ức gà luộc | dam | `usda_sr_legacy\|FDC 171478` | 151 | 29 | 3.03 | 0 | 0 | FDC 171478 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ức gà nướng | dam | `usda_sr_legacy\|FDC 171477` | 165 | 31 | 3.57 | 0 | 0 | FDC 171477 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Equals the old "Ức gà phi lê" row before the fix. |
| Ức gà phi lê | dam | `usda_foundation\|food-uc-ga` | 165 | 31 | 3.6 | 0 | 0 | FDC 171077 | +38/+38/+37/–/– | FIXED in this PR |
| Quả bơ | trai_cay | `usda_foundation\|food-bo` | 160 | 2 | 14.7 | 8.5 | 6.7 | FDC 171705 Avocados, raw, all commercial varieties | +0/+0/+0/+0/+0 | checked, OK |
| Bông cải xanh | rau | `usda_foundation\|food-bong-cai-xanh` | 34 | 2.8 | 0.4 | 6.6 | 2.6 | FDC 170379 Broccoli, raw | +0/-1/+8/-1/+0 | checked, small difference (up to 8 %) |
| Bột củ dền | bo_sung | `usda_foundation\|food-bot-cu-den` | 333.33 | 13.33 | 1 | 66.67 | 20 | – | – | listed, no NIN/USDA row to compare — Brand powder (Dalahouse). Values look back-solved from a 3 g serving (333.33 = 10 / 3 kcal per g), not from a label; USDA has no beet powder. Needs the label. Looked up by lib/training-foods.ts, so its source and source_id must not change. |
| Cải bó xôi (Spinach) | rau | `usda_foundation\|food-cai-bo-xoi` | 23 | 2.9 | 0.4 | 3.6 | 2.2 | FDC 168462 Spinach, raw | +0/+1/+3/-1/+0 | checked, OK |
| Chà là | trai_cay | `usda_foundation\|food-cha-la` | 280 | 2.33 | 0.33 | 73.33 | 6.67 | FDC 168191 Dates, medjool | +1/+29/+120/-2/+0 | checked, small difference (up to 120 %) — Protein 2.33 against medjool 1.81 (+29 %, 0.5 g) and fat 0.33 against 0.15 (+120 %, 0.2 g): over 20 % but under 1 g. Matches deglet noor. Looked up by lib/training-foods.ts: keys must not change. |
| Chuối | trai_cay | `usda_foundation\|food-chuoi` | 105 | 1.3 | 0.3 | 27 | 3.1 | FDC 173944 Bananas, raw | +18/+19/-9/+18/+19 | checked, small difference (up to 19 %) — Row = USDA numbers for one medium banana (118 g: 105 kcal, 1.3 P, 27 C, 3.1 fiber) stored as per 100 g. Raw banana is 89 kcal per 100 g: +18 %, under the 20 % line. Worth a follow-up fix. |
| Hạnh nhân | beo | `usda_foundation\|food-hanh-nhan` | 579 | 21.2 | 49.9 | 21.6 | 12.5 | FDC 170567 Nuts, almonds | +0/+0/+0/+0/+0 | checked, OK |
| Khoai lang luộc | tinh_bot | `usda_foundation\|food-khoai-lang` | 76 | 1.37 | 0.14 | 17.7 | 2.5 | FDC 168484 Sweet potato, cooked, boiled, without sk | +0/+0/+0/+0/+0 | checked, OK — Already replaced by the 20/10 outlier fix (USDA 168484). |
| Mật mía | an_vat | `usda_foundation\|food-mat-mia` | 290 | 0 | 0 | 75 | 0 | FDC 168820 Molasses | +0/–/-100/+0/– | checked, small difference (up to 100 %) |
| Táo Envy | trai_cay | `usda_foundation\|food-tao` | 52 | 0.3 | 0.2 | 13.8 | 2.4 | FDC 171688 Apples, raw, with skin (Includes foods f | +0/+15/+18/+0/+0 | checked, small difference (up to 18 %) — Equals USDA apple with skin (the cultivar "Envy" is only in the name). |
| Whey Protein Isolate | bo_sung | `usda_foundation\|food-whey-protein` | 367 | 80 | 1 | 3.33 | 0 | FDC 173180 Beverages, Protein powder whey based | +4/+2/-36/-47/-100 | checked, small difference (up to 36 %) — Fat 1 against 1.56 (-36 %, 0.6 g): under 1 g. A product, so the label governs. |
| Yến mạch | tinh_bot | `usda_foundation\|food-yen-mach` | 380 | 13.33 | 6.67 | 66.67 | 10 | FDC 173904 Cereals, oats, regular and quick, not fo | +0/+1/+2/-2/-1 | checked, OK — Equals USDA rolled oats (dry). |
| Bún chả Hà Nội | mon_viet | `vn_fct\|food-bun-cha` | 145 | 8.5 | 4.8 | 17.2 | 0.8 | NIN 15034 Bún chả | +7/+39/+9/-4/+33 | DEFERRED to the dish-recipes retune (record in the held file) |
| Phở gà | mon_viet | `vn_fct\|food-pho-ga` | 105 | 7.8 | 2.3 | 13.5 | 0.4 | NIN 15067 Phở gà | +44/+105/+130/+10/-33 | DEFERRED to the dish-recipes retune (record in the held file) |
| Bánh mì thịt | mon_viet | `vn_table\|food-banh-mi-thit` | 210 | 9.5 | 6.8 | 28 | 1.8 | – | – | listed, no NIN/USDA row to compare — Dish with no NIN or USDA entry (NIN 15023 Bánh mì xíu mại is a different filling). Its recipe (Thành phần) adds up to 211 kcal, 9.6 P, 7.6 F per 100 g, but that recipe reproduces the row total, so it is not an independent check. |
| Bánh tráng | tinh_bot | `vn_table\|food-banh-trang` | 330 | 4.2 | 0.5 | 78 | 1.2 | NIN 1010 Bánh đa nem | -1/+5/+150/-2/+140 | checked, small difference (up to 150 %) |
| Bánh tráng nướng | an_vat | `vn_table\|food-banh-trang-nuong` | 190 | 5.5 | 7.2 | 26 | 1 | – | – | listed, no NIN/USDA row to compare — Street snack (rice paper grilled with egg and toppings): no NIN or USDA entry. |
| Bún bò Huế | mon_viet | `vn_table\|food-bun-bo-hue` | 88.33 | 5.6 | 2.5 | 11.2 | 0.6 | – | – | listed, no NIN/USDA row to compare — No NIN or USDA Bún bò Huế (NIN 15033 is Bún bò Nam bộ, a different dish). Recipe total 88 kcal, 5.6 P, 3.3 F per 100 g reproduces the row, so it is no independent check. |
| Bún chả Hà Nội | mon_viet | `vn_table\|food-bun-cha` | 185 | 11.5 | 5.5 | 22 | 1.2 | NIN 15034 Bún chả | +36/+89/+25/+23/+100 | DEFERRED to the dish-recipes retune (record in the held file) |
| Bưởi da xanh | trai_cay | `vn_table\|food-buoi` | 42 | 0.8 | 0.1 | 10.6 | 1.6 | NIN 5001 Bưởi, tươi | +27/+300/–/+32/+129 | checked, small difference (up to 300 %) — NIN pomelo is 33 kcal (row +27 %, but only 9 kcal); USDA pummelo is 38 kcal (+11 %). |
| Cơm gạo lứt | tinh_bot | `vn_table\|food-com-gao-lut` | 112 | 2.33 | 0.8 | 23.33 | 1.67 | FDC 168875 Rice, brown, medium-grain, cooked (Inclu | +0/+0/-4/-1/-7 | checked, OK — Equals cooked medium-grain brown rice. |
| Cơm tấm sườn | mon_viet | `vn_table\|food-com-tam-suon` | 155 | 7.5 | 4.8 | 21 | 0.8 | – | – | listed, no NIN/USDA row to compare — Dish with no NIN or USDA entry. Recipe total 167 kcal, 6.9 P, 6.7 F per 100 g reproduces the row (fat -28 %), not an independent check. |
| Hạt điều rang | beo | `vn_table\|food-hat-dieu` | 553 | 18.2 | 43.8 | 30.2 | 3.3 | FDC 170571 Nuts, cashew nuts, dry roasted, without  | -4/+19/-6/-8/+10 | checked, small difference (up to 19 %) — Name says rang (roasted) but the values are USDA raw cashew (553 kcal, 43.9 F). Against roasted references the gap is under 20 %. |
| Phở bò | mon_viet | `vn_table\|food-pho-bo` | 75 | 4.8 | 1.8 | 10.5 | 0.5 | NIN 15065 Phở bò chín | +3/-8/+100/-5/+67 | checked, small difference (up to 100 %) — Fat 1.8 against 0.9 (+100 %, 0.9 g): over 20 % but under 1 g. kcal +3 %, protein -8 %. |
| Rau muống | rau | `vn_table\|food-rau-muong` | 19 | 2.6 | 0.2 | 2.1 | 2.1 | NIN 4083 Rau muống,  tươi | -32/-19/-17/-36/+110 | checked, small difference (up to 32 %) — kcal 19 against 28 (-32 %) but only 9 kcal; protein 0.6 g, fat 0.04 g apart. |
| Sữa tươi không đường | sua | `vn_table\|food-sua-tuoi` | 62 | 3.2 | 3.5 | 4.5 | 0 | FDC 171265 Milk, whole, 3.25% milkfat, with added v | +2/+2/+8/-6/– | checked, small difference (up to 8 %) — Matches USDA whole milk. NIN fresh milk is richer: fat 3.5 against 4.4 (-20 %, 0.9 g). |

Non-Đạm `food-%` rows with notes that matter (all other `food-%` notes are in the Verdict column): **Chuối** holds USDA's figures for one medium banana (118 g: 105 kcal, 1.3 P, 27 C) stored per 100 g, +18 % over raw banana, so under the line but worth a fix; **Hạt điều rang** holds raw cashew values (553 kcal) under a roasted name, within 20 % of roasted references; **Bột củ dền** (Dalahouse) has no label on file and its numbers look back-solved from a 3 g serving; **Bánh mì thịt, Bún bò Huế, Cơm tấm sườn, Bánh tráng nướng** are dishes with no NIN or USDA row (their recipes reproduce the old totals, so they are no independent check); `food-khoai-lang` was already replaced on 20/10 (USDA 168484). **`training-foods.ts` reads `usda_foundation|food-cha-la` and `usda_foundation|food-bot-cu-den`: neither key may move** (neither is touched).

## 6. Pair-consistency check (report only)

`docs/data/protein-audit-2026-10-23-pairs.py` reads every pair `[raw key, cooked key, yield]` of `apps/web/lib/data/raw-cooked-pairs.slim.json` (yield = cooked grams per 100 g raw) and compares the two rows after scaling the cooked row to the raw weight (expected raw = cooked × yield / 100). Nothing is changed.

- **protein:** fails when raw / expected is outside 0.85 – 1.15.
- **fat:** fails ("fat appears") when raw < 0.85 × expected: fat can render out but never appear; flagged ("renders out") when raw > 1.3 × expected.
- **kcal:** the same two rules as fat.
- A pair is **minor** when every failing gap is under 1 g (protein, fat) or 10 kcal per 100 g raw. Pairs are sorted by the largest failing gap in kcal per 100 g raw (protein × 4, fat × 9).

```bash
python3 docs/data/protein-audit-2026-10-23-pairs.py food-research/live-1023/all.json apps/web/lib/data/raw-cooked-pairs.slim.json
python3 docs/data/protein-audit-2026-10-23-pairs.py --self-test
```

**Result: 127 pairs in the file, 127 checked, 0 missing a row, 52 failing (27 material, 25 minor).** "Same source" below means both rows come from the same dataset family (USDA/USDA or NIN/NIN); "mixed" means one NIN and one USDA row.

### 6.1 The ten largest gaps

| # | Gap (kcal / 100 g raw) | Yield | Raw row (kcal / P / F) | Cooked row (kcal / P / F) | Findings | Proposal |
|---|---|---|---|---|---|---|
| 1 | 356 | 74 | Ba chỉ heo (sống) `usda_sr_legacy\|FDC 167812` 518 / 9.34 / 53.01 | Thịt ba chỉ heo (luộc) `vn_nin\|NIN 7018002` 220 / 14 / 18.2 | fat renders out (raw 53.01 vs 13.47, ×3.94); energy renders out (raw 518 vs 162.8, ×3.18) | Ba chỉ heo is pork belly (USDA, 53 g fat); both cooked rows are NIN "nửa nạc nửa mỡ" (lean and fat), a different cut. **Move the raw side** to NIN 7018 (260 / 16.5 / 21.5), the raw row of the same source and cut as the cooked rows, which removes the 53 g raw → 13.5 g cooked contradiction. But NIN's own raw and cooked rows then still show (protein off x1.59; fat renders out x1.60; energy renders out x1.60), so the yield 74 needs review too. NIN 7018 is not belly: check the cut with Hao before moving. Keeping true belly would need a cooked belly row; USDA SR has none. |
| 2 | 236 | 76 | Ba chỉ heo (sống) `usda_sr_legacy\|FDC 167812` 518 / 9.34 / 53.01 | Thịt ba chỉ heo (nướng) `vn_nin\|NIN 7086` 401 / 20.5 / 35.2 | protein off (raw 9.34 vs 15.58, ×0.60); fat renders out (raw 53.01 vs 26.75, ×1.98); energy renders out (raw 518 vs 304.76, ×1.70) | Ba chỉ heo is pork belly (USDA, 53 g fat); both cooked rows are NIN "nửa nạc nửa mỡ" (lean and fat), a different cut. **Move the raw side** to NIN 7018 (260 / 16.5 / 21.5), the raw row of the same source and cut as the cooked rows, which removes the 53 g raw → 13.5 g cooked contradiction. But NIN's own raw and cooked rows then still show (protein off x1.32; fat renders out x1.32; energy renders out x1.32), so the yield 76 needs review too. NIN 7018 is not belly: check the cut with Hao before moving. Keeping true belly would need a cooked belly row; USDA SR has none. |
| 3 | 89 | 68 | Má đùi gà có da (sống) `usda_sr_legacy\|FDC 172378` 214 / 16.37 / 15.95 | Má đùi gà có da (nướng) `usda_sr_legacy\|FDC 173617` 184 / 24.03 / 8.99 | fat renders out (raw 15.95 vs 6.11, ×2.61); energy renders out (raw 214 vs 125.12, ×1.71) | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 4 | 73 | 65 | Gà ta (sống) `usda_sr_legacy\|FDC 172400` 258 / 17.55 / 20.33 | Gà ta (luộc) `usda_sr_legacy\|FDC 172401` 285 / 26.88 / 18.87 | fat renders out (raw 20.33 vs 12.27, ×1.66); energy renders out (raw 258 vs 185.25, ×1.39) | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 5 | 67 | 66 | Thịt heo xay (sống) `usda_sr_legacy\|FDC 167902` 263 / 16.88 / 21.19 | Thịt heo xay (nấu chín) `usda_sr_legacy\|FDC 167903` 297 / 25.69 / 20.77 | fat renders out (raw 21.19 vs 13.71, ×1.55); energy renders out (raw 263 vs 196.02, ×1.34) | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 6 | 67 | 53 | Sườn non heo (sống) `usda_sr_legacy\|FDC 167853` 277 / 15.47 / 23.4 | Sườn non heo (hầm) `usda_sr_legacy\|FDC 167854` 397 / 29.06 / 30.3 | fat renders out (raw 23.4 vs 16.06, ×1.46); energy renders out (raw 277 vs 210.41, ×1.32) | Same source and cut; fat renders out. **Keep** (Hao). **Same cut?** USDA spareribs (23.4 g fat) vs NIN 7053 Sườn lợn (12.8 g): for Hao to check before anything moves. |
| 7 | 56 | 77 | Cá nục (sống) `usda_sr_legacy\|FDC 173672` 158 / 20.07 / 7.89 | Cá nục (luộc) `vn_nin\|NIN 8020002` 133 / 24.34 / 3.98 | fat renders out (raw 7.89 vs 3.06, ×2.57); energy renders out (raw 158 vs 102.41, ×1.54) | Mixed sources: **move the raw side** to NIN 8020 Cá nục, tươi (111 / 20.2 / 3.3) so both rows are NIN: that pair passes. Cut check needed. |
| 8 | 52 | 68 | Gà nguyên con có da (sống) `usda_sr_legacy\|FDC 171447` 215 / 18.6 / 15.06 | Gà nguyên con có da (nướng) `usda_sr_legacy\|FDC 171450` 239 / 27.3 / 13.6 | fat renders out (raw 15.06 vs 9.25, ×1.63); energy renders out (raw 215 vs 162.52, ×1.32) | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 9 | 48 | 80 | Cá nục (sống) `usda_sr_legacy\|FDC 173672` 158 / 20.07 / 7.89 | Cá nục (nướng) `vn_nin\|NIN 8020014` 138 / 25.25 / 4.13 | fat renders out (raw 7.89 vs 3.3, ×2.39); energy renders out (raw 158 vs 110.4, ×1.43) | Mixed sources: **move the raw side** to NIN 8020 Cá nục, tươi (111 / 20.2 / 3.3) so both rows are NIN: that pair passes. Cut check needed. |
| 10 | 45 | 122 | Trứng gà (sống) `usda_sr_legacy\|FDC 171287` 143 / 12.6 / 9.5 | Trứng gà chiên (đánh) `usda_sr_legacy\|FDC 172185` 154 / 10.6 / 11.7 | fat appears (raw 9.5 vs 14.27, ×0.67); energy appears (raw 143 vs 187.88, ×0.76) | Same source; frying adds oil, so fat appears legitimately. Keep. |

**Known failure, Ba chỉ heo:** the raw side is USDA pork belly (518 kcal / 53 g fat) and its two cooked rows are NIN "nửa nạc nửa mỡ" (220 / 18.2 boiled at yield 74, 401 / 35.2 grilled at 76): the same piece shows 53 g raw and 13.5 g cooked. Both sides of a pair must come from the same source and cut. Proposed: the raw side moves to NIN 7018, then the yields 74 and 76 are re-read, because NIN's own raw / cooked rows do not agree at them either (see rows 1–2). The cut caveat is in section 12.

**Sườn non heo (sống) 23.4 g / (hầm) 30.3 g at yield 53** passes on protein (15.5 against 15.4 expected) and fails only as "fat renders out" (×1.46): kept as it is. **Same cut?** USDA spareribs (lean and fat) against NIN 7053 "Sườn lợn" (187 kcal, 12.8 g fat): the NIN row has about half the fat, so either NIN's rib includes more bone or it is a leaner cut; for Hao to decide before anything moves.

### 6.2 All 52 failing pairs

Sorted by the size of the gap. Rows 1–10 repeat above with their proposals; the rest are listed once.

| # | Gap | Yield | Raw row (kcal / P / F) | Cooked row (kcal / P / F) | Findings | Class | Proposal |
|---|---|---|---|---|---|---|---|
| 1 | 356 | 74 | Ba chỉ heo (sống) `usda_sr_legacy\|FDC 167812` 518 / 9.34 / 53.01 | Thịt ba chỉ heo (luộc) `vn_nin\|NIN 7018002` 220 / 14 / 18.2 | fat renders out (raw 53.01 vs 13.47, ×3.94); energy renders out (raw 518 vs 162.8, ×3.18) | mixed | Ba chỉ heo is pork belly (USDA, 53 g fat); both cooked rows are NIN "nửa nạc nửa mỡ" (lean and fat), a different cut. **Move the raw side** to NIN 7018 (260 / 16.5 / 21.5), the raw row of the same source and cut as the cooked rows, which removes the 53 g raw → 13.5 g cooked contradiction. But NIN's own raw and cooked rows then still show (protein off x1.59; fat renders out x1.60; energy renders out x1.60), so the yield 74 needs review too. NIN 7018 is not belly: check the cut with Hao before moving. Keeping true belly would need a cooked belly row; USDA SR has none. |
| 2 | 236 | 76 | Ba chỉ heo (sống) `usda_sr_legacy\|FDC 167812` 518 / 9.34 / 53.01 | Thịt ba chỉ heo (nướng) `vn_nin\|NIN 7086` 401 / 20.5 / 35.2 | protein off (raw 9.34 vs 15.58, ×0.60); fat renders out (raw 53.01 vs 26.75, ×1.98); energy renders out (raw 518 vs 304.76, ×1.70) | mixed | Ba chỉ heo is pork belly (USDA, 53 g fat); both cooked rows are NIN "nửa nạc nửa mỡ" (lean and fat), a different cut. **Move the raw side** to NIN 7018 (260 / 16.5 / 21.5), the raw row of the same source and cut as the cooked rows, which removes the 53 g raw → 13.5 g cooked contradiction. But NIN's own raw and cooked rows then still show (protein off x1.32; fat renders out x1.32; energy renders out x1.32), so the yield 76 needs review too. NIN 7018 is not belly: check the cut with Hao before moving. Keeping true belly would need a cooked belly row; USDA SR has none. |
| 3 | 89 | 68 | Má đùi gà có da (sống) `usda_sr_legacy\|FDC 172378` 214 / 16.37 / 15.95 | Má đùi gà có da (nướng) `usda_sr_legacy\|FDC 173617` 184 / 24.03 / 8.99 | fat renders out (raw 15.95 vs 6.11, ×2.61); energy renders out (raw 214 vs 125.12, ×1.71) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 4 | 73 | 65 | Gà ta (sống) `usda_sr_legacy\|FDC 172400` 258 / 17.55 / 20.33 | Gà ta (luộc) `usda_sr_legacy\|FDC 172401` 285 / 26.88 / 18.87 | fat renders out (raw 20.33 vs 12.27, ×1.66); energy renders out (raw 258 vs 185.25, ×1.39) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 5 | 67 | 66 | Thịt heo xay (sống) `usda_sr_legacy\|FDC 167902` 263 / 16.88 / 21.19 | Thịt heo xay (nấu chín) `usda_sr_legacy\|FDC 167903` 297 / 25.69 / 20.77 | fat renders out (raw 21.19 vs 13.71, ×1.55); energy renders out (raw 263 vs 196.02, ×1.34) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 6 | 67 | 53 | Sườn non heo (sống) `usda_sr_legacy\|FDC 167853` 277 / 15.47 / 23.4 | Sườn non heo (hầm) `usda_sr_legacy\|FDC 167854` 397 / 29.06 / 30.3 | fat renders out (raw 23.4 vs 16.06, ×1.46); energy renders out (raw 277 vs 210.41, ×1.32) | same source | Same source and cut; fat renders out. **Keep** (Hao). **Same cut?** USDA spareribs (23.4 g fat) vs NIN 7053 Sườn lợn (12.8 g): for Hao to check before anything moves. |
| 7 | 56 | 77 | Cá nục (sống) `usda_sr_legacy\|FDC 173672` 158 / 20.07 / 7.89 | Cá nục (luộc) `vn_nin\|NIN 8020002` 133 / 24.34 / 3.98 | fat renders out (raw 7.89 vs 3.06, ×2.57); energy renders out (raw 158 vs 102.41, ×1.54) | mixed | Mixed sources: **move the raw side** to NIN 8020 Cá nục, tươi (111 / 20.2 / 3.3) so both rows are NIN: that pair passes. Cut check needed. |
| 8 | 52 | 68 | Gà nguyên con có da (sống) `usda_sr_legacy\|FDC 171447` 215 / 18.6 / 15.06 | Gà nguyên con có da (nướng) `usda_sr_legacy\|FDC 171450` 239 / 27.3 / 13.6 | fat renders out (raw 15.06 vs 9.25, ×1.63); energy renders out (raw 215 vs 162.52, ×1.32) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 9 | 48 | 80 | Cá nục (sống) `usda_sr_legacy\|FDC 173672` 158 / 20.07 / 7.89 | Cá nục (nướng) `vn_nin\|NIN 8020014` 138 / 25.25 / 4.13 | fat renders out (raw 7.89 vs 3.3, ×2.39); energy renders out (raw 158 vs 110.4, ×1.43) | mixed | Mixed sources: **move the raw side** to NIN 8020 Cá nục, tươi (111 / 20.2 / 3.3) so both rows are NIN: that pair passes. Cut check needed. |
| 10 | 45 | 122 | Trứng gà (sống) `usda_sr_legacy\|FDC 171287` 143 / 12.6 / 9.5 | Trứng gà chiên (đánh) `usda_sr_legacy\|FDC 172185` 154 / 10.6 / 11.7 | fat appears (raw 9.5 vs 14.27, ×0.67); energy appears (raw 143 vs 187.88, ×0.76) | same source | Same source; frying adds oil, so fat appears legitimately. Keep. |
| 11 | 44 | 59 | Tim gà (sống) `usda_sr_legacy\|FDC 171458` 153 / 15.55 / 9.33 | Tim gà (luộc) `usda_sr_legacy\|FDC 171059` 185 / 26.41 / 7.92 | fat renders out (raw 9.33 vs 4.67, ×2.00); energy renders out (raw 153 vs 109.15, ×1.40) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 12 | 37 | 92 | Trứng gà (sống) `usda_sr_legacy\|FDC 171287` 143 / 12.6 / 9.5 | Trứng gà ốp la `usda_sr_legacy\|FDC 173423` 196 / 13.6 / 14.8 | fat appears (raw 9.5 vs 13.62, ×0.70); energy appears (raw 143 vs 180.32, ×0.79) | same source | Same source; frying adds oil, so fat appears legitimately. Keep. |
| 13 | 33 | 74 | Chân giò heo (sống) `usda_sr_legacy\|FDC 168226` 193 / 19.87 / 11.96 | Thịt chân giò heo (luộc) `vn_nin\|NIN 7032002` 230 / 15.7 / 18.6 | protein off (raw 19.87 vs 11.62, ×1.71) | mixed | Mixed sources: **move the raw side** to NIN 7032 Chân giò lợn, tươi (230 / 15.7 / 18.6) so both rows are NIN; that pair still shows (protein off x1.35; fat renders out x1.35; energy renders out x1.35), so check the yield too. Cut check needed. |
| 14 | 32 | 244 | Đậu nành (hạt khô) `usda_sr_legacy\|FDC 174270` 446 / 36.49 / 19.94 | Đậu nành (luộc) `usda_sr_legacy\|FDC 174271` 172 / 18.21 / 8.97 | protein off (raw 36.49 vs 44.43, ×0.82) | same source | Same source; dry-matter pair, protein off by the yield only. Check the yield. |
| 15 | 30 | 77 | Nạc vai heo (sống) `usda_sr_legacy\|FDC 167845` 148 / 19.55 / 7.14 | Nạc vai heo (nấu chín) `usda_sr_legacy\|FDC 167846` 230 / 25.33 / 13.54 | fat appears (raw 7.14 vs 10.43, ×0.68); energy appears (raw 148 vs 177.1, ×0.84) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 16 | 25 | 78 | Thịt vịt bỏ da (sống) `usda_sr_legacy\|FDC 172410` 135 / 18.28 / 5.95 | Thịt vịt bỏ da (nướng) `usda_sr_legacy\|FDC 172411` 201 / 23.48 / 11.2 | fat appears (raw 5.95 vs 8.74, ×0.68) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 17 | 25 | 80 | Đùi gà bỏ da `usda_sr_legacy\|FDC 173627` 121 / 19.7 / 4.12 | Đùi gà bỏ da nấu chín `usda_sr_legacy\|FDC 172853` 176 / 24.6 / 8.63 | fat appears (raw 4.12 vs 6.9, ×0.60) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 18 | 22 | 548 | Yến mạch cắt hạt steel-cut (khô) `usda_foundation\|FDC 2346397` 381.248 / 12.5112 / 5.8 | Yến mạch cắt hạt steel-cut (chín) `usda_sr_legacy\|FDC 173905:yen-mach-cat-hat-chin` 71 / 2.5 / 1.5 | fat appears (raw 5.8 vs 8.22, ×0.71) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 19 | 18 | 74 | Cá lóc (cá quả, sống) `vn_nin\|NIN 8022` 97 / 18.2 / 2.7 | Cá lóc (nấu chín) `usda_sr_legacy\|FDC 175127` 113 / 24.69 / 0.88 | fat renders out (raw 2.7 vs 0.65, ×4.15) | mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 20 | 15 | 544 | Yến mạch (cán, khô) `usda_sr_legacy\|FDC 173904` 379 / 13.2 / 6.52 | Yến mạch cán dẹt (chín) `usda_sr_legacy\|FDC 173905:yen-mach-can-det-chin` 71 / 2.5 / 1.5 | fat appears (raw 6.52 vs 8.16, ×0.80) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 21 | 14 | 282 | Mì trứng khô (sợi khô) `usda_sr_legacy\|FDC 169731:mi-trung-kho` 384 / 14.2 / 4.4 | Mì trứng khô (chín) `usda_sr_legacy\|FDC 169732:mi-trung-chin` 138 / 4.5 / 2.1 | fat appears (raw 4.4 vs 5.92, ×0.74) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 22 | 13 | 544 | Yến mạch `usda_foundation\|food-yen-mach` 380 / 13.33 / 6.67 | Yến mạch cán dẹt (chín) `usda_sr_legacy\|FDC 173905:yen-mach-can-det-chin` 71 / 2.5 / 1.5 | fat appears (raw 6.67 vs 8.16, ×0.82) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 23 | 12 | 53 | Cật bò (sống) `usda_sr_legacy\|FDC 169449` 99 / 17.4 / 3.09 | Cật bò (hầm) `usda_sr_legacy\|FDC 169450` 158 / 27.27 / 4.65 | protein off (raw 17.4 vs 14.45, ×1.20) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 24 | 11 | 57 | Tim bò (sống) `usda_sr_legacy\|FDC 168625` 112 / 17.72 / 3.94 | Tim bò (hầm) `usda_sr_legacy\|FDC 169448` 165 / 28.48 / 4.73 | fat renders out (raw 3.94 vs 2.7, ×1.46) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 25 | 9 | 319 | Hạt kê (khô) `usda_sr_legacy\|FDC 169702` 378 / 11.02 / 4.22 | Hạt kê (nấu chín) `usda_sr_legacy\|FDC 168871` 119 / 3.51 / 1 | fat renders out (raw 4.22 vs 3.19, ×1.32) | same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 26 | 9 | 150 | Nếp cẩm (hạt khô) `vn_nin\|NIN 1002:nep-cam-kho` 350 / 8.4 / 1.6 | Xôi nếp cẩm `vn_nin\|NIN 1024002` 235 / 5.59 / 1.71 | fat appears (raw 1.6 vs 2.56, ×0.62) | minor, same source | Both NIN: the NIN raw and cooked rows disagree at this yield. Check the yield. |
| 27 | 8 | 368 | Gạo nếp thường (hạt khô) `vn_nin\|NIN 1002` 350 / 8.4 / 1.6 | Xôi trắng (nếp đồ) `usda_sr_legacy\|FDC 169711` 97 / 2.02 / 0.19 | fat renders out (raw 1.6 vs 0.7, ×2.29) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 28 | 7 | 368 | Gạo nếp cái (hạt khô) `vn_nin\|NIN 1001` 348 / 8.6 / 1.5 | Xôi trắng (nếp đồ) `usda_sr_legacy\|FDC 169711` 97 / 2.02 / 0.19 | protein off (raw 8.6 vs 7.43, ×1.16); fat renders out (raw 1.5 vs 0.7, ×2.15) | mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 29 | 6 | 238 | Mì ý spaghetti (khô) `usda_sr_legacy\|FDC 169736:mi-y-spaghetti-kho` 371 / 13 / 1.5 | Mì ý spaghetti (chín) `usda_sr_legacy\|FDC 169737:mi-y-spaghetti-chin` 158 / 5.8 / 0.9 | fat appears (raw 1.5 vs 2.14, ×0.70) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 30 | 6 | 238 | Mì ý penne (khô) `usda_sr_legacy\|FDC 169736:mi-y-penne-kho` 371 / 13 / 1.5 | Mì ý penne (chín) `usda_sr_legacy\|FDC 169737:mi-y-penne-chin` 158 / 5.8 / 0.9 | fat appears (raw 1.5 vs 2.14, ×0.70) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 31 | 6 | 238 | Nui (khô) `usda_sr_legacy\|FDC 169736:nui-kho` 371 / 13 / 1.5 | Nui (chín) `usda_sr_legacy\|FDC 169737:nui-chin` 158 / 5.8 / 0.9 | fat appears (raw 1.5 vs 2.14, ×0.70) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 32 | 6 | 80 | Thịt heo nạc (thăn) `usda_sr_legacy\|FDC 168249` 109 / 20.9 / 2.17 | Thịt heo nạc (thăn) nấu chín `usda_sr_legacy\|FDC 168250` 143 / 26.2 / 3.51 | fat appears (raw 2.17 vs 2.81, ×0.77) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 33 | 5 | 55 | Mề gà (sống) `usda_sr_legacy\|FDC 171456` 94 / 17.66 / 2.06 | Mề gà (luộc) `usda_sr_legacy\|FDC 171457` 154 / 30.39 / 2.68 | fat renders out (raw 2.06 vs 1.47, ×1.40) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 34 | 5 | 272 | Gạo tẻ giã tay (hạt khô) `vn_nin\|NIN 1003` 347 / 8.1 / 1.3 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (raw 1.3 vs 0.76, ×1.71) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 35 | 4 | 81 | Khoai môn (sống) `usda_sr_legacy\|FDC 169308` 112 / 1.5 / 0.2 | Khoai môn (nấu chín) `usda_sr_legacy\|FDC 168486` 142 / 0.52 / 0.11 | protein off (raw 1.5 vs 0.42, ×3.56); fat renders out (raw 0.2 vs 0.09, ×2.24) | same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 36 | 4 | 297 | Đậu ngự (hạt khô) `usda_sr_legacy\|FDC 174252` 338 / 21.46 / 0.69 | Đậu ngự (luộc) `usda_sr_legacy\|FDC 174253` 115 / 7.8 / 0.38 | fat appears (raw 0.69 vs 1.13, ×0.61) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 37 | 3 | 78 | Cua biển (sống) `vn_nin\|NIN 8033` 103 / 17.5 / 0.6 | Cua biển (hấp) `usda_sr_legacy\|FDC 172007` 110 / 22.32 / 1.24 | fat appears (raw 0.6 vs 0.97, ×0.62) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 38 | 3 | 101 | Ghẹ (sống) `usda_sr_legacy\|FDC 174204` 87 / 18.06 / 1.08 | Ghẹ (hấp) `usda_sr_legacy\|FDC 174205` 83 / 17.88 / 0.74 | fat renders out (raw 1.08 vs 0.75, ×1.45) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 39 | 2 | 267 | Đậu đỏ (hạt khô) `usda_sr_legacy\|FDC 173744` 337 / 22.53 / 1.06 | Đậu đỏ (luộc) `usda_sr_legacy\|FDC 175194` 127 / 8.67 / 0.5 | fat appears (raw 1.06 vs 1.33, ×0.79) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 40 | 2 | 85 | Khoai Nhật `usda_foundation\|FDC 2346404:khoai-nhat-song` 78.999 / 1.5781 / 0.375 | Khoai lang (nướng, cả vỏ) `usda_sr_legacy\|FDC 168483` 90 / 2.01 / 0.15 | fat renders out (raw 0.375 vs 0.13, ×2.94) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 41 | 2 | 272 | Gạo tẻ trắng (xát máy, hạt khô) `vn_nin\|NIN 1004` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (raw 1 vs 0.76, ×1.31) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 42 | 2 | 272 | Gạo ST25 (hạt khô) `vn_nin\|NIN 1004:gao-st25-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (raw 1 vs 0.76, ×1.31) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 43 | 2 | 272 | Gạo nàng hương (hạt khô) `vn_nin\|NIN 1004:gao-nang-huong-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (raw 1 vs 0.76, ×1.31) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 44 | 2 | 272 | Gạo tám thơm (hạt khô) `vn_nin\|NIN 1004:gao-tam-thom-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (raw 1 vs 0.76, ×1.31) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |
| 45 | 2 | 103 | Khoai Nhật `usda_foundation\|FDC 2346404:khoai-nhat-song` 78.999 / 1.5781 / 0.375 | Khoai lang (luộc, bỏ vỏ) `usda_sr_legacy\|FDC 168484` 76 / 1.37 / 0.14 | fat renders out (raw 0.375 vs 0.14, ×2.60) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 46 | 2 | 103 | Khoai Nhật `usda_foundation\|FDC 2346404:khoai-nhat-song` 78.999 / 1.5781 / 0.375 | Khoai lang luộc `usda_foundation\|food-khoai-lang` 76 / 1.37 / 0.14 | fat renders out (raw 0.375 vs 0.14, ×2.60) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 47 | 2 | 96 | Đậu Hà Lan (hạt, sống) `usda_sr_legacy\|FDC 170419` 81 / 5.42 / 0.4 | Đậu Hà Lan (hạt, luộc) `usda_sr_legacy\|FDC 170420` 84 / 5.36 / 0.22 | fat renders out (raw 0.4 vs 0.21, ×1.89) | minor, same source | Same source and cut; fat renders out in cooking (USDA's own raw and cooked rows). Keep. |
| 48 | 2 | 383 | Gạo nếp (hạt khô) `usda_sr_legacy\|FDC 168883` 370 / 6.81 / 0.55 | Xôi trắng (nếp đồ) `usda_sr_legacy\|FDC 169711` 97 / 2.02 / 0.19 | fat appears (raw 0.55 vs 0.73, ×0.76) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 49 | 1 | 336 | Bún khô `usda_sr_legacy\|FDC 169742` 364 / 5.95 / 0.56 | Bún khô (luộc) `usda_sr_legacy\|FDC 168914:bun-kho-luoc` 108 / 1.79 / 0.2 | fat appears (raw 0.56 vs 0.67, ×0.83) | minor, same source | Same source, other cut or sample: check the two FDC rows and the yield before moving anything. |
| 50 | 1 | 101 | Khoai mì (sắn, sống) `usda_sr_legacy\|FDC 169985` 160 / 1.36 / 0.28 | Khoai mì (sắn, luộc) `vn_nin\|NIN 2004:khoai-mi-luoc` 158 / 1.1 / 0.2 | protein off (raw 1.36 vs 1.11, ×1.22); fat renders out (raw 0.28 vs 0.2, ×1.39) | minor, mixed | Mixed sources: no NIN raw row for the cooked row; **move the cooked side** to the USDA cooked row of the raw cut, or check the cut. |
| 51 | 1 | 74 | Khoai mì (sắn, sống) `usda_sr_legacy\|FDC 169985` 160 / 1.36 / 0.28 | Khoai mì (sắn, nướng) `vn_nin\|NIN 2004014` 216 / 1.51 / 0.27 | protein off (raw 1.36 vs 1.12, ×1.22); fat renders out (raw 0.28 vs 0.2, ×1.40) | minor, mixed | Mixed sources: **move the raw side** to NIN 2004 Củ sắn, tươi (158 / 1.1 / 0.2) so both rows are NIN: that pair passes. Cut check needed. |
| 52 | 1 | 380 | Miến dong (khô) `vn_nin\|NIN 2015` 338 / 0.6 / 0.1 | Miến dong (chín) `recipe_calc\|recipe:mien-dong-chin` 88.9 / 0.2 / 0 | protein off (raw 0.6 vs 0.76, ×0.79); fat renders out (raw 0.1 vs 0.0, ×inf) | minor, mixed | Mixed sources: **align both sides on one source**; no NIN cooked row of this food passes at this yield, so the USDA raw row and its USDA cooked row are the likelier pair. |

Of the 52: 17 mix a NIN and a USDA row (fix = one side moves so both share a source and cut, tested above), 35 are USDA / USDA or NIN / NIN (mostly fat that really renders out, frying oil, or dry-matter pairs where the yield decides).

## 7. Raw meat and fish with fat ≥ 20 g per 100 g, and their NIN same-cut row

| Row | Key | kcal / P / F | NIN row (kcal / P / F) | Match | Note |
|---|---|---|---|---|---|
| Ba chỉ heo (sống) | `usda_sr_legacy\|FDC 167812` | 518 / 9.34 / 53.01 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi (260 / 16.5 / 21.5) | nearest | not belly: lean and fat, 21.5 g fat; NIN 7016 (mỡ, 37.3 g) is the pure fat. No NIN belly row. |
| Sườn bò (sống) | `usda_sr_legacy\|FDC 169439` | 390 / 14.4 / 36.23 | none | – | NIN has no beef short ribs; NIN 7004 (bò loại II, 10.5 g fat) is a muscle cut, not ribs. |
| Sườn non heo (sống) | `usda_sr_legacy\|FDC 167853` | 277 / 15.47 / 23.4 | NIN 7053 Sườn lợn, tươi (187 / 17.9 / 12.8) | same cut? | USDA spareribs 23.4 g vs NIN 12.8 g: bone share or trim differs; Hao to check. |
| Thịt heo xay (sống) | `usda_sr_legacy\|FDC 167902` | 263 / 16.88 / 21.19 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi (260 / 16.5 / 21.5) | nearest | USDA ground pork 21.2 g vs NIN 21.5 g: agrees (−1 %), but NIN is a cut, not a grind. |
| Gà ta (sống) | `usda_sr_legacy\|FDC 172400` | 258 / 17.55 / 20.33 | NIN 7013 Thịt gà ta, tươi (199 / 20.3 / 13.1) | nearest | USDA stewing hen meat and skin 20.3 g vs NIN average meat 13.1 g. |

5 rows qualify (raw meat or fish, category Đạm, fat ≥ 20 g; egg yolk and the dried-pork floss are not raw meat and are left out). Cooked rows with this much fat (ba chỉ luộc / nướng, sườn hầm, xay chín, vịt có da, chân giò luộc) are in the full list.

## 8. Calls I made that Hao can veto (approved items marked)

1. **Approved (Hao 23/10):** the floor (10 kcal / 1 g per 100 g) on top of the 20 % line. Without it 12 more rows would be "off" against their primary match (Δ kcal / P / F): Cá rô phi (sống) (-4/+2/-26 %); Đậu đen (hạt khô) (-1/-12/-47 %); Lòng trắng trứng gà (+13/+6/+100 %); Mề gà (sống) (-5/-17/+58 %); Thịt heo nạc (thăn) (-8/-9/-25 %); Bánh tráng (-1/+5/+150 %); Bưởi da xanh (+27/+300/– %); Chà là (+1/+29/+120 %); Mật mía (+0/–/-100 %); Phở bò (+3/-8/+100 %); Rau muống (-32/-19/-17 %); Whey Protein Isolate (+4/+2/-36 %). All are in the full list.
2. **Approved:** Lươn left alone; Mực archived.
3. The same-food mapping to NIN (section 5, "Match").
4. Beef: USDA 171779 (generic composite, within 20 % of NIN 7003). If Hao prefers NIN 7003 the only loss is b12; if Hao prefers another USDA row, any of the 62 passing rows can be swapped by changing one FDC number in the record and the SQL.
5. Ức gà phi lê as a slug row of FDC 171077 (a duplicate of "Ức gà" until merged).
6. The Hến losses (section 1) and the tofu zeros.

## 9. Dry-run output (local, scratch database; not production)

A throw-away Postgres 16 was created from the migrations' `nutrition.foods` and `nutrition.food_portions` (unique index on `(source, source_id)`, `is_archived`) and loaded with the 1,306 foods and 2,868 portions of `live-1023/all.json`. The checks and the real importer were run against it in the order of section 10, from a freshly reset database.

```
$ go run ./cmd/importfoods --dry-run --file docs/data/protein-audit-2026-10-23.json
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 5 food records from docs/data/protein-audit-2026-10-23.json
Completeness Report: 78.2% average coverage of the 22 counted nutrients across 5 foods
```

- Source-fix SQL as committed (ROLLBACK): 1× `BEGIN`, 6× `UPDATE 1`, 1× `ROLLBACK`; afterwards the 6 rows are still on their old keys.
- With the last line changed to `COMMIT`: 1× `BEGIN`, 6× `UPDATE 1`, 1× `COMMIT`. Run a second time: 1× `BEGIN`, 6× `UPDATE 0`, 1× `COMMIT` (harmless).
- A unique-key clash (a row already holding one of the new keys) aborts the SQL at that UPDATE and leaves every row as it was (tested against this SQL with a pre-inserted `vn_nin / NIN 8037` row: `BEGIN`, 4× `UPDATE 1`, then `ERROR: duplicate key value violates unique constraint "uq_foods_source_source_id"`; no key moved and nothing was archived).
- Real importer against the scratch database after the COMMIT run: `Successfully imported 5 foods into nutrition.foods`. Then total foods **1306 (was 1306: no row added)**, archived 1, same ids, portions unchanged:

| id | name_vi | source | source_id | kcal | P | F | C | fib | archived | portions |
|---|---|---|---|---|---|---|---|---|---|---|
| `245172d0` | Đậu hũ trắng | vn_nin | `NIN 3025` | 97 | 10.9 | 5.4 | 1.1 | 0.4 | no | 1 bìa = 150; 100 g = 100 |
| `d2960a7c` | Hến | vn_nin | `NIN 8037` | 45 | 4.5 | 0.7 | 5.1 | – | no | 100 g = 100 |
| `6028095b` | Mực | usda_sr_legacy | `FDC 174223` | 92 | 15.6 | 1.38 | 3.08 | 0 | yes | 100 g = 100; 3 oz = 85 |
| `03bcdfd2` | Tàu hủ trắng cứng (hấp/luộc) | vn_nin | `NIN 3025002` | 98 | 11 | 5.5 | 1.1 | 0.4 | no | 1 miếng nhỏ (80 g) = 80; 100 g = 100 |
| `b1cb7f07` | Thịt bò nạc | usda_sr_legacy | `FDC 171779` | 130 | 22.4 | 4.5 | 0 | 0 | no | 150 g = 150; 100 g = 100 |
| `b6c88da5` | Ức gà phi lê | usda_sr_legacy | `FDC 171077:uc-ga-phi-le` | 120 | 22.5 | 2.6 | 0 | 0 | no | 100 g = 100; 150 g = 150; 200 g = 200 |

- `protein-audit-2026-10-23-noloss.py`: pass (section 2). `protein-audit-2026-10-23-pairs.py --self-test` and `protein-audit-2026-10-23-noloss.py --self-test`: ok.

## 10. Hao's server steps

Same server set-up as `docs/data/molasses-2026-10-23-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`; the VPS has no Go and its `pg_dump` is 16, so every command runs in a throw-away container. **Order matters: backup, source-fix SQL (ROLLBACK, then COMMIT), dry run, import, check.** The import upserts on `(source, source_id)`: run before the SQL, it would insert 5 second rows and leave the old ones behind.

### 0. Put the files on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin main
git show origin/main:docs/data/protein-audit-2026-10-23.json > ~/protein-audit-2026-10-23.json
git show origin/main:docs/data/protein-audit-2026-10-23-source-fix.sql > ~/protein-audit-2026-10-23-source-fix.sql
python3 -c "import json; print(len(json.load(open('/home/deploy/protein-audit-2026-10-23.json'))), 'rows')"
grep -c "FDC 171779" ~/protein-audit-2026-10-23.json ~/protein-audit-2026-10-23-source-fix.sql
```

Expected: `5 rows`, then `1` for the JSON and `1` for the SQL (the same `FDC 171779` in both). This works once the PR is merged; before that use `git fetch origin data/protein-audit-1023` and `git show origin/data/protein-audit-1023:docs/data/…`.

### 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-protein-1023.sql.gz
gunzip -c ~/backups/foods-before-protein-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

**Write down the number it prints: it is N, the real count before the import** (the 23/10 snapshot had 1,306; use what the server says). Keep the file until the check is done.

### 2. The source-fix SQL: ROLLBACK first, then COMMIT

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"' < ~/protein-audit-2026-10-23-source-fix.sql
```

Expected: `BEGIN`; the first SELECT shows 6 rows with the old keys (`food-thit-bo-nac`, `food-uc-ga`, `food-dau-hu`, `FDC 172475:tau-hu-trang-hap-luoc`, `PhilFCT G020`, `FDC 174223`) and `is_archived` f; **6 × `UPDATE 1`**; the second SELECT shows `FDC 171779`, `FDC 171077:uc-ga-phi-le`, `NIN 3025`, `NIN 3025002`, `NIN 8037` and Mực `is_archived` t; `ROLLBACK`. **If any line says `UPDATE 0`, or the first SELECT has fewer than 6 rows or other keys, or psql prints `duplicate key value violates unique constraint "uq_foods_source_source_id"`, stop**: the row is not what this job expects, or a row with the new key was added to production after the 23/10 snapshot (`ON_ERROR_STOP` then rolls the whole transaction back, so nothing is half-applied).

Then the same file with the last statement changed to `COMMIT` (the file is not edited; `sed` does it on the way in):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
sed 's/^ROLLBACK;$/COMMIT;/' ~/protein-audit-2026-10-23-source-fix.sql \
  | docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"'
```

Expected: the same output ending in `COMMIT`. A second run is harmless (`UPDATE 0` everywhere).

### 3. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/protein-audit-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected (the dry run never opens the database):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 5 food records from /data/x.json
Completeness Report: 78.2% average coverage of the 22 counted nutrients across 5 foods
```

### 4. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/protein-audit-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 5 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output. A re-run is safe (same upsert, portions replaced per food). The import also overwrites `name` (English), `brand` and `tip_vi` of these rows: they are set from the source, null and the live tip. It replaces the nutrient map whole: the losses are the ones listed in section 1 and nothing else.

### 5. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT left(f.id::text,8) AS id8, f.name_vi, f.source, f.source_id, f.per_100g->>'energy' AS kcal, f.per_100g->>'protein' AS p, f.per_100g->>'fat' AS fat, f.is_archived,
       (SELECT string_agg(p.label_vi || ' = ' || p.grams, '; ' ORDER BY p.sort) FROM nutrition.food_portions p WHERE p.food_id = f.id) AS portions
FROM nutrition.foods f
WHERE f.id::text LIKE ANY (ARRAY['245172d0%','d2960a7c%','6028095b%','03bcdfd2%','b1cb7f07%','b6c88da5%'])
ORDER BY f.name_vi, f.source;
SELECT count(*) AS total, count(*) FILTER (WHERE is_archived) AS archived FROM nutrition.foods;
SELECT count(*) AS old_seed_keys FROM nutrition.foods WHERE source_id IN ('food-thit-bo-nac','food-uc-ga','food-dau-hu') OR (source = 'asean' AND source_id = 'PhilFCT G020');
SQL
```

Expected: exactly the 6 rows of the table in section 9 (same ids, kcal / P / F, portions, Mực archived); `total` = **N** (no row is added) and `archived` = the number before + 1; `old_seed_keys` = 0. "Cá hồi" is untouched and still reads `usda_foundation / food-ca-hoi` (208 / 20.4 / 13.4).

## 11. Rolling back

- **Keys and archive:** run this (it puts the old keys and the old visibility back; the ids never change):

  ```sql
  BEGIN;
  UPDATE nutrition.foods SET source = 'usda_foundation', source_id = 'food-thit-bo-nac' WHERE id = 'b1cb7f07-0c3b-440c-a453-4147e5471e35' AND source = 'usda_sr_legacy' AND source_id = 'FDC 171779';  -- Thịt bò nạc
  UPDATE nutrition.foods SET source = 'usda_foundation', source_id = 'food-uc-ga' WHERE id = 'b6c88da5-5f97-43a1-8b90-4f3d9325affb' AND source = 'usda_sr_legacy' AND source_id = 'FDC 171077:uc-ga-phi-le';  -- Ức gà phi lê
  UPDATE nutrition.foods SET source = 'vn_table', source_id = 'food-dau-hu' WHERE id = '245172d0-9a1a-4f8c-8991-148e6236893c' AND source = 'vn_nin' AND source_id = 'NIN 3025';  -- Đậu hũ trắng
  UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 172475:tau-hu-trang-hap-luoc' WHERE id = '03bcdfd2-fc3a-4bd4-a31a-3df56e772639' AND source = 'vn_nin' AND source_id = 'NIN 3025002';  -- Tàu hủ trắng cứng (hấp/luộc)
  UPDATE nutrition.foods SET source = 'asean', source_id = 'PhilFCT G020' WHERE id = 'd2960a7c-f75a-47dc-8b1a-1c1e4c9d3fd4' AND source = 'vn_nin' AND source_id = 'NIN 8037';  -- Hến
  UPDATE nutrition.foods SET is_archived = false WHERE id = '6028095b-11f8-40e8-9dd5-2b87bda06c1e';  -- Mực
  COMMIT;
  ```

- **Values (the five rows):** the old `per_100g`, `per_100g_nutrients`, `name`, `brand`, `tip_vi` and portions are in the dump of step 1: `gunzip -c ~/backups/foods-before-protein-1023.sql.gz | grep -e b1cb7f07 -e b6c88da5 -e 245172d0 -e 03bcdfd2 -e d2960a7c`. The before values are also in section 1 (macros) and in `food-research/live-1023/all.json` (every nutrient). Restore row by row from those lines; **do not restore the whole dump over the live tables.** Do the key rollback first, so the row is found by its old key.
- Past diary entries were never touched, so nothing needs undoing there.

## 12. For the held follow-up (written down, not started)

Rules the follow-up (the 35 held rows, the 3 deferred dish rows, and the pair fixes) works under:

1. **The no-loss rule.** Every record passes `protein-audit-2026-10-23-noloss.py` with no allow-file entry unless Hao approves a specific loss with its reason. NIN prints fewer tracked nutrients than USDA, so many NIN moves will fail it; those rows then stay on USDA, or take the USDA row that is same-cut with the NIN one.
2. **Every match is marked "same cut" or "nearest"** (section 3, column Cut). **Only "same cut" rows move.** "Nearest" rows (14 of 35) stay as they are until Hao has looked at the cut.
3. **Fix the failing pairs of section 6 together with their keys.** A pair is fixed as a unit: both rows from one source and cut, the keys in `raw-cooked-pairs.slim.json` (and its research source `raw-cooked-pairs.json`) and in `dish-recipes.slim.json` moved in the same PR, and the pair check re-run to pass (the minor ones need only a look). Pairs that mix NIN and USDA rows are the first to fix.
4. **Ba chỉ heo is pork belly; NIN 7018 "nửa nạc nửa mỡ" is not.** Check the cut before moving it: the raw USDA row is belly (53 g fat), NIN 7018 is a lean-and-fat cut (21.5 g fat), and NIN's own raw / cooked rows do not agree at the pair yields. The pair, its yields and the two NIN cooked rows named "Thịt ba chỉ heo" are one decision.
5. Sườn non heo (USDA spareribs vs NIN 7053): resolve "same cut?" first (section 6.1).
6. Cá hồi: merge the generic row into "Cá hồi (Atlantic, nuôi)" (or the other way round) once nothing reads either key.
7. The three dish rows go with the dish-recipes retune: retune the recipe grams so the parts add up to the NIN dish, and keep sodium / potassium (no-loss).

