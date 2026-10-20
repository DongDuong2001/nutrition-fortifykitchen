# Daily targets: US Dietary Reference Intakes (cc-73b, 20/10/2026)

Hao's brief: someone switching from Cronometer sees the same micronutrient targets, the same "max" warnings and can edit a target the same way. This replaces the VN 2016 amounts ([rda-vn2016-targets-2026-10-19.md](rda-vn2016-targets-2026-10-19.md), kept as history). Code: `apps/web/lib/rda.ts` (the table), `apps/api/internal/targets/targets.go` (the same numbers), `packages/vectors/dri.json` (one case per age 9 to 100 and sex, checked on both sides).

## What a target is

- The **RDA**, or the **AI** where the DRI has no RDA (marked AI below), for the person's sex and age, from the Dietary Reference Intakes of the National Academies of Sciences, Engineering, and Medicine (formerly the Institute of Medicine), as Cronometer uses them. Percent is intake ÷ target; the red, yellow, green and blue levels are against it.
- The **Tolerable Upper Intake Level (UL)** is the "max": the highest daily intake unlikely to cause harm. Above it a nutrient gets a calm extra line ("Vượt mức an toàn (40 mg)"), in the page's normal colours. A UL marked *supplements only* counts only foods of the supplement category (`bo_sung`), because the DRI sets it for that form (preformed vitamin A, magnesium from drugs and supplements, synthetic vitamin E, synthetic niacin, folic acid), not for ordinary food. Vitamin A is in that list by Hao's decision (21/10): the DRI's limit is for preformed retinol, the catalogue holds only total vitamin A (µg RAE), so food counts for nothing and only supplement foods are compared with it. No UL, no note.
- Life stages are the DRI's own: 9–13, 14–18, 19–30, 31–50, 51–70, 71+. A profile younger than 9 takes the 9–13 values (the app does not allow it: birth year ≤ 2015). No pregnancy or breastfeeding stage.
- **Coach overrides (Hao)**: sodium stays the salt formula (4–6 g + 1–1,5 g per 20 min of training, × 393 mg), not the DRI's 1.500 mg; a woman in the period has iron 28 mg. Both appear in the app unchanged.

## Source of the numbers

Read on 20/10/2026 from Health Canada's publication of the DRI summary tables (the joint US–Canada DRIs, same values as the National Academies tables):

- Vitamins: <https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins-dietary-reference-intakes-tables-2005.html> (RDA/AI and UL per life stage and sex, with the UL footnotes).
- Elements: <https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html> (calcium and vitamin D are the 2011 values, potassium and sodium the 2019 values).

The National Academies PDFs (nap.edu, the USDA NAL copy) and the NIH ODS fact sheets could not be fetched from the build machine (404 / 403), so Health Canada's tables are the source that was actually read. Every adult value of the brief's table was checked against them and all 21 matched, and every under-19 value was read from them: **no value had to be guessed, so nothing from this table is in OPEN_QUESTIONS.** Copper is converted from µg (700, 890, 900, UL 5.000, 8.000, 10.000 µg) to mg, the catalogue's unit.

The DRI tables for the tables per row: *Vitamins* = "Reference values for vitamins" (RDA/AI and UL), *Elements* = "Reference values for elements".

## The table (per day; M = male, F = female)

