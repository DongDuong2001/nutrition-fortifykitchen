# More foods and search aliases, 20/10/2026 (b)

For Dong's importer, from Hao's coach request ("bông hẹ" and "bắp non" are not found in search; add similar foods). Data only: no change to the database, migrations or server. It does not touch `new-foods-2026-10-20.json`. Nothing is estimated: a nutrient the source record does not have is left out. Values are per 100 g of the edible part, rounded as in `round_nutrients.py`.

The live catalogue was read on 20/10/2026 from `GET /api/v1/foods?limit=500&page=1..3` on lehongkhanh.vn: 1,278 foods (it includes the first new-foods file). Every food below was looked up there under all its names before adding anything.

## Two files, because the importer has no alias field

The database has no alias or keywords column: `name_search` is built by a trigger from `name_vi` alone (`migrations/000003`), and the web search reads only the name (and brand). The only way to make a row findable by another name is to put the name in `name_vi`, as was done for the grape row. So:

| File | Run with | What it does |
|---|---|---|
| `docs/data/new-foods-2026-10-20b.json` | `--file` | 4 new rows (inserts) |
| `docs/data/new-foods-2026-10-20b-aliases.json` | `--edible-portions` | 8 renames of live rows, matched on `source` + `source_id`; `UPDATE ... SET name_vi` only. Nutrients, portions, category, tip and brand are not touched (a full-record upsert would have overwritten `tip_vi`, brand and the English name, which the API does not return). `remove_portions` is empty |

The trigger fires on `name_vi` updates, so `name_search` follows. Accents need no extra text: the API folds them with `unaccent` and the web search with `removeVietnameseTones`, so "bap non" finds "bắp non". Twin foods keep one stem once the state is stripped (`Bông bí (hoa bí, sống)` and `Bông bí (hoa bí, luộc)` are both "Bông bí" to `lib/food-twins`), the way "Cá lóc (cá quả, sống)" already is.

## Every requested food

kcal, protein, fat and carbs are per 100 g. "→" is the live name changing to the new one.

| Requested | Action | Row | Source + id | kcal | Protein g | Fat g | Carbs g |
|---|---|---|---|---|---|---|---|
| Bông hẹ (hoa hẹ) | Skipped | none | no allowed source (see below) | | | | |
| Bắp non (ngô non, bắp bao tử) | Alias added | Ngô bao tử → **Ngô bao tử (bắp non, ngô non, bắp bao tử)** | vn_nin NIN 4058 | 42 | 2.2 | 0.2 | 7.8 |
| Bông bí (hoa bí) | Alias added | Bông bí → **Bông bí (hoa bí, sống)** | usda_sr_legacy FDC 169270 | 15 | 1.03 | 0.07 | 3.28 |
| Bông bí (hoa bí), boiled | Alias added | Bông bí (luộc) → **Bông bí (hoa bí, luộc)** | usda_sr_legacy FDC 169271 | 15 | 1.09 | 0.08 | 3.3 |
| Bông thiên lý (hoa thiên lý) | Alias added | Hoa thiên lý (hoa lý) → **Hoa thiên lý (hoa lý, bông thiên lý)** | vn_nin NIN 4044 | 35 | 2.9 | 0 | 5.8 |
| Bông điên điển | Already there | Bông điên điển | usda_sr_legacy FDC 168459:bong-dien-dien-song | 27 | 1.28 | 0.04 | 6.73 |
| Bông điên điển, steamed | Already there | Bông điên điển (hấp) | usda_sr_legacy FDC 169281:bong-dien-dien-hap | 22 | 1.14 | 0.05 | 5.23 |
| Bông so đũa | New row | **Bông so đũa** | asean PhilFCT D199 | 31 | 1 | 0.3 | 6.1 |
| Hoa chuối (bắp chuối) | Already there | Hoa chuối (bắp chuối) | vn_nin NIN 4043 | 28 | 1.5 | 0 | 5.5 |
| Măng tây | Already there | Măng tây (sống) | usda_sr_legacy FDC 168389 | 20 | 2.2 | 0.12 | 3.88 |
| Măng tây, boiled | Already there | Măng tây (luộc) | usda_sr_legacy FDC 168390 | 22 | 2.4 | 0.22 | 4.11 |
| Đậu tuyết (đậu Hà Lan ăn cả vỏ) | New row | **Đậu tuyết (đậu Hà Lan ăn cả vỏ, sống)** | usda_sr_legacy FDC 170010 | 42 | 2.8 | 0.2 | 7.5 |
| Đậu tuyết, boiled | New row | **Đậu tuyết (đậu Hà Lan ăn cả vỏ, luộc)** | usda_sr_legacy FDC 170011 | 42 | 3.3 | 0.2 | 7 |
| Cải ngồng (ngồng cải) | Alias added | Cải ngồng → **Cải ngồng (ngồng cải, sống)** | vn_nin NIN 4134 | 17 | 1.5 | 0.2 | 2.18 |
| Cải ngồng, boiled | Alias added | Cải ngồng (luộc) → **Cải ngồng (ngồng cải, luộc)** | vn_nin NIN 4134002 | 18 | 1.6 | 0.21 | 2.32 |
| Ngọn su su (su su đọt) | Alias added | Ngọn su su → **Ngọn su su (su su đọt, sống)** | vn_nin NIN 4110 | 24 | 3.3 | 0.1 | 2.5 |
| Ngọn su su, boiled | Alias added | Ngọn su su (luộc) → **Ngọn su su (su su đọt, luộc)** | vn_nin NIN 4110002 | 14 | 3.37 | 0.1 | not in source |
| Nấm kim châm | Already there | Nấm kim châm | usda_sr_legacy FDC 169382 | 37 | 2.66 | 0.29 | 7.81 |
| Ngó sen | Already there | Ngó sen | vn_nin NIN 4059 | 65 | 1 | 0.07 | 15.13 |
| Củ sen | Already there | Củ sen (sống) | usda_sr_legacy FDC 169250 | 74 | 2.6 | 0.1 | 17.23 |
| Củ sen, boiled | Already there | Củ sen (luộc) | usda_sr_legacy FDC 168430 | 66 | 1.58 | 0.07 | 16.02 |
| Hoa atisô, boiled | New row | **Atisô (hoa atisô, luộc)** | usda_sr_legacy FDC 168386 | 53 | 2.9 | 0.3 | 11.9 |

