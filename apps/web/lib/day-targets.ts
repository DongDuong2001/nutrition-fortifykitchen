import { formatAmount } from "./format";
import { goalName } from "./onboarding";
import type { CompleteTargets, GoalType, SexType, TargetRange } from "./targets";
import type { MockDayData, MockMacroStat, MockMicroStat } from "./mock/sample-day";

// The day's targets and percentages set from a user's targets (V3-SPEC §6). Pure, and free of the profile store, so the
// demo day (lib/mock/sample-day) is built with it from lib/targets.ts and lib/rda.ts: every screen shows the same numbers.

/** What the day needs of a profile (lib/profile Profile has these). */
export interface DayUser {
  sex: SexType;
  birthYear: number;
  weightKg: number;
  goal: GoalType;
  trainingMinutesDefault: number;
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
export function applyProfileTargets(
  day: MockDayData,
  profile: DayUser,
  targets: CompleteTargets,
  trainingMinutes = profile.trainingMinutesDefault
): MockDayData {
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
      trainingMinutes,
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
