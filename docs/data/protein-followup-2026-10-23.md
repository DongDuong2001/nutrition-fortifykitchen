# Protein follow-up 23/10/2026: pair and recipe keys, Ba chỉ heo / Cá nục / Chân giò / Cá lóc, a cooked Thịt bò nạc

Data job `data/protein-followup-1023`, from `origin/main` 86d8b69a (after #87). Snapshot: `food-research/live-1023/all.json`, with #87 applied on top (its SQL and import were run on the scratch database first, so the state is the one production will be in). Nothing here touched production: every SQL, import and check ran on a throw-away local Postgres. **Hao runs the SQL and the import after review.**

## 1. The short version

- **Done:** the four moves Hao decided (Ba chỉ heo, Cá nục, Chân giò, Cá lóc), with the pair file and the yields moved with them; a cooked pair for Thịt bò nạc (one new row); one wrong duplicate archived (USDA Cá nục (nấu chín)); a test that every key in both data files is a live food. Failing raw/cooked pairs: **52 → 47** (material 27 → 22).
- **Not done, and it needs Hao:** of the 35 held rows only the 3 he decided move. The other 32 stay: 22 same-cut rows would lose nutrients the rows have today (the no-loss check of this job; mostly b12 and cholesterol, which NIN does not print for organ meat, fish and shellfish: liver b12 59 µg, kidney b12 27 µg and cholesterol 411 mg), 1 collides with a key #87 created, 6 are only the nearest cut, Sườn non heo stays USDA by his decision, and the 2 Tôm thẻ copies have nothing to resolve while Tôm stays. Section 4 lists every row with what it would lose. Say which losses are acceptable (or that the lost values should be carried over from the USDA row into the NIN record) and the rest follows with the same machinery.
- **Needs Hao's sign-off before merge:** the real values the three decided moves lose (section 3). They are marked `PENDING` in the allow file, so `protein-audit-2026-10-23-noloss.py` exits 1 on this PR until they are signed off.
- **Dish recipes:** none of the rows that move or archive is an ingredient of a dish recipe, so `dish-recipes.slim.json` does not change. The new test covers both files anyway.

## 2. What changes

Per 100 g, before = live row after #87. Every moved row keeps its **id**, name, category, tip and portions; the import replaces its nutrient map and `name` (English) from the new source.

| Row (id) | Before kcal / P / F | After | Key | Lost / new | Why |
|---|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | 518 / 9.34 / 53.01 | 260 / 16.5 / 21.5 | `usda_sr_legacy|FDC 167812` → `vn_nin|NIN 7018` | lost 7: b12 0.84, cholesterol 72, vitamin_e 0.39; zeros: carbs, fiber, sugars, vitamin_k · new 0 | Hao: Ba chỉ heo raw side moves to NIN 7018 (same source as both cooked rows) |
| Cá nục (sống) (`baa7ce9f`) | 158 / 20.07 / 7.89 | 111 / 20.2 / 3.3 | `usda_sr_legacy|FDC 173672` → `vn_nin|NIN 8020` | lost 7: b12 4.4, cholesterol 47, vitamin_c 2, vitamin_d 9.1; zeros: carbs, fiber, sugars · new 0 | Hao: Cá nục (sống) to NIN 8020 |
| Chân giò heo (sống) (`c6950aa7`) | 193 / 19.87 / 11.96 | 230 / 15.7 / 18.6 | `usda_sr_legacy|FDC 168226` → `vn_nin|NIN 7032` | lost 9: b12 0.54, cholesterol 67, trans_fat 0.095, vitamin_d 0.5, vitamin_e 0.31; zeros: carbs, fiber, sugars, vitamin_k · new 0 | Hao: Chân giò heo (sống) to NIN 7032 |
| Cá lóc (cá quả, sống) (`fa91a51f`) | 97 / 18.2 / 2.7 | 88 / 19.3 / 0.7 | `vn_nin|NIN 8022` → `usda_sr_legacy|FDC 173680:ca-loc-song` | lost none · new 23 | Hao: Cá lóc, both sides USDA (raw side to USDA northern pike raw, the twin of the live cooked row) |
| Thịt bò nạc (nấu chín) (**new row**) | – | 167 / 27.5 / 6.4 | `usda_sr_legacy|FDC 171778` (insert) | new row, nothing to lose | The cooked twin of the raw row `FDC 171779` (the same USDA composite of lean retail cuts, select, trimmed to 1/8" fat). Portions as the raw row |
| Cá nục (nấu chín) (`6a8848b1`) | 201 / 25.73 / 10.12 | archived | `usda_sr_legacy|FDC 171994` | – | Wrong duplicate: the NIN rows Cá nục (luộc) 133 / 24.3 / 4.0 and (nướng) 138 / 25.3 / 4.1 are the same fish in the same states; this USDA row is 51 % higher in kcal and 154 % in fat. Its only pair (with the raw row) is removed. `is_archived = true` hides it from search and the library; nothing is deleted |

The Cá lóc row keeps the name "Cá lóc (cá quả, sống)" but now holds USDA **northern pike** raw (88 / 19.3 / 0.7), the raw twin of the live cooked row (also pike). That is Hao's "both sides USDA"; pike is not snakehead, as already noted for the cooked row in #87.

**The pairs file** (`tests/fixtures/raw-cooked-pairs.json`, the research file; `lib/data/raw-cooked-pairs.slim.json` is regenerated from it by `scripts/slim-pairs.mjs`, and `raw-cooked-data.test.ts` fails on any drift):

| Pair | Before | After | Yield |
|---|---|---|---|
| Ba chỉ heo (sống) → `vn_nin|NIN 7018002` | yield 74 | yield 118 | protein balance from NIN's own rows: 100 x protein raw 16.5 / protein cooked 13.98 (NIN 7018 vs NIN 7018002); replaces 74 (USDA cooking-yield table of another cut). Hao 23/10 |
| Ba chỉ heo (sống) → `vn_nin|NIN 7086` | yield 76 | yield 80 | protein balance from NIN's own rows: 100 x protein raw 16.5 / protein cooked 20.5 (NIN 7018 vs NIN 7086); replaces 76 (USDA cooking-yield table of another cut). Hao 23/10 |
| Chân giò heo (sống) → `vn_nin|NIN 7032002` | yield 74 | yield 100 | protein balance from NIN's own rows: 100 x protein raw 15.7 / protein cooked 15.7 (NIN 7032 vs NIN 7032002); replaces 74 (USDA cooking-yield table of another cut). Hao 23/10 |
| Cá nục (sống) → `vn_nin|NIN 8020002` | yield 77 | yield 77 | kept: the fillet yield passes the pair check with the NIN raw row |
| Cá nục (sống) → `vn_nin|NIN 8020014` | yield 80 | yield 80 | kept: the fillet yield passes the pair check with the NIN raw row |
| Cá nục (sống) → `usda_sr_legacy|FDC 171994` | yield 78 | removed | pair removed: the USDA cooked row is archived (wrong duplicate of the NIN luộc / nướng rows) |
| Cá lóc (cá quả, sống) → `usda_sr_legacy|FDC 175127` | yield 74 | yield 78 | protein balance: 100 x protein raw 19.3 / protein cooked 24.69 (FDC 173680 vs FDC 175127, northern pike raw and cooked); replaces 74 (NIN 8022 vs FDC 175127). Hao 23/10 |
| Thịt bò nạc → `usda_sr_legacy|FDC 171778` | yield – | yield 81 | new pair |

**Review points on the yields.** Ba chỉ heo: derived from NIN's own rows as Hao asked (protein balance, the method the other pairs use). Both NIN cooked rows turn out to be the raw row scaled, not a measured cooked food: NIN 7018002 (luộc) equals NIN 7018 × 0.85 on protein, fat and kcal alike, so the yield comes out at **118 %** (the boiled belly would weigh more than the raw one). NIN 7032002 (Chân giò luộc) is **identical** to NIN 7032, so the yield is **100 %**. The app converts grams with these numbers (`lib/yield.ts`), so a boiled belly of 100 g raw would be shown as 118 g. They make the pair check pass because NIN's cooked rows are scaled copies; if Hao prefers a physical yield (the old 74 and 76 came from the USDA cooking-yield tables), keep those and accept that these pairs flag. The grilled row NIN 7086 is not a scaled copy (fat 35.2 g against 21.5 g raw), so with protein balance (80) the pair still shows "fat appears" ×0.76; that is a defect of the NIN rows, listed in section 5.

## 3. The no-loss check on this PR

```
PENDING  vn_nin|NIN 7018 (Ba chỉ heo (sống)): lost 7, new 0
           lost b12 = 0.84  [pending]
           lost carbs = 0  [allowed]
           lost cholesterol = 72  [pending]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost vitamin_e = 0.39  [pending]
           lost vitamin_k = 0  [allowed]
PENDING  vn_nin|NIN 8020 (Cá nục (sống)): lost 7, new 0
           lost b12 = 4.4  [pending]
           lost carbs = 0  [allowed]
           lost cholesterol = 47  [pending]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost vitamin_c = 2  [pending]
           lost vitamin_d = 9.1  [pending]
PENDING  vn_nin|NIN 7032 (Chân giò heo (sống)): lost 9, new 0
           lost b12 = 0.54  [pending]
           lost carbs = 0  [allowed]
           lost cholesterol = 67  [pending]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost trans_fat = 0.095  [pending]
           lost vitamin_d = 0.5  [pending]
           lost vitamin_e = 0.31  [pending]
           lost vitamin_k = 0  [allowed]
ok       usda_sr_legacy|FDC 173680:ca-loc-song (Cá lóc (cá quả, sống)): lost 0, new 23
NO ROW   usda_sr_legacy|FDC 171778 (Thịt bò nạc (nấu chín)): not in the snapshot and not moved by the SQL: it would be an INSERT
RESULT: FAIL (unlisted or pending loss)
```

Exit code **1**. The script was extended in this PR: a reason that starts with `PENDING` is listed but keeps the exit code at 1 until the person who approves the loss rewrites it. The three moves Hao decided lose the values above; the zeros are listed with a plain reason, the real values (b12, cholesterol, vitamin C / D / E, trans fat) are `PENDING Hao sign-off`. Cá nục (sống) loses vitamin D 9.1 µg and b12 4.4 µg, Ba chỉ heo b12 0.84 and cholesterol 72, Chân giò b12 0.54 and cholesterol 67. To accept them, replace "PENDING Hao sign-off:" with "approved by Hao <date>:" in `docs/data/protein-followup-2026-10-23-noloss-allow.json`; to refuse, drop the record and the SQL line (the row then stays on USDA and its pair on the old key).

## 4. The 35 held rows: what happened to each

Rule from #87: only "same cut" matches move; every record passes the no-loss check; a raw/cooked pair moves as a unit. "Lost" = what the NIN record would drop from the live row; the zeros are known zeros (fiber, sugars in meat), the rest are real values.

| Row (id) | Cut | NIN match | Outcome | Would lose |
|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | nearest | NIN 7018 | **Moved** (Hao decided) | b12 0.84, cholesterol 72, vitamin_e 0.39; zeros: carbs, fiber, sugars, vitamin_k |
| Cá chép (sống) (`1059c25a`) | same cut | NIN 8003 | Not moved: would lose real values | b12 1.53, cholesterol 66, vitamin_c 1.6; zeros: carbs, fiber, sugars |
| Cá diêu hồng (sống) (`3063ec03`) | nearest | NIN 8062 | Not moved: "nearest", not the same cut | b12 1.58, b3 3.903, b5 0.487, b6 0.162, cholesterol 50, copper 0.075, folate 24, magnesium 27, manganese 0.037, monounsaturated_fat 0.498, polyunsaturated_fat 0.363, potassium 302, saturated_fat 0.585, selenium 41.8, sodium 52, vitamin_d 3.1, vitamin_k 1.4; zeros: fiber, sugars, vitamin_c |
| Cá ngừ tươi (sống) (`1ac93144`) | nearest | NIN 8019 | Not moved: "nearest", not the same cut | b12 2.08, cholesterol 39, trans_fat 0.016, vitamin_d 1.7; zeros: carbs, fiber, sugars |
| Cá nục (sống) (`baa7ce9f`) | nearest | NIN 8020 | **Moved** (Hao decided) | b12 4.4, cholesterol 47, vitamin_c 2, vitamin_d 9.1; zeros: carbs, fiber, sugars |
| Cá thu (sống) (`5ec507be`) | nearest | NIN 8026 | Not moved: "nearest", not the same cut | b12 2.4, b5 0.75, b6 0.4, cholesterol 76, folate 1, manganese 0.014, selenium 36.5, vitamin_c 1.6, vitamin_d 7.3, vitamin_e 0.69, vitamin_k 0.1, zinc 0.49; zeros: carbs, fiber, sugars |
| Cật bò (hầm) (`6f4dabb9`) | same cut | NIN 7029002 | Not moved: loses zeros only, but its raw/cooked partner loses real values and a pair moves as a unit | zeros: fiber, sugars, vitamin_k |
| Cật bò (sống) (`65b1a772`) | same cut | NIN 7029 | Not moved: would lose real values | b12 27.5, cholesterol 411, trans_fat 0.1; zeros: fiber, sugars, vitamin_k |
| Cật heo (nấu chín) (`b5d44a63`) | same cut | NIN 7030002 | Not moved: loses zeros only, but its raw/cooked partner loses real values and a pair moves as a unit | zeros: fiber |
| Cật heo (sống) (`1bd282d5`) | same cut | NIN 7030 | Not moved: would lose real values | b12 8.49, cholesterol 319; zeros: fiber |
| Chân giò heo (sống) (`c6950aa7`) | nearest | NIN 7032 | **Moved** (Hao decided) | b12 0.54, cholesterol 67, trans_fat 0.095, vitamin_d 0.5, vitamin_e 0.31; zeros: carbs, fiber, sugars, vitamin_k |
| Đậu hũ (đậu phụ trắng) (`49999be4`) | same cut | NIN 3025 | Not moved: the key `vn_nin\|NIN 3025` is already the #87 row Đậu hũ trắng. Merging means archiving this row and re-pointing the dish recipes that use it, which changes their parts' kcal (97 against 76 per 100 g) | sugars 0.62, vitamin_e 0.01, vitamin_k 2.4; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Đậu trắng (hạt khô) (`bcd82617`) | same cut | NIN 3008 | Not moved: would lose real values | copper 0.984, magnesium 190, manganese 1.796, potassium 1795, selenium 12.8, sodium 16, sugars 2.11, zinc 3.67; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Đậu xanh (hạt khô) (`0e027e38`) | same cut | NIN 3010 | Not moved: would lose real values | manganese 1.035, selenium 8.2, sugars 6.6; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Gà ta (sống) (`c9c2e282`) | nearest | NIN 7013 | Not moved: "nearest", not the same cut | b12 0.32, cholesterol 71; zeros: carbs, fiber, sugars |
| Gan bò (sống) (`28431e98`) | same cut | NIN 7039 | Not moved: would lose real values | b12 59.3, cholesterol 275, trans_fat 0.17; zeros: alcohol, fiber, sugars |
| Gan gà (nấu chín) (`fdd32845`) | same cut | NIN 7040002 | Not moved: loses zeros only, but its raw/cooked partner loses real values and a pair moves as a unit | zeros: alcohol, fiber, sugars, vitamin_d, vitamin_k |
| Gan gà (sống) (`8c393043`) | same cut | NIN 7040 | Not moved: would lose real values | b12 16.6, cholesterol 345, trans_fat 0.065; zeros: alcohol, fiber, sugars, vitamin_d, vitamin_k |
| Lưỡi bò (hầm) (`7081686c`) | same cut | NIN 7044002 | Not moved: would lose real values | trans_fat 0.84, vitamin_d 0.4, vitamin_e 0.3, vitamin_k 1.2; zeros: fiber, sugars, vitamin_a |
| Lưỡi bò (sống) (`f8021f1d`) | same cut | NIN 7044 | Not moved: would lose real values | b12 3.79, cholesterol 87; zeros: fiber, vitamin_a |
| Mề gà (luộc) (`a949808e`) | same cut | NIN 7048002 | Not moved: loses zeros only, but its raw/cooked partner loses real values and a pair moves as a unit | zeros: fiber, sugars, vitamin_d, vitamin_k |
| Nạc vai heo (nấu chín) (`606b5bbc`) | same cut | NIN 7083002 | Not moved: would lose real values | b12 0.86, b3 4.26, b5 0.651, b6 0.317, cholesterol 90, copper 0.124, folate 5, magnesium 20, manganese 0.026, monounsaturated_fat 6.17, polyunsaturated_fat 1.25, potassium 346, saturated_fat 4.79, selenium 37.4, sodium 75, vitamin_c 0.6, vitamin_d 1; zeros: carbs, fiber, sugars, vitamin_k |
| Sườn non heo (sống) (`cd142e49`) | nearest | NIN 7053 | Stays USDA (Hao: Sườn non heo stays; "same cut?" open) | b12 0.38, cholesterol 80, trans_fat 0.222; zeros: carbs, fiber, sugars, vitamin_a, vitamin_c, vitamin_k |
| Thăn ngoại bò (sống) (`e0bfb3e9`) | same cut | NIN 7005 | Not moved: would lose real values | b12 1.13, cholesterol 53; zeros: fiber, sugars, vitamin_a, vitamin_c |
| Thịt dê (sống) (`f3973d66`) | nearest | NIN 7011 | Not moved: "nearest", not the same cut | b12 1.13, cholesterol 57; zeros: carbs, fiber |
| Thịt heo nạc (thăn) nấu chín (`df249c8d`) | same cut | NIN 7085002 | Not moved: would lose real values | b12 0.57, b3 7.43, b5 1.01, b6 0.74, cholesterol 73, copper 0.11, magnesium 29, manganese 0.013, monounsaturated_fat 1.33, polyunsaturated_fat 0.51, potassium 421, saturated_fat 1.2, selenium 38.2, sodium 57, trans_fat 0.033, vitamin_d 0.2, vitamin_e 0.08; zeros: fiber, folate, sugars, vitamin_a, vitamin_c, vitamin_k |
| Tim bò (hầm) (`9b52d79e`) | same cut | NIN 7055002 | Not moved: would lose real values | vitamin_d 0.1, vitamin_k 0.5; zeros: fiber, sugars |
| Tim bò (sống) (`6e406d98`) | same cut | NIN 7055 | Not moved: would lose real values | b12 8.55, cholesterol 124, trans_fat 0.18; zeros: fiber, sugars, vitamin_k |
| Tim gà (sống) (`6019bf63`) | same cut | NIN 7056 | Not moved: would lose real values | b12 7.29, carbs 0.71, cholesterol 136; zeros: fiber |
| Tim heo (sống) (`d5be8d10`) | same cut | NIN 7057 | Not moved: would lose real values | b12 3.79, cholesterol 131, vitamin_e 0.63; zeros: fiber, sugars |
| Tôm (`1c6a0a1a`) | same cut | NIN 8051 | Not moved: would lose real values (Hao: archive the Tôm thẻ duplicate first; that is only needed if Tôm moves, so it is not done) | b12 1.11, cholesterol 126, trans_fat 0.018, vitamin_k 0.3; zeros: fiber, sugars, vitamin_c |
| Tôm luộc (`246422a6`) | same cut | NIN 8051002 | Not moved: would lose real values (Hao: archive the Tôm thẻ duplicate first; that is only needed if Tôm moves, so it is not done) | trans_fat 0.035, vitamin_k 0.4; zeros: fiber, sugars, vitamin_c |
| Tôm thẻ (luộc) (`03e8249c`) | nearest | NIN 8051002 | Stays (its copy "Tôm" / "Tôm luộc" does not move, so there is no collision to resolve) | trans_fat 0.035, vitamin_k 0.4; zeros: fiber, sugars, vitamin_c |
| Tôm thẻ (tôm chân trắng) (`574722b9`) | nearest | NIN 8051 | Stays (its copy "Tôm" / "Tôm luộc" does not move, so there is no collision to resolve) | b12 1.11, cholesterol 126, trans_fat 0.018, vitamin_k 0.3; zeros: fiber, sugars, vitamin_c |
| Ức gà (`74e55541`) | nearest | NIN 7089 | Not moved: "nearest", not the same cut | b1 0.094, b12 0.21, b3 9.6, b5 1.5, b6 0.81, cholesterol 73, copper 0.037, folate 9, magnesium 28, manganese 0.011, monounsaturated_fat 0.69, polyunsaturated_fat 0.42, potassium 334, saturated_fat 0.56, selenium 22.8, sodium 45, trans_fat 0.007; zeros: carbs, fiber, sugars, vitamin_c, vitamin_d, vitamin_k |

Tôm and Tôm luộc are marked *same cut* here (whole peeled shrimp; the species differ, USDA mixed against NIN sea shrimp): in #87 they were *nearest*, and Hao's instruction to archive the Tôm thẻ duplicates first treats them as moving.

Count: 35 held rows → 3 moved (Hao's decisions), 1 stays by his decision, 1 blocked by a key collision, 16 same-cut rows blocked by real losses, 4 same-cut rows with zero-only losses blocked by their partner, 2 Tôm rows blocked by real losses and 2 Tôm thẻ copies left as they are, 6 "nearest" rows that stay.

**To move more, Hao picks one:**

1. **Accept the losses** row by row (or for a whole group, for instance "organ meats lose b12 and cholesterol"). I add the rows to the allow file, regenerate records, SQL, both fixtures, the slim files and the live-keys fixture, and re-run the dry run. Each pair moves as a unit.
2. **Carry the lost values over** from the USDA row into the NIN record, so nothing is lost (the macros come from NIN, the micronutrients NIN does not print stay USDA). The source label says NIN, and the row mixes two tables; Hao declined that for Hến in #87.
3. **Leave them on USDA**, which is where they are: the values are real, only the "NIN first" rule is not met. None of these rows is in a mixed NIN / USDA pair (section 5), so leaving them on USDA creates no pair inconsistency.

## 5. Pair check after this PR

`python3 docs/data/protein-audit-2026-10-23-pairs.py <catalogue export> apps/web/lib/data/raw-cooked-pairs.slim.json`, run on the catalogue as it is after #87 and this PR (the scratch database exported in the same shape as `all.json`; the 23/10 export alone lacks the new keys and reports them as missing): **127 pairs, 127 checked, 0 missing a row, 47 failing (22 material, 25 minor)**. Before: 52 failing (27 material).

- **Fixed (5):** Ba chỉ heo (luộc), Cá nục (luộc), Cá nục (nướng), Chân giò heo (luộc), Cá lóc.
- **Still failing, Ba chỉ heo (nướng)** (`NIN 7018` → `NIN 7086`, yield 80): fat appears ×0.76 and energy ×0.81. NIN's grilled row has far more fat than its raw row at any yield that keeps protein; it is the NIN pair that is inconsistent, so it needs either a different NIN cooked row or Hao's say-so to keep the old table yield (76) and accept the flag.
- **Same-source pairs ("renders out" / "appears"): kept**, as Hao decided (USDA/USDA or NIN/NIN, the fat really renders out or frying adds oil).
- **Mixed NIN / USDA pairs still failing: 11** (not in Hao's list, so untouched):

| Gap | Yield | Raw row (kcal / P / F) | Cooked row (kcal / P / F) | Findings |
|---|---|---|---|---|
| 8 | 368 | Gạo nếp thường (hạt khô) `vn_nin\|NIN 1002` 350 / 8.4 / 1.6 | Xôi trắng (nếp đồ) `usda_sr_legacy\|FDC 169711` 97 / 2.02 / 0.19 | fat renders out (×2.29) |
| 7 | 368 | Gạo nếp cái (hạt khô) `vn_nin\|NIN 1001` 348 / 8.6 / 1.5 | Xôi trắng (nếp đồ) `usda_sr_legacy\|FDC 169711` 97 / 2.02 / 0.19 | protein off (×1.16); fat renders out (×2.15) |
| 5 | 272 | Gạo tẻ giã tay (hạt khô) `vn_nin\|NIN 1003` 347 / 8.1 / 1.3 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (×1.71) |
| 3 | 78 | Cua biển (sống) `vn_nin\|NIN 8033` 103 / 17.5 / 0.6 | Cua biển (hấp) `usda_sr_legacy\|FDC 172007` 110 / 22.32 / 1.24 | fat appears (×0.62) |
| 2 | 272 | Gạo tẻ trắng (xát máy, hạt khô) `vn_nin\|NIN 1004` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (×1.31) |
| 2 | 272 | Gạo ST25 (hạt khô) `vn_nin\|NIN 1004:gao-st25-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (×1.31) |
| 2 | 272 | Gạo nàng hương (hạt khô) `vn_nin\|NIN 1004:gao-nang-huong-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (×1.31) |
| 2 | 272 | Gạo tám thơm (hạt khô) `vn_nin\|NIN 1004:gao-tam-thom-kho` 346 / 7.9 / 1 | Cơm trắng `usda_sr_legacy\|SR Legacy NDB 20445 (FDC id not shown on mirror)` 130 / 2.7 / 0.28 | fat renders out (×1.31) |
| 1 | 101 | Khoai mì (sắn, sống) `usda_sr_legacy\|FDC 169985` 160 / 1.36 / 0.28 | Khoai mì (sắn, luộc) `vn_nin\|NIN 2004:khoai-mi-luoc` 158 / 1.1 / 0.2 | protein off (×1.22); fat renders out (×1.39) |
| 1 | 74 | Khoai mì (sắn, sống) `usda_sr_legacy\|FDC 169985` 160 / 1.36 / 0.28 | Khoai mì (sắn, nướng) `vn_nin\|NIN 2004014` 216 / 1.51 / 0.27 | protein off (×1.22); fat renders out (×1.40) |
| 1 | 380 | Miến dong (khô) `vn_nin\|NIN 2015` 338 / 0.6 / 0.1 | Miến dong (chín) `recipe_calc\|recipe:mien-dong-chin` 88.9 / 0.2 / 0 | protein off (×0.79); fat renders out (×inf) |

The other 36 failing pairs are same-source (kept). The Thịt bò nạc pair passes: raw 130 / 22.4 / 4.5, cooked 167 / 27.5 / 6.4, yield 81 (protein ×1.00, fat ×0.88, kcal ×0.96).

## 6. The key test

`lib/__tests__/data-keys.test.ts` fails when a key in `raw-cooked-pairs.slim.json` or `dish-recipes.slim.json` (dishes, ingredients, alternatives) is not a live food. The live keys are `tests/fixtures/live-food-keys.json` (1,305 keys: the catalogue after #87 and this PR, archived rows left out), regenerated from a catalogue export with `node scripts/live-keys.mjs export.json` in the same PR as any data job that moves, adds or archives a source/source_id. Before this PR every key in both files resolved (checked against the 23/10 snapshot and the post-#87 state), so #87 broke no link. Proof that the test bites: with `vn_nin|NIN 7018` removed from the fixture it fails and names the key.

`lib/__tests__/food-twins.test.ts` hand-built "Thịt bò nạc (sống)" / "(nấu chín)" rows as its example of a food the research has no pair for; the research has that pair now (one real food listed twice), so the example is Thịt cừu nạc and the assertions about Thịt bò nạc follow the research pair. No other test changed.

## 7. Gates and dry run (scratch Postgres, not production)

```
$ go run ./cmd/importfoods --dry-run --file docs/data/protein-followup-2026-10-23.json
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 5 food records from docs/data/protein-followup-2026-10-23.json
Completeness Report: 90.0% average coverage of the 22 counted nutrients across 5 foods
```

- Scratch database from `live-1023/all.json`, then #87 as Hao will run it: `Successfully imported 5 foods into nutrition.foods`; total foods 1306, archived 1.
- Follow-up SQL as committed (ROLLBACK): 1× `BEGIN`, 5× `UPDATE 1`, 1× `ROLLBACK`; afterwards 4 rows are still on their old keys. With `COMMIT`: 1× `BEGIN`, 5× `UPDATE 1`, 1× `COMMIT`. Second run: 1× `BEGIN`, 5× `UPDATE 0`, 1× `COMMIT` (harmless).
- Real import: `Successfully imported 5 foods into nutrition.foods`; run again the same: `Successfully imported 5 foods into nutrition.foods`. Total foods **1307** (was 1306: **one row added**, Thịt bò nạc (nấu chín)), archived 2, rows with the four old keys: 0.

| id | name_vi | source | source_id | kcal | P | F | C | fib | archived | portions |
|---|---|---|---|---|---|---|---|---|---|---|
| `ca083cb1` | Ba chỉ heo (sống) | vn_nin | `NIN 7018` | 260 | 16.5 | 21.5 | – | – | no | 100 g = 100; 1 lát ba chỉ = 30; 1 phần ăn = 150 |
| `fa91a51f` | Cá lóc (cá quả, sống) | usda_sr_legacy | `FDC 173680:ca-loc-song` | 88 | 19.3 | 0.7 | 0 | 0 | no | 100 g = 100; 1 khúc cá lóc = 150; 1 lạng (100 g) = 100 |
| `6a8848b1` | Cá nục (nấu chín) | usda_sr_legacy | `FDC 171994` | 201 | 25.73 | 10.12 | 0 | 0 | yes | 100 g = 100; 1 con cá nục (phần ăn được) = 55 |
| `baa7ce9f` | Cá nục (sống) | vn_nin | `NIN 8020` | 111 | 20.2 | 3.3 | – | – | no | 100 g = 100; 1 con cá nục (phần ăn được) = 70 |
| `c6950aa7` | Chân giò heo (sống) | vn_nin | `NIN 7032` | 230 | 15.7 | 18.6 | – | – | no | 100 g = 100; 1 khúc chân giò = 300 |
| `513c7ff3` | Thịt bò nạc (nấu chín) | usda_sr_legacy | `FDC 171778` | 167 | 27.5 | 6.4 | 0 | 0 | no | 150 g = 150; 100 g = 100 |

- Unit tests (`npx vitest run`): **200 of 201 files, 2,714 tests pass**; the one failing file is `components/ui/__tests__/icons.test.tsx`, which cannot import `@mynaui/icons-react`: this worktree borrowed the `node_modules` of another checkout that lacks two packages the lockfile has (`@mynaui/icons-react`, `html-to-image`; the same two give the 3 `tsc` errors). Nothing in this PR touches them; CI installs its own. Run in the borrowed environment, so CI is the real gate.
- Scripts: `protein-audit-2026-10-23-noloss.py --self-test` and `protein-audit-2026-10-23-pairs.py --self-test`: ok.

## 8. Hao's server steps

Same set-up as the #87 steps (`docs/data/protein-audit-2026-10-23.md`, section 10): repo in `/var/www/nutrition-meals`, `DATABASE_URL` from `deploy/.env.prod`, every command in a throw-away container. This job does not depend on #87's rows in the database; run #87 first anyway so the state matches the key fixture. **Order: backup, SQL (ROLLBACK, then COMMIT), dry run, import, check.**

```bash
# 0. files
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin main
git show origin/main:docs/data/protein-followup-2026-10-23.json > ~/protein-followup-2026-10-23.json
git show origin/main:docs/data/protein-followup-2026-10-23-source-fix.sql > ~/protein-followup-2026-10-23-source-fix.sql
python3 -c "import json; print(len(json.load(open('/home/deploy/protein-followup-2026-10-23.json'))), 'rows')"
# expected: 5 rows

# 1. backup (write down N)
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-protein-followup-1023.sql.gz
gunzip -c ~/backups/foods-before-protein-followup-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '

# 2a. SQL as committed (ends in ROLLBACK)
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"' < ~/protein-followup-2026-10-23-source-fix.sql
# expected: BEGIN, a SELECT of 5 rows on the old keys, 5 x UPDATE 1, a SELECT on the new keys with Cá nục (nấu chín) archived, ROLLBACK
# stop on any UPDATE 0, fewer than 5 rows, or a "duplicate key value" error

# 2b. the same file with COMMIT
sed 's/^ROLLBACK;$/COMMIT;/' ~/protein-followup-2026-10-23-source-fix.sql \
  | docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"'

# 3. dry run
docker run --rm --network host -v "$PWD":/src -v ~/protein-followup-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
# expected: Loaded 5 food records ... 90.0% average coverage ... across 5 foods

# 4. import
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/protein-followup-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
# expected last line: Successfully imported 5 foods into nutrition.foods

# 5. check
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT left(f.id::text,8) AS id8, f.name_vi, f.source, f.source_id, f.per_100g->>'energy' AS kcal, f.per_100g->>'protein' AS p, f.per_100g->>'fat' AS fat, f.is_archived
FROM nutrition.foods f
WHERE f.id::text LIKE ANY (ARRAY['ca083cb1%','fa91a51f%','6a8848b1%','baa7ce9f%','c6950aa7%']) OR f.source_id = 'FDC 171778'
ORDER BY f.name_vi, f.source;
SELECT count(*) AS total, count(*) FILTER (WHERE is_archived) AS archived FROM nutrition.foods;
SELECT count(*) AS old_keys FROM nutrition.foods WHERE source_id IN ('FDC 167812','FDC 173672','FDC 168226','NIN 8022');
SQL
```

Expected: the 6 rows of the table in section 7; `total` = **N + 1** (the one new row), `archived` = the number before + 1; `old_keys` = 0.

## 9. Rolling back

```sql
BEGIN;
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 167812' WHERE id = 'ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0' AND source = 'vn_nin' AND source_id = 'NIN 7018';  -- Ba chỉ heo (sống)
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 173672' WHERE id = 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9' AND source = 'vn_nin' AND source_id = 'NIN 8020';  -- Cá nục (sống)
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 168226' WHERE id = 'c6950aa7-e519-417a-a4f7-b68957960a83' AND source = 'vn_nin' AND source_id = 'NIN 7032';  -- Chân giò heo (sống)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 8022' WHERE id = 'fa91a51f-7fe4-4bf7-81aa-3023ed58dec2' AND source = 'usda_sr_legacy' AND source_id = 'FDC 173680:ca-loc-song';  -- Cá lóc (cá quả, sống)
UPDATE nutrition.foods SET is_archived = false WHERE id = '6a8848b1-1ba9-4506-b41f-d28af941e6cb';  -- Cá nục (nấu chín)
DELETE FROM nutrition.foods WHERE source = 'usda_sr_legacy' AND source_id = 'FDC 171778';  -- Thịt bò nạc (nấu chín); no diary entry can point at it yet; check first: SELECT count(*) FROM nutrition.diary_entries WHERE food_id = (SELECT id FROM nutrition.foods WHERE source_id = 'FDC 171778');
COMMIT;
```

Then the values of the four moved rows come from the dump of step 1 (`gunzip -c ~/backups/foods-before-protein-followup-1023.sql.gz | grep -e ca083cb1 -e baa7ce9f -e c6950aa7 -e fa91a51f`); do not restore the whole dump over the live tables. The pairs and the key fixture go back with a revert of this PR's data files. Past diary entries keep their own snapshot and are untouched.

