import type { MockDayData, MockMicroStat } from "./mock/sample-day";

export type MicrosSummary = MockDayData["microsSummary"];

/** How many of the nutrients (100 % of target or more) count as reached. Same rule as the Micros screen. */
function reachedCount(stats: MockMicroStat[]): number {
  return stats.filter((s) => (s.percentage ?? 0) >= 100).length;
}

type KnownMicro = MockMicroStat & { consumed: number; targetMin: number };

/**
 * The nutrients with the lowest share of their target, lowest first. Only nutrients with a target and a known
 * amount count: an unknown value is never ranked as 0.
 */
export function lowestMicros(day: Pick<MockDayData, "minerals" | "vitamins">, count: number): KnownMicro[] {
  return [...day.minerals, ...day.vitamins]
    .filter((s): s is KnownMicro => s.consumed !== null && s.targetMin !== null && s.targetMin > 0)
    .sort((a, b) => a.consumed / a.targetMin - b.consumed / b.targetMin)
    .slice(0, count);
}

/**
 * The micros counts for a day, from its own vitamins and minerals. "Thiếu nhiều nhất" is the two
 * nutrients with the lowest share of their target (the share card lists three).
 */
export function microsSummaryFor(day: Pick<MockDayData, "minerals" | "vitamins">): MicrosSummary {
  const { minerals, vitamins } = day;
  const mineralsAchieved = reachedCount(minerals);
  const vitaminsAchieved = reachedCount(vitamins);

  return {
    achieved: mineralsAchieved + vitaminsAchieved,
    total: minerals.length + vitamins.length,
    mineralsAchieved,
    mineralsTotal: minerals.length,
    vitaminsAchieved,
    vitaminsTotal: vitamins.length,
    mostLacking: lowestMicros(day, 2).map((s) => s.name),
  };
}
