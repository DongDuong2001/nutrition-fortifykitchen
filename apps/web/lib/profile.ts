import {
  calculateTargets,
  type CompleteTargets,
  type GoalType,
  type MacroFixedGrams,
  type MacroRatios,
  type MacroTargetMode,
  type SexType,
  type TargetRange,
} from "./targets";
import { DRAFT_KEY, readDraft, validateSetupDraft, type SetupDraft, type SetupProfile } from "./onboarding";
import { applyProfileTargets } from "./day-targets";

export { applyProfileTargets };
import { formatAmount } from "./format";
import { applyCustomTargets, CUSTOM_TARGETS_ENABLED, parseCustomTargets, type CustomTargets } from "./custom-targets";
import { ageOf } from "./rda";
import { PROFILE_KEY, accountStorage } from "./storage-keys";
import { NO_COACHING, normaliseCoaching, type CoachingState } from "./coaching-link";
import { cleanDisplayName, validateDisplayName } from "./display-name";
import { serverAcceptsTrainingMinutes } from "./training-limits";

export { PROFILE_KEY, cleanDisplayName };

export interface Profile extends CoachingState {
  sex: SexType;
  birthYear: number;
  weightKg: number;
  goal: GoalType;
  /** Women only: iron target 28 mg (the coach rule) instead of the DRI amount for sex and age. Always false for men (see normaliseProfile). */
  periodMode: boolean;
  trainingMinutesDefault: number;
  /** Optional name shown on Cài đặt. "" means not set. */
  displayName: string;
  trainingPrefs?: unknown;
  macroMode?: MacroTargetMode;
  macroRatios?: MacroRatios;
  macroFixed?: MacroFixedGrams;
  customEnergyKcal?: number;
  /** cc-73b: a custom daily target per vitamin or mineral (lib/custom-targets). Read only while the flag is on. */
  customTargets?: CustomTargets;
  /** The server's updatedAt of the profile this device last adopted (GET /me). */
  updatedAt?: string;
  /** When the target settings were last changed on this device (ms). */
  targetsChangedAt?: number;
  /** This device's target settings have been sent to or taken from the server once: from then on the server's are the truth. */
  targetsSynced?: boolean;
}

/** The target settings: the macro split, the custom kcal and the custom micro targets. Stored on the server since migration 000015. */
export const TARGET_SETTING_KEYS = ["macroMode", "macroRatios", "macroFixed", "customEnergyKcal", "customTargets"] as const;
export type TargetSettings = Pick<Profile, (typeof TARGET_SETTING_KEYS)[number]>;

/** The five settings of a profile, every key present (undefined = not set), so a spread of them also clears. */
export function targetSettingsOf(profile: Profile): TargetSettings {
  return {
    macroMode: profile.macroMode,
    macroRatios: profile.macroRatios,
    macroFixed: profile.macroFixed,
    customEnergyKcal: profile.customEnergyKcal,
    customTargets: profile.customTargets,
  };
}

/** The fields every PUT /me/profile carries (the target settings travel only when they changed). */
export function setupFieldsOf(profile: Profile): SetupProfile {
  return {
    sex: profile.sex,
    birthYear: profile.birthYear,
    weightKg: profile.weightKg,
    goal: profile.goal,
    periodMode: profile.periodMode,
    // A Tùy chỉnh default the API does not take yet stays on this device (left out of PUT /me/profile, the server keeps its own)
    trainingMinutesDefault: serverAcceptsTrainingMinutes(profile.trainingMinutesDefault) ? profile.trainingMinutesDefault : undefined,
    displayName: profile.displayName,
  };
}

export const touchesTargetSettings = (patch: Partial<Profile>): boolean => TARGET_SETTING_KEYS.some((key) => key in patch);

const hasTargetSettings = (profile: Profile): boolean => TARGET_SETTING_KEYS.some((key) => profile[key] !== undefined);

/**
 * The server's profile (GET /me) against the one on this device, when no profile write is waiting to be sent. The server wins
 * for every key, the target settings too, once this device has synced them. Before that (they were device-only until the API
 * stored them), the device's settings are kept and uploaded once (`upload`) when the server has none, or when they were changed
 * here after the server's profile was last updated; otherwise the server's are taken.
 */
export function mergeServerProfile(server: Profile, local: Profile | null): { profile: Profile; upload: boolean } {
  const fromServer: Profile = { ...server, targetsSynced: true, targetsChangedAt: local?.targetsChangedAt };
  if (!local || local.targetsSynced || !hasTargetSettings(local)) return { profile: fromServer, upload: false };
  const serverAt = server.updatedAt ? Date.parse(server.updatedAt) : Number.NaN;
  const changedHereLater = local.targetsChangedAt !== undefined && !(serverAt >= local.targetsChangedAt);
  if (hasTargetSettings(server) && !changedHereLater) return { profile: fromServer, upload: false };
  return { profile: { ...fromServer, ...targetSettingsOf(local) }, upload: true };
}

// The sample-day user. Used when nothing is saved and no setup has started.
export const SAMPLE_PROFILE: Profile = {
  sex: "male",
  birthYear: 2003,
  weightKg: 65,
  goal: "maintain",
  periodMode: false,
  trainingMinutesDefault: 60,
  displayName: "",
  ...NO_COACHING,
};