| Nutrient (unit) | DRI table | Value | 9–13 | 14–18 | 19–30 | 31–50 | 51–70 | 71+ |
|---|---|---|---|---|---|---|---|---|
| Calcium (mg) | Elements | RDA, M | 1300 | 1300 | 1000 | 1000 | 1000 | 1200 |
| | | RDA, F | 1300 | 1300 | 1000 | 1000 | 1200 | 1200 |
| Phosphorus (mg) | Elements | RDA, M and F | 1250 | 1250 | 700 | 700 | 700 | 700 |
| Magnesium (mg) | Elements | RDA, M | 240 | 410 | 400 | 420 | 420 | 420 |
| | | RDA, F | 240 | 360 | 310 | 320 | 320 | 320 |
| Iron (mg) | Elements | RDA, M | 8 | 11 | 8 | 8 | 8 | 8 |
| | | RDA, F | 8 | 15 | 18 | 18 | 8 | 8 |
| Zinc (mg) | Elements | RDA, M | 8 | 11 | 11 | 11 | 11 | 11 |
| | | RDA, F | 8 | 9 | 8 | 8 | 8 | 8 |
| Selenium (µg) | Elements | RDA, M and F | 40 | 55 | 55 | 55 | 55 | 55 |
| Copper (mg) | Elements | RDA, M and F | 0.7 | 0.89 | 0.9 | 0.9 | 0.9 | 0.9 |
| Manganese (mg) | Elements | AI, M | 1.9 | 2.2 | 2.3 | 2.3 | 2.3 | 2.3 |
| | | AI, F | 1.6 | 1.6 | 1.8 | 1.8 | 1.8 | 1.8 |
| Potassium (mg) | Elements | AI, M | 2500 | 3000 | 3400 | 3400 | 3400 | 3400 |
| | | AI, F | 2300 | 2300 | 2600 | 2600 | 2600 | 2600 |
| Vitamin A (µg RAE) | Vitamins | RDA, M | 600 | 900 | 900 | 900 | 900 | 900 |
| | | RDA, F | 600 | 700 | 700 | 700 | 700 | 700 |
| Vitamin D (µg) | Vitamins | RDA, M and F | 15 | 15 | 15 | 15 | 15 | 20 |
| Vitamin E (mg) | Vitamins | RDA, M and F | 11 | 15 | 15 | 15 | 15 | 15 |
| Vitamin K (µg) | Vitamins | AI, M | 60 | 75 | 120 | 120 | 120 | 120 |
| | | AI, F | 60 | 75 | 90 | 90 | 90 | 90 |
| Thiamin (B1) (mg) | Vitamins | RDA, M | 0.9 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 |
| | | RDA, F | 0.9 | 1 | 1.1 | 1.1 | 1.1 | 1.1 |
| Riboflavin (B2) (mg) | Vitamins | RDA, M | 0.9 | 1.3 | 1.3 | 1.3 | 1.3 | 1.3 |
| | | RDA, F | 0.9 | 1 | 1.1 | 1.1 | 1.1 | 1.1 |
| Niacin (B3) (mg NE) | Vitamins | RDA, M | 12 | 16 | 16 | 16 | 16 | 16 |
| | | RDA, F | 12 | 14 | 14 | 14 | 14 | 14 |
| Pantothenic acid (B5) (mg) | Vitamins | AI, M and F | 4 | 5 | 5 | 5 | 5 | 5 |
| Vitamin B6 (mg) | Vitamins | RDA, M | 1 | 1.3 | 1.3 | 1.3 | 1.7 | 1.7 |
| | | RDA, F | 1 | 1.2 | 1.3 | 1.3 | 1.5 | 1.5 |
| Folate (µg DFE) | Vitamins | RDA, M and F | 300 | 400 | 400 | 400 | 400 | 400 |
| Vitamin B12 (µg) | Vitamins | RDA, M and F | 1.8 | 2.4 | 2.4 | 2.4 | 2.4 | 2.4 |
| Vitamin C (mg) | Vitamins | RDA, M | 45 | 75 | 90 | 90 | 90 | 90 |
| | | RDA, F | 45 | 65 | 75 | 75 | 75 | 75 |

## Tolerable Upper Intake Levels (the "max", the same for both sexes)

