import { SETTINGS_STORAGE_KEY, accountStorage } from "./storage-keys";

export { SETTINGS_STORAGE_KEY };

export interface AppSettings {
  language: "vi" | "en";
  decimalSeparator: "comma" | "dot";
  energyUnit: "kcal" | "kJ";
  mealReminders: boolean;
  trainingReminders: boolean;
  weeklySummary: boolean;
  // Notification toggles & times
  breakfastReminder: boolean;
  breakfastTime: string;
  lunchReminder: boolean;
  lunchTime: string;
  dinnerReminder: boolean;
  dinnerTime: string;
  workoutSaltReminder: boolean;
  eveningSummaryReminder: boolean;
  eveningSummaryTime: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "vi",
  decimalSeparator: "comma",
  energyUnit: "kcal",
  mealReminders: true,
  trainingReminders: true,
  weeklySummary: false,
  breakfastReminder: true,
  breakfastTime: "07:30",
  lunchReminder: true,
  lunchTime: "12:30",
  dinnerReminder: false,
  dinnerTime: "19:30",
  workoutSaltReminder: true,
  eveningSummaryReminder: false,
  eveningSummaryTime: "21:00",
};

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Load the signed-in account's settings from localStorage (guarded, fallback to DEFAULT_SETTINGS).
 */
export function loadSettings(storage: KeyValueStorage | null = accountStorage()): AppSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };

    return {
      language: parsed.language === "en" ? "en" : "vi",
      decimalSeparator: parsed.decimalSeparator === "dot" ? "dot" : "comma",
      energyUnit: parsed.energyUnit === "kJ" ? "kJ" : "kcal",
      mealReminders: typeof parsed.mealReminders === "boolean" ? parsed.mealReminders : DEFAULT_SETTINGS.mealReminders,
      trainingReminders: typeof parsed.trainingReminders === "boolean" ? parsed.trainingReminders : DEFAULT_SETTINGS.trainingReminders,
      weeklySummary: typeof parsed.weeklySummary === "boolean" ? parsed.weeklySummary : DEFAULT_SETTINGS.weeklySummary,
      breakfastReminder: typeof parsed.breakfastReminder === "boolean" ? parsed.breakfastReminder : DEFAULT_SETTINGS.breakfastReminder,
      breakfastTime: typeof parsed.breakfastTime === "string" ? parsed.breakfastTime : DEFAULT_SETTINGS.breakfastTime,
      lunchReminder: typeof parsed.lunchReminder === "boolean" ? parsed.lunchReminder : DEFAULT_SETTINGS.lunchReminder,
      lunchTime: typeof parsed.lunchTime === "string" ? parsed.lunchTime : DEFAULT_SETTINGS.lunchTime,
      dinnerReminder: typeof parsed.dinnerReminder === "boolean" ? parsed.dinnerReminder : DEFAULT_SETTINGS.dinnerReminder,
      dinnerTime: typeof parsed.dinnerTime === "string" ? parsed.dinnerTime : DEFAULT_SETTINGS.dinnerTime,
      workoutSaltReminder: typeof parsed.workoutSaltReminder === "boolean" ? parsed.workoutSaltReminder : DEFAULT_SETTINGS.workoutSaltReminder,
      eveningSummaryReminder: typeof parsed.eveningSummaryReminder === "boolean" ? parsed.eveningSummaryReminder : DEFAULT_SETTINGS.eveningSummaryReminder,
      eveningSummaryTime: typeof parsed.eveningSummaryTime === "string" ? parsed.eveningSummaryTime : DEFAULT_SETTINGS.eveningSummaryTime,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update the signed-in account's settings in localStorage (guarded).
 */
export function saveSettings(
  partial: Partial<AppSettings>,
  storage: KeyValueStorage | null = accountStorage()
): AppSettings {
  const current = loadSettings(storage);
  const next: AppSettings = {
    ...current,
    ...partial,
  };

  if (storage) {
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota/disabled storage errors
    }
  }

  return next;
}
