import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { calculateTargets, type UserProfileForTargets } from "../targets";
import {
  periodAverages,
  macroComposition,
  comparePeriods,
  weightSummary,
  periodTargetDays,
  type PeriodAverages,
} from "../period";
import { COUNTED_NUTRIENT_KEYS, type DayTotals } from "../day-totals";

describe("Export shared test vectors for Go API", () => {
  it("generates packages/vectors/targets.json and period.json", () => {
    const targetCases: any[] = [];
    const sexes: ("male" | "female")[] = ["male", "female"];
    const goals: ("build" | "maintain" | "cut" | "deep_cut")[] = ["build", "maintain", "cut", "deep_cut"];
    const weights = [50, 65, 70.5, 80, 95];
    const trainings = [0, 45, 60, 90, 120];

    for (const sex of sexes) {
      for (const goal of goals) {
        for (const weightKg of weights) {
          for (const trainingMinutes of [0, 60]) {
            const isPeriod = sex === "female";
            const profile: UserProfileForTargets = { sex, goal, weightKg, trainingMinutes, isPeriod };
            const output = calculateTargets(profile);
            targetCases.push({ input: profile, output });
          }
        }
      }
    }

    const vectorsDir = path.resolve(__dirname, "../../../../packages/vectors");
    const targetsFile = path.join(vectorsDir, "targets.json");

    if (process.env.UPDATE_VECTORS === "1" || !fs.existsSync(targetsFile)) {
      fs.mkdirSync(vectorsDir, { recursive: true });
      fs.writeFileSync(targetsFile, JSON.stringify(targetCases, null, 2) + "\n");
    } else {
      const existing = JSON.parse(fs.readFileSync(targetsFile, "utf-8"));
      expect(targetCases).toEqual(existing);
    }

    expect(targetCases.length).toBeGreaterThanOrEqual(40);
  });

  it("generates packages/vectors/period.json and verifies equality", () => {
    const todayIso = "2026-10-14";
    const fixedTargets = calculateTargets({
      sex: "male",
      weightKg: 70,
      goal: "maintain",
      trainingMinutes: 60,
      isPeriod: false,
    });

    // 1. Period Averages Cases
    const mkDay = (date: string, logged: boolean, cal: number | null, pro: number | null, carb: number | null, fat: number | null, fib: number | null, nuts: Record<string, number | null> = {}): DayTotals => ({
      date,
      logged,
      calories: cal,
      protein: pro,
      carbs: carb,
      fat,
      fiber: fib,
      nutrients: Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((k) => [k, nuts[k] ?? null])),
    });

    const averagesCases = [
      {
        name: "7 days with 4 logged days and today excluded",
        today: todayIso,
        days: [
          mkDay("2026-10-08", true, 2000, 140, 220, 60, 25, { b1: 1.2, calcium: 1000 }),
          mkDay("2026-10-09", false, null, null, null, null, null),
          mkDay("2026-10-10", true, 2100, 150, 230, 65, 28, { b1: 1.4, calcium: 1100 }),
          mkDay("2026-10-11", true, 1900, 130, 210, 55, 22, { b1: 1.0, calcium: 900 }),
          mkDay("2026-10-12", false, null, null, null, null, null),
          mkDay("2026-10-13", true, 2200, 160, 240, 70, 30, { b1: 1.6, calcium: 1200 }),
          mkDay("2026-10-14", true, 2500, 180, 280, 80, 35, { b1: 2.0, calcium: 1500 }), // today -> excluded
        ],
      },
      {
        name: "Only quick entries with null macros and nutrients",
        today: todayIso,
        days: [
          mkDay("2026-10-10", true, 1800, null, null, null, null),
          mkDay("2026-10-11", true, 2200, null, null, null, null),
        ],
      },
      {
        name: "Empty period with 0 logged days",
        today: todayIso,
        days: [
          mkDay("2026-10-10", false, null, null, null, null, null),
          mkDay("2026-10-11", false, null, null, null, null, null),
        ],
      },
    ].map((c) => ({
      ...c,
      output: periodAverages(c.days, c.today),
      targetDaysOutput: periodTargetDays(c.days, c.today, fixedTargets),
    }));

    // 2. Macro Composition Cases
    const macroCases = [
      { input: { protein: 120, carbs: 200, fat: 60 } },
      { input: { protein: 85, carbs: 150, fat: 45 } },
      { input: { protein: 100, carbs: null, fat: 50 } },
      { input: { protein: 0, carbs: 0, fat: 0 } },
    ].map((c) => ({
      ...c,
      output: macroComposition(c.input as any),
    }));

    // 3. Comparison Cases
    const curAvg = periodAverages([
      mkDay("2026-10-10", true, 2200, 150, 240, 70, 30, { b1: 1.5, calcium: 1200 }),
      mkDay("2026-10-11", true, 2000, 130, 220, 60, 26, { b1: 1.3, calcium: 1000 }),
    ], todayIso);

    const prevAvg = periodAverages([
      mkDay("2026-10-03", true, 1800, 110, 200, 50, 20, { b1: 1.0, calcium: 800 }),
      mkDay("2026-10-04", true, 1900, 120, 210, 55, 22, { b1: 1.1, calcium: 900 }),
    ], todayIso);

    const comparisonCases = [
      {
        name: "Comparing current vs previous 2-day averages",
        current: curAvg,
        previous: prevAvg,
        output: comparePeriods(curAvg, prevAvg),
      },
    ];

    // 4. Weight Summary Cases
    const weightCases = [
      {
        name: "Standard weight series spanning period",
        log: [
          { date: "2026-09-01", kg: 72.0 },
          { date: "2026-10-05", kg: 70.8 },
          { date: "2026-10-08", kg: 70.4 },
          { date: "2026-10-12", kg: 70.0 },
          { date: "2026-10-20", kg: 69.5 },
        ],
        period: { start: "2026-10-07", end: "2026-10-13" },
      },
      {
        name: "Empty log",
        log: [],
        period: { start: "2026-10-07", end: "2026-10-13" },
      },
      {
        name: "Single point inside period",
        log: [{ date: "2026-10-10", kg: 70.5 }],
        period: { start: "2026-10-07", end: "2026-10-13" },
      },
    ].map((c) => ({
      ...c,
      output: weightSummary(c.log, c.period),
    }));

    const periodData = {
      averages_cases: averagesCases,
      macro_cases: macroCases,
      comparison_cases: comparisonCases,
      weight_cases: weightCases,
    };

    const vectorsDir = path.resolve(__dirname, "../../../../packages/vectors");
    const periodFile = path.join(vectorsDir, "period.json");

    if (process.env.UPDATE_VECTORS === "1" || !fs.existsSync(periodFile)) {
      fs.mkdirSync(vectorsDir, { recursive: true });
      fs.writeFileSync(periodFile, JSON.stringify(periodData, null, 2) + "\n");
    } else {
      const existing = JSON.parse(fs.readFileSync(periodFile, "utf-8"));
      expect(periodData).toEqual(existing);
    }

    expect(averagesCases.length).toBeGreaterThanOrEqual(3);
  });
});
