# Nutrient catalogue (Release 1)

This file is the single source for which nutrients the app tracks, how they are grouped, and where each target comes from. The layout follows Cronometer's nutrient report: groups, indented sub-rows, a bar and a % column.

**Target sources**

| Source | Meaning |
|---|---|
| **Coach** | The coach's rules (`HANDOFF.md`). These are authoritative. |
| **Coach\*** | Provisional coach rule, waiting for confirmation (`OPEN_QUESTIONS.md`). |
| **VN2016** | Reference value from Vietnam's 2016 recommended intakes. Provisional until the coach gives values. |
| **—** | Tracked only, with no target. The row shows the amount and a dashed line, with no bar and no %. |

**Display rules**
- Every row shows: name, amount + unit, then either a bar and % or a dashed line.
- Bars use the 4 levels: red under 50%, yellow 50–79%, green 80–99%, blue 100% and over ("Đạt").
- Going over 100% is fine: no over-limit warnings.
- Sub-rows are indented one level per depth (16 px). Group headers are sticky.
- The "x/y đạt" count only includes rows that have a target.

## 1. Tổng quan (General)
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| Năng lượng | Energy | kcal | 0 | Coach |
| Nước | Water | g | 0 | — |
| Cồn | Alcohol | g | 0 | — |
| Caffeine | Caffeine | mg | 0 | — |
| Oxalat | Oxalate | mg | 0 | — |
| Phytat | Phytate | mg | 0 | — |

## 2. Tinh bột (Carbohydrates)
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| Tinh bột tổng | Carbs | g | 0 | Coach\* (remainder formula) |
| Carb ròng | Net carbs | g | 1 | — |
| Chất xơ | Fiber | g | 1 | Coach\* |
| Xơ không tan | Insoluble fiber | g | 2 | — |
| Xơ hoà tan | Soluble fiber | g | 2 | — |
| Tinh bột (starch) | Starch | g | 1 | — |
| Đường | Sugars | g | 1 | — |
| Đường bổ sung | Added sugars | g | 1 | — |

## 3. Chất béo (Lipids)
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| Chất béo | Fat | g | 0 | Coach |
| Béo không bão hoà đơn | Monounsaturated | g | 1 | — |
| Béo không bão hoà đa | Polyunsaturated | g | 1 | — |
| Omega-3 | Omega-3 | g | 2 | — |
| ALA | ALA | g | 3 | — |
| DHA | DHA | g | 3 | — |
| EPA | EPA | g | 3 | — |
| Omega-6 | Omega-6 | g | 2 | — |
| Béo bão hoà | Saturated | g | 1 | — |
| Béo chuyển hoá | Trans fat | g | 1 | — |
| Cholesterol | Cholesterol | mg | 0 | — |

## 4. Đạm (Protein)
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| Đạm | Protein | g | 0 | Coach |
| Cystine, Histidine, Isoleucine, Leucine, Lysine, Methionine, Phenylalanine, Threonine, Tryptophan, Tyrosine, Valine | amino acids (11 rows) | g | 1 | — |

## 5. Vitamin
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| B1 (Thiamin) | B1 | mg | 0 | VN2016 |
| B2 (Riboflavin) | B2 | mg | 0 | VN2016 |
| B3 (Niacin) | B3 | mg | 0 | VN2016 |
| B5 (Pantothenic) | B5 | mg | 0 | VN2016 |
| B6 (Pyridoxine) | B6 | mg | 0 | VN2016 |
| B12 (Cobalamin) | B12 | µg | 0 | VN2016 |
| Folate (B9) | Folate | µg | 0 | VN2016 |
| Vitamin A | Vitamin A | µg | 0 | VN2016 |
| Vitamin C | Vitamin C | mg | 0 | VN2016 |
| Vitamin D | Vitamin D | µg | 0 | VN2016 |
| Vitamin E | Vitamin E | mg | 0 | VN2016 |
| Vitamin K | Vitamin K | µg | 0 | VN2016 |

## 6. Khoáng chất (Minerals)
| Nutrient (VI) | EN | Unit | Depth | Target |
|---|---|---|---|---|
| Canxi | Calcium | mg | 0 | Coach (1.200–1.500) |
| Đồng | Copper | mg | 0 | VN2016 |
| Sắt | Iron | mg | 0 | Coach |
| Magie | Magnesium | mg | 0 | Coach (50% of Ca) |
| Mangan | Manganese | mg | 0 | VN2016 |
| Phốt pho | Phosphorus | mg | 0 | VN2016 |
| Kali | Potassium | mg | 0 | Coach |
| Selen | Selenium | µg | 0 | VN2016 |
| Natri | Sodium | mg | 0 | Coach (salt rule) |
| Kẽm | Zinc | mg | 0 | Coach |

**Totals:** about 58 nutrients. 27 have a target (5 macros and fibre, 12 vitamins, 10 minerals); the rest are tracked only.

## Food data
Vietnamese food composition tables don't cover many of these nutrients (amino acids, omega breakdowns, B5, manganese, oxalate, phytate). The primary source is **NCCDB** (Nutrition Coordinating Center Food & Nutrient Database, University of Minnesota), the database Cronometer relies on. It needs a **paid licence** for commercial use. Fill gaps with **USDA FoodData Central** (public domain), and add Vietnamese dishes from the VN food composition tables or from recipes built out of NCCDB ingredients. A missing value is stored as **unknown (null), never 0**. The UI should not count unknowns as 0, and shows "chưa đủ dữ liệu" when foods with unknown values make up a large share of the day.
