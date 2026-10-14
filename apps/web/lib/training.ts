import { formatAmount } from "./format";
import { targetRangeText } from "./profile";
import type { CompleteTargets } from "./targets";

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

export interface TrainingCheckItem {
  id: string;
  label: string;
  note: string;
  dose: string;
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
 */
export function calculateSaltTarget(trainingMinutes = 0): SaltTarget {
  if (trainingMinutes <= 0) {
    const totalMin = BASE_SALT_MIN;
    const totalMax = BASE_SALT_MAX;
    const sodiumMin = Math.round(totalMin * SODIUM_MG_PER_G_SALT);
    const sodiumMax = Math.round(totalMax * SODIUM_MG_PER_G_SALT);

    return {
      baseMin: BASE_SALT_MIN,
      baseMax: BASE_SALT_MAX,
      topUpMin: 0,
      topUpMax: 0,
      totalMin,
      totalMax,
      sodiumMin,
      sodiumMax,
      formattedTopUp: "0",
      formattedTotal: formatSaltRange(totalMin, totalMax),
      formattedSodiumRange: `${formatAmount(sodiumMin, "mg")}–${formatAmount(sodiumMax, "mg")} mg`,
    };
  }

  const intervals = trainingMinutes / 20;
  const topUpMin = intervals * 1.0;
  const topUpMax = intervals * 1.5;
  const totalMin = BASE_SALT_MIN + topUpMin;
  const totalMax = BASE_SALT_MAX + topUpMax;

  const sodiumMin = Math.round(totalMin * SODIUM_MG_PER_G_SALT);
  const sodiumMax = Math.round(totalMax * SODIUM_MG_PER_G_SALT);

  return {
    baseMin: BASE_SALT_MIN,
    baseMax: BASE_SALT_MAX,
    topUpMin,
    topUpMax,
    totalMin,
    totalMax,
    sodiumMin,
    sodiumMax,
    formattedTopUp: formatSaltRange(topUpMin, topUpMax),
    formattedTotal: formatSaltRange(totalMin, totalMax),
    formattedSodiumRange: `${formatAmount(sodiumMin, "mg")}–${formatAmount(sodiumMax, "mg")} mg`,
  };
}

/**
 * Available duration buttons on Training screen.
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

/**
 * Generate checklist phases for a given training duration.
 */
export function getTrainingPhases(trainingMinutes: number, ticked: readonly string[] = []): TrainingPhase[] {
  if (trainingMinutes <= 0) {
    return [];
  }
  // A "✓ Đã ghi" note only for an item the user ticked that day; an untouched day shows none
  const loggedNote = (id: string, note: string) => (ticked.includes(id) ? note : "");

  const preItems: TrainingCheckItem[] = [
    {
      id: "pre-cha-la",
      label: "Chà là",
      note: loggedNote("pre-cha-la", "✓ Đã đánh dấu"),
      dose: "30 g",
    },
    {
      id: "pre-cu-den",
      label: "Bột củ dền (Dalahouse)",
      note: "Tăng lưu chuyển dinh dưỡng",
      dose: "3 g",
    },
  ];

  // Intra items: 20-min salt doses + Fast Carb
  const intraItems: TrainingCheckItem[] = [];
  const numSaltIntervals = Math.max(1, Math.floor(trainingMinutes / 20));

  for (let i = 0; i < numSaltIntervals; i++) {
    const startMin = i * 20;
    const endMin = (i + 1) * 20;
    const id = `intra-salt-${startMin}-${endMin}`;

    intraItems.push({
      id,
      label: `Muối · phút ${startMin}–${endMin}`,
      note: loggedNote(id, "✓ Đã đánh dấu"),
      dose: "1–1,5 g",
    });
  }

  intraItems.push({
    id: "intra-carb",
    label: "Tinh bột nhanh",
    note: "Redbull · Redbull + mật mía · mật mía Golden Barrel",
    dose: "30–45 g",
  });

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
      text: `Đạm vẫn ${targetRangeText(targets.protein, "g")}`,
      path: "M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12", // Dumbbell icon
    },
    {
      id: "energy",
      text: `Năng lượng giữ ${targetRangeText(targets.calories, "kcal")}`,
      path: "M13 3L5 14h6l-1 7 8-11h-6z", // Lightning icon
    },
  ];
}
