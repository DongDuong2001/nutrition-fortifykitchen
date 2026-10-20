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
      expect(getTrainingPhases(60, ["pre-cha-la"])[0].items[0].note).toBe("✓ Đã dùng");
      expect(getTrainingPhases(60, [])[0].items[0].note).toBe("");
      expect(getTrainingPhases(60, ["intra-salt-0-20"])[1].items[0].note).toBe("✓ Đã dùng");
      expect(getTrainingPhases(60, [])[1].items[0].note).toBe("");
    });
  });

  // cc-52: Bé takes the lower end of every coach range, Bự the upper (HANDOFF: 4–6 g a day, 1–1,5 g per 20 min, 30–45 g fast carbs)
  describe("Bự / Bé", () => {
    it("Bé: the header total is the lower end (4 g + 1 g per 20 min)", () => {
      const t = calculateSaltTarget(60, "be");
      expect([t.totalMin, t.totalMax]).toEqual([7, 7]);
      expect(t.formattedTotal).toBe("7");
      expect(t.formattedTopUp).toBe("3");
      expect([t.baseMin, t.baseMax]).toEqual([4, 4]);
      expect(t.formattedSodiumRange).toBe("2.751 mg");
    });

    it("Bự: the header total is the upper end (6 g + 1,5 g per 20 min)", () => {
      const t = calculateSaltTarget(60, "bu");
      expect(t.formattedTotal).toBe("10,5");
      expect(t.formattedTopUp).toBe("4,5");
      expect(calculateSaltTarget(0, "bu").formattedTotal).toBe("6");
      expect(calculateSaltTarget(0, "be").formattedTotal).toBe("4");
    });

    it("no choice keeps the ranges", () => {
      expect(calculateSaltTarget(60, null).formattedTotal).toBe("7–10,5");
    });

    const doses = (size: "be" | "bu" | null) =>
      Object.fromEntries(getTrainingPhases(60, [], { size }).flatMap((p) => p.items.map((i) => [i.id, [i.dose, i.grams]])));

    it("ranged doses show and pre-fill the chosen end; fixed doses stay as written", () => {
      expect(doses("be")["intra-salt-0-20"]).toEqual(["1 g", 1]);
      expect(doses("bu")["intra-salt-0-20"]).toEqual(["1,5 g", 1.5]);
      expect(doses("be")["intra-carb"]).toEqual(["30 g", 30]);
      expect(doses("bu")["intra-carb"]).toEqual(["45 g", 45]);
      for (const size of ["be", "bu"] as const) {
        expect(doses(size)["pre-cha-la"]).toEqual(["30 g", 30]);
        expect(doses(size)["pre-cu-den"]).toEqual(["3 g", 3]);
      }
    });

    it("no choice shows the ranges and pre-fills the lower end", () => {
      expect(doses(null)["intra-salt-0-20"]).toEqual(["1–1,5 g", 1]);
      expect(doses(null)["intra-carb"]).toEqual(["30–45 g", 30]);
    });

    it("each coach item names the catalogue foods it logs", () => {
      const foods = Object.fromEntries(getTrainingPhases(60).flatMap((p) => p.items.map((i) => [i.id, i.foods])));
      expect(foods["pre-cha-la"]).toEqual(["cha-la"]);
      expect(foods["pre-cu-den"]).toEqual(["cu-den"]);
      expect(foods["intra-salt-20-40"]).toEqual(["muoi"]);
      expect(foods["intra-carb"]).toEqual(["redbull", "redbull-mat-mia", "mat-mia"]);
      // Hao 18/10: its 30–45 g are grams of carbs; only that item says so
      const carbItems = getTrainingPhases(60).flatMap((p) => p.items.filter((i) => i.carbs).map((i) => i.id));
      expect(carbItems).toEqual(["intra-carb"]);
    });
  });

  describe("logged notes and own items (cc-52)", () => {
    it("a logged item says how much was logged", () => {
      const phases = getTrainingPhases(60, ["intra-salt-0-20"], { logged: { "intra-salt-0-20": "1,5 g" } });
      expect(phases[1].items[0].note).toBe("✓ Đã ghi 1,5 g");
    });

    it("a ticked item with nothing logged (no catalogue food) still says ✓ Đã dùng", () => {
      expect(getTrainingPhases(60, ["pre-cu-den"])[0].items[1].note).toBe("✓ Đã dùng");
    });

    it("own items follow the coach items of their phase, with their amount as the dose", () => {
      const own = [
        { id: "own-1", phase: "pre-workout" as const, foodId: "food-dua", name: "Nước dừa", grams: 250, label: "250 g" },
        { id: "own-2", phase: "intra-workout" as const, foodId: "food-cam", name: "Cam", grams: 130, label: "1 quả" },
      ];
      const phases = getTrainingPhases(60, ["own-1"], { own, logged: { "own-1": "250 g" } });
      expect(phases[0].items.map((i) => i.id)).toEqual(["pre-cha-la", "pre-cu-den", "own-1"]);
      expect(phases[0].items[2]).toMatchObject({ label: "Nước dừa", dose: "250 g", own: true, foodId: "food-dua", grams: 250, servingLabel: "250 g", note: "✓ Đã ghi 250 g" });
      expect(phases[1].items.at(-1)).toMatchObject({ id: "own-2", label: "Cam", dose: "1 quả", own: true });
      expect(phases[1].items.slice(0, -1).every((i) => !i.own)).toBe(true);
    });
  });

  describe("getRestDayTips", () => {
    it("returns 3 recovery tips matching TrainingRest design", () => {
      const tips = getRestDayTips(targetsFor(SAMPLE_PROFILE));
      expect(tips).toHaveLength(3);
      expect(tips[0].text).toBe("Ngủ đủ 7–9 tiếng");
      expect(tips[1].text).toBe("Giữ mức đạm 143 g");
      expect(tips[2].text).toBe("Năng lượng giữ 2.275 kcal");
    });

    it("uses the profile's own targets, not the 65 kg sample", () => {
      const heavier = getRestDayTips(targetsFor({ ...SAMPLE_PROFILE, weightKg: 80 }));
      expect(heavier[1].text).not.toBe("Giữ mức đạm 143 g");
      expect(heavier[2].text).not.toBe("Năng lượng giữ 2.275 kcal");
    });
  });

});