const SEXES: readonly string[] = ["male", "female"];
const GOALS: readonly string[] = ["build", "maintain", "cut", "deep_cut"];
// Tùy chỉnh goes up to 480 minutes (lib/training CUSTOM_MINUTES_MAX)
const MAX_TRAINING_MINUTES = 480;

export function normaliseProfile(profile: Profile): Profile {
  return { ...profile, periodMode: profile.sex === "female" && profile.periodMode };
}

/** The setup form's fields for a profile, so the same rules check it. */
export function profileToDraft(profile: Profile): SetupDraft {
  return {
    sex: profile.sex,
    birthYear: String(profile.birthYear),
    weight: String(profile.weightKg),
    goal: profile.goal,
  };
}

/** Builds a profile from the setup draft (the same rules as Setup). Null when a field is out of range. */
export function profileFromDraft(draft: SetupDraft, base: Profile, currentYear: number): Profile | null {
  if (!SEXES.includes(draft.sex) || !GOALS.includes(draft.goal)) return null;
  const { profile } = validateSetupDraft(draft, currentYear);
  return profile ? normaliseProfile({ ...base, ...profile }) : null;
}

/** Reads a saved profile. Anything that fails the setup rules is ignored (null). */
export function parseStoredProfile(raw: string | null, currentYear: number): Profile | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const stored = value as Record<string, unknown>;
  const draft: SetupDraft = {
    sex: stored.sex as SexType,
    birthYear: String(stored.birthYear),
    weight: String(stored.weightKg),
    goal: stored.goal as GoalType,
  };
  const minutes = stored.trainingMinutesDefault;
  const base: Profile = {
    ...SAMPLE_PROFILE,
    periodMode: stored.periodMode === true,
    trainingMinutesDefault:
      typeof minutes === "number" && Number.isInteger(minutes) && minutes >= 0 && minutes <= MAX_TRAINING_MINUTES
        ? minutes
        : SAMPLE_PROFILE.trainingMinutesDefault,
    displayName:
      typeof stored.displayName === "string" && validateDisplayName(stored.displayName) === null
        ? cleanDisplayName(stored.displayName)
        : "",
    macroMode: typeof stored.macroMode === "string" ? (stored.macroMode as MacroTargetMode) : undefined,
    macroRatios:
      stored.macroRatios && typeof stored.macroRatios === "object"
        ? (stored.macroRatios as MacroRatios)
        : undefined,
    macroFixed:
      stored.macroFixed && typeof stored.macroFixed === "object"
        ? (stored.macroFixed as MacroFixedGrams)
        : undefined,
    customEnergyKcal: typeof stored.customEnergyKcal === "number" ? stored.customEnergyKcal : undefined,
    customTargets: parseCustomTargets(stored.customTargets),
    updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : undefined,
    targetsChangedAt: typeof stored.targetsChangedAt === "number" ? stored.targetsChangedAt : undefined,
    targetsSynced: stored.targetsSynced === true ? true : undefined,
    // Role, Level, coach: a profile saved before they existed loads as user, Level 0, no coach
    ...normaliseCoaching(stored),
  };
  return profileFromDraft(draft, base, currentYear);
}

export function readStoredProfile(currentYear: number): Profile | null {
  try {
    return parseStoredProfile(accountStorage()?.getItem(PROFILE_KEY) ?? null, currentYear);
  } catch {
    return null;
  }
}

export function writeStoredProfile(profile: Profile): void {
  try {
    accountStorage()?.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage blocked: the profile still lasts for this visit.
  }
}

function readDraftProfile(currentYear: number): Profile | null {
  try {
    if (window.sessionStorage.getItem(DRAFT_KEY) === null) return null;
  } catch {
    return null;
  }
  return profileFromDraft(readDraft(), SAMPLE_PROFILE, currentYear);
}

/** The saved profile, else the setup draft of this session, else the sample user. */
export function loadProfile(currentYear: number): Profile {
  return readStoredProfile(currentYear) ?? readDraftProfile(currentYear) ?? SAMPLE_PROFILE;
}

/** The profile's targets on a day of `trainingMinutes` (lib/training-minutes); the Hồ sơ default when not given. */
export function targetsFor(profile: Profile, trainingMinutes = profile.trainingMinutesDefault): CompleteTargets {
  const targets = calculateTargets({
    sex: profile.sex,
    weightKg: profile.weightKg,
    goal: profile.goal,
    trainingMinutes,
    isPeriod: profile.sex === "female" && profile.periodMode,
    age: ageOf(profile.birthYear),
    macroMode: profile.macroMode,
    macroRatios: profile.macroRatios,
    macroFixed: profile.macroFixed,
    customEnergyKcal: profile.customEnergyKcal,
  });
  return CUSTOM_TARGETS_ENABLED ? applyCustomTargets(targets, profile.customTargets) : targets;
}

/** "1.950–2.275 kcal", or "28 mg" when the target is one value. */
export function targetRangeText(range: TargetRange, unit: string): string {
  const min = formatAmount(range.min, unit);
  return range.max === range.min ? `${min} ${unit}` : `${min}–${formatAmount(range.max, unit)} ${unit}`;
}

