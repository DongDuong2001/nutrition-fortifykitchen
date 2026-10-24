import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "../settings";

function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("Settings store (lib/settings.ts)", () => {
  it("returns default settings when storage is empty", () => {
    const storage = fakeStorage();
    const settings = loadSettings(storage);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.language).toBe("vi");
    expect(settings.decimalSeparator).toBe("comma");
    expect(settings.energyUnit).toBe("kcal");
  });

  it("saves and loads updated settings in localStorage h1t_settings_v1", () => {
    const storage = fakeStorage();
    const updated = saveSettings({ language: "en", decimalSeparator: "dot" }, storage);
    expect(updated.language).toBe("en");
    expect(updated.decimalSeparator).toBe("dot");
    expect(updated.energyUnit).toBe("kcal"); // preserves defaults for unspecified keys

    const loaded = loadSettings(storage);
    expect(loaded).toEqual(updated);

    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.language).toBe("en");
  });

  it("saves and loads notification settings", () => {
    const storage = fakeStorage();
    saveSettings(
      {
        breakfastReminder: false,
        dinnerReminder: true,
        workoutSaltReminder: false,
        eveningSummaryReminder: true,
        breakfastTime: "08:00",
      },
      storage
    );
    const loaded = loadSettings(storage);
    expect(loaded.breakfastReminder).toBe(false);
    expect(loaded.lunchReminder).toBe(true); // default
    expect(loaded.dinnerReminder).toBe(true);
    expect(loaded.workoutSaltReminder).toBe(false);
    expect(loaded.eveningSummaryReminder).toBe(true);
    expect(loaded.breakfastTime).toBe("08:00");
  });

  it("handles malformed JSON gracefully", () => {
    const storage = fakeStorage({ [SETTINGS_STORAGE_KEY]: "{not valid json" });
    const loaded = loadSettings(storage);
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it("sound ('Âm thanh') is null until the person touches the switch, then the boolean they chose", () => {
    expect(DEFAULT_SETTINGS.sound).toBeNull();
    const storage = fakeStorage();
    expect(loadSettings(storage).sound).toBeNull();
    saveSettings({ sound: false }, storage);
    expect(loadSettings(storage).sound).toBe(false);
    saveSettings({ sound: true }, storage);
    expect(loadSettings(storage).sound).toBe(true);
  });

  it("a stored sound that is not a boolean reads as untouched", () => {
    expect(loadSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ sound: "no" }) })).sound).toBeNull();
  });
});
