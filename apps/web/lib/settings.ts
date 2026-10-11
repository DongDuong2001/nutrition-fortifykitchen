export const SETTINGS_STORAGE_KEY = "h1t_settings_v1";

export interface AppSettings {
  language: "vi" | "en";
  decimalSeparator: "comma" | "dot";
  energyUnit: "kcal" | "kJ";
  mealReminders: boolean;
  trainingReminders: boolean;
  weeklySummary: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "vi",
  decimalSeparator: "comma",
  energyUnit: "kcal",
  mealReminders: true,
  trainingReminders: true,
  weeklySummary: false,
};

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
 * Load user settings from localStorage (guarded, fallback to DEFAULT_SETTINGS).
 */
export function loadSettings(storage: KeyValueStorage | null = browserStorage()): AppSettings {
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
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update user settings in localStorage (guarded).
 */
export function saveSettings(
  partial: Partial<AppSettings>,
  storage: KeyValueStorage | null = browserStorage()
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