| Nutrient (unit) | Counts | 9–13 | 14–18 | 19–30 | 31–50 | 51–70 | 71+ |
|---|---|---|---|---|---|---|---|
| Calcium (mg) | all food and supplements | 3000 | 3000 | 2500 | 2500 | 2000 | 2000 |
| Phosphorus (mg) | all food and supplements | 4000 | 4000 | 4000 | 4000 | 4000 | 3000 |
| Magnesium (mg) | supplements only (pharmacological magnesium) | 350 | 350 | 350 | 350 | 350 | 350 |
| Iron (mg) | all food and supplements | 40 | 45 | 45 | 45 | 45 | 45 |
| Zinc (mg) | all food and supplements | 23 | 34 | 40 | 40 | 40 | 40 |
| Selenium (µg) | all food and supplements | 280 | 400 | 400 | 400 | 400 | 400 |
| Copper (mg) | all food and supplements | 5 | 8 | 10 | 10 | 10 | 10 |
| Manganese (mg) | all food and supplements | 6 | 9 | 11 | 11 | 11 | 11 |
| Potassium | no UL set | — | — | — | — | — | — |
| Vitamin A (µg RAE) | supplements only (retinol from supplements; Hao 21/10) | 1700 | 2800 | 3000 | 3000 | 3000 | 3000 |
| Vitamin D (µg) | all food and supplements | 100 | 100 | 100 | 100 | 100 | 100 |
| Vitamin E (mg) | supplements only (synthetic vitamin E) | 600 | 800 | 1000 | 1000 | 1000 | 1000 |
| Vitamin K | no UL set | — | — | — | — | — | — |
| Thiamin (B1) | no UL set | — | — | — | — | — | — |
| Riboflavin (B2) | no UL set | — | — | — | — | — | — |
| Niacin (B3) (mg NE) | supplements only (synthetic niacin) | 20 | 30 | 35 | 35 | 35 | 35 |
| Pantothenic acid (B5) | no UL set | — | — | — | — | — | — |
| Vitamin B6 (mg) | all food and supplements | 60 | 80 | 100 | 100 | 100 | 100 |
| Folate (µg DFE) | supplements only (synthetic folic acid) | 600 | 800 | 1000 | 1000 | 1000 | 1000 |
| Vitamin B12 | no UL set | — | — | — | — | — | — |
| Vitamin C (mg) | all food and supplements | 1200 | 1800 | 2000 | 2000 | 2000 | 2000 |

Vitamin A's UL is for preformed retinol and the catalogue holds only total vitamin A (µg RAE), so Hao decided (21/10) that it counts like the other supplements-only limits: vitamin A from ordinary food (carotene in sweet potato or carrot, liver) never triggers the note, and a day's vitamin A from supplement foods (`bo_sung`) is compared with the limit. The note's detail says so ("Mức này chỉ tính cho thực phẩm bổ sung…").

## What the app does with it

- **Mục tiêu**: each vitamin and mineral row shows one number, "DRI, nữ 31–50 tuổi" as its source, and "Tối đa …" under it; the footnote is "Theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính của bạn". Salt keeps its training formula.
- **Vi chất** and the nutrient page: the target is the DRI amount; over the UL the extra line appears (and, on the nutrient page, what the limit covers and how much counted).
- **Edge ages** (19, 30/31, 50/51, 70/71) are tested for every nutrient and both sexes, in `lib/__tests__/rda.test.ts` and, for every age from 9 to 100, in `TestSharedDRIVectors`.

## The coach's targets (upper end, Hao 20/10)

| Target | Rule |
|---|---|
| Energy | build 40, maintain 35, cut 30, deep cut 25 kcal/kg (one number) |
| Protein | 2,2 g/kg |
| Fat | 1,0 g/kg |
| Carbs | (energy − protein × 4 − fat × 9) ÷ 4 from those values |
| Fibre | 14 g per 1.000 kcal of that energy, at most 40 g (men) / 30 g (women); no floor |
| Fast carbs | unchanged: 30–45 g per training hour (range) |
| Salt / sodium | unchanged: 4–6 g + 1–1,5 g per 20 min of training, × 393 mg (range) |

The user's custom kcal, macro ratios and fixed grams still win; the carbs and the fibre follow a custom kcal.
