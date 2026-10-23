import { formatAmount } from "./format";
import { targetRangeText } from "./profile";
import type { CompleteTargets } from "./targets";
import type { OwnTrainingItem, TrainingPhaseId } from "./training-prefs";

export const BASE_SALT_MIN = 4;
export const BASE_SALT_MAX = 6;
export const SODIUM_MG_PER_G_SALT = 393;

export interface SaltTarget {
  baseMin: number;
  baseMax: number;
  topUpMin: number;
  topUpMax: number;
  totalMin: number;
  totalMax: number;
  sodiumMin: number;
  sodiumMax: number;
  formattedTopUp: string;
  formattedTotal: string;
  formattedSodiumRange: string;
}

export interface TrainingDurationOption {
  id: string;
  minutes: number;
  label: string;
}

/** cc-52: Bé takes the lower end of every coach range, Bự the upper. */
export type TrainingSize = "be" | "bu";

export const TRAINING_SIZE_NAME: Record<TrainingSize, string> = { be: "Bé", bu: "Bự" };

const pickEnd = (min: number, max: number, size: TrainingSize | null) => (size === "bu" ? max : min);

export interface TrainingCheckItem {
  id: string;
  label: string;
  note: string;
  dose: string;
  /** The portion a tick logs, in grams: the dose at the chosen end (the lower end until a size is chosen) */
  grams?: number;
  /** `grams` are grams of carbs, not of the food (Tinh bột nhanh, Hao 18/10): the amount comes from the food's carbs */
  carbs?: boolean;
  /** Coach item: what it can log (lib/training-foods choices); several = the user picks one in the sheet */
  foods?: readonly string[];
  /** The user's own item: logs this catalogue food, and can be removed */
  own?: boolean;
  foodId?: string;
  servingLabel?: string;
}

export interface TrainingPhase {
  id: string;
  name: string;
  items: TrainingCheckItem[];
}

export interface RestDayTip {
  id: string;
  text: string;
  path: string;
}

/**
 * Format a salt range using formatAmount with Vietnamese localization.
 * Example: (4, 6) -> "4–6", (7, 10.5) -> "7–10,5"
 */
export function formatSaltRange(min: number, max: number): string {
  if (min === max) {
    return formatAmount(min, "g");
  }
  return `${formatAmount(min, "g")}–${formatAmount(max, "g")}`;
}

/**
 * Calculate base salt, top-up salt (1–1,5 g per 20 min training), total salt, and sodium.
 * With a size (cc-52), every range collapses to its chosen end: Bé 4 g + 1 g per 20 min, Bự 6 g + 1,5 g.
 */
export function calculateSaltTarget(trainingMinutes = 0, size: TrainingSize | null = null): SaltTarget {
  const intervals = trainingMinutes > 0 ? trainingMinutes / 20 : 0;
  const end = (min: number, max: number): [number, number] => (size ? [pickEnd(min, max, size), pickEnd(min, max, size)] : [min, max]);
  const [baseMin, baseMax] = end(BASE_SALT_MIN, BASE_SALT_MAX);
  const [topUpMin, topUpMax] = end(intervals * 1.0, intervals * 1.5);
  const totalMin = baseMin + topUpMin;
  const totalMax = baseMax + topUpMax;
  const sodiumMin = Math.round(totalMin * SODIUM_MG_PER_G_SALT);
  const sodiumMax = Math.round(totalMax * SODIUM_MG_PER_G_SALT);

  return {
    baseMin,
    baseMax,
    topUpMin,
    topUpMax,
    totalMin,
    totalMax,
    sodiumMin,
    sodiumMax,
    formattedTopUp: intervals > 0 ? formatSaltRange(topUpMin, topUpMax) : "0",
    formattedTotal: formatSaltRange(totalMin, totalMax),
    formattedSodiumRange:
      sodiumMin === sodiumMax
        ? `${formatAmount(sodiumMin, "mg")} mg`
        : `${formatAmount(sodiumMin, "mg")}–${formatAmount(sodiumMax, "mg")} mg`,
  };
}

/** True for the minutes of a preset chip (Nghỉ, 45, 60, 90, 120): any other number of minutes is Tùy chỉnh. */
export const isPresetMinutes = (minutes: number): boolean => getTrainingDurations().some((d) => d.minutes === minutes);

export { CUSTOM_DURATION_ID, CUSTOM_MINUTES_MAX, CUSTOM_MINUTES_MIN, CUSTOM_MINUTES_STEP, clampTrainingMinutes } from "./training-limits";

/**
 * Available duration buttons on Training screen (Tùy chỉnh comes after them: CUSTOM_DURATION_ID).
 */
