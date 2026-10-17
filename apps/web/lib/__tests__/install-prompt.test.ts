import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTALL_PROMPT,
  INSTALL_SNOOZE_MS,
  completeInstallPrompt,
  detectInAppBrowser,
  dismissInstallPrompt,
  isAndroidDevice,
  isTouchPhone,
  noteInstallOpen,
  normalizeInstallPrompt,
  phoneKind,
  shouldShowInstallPrompt,
  type InstallPromptInput,
} from "../pwa";
import { DEFAULT_SETTINGS, loadInstallPrompt, loadSettings, saveInstallPrompt, saveSettings } from "../settings";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

describe("detectInAppBrowser", () => {
  it("names the app a page is open in", () => {
    expect(detectInAppBrowser(`${IPHONE_SAFARI} Zalo/24.05.1`)).toBe("Zalo");
    expect(detectInAppBrowser("Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36 Zalo/24.1")).toBe("Zalo");
    expect(detectInAppBrowser(`${IPHONE_SAFARI} [FBAN/FBIOS;FBAV/450.0;FBBV/1]`)).toBe("Facebook");
    expect(detectInAppBrowser(`${ANDROID_CHROME} [FB_IAB/FB4A;FBAV/450.0;]`)).toBe("Facebook");
    expect(detectInAppBrowser(`${ANDROID_CHROME} [FB_IAB/MESSENGER;FBAV/450.0;]`)).toBe("Messenger");
    expect(detectInAppBrowser(`${IPHONE_SAFARI} [FBAN/MessengerForiOS;FBAV/450.0]`)).toBe("Messenger");
    expect(detectInAppBrowser(`${IPHONE_SAFARI} Instagram 330.0.0`)).toBe("Instagram");
    expect(detectInAppBrowser(`${IPHONE_SAFARI} musical_ly_32.5.0`)).toBe("TikTok");
    expect(detectInAppBrowser(`${ANDROID_CHROME} TikTok 32.5`)).toBe("TikTok");
  });

  it("is null in a real browser", () => {
    expect(detectInAppBrowser(IPHONE_SAFARI)).toBeNull();
    expect(detectInAppBrowser(ANDROID_CHROME)).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
  });
});

describe("phone kind", () => {
  it("tells iPhone, Android and the rest apart", () => {
    expect(phoneKind(IPHONE_SAFARI, 5)).toBe("ios");
    expect(phoneKind(ANDROID_CHROME, 5)).toBe("android");
    expect(isAndroidDevice(ANDROID_CHROME)).toBe(true);
    expect(phoneKind("Mozilla/5.0 (X11; Linux x86_64) Chrome/124", 0)).toBeNull();
  });

  it("a touch phone is a coarse pointer under 1024 px", () => {
    expect(isTouchPhone(true, 390)).toBe(true);
    expect(isTouchPhone(true, 1023)).toBe(true);
    expect(isTouchPhone(true, 1024)).toBe(false);
    expect(isTouchPhone(false, 390)).toBe(false);
  });
});

const NOW = 1_800_000_000_000;
const ready: InstallPromptInput = {
  touchPhone: true,
  standalone: false,
  signedIn: true,
  setupDone: true,
  pathname: "/",
  hasLoggedFood: true,
  todayIso: "2026-10-17",
  state: { ...DEFAULT_INSTALL_PROMPT, firstSeenIso: "2026-10-17" },
  now: NOW,
  shownThisSession: false,
  busy: false,
};

