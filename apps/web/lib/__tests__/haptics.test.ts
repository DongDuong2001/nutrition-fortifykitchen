import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HAPTIC_PATTERNS, canVibrate, haptic, hapticsWanted } from "../haptics";
import { saveSettings } from "../settings";

// cc-51 Part C: Android vibration (iOS has no navigator.vibrate: nothing happens there).

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

describe("HAPTIC_PATTERNS", () => {
  it("is the agreed table", () => {
    expect(HAPTIC_PATTERNS).toEqual({ saved: 10, longPress: 20, moveDrop: 8, delete: [10, 40, 10], undo: 10, error: 60, goal100: [15, 60, 15], snap: 12, tick: 5, levelUp: [30, 30, 70] });
  });
});

describe("hapticsWanted", () => {
  it("on by default, off when switched off, on when switched on", () => {
    expect(hapticsWanted(null, false)).toBe(true);
    expect(hapticsWanted(false, false)).toBe(false);
    expect(hapticsWanted(true, true)).toBe(true);
  });
  it("reduced motion and a switch never touched: no vibration", () => {
    expect(hapticsWanted(null, true)).toBe(false);
  });
});

/** A window whose matchMedia answers the touch (pointer: coarse) and reduced-motion queries. */
const media = ({ coarse = true, reduced = false } = {}) => ({
  matchMedia: (q: string) => ({ matches: q === "(pointer: coarse)" ? coarse : q === "(prefers-reduced-motion: reduce)" ? reduced : false }),
});

describe("canVibrate (review 07:00: Android phones only)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("a touch phone with navigator.vibrate (Android)", () => {
    vi.stubGlobal("navigator", { vibrate: () => true });
    vi.stubGlobal("window", media());
    expect(canVibrate()).toBe(true);
  });
  it("desktop Chrome (vibrate, but a mouse): no", () => {
    vi.stubGlobal("navigator", { vibrate: () => true });
    vi.stubGlobal("window", media({ coarse: false }));
    expect(canVibrate()).toBe(false);
  });
  it("iOS (touch, no vibrate): no", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", media());
    expect(canVibrate()).toBe(false);
  });
});

describe("haptic", () => {
  const vibrate = vi.fn(() => true);
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
    vibrate.mockClear();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", media());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("vibrates with the kind's pattern", () => {
    haptic("delete", storage);
    expect(vibrate).toHaveBeenCalledWith([10, 40, 10]);
  });
  it("the switch off: nothing", () => {
    saveSettings({ haptics: false }, storage);
    haptic("saved", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it("iOS (no navigator.vibrate): nothing, and no error", () => {
    vi.stubGlobal("navigator", {});
    expect(() => haptic("saved", storage)).not.toThrow();
  });
  it("reduced motion with the switch never touched: nothing", () => {
    vi.stubGlobal("window", media({ reduced: true }));
    haptic("saved", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it("desktop Chrome (no coarse pointer): nothing", () => {
    vi.stubGlobal("window", media({ coarse: false }));
    haptic("delete", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