Counts for the dry run: **4 inserts, 8 alias updates**.

## Search proof

The real `searchFoods` (`apps/web/lib/search.ts`) was run over all 1,278 live names with the 8 renames and 4 new rows applied (a throwaway test, not committed). Each of these finds its row, with and without accents: bắp non, ngô non, bắp bao tử, bông bí, hoa bí, bông thiên lý, bông điên điển, bông so đũa, hoa chuối, bắp chuối, măng tây, đậu Hà Lan (also finds the existing shelled-pea rows), đậu tuyết, cải ngồng, ngồng cải, ngọn su su, su su đọt, nấm kim châm, ngó sen, củ sen, hoa atisô. "bông hẹ", "bong he" and "hoa hẹ" find nothing: that food is skipped.

## New rows: sources and portions

- **Đậu tuyết (sống / luộc)**: USDA SR Legacy "Peas, edible-podded, raw" FDC 170010 and "boiled, drained, without salt" FDC 170011. Portions: 100 g, plus 1 chén (cắt khúc) = 98 g (raw) and 1 chén = 160 g (boiled), the cup weights in USDA's own portion table. NIN 4031 "Đậu Hà Lan, quả, tươi" is not used: its English name is "Green peas; field pea" and 75 kcal fits shelled peas, not the 42 kcal of snow peas. It is not in the catalogue either; say if you want it.
- **Atisô (hoa atisô, luộc)**: USDA SR Legacy FDC 168386 "Artichokes, (globe or french), cooked, boiled, drained, without salt". Boiled only, as asked. Gram-only: the outer bracts are thrown away, and USDA's "1 medium = 120 g" is the whole artichoke, not the edible part.
- **Bông so đũa**: **source `asean`, PhilFCT D199** (DOST-FNRI Philippine Food Composition Table, release 1 Dec 2019, report https://i.fnri.dost.gov.ph/fct/library/report/3478, read 20/10/2026): "Sesbania flower", scientific name *Sesbania grandiflora*, katuray bulaklak, edible portion 55%, values per 100 g edible portion. This is the fallback source, used because NIN has no so đũa and USDA's only record, "Sesbania flower" (FDC 168459), does not name its species and is already the live "Bông điên điển" row (a source + id can be used once). Hao can instead add "bông so đũa" as an alias on that USDA row. Raw only, as asked (PhilFCT also has a boiled D200, not added). Gram-only: PhilFCT gives no household weight. PhilFCT reports zinc as 0; it is kept as reported.

## Rows already there

- **Bắp non** is "Ngô bao tử" (NIN 4058, English "Baby corn, raw"), category `rau`. Its portions in the live catalogue are 1 bắp = 10 g and 1 chén = 100 g. They are not changed here (a rename cannot change portions), and I could not find where the 10 g comes from: `food-research/units-notes.md` says only that the old unit portions were kept (1 bắp is meant to read "1 trái" in the new label format). Please check that weight before trusting it. Canned or boiled baby corn: neither NIN nor USDA has it.
- **Bông điên điển, hoa chuối, măng tây, nấm kim châm, ngó sen, củ sen**: found under the requested names, so no change. Hoa chuối already reads "Hoa chuối (bắp chuối)".
- **Ngó sen, boiled**: no NIN or USDA record (USDA's lotus root is the củ sen, which is there raw and boiled).

## Skipped foods

- **Bông hẹ (hoa hẹ, garlic chive flower)**: not in NIN (only the leaf, NIN 4042) or USDA (only the leaf, "Chives, raw"), and not in PhilFCT. The Thai INMU table has it ("กุยช่าย, ดอก, ดิบ"), but its host `inmu2.mahidol.ac.th` does not resolve from here, and the only copy I could reach is a third-party site (hdmall.co.th) that I could not open. No allowed source with an exact id was readable, so nothing was added. If someone can open the INMU table, the row is one record to add.

## Check before merging

- **"rau cải làn" is not added to Cải ngồng.** Hao's list had "Cải ngồng (rau cải làn, ngồng cải)", but the catalogue already has a separate "Cải làn" (USDA "Broccoli, chinese", FDC 169404 and 169392): cải làn is Chinese broccoli and cải ngồng is choy sum, two vegetables. An alias would send people who log cải làn to the wrong nutrients. "ngồng cải" is added. To add the other, change the two names in the aliases file.
- **Bông so đũa vs bông điên điển** are different plants (so đũa is Sesbania grandiflora; điên điển is usually Sesbania sesban), but USDA's single "Sesbania flower" row stands for điên điển. Fine for search; the numbers differ slightly (27 vs 31 kcal).

## Missing nutrients (not in the source record, left out)

- **Đậu tuyết (sống)** FDC 170010, **Đậu tuyết (luộc)** FDC 170011, **Atisô (luộc)** FDC 168386: none.
- **Bông so đũa** PhilFCT D199 (PhilFCT lists only these: energy, protein, fat, carbs, fiber, water, cholesterol, calcium, phosphorus, iron, potassium, sodium, zinc, vitamin A as RAE, B1, B2, niacin, vitamin C): sugars, saturated, monounsaturated, polyunsaturated and trans fat, magnesium, copper, manganese, selenium, vitamin D, E, K, B5, B6, folate, B12. 11 of the 22 counted micros.

## How Dong imports this

From `apps/api`, `DATABASE_URL` set. Dry-run both first (they read the files and write nothing):

```bash
go run ./cmd/importfoods --dry-run --file ../../docs/data/new-foods-2026-10-20b.json
go run ./cmd/importfoods --dry-run --edible-portions ../../docs/data/new-foods-2026-10-20b-aliases.json
```

Dry-run output on 20/10/2026 (run without `DATABASE_URL`):

```
Loaded 4 food records from ../../docs/data/new-foods-2026-10-20b.json
Completeness Report: 87.5% average coverage of the 22 counted nutrients across 4 foods

Loaded 0 remove_portions rules and 8 renames from ../../docs/data/new-foods-2026-10-20b-aliases.json
Dry-run: edible-portions updates simulated successfully.
```

No clash: none of the 4 new `source` + `source_id` pairs exists in the live catalogue, and all 8 rename targets exist there with the name shown in the `from` field. Then the real runs (both are safe to repeat):

```bash
go run ./cmd/importfoods --file ../../docs/data/new-foods-2026-10-20b.json
go run ./cmd/importfoods --edible-portions ../../docs/data/new-foods-2026-10-20b-aliases.json
```
