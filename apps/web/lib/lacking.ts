import type { MockDayData, MockMicroStat } from "./mock/sample-day";

export type MicrosSummary = MockDayData["microsSummary"];

/** How many of the nutrients (100 % of target or more) count as reached. Same rule as the Micros screen. */
function reachedCount(stats: MockMicroStat[]): number {
  return stats.filter((s) => (s.percentage ?? 0) >= 100).length;
}

/**
 * The micros counts for a day, from its own vitamins and minerals. "Thiếu nhiều nhất" is the two
 * nutrients with the lowest share of their target. Only nutrients with a target and a known amount count.
 */
export function microsSummaryFor(day: Pick<MockDayData, "minerals" | "vitamins">): MicrosSummary {
  const { minerals, vitamins } = day;
  const mineralsAchieved = reachedCount(minerals);
  const vitaminsAchieved = reachedCount(vitamins);

  const lacking = [...minerals, ...vitamins]
    .filter((s): s is MockMicroStat & { consumed: number; targetMin: number } =>
      s.consumed !== null && s.targetMin !== null && s.targetMin > 0
    )
    .sort((a, b) => a.consumed / a.targetMin - b.consumed / b.targetMin);

  return {
    achieved: mineralsAchieved + vitaminsAchieved,
    total: minerals.length + vitamins.length,
    mineralsAchieved,
    mineralsTotal: minerals.length,
    vitaminsAchieved,
    vitaminsTotal: vitamins.length,
    mostLacking: lacking.slice(0, 2).map((s) => s.name),
  };
}
