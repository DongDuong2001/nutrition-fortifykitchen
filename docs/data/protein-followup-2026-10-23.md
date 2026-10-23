# Protein follow-up 23/10/2026: pair and recipe keys, Ba chỉ heo / Cá nục / Chân giò, a cooked Thịt bò nạc

Data job `data/protein-followup-1023`, from `origin/main` 86d8b69a (after #87), updated 23/10 for Hao's decisions on #93. Snapshot: `food-research/live-1023/all.json`, with #87 applied on top (its SQL and import were run on the scratch database first, so the state is the one production will be in). Nothing here touched production: every SQL, import and check ran on a throw-away local Postgres. **Hao runs the SQL and the import after review.**

## 1. The short version

Hao's decisions on #93 and what was done:

1. **Ba chỉ heo, Cá nục, Chân giò: losses accepted.** The USDA rows were the wrong food (US pork belly with 53 g fat; mackerel, not scad). Marked accepted in the allow file; `protein-audit-2026-10-23-noloss.py` exits 0.
2. **Cá lóc: not moved to USDA pike.** The raw row stays on NIN 8022 (snakehead). NIN has no cooked snakehead, so the rule is: archive the USDA pike cooked row and drop the pair. **The pair is dropped; the pike row is not archived yet**, because the dish "Cá lóc kho tiêu" is built on it (100 g, plus a 50 g add-on, in a serving of 158 g). Archiving it would leave that recipe pointing at a hidden row. Options in section 2; this PR leaves the row live and unpaired.
3. **Yields: the old ones are kept** (74 / 76 / 74), not taken from NIN's cooked rows. The three pairs stay flagged by the pair check (section 5).
4. **The other 32 held rows stay on USDA.** Section 4 lists, separately, the rows whose USDA record is a different species, class or cut from the name (6 rows plus their cooked or raw siblings), for a row-by-row decision.

Result: **3 moves, 1 insert (a cooked Thịt bò nạc), 1 archive**; failing raw/cooked pairs **52 → 49** (material 27 → 24); the key test (section 6) passes; dish recipes are unchanged.

## 2. What changes

Per 100 g, before = live row after #87. Every moved row keeps its **id**, name, category, tip and portions; the import replaces its nutrient map and `name` (English) from the new source.

| Row (id) | Before kcal / P / F | After | Key | Lost / new | Why |
|---|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | 518 / 9.34 / 53.01 | 260 / 16.5 / 21.5 | `usda_sr_legacy|FDC 167812` → `vn_nin|NIN 7018` | lost 7: b12 0.84, cholesterol 72, vitamin_e 0.39; zeros: carbs, fiber, sugars, vitamin_k · new 0 | Hao: Ba chỉ heo raw side moves to NIN 7018 (same source as both cooked rows) (losses accepted by Hao) |
| Cá nục (sống) (`baa7ce9f`) | 158 / 20.07 / 7.89 | 111 / 20.2 / 3.3 | `usda_sr_legacy|FDC 173672` → `vn_nin|NIN 8020` | lost 7: b12 4.4, cholesterol 47, vitamin_c 2, vitamin_d 9.1; zeros: carbs, fiber, sugars · new 0 | Hao: Cá nục (sống) to NIN 8020 (losses accepted by Hao) |
| Chân giò heo (sống) (`c6950aa7`) | 193 / 19.87 / 11.96 | 230 / 15.7 / 18.6 | `usda_sr_legacy|FDC 168226` → `vn_nin|NIN 7032` | lost 9: b12 0.54, cholesterol 67, trans_fat 0.095, vitamin_d 0.5, vitamin_e 0.31; zeros: carbs, fiber, sugars, vitamin_k · new 0 | Hao: Chân giò heo (sống) to NIN 7032 (losses accepted by Hao) |
| Thịt bò nạc (nấu chín) (**new row**) | – | 167 / 27.5 / 6.4 | `usda_sr_legacy|FDC 171778` (insert) | new row, nothing to lose | The cooked twin of the raw row `FDC 171779` (the same USDA composite of lean retail cuts, select, trimmed to 1/8" fat). Portions as the raw row |
| Cá nục (nấu chín) (`6a8848b1`) | 201 / 25.73 / 10.12 | archived | `usda_sr_legacy|FDC 171994` | – | Wrong duplicate: the NIN rows Cá nục (luộc) 133 / 24.3 / 4.0 and (nướng) 138 / 25.3 / 4.1 are the same fish in the same states; this USDA row is 51 % higher in kcal and 154 % in fat. Its only pair (with the raw row) is removed. `is_archived = true` hides it from search and the library; nothing is deleted |

**Cá lóc.** The raw row `vn_nin|NIN 8022` (97 / 18.2 / 2.7) is untouched. Its pair with the USDA cooked row is removed because that row (`FDC 175127`, 113 / 24.7 / 0.9) is northern pike, not snakehead, and NIN has no cooked cá quả (only raw 8022 and a dried floss, 8058). The pike row stays live for now: the recipe `recipe_calc|recipe:ca-loc-kho-tieu` uses it as its protein (100 g, add-on "+ Cá" 50 g). To archive it Hao picks one:

1. **Retune the dish first** (with the other dish rows): rebuild the recipe on the raw NIN 8022 at raw-equivalent grams (100 g cooked ÷ 0.74 ≈ 135 g raw, add-on 68 g) and its serving grams (158 → 193), then archive the pike row. Consistent, but it touches the dish's portion maths.
2. **Archive now and re-point the ingredient** to NIN 8022 at the same 100 g: no other number changes, but the fish part then carries 26 % less protein than the dish row (97 against 113 kcal, 18.2 against 24.7 g protein) until the dish is retuned.
3. **Keep the pike row** as the dish's ingredient, unpaired, and never show it as a cá lóc food (it is the cooked row of a dish, not a catalogue entry people choose): today it is listed in search as "Cá lóc (nấu chín)".

**The pairs file** (`tests/fixtures/raw-cooked-pairs.json`, the research file; `lib/data/raw-cooked-pairs.slim.json` is regenerated from it by `scripts/slim-pairs.mjs`, and `raw-cooked-data.test.ts` fails on any drift):

| Pair | Yield before | Yield after | Note |
|---|---|---|---|
| Ba chỉ heo (sống) → `vn_nin|NIN 7018002` | 74 | 74 | raw key moved to NIN 7018; yield kept (Hao), pair stays flagged |
| Ba chỉ heo (sống) → `vn_nin|NIN 7086` | 76 | 76 | raw key moved to NIN 7018; yield kept (Hao), pair stays flagged |
| Chân giò heo (sống) → `vn_nin|NIN 7032002` | 74 | 74 | raw key moved to NIN 7032; yield kept (Hao), pair stays flagged |
| Cá nục (sống) → `vn_nin|NIN 8020002` | 77 | 77 | raw key moved to NIN 8020; the fillet yield passes the pair check |
| Cá nục (sống) → `vn_nin|NIN 8020014` | 80 | 80 | raw key moved to NIN 8020; the fillet yield passes the pair check |
| Cá nục (sống) → `usda_sr_legacy|FDC 171994` | 78 | removed | pair removed: the USDA cooked row is archived (wrong duplicate of the NIN luộc / nướng rows) |
| Cá lóc (cá quả, sống) → `usda_sr_legacy|FDC 175127` | 74 | removed | pair removed (Hao): the cooked row is USDA pike, not snakehead, and NIN has no cooked snakehead |
| Thịt bò nạc → `usda_sr_legacy|FDC 171778` | – | 81 | new pair |

The yields of the three Ba chỉ heo / Chân giò pairs are the old table yields (74 / 76 / 74, from the USDA cooking-yield tables of related cuts), as Hao decided; their `yield_source` text now says the raw side is NIN and the yield was kept. NIN's cooked rows are scaled copies of NIN's raw rows (7018002 = 7018 × 0.85, 7032002 = 7032), so a yield taken from them would be 118 % and 100 %, which is not physical.

## 3. The no-loss check on this PR

```
ALLOWED  vn_nin|NIN 7018 (Ba chỉ heo (sống)): lost 7, new 0
           lost b12 = 0.84  [allowed]
           lost carbs = 0  [allowed]
           lost cholesterol = 72  [allowed]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost vitamin_e = 0.39  [allowed]
           lost vitamin_k = 0  [allowed]
ALLOWED  vn_nin|NIN 8020 (Cá nục (sống)): lost 7, new 0
           lost b12 = 4.4  [allowed]
           lost carbs = 0  [allowed]
           lost cholesterol = 47  [allowed]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost vitamin_c = 2  [allowed]
           lost vitamin_d = 9.1  [allowed]
ALLOWED  vn_nin|NIN 7032 (Chân giò heo (sống)): lost 9, new 0
           lost b12 = 0.54  [allowed]
           lost carbs = 0  [allowed]
           lost cholesterol = 67  [allowed]
           lost fiber = 0  [allowed]
           lost sugars = 0  [allowed]
           lost trans_fat = 0.095  [allowed]
           lost vitamin_d = 0.5  [allowed]
           lost vitamin_e = 0.31  [allowed]
           lost vitamin_k = 0  [allowed]
NO ROW   usda_sr_legacy|FDC 171778 (Thịt bò nạc (nấu chín)): not in the snapshot and not moved by the SQL: it would be an INSERT
RESULT: pass (no unlisted loss)
```

Exit code **0**. The zeros are listed with the reason "zero in the old USDA row; NIN prints no value"; the real values (b12, cholesterol, vitamin C / D / E, trans fat) carry "accepted by Hao 23/10: the USDA row was the wrong food". The script reports a reason that starts with `PENDING` and keeps the exit code at 1 until somebody rewrites it; none is left. Nothing else loses anything: the Cá lóc raw row is not touched and the new Thịt bò nạc row is an insert.

## 4. The 35 held rows from #87

**Decided (Hao, 23/10): the other 32 stay on USDA.** Of the 35, 3 moved (Ba chỉ heo, Cá nục (sống), Chân giò heo (sống)); nothing else changes. The values are real; only the "NIN first" rule is not met, and none of the 32 is in a mixed NIN / USDA pair (section 5). If the rule changes later (accepting the losses, or carrying the USDA values into the NIN record), the table below is the list and the machinery of this PR applies unchanged.

### 4.1 Exceptions: the USDA record is a different species, class or cut from the name

Read off the USDA description of each of the 32 against its Vietnamese name (species, state, cut). Every other row matches: kidneys, livers, hearts, tongue and gizzard are the same organs; carp, Spanish mackerel and the dry beans are the same food; the lean pork and beef cuts are the cuts the names say (top loin = thăn ngoại, tenderloin = thăn, lean shoulder = nạc vai); the states agree (hầm / luộc = simmered or braised, nấu chín = cooked). No state mismatch was found. **For Hao to decide row by row** (nothing here moves):

| Row (id) | USDA record | What differs from the name | NIN alternative | Moving it would lose | Siblings |
|---|---|---|---|---|---|
| Gà ta (sống) (`c9c2e282`) | `FDC 172400` Chicken, stewing, meat and skin, raw (258 / 17.55 / 20.33) | **class**: USDA stewing hen (an old laying hen), meat and skin; "gà ta" is the local free-range bird, leaner in the body and eaten young or boiled whole | NIN 7013 Thịt gà ta, tươi (199 / 20.3 / 13.1) | b12 0.32, cholesterol 71; zeros: carbs, fiber, sugars | Gà ta (luộc) `FDC 172401` (stewing, stewed); NIN has gà ta luộc parts (7105002, 7106002, 7107002) with other cuts |
| Sườn non heo (sống) (`cd142e49`) | `FDC 167853` Pork, fresh, spareribs, separable lean and fat, raw (277 / 15.47 / 23.4) | **cut**: USDA spareribs, lean and fat; "sườn non" is the young rib (baby back / riblets), a different cut from spareribs. The NIN row has about half the fat (12.8 g against 23.4 g) | NIN 7053 Sườn lợn, tươi (187 / 17.9 / 12.8) | b12 0.38, cholesterol 80, trans_fat 0.222; zeros: carbs, fiber, sugars, vitamin_a, vitamin_c, vitamin_k | Sườn non heo (hầm) `FDC 167854` (spareribs braised). Hao: stays USDA for now |
| Tôm thẻ (tôm chân trắng) (`574722b9`) | `FDC 174210:tom-the-song` Crustaceans, shrimp, mixed species, raw (71 / 13.61 / 1.01) | **species**: USDA mixed shrimp species; "tôm thẻ (tôm chân trắng)" is the whiteleg shrimp. NIN has only "tôm biển" (sea shrimp), not whiteleg | NIN 8051 Tôm biển, tươi (82 / 17.6 / 0.9) | b12 1.11, cholesterol 126, trans_fat 0.018, vitamin_k 0.3; zeros: fiber, sugars, vitamin_c | identical to the row "Tôm" (`FDC 174210`); Tôm thẻ (luộc) below is the cooked twin |
| Tôm thẻ (luộc) (`03e8249c`) | `FDC 171971:tom-the-luoc` Crustaceans, shrimp, mixed species, cooked, moist heat (119 / 22.78 / 1.7) | **species**: USDA mixed shrimp species, cooked; the name says whiteleg | NIN 8051002 Tôm biển, luộc (82 / 17.6 / 0.9) | trans_fat 0.035, vitamin_k 0.4; zeros: fiber, sugars, vitamin_c | identical to the row "Tôm luộc" (`FDC 171971`) |
| Cá diêu hồng (sống) (`3063ec03`) | `FDC 175176:ca-dieu-hong-song` Fish, tilapia, raw (96 / 20.08 / 1.7) | **species**: USDA tilapia (Nile); "cá diêu hồng" is the red tilapia hybrid. NIN 8062 is exactly the red tilapia (but its state is not stated) | NIN 8062 Cá điêu hồng (111 / 17.1 / 3.3) | b12 1.58, b3 3.903, b5 0.487, b6 0.162, cholesterol 50, copper 0.075, folate 24, magnesium 27, manganese 0.037, monounsaturated_fat 0.498, polyunsaturated_fat 0.363, potassium 302, saturated_fat 0.585, selenium 41.8, sodium 52, vitamin_d 3.1, vitamin_k 1.4; zeros: fiber, sugars, vitamin_c | identical to the row "Cá rô phi (sống)" (`FDC 175176`); the cooked sister "Cá diêu hồng (nấu chín)" `FDC 175177:ca-dieu-hong-chin` has no NIN cooked row |
| Cá ngừ tươi (sống) (`1ac93144`) | `FDC 175159` Fish, tuna, fresh, yellowfin, raw (109 / 24.4 / 0.49) | **species**: USDA yellowfin tuna; "cá ngừ tươi" is the generic tuna (the skipjack has its own row, "Cá ngừ vằn"). Narrower than the name, not wrong | NIN 8019 Cá ngừ, tươi (87 / 21 / 0.3) | b12 2.08, cholesterol 39, trans_fat 0.016, vitamin_d 1.7; zeros: carbs, fiber, sugars | cooked sister "Cá ngừ tươi (nấu chín)" `FDC 172006` |

Seen outside the 35, for information (not part of this decision): **Cá lóc (nấu chín)** is USDA northern pike (section 2); **Sò lông (hấp / sống)** carry generic clam values (blood cockle is a different shellfish; NIN 8081 looks like a dried value); **Thịt vịt bỏ da** and **Đùi gà bỏ da / Má đùi gà có da** are skinless / skin-on USDA cuts that NIN does not describe by skin, so there is no NIN cut verdict.

### 4.2 All 35 rows

| Row (id) | Cut label (#87) | NIN match | Outcome | A move to NIN would lose |
|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | nearest | NIN 7018 | **Moved** (Hao decided, losses accepted) | b12 0.84, cholesterol 72, vitamin_e 0.39; zeros: carbs, fiber, sugars, vitamin_k |
| Cá chép (sống) (`1059c25a`) | same cut | NIN 8003 | Stays USDA (Hao: leave) | b12 1.53, cholesterol 66, vitamin_c 1.6; zeros: carbs, fiber, sugars |
| Cá diêu hồng (sống) (`3063ec03`) | nearest | NIN 8062 | Stays USDA; **exception, see 4.1** | b12 1.58, b3 3.903, b5 0.487, b6 0.162, cholesterol 50, copper 0.075, folate 24, magnesium 27, manganese 0.037, monounsaturated_fat 0.498, polyunsaturated_fat 0.363, potassium 302, saturated_fat 0.585, selenium 41.8, sodium 52, vitamin_d 3.1, vitamin_k 1.4; zeros: fiber, sugars, vitamin_c |
| Cá ngừ tươi (sống) (`1ac93144`) | nearest | NIN 8019 | Stays USDA; **exception, see 4.1** | b12 2.08, cholesterol 39, trans_fat 0.016, vitamin_d 1.7; zeros: carbs, fiber, sugars |
| Cá nục (sống) (`baa7ce9f`) | nearest | NIN 8020 | **Moved** (Hao decided, losses accepted) | b12 4.4, cholesterol 47, vitamin_c 2, vitamin_d 9.1; zeros: carbs, fiber, sugars |
| Cá thu (sống) (`5ec507be`) | nearest | NIN 8026 | Stays USDA (Hao: leave) | b12 2.4, b5 0.75, b6 0.4, cholesterol 76, folate 1, manganese 0.014, selenium 36.5, vitamin_c 1.6, vitamin_d 7.3, vitamin_e 0.69, vitamin_k 0.1, zinc 0.49; zeros: carbs, fiber, sugars |
| Cật bò (hầm) (`6f4dabb9`) | same cut | NIN 7029002 | Stays USDA (Hao: leave) | zeros: fiber, sugars, vitamin_k |
| Cật bò (sống) (`65b1a772`) | same cut | NIN 7029 | Stays USDA (Hao: leave) | b12 27.5, cholesterol 411, trans_fat 0.1; zeros: fiber, sugars, vitamin_k |
| Cật heo (nấu chín) (`b5d44a63`) | same cut | NIN 7030002 | Stays USDA (Hao: leave) | zeros: fiber |
| Cật heo (sống) (`1bd282d5`) | same cut | NIN 7030 | Stays USDA (Hao: leave) | b12 8.49, cholesterol 319; zeros: fiber |
| Chân giò heo (sống) (`c6950aa7`) | nearest | NIN 7032 | **Moved** (Hao decided, losses accepted) | b12 0.54, cholesterol 67, trans_fat 0.095, vitamin_d 0.5, vitamin_e 0.31; zeros: carbs, fiber, sugars, vitamin_k |
| Đậu hũ (đậu phụ trắng) (`49999be4`) | same cut | NIN 3025 | Stays USDA (Hao: leave) | sugars 0.62, vitamin_e 0.01, vitamin_k 2.4; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Đậu trắng (hạt khô) (`bcd82617`) | same cut | NIN 3008 | Stays USDA (Hao: leave) | copper 0.984, magnesium 190, manganese 1.796, potassium 1795, selenium 12.8, sodium 16, sugars 2.11, zinc 3.67; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Đậu xanh (hạt khô) (`0e027e38`) | same cut | NIN 3010 | Stays USDA (Hao: leave) | manganese 1.035, selenium 8.2, sugars 6.6; zeros: b12, cholesterol, trans_fat, vitamin_d |
| Gà ta (sống) (`c9c2e282`) | nearest | NIN 7013 | Stays USDA; **exception, see 4.1** | b12 0.32, cholesterol 71; zeros: carbs, fiber, sugars |
| Gan bò (sống) (`28431e98`) | same cut | NIN 7039 | Stays USDA (Hao: leave) | b12 59.3, cholesterol 275, trans_fat 0.17; zeros: alcohol, fiber, sugars |
| Gan gà (nấu chín) (`fdd32845`) | same cut | NIN 7040002 | Stays USDA (Hao: leave) | zeros: alcohol, fiber, sugars, vitamin_d, vitamin_k |
| Gan gà (sống) (`8c393043`) | same cut | NIN 7040 | Stays USDA (Hao: leave) | b12 16.6, cholesterol 345, trans_fat 0.065; zeros: alcohol, fiber, sugars, vitamin_d, vitamin_k |
| Lưỡi bò (hầm) (`7081686c`) | same cut | NIN 7044002 | Stays USDA (Hao: leave) | trans_fat 0.84, vitamin_d 0.4, vitamin_e 0.3, vitamin_k 1.2; zeros: fiber, sugars, vitamin_a |
| Lưỡi bò (sống) (`f8021f1d`) | same cut | NIN 7044 | Stays USDA (Hao: leave) | b12 3.79, cholesterol 87; zeros: fiber, vitamin_a |
| Mề gà (luộc) (`a949808e`) | same cut | NIN 7048002 | Stays USDA (Hao: leave) | zeros: fiber, sugars, vitamin_d, vitamin_k |
| Nạc vai heo (nấu chín) (`606b5bbc`) | same cut | NIN 7083002 | Stays USDA (Hao: leave) | b12 0.86, b3 4.26, b5 0.651, b6 0.317, cholesterol 90, copper 0.124, folate 5, magnesium 20, manganese 0.026, monounsaturated_fat 6.17, polyunsaturated_fat 1.25, potassium 346, saturated_fat 4.79, selenium 37.4, sodium 75, vitamin_c 0.6, vitamin_d 1; zeros: carbs, fiber, sugars, vitamin_k |
| Sườn non heo (sống) (`cd142e49`) | nearest | NIN 7053 | Stays USDA; **exception, see 4.1** | b12 0.38, cholesterol 80, trans_fat 0.222; zeros: carbs, fiber, sugars, vitamin_a, vitamin_c, vitamin_k |
| Thăn ngoại bò (sống) (`e0bfb3e9`) | same cut | NIN 7005 | Stays USDA (Hao: leave) | b12 1.13, cholesterol 53; zeros: fiber, sugars, vitamin_a, vitamin_c |
| Thịt dê (sống) (`f3973d66`) | nearest | NIN 7011 | Stays USDA (Hao: leave) | b12 1.13, cholesterol 57; zeros: carbs, fiber |
| Thịt heo nạc (thăn) nấu chín (`df249c8d`) | same cut | NIN 7085002 | Stays USDA (Hao: leave) | b12 0.57, b3 7.43, b5 1.01, b6 0.74, cholesterol 73, copper 0.11, magnesium 29, manganese 0.013, monounsaturated_fat 1.33, polyunsaturated_fat 0.51, potassium 421, saturated_fat 1.2, selenium 38.2, sodium 57, trans_fat 0.033, vitamin_d 0.2, vitamin_e 0.08; zeros: fiber, folate, sugars, vitamin_a, vitamin_c, vitamin_k |
| Tim bò (hầm) (`9b52d79e`) | same cut | NIN 7055002 | Stays USDA (Hao: leave) | vitamin_d 0.1, vitamin_k 0.5; zeros: fiber, sugars |
| Tim bò (sống) (`6e406d98`) | same cut | NIN 7055 | Stays USDA (Hao: leave) | b12 8.55, cholesterol 124, trans_fat 0.18; zeros: fiber, sugars, vitamin_k |
| Tim gà (sống) (`6019bf63`) | same cut | NIN 7056 | Stays USDA (Hao: leave) | b12 7.29, carbs 0.71, cholesterol 136; zeros: fiber |
| Tim heo (sống) (`d5be8d10`) | same cut | NIN 7057 | Stays USDA (Hao: leave) | b12 3.79, cholesterol 131, vitamin_e 0.63; zeros: fiber, sugars |
| Tôm (`1c6a0a1a`) | same cut | NIN 8051 | Stays USDA (Hao: leave) | b12 1.11, cholesterol 126, trans_fat 0.018, vitamin_k 0.3; zeros: fiber, sugars, vitamin_c |
| Tôm luộc (`246422a6`) | same cut | NIN 8051002 | Stays USDA (Hao: leave) | trans_fat 0.035, vitamin_k 0.4; zeros: fiber, sugars, vitamin_c |
| Tôm thẻ (luộc) (`03e8249c`) | nearest | NIN 8051002 | Stays USDA; **exception, see 4.1** | trans_fat 0.035, vitamin_k 0.4; zeros: fiber, sugars, vitamin_c |
| Tôm thẻ (tôm chân trắng) (`574722b9`) | nearest | NIN 8051 | Stays USDA; **exception, see 4.1** | b12 1.11, cholesterol 126, trans_fat 0.018, vitamin_k 0.3; zeros: fiber, sugars, vitamin_c |
| Ức gà (`74e55541`) | nearest | NIN 7089 | Stays USDA (Hao: leave) | b1 0.094, b12 0.21, b3 9.6, b5 1.5, b6 0.81, cholesterol 73, copper 0.037, folate 9, magnesium 28, manganese 0.011, monounsaturated_fat 0.69, polyunsaturated_fat 0.42, potassium 334, saturated_fat 0.56, selenium 22.8, sodium 45, trans_fat 0.007; zeros: carbs, fiber, sugars, vitamin_c, vitamin_d, vitamin_k |

Tôm and Tôm luộc are labelled *same cut* here (whole peeled shrimp; USDA mixed species against NIN sea shrimp): in #87 they were *nearest*.

## 5. Pair check after this PR

`python3 docs/data/protein-audit-2026-10-23-pairs.py <catalogue export> apps/web/lib/data/raw-cooked-pairs.slim.json`, run on the catalogue as it is after #87 and this PR (the scratch database exported in the same shape as `all.json`; the 23/10 export alone lacks the new keys and reports them as missing): **126 pairs, 126 checked, 0 missing a row, 49 failing (24 material, 25 minor)**. Before: 52 failing (27 material).

- **Fixed:** Cá nục (luộc) and Cá nục (nướng) (raw side NIN 8020, fillet yields kept; the USDA pair is gone with the archived row). The Cá lóc pair is removed, not fixed.
- **Flagged on purpose (Hao: keep the old yields):**

| Gap | Yield | Raw row (kcal / P / F) | Cooked row (kcal / P / F) | Findings |
|---|---|---|---|---|
| 97 | 74 | Ba chỉ heo (sống) `vn_nin\|NIN 7018` 260 / 16.5 / 21.5 | Thịt ba chỉ heo (luộc) `vn_nin\|NIN 7018002` 220 / 14 / 18.2 | protein off (×1.59); fat renders out (×1.60); energy renders out (×1.60) |
| 60 | 74 | Chân giò heo (sống) `vn_nin\|NIN 7032` 230 / 15.7 / 18.6 | Thịt chân giò heo (luộc) `vn_nin\|NIN 7032002` 230 / 15.7 / 18.6 | protein off (×1.35); fat renders out (×1.35); energy renders out (×1.35) |
| 47 | 76 | Ba chỉ heo (sống) `vn_nin\|NIN 7018` 260 / 16.5 / 21.5 | Thịt ba chỉ heo (nướng) `vn_nin\|NIN 7086` 401 / 20.5 / 35.2 | fat appears (×0.80) |

  They flag because NIN's cooked rows are scaled copies (or, for the grilled row, carry more fat than the raw row can supply); the keys are right and the raw and cooked rows now share a source.
- **Same-source "renders out" / "appears" pairs: kept**, as Hao decided.
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

The other 38 failing pairs are same-source (kept), the three above included. The Thịt bò nạc pair passes: raw 130 / 22.4 / 4.5, cooked 167 / 27.5 / 6.4, yield 81 (protein ×1.00, fat ×0.88, kcal ×0.96).

## 6. The key test

`lib/__tests__/data-keys.test.ts` fails when a key in `raw-cooked-pairs.slim.json` or `dish-recipes.slim.json` (dishes, ingredients, alternatives) is not a live food. The live keys are `tests/fixtures/live-food-keys.json` (1,305 keys: the catalogue after #87 and this PR, archived rows left out), regenerated from a catalogue export with `node scripts/live-keys.mjs export.json` in the same PR as any data job that moves, adds or archives a source/source_id. Before this PR every key in both files resolved (checked against the 23/10 snapshot and the post-#87 state), so #87 broke no link. Proof that the test bites: with `vn_nin|NIN 7018` removed from the fixture it fails and names the key. The archived Cá nục (nấu chín) row is in no pair or recipe; the pike row stays live because the recipe uses it.

`lib/__tests__/food-twins.test.ts` built its catalogue from the pairs file and used two pairs as examples: Thịt bò nạc (as the food the research has no pair for; it has one now, so the hand-built example is Thịt cừu nạc) and Cá lóc (its pair is removed, so the examples are Cá chép, another real raw/cooked fish pair). No other test changed.

## 7. Gates and dry run (scratch Postgres, not production)

```
$ go run ./cmd/importfoods --dry-run --file docs/data/protein-followup-2026-10-23.json
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 4 food records from docs/data/protein-followup-2026-10-23.json
Completeness Report: 87.5% average coverage of the 22 counted nutrients across 4 foods
```

- Scratch database from `live-1023/all.json`, then #87 as Hao will run it: `Successfully imported 5 foods into nutrition.foods`; total foods 1306, archived 1.
- Follow-up SQL as committed (ROLLBACK): 1× `BEGIN`, 4× `UPDATE 1`, 1× `ROLLBACK`; afterwards 3 rows are still on their old keys. With `COMMIT`: 1× `BEGIN`, 4× `UPDATE 1`, 1× `COMMIT`. Second run: 1× `BEGIN`, 4× `UPDATE 0`, 1× `COMMIT` (harmless).
- Real import: `Successfully imported 4 foods into nutrition.foods`; run again the same: `Successfully imported 4 foods into nutrition.foods`. Total foods **1307** (was 1306: **one row added**, Thịt bò nạc (nấu chín)), archived 2, rows with the three old keys: 0.

| id | name_vi | source | source_id | kcal | P | F | C | fib | archived | portions |
|---|---|---|---|---|---|---|---|---|---|---|
| `ca083cb1` | Ba chỉ heo (sống) | vn_nin | `NIN 7018` | 260 | 16.5 | 21.5 | – | – | no | 100 g = 100; 1 lát ba chỉ = 30; 1 phần ăn = 150 |
| `6a8848b1` | Cá nục (nấu chín) | usda_sr_legacy | `FDC 171994` | 201 | 25.73 | 10.12 | 0 | 0 | yes | 100 g = 100; 1 con cá nục (phần ăn được) = 55 |
| `baa7ce9f` | Cá nục (sống) | vn_nin | `NIN 8020` | 111 | 20.2 | 3.3 | – | – | no | 100 g = 100; 1 con cá nục (phần ăn được) = 70 |
| `c6950aa7` | Chân giò heo (sống) | vn_nin | `NIN 7032` | 230 | 15.7 | 18.6 | – | – | no | 100 g = 100; 1 khúc chân giò = 300 |
| `4449700b` | Thịt bò nạc (nấu chín) | usda_sr_legacy | `FDC 171778` | 167 | 27.5 | 6.4 | 0 | 0 | no | 150 g = 150; 100 g = 100 |

- Unit tests (`npx vitest run`): **200 of 201 files, 2,714 tests pass**; the one failing file is `components/ui/__tests__/icons.test.tsx`, which cannot import `@mynaui/icons-react`: this worktree borrowed the `node_modules` of another checkout that lacks two packages the lockfile has (`@mynaui/icons-react`, `html-to-image`; the same two give the 3 `tsc` errors). Nothing in this PR touches them; CI installs its own, so CI is the real gate.
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
# expected: 4 rows

# 1. backup (write down N)
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-protein-followup-1023.sql.gz
gunzip -c ~/backups/foods-before-protein-followup-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '

# 2a. SQL as committed (ends in ROLLBACK)
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"' < ~/protein-followup-2026-10-23-source-fix.sql
# expected: BEGIN, a SELECT of 4 rows on the old keys, 4 x UPDATE 1, a SELECT on the new keys with Cá nục (nấu chín) archived, ROLLBACK
# stop on any UPDATE 0, fewer than 4 rows, or a "duplicate key value" error

# 2b. the same file with COMMIT
sed 's/^ROLLBACK;$/COMMIT;/' ~/protein-followup-2026-10-23-source-fix.sql \
  | docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"'

# 3. dry run
docker run --rm --network host -v "$PWD":/src -v ~/protein-followup-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
# expected: Loaded 4 food records ... 87.5% average coverage ... across 4 foods

# 4. import
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/protein-followup-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
# expected last line: Successfully imported 4 foods into nutrition.foods

# 5. check
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT left(f.id::text,8) AS id8, f.name_vi, f.source, f.source_id, f.per_100g->>'energy' AS kcal, f.per_100g->>'protein' AS p, f.per_100g->>'fat' AS fat, f.is_archived
FROM nutrition.foods f
WHERE f.id::text LIKE ANY (ARRAY['ca083cb1%','6a8848b1%','baa7ce9f%','c6950aa7%']) OR f.source_id = 'FDC 171778'
ORDER BY f.name_vi, f.source;
SELECT count(*) AS total, count(*) FILTER (WHERE is_archived) AS archived FROM nutrition.foods;
SELECT count(*) AS old_keys FROM nutrition.foods WHERE source_id IN ('FDC 167812','FDC 173672','FDC 168226');
SQL
```

Expected: the 5 rows of the table in section 7; `total` = **N + 1** (the one new row), `archived` = the number before + 1; `old_keys` = 0.

## 9. Rolling back

```sql
BEGIN;
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 167812' WHERE id = 'ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0' AND source = 'vn_nin' AND source_id = 'NIN 7018';  -- Ba chỉ heo (sống)
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 173672' WHERE id = 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9' AND source = 'vn_nin' AND source_id = 'NIN 8020';  -- Cá nục (sống)
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 168226' WHERE id = 'c6950aa7-e519-417a-a4f7-b68957960a83' AND source = 'vn_nin' AND source_id = 'NIN 7032';  -- Chân giò heo (sống)
UPDATE nutrition.foods SET is_archived = false WHERE id = '6a8848b1-1ba9-4506-b41f-d28af941e6cb';  -- Cá nục (nấu chín)
DELETE FROM nutrition.foods WHERE source = 'usda_sr_legacy' AND source_id = 'FDC 171778';  -- Thịt bò nạc (nấu chín); check first that no diary entry points at it: SELECT count(*) FROM nutrition.diary_entries WHERE food_id = (SELECT id FROM nutrition.foods WHERE source_id = 'FDC 171778');
COMMIT;
```

Then the values of the three moved rows come from the dump of step 1 (`gunzip -c ~/backups/foods-before-protein-followup-1023.sql.gz | grep -e ca083cb1 -e baa7ce9f -e c6950aa7`); do not restore the whole dump over the live tables. The pairs and the key fixture go back with a revert of this PR's data files. Past diary entries keep their own snapshot and are untouched.

