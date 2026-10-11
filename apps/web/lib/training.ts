import { formatAmount } from "./format";

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
  defaultDone: boolean;
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
 * Calculate base salt, top-up salt (1–1.5 g per 20 min training), total salt, and sodium.
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
export function getTrainingPhases(trainingMinutes: number): TrainingPhase[] {
  if (trainingMinutes <= 0) {
    return [];
  }

  const preItems: TrainingCheckItem[] = [
    {
      id: "pre-cha-la",
      label: "Chà là",
      note: "✓ Đã ghi vào Trước tập",
      dose: "30 g",
      defaultDone: true,
    },
    {
      id: "pre-cu-den",
      label: "Bột củ dền (Dalahouse)",
      note: "Tăng lưu chuyển dinh dưỡng",
      dose: "3 g",
      defaultDone: true,
    },
  ];

  // Intra items: 20-min salt doses + Fast Carb
  const intraItems: TrainingCheckItem[] = [];
  const numSaltIntervals = Math.max(1, Math.floor(trainingMinutes / 20));

  for (let i = 0; i < numSaltIntervals; i++) {
    const startMin = i * 20;
    const endMin = (i + 1) * 20;
    const isFirst = i === 0;

    intraItems.push({
      id: `intra-salt-${startMin}-${endMin}`,
      label: `Muối · phút ${startMin}–${endMin}`,
      note: isFirst ? "✓ Đã ghi 1 g vào nhật ký · chạm để sửa" : "",
      dose: "1–1,5 g",
      defaultDone: isFirst,
    });
  }

  intraItems.push({
    id: "intra-carb",
    label: "Carb nhanh",
    note: "Redbull · Redbull + mật mía · mật mía Golden Barrel",
    dose: "30–45 g",
    defaultDone: false,
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
 * Recovery tips for Rest day (from TrainingRest.dc.html).
 */
export function getRestDayTips(): RestDayTip[] {
  return [
    {
      id: "sleep",
      text: "Ngủ đủ 7–9 tiếng",
      path: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z", // Moon icon
    },
    {
      id: "protein",
      text: "Đạm vẫn 104–143 g",
      path: "M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12", // Dumbbell icon
    },
    {
      id: "energy",
      text: "Năng lượng giữ 1.950–2.275 kcal",
      path: "M13 3L5 14h6l-1 7 8-11h-6z", // Lightning icon
    },
  ];
}

export const TRAINING_CHECKS_STORAGE_KEY = "h1t_training_checks_v1";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Load saved checklist ticks for a specific day (keyed by YYYY-MM-DD in Asia/Ho_Chi_Minh).
 */
export function loadTrainingChecks(
  dateKey: string,
  storage: KeyValueStorage | null = browserStorage()
): Record<string, boolean> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(TRAINING_CHECKS_STORAGE_KEY);
    if (!raw) return {};
    const store = JSON.parse(raw);
    if (store && typeof store === "object" && store[dateKey]) {
      return store[dateKey] as Record<string, boolean>;
    }
  } catch {
    // Ignore storage/JSON parse errors
  }
  return {};
}

/**
 * Save checklist ticks for a specific day (keyed by YYYY-MM-DD in Asia/Ho_Chi_Minh).
 */
export function saveTrainingChecks(
  dateKey: string,
  checks: Record<string, boolean>,
  storage: KeyValueStorage | null = browserStorage()
): void {
  if (!storage) return;
  try {
    const raw = storage.getItem(TRAINING_CHECKS_STORAGE_KEY);
    const store: Record<string, Record<string, boolean>> = raw ? JSON.parse(raw) : {};
    store[dateKey] = checks;
    storage.setItem(TRAINING_CHECKS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors (quota, disabled, etc.)
  }
}
