/**
 * cc-73b (Hao 20/10): the daily targets of the 22 vitamins and minerals are the US and Canadian Dietary Reference Intakes
 * (National Academies of Sciences, Engineering, and Medicine, formerly the Institute of Medicine), the same defaults
 * Cronometer uses: the RDA, or the AI where there is no RDA, by sex and age, and the Tolerable Upper Intake Level (UL) as a
 * maximum. Replaces VN 2016 (kept as history in docs/rda-vn2016-targets-2026-10-19.md).
 *
 * Source: the DRI summary tables as Health Canada publishes them (canada.ca, "Dietary reference intakes tables": reference
 * values for vitamins, reference values for elements), which carry the National Academies values; potassium and sodium are
 * the 2019 edition, calcium and vitamin D the 2011 one. Per row the table is in `table`, the report in `report`. The full
 * table with its footnotes is docs/dri-targets-2026-10-20.md.
 *
 * Sodium is not here: the coach's salt formula stays (lib/targets). Iron for a woman in the period stays the coach's 28 mg.
 *
 * Life stages are the DRI's own: 9–13, 14–18, 19–30, 31–50, 51–70, 71+. A younger age takes the 9–13 values (the app has no
 * profile under 10). Pregnancy and breastfeeding are not in the app.
 */
import type { TargetRange } from "./targets";

export type RdaSex = "male" | "female";

/** The age each life stage starts at, and its label. A younger age takes the first. */
export const DRI_STAGE_FROM = [9, 14, 19, 31, 51, 71] as const;
export const DRI_STAGE_LABEL = ["9–13", "14–18", "19–30", "31–50", "51–70", "71+"] as const;

/** From this age on, this value: [[9, 1300], [19, 1000]] is 1300 from age 9 and 1000 from age 19. */
type Steps = readonly (readonly [from: number, value: number])[];

export interface DriRow {
  id: string;
  /** The DRI summary table the numbers are from */
  table: "Vitamins" | "Elements";
  /** The National Academies report of the edition */
  report: string;
  /** The value is an Adequate Intake, not an RDA */
  ai?: boolean;
  male: Steps;
  /** Missing: the same as male */
  female?: Steps;
  /** The Tolerable Upper Intake Level, the same for both sexes. Missing: no UL was set */
  ul?: Steps;
  /** The UL covers supplements (and fortified foods) only, not the nutrient in ordinary food */
  ulSupplementsOnly?: boolean;
  /** Footnote of the UL when it is for one form of the nutrient */
  ulNote?: string;
}

const R_VIT = "Dietary Reference Intakes (1998–2001, 2011 for vitamin D)";
const R_MIN = "Dietary Reference Intakes (1997–2001, 2011 for calcium, 2019 for potassium)";

/**
 * Per nutrient the RDA/AI and UL. Units are the catalogue's (lib/nutrients): copper in mg (the tables print µg), the rest as
 * printed. Every value was read from the tables above, none is calculated.
 */
