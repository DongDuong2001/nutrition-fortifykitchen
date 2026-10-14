import { describe, it, expect } from "vitest";
import {
  calculateSaltTarget,
  getTrainingDurations,
  getTrainingPhases,
  getRestDayTips,
  formatSaltRange,
} from "../training";
import { SAMPLE_PROFILE, targetsFor } from "../profile";

describe("Training calculations (lib/training.ts)", () => {
  describe("calculateSaltTarget", () => {
    it("calculates salt and sodium correctly for rest day (0 minutes)", () => {
      const target = calculateSaltTarget(0);
      expect(target.baseMin).toBe(4);
      expect(target.baseMax).toBe(6);
      expect(target.topUpMin).toBe(0);
      expect(target.topUpMax).toBe(0);
      expect(target.totalMin).toBe(4);
      expect(target.totalMax).toBe(6);
      expect(target.formattedTotal).toBe("4–6");
      expect(target.formattedTopUp).toBe("0");
      expect(target.sodiumMin).toBe(1572); // 4 * 393
      expect(target.sodiumMax).toBe(2358); // 6 * 393
      expect(target.formattedSodiumRange).toBe("1.572–2.358 mg");
    });

    it("calculates salt and sodium correctly for 60 minutes training", () => {
      const target = calculateSaltTarget(60);
      // 60 / 20 = 3 intervals -> topUp 3 to 4.5 g
      expect(target.baseMin).toBe(4);
      expect(target.baseMax).toBe(6);
      expect(target.topUpMin).toBe(3);
      expect(target.topUpMax).toBe(4.5);
      expect(target.totalMin).toBe(7);
      expect(target.totalMax).toBe(10.5);
      expect(target.formattedTopUp).toBe("3–4,5");
      expect(target.formattedTotal).toBe("7–10,5");
      // 7 * 393 = 2751, 10.5 * 393 = 4126.5 -> 4127
      expect(target.sodiumMin).toBe(2751);
      expect(target.sodiumMax).toBe(4127);
      expect(target.formattedSodiumRange).toBe("2.751–4.127 mg");
    });

    it("calculates salt and sodium correctly for 45 minutes training", () => {
      const target = calculateSaltTarget(45);
      // 45 / 20 = 2.25 intervals -> topUp 2.25 to 3.375 g
      expect(target.topUpMin).toBeCloseTo(2.25);
      expect(target.topUpMax).toBeCloseTo(3.375);
      expect(target.totalMin).toBeCloseTo(6.25);
      expect(target.totalMax).toBeCloseTo(9.375);
      expect(target.sodiumMin).toBe(Math.round(6.25 * 393));
      expect(target.sodiumMax).toBe(Math.round(9.375 * 393));
    });

    it("calculates salt and sodium correctly for 90 minutes training", () => {
      const target = calculateSaltTarget(90);
      // 90 / 20 = 4.5 intervals -> topUp 4.5 to 6.75 g
      expect(target.topUpMin).toBeCloseTo(4.5);
      expect(target.topUpMax).toBeCloseTo(6.75);
      expect(target.totalMin).toBeCloseTo(8.5);
      expect(target.totalMax).toBeCloseTo(12.75);
      expect(target.formattedTotal).toBe("8,5–12,8");
    });

    it("calculates salt and sodium correctly for 120 minutes training", () => {
      const target = calculateSaltTarget(120);
      // 120 / 20 = 6 intervals -> topUp 6 to 9 g
      expect(target.topUpMin).toBe(6);
      expect(target.topUpMax).toBe(9);
      expect(target.totalMin).toBe(10);
      expect(target.totalMax).toBe(15);
      expect(target.formattedTopUp).toBe("6–9");
      expect(target.formattedTotal).toBe("10–15");
    });
  });

  describe("formatSaltRange", () => {
    it("formats integer ranges with en-dash", () => {
      expect(formatSaltRange(4, 6)).toBe("4–6");
    });

    it("formats decimal ranges with comma according to vi-VN", () => {
      expect(formatSaltRange(7, 10.5)).toBe("7–10,5");
      expect(formatSaltRange(3, 4.5)).toBe("3–4,5");
    });
  });

  describe("getTrainingDurations", () => {
    it("returns standard duration options matching design", () => {
      const durations = getTrainingDurations();
      expect(durations).toHaveLength(5);
      expect(durations[0]).toEqual({ id: "rest", minutes: 0, label: "Nghỉ" });
      expect(durations[1]).toEqual({ id: "45", minutes: 45, label: "45 phút" });
      expect(durations[2]).toEqual({ id: "60", minutes: 60, label: "60 phút" });
      expect(durations[3]).toEqual({ id: "90", minutes: 90, label: "90 phút" });
      expect(durations[4]).toEqual({ id: "120", minutes: 120, label: "120 phút" });
    });
  });

  describe("getTrainingPhases", () => {
    it("returns Pre-workout and Intra-workout phases for 60 minutes", () => {
      const phases = getTrainingPhases(60);
      expect(phases).toHaveLength(2);
      expect(phases[0].name).toBe("Trước tập");
      expect(phases[0].items).toHaveLength(2);
      expect(phases[1].name).toBe("Trong tập · 60 phút");
      // 3 salt items (0-20, 20-40, 40-60) + 1 fast carb item
      expect(phases[1].items).toHaveLength(4);
    });

    it("returns empty or null phases for rest day (0 minutes)", () => {
      const phases = getTrainingPhases(0);
      expect(phases).toHaveLength(0);
    });

    it("shows no ✓ note until the item is ticked (nothing logged is never reported as logged)", () => {
      const notes = (ticked: string[]) => getTrainingPhases(60, ticked).flatMap((p) => p.items.map((i) => i.note));
      expect(notes([]).every((n) => !n.startsWith("✓"))).toBe(true);
      expect(getTrainingPhases(60, ["pre-cha-la"])[0].items[0].note).toBe("✓ Đã đánh dấu");
      expect(getTrainingPhases(60, [])[0].items[0].note).toBe("");
      expect(getTrainingPhases(60, ["intra-salt-0-20"])[1].items[0].note).toBe("✓ Đã đánh dấu");
      expect(getTrainingPhases(60, [])[1].items[0].note).toBe("");
    });
  });

  describe("getRestDayTips", () => {
    it("returns 3 recovery tips matching TrainingRest design", () => {
      const tips = getRestDayTips(targetsFor(SAMPLE_PROFILE));
      expect(tips).toHaveLength(3);
      expect(tips[0].text).toBe("Ngủ đủ 7–9 tiếng");
      expect(tips[1].text).toBe("Đạm vẫn 104–143 g");
      expect(tips[2].text).toBe("Năng lượng giữ 1.950–2.275 kcal");
    });

    it("uses the profile's own targets, not the 65 kg sample", () => {
      const heavier = getRestDayTips(targetsFor({ ...SAMPLE_PROFILE, weightKg: 80 }));
      expect(heavier[1].text).not.toBe("Đạm vẫn 104–143 g");
      expect(heavier[2].text).not.toBe("Năng lượng giữ 1.950–2.275 kcal");
    });
  });

});
