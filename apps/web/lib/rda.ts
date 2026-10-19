/**
 * cc-67 part 4 (Hao 19/10): the daily targets of the 22 vitamins and minerals are the standard recommended amounts by sex
 * and age, not our formulas. Source: Bộ Y tế, Viện Dinh dưỡng, "Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam" (VN 2016,
 * ban hành kèm Quyết định 2615/QĐ-BYT ngày 16/6/2016): the RDA, or the AI where the table has no RDA. VN 2016 has a value
 * for every one of the 22, so no NIH ODS fallback is needed. Sodium is not in this table: Hao keeps the coach's training formula for it for now. The table of each row is in `table`; where VN 2016 gives
 * several columns the choice is in docs/rda-vn2016-targets-2026-10-19.md (iron at 15% absorption, zinc at moderate
 * absorption, potassium as its AI). The numbers are copied as printed.
 *
 * One value per sex and age band, eight bands: 10–11, 12–14, 15–17, 18–19, 20–29, 30–49, 50–69, 70+ (VN 2016's own).
 */
import type { TargetRange } from "./targets";

export type RdaSex = "male" | "female";

/** The age each band starts at. A younger age takes the first band. */
export const RDA_BAND_FROM = [10, 12, 15, 18, 20, 30, 50, 70] as const;
export const RDA_BAND_LABEL = ["10–11", "12–14", "15–17", "18–19", "20–29", "30–49", "50–69", "70+"] as const;

type Bands = readonly [number, number, number, number, number, number, number, number];

export interface RdaRow {
  id: string;
  /** The table of VN 2016 the numbers are from (Bảng N) */
  table: number;
  male: Bands;
  /** Missing: the same as male (both sexes have one value) */
  female?: Bands;
}

/**
 * Per nutrient: the table of VN 2016 and the values for the eight bands, male then female. Units are the catalogue's
 * (lib/nutrients); the choice among columns (iron at 15% absorption, zinc at moderate absorption, potassium as its AI) is in docs/rda-vn2016-targets-2026-10-19.md. Copied as printed.
 */
export const RDA: readonly RdaRow[] = [
  { id: "calcium", table: 16, male: [1000, 1000, 1000, 1000, 800, 800, 800, 1000], female: [1000, 1000, 1000, 1000, 800, 800, 900, 1000] },
  { id: "phosphorus", table: 17, male: [1250, 1250, 1250, 1250, 700, 700, 700, 700] },
  { id: "magnesium", table: 18, male: [210, 290, 350, 350, 340, 370, 350, 320], female: [210, 280, 300, 300, 270, 290, 290, 260] },
  { id: "iron", table: 19, male: [7.5, 10.2, 11.6, 11.6, 7.9, 7.9, 7.9, 7.3], female: [7, 9.3, 19.8, 19.8, 17.4, 17.4, 6.7, 6.3] },
  { id: "zinc", table: 20, male: [8.6, 9, 10, 10, 10, 10, 10, 9], female: [7.2, 8, 8, 8, 8, 8, 8, 7] },
  { id: "selenium", table: 22, male: [32, 32, 32, 32, 34, 34, 34, 33], female: [26, 26, 26, 26, 26, 26, 26, 25] },
  { id: "copper", table: 23, male: [0.7, 0.7, 0.89, 0.89, 0.9, 0.9, 0.9, 0.9] },
  { id: "manganese", table: 25, male: [1.9, 1.9, 2.2, 2.2, 2.3, 2.3, 2.3, 2.3], female: [1.6, 1.6, 1.6, 1.6, 1.8, 1.8, 1.8, 1.8] },
  { id: "potassium", table: 47, male: [1900, 2400, 2800, 2800, 2500, 2500, 2500, 2500], female: [1800, 2200, 2100, 2100, 2000, 2000, 2000, 2000] },
  { id: "vitamin_a", table: 27, male: [600, 800, 900, 850, 850, 900, 850, 800], female: [600, 700, 650, 650, 650, 700, 700, 650] },
  { id: "vitamin_d", table: 28, male: [15, 15, 15, 15, 15, 15, 20, 20] },
  { id: "vitamin_e", table: 29, male: [5.5, 7.5, 7.5, 6.5, 6.5, 6.5, 6.5, 6.5], female: [5.5, 6, 6, 6, 6, 6, 6, 6] },
  { id: "vitamin_k", table: 30, male: [120, 150, 160, 150, 150, 150, 150, 150] },
  { id: "b1", table: 31, male: [1.2, 1.4, 1.4, 1.4, 1.3, 1.2, 1.2, 1.1], female: [1.1, 1.3, 1.2, 1.2, 1.1, 1, 1, 1] },
  { id: "b2", table: 33, male: [1.4, 1.6, 1.7, 1.7, 1.5, 1.4, 1.4, 1.3], female: [1.3, 1.4, 1.4, 1.4, 1.2, 1.2, 1.2, 1.1] },
  { id: "b3", table: 35, male: [12, 12, 16, 16, 16, 16, 16, 16], female: [12, 12, 14, 14, 14, 14, 14, 14] },
  { id: "b5", table: 36, male: [4, 4, 5, 5, 5, 5, 5, 5] },
  { id: "b6", table: 37, male: [1, 1.2, 1.3, 1.3, 1.3, 1.3, 1.7, 1.7], female: [1, 1.1, 1.2, 1.2, 1.3, 1.3, 1.5, 1.5] },
  { id: "folate", table: 38, male: [300, 300, 300, 300, 400, 400, 400, 400], female: [300, 400, 400, 400, 400, 400, 400, 400] },
  { id: "b12", table: 39, male: [1.8, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4] },
  { id: "vitamin_c", table: 41, male: [75, 95, 100, 100, 100, 100, 100, 100] },
];

/** Age in whole years in `year` (the profile keeps the year of birth, not the day). */
export const ageOf = (birthYear: number, year = new Date().getFullYear()): number => year - birthYear;

/** The band an age falls in: the last one it has reached. */
export const bandOf = (age: number): number => RDA_BAND_FROM.reduce((at, from, i) => (age >= from ? i : at), 0);

/** "Nam 20–29 tuổi": who a value is for. */
export const rdaWho = (sex: RdaSex, age: number): string => `${sex === "male" ? "Nam" : "Nữ"} ${RDA_BAND_LABEL[bandOf(age)]} tuổi`;

/** The 22 targets of one person: one value each (min = max), by id. */
export function rdaTargets(sex: RdaSex, age: number): Record<string, TargetRange> {
  const band = bandOf(age);
  return Object.fromEntries(RDA.map((row) => [row.id, { min: (sex === "female" ? row.female ?? row.male : row.male)[band], max: (sex === "female" ? row.female ?? row.male : row.male)[band] }]));
}