export const DRI: readonly DriRow[] = [
  { id: "calcium", table: "Elements", report: "Dietary Reference Intakes for Calcium and Vitamin D (2011)", male: [[9, 1300], [19, 1000], [71, 1200]], female: [[9, 1300], [19, 1000], [51, 1200]], ul: [[9, 3000], [19, 2500], [51, 2000]] },
  { id: "phosphorus", table: "Elements", report: R_MIN, male: [[9, 1250], [19, 700]], ul: [[9, 4000], [71, 3000]] },
  { id: "magnesium", table: "Elements", report: R_MIN, male: [[9, 240], [14, 410], [19, 400], [31, 420]], female: [[9, 240], [14, 360], [19, 310], [31, 320]], ul: [[9, 350]], ulSupplementsOnly: true, ulNote: "tính cho magie từ thuốc và thực phẩm bổ sung, không tính cho thức ăn thường" },
  { id: "iron", table: "Elements", report: R_MIN, male: [[9, 8], [14, 11], [19, 8]], female: [[9, 8], [14, 15], [19, 18], [51, 8]], ul: [[9, 40], [14, 45]] },
  { id: "zinc", table: "Elements", report: R_MIN, male: [[9, 8], [14, 11]], female: [[9, 8], [14, 9], [19, 8]], ul: [[9, 23], [14, 34], [19, 40]] },
  { id: "selenium", table: "Elements", report: R_MIN, male: [[9, 40], [14, 55]], ul: [[9, 280], [14, 400]] },
  { id: "copper", table: "Elements", report: R_MIN, male: [[9, 0.7], [14, 0.89], [19, 0.9]], ul: [[9, 5], [14, 8], [19, 10]] },
  { id: "manganese", table: "Elements", report: R_MIN, ai: true, male: [[9, 1.9], [14, 2.2], [19, 2.3]], female: [[9, 1.6], [19, 1.8]], ul: [[9, 6], [14, 9], [19, 11]] },
  { id: "potassium", table: "Elements", report: "Dietary Reference Intakes for Sodium and Potassium (2019)", ai: true, male: [[9, 2500], [14, 3000], [19, 3400]], female: [[9, 2300], [19, 2600]] },
  { id: "vitamin_a", table: "Vitamins", report: R_VIT, male: [[9, 600], [14, 900]], female: [[9, 600], [14, 700]], ul: [[9, 1700], [14, 2800], [19, 3000]], ulSupplementsOnly: true, ulNote: "tính cho vitamin A (retinol) từ thực phẩm bổ sung, không tính cho thức ăn thường" },
  { id: "vitamin_d", table: "Vitamins", report: "Dietary Reference Intakes for Calcium and Vitamin D (2011)", male: [[9, 15], [71, 20]], ul: [[9, 100]] },
  { id: "vitamin_e", table: "Vitamins", report: R_VIT, male: [[9, 11], [14, 15]], ul: [[9, 600], [14, 800], [19, 1000]], ulSupplementsOnly: true, ulNote: "tính cho vitamin E tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường" },
  { id: "vitamin_k", table: "Vitamins", report: R_VIT, ai: true, male: [[9, 60], [14, 75], [19, 120]], female: [[9, 60], [14, 75], [19, 90]] },
  { id: "b1", table: "Vitamins", report: R_VIT, male: [[9, 0.9], [14, 1.2]], female: [[9, 0.9], [14, 1], [19, 1.1]] },
  { id: "b2", table: "Vitamins", report: R_VIT, male: [[9, 0.9], [14, 1.3]], female: [[9, 0.9], [14, 1], [19, 1.1]] },
  { id: "b3", table: "Vitamins", report: R_VIT, male: [[9, 12], [14, 16]], female: [[9, 12], [14, 14]], ul: [[9, 20], [14, 30], [19, 35]], ulSupplementsOnly: true, ulNote: "tính cho niacin tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường" },
  { id: "b5", table: "Vitamins", report: R_VIT, ai: true, male: [[9, 4], [14, 5]] },
  { id: "b6", table: "Vitamins", report: R_VIT, male: [[9, 1], [14, 1.3], [51, 1.7]], female: [[9, 1], [14, 1.2], [19, 1.3], [51, 1.5]], ul: [[9, 60], [14, 80], [19, 100]] },
  { id: "folate", table: "Vitamins", report: R_VIT, male: [[9, 300], [14, 400]], ul: [[9, 600], [14, 800], [19, 1000]], ulSupplementsOnly: true, ulNote: "tính cho axit folic tổng hợp từ thực phẩm bổ sung, không tính cho thức ăn thường" },
  { id: "b12", table: "Vitamins", report: R_VIT, male: [[9, 1.8], [14, 2.4]] },
  { id: "vitamin_c", table: "Vitamins", report: R_VIT, male: [[9, 45], [14, 75], [19, 90]], female: [[9, 45], [14, 65], [19, 75]], ul: [[9, 1200], [14, 1800], [19, 2000]] },
];

const at = (steps: Steps, age: number): number => steps.reduce((value, [from, v]) => (age >= from ? v : value), steps[0][1]);

/** Age in whole years in `year` (the profile keeps the year of birth, not the day). */
export const ageOf = (birthYear: number, year = new Date().getFullYear()): number => year - birthYear;

/** The life stage an age falls in: the last one it has reached. */
export const bandOf = (age: number): number => DRI_STAGE_FROM.reduce((stage, from, i) => (age >= from ? i : stage), 0);

/** "Nam 19–30 tuổi": who a value is for. */
export const rdaWho = (sex: RdaSex, age: number): string => `${sex === "male" ? "Nam" : "Nữ"} ${DRI_STAGE_LABEL[bandOf(age)]} tuổi`;

/** The RDA or AI of one nutrient for one person, or undefined when the id is not one of the 21. */
export function driValue(id: string, sex: RdaSex, age: number): number | undefined {
  const row = DRI.find((r) => r.id === id);
  return row ? at(sex === "female" ? row.female ?? row.male : row.male, age) : undefined;
}

/** The 21 targets of one person: one value each (min = max), by id. */
export function rdaTargets(sex: RdaSex, age: number): Record<string, TargetRange> {
  return Object.fromEntries(
    DRI.map((row) => {
      const value = at(sex === "female" ? row.female ?? row.male : row.male, age);
      return [row.id, { min: value, max: value }];
    })
  );
}

export interface UpperLimit {
  /** The Tolerable Upper Intake Level, in the nutrient's unit */
  limit: number;
  /** Only supplements (and fortified foods) count against it */
  supplementsOnly: boolean;
  /** What the limit is for, when it is for one form of the nutrient */
  note?: string;
}

/** The ULs of one person by nutrient id. A nutrient with no UL (potassium, vitamin K, B1, B2, B5, B12) is not in it. */
export function upperLimits(age: number): Record<string, UpperLimit> {
  return Object.fromEntries(
    DRI.filter((row) => row.ul).map((row) => [
      row.id,
      { limit: at(row.ul as Steps, age), supplementsOnly: row.ulSupplementsOnly === true, ...(row.ulNote ? { note: row.ulNote } : {}) },
    ])
  );
}
