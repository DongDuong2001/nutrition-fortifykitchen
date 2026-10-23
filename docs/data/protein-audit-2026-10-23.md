# Protein audit 23/10/2026: Thịt bò nạc, the fake-id seed rows, and the whole Đạm category

Data job `data/protein-audit-1023`, from `origin/main` 37cdb721. Snapshot: `food-research/live-1023/all.json` (1,306 foods, read 23/10; production was not read again). Nothing here touched production: every SQL and import was run only on a throw-away local Postgres seeded from that snapshot (section 6). **Hao runs the SQL and the import after review.**

**Counts.** 231 live rows have category `dam`; 31 rows have a `food-%` source_id (5 of them are in `dam`); together 257 rows were checked. **9 rows are fixed in this PR, 1 duplicate is archived, 35 more are off by more than 20 % but held** (section 2: moving them would break the raw/cooked pairs and dish recipes the app reads by `source|source_id`). Past diary entries keep their own snapshot (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so nothing already logged changes.

## 1. Summary: rows fixed in this PR

Per 100 g. Before = live 23/10; after = the NIN row named in the last column (all rounded as the earlier import files: energy, protein, carbs, fat, fiber to 0.1; the rest to 3 significant figures). Every fixed row keeps its **id**, its Vietnamese name, category, tip and portions.

| Row (id) | Problem | Before kcal / P / F / C / fib | After | Source |
|---|---|---|---|---|
| Thịt bò nạc (`b1cb7f07`) | Fake FDC id. Values are cooked ground beef (213.33 = 320 kcal / 150 g from the design mock-up), not raw lean beef. 250 g showed ~30 g fat instead of ~10 g. | 213.33 / 26 / 12 / 0 / 0 | 118 / 21 / 3.8 / – / – | NIN 7003 Thịt bò, loại I, tươi; `usda_foundation` / `food-thit-bo-nac` → `vn_nin` / `NIN 7003` |
| Ức gà phi lê (`b6c88da5`) | Fake id. Values are cooked roasted chicken breast (FDC 171477) under a name with no cooking word. Data rule: raw for meat unless the name says cooked. NIN first. | 165 / 31 / 3.6 / 0 / 0 | 134 / 22.9 / 4.7 / – / – | NIN 7089 Thịt gà công nghiệp, lườn, raw; `usda_foundation` / `food-uc-ga` → `vn_nin` / `NIN 7089` |
| Cá hồi (`87c8e2f8`) | Fake id. Generic "Cá hồi" carries USDA farmed Atlantic salmon (exact copy of the row "Cá hồi (Atlantic, nuôi)"). NIN first for a generic food. | 208 / 20.4 / 13.4 / 0 / 0 | 136 / 22 / 5.3 / – / – | NIN 8011 Cá hồi, tươi; `usda_foundation` / `food-ca-hoi` → `vn_nin` / `NIN 8011` |
| Đậu hũ trắng (`245172d0`) | Fake id. USDA regular-tofu values (exact copy of "Đậu hũ (đậu phụ trắng)", FDC 172476); NIN has Đậu phụ. | 76 / 8.1 / 4.8 / 1.9 / 0.3 | 97 / 10.9 / 5.4 / 1.1 / 0.4 | NIN 3025 Đậu phụ, sống; `vn_table` / `food-dau-hu` → `vn_nin` / `NIN 3025` |
| Tàu hủ trắng cứng (hấp/luộc) (`03bcdfd2`) | Wrong state: the name says steamed/boiled but the values are raw firm tofu (FDC 172475). NIN has Đậu phụ luộc. | 144 / 17.3 / 8.72 / 2.78 / 2.3 | 98 / 11 / 5.5 / 1.1 / 0.4 | NIN 3025002 Đậu phụ luộc; `usda_sr_legacy` / `FDC 172475:tau-hu-trang-hap-luoc` → `vn_nin` / `NIN 3025002` |
| Hến (`d2960a7c`) | Generic food from a regional table (PhilFCT) where NIN has it; 2.3x NIN kcal. | 105 / 8.9 / 1.9 / 13 / 0 | 45 / 4.5 / 0.7 / 5.1 / – | NIN 8037 Hến, tươi; `asean` / `PhilFCT G020` → `vn_nin` / `NIN 8037` |
| Bún chả Hà Nội (`d4fd4a6f`) | Fake id. NIN 15034 is the same dish; the row is far above it on all three. | 185 / 11.5 / 5.5 / 22 / 1.2 | 136 / 6.1 / 4.4 / 17.9 / 0.6 | NIN 15034 Bún chả; key unchanged (`vn_table` / `food-bun-cha`) |
| Bún chả Hà Nội (`7b3a8c3f`) | Fake id. NIN 15034 is the same dish; protein is 39 % above NIN. | 145 / 8.5 / 4.8 / 17.2 / 0.8 | 136 / 6.1 / 4.4 / 17.9 / 0.6 | NIN 15034 Bún chả; key unchanged (`vn_fct` / `food-bun-cha`) |
| Phở gà (`c27615c1`) | Fake id. NIN 15067 is the same dish; kcal +44 %, protein +105 %. | 105 / 7.8 / 2.3 / 13.5 / 0.4 | 73 / 3.8 / 1 / 12.3 / 0.6 | NIN 15067 Phở gà; key unchanged (`vn_fct` / `food-pho-ga`) |

**Archived (not deleted):** Mực (`6028095b`, `usda_sr_legacy` / `FDC 174223`, 92 kcal / 15.6 P / 1.4 F). It is the same food as the live NIN row "Mực ống" (NIN 8040: 73 / 16.3 / 0.9), 26 % higher in kcal and 53 % in fat, and nothing in the app reads its key. `is_archived = true` hides it from search and the library; the row, its portions and every diary entry stay.

Notes on the nine fixes:

- **Thịt bò nạc: no code looks the row up by `source` / `source_id`**, so the source moves to `vn_nin` / `NIN 7003` ("Thịt bò, loại I, tươi", Beef, meat, grade I, raw: 118 kcal, 21 P, 3.8 F). Searched `apps/web` (lib, components, tests, scripts), `lib/data/*.json` (pairs and dish recipes) and `lib/training-foods.ts`: `food-thit-bo-nac` appears only in `data/seed_foods.json` and in the demo catalogue (`lib/mock/sample-foods.ts`, `history.ts`, `yesterday.ts`, and `portion-panel.test.tsx`), which use it as a mock id, not as a live key. The demo values (320 kcal for 150 g, the design mock-up) are left alone; this job is data only. After the import carbs and fiber are absent (NIN prints none for 7003; the old 0 / 0 were seed values) and B12 is gone (the old 2.1 was a seed value); 9 NIN values are new (b1, b2, b3, calcium, copper, magnesium, phosphorus, vitamin_c, water).
- **Ức gà phi lê** moves to `vn_nin` / `NIN 7089` ("Thịt gà công nghiệp, lườn, raw": 134 / 22.9 / 4.7). USDA raw skinless breast (FDC 171077, 120 / 22.5 / 2.6) is also live as "Ức gà"; NIN first is the rule. Both are raw; the cooked rows "Ức gà luộc" and "Ức gà nướng" stay. The old numbers equalled "Ức gà nướng" exactly.
- **Cá hồi** (generic): NIN 8011 "Cá hồi, tươi" (136 / 22 / 5.3). The specific rows "Cá hồi (Atlantic, nuôi)" (USDA farmed, 208 / 20.4 / 13.4) and its cooked row stay: they name the species and farming, NIN does not.
- **Đậu hũ trắng** → NIN 3025 "Đậu phụ, sống" (97 / 10.9 / 5.4). "Đậu hũ (đậu phụ trắng)" (USDA regular tofu, 76 / 8.1 / 4.8) is read by a dish recipe, so it stays and is listed as held; the two tofu rows now differ, which is the finding.
- **Tàu hủ trắng cứng (hấp/luộc)** → NIN 3025002 "Đậu phụ luộc" (98 / 11 / 5.5). The name says "cứng" (firm); NIN does not tell firm from regular, so this is the closest boiled tofu with a real source. The `recipe_calc` row "Tàu hủ chiên nồi chiên không dầu" (199 kcal) was computed in the research from tofu values; its ingredient list is not in the snapshot, so check it after the import.
- **Hến** (ASEAN PhilFCT G020, 105 / 8.9 / 1.9) → NIN 8037 "Hến, tươi" (45 / 4.5 / 0.7). The ASEAN generic "Ốc" (PhilFCT G129) is within 20 % of NIN 8041 and stays.
- **Bún chả Hà Nội (both rows) and Phở gà** keep their keys (`vn_table` / `food-bun-cha`, `vn_fct` / `food-bun-cha`, `vn_fct` / `food-pho-ga`): the dish recipes ("Thành phần") are keyed by them. Only the values change, to NIN 15034 and NIN 15067. **Review point:** each recipe adds up to the old row total (Phở gà 98 kcal per 100 g, Bún chả 144 and 171), so after the import the headline (73 and 136 kcal per 100 g) and the sum of the parts disagree until `dish-recipes` is retuned in a frontend PR. If Hao would rather keep these three dish rows, drop their records from the JSON; the SQL does not touch them. After the fix both Bún chả rows hold the same per-100 g values and differ only in portion (350 g and 450 g): a duplicate to merge later.

## 2. Held: off by more than 20 % but not changed in this PR

Rule used: a row is **off** when kcal, protein or fat differs by more than 20 % from the same food in the same state in NIN (else USDA), **and** the gap is at least 10 kcal or 1 g per 100 g. The floor is mine: without it fat 0.2 against 0.1 or kcal 19 against 28 would count; those rows are listed in section 4 as "small difference" so nothing is hidden (section 5, item 1 counts them).

**35 rows are off but held.** Moving their source to `vn_nin` changes the key `source|source_id`, and the app reads that key in `apps/web/lib/data/raw-cooked-pairs.slim.json` (the Cân sống / Đã nấu chín switch, `lib/yield.ts`, `lib/food-twins.ts`) and in `lib/data/dish-recipes.slim.json` (the Thành phần of a dish). 160 of the 231 Đạm keys are in the pairs file and 39 in the recipes file. A data-only change would silently break those links. The proposed records are ready in `docs/data/protein-audit-2026-10-23-held-do-not-import.json` (importer format, dry-run passes, **do not import it** before the keys in the two slim files and their research sources are moved too: a follow-up PR on `apps/web`, which the repo rules reserve for the UI side).

| Row (id) | key now | Dependency | Before kcal / P / F | NIN match | After | Δ now vs NIN (kcal/P/F/C/fib %) |
|---|---|---|---|---|---|---|
| Ba chỉ heo (sống) (`ca083cb1`) | `usda_sr_legacy\|FDC 167812` | raw/cooked pair | 518 / 9.34 / 53.01 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | 260 / 16.5 / 21.5 | +99/-43/+147/–/– |
| Cá chép (sống) (`1059c25a`) | `usda_sr_legacy\|FDC 171952` | raw/cooked pair | 127 / 17.83 / 5.6 | NIN 8003 Cá chép, tươi | 96 / 16 / 3.6 | +32/+11/+56/–/– |
| Cá diêu hồng (sống) (`3063ec03`) | `usda_sr_legacy\|FDC 175176:ca-dieu-hong-song` | raw/cooked pair | 96 / 20.08 / 1.7 | NIN 8062 Cá điêu hồng | 111 / 17.1 / 3.3 | -14/+17/-48/-100/– |
| Cá ngừ tươi (sống) (`1ac93144`) | `usda_sr_legacy\|FDC 175159` | raw/cooked pair | 109 / 24.4 / 0.49 | NIN 8019 Cá ngừ, tươi | 87 / 21 / 0.3 | +25/+16/+63/–/– |
| Cá nục (sống) (`baa7ce9f`) | `usda_sr_legacy\|FDC 173672` | raw/cooked pair | 158 / 20.07 / 7.89 | NIN 8020 Cá nục, tươi | 111 / 20.2 / 3.3 | +42/-1/+139/–/– |
| Cá thu (sống) (`5ec507be`) | `usda_sr_legacy\|FDC 173673` | raw/cooked pair | 139 / 19.29 / 6.3 | NIN 8026 Cá thu, tươi | 166 / 18.2 / 10.3 | -16/+6/-39/–/– |
| Cật bò (hầm) (`6f4dabb9`) | `usda_sr_legacy\|FDC 169450` | raw/cooked pair | 158 / 27.27 / 4.65 | NIN 7029002 Bầu dục bò, luộc | 91 / 16.89 / 2.43 | +74/+61/+91/-100/– |
| Cật bò (sống) (`65b1a772`) | `usda_sr_legacy\|FDC 169449` | raw/cooked pair | 99 / 17.4 / 3.09 | NIN 7029 Bầu dục bò, tươi | 67 / 12.5 / 1.8 | +48/+39/+72/-3/– |
| Cật heo (nấu chín) (`b5d44a63`) | `usda_sr_legacy\|FDC 167860` | raw/cooked pair | 151 / 25.4 / 4.7 | NIN 7030002 Bầu dục lợn, luộc | 110 / 17.57 / 4.19 | +37/+45/+12/-100/– |
| Cật heo (sống) (`1bd282d5`) | `usda_sr_legacy\|FDC 168270` | raw/cooked pair | 100 / 16.46 / 3.25 | NIN 7030 Bầu dục lợn, tươi | 81 / 13 / 3.1 | +23/+27/+5/-100/– |
| Chân giò heo (sống) (`c6950aa7`) | `usda_sr_legacy\|FDC 168226` | raw/cooked pair | 193 / 19.87 / 11.96 | NIN 7032 Chân giò lợn, tươi | 230 / 15.7 / 18.6 | -16/+27/-36/–/– |
| Đậu hũ (đậu phụ trắng) (`49999be4`) | `usda_sr_legacy\|FDC 172476` | dish recipe | 76 / 8.08 / 4.78 | NIN 3025 Đậu phụ, sống | 97 / 10.9 / 5.4 | -22/-26/-11/+70/-25 |
| Đậu trắng (hạt khô) (`bcd82617`) | `usda_sr_legacy\|FDC 175202` | raw/cooked pair | 333 / 23.36 / 0.85 | NIN 3008 Đậu trắng (đậu tây), hạt, khô | 341 / 23.2 / 2.1 | -2/+1/-60/+5/+322 |
| Đậu xanh (hạt khô) (`0e027e38`) | `usda_sr_legacy\|FDC 174256` | raw/cooked pair | 347 / 23.86 / 1.15 | NIN 3010 Đậu xanh (đậu tắt), hạt, khô | 346 / 23.4 / 2.4 | +0/+2/-52/+8/+247 |
| Gà ta (sống) (`c9c2e282`) | `usda_sr_legacy\|FDC 172400` | raw/cooked pair | 258 / 17.55 / 20.33 | NIN 7013 Thịt gà ta, tươi | 199 / 20.3 / 13.1 | +30/-14/+55/–/– |
| Gan bò (sống) (`28431e98`) | `usda_sr_legacy\|FDC 169451` | raw/cooked pair | 135 / 20.4 / 3.63 | NIN 7039 Gan bò, tươi | 110 / 17.4 / 3.1 | +23/+17/+17/+30/– |
| Gan gà (nấu chín) (`fdd32845`) | `usda_sr_legacy\|FDC 171061` | raw/cooked pair | 167 / 24.5 / 6.51 | NIN 7040002 Gan gà, luộc | 155 / 25.28 / 4.72 | +8/-3/+38/-69/– |
| Gan gà (sống) (`8c393043`) | `usda_sr_legacy\|FDC 171060` | raw/cooked pair | 119 / 16.9 / 4.83 | NIN 7040 Gan gà, tươi | 111 / 18.2 / 3.4 | +7/-7/+42/-64/– |
| Lưỡi bò (hầm) (`7081686c`) | `usda_sr_legacy\|FDC 170598` | raw/cooked pair | 284 / 19.29 / 22.3 | NIN 7044002 Lưỡi bò, luộc | 234 / 19.43 / 17.29 | +21/-1/+29/-100/– |
| Lưỡi bò (sống) (`f8021f1d`) | `usda_sr_legacy\|FDC 170196` | raw/cooked pair | 224 / 14.9 / 16.09 | NIN 7044 Lưỡi bò, tươi | 164 / 13.6 / 12.1 | +37/+10/+33/+1740/– |
| Mề gà (luộc) (`a949808e`) | `usda_sr_legacy\|FDC 171457` | raw/cooked pair | 154 / 30.39 / 2.68 | NIN 7048002 Mề gà, luộc | 127 / 27.31 / 1.67 | +21/+11/+60/-100/– |
| Nạc vai heo (nấu chín) (`606b5bbc`) | `usda_sr_legacy\|FDC 167846` | raw/cooked pair, dish recipe | 230 / 25.33 / 13.54 | NIN 7083002 Thịt lợn nạc vai, luộc | 126 / 17.65 / 6.18 | +83/+44/+119/–/– |
| Sườn non heo (sống) (`cd142e49`) | `usda_sr_legacy\|FDC 167853` | raw/cooked pair | 277 / 15.47 / 23.4 | NIN 7053 Sườn lợn, tươi | 187 / 17.9 / 12.8 | +48/-14/+83/–/– |
| Thăn ngoại bò (sống) (`e0bfb3e9`) | `usda_sr_legacy\|FDC 171814` | raw/cooked pair | 138 / 22.93 / 5.15 | NIN 7005 Thịt bò, lưng, nạc, tươi | 121 / 23.07 / 3.16 | +14/-1/+63/-100/– |
| Thịt dê (sống) (`f3973d66`) | `usda_sr_legacy\|FDC 175303` | raw/cooked pair | 109 / 20.6 / 2.31 | NIN 7011 Thịt dê, nạc, tươi | 122 / 20.7 / 4.3 | -11/+0/-46/–/– |
| Thịt heo nạc (thăn) nấu chín (`df249c8d`) | `usda_sr_legacy\|FDC 168250` | raw/cooked pair, dish recipe | 143 / 26.2 / 3.51 | NIN 7085002 Thịt lợn nạc thăn, luộc | 100 / 19.49 / 2.46 | +43/+34/+43/-100/– |
| Tim bò (hầm) (`9b52d79e`) | `usda_sr_legacy\|FDC 169448` | raw/cooked pair | 165 / 28.48 / 4.73 | NIN 7055002 Tim bò, luộc | 131 / 22.06 / 4.41 | +26/+29/+7/-83/– |
| Tim bò (sống) (`6e406d98`) | `usda_sr_legacy\|FDC 168625` | raw/cooked pair | 112 / 17.72 / 3.94 | NIN 7055 Tim bò, tươi | 89 / 15 / 3 | +26/+18/+31/-77/– |
| Tim gà (sống) (`6019bf63`) | `usda_sr_legacy\|FDC 171458` | raw/cooked pair | 153 / 15.55 / 9.33 | NIN 7056 Tim gà, tươi | 114 / 16 / 5.5 | +34/-3/+70/–/– |
| Tim heo (sống) (`d5be8d10`) | `usda_sr_legacy\|FDC 168267` | raw/cooked pair | 118 / 17.27 / 4.36 | NIN 7057 Tim lợn, tươi | 94 / 15.1 / 3.2 | +26/+14/+36/+11/– |
| Tôm (`1c6a0a1a`) | `usda_sr_legacy\|FDC 174210` | raw/cooked pair | 71 / 13.6 / 1.01 | NIN 8051 Tôm biển, tươi | 82 / 17.6 / 0.9 | -13/-23/+12/+1/– |
| Tôm luộc (`246422a6`) | `usda_sr_legacy\|FDC 171971` | raw/cooked pair, dish recipe | 119 / 22.8 / 1.7 | NIN 8051002 Tôm biển, luộc | 82 / 17.6 / 0.9 | +45/+30/+89/+69/– |
| Tôm thẻ (luộc) (`03e8249c`) | `usda_sr_legacy\|FDC 171971:tom-the-luoc` | raw/cooked pair | 119 / 22.78 / 1.7 | NIN 8051002 Tôm biển, luộc | 82 / 17.6 / 0.9 | +45/+29/+89/+69/– |
| Tôm thẻ (tôm chân trắng) (`574722b9`) | `usda_sr_legacy\|FDC 174210:tom-the-song` | raw/cooked pair | 71 / 13.61 / 1.01 | NIN 8051 Tôm biển, tươi | 82 / 17.6 / 0.9 | -13/-23/+12/+1/– |
| Ức gà (`74e55541`) | `usda_sr_legacy\|FDC 171077` | raw/cooked pair | 120 / 22.5 / 2.62 | NIN 7089 Thịt gà công nghiệp, lườn, raw | 134 / 22.86 / 4.68 | -10/-2/-44/–/– |

**The held file cannot be imported as it stands for another reason:** Tôm and Tôm thẻ (tôm chân trắng) would both become `NIN 8051` (Tôm biển, tươi); Tôm luộc and Tôm thẻ (luộc) would both become `NIN 8051002` (Tôm biển, luộc). The unique key allows one row, so one of each pair has to be archived first (they are exact copies of each other today).

Not in the held file, each for a reason:

- **Cá nục (nấu chín)** (`6a8848b1`, `usda_sr_legacy|FDC 171994`): the live row `vn_nin` / `NIN 8020002` already exists (Cá nục (luộc)), so the key cannot move (unique index). It is a duplicate of that row with other numbers (+51/+6/+154/–/– % now vs NIN), and the key is read by the pairs file. Archive it together with the pairs follow-up.
- **Ghẹ (sống)** (`a89b26ea`, `usda_sr_legacy|FDC 174204`): the live row `vn_nin` / `NIN 8035` already exists (Ghẹ), so the key cannot move (unique index). It is a duplicate of that row with other numbers (+61/+52/+54/–/– % now vs NIN), and the key is read by the pairs file. Archive it together with the pairs follow-up.
- **Lươn** (`f5feb98b`, `usda_sr_legacy|FDC 174193`): NIN 8038 Lươn tươi gives 1.5 g fat for eel; eel is a fatty fish (USDA 11.7 g). Looks like a NIN print error, as with the sweet-potato Mg on 20/10. Not changed; Hao decides.

## 3. How each row was checked

Data rule (prompt `prompts/data-seed-audit-1023.md`): nothing estimated; generic foods NIN → USDA → label → recipe_calc; a branded product uses its own label first; raw state for meat and fish unless the name says cooked. Fix rule: more than 20 % off on kcal, protein or fat, or the wrong state or cut; every fixed row gets a real source and a before / after.

1. **Source id exists and matches the name.** Every `FDC n` in `dam` was looked up in the local USDA copies (SR Legacy 2018-04, Foundation 2026-04-30) and every `NIN n` in the NIN snapshot (853 foods): all exist, and **all 222 rows with an FDC or NIN id equal their source row** (energy, protein, fat, carbs, fiber within 3 %), so none was edited after the import. The names against the USDA descriptions were read one by one; the mismatches are in the notes below.
2. **State.** The state words in the name (sống / tươi, chín / luộc / hấp / nướng / hầm) were compared with the source description. Only by-design cases differ (canned fish, "ốp la", "Edamame (luộc)" = USDA "prepared", processed Giò lụa) and one real one: Tàu hủ trắng cứng (hấp/luộc), fixed above.
3. **NIN first.** For each non-NIN row I looked for the same food in the same state in NIN (67 rows have one: the mapping is listed in section 4, column "Match"; a wrong pairing is a one-line veto). Where NIN has the species and state, NIN is the reference. Rows with no NIN row (most shellfish, many cuts, cooked fish) are compared with their own USDA row, which they equal.
4. **Plausibility.** kcal against 4P + 4C + 9F: **no row is more than 10 % off**. Protein ≤ 100 g: **none above** (highest: Tôm khô 75.6, Cá cơm cả xương (khô) 69, Mực khô 60.1). Rows with fat ≥ 10 g: 56; all are fatty by name or species (ba chỉ, sườn, xay, có da, gà ta, salmon, mackerel, herring, sardine, eel, tongue, eggs, soybean) except **Thịt bò nạc** (12 g, fixed), **Nạc vai heo (nấu chín)** (13.5 g under "nạc", held) and **Cá chim (nấu chín)** and **Cá nục (nấu chín)** (12.1 and 10.1 g, fatty fish, kept).
5. **Duplicates (same food twice).** Identical values: Cá diêu hồng = Cá rô phi (raw and cooked), Nghêu = Sò lông (raw and cooked), Tôm = Tôm thẻ (tôm chân trắng), Tôm luộc = Tôm thẻ (luộc), Cua biển (sống) = Thịt cua (NIN 8033 and 8069), Cá hồi = Cá hồi (Atlantic, nuôi) and Đậu hũ trắng = Đậu hũ (đậu phụ trắng) (both before the fix), Ức gà phi lê = Ức gà nướng (before the fix). Other numbers: Trứng gà (food-trung-ga) and Trứng gà (sống) differ by 1 kcal; Cá nục (nấu chín) / Ghẹ (sống) / Mực against live NIN rows (section 2). Nothing was archived except Mực: the others are not wrong, they only repeat each other.
6. **Species proxies in NIN rows** (source_id with a `:slug`: Cá kèo → NIN 8010 goby, Cá linh → NIN 8032 mrigal carp, Sò huyết → NIN 8048 oyster, Tôm sú → NIN 8051 sea shrimp): kept as the earlier batches decided.
7. **Branded rows.** The Đạm category has **no branded or label rows**: its sources are `usda_sr_legacy` 167, `vn_nin` 54, `usda_foundation` 5, `asean` 3, `vn_table` 1, `recipe_calc` 1; no `label`. The only protein powder in the catalogue, "Whey Protein Isolate" (`food-whey-protein`), is in `bo_sung` and is a generic row with no brand; it is in the `food-%` list below (kcal +4 %, protein +2 %, fat 1 g against 1.56 g against USDA 173180). No label URL could be tied to it, so it is listed and not changed.
8. **Wrong species or cut, not fixable with a real source:** Cá lóc (nấu chín) is USDA northern pike (snakehead has no cooked row anywhere); Sò lông carries clam values (NIN 8081 looks dried); Thịt vịt bỏ da and Đùi gà bỏ da / Má đùi gà có da are compared with NIN rows whose skin status is not stated, so no cut verdict. These stay as they are.

## 4. Full checked list

Per 100 g, live 23/10: kcal | protein | fat | carbs | fiber. "Δ" is the live value against the match, in %, on the same five (– = the match has no value). "Checked, OK" means within 5 % on kcal, protein and fat or the same source row; "small difference (x %)" is the largest of those three, for rows under 20 % or under the floor.

| Row | Cat. | Key (source, source_id) | kcal | P | F | C | fib | Match | Δ kcal/P/F/C/fib | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Ba chỉ bò (sống) | dam | `usda_sr_legacy\|FDC 172158` | 187 | 20.38 | 11.71 | 0 | 0 | FDC 172158 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ba chỉ heo (sống) | dam | `usda_sr_legacy\|FDC 167812` | 518 | 9.34 | 53.01 | 0 | 0 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | +99/-43/+147/–/– | HELD: off >20 %, key used by the app (see Held) |
| Bào ngư (sống) | dam | `usda_sr_legacy\|FDC 174212` | 105 | 17.1 | 0.8 | 6 | 0 | FDC 174212 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bạch tuộc (luộc) | dam | `usda_sr_legacy\|FDC 174249` | 164 | 29.82 | 2.08 | 4.4 | 0 | FDC 174249 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bạch tuộc (sống) | dam | `usda_sr_legacy\|FDC 174218` | 82 | 14.91 | 1.04 | 2.2 | 0 | FDC 174218 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Bắp bò (hầm) | dam | `usda_sr_legacy\|FDC 169442` | 201 | 33.68 | 6.36 | 0 | 0 | NIN 7094003 Thịt bò, bắp, hấp | +10/+4/+11/–/– | checked, small difference (up to 11 %) |
| Bắp bò (sống) | dam | `usda_sr_legacy\|FDC 169441` | 128 | 21.75 | 3.85 | 0 | 0 | NIN 7094 Thịt bò, bắp, sống | +5/+0/+0/–/– | checked, OK |
| Chim cút (nấu chín) | dam | `usda_sr_legacy\|FDC 169902` | 227 | 25.1 | 14.1 | 0 | 0 | FDC 169902 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Chim cút (sống) | dam | `usda_sr_legacy\|FDC 172418` | 192 | 19.63 | 12.05 | 0 | 0 | FDC 172418 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Chân giò heo (sống) | dam | `usda_sr_legacy\|FDC 168226` | 193 | 19.87 | 11.96 | 0 | 0 | NIN 7032 Chân giò lợn, tươi | -16/+27/-36/–/– | HELD: off >20 %, key used by the app (see Held) |
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
| Cá chép (sống) | dam | `usda_sr_legacy\|FDC 171952` | 127 | 17.83 | 5.6 | 0 | 0 | NIN 8003 Cá chép, tươi | +32/+11/+56/–/– | HELD: off >20 %, key used by the app (see Held) |
| Cá chạch | dam | `vn_nin\|NIN 8028` | 110 | 20.4 | 3.2 | 0 | – | NIN 8028 (same NIN row) | 0 (same row) | checked, OK |
| Cá chẽm (chín) | dam | `usda_sr_legacy\|FDC 173694` | 124 | 23.6 | 2.6 | 0 | 0 | FDC 173694 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá chẽm (sống) | dam | `usda_sr_legacy\|FDC 175142` | 97 | 18.4 | 2 | 0 | 0 | FDC 175142 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá cơm cả xương (khô) | dam | `asean\|PhilFCT G150` | 318 | 69 | 4.7 | 0 | 0 | – | – | listed, no NIN/USDA row to compare |
| Cá cơm cả xương (tươi) | dam | `usda_sr_legacy\|FDC 174182` | 131 | 20.4 | 4.84 | 0 | 0 | FDC 174182 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá diêu hồng (nấu chín) | dam | `usda_sr_legacy\|FDC 175177:ca-dieu-hong-chin` | 128 | 26.15 | 2.65 | 0 | 0 | FDC 175177 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to "Cá rô phi (nấu chín)"; NIN 8062 Cá điêu hồng (111 kcal, 17.1 P) is raw only. |
| Cá diêu hồng (sống) | dam | `usda_sr_legacy\|FDC 175176:ca-dieu-hong-song` | 96 | 20.08 | 1.7 | 0 | 0 | NIN 8062 Cá điêu hồng | -14/+17/-48/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Cá diếc (sống) | dam | `vn_nin\|NIN 8006` | 87 | 17.7 | 1.8 | 0 | – | NIN 8006 (same NIN row) | 0 (same row) | checked, OK |
| Cá hồi | dam | `usda_foundation\|food-ca-hoi` | 208 | 20.4 | 13.4 | 0 | 0 | NIN 8011 Cá hồi, tươi | +53/-7/+153/–/– | FIXED in this PR |
| Cá hồi (Atlantic, nuôi) | dam | `usda_sr_legacy\|FDC 175167` | 208 | 20.4 | 13.4 | 0 | 0 | FDC 175167 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
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
| Cá ngừ tươi (sống) | dam | `usda_sr_legacy\|FDC 175159` | 109 | 24.4 | 0.49 | 0 | 0 | NIN 8019 Cá ngừ, tươi | +25/+16/+63/–/– | HELD: off >20 %, key used by the app (see Held) |
| Cá ngừ vằn (chín) | dam | `usda_sr_legacy\|FDC 172005` | 132 | 28.2 | 1.3 | 0 | 0 | FDC 172005 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá ngừ vằn (sống) | dam | `usda_sr_legacy\|FDC 175156` | 103 | 22 | 1 | 0 | 0 | FDC 175156 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá ngừ đóng hộp | dam | `usda_foundation\|FDC 334194` | 90 | 19 | 0.94 | 0.08 | – | FDC 334194 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá nục (luộc) | dam | `vn_nin\|NIN 8020002` | 133 | 24.34 | 3.98 | 0 | – | NIN 8020002 (same NIN row) | 0 (same row) | checked, OK |
| Cá nục (nướng) | dam | `vn_nin\|NIN 8020014` | 138 | 25.25 | 4.13 | 0 | – | NIN 8020014 (same NIN row) | 0 (same row) | checked, OK |
| Cá nục (nấu chín) | dam | `usda_sr_legacy\|FDC 171994` | 201 | 25.73 | 10.12 | 0 | 0 | NIN 8020002 Cá nục, luộc | +51/+6/+154/–/– | HELD: duplicate of a live NIN row with other numbers |
| Cá nục (sống) | dam | `usda_sr_legacy\|FDC 173672` | 158 | 20.07 | 7.89 | 0 | 0 | NIN 8020 Cá nục, tươi | +42/-1/+139/–/– | HELD: off >20 %, key used by the app (see Held) |
| Cá phèn | dam | `vn_nin\|NIN 8021` | 104 | 15.9 | 4.5 | 0 | – | NIN 8021 (same NIN row) | 0 (same row) | checked, OK |
| Cá rô phi (nấu chín) | dam | `usda_sr_legacy\|FDC 175177` | 128 | 26.15 | 2.65 | 0 | 0 | FDC 175177 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to "Cá diêu hồng (nấu chín)"; NIN has only fried tilapia (8024008), a different state. |
| Cá rô phi (sống) | dam | `usda_sr_legacy\|FDC 175176` | 96 | 20.08 | 1.7 | 0 | 0 | NIN 8024 Cá rô phi, tươi | -4/+2/-26/–/– | checked, small difference (up to 26 %, under the 10 kcal / 1 g floor) |
| Cá rô đồng (sống) | dam | `vn_nin\|NIN 8023` | 126 | 19.1 | 5.5 | 0 | – | NIN 8023 (same NIN row) | 0 (same row) | checked, OK |
| Cá saba Na Uy (nướng) | dam | `usda_sr_legacy\|FDC 175120` | 262 | 23.85 | 17.81 | 0 | 0 | FDC 175120 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá saba Na Uy (sống) | dam | `usda_sr_legacy\|FDC 175119` | 205 | 18.6 | 13.89 | 0 | 0 | FDC 175119 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá thu (chín) | dam | `usda_sr_legacy\|FDC 173674` | 158 | 23.6 | 6.3 | 0 | 0 | FDC 173674 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Cá thu (sống) | dam | `usda_sr_legacy\|FDC 173673` | 139 | 19.29 | 6.3 | 0 | 0 | NIN 8026 Cá thu, tươi | -16/+6/-39/–/– | HELD: off >20 %, key used by the app (see Held) |
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
| Cật bò (hầm) | dam | `usda_sr_legacy\|FDC 169450` | 158 | 27.27 | 4.65 | 0 | 0 | NIN 7029002 Bầu dục bò, luộc | +74/+61/+91/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Cật bò (sống) | dam | `usda_sr_legacy\|FDC 169449` | 99 | 17.4 | 3.09 | 0.29 | 0 | NIN 7029 Bầu dục bò, tươi | +48/+39/+72/-3/– | HELD: off >20 %, key used by the app (see Held) |
| Cật heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167860` | 151 | 25.4 | 4.7 | 0 | 0 | NIN 7030002 Bầu dục lợn, luộc | +37/+45/+12/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Cật heo (sống) | dam | `usda_sr_legacy\|FDC 168270` | 100 | 16.46 | 3.25 | 0 | 0 | NIN 7030 Bầu dục lợn, tươi | +23/+27/+5/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Dạ dày heo (luộc) | dam | `vn_nin\|NIN 7034002` | 106 | 18.2 | 3.6 | 0 | 0 | NIN 7034002 (same NIN row) | 0 (same row) | checked, OK |
| Edamame (luộc) | dam | `usda_sr_legacy\|FDC 168411` | 121 | 11.91 | 5.2 | 8.91 | 5.2 | FDC 168411 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Edamame (đông lạnh, chưa nấu) | dam | `usda_sr_legacy\|FDC 168410` | 109 | 11.22 | 4.73 | 7.61 | 4.8 | FDC 168410 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gan bò (nấu chín) | dam | `usda_sr_legacy\|FDC 168626` | 191 | 29.1 | 5.26 | 5.13 | 0 | FDC 168626 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gan bò (sống) | dam | `usda_sr_legacy\|FDC 169451` | 135 | 20.4 | 3.63 | 3.89 | 0 | NIN 7039 Gan bò, tươi | +23/+17/+17/+30/– | HELD: off >20 %, key used by the app (see Held) |
| Gan gà (nấu chín) | dam | `usda_sr_legacy\|FDC 171061` | 167 | 24.5 | 6.51 | 0.87 | 0 | NIN 7040002 Gan gà, luộc | +8/-3/+38/-69/– | HELD: off >20 %, key used by the app (see Held) |
| Gan gà (sống) | dam | `usda_sr_legacy\|FDC 171060` | 119 | 16.9 | 4.83 | 0.73 | 0 | NIN 7040 Gan gà, tươi | +7/-7/+42/-64/– | HELD: off >20 %, key used by the app (see Held) |
| Gan heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167863` | 165 | 26 | 4.4 | 3.76 | 0 | NIN 7041002 Gan lợn, luộc | +10/+6/-6/+45/– | checked, small difference (up to 10 %) |
| Gan heo (sống) | dam | `usda_sr_legacy\|FDC 167862` | 134 | 21.4 | 3.65 | 2.47 | 0 | NIN 7041 Gan lợn, tươi | +16/+14/+1/+24/– | checked, small difference (up to 16 %) |
| Ghẹ | dam | `vn_nin\|NIN 8035` | 54 | 11.9 | 0.7 | 0 | – | NIN 8035 (same NIN row) | 0 (same row) | checked, OK |
| Ghẹ (hấp) | dam | `usda_sr_legacy\|FDC 174205` | 83 | 17.88 | 0.74 | 0 | 0 | FDC 174205 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ghẹ (sống) | dam | `usda_sr_legacy\|FDC 174204` | 87 | 18.06 | 1.08 | 0.04 | 0 | NIN 8035 Cua ghẹ, tươi | +61/+52/+54/–/– | HELD: duplicate of a live NIN row with other numbers |
| Giò lụa (chả lụa) | dam | `vn_nin\|NIN 7069` | 205 | 16.9 | 15 | 1.8 | – | NIN 7069 (same NIN row) | 0 (same row) | checked, OK |
| Gà nguyên con có da (nướng) | dam | `usda_sr_legacy\|FDC 171450` | 239 | 27.3 | 13.6 | 0 | 0 | FDC 171450 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà nguyên con có da (sống) | dam | `usda_sr_legacy\|FDC 171447` | 215 | 18.6 | 15.06 | 0 | 0 | FDC 171447 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà ta (luộc) | dam | `usda_sr_legacy\|FDC 172401` | 285 | 26.88 | 18.87 | 0 | 0 | FDC 172401 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Gà ta (sống) | dam | `usda_sr_legacy\|FDC 172400` | 258 | 17.55 | 20.33 | 0 | 0 | NIN 7013 Thịt gà ta, tươi | +30/-14/+55/–/– | HELD: off >20 %, key used by the app (see Held) |
| Hàu (hấp) | dam | `usda_sr_legacy\|FDC 174250` | 163 | 18.9 | 4.6 | 9.9 | 0 | FDC 174250 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Hàu (sống) | dam | `usda_sr_legacy\|FDC 174219` | 81 | 9.45 | 2.3 | 4.95 | 0 | FDC 174219 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Hải sâm | dam | `vn_nin\|NIN 8036` | 90 | 21.5 | 0.3 | 0.2 | – | NIN 8036 (same NIN row) | 0 (same row) | checked, OK |
| Hến | dam | `asean\|PhilFCT G020` | 105 | 8.9 | 1.9 | 13 | 0 | NIN 8037 Hến, tươi | +133/+98/+171/+155/– | FIXED in this PR |
| Lòng heo (ruột non, luộc) | dam | `vn_nin\|NIN 7047002` | 55 | 9 | 1.6 | 1 | – | NIN 7047002 (same NIN row) | 0 (same row) | checked, OK |
| Lòng trắng trứng gà | dam | `usda_sr_legacy\|FDC 172183` | 52 | 10.9 | 0.2 | 0.7 | 0 | NIN 9003 Lòng trắng trứng gà | +13/+6/+100/-30/– | checked, small difference (up to 100 %, under the 10 kcal / 1 g floor) |
| Lòng đỏ trứng gà | dam | `usda_sr_legacy\|FDC 172184` | 322 | 15.9 | 26.5 | 3.6 | 0 | NIN 9002 Lòng đỏ trứng gà | -2/+17/-11/+260/– | checked, small difference (up to 17 %) |
| Lươn | dam | `usda_sr_legacy\|FDC 174193` | 184 | 18.44 | 11.66 | 0 | 0 | NIN 8038 Lươn, tươi | +42/+0/+677/-100/– | DISPUTED: NIN looks wrong — DISPUTED: NIN 8038 gives 1.5 g fat for eel; eel is a fatty fish (USDA 11.7 g). Looks like a NIN print error. Not changed; Hao decides. |
| Lươn (nướng) | dam | `usda_sr_legacy\|FDC 174194` | 236 | 23.65 | 14.95 | 0 | 0 | FDC 174194 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Lưỡi bò (hầm) | dam | `usda_sr_legacy\|FDC 170598` | 284 | 19.29 | 22.3 | 0 | 0 | NIN 7044002 Lưỡi bò, luộc | +21/-1/+29/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Lưỡi bò (sống) | dam | `usda_sr_legacy\|FDC 170196` | 224 | 14.9 | 16.09 | 3.68 | 0 | NIN 7044 Lưỡi bò, tươi | +37/+10/+33/+1740/– | HELD: off >20 %, key used by the app (see Held) |
| Miso | dam | `usda_sr_legacy\|FDC 172442` | 198 | 12.79 | 6.01 | 25.37 | 5.4 | FDC 172442 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Má đùi gà có da (nướng) | dam | `usda_sr_legacy\|FDC 173617` | 184 | 24.03 | 8.99 | 0 | 0 | FDC 173617 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Má đùi gà có da (sống) | dam | `usda_sr_legacy\|FDC 172378` | 214 | 16.37 | 15.95 | 0.17 | 0 | FDC 172378 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Mề gà (luộc) | dam | `usda_sr_legacy\|FDC 171457` | 154 | 30.39 | 2.68 | 0 | 0 | NIN 7048002 Mề gà, luộc | +21/+11/+60/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Mề gà (sống) | dam | `usda_sr_legacy\|FDC 171456` | 94 | 17.66 | 2.06 | 0 | 0 | NIN 7048 Mề gà, tươi | -5/-17/+58/-100/– | checked, small difference (up to 58 %, under the 10 kcal / 1 g floor) |
| Mực | dam | `usda_sr_legacy\|FDC 174223` | 92 | 15.6 | 1.38 | 3.08 | 0 | NIN 8040 Mực, tươi | +26/-4/+53/–/– | ARCHIVE in this PR (wrong duplicate of Mực ống, NIN 8040) |
| Mực khô | dam | `vn_nin\|NIN 8039` | 291 | 60.1 | 4.5 | 2.5 | – | NIN 8039 (same NIN row) | 0 (same row) | checked, OK |
| Mực ống | dam | `vn_nin\|NIN 8040` | 73 | 16.3 | 0.9 | 0 | – | NIN 8040 (same NIN row) | 0 (same row) | checked, OK |
| Mực ống (hấp) | dam | `vn_nin\|NIN 8040003` | 115 | 25.47 | 1.41 | 0 | – | NIN 8040003 (same NIN row) | 0 (same row) | checked, OK |
| Natto | dam | `usda_sr_legacy\|FDC 172443` | 211 | 19.4 | 11 | 12.68 | 5.4 | FDC 172443 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Nghêu (hấp) | dam | `usda_sr_legacy\|FDC 171975` | 148 | 25.6 | 1.95 | 5.13 | 0 | FDC 171975 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to the "Sò lông (hấp)" row. |
| Nghêu (sống) | dam | `usda_sr_legacy\|FDC 174214` | 86 | 14.7 | 0.96 | 3.57 | 0 | FDC 174214 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Identical to the "Sò lông (sống)" row. |
| Nạc vai heo (nấu chín) | dam | `usda_sr_legacy\|FDC 167846` | 230 | 25.33 | 13.54 | 0 | 0 | NIN 7083002 Thịt lợn nạc vai, luộc | +83/+44/+119/–/– | HELD: off >20 %, key used by the app (see Held) — Lean-fat check: name says nạc (lean) but fat is 13.5 g (USDA roasted shoulder, lean and some fat). NIN lean shoulder boiled has 6.2 g. |
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
| Sườn non heo (sống) | dam | `usda_sr_legacy\|FDC 167853` | 277 | 15.47 | 23.4 | 0 | 0 | NIN 7053 Sườn lợn, tươi | +48/-14/+83/–/– | HELD: off >20 %, key used by the app (see Held) |
| Tempeh | dam | `usda_sr_legacy\|FDC 174272` | 192 | 20.29 | 10.8 | 7.64 | – | FDC 174272 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thăn ngoại bò (sống) | dam | `usda_sr_legacy\|FDC 171814` | 138 | 22.93 | 5.15 | 0 | 0 | NIN 7005 Thịt bò, lưng, nạc, tươi | +14/-1/+63/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Thăn ngoại bò (áp chảo/nướng) | dam | `usda_sr_legacy\|FDC 171813` | 189 | 29.3 | 7.09 | 0 | 0 | FDC 171813 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt ba chỉ heo (luộc) | dam | `vn_nin\|NIN 7018002` | 220 | 14 | 18.2 | 0 | 0 | NIN 7018002 (same NIN row) | 0 (same row) | checked, OK |
| Thịt ba chỉ heo (nướng) | dam | `vn_nin\|NIN 7086` | 401 | 20.5 | 35.2 | 0.6 | – | NIN 7086 (same NIN row) | 0 (same row) | checked, OK |
| Thịt bò khô | dam | `vn_nin\|NIN 7075` | 239 | 51 | 1.6 | 5.2 | – | NIN 7075 (same NIN row) | 0 (same row) | checked, OK |
| Thịt bò nạc | dam | `usda_foundation\|food-thit-bo-nac` | 213.33 | 26 | 12 | 0 | 0 | NIN 7003 Thịt bò, loại I, tươi | +81/+24/+216/–/– | FIXED in this PR |
| Thịt bò thăn (sống) | dam | `usda_sr_legacy\|FDC 171812` | 153 | 22.1 | 6.52 | 0 | 0 | FDC 171812 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò thăn (áp chảo/nướng) | dam | `usda_sr_legacy\|FDC 171811` | 200 | 29 | 8.39 | 0 | 0 | FDC 171811 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò xay (nấu chín) | dam | `usda_sr_legacy\|FDC 171794` | 230 | 28.4 | 12 | 0 | 0 | FDC 171794 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt bò xay (sống) | dam | `usda_sr_legacy\|FDC 174030` | 176 | 20 | 10 | 0 | 0 | FDC 174030 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt chân giò heo (luộc) | dam | `vn_nin\|NIN 7032002` | 230 | 15.7 | 18.6 | 0 | 0 | NIN 7032002 (same NIN row) | 0 (same row) | checked, OK |
| Thịt cua | dam | `vn_nin\|NIN 8069` | 103 | 17.5 | 0.6 | 7 | – | NIN 8069 (same NIN row) | 0 (same row) | checked, OK — Identical to "Cua biển (sống)" (NIN 8033): same food twice. |
| Thịt dê (nướng) | dam | `usda_sr_legacy\|FDC 175304` | 143 | 27.1 | 3.03 | 0 | 0 | FDC 175304 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt dê (sống) | dam | `usda_sr_legacy\|FDC 175303` | 109 | 20.6 | 2.31 | 0 | 0 | NIN 7011 Thịt dê, nạc, tươi | -11/+0/-46/–/– | HELD: off >20 %, key used by the app (see Held) |
| Thịt heo nạc (thăn) | dam | `usda_sr_legacy\|FDC 168249` | 109 | 20.9 | 2.17 | 0 | 0 | NIN 7085 Thịt lợn, nạc thăn, tươi | -8/-9/-25/-100/– | checked, small difference (up to 25 %, under the 10 kcal / 1 g floor) |
| Thịt heo nạc (thăn) nấu chín | dam | `usda_sr_legacy\|FDC 168250` | 143 | 26.2 | 3.51 | 0 | 0 | NIN 7085002 Thịt lợn nạc thăn, luộc | +43/+34/+43/-100/– | HELD: off >20 %, key used by the app (see Held) |
| Thịt heo xay (nấu chín) | dam | `usda_sr_legacy\|FDC 167903` | 297 | 25.69 | 20.77 | 0 | 0 | FDC 167903 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt heo xay (sống) | dam | `usda_sr_legacy\|FDC 167902` | 263 | 16.88 | 21.19 | 0 | 0 | NIN 7018 Thịt lợn, nửa nạc, nửa mỡ, tươi | +1/+2/-1/–/– | checked, OK |
| Thịt vịt bỏ da (nướng) | dam | `usda_sr_legacy\|FDC 172411` | 201 | 23.48 | 11.2 | 0 | 0 | FDC 172411 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt vịt bỏ da (sống) | dam | `usda_sr_legacy\|FDC 172410` | 135 | 18.28 | 5.95 | 0.94 | 0 | FDC 172410 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Thịt vịt có da (nướng) | dam | `usda_sr_legacy\|FDC 172409` | 337 | 19 | 28.4 | 0 | 0 | FDC 172409 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Tim bò (hầm) | dam | `usda_sr_legacy\|FDC 169448` | 165 | 28.48 | 4.73 | 0.15 | 0 | NIN 7055002 Tim bò, luộc | +26/+29/+7/-83/– | HELD: off >20 %, key used by the app (see Held) |
| Tim bò (sống) | dam | `usda_sr_legacy\|FDC 168625` | 112 | 17.72 | 3.94 | 0.14 | 0 | NIN 7055 Tim bò, tươi | +26/+18/+31/-77/– | HELD: off >20 %, key used by the app (see Held) |
| Tim gà (luộc) | dam | `usda_sr_legacy\|FDC 171059` | 185 | 26.41 | 7.92 | 0.1 | 0 | NIN 7056002 Tim gà, luộc | +16/+17/+2/–/– | checked, small difference (up to 17 %) |
| Tim gà (sống) | dam | `usda_sr_legacy\|FDC 171458` | 153 | 15.55 | 9.33 | 0.71 | 0 | NIN 7056 Tim gà, tươi | +34/-3/+70/–/– | HELD: off >20 %, key used by the app (see Held) |
| Tim heo (hầm) | dam | `usda_sr_legacy\|FDC 168268` | 148 | 23.6 | 5.05 | 0.4 | 0 | NIN 7057002 Tim lợn, luộc | +7/+6/+7/-77/– | checked, small difference (up to 7 %) |
| Tim heo (sống) | dam | `usda_sr_legacy\|FDC 168267` | 118 | 17.27 | 4.36 | 1.33 | 0 | NIN 7057 Tim lợn, tươi | +26/+14/+36/+11/– | HELD: off >20 %, key used by the app (see Held) |
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
| Tôm | dam | `usda_sr_legacy\|FDC 174210` | 71 | 13.6 | 1.01 | 0.91 | 0 | NIN 8051 Tôm biển, tươi | -13/-23/+12/+1/– | HELD: off >20 %, key used by the app (see Held) |
| Tôm khô | dam | `vn_nin\|NIN 8053` | 347 | 75.6 | 3.8 | 2.5 | – | NIN 8053 (same NIN row) | 0 (same row) | checked, OK |
| Tôm luộc | dam | `usda_sr_legacy\|FDC 171971` | 119 | 22.8 | 1.7 | 1.52 | 0 | NIN 8051002 Tôm biển, luộc | +45/+30/+89/+69/– | HELD: off >20 %, key used by the app (see Held) |
| Tôm sú | dam | `vn_nin\|NIN 8051:tom-su-song` | 82 | 17.6 | 0.9 | 0.9 | – | NIN 8051:tom-su-song (same NIN row) | 0 (same row) | checked, OK |
| Tôm sú (nướng) | dam | `vn_nin\|NIN 8051014:tom-su-nuong` | 124 | 26.67 | 1.36 | 1.36 | – | NIN 8051014:tom-su-nuong (same NIN row) | 0 (same row) | checked, OK |
| Tôm thẻ (luộc) | dam | `usda_sr_legacy\|FDC 171971:tom-the-luoc` | 119 | 22.78 | 1.7 | 1.52 | 0 | NIN 8051002 Tôm biển, luộc | +45/+29/+89/+69/– | HELD: off >20 %, key used by the app (see Held) — Identical to the "Tôm luộc" row. |
| Tôm thẻ (tôm chân trắng) | dam | `usda_sr_legacy\|FDC 174210:tom-the-song` | 71 | 13.61 | 1.01 | 0.91 | 0 | NIN 8051 Tôm biển, tươi | -13/-23/+12/+1/– | HELD: off >20 %, key used by the app (see Held) — Identical to the "Tôm" row. |
| Tôm đồng | dam | `vn_nin\|NIN 8052` | 90 | 18.4 | 1.8 | 0 | – | NIN 8052 (same NIN row) | 0 (same row) | checked, OK |
| Tôm đồng (nướng) | dam | `vn_nin\|NIN 8052014` | 136 | 27.88 | 2.73 | 0 | – | NIN 8052014 (same NIN row) | 0 (same row) | checked, OK |
| Vẹm (hấp) | dam | `usda_sr_legacy\|FDC 174217` | 172 | 23.8 | 4.48 | 7.39 | 0 | FDC 174217 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Vẹm (sống) | dam | `usda_sr_legacy\|FDC 174216` | 86 | 11.9 | 2.24 | 3.69 | 0 | FDC 174216 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đùi gà bỏ da | dam | `usda_sr_legacy\|FDC 173627` | 121 | 19.7 | 4.12 | 0 | 0 | FDC 173627 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đùi gà bỏ da nấu chín | dam | `usda_sr_legacy\|FDC 172853` | 176 | 24.6 | 8.63 | 0 | 0 | FDC 172853 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu gà (hạt khô) | dam | `usda_sr_legacy\|FDC 173756` | 378 | 20.47 | 6.04 | 62.95 | 12.2 | FDC 173756 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu gà (luộc) | dam | `usda_sr_legacy\|FDC 173757` | 164 | 8.86 | 2.59 | 27.42 | 7.6 | FDC 173757 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu hũ (đậu phụ trắng) | dam | `usda_sr_legacy\|FDC 172476` | 76 | 8.08 | 4.78 | 1.87 | 0.3 | NIN 3025 Đậu phụ, sống | -22/-26/-11/+70/-25 | HELD: off >20 %, key used by the app (see Held) |
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
| Đậu trắng (hạt khô) | dam | `usda_sr_legacy\|FDC 175202` | 333 | 23.36 | 0.85 | 60.27 | 15.2 | NIN 3008 Đậu trắng (đậu tây), hạt, khô | -2/+1/-60/+5/+322 | HELD: off >20 %, key used by the app (see Held) |
| Đậu trắng (luộc) | dam | `usda_sr_legacy\|FDC 175203` | 139 | 9.73 | 0.35 | 25.09 | 6.3 | FDC 175203 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Đậu xanh (hạt khô) | dam | `usda_sr_legacy\|FDC 174256` | 347 | 23.86 | 1.15 | 62.62 | 16.3 | NIN 3010 Đậu xanh (đậu tắt), hạt, khô | +0/+2/-52/+8/+247 | HELD: off >20 %, key used by the app (see Held) |
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
| Ức gà | dam | `usda_sr_legacy\|FDC 171077` | 120 | 22.5 | 2.62 | 0 | 0 | NIN 7089 Thịt gà công nghiệp, lườn, raw | -10/-2/-44/–/– | HELD: off >20 %, key used by the app (see Held) |
| Ức gà luộc | dam | `usda_sr_legacy\|FDC 171478` | 151 | 29 | 3.03 | 0 | 0 | FDC 171478 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) |
| Ức gà nướng | dam | `usda_sr_legacy\|FDC 171477` | 165 | 31 | 3.57 | 0 | 0 | FDC 171477 | 0 (same row) | checked, OK (equals the FDC row; no NIN row for this food and state) — Equals the old "Ức gà phi lê" row; after the fix the two rows differ (USDA cooked vs NIN raw). |
| Ức gà phi lê | dam | `usda_foundation\|food-uc-ga` | 165 | 31 | 3.6 | 0 | 0 | NIN 7089 Thịt gà công nghiệp, lườn, raw | +23/+36/-23/–/– | FIXED in this PR |
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
| Bún chả Hà Nội | mon_viet | `vn_fct\|food-bun-cha` | 145 | 8.5 | 4.8 | 17.2 | 0.8 | NIN 15034 Bún chả | +7/+39/+9/-4/+33 | FIXED in this PR — Same dish as NIN 15034. Protein is 39 % above NIN. |
| Phở gà | mon_viet | `vn_fct\|food-pho-ga` | 105 | 7.8 | 2.3 | 13.5 | 0.4 | NIN 15067 Phở gà | +44/+105/+130/+10/-33 | FIXED in this PR — Same dish as NIN 15067. kcal +44 %, protein +105 %. |
| Bánh mì thịt | mon_viet | `vn_table\|food-banh-mi-thit` | 210 | 9.5 | 6.8 | 28 | 1.8 | – | – | listed, no NIN/USDA row to compare — Dish with no NIN or USDA entry (NIN 15023 Bánh mì xíu mại is a different filling). Its recipe (Thành phần) adds up to 211 kcal, 9.6 P, 7.6 F per 100 g, but that recipe reproduces the row total, so it is not an independent check. |
| Bánh tráng | tinh_bot | `vn_table\|food-banh-trang` | 330 | 4.2 | 0.5 | 78 | 1.2 | NIN 1010 Bánh đa nem | -1/+5/+150/-2/+140 | checked, small difference (up to 150 %) |
| Bánh tráng nướng | an_vat | `vn_table\|food-banh-trang-nuong` | 190 | 5.5 | 7.2 | 26 | 1 | – | – | listed, no NIN/USDA row to compare — Street snack (rice paper grilled with egg and toppings): no NIN or USDA entry. |
| Bún bò Huế | mon_viet | `vn_table\|food-bun-bo-hue` | 88.33 | 5.6 | 2.5 | 11.2 | 0.6 | – | – | listed, no NIN/USDA row to compare — No NIN or USDA Bún bò Huế (NIN 15033 is Bún bò Nam bộ, a different dish). Recipe total 88 kcal, 5.6 P, 3.3 F per 100 g reproduces the row, so it is no independent check. |
| Bún chả Hà Nội | mon_viet | `vn_table\|food-bun-cha` | 185 | 11.5 | 5.5 | 22 | 1.2 | NIN 15034 Bún chả | +36/+89/+25/+23/+100 | FIXED in this PR — Same dish as NIN 15034. Off on all three. |
| Bưởi da xanh | trai_cay | `vn_table\|food-buoi` | 42 | 0.8 | 0.1 | 10.6 | 1.6 | NIN 5001 Bưởi, tươi | +27/+300/–/+32/+129 | checked, small difference (up to 300 %) — NIN pomelo is 33 kcal (row +27 %, but only 9 kcal); USDA pummelo is 38 kcal (+11 %). |
| Cơm gạo lứt | tinh_bot | `vn_table\|food-com-gao-lut` | 112 | 2.33 | 0.8 | 23.33 | 1.67 | FDC 168875 Rice, brown, medium-grain, cooked (Inclu | +0/+0/-4/-1/-7 | checked, OK — Equals cooked medium-grain brown rice. |
| Cơm tấm sườn | mon_viet | `vn_table\|food-com-tam-suon` | 155 | 7.5 | 4.8 | 21 | 0.8 | – | – | listed, no NIN/USDA row to compare — Dish with no NIN or USDA entry. Recipe total 167 kcal, 6.9 P, 6.7 F per 100 g reproduces the row (fat -28 %), not an independent check. |
| Hạt điều rang | beo | `vn_table\|food-hat-dieu` | 553 | 18.2 | 43.8 | 30.2 | 3.3 | FDC 170571 Nuts, cashew nuts, dry roasted, without  | -4/+19/-6/-8/+10 | checked, small difference (up to 19 %) — Name says rang (roasted) but the values are USDA raw cashew (553 kcal, 43.9 F). Against roasted references the gap is under 20 %. |
| Phở bò | mon_viet | `vn_table\|food-pho-bo` | 75 | 4.8 | 1.8 | 10.5 | 0.5 | NIN 15065 Phở bò chín | +3/-8/+100/-5/+67 | checked, small difference (up to 100 %) — Fat 1.8 against 0.9 (+100 %, 0.9 g): over 20 % but under 1 g. kcal +3 %, protein -8 %. |
| Rau muống | rau | `vn_table\|food-rau-muong` | 19 | 2.6 | 0.2 | 2.1 | 2.1 | NIN 4083 Rau muống,  tươi | -32/-19/-17/-36/+110 | checked, small difference (up to 32 %) — kcal 19 against 28 (-32 %) but only 9 kcal; protein 0.6 g, fat 0.04 g apart. |
| Sữa tươi không đường | sua | `vn_table\|food-sua-tuoi` | 62 | 3.2 | 3.5 | 4.5 | 0 | FDC 171265 Milk, whole, 3.25% milkfat, with added v | +2/+2/+8/-6/– | checked, small difference (up to 8 %) — Matches USDA whole milk. NIN fresh milk is richer: fat 3.5 against 4.4 (-20 %, 0.9 g). |

Non-Đạm `food-%` rows with notes that matter (all other `food-%` notes are in the Verdict column): **Chuối** holds USDA's figures for one medium banana (118 g: 105 kcal, 1.3 P, 27 C) stored per 100 g, +18 % over raw banana, so under the line but worth a fix; **Hạt điều rang** holds raw cashew values (553 kcal) under a roasted name, within 20 % of roasted references; **Bột củ dền** (Dalahouse) has no label on file and its numbers look back-solved from a 3 g serving; **Bánh mì thịt, Bún bò Huế, Cơm tấm sườn, Bánh tráng nướng** are dishes with no NIN or USDA row (their recipes reproduce the old totals, so they are no independent check); `food-khoai-lang` was already replaced on 20/10 (USDA 168484). **`training-foods.ts` reads `usda_foundation|food-cha-la` and `usda_foundation|food-bot-cu-den`: neither key may move** (neither is touched).

## 5. Calls I made that Hao can veto

1. The floor (10 kcal / 1 g per 100 g) on top of the 20 % line. Without it 12 more rows would be "off" against their primary match (listed with Δ kcal / P / F): Cá rô phi (sống) (-4/+2/-26 %); Đậu đen (hạt khô) (-1/-12/-47 %); Lòng trắng trứng gà (+13/+6/+100 %); Mề gà (sống) (-5/-17/+58 %); Thịt heo nạc (thăn) (-8/-9/-25 %); Bánh tráng (-1/+5/+150 %); Bưởi da xanh (+27/+300/– %); Chà là (+1/+29/+120 %); Mật mía (+0/–/-100 %); Phở bò (+3/-8/+100 %); Rau muống (-32/-19/-17 %); Whey Protein Isolate (+4/+2/-36 %). For several of them a second reference is within 20 % (Chà là matches deglet noor, Bưởi matches USDA pummelo). All are in the full list.
2. The same-food mapping to NIN (section 4, "Match").
3. NIN over USDA for the fixed rows (the rule), even where the USDA row names the species more exactly.
4. Archiving Mực. To keep it, delete the last UPDATE of the SQL.
5. Lươn left alone because NIN 8038 looks wrong, as the sweet-potato Mg did on 20/10.
6. The three dish rows: see the review point in section 1.

## 6. Dry-run output (local, scratch database; not production)

A throw-away Postgres 16 was created from the migrations' `nutrition.foods` and `nutrition.food_portions` (unique index on `(source, source_id)`) and loaded with the 1,306 foods and 2,868 portions of `live-1023/all.json`. The SQL and the real importer were run against it in the order of section 7.

```
$ go run ./cmd/importfoods --dry-run --file docs/data/protein-audit-2026-10-23.json
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 9 food records from docs/data/protein-audit-2026-10-23.json
Completeness Report: 47.0% average coverage of the 22 counted nutrients across 9 foods
```

Source-fix SQL as committed (ROLLBACK): `BEGIN`, first SELECT shows the 7 rows with their old keys, seven `UPDATE 1`, second SELECT shows the new keys and Mực `is_archived = t`, `ROLLBACK`; afterwards the beef row still read `usda_foundation / food-thit-bo-nac`. With the last line changed to `COMMIT`: seven `UPDATE 1`, `COMMIT`; run a second time: seven `UPDATE 0`, `COMMIT` (harmless).

Real import into the scratch database after the COMMIT run: `Successfully imported 9 foods into nutrition.foods`. Then: total foods **1,306 (unchanged, no insert)**, archived 1, rows with the old keys `food-thit-bo-nac` / `food-uc-ga` / `food-ca-hoi` / `food-dau-hu` **0**, same 9 ids, portions unchanged:

| id | name_vi | source | source_id | kcal | P | F | C | fib | portions |
|---|---|---|---|---|---|---|---|---|---|

## 7. Hao's server steps

Same server set-up as `docs/data/molasses-2026-10-23-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`; the VPS has no Go and its `pg_dump` is 16, so every command runs in a throw-away container. **Order matters: backup, source-fix SQL (ROLLBACK, then COMMIT), dry run, import, check.** The import upserts on `(source, source_id)`: run before the SQL, it would insert six second rows and leave the old ones behind.

### 0. Put the files on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin main
git show origin/main:docs/data/protein-audit-2026-10-23.json > ~/protein-audit-2026-10-23.json
git show origin/main:docs/data/protein-audit-2026-10-23-source-fix.sql > ~/protein-audit-2026-10-23-source-fix.sql
python3 -c "import json; print(len(json.load(open('/home/deploy/protein-audit-2026-10-23.json'))), 'rows')"
grep -c "NIN 7003" ~/protein-audit-2026-10-23.json ~/protein-audit-2026-10-23-source-fix.sql
```

Expected: `9 rows`, then `1` for the JSON and `1` for the SQL (the same `NIN 7003` in both). This works once the PR is merged; before that use `git fetch origin data/protein-audit-1023` and `git show origin/data/protein-audit-1023:docs/data/…`.

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

Expected: `BEGIN`; the first SELECT shows 7 rows with the old keys (`food-thit-bo-nac`, `food-uc-ga`, `food-ca-hoi`, `food-dau-hu`, `FDC 172475:tau-hu-trang-hap-luoc`, `PhilFCT G020`, `FDC 174223`) and `is_archived` f; **seven `UPDATE 1`**; the second SELECT shows `vn_nin` with `NIN 7003`, `NIN 7089`, `NIN 8011`, `NIN 3025`, `NIN 3025002`, `NIN 8037` and Mực `is_archived` t; `ROLLBACK`. **If any line says `UPDATE 0`, or the first SELECT has fewer than 7 rows or other keys, or psql prints `duplicate key value violates unique constraint "uq_foods_source_source_id"`, stop**: the row is not what this job expects, or a row with the NIN key was added to production after the 23/10 snapshot (`ON_ERROR_STOP` then rolls the whole transaction back, so nothing is half-applied).

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
Loaded 9 food records from /data/x.json
Completeness Report: 47.0% average coverage of the 22 counted nutrients across 9 foods
```

### 4. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/protein-audit-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 9 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output. A re-run is safe (same upsert, portions replaced per food). The import also overwrites `name` (English), `brand` and `tip_vi` of these nine rows: they are set from NIN, null and the live tip.

### 5. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT left(f.id::text,8) AS id8, f.name_vi, f.source, f.source_id, f.per_100g->>'energy' AS kcal, f.per_100g->>'protein' AS p, f.per_100g->>'fat' AS fat,
       (SELECT string_agg(p.label_vi || ' = ' || p.grams, '; ' ORDER BY p.sort) FROM nutrition.food_portions p WHERE p.food_id = f.id) AS portions
FROM nutrition.foods f
WHERE f.id::text LIKE ANY (ARRAY['b1cb7f07%','b6c88da5%','87c8e2f8%','245172d0%','03bcdfd2%','d2960a7c%','d4fd4a6f%','7b3a8c3f%','c27615c1%'])
ORDER BY f.name_vi, f.source;
SELECT count(*) AS total, count(*) FILTER (WHERE is_archived) AS archived FROM nutrition.foods;
SELECT count(*) AS old_seed_keys FROM nutrition.foods WHERE source_id IN ('food-thit-bo-nac','food-uc-ga','food-ca-hoi','food-dau-hu');
SQL
```

Expected: exactly the nine rows of the table in section 6 (same ids, kcal / P / F, portions); `total` = **N** (no row is added) and `archived` = the number before + 1; `old_seed_keys` = 0. Two rows named "Bún chả Hà Nội" with 136 / 6.1 / 4.4 is correct.

## 8. Rolling back

- **Keys and archive:** run this (it puts the old keys and the old visibility back; the ids never change):

  ```sql
  BEGIN;
  UPDATE nutrition.foods SET source = 'usda_foundation', source_id = 'food-thit-bo-nac' WHERE id = 'b1cb7f07-0c3b-440c-a453-4147e5471e35' AND source = 'vn_nin' AND source_id = 'NIN 7003';  -- Thịt bò nạc
  UPDATE nutrition.foods SET source = 'usda_foundation', source_id = 'food-uc-ga' WHERE id = 'b6c88da5-5f97-43a1-8b90-4f3d9325affb' AND source = 'vn_nin' AND source_id = 'NIN 7089';  -- Ức gà phi lê
  UPDATE nutrition.foods SET source = 'usda_foundation', source_id = 'food-ca-hoi' WHERE id = '87c8e2f8-3b30-470e-9f2b-40d278706f04' AND source = 'vn_nin' AND source_id = 'NIN 8011';  -- Cá hồi
  UPDATE nutrition.foods SET source = 'vn_table', source_id = 'food-dau-hu' WHERE id = '245172d0-9a1a-4f8c-8991-148e6236893c' AND source = 'vn_nin' AND source_id = 'NIN 3025';  -- Đậu hũ trắng
  UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 172475:tau-hu-trang-hap-luoc' WHERE id = '03bcdfd2-fc3a-4bd4-a31a-3df56e772639' AND source = 'vn_nin' AND source_id = 'NIN 3025002';  -- Tàu hủ trắng cứng (hấp/luộc)
  UPDATE nutrition.foods SET source = 'asean', source_id = 'PhilFCT G020' WHERE id = 'd2960a7c-f75a-47dc-8b1a-1c1e4c9d3fd4' AND source = 'vn_nin' AND source_id = 'NIN 8037';  -- Hến
  UPDATE nutrition.foods SET is_archived = false WHERE id = '6028095b-11f8-40e8-9dd5-2b87bda06c1e';  -- Mực
  COMMIT;
  ```

- **Values (all nine rows):** the old `per_100g`, `per_100g_nutrients`, `name`, `brand`, `tip_vi` and portions are in the dump of step 1: `gunzip -c ~/backups/foods-before-protein-1023.sql.gz | grep -e b1cb7f07 -e b6c88da5 -e 87c8e2f8 -e 245172d0 -e 03bcdfd2 -e d2960a7c -e d4fd4a6f -e 7b3a8c3f -e c27615c1`. The before values are also in section 1 (macros) and in `food-research/live-1023/all.json` (every nutrient). Restore row by row from those lines; **do not restore the whole dump over the live tables.** Do the key rollback first, so the row is found by its old key.
- Past diary entries were never touched, so nothing needs undoing there.

