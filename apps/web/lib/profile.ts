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
import { DRAFT_KEY, goalName, readDraft, validateSetupDraft, type SetupDraft } from "./onboarding";
import { formatAmount } from "./format";
import type { MockDayData, MockMacroStat, MockMicroStat } from "./mock/sample-day";
import { PROFILE_KEY, accountStorage } from "./storage-keys";
import { NO_COACHING, normaliseCoaching, type CoachingState } from "./coaching-link";
import { cleanDisplayName, validateDisplayName } from "./display-name";

export { PROFILE_KEY, cleanDisplayName };

export interface Profile extends CoachingState {
  sex: SexType;
  birthYear: number;
  weightKg: number;
  goal: GoalType;
  /** Women only: iron target 28 mg instead of 18 mg. Always false for men (see normaliseProfile). */
  periodMode: boolean;
  trainingMinutesDefault: number;
  /** Optional name shown on Cài đặt. "" means not set. */
  displayName: string;
  macroMode?: MacroTargetMode;
  macroRatios?: MacroRatios;
  macroFixed?: MacroFixedGrams;
  customEnergyKcal?: number;
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

export function targetsFor(profile: Profile): CompleteTargets {
  return calculateTargets({
    sex: profile.sex,
    weightKg: profile.weightKg,
    goal: profile.goal,
    trainingMinutes: profile.trainingMinutesDefault,
    isPeriod: profile.sex === "female" && profile.periodMode,
    macroMode: profile.macroMode,
    macroRatios: profile.macroRatios,
    macroFixed: profile.macroFixed,
    customEnergyKcal: profile.customEnergyKcal,
  });
}

/** "1.950–2.275 kcal", or "28 mg" when the target is one value. */
export function targetRangeText(range: TargetRange, unit: string): string {
  const min = formatAmount(range.min, unit);
  return range.max === range.min ? `${min} ${unit}` : `${min}–${formatAmount(range.max, unit)} ${unit}`;
}

/** Same stat with a new target. The display text and percentage follow the diary's own formulas. */
function retarget<S extends MockMacroStat | MockMicroStat>(stat: S, range: TargetRange): S {
  const { consumed, unit } = stat;
  const targetMax = range.max === range.min ? undefined : range.max;
  const target =
    targetMax === undefined
      ? formatAmount(range.min, unit)
      : `${formatAmount(range.min, unit)}–${formatAmount(targetMax, unit)}`;
  return {
    ...stat,
    targetMin: range.min,
    targetMax,
    percentage: consumed === null ? null : range.min > 0 ? Math.round((consumed / range.min) * 100) : 0,
    displayValue: consumed === null ? stat.displayValue : `${formatAmount(consumed, unit)} / ${target} ${unit}`,
  };
}

/**
 * The day with its targets, user and achieved counts set from the profile. Pure: the day it is
 * given is not changed. Stats the profile does not set keep the values the day has.
 */
export function applyProfileTargets(day: MockDayData, profile: Profile, targets: CompleteTargets): MockDayData {
  const retargetAll = <S extends MockMacroStat | MockMicroStat>(stats: S[]): S[] =>
    stats.map((stat) => {
      const range = targets[stat.key];
      return range ? retarget(stat, range) : stat;
    });

  const macros = retargetAll(day.macros);
  const minerals = retargetAll(day.minerals);
  const vitamins = retargetAll(day.vitamins);
  const kcal = targets.calories;
  const consumed = day.calories.consumed ?? 0;
  const achieved = (stats: MockMicroStat[]) => stats.filter((s) => (s.percentage ?? 0) >= 100).length;
  const vitaminsAchieved = achieved(vitamins);
  const mineralsAchieved = achieved(minerals);

  return {
    ...day,
    user: {
      ...day.user,
      sex: profile.sex,
      birthYear: profile.birthYear,
      weightKg: profile.weightKg,
      goal: profile.goal,
      goalLabel: goalName(profile.goal),
      trainingMinutes: profile.trainingMinutesDefault,
    },
    calories: {
      ...day.calories,
      targetMin: kcal.min,
      targetMax: kcal.max,
      remaining: Math.max(0, kcal.min - consumed),
      percentage: Math.round((consumed / kcal.min) * 100),
    },
    macros,
    minerals,
    vitamins,
    microsSummary: { ...day.microsSummary, achieved: vitaminsAchieved + mineralsAchieved, vitaminsAchieved, mineralsAchieved },
  };
}
