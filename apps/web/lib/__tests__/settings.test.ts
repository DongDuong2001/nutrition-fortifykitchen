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
    saveSettings({ mealReminders: false, weeklySummary: true }, storage);
    const loaded = loadSettings(storage);
    expect(loaded.mealReminders).toBe(false);
    expect(loaded.weeklySummary).toBe(true);
    expect(loaded.trainingReminders).toBe(true); // default
  });

  it("handles malformed JSON gracefully", () => {
    const storage = fakeStorage({ [SETTINGS_STORAGE_KEY]: "{not valid json" });
    const loaded = loadSettings(storage);
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });
});
