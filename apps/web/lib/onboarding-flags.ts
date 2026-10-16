/**
 * What the first-run tour and the tips remember about an account (cc-42), kept in its h1t_settings_v1 like levelSeen.
 * Pure: reading, adding and resetting the flags. Storage is lib/onboarding-store.ts.
 */
export interface OnboardingFlags {
  /** The tour was finished or skipped for good (leaving it halfway does not set this). */
  tourDone: boolean;
  /** "Mẹo trên từng màn hình" is off */
  tipsOff: boolean;
  /** Tip ids already shown */
  seen: string[];
  /** Features the user has used (long-press edit, meal + Thêm, tray, compare, create food, 7/30 toggle, …) */
  used: string[];
  /** "Xem lại hướng dẫn" was opened once, so its "Mới" pill goes */
  replayOpened: boolean;
}

export const DEFAULT_FLAGS: OnboardingFlags = { tourDone: false, tipsOff: false, seen: [], used: [], replayOpened: false };

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Whatever was stored, as flags: a wrong type falls back to the default for that flag. */
export function parseFlags(raw: unknown): OnboardingFlags {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_FLAGS, seen: [], used: [] };
  const v = raw as Record<string, unknown>;
  return {
    tourDone: v.tourDone === true,
    tipsOff: v.tipsOff === true,
    seen: strings(v.seen),
    used: strings(v.used),
    replayOpened: v.replayOpened === true,
  };
}

const withId = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export const markSeenIn = (flags: OnboardingFlags, id: string): OnboardingFlags => ({ ...flags, seen: withId(flags.seen, id) });
export const markUsedIn = (flags: OnboardingFlags, event: string): OnboardingFlags => ({ ...flags, used: withId(flags.used, event) });

/** Turning tips back on starts them over (every tip can show once more); what was used stays used. */
export const setTipsOffIn = (flags: OnboardingFlags, off: boolean): OnboardingFlags => ({ ...flags, tipsOff: off, seen: off ? flags.seen : [] });
