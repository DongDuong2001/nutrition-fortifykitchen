import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { calculateTargets, type UserProfileForTargets } from "../targets";
import { periodAverages, type PeriodAverages } from "../period";
import type { DayTotals } from "../day-totals";

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
    fs.mkdirSync(vectorsDir, { recursive: true });
    fs.writeFileSync(path.join(vectorsDir, "targets.json"), JSON.stringify(targetCases, null, 2));

    expect(targetCases.length).toBeGreaterThanOrEqual(40);
  });
});