export function getTrainingDurations(): TrainingDurationOption[] {
  return [
    { id: "rest", minutes: 0, label: "Nghỉ" },
    { id: "45", minutes: 45, label: "45 phút" },
    { id: "60", minutes: 60, label: "60 phút" },
    { id: "90", minutes: 90, label: "90 phút" },
    { id: "120", minutes: 120, label: "120 phút" },
  ];
}

export interface TrainingPhaseOptions {
  size?: TrainingSize | null;
  /** The amount each ticked item logged, by item id: its note says so ("✓ Đã ghi 1,5 g") */
  logged?: Readonly<Record<string, string>>;
  /** The user's own items, shown after the coach items of their phase */
  own?: readonly OwnTrainingItem[];
}

/** A coach dose: fixed (30 g), or a range shown and pre-filled at the chosen end (the lower end until one is chosen). */
function coachDose(min: number, max: number, size: TrainingSize | null): Pick<TrainingCheckItem, "dose" | "grams"> {
  if (min === max || size) {
    const grams = pickEnd(min, max, size);
    return { dose: `${formatAmount(grams, "g")} g`, grams };
  }
  return { dose: `${formatSaltRange(min, max)} g`, grams: min };
}

/**
 * Generate checklist phases for a given training duration.
 */
export function getTrainingPhases(
  trainingMinutes: number,
  ticked: readonly string[] = [],
  { size = null, logged = {}, own = [] }: TrainingPhaseOptions = {}
): TrainingPhase[] {
  if (trainingMinutes <= 0) {
    return [];
  }
  // A ✓ note only for an item the user ticked that day; an untouched day shows none
  const note = (id: string, untickedNote = "") =>
    ticked.includes(id) ? (logged[id] ? `✓ Đã ghi ${logged[id]}` : "✓ Đã dùng") : untickedNote;

  const ownOf = (phase: TrainingPhaseId): TrainingCheckItem[] =>
    own
      .filter((i) => i.phase === phase)
      .map((i) => ({ id: i.id, label: i.name, note: note(i.id), dose: i.label, grams: i.grams, own: true, foodId: i.foodId, servingLabel: i.label }));

  const preItems: TrainingCheckItem[] = [
    { id: "pre-cha-la", label: "Chà là", note: note("pre-cha-la"), ...coachDose(30, 30, size), foods: ["cha-la"] },
    {
      id: "pre-cu-den",
      label: "Bột củ dền (Dalahouse)",
      note: note("pre-cu-den", "Tăng lưu chuyển dinh dưỡng"),
      ...coachDose(3, 3, size),
      foods: ["cu-den"],
    },
    ...ownOf("pre-workout"),
  ];

  // Intra items: 20-min salt doses + Fast Carb
  const intraItems: TrainingCheckItem[] = [];
  const numSaltIntervals = Math.max(1, Math.floor(trainingMinutes / 20));

  for (let i = 0; i < numSaltIntervals; i++) {
    const startMin = i * 20;
    const endMin = (i + 1) * 20;
    const id = `intra-salt-${startMin}-${endMin}`;

    intraItems.push({ id, label: `Muối · phút ${startMin}–${endMin}`, note: note(id), ...coachDose(1, 1.5, size), foods: ["muoi"] });
  }

  intraItems.push({
    id: "intra-carb",
    label: "Tinh bột nhanh",
    note: note("intra-carb", "Red Bull · Red Bull + mật mía · mật mía Golden Barrel"),
    ...coachDose(30, 45, size),
    carbs: true,
    foods: ["redbull", "redbull-mat-mia", "mat-mia"],
  });
  intraItems.push(...ownOf("intra-workout"));

  return [
    {
      id: "pre-workout",
      name: "Trước tập",
      items: preItems,
    },
    {
      id: "intra-workout",
      name: `Trong tập · ${trainingMinutes} phút`,
      items: intraItems,
    },
  ];
}

/**
 * Recovery tips for Rest day (from TrainingRest.dc.html). The protein and energy ranges are the user's own targets.
 */
export function getRestDayTips(targets: Pick<CompleteTargets, "calories" | "protein">): RestDayTip[] {
  return [
    {
      id: "sleep",
      text: "Ngủ đủ 7–9 tiếng",
      path: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z", // Moon icon
    },
    {
      id: "protein",
      text: `Giữ mức đạm ${targetRangeText(targets.protein, "g")}`,
      path: "M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12", // Dumbbell icon
    },
    {
      id: "energy",
      text: `Năng lượng giữ ${targetRangeText(targets.calories, "kcal")}`,
      path: "M13 3L5 14h6l-1 7 8-11h-6z", // Lightning icon
    },
  ];
}
