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
import { DRAFT_KEY, readDraft, validateSetupDraft, type SetupDraft } from "./onboarding";
import { applyProfileTargets } from "./day-targets";

export { applyProfileTargets };
import { formatAmount } from "./format";
import { applyCustomTargets, CUSTOM_TARGETS_ENABLED, parseCustomTargets, type CustomTargets } from "./custom-targets";
import { ageOf } from "./rda";
import { PROFILE_KEY, accountStorage } from "./storage-keys";
import { NO_COACHING, normaliseCoaching, type CoachingState } from "./coaching-link";
import { cleanDisplayName, validateDisplayName } from "./display-name";

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
const MAX_TRAINING_MINUTES = 240;

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