describe("shouldShowInstallPrompt", () => {
  it("shows when every condition holds", () => {
    expect(shouldShowInstallPrompt(ready)).toBe(true);
  });

  it.each<[string, Partial<InstallPromptInput>]>([
    ["not a touch phone", { touchPhone: false }],
    ["standalone", { standalone: true }],
    ["signed out", { signedIn: false }],
    ["setup unfinished", { setupDone: false }],
    ["another route", { pathname: "/explore" }],
    ["already done", { state: { ...ready.state, done: true } }],
    ["dismissed three times", { state: { ...ready.state, dismissCount: 3 } }],
    ["snoozed", { state: { ...ready.state, snoozeUntil: NOW + 1 } }],
    ["shown this session", { shownThisSession: true }],
    ["something else is open", { busy: true }],
  ])("is false when %s", (_name, patch) => {
    expect(shouldShowInstallPrompt({ ...ready, ...patch })).toBe(false);
  });

  it("needs a logged food or the second day", () => {
    const firstDayNoFood = { ...ready, hasLoggedFood: false };
    expect(shouldShowInstallPrompt(firstDayNoFood)).toBe(false);
    expect(shouldShowInstallPrompt({ ...firstDayNoFood, state: { ...ready.state, firstSeenIso: "2026-10-16" } })).toBe(true);
    expect(shouldShowInstallPrompt({ ...firstDayNoFood, state: { ...ready.state, firstSeenIso: null } })).toBe(false);
  });

  it("allows two dismissals and a snooze that has run out", () => {
    expect(shouldShowInstallPrompt({ ...ready, state: { ...ready.state, dismissCount: 2, snoozeUntil: NOW } })).toBe(true);
  });
});

describe("install prompt state", () => {
  it("a dismissal counts and snoozes for 3 days", () => {
    const next = dismissInstallPrompt(DEFAULT_INSTALL_PROMPT, NOW);
    expect(next.dismissCount).toBe(1);
    expect(next.snoozeUntil).toBe(NOW + 3 * 24 * 60 * 60 * 1000);
    expect(INSTALL_SNOOZE_MS).toBe(3 * 24 * 60 * 60 * 1000);
    expect(next.done).toBe(false);
  });

  it("finishing sets done", () => {
    expect(completeInstallPrompt(DEFAULT_INSTALL_PROMPT).done).toBe(true);
  });

  it("the first open day is noted once", () => {
    const first = noteInstallOpen(DEFAULT_INSTALL_PROMPT, "2026-10-16");
    expect(first.firstSeenIso).toBe("2026-10-16");
    expect(noteInstallOpen(first, "2026-10-17")).toBe(first);
  });

  it("normalises anything stored", () => {
    expect(normalizeInstallPrompt(undefined)).toEqual(DEFAULT_INSTALL_PROMPT);
    expect(normalizeInstallPrompt("x")).toEqual(DEFAULT_INSTALL_PROMPT);
    expect(normalizeInstallPrompt({ dismissCount: -2, snoozeUntil: "a", done: "yes", firstSeenIso: 5 })).toEqual(DEFAULT_INSTALL_PROMPT);
    expect(normalizeInstallPrompt({ dismissCount: 2, snoozeUntil: 99, done: true, firstSeenIso: "2026-10-16" })).toEqual({
      dismissCount: 2,
      snoozeUntil: 99,
      done: true,
      firstSeenIso: "2026-10-16",
    });
  });
});

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

describe("install prompt in h1t_settings_v1", () => {
  it("defaults, and survives other settings being saved", () => {
    const storage = fakeStorage();
    expect(loadSettings(storage).installPrompt).toEqual(DEFAULT_SETTINGS.installPrompt);
    saveInstallPrompt(dismissInstallPrompt(DEFAULT_INSTALL_PROMPT, NOW), storage);
    saveSettings({ language: "en" }, storage);
    expect(loadInstallPrompt(storage)).toEqual({ ...DEFAULT_INSTALL_PROMPT, dismissCount: 1, snoozeUntil: NOW + INSTALL_SNOOZE_MS });
    expect(loadSettings(storage).language).toBe("en");
  });

  it("done is kept", () => {
    const storage = fakeStorage();
    saveInstallPrompt(completeInstallPrompt(DEFAULT_INSTALL_PROMPT), storage);
    expect(loadInstallPrompt(storage).done).toBe(true);
  });

  it("without a storage nothing is read or written", () => {
    expect(loadInstallPrompt(null)).toEqual(DEFAULT_INSTALL_PROMPT);
    expect(() => saveInstallPrompt(DEFAULT_INSTALL_PROMPT, null)).not.toThrow();
  });
});
