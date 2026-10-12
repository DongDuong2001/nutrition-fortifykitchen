import { describe, it, expect } from "vitest";
import { getDefaultMealSlot, getMealSlotNameVi, nextMeal, resolveMealSlot, type MealSlot } from "../meal-slot";

describe("lib/meal-slot", () => {
  it("05:00–09:59 returns breakfast (Bữa sáng)", () => {
    const d1 = new Date("2026-10-10T05:00:00");
    const d2 = new Date("2026-10-10T09:59:59");
    expect(getDefaultMealSlot(d1, true)).toBe("breakfast");
    expect(getDefaultMealSlot(d2, true)).toBe("breakfast");
    expect(getMealSlotNameVi("breakfast")).toBe("Bữa sáng");
  });

  it("10:00–13:59 returns lunch (Bữa trưa)", () => {
    const d1 = new Date("2026-10-10T10:00:00");
    const d2 = new Date("2026-10-10T12:30:00");
    const d3 = new Date("2026-10-10T13:59:00");
    expect(getDefaultMealSlot(d1, true)).toBe("lunch");
    expect(getDefaultMealSlot(d2, false)).toBe("lunch");
    expect(getDefaultMealSlot(d3, true)).toBe("lunch");
    expect(getMealSlotNameVi("lunch")).toBe("Bữa trưa");
  });

  it("14:00–16:59 returns pre_workout on training day, otherwise snack", () => {
    const at1405 = new Date("2026-10-10T14:05:00");
    expect(getDefaultMealSlot(at1405, true)).toBe("pre_workout");
    expect(getMealSlotNameVi("pre_workout")).toBe("Trước tập");

    expect(getDefaultMealSlot(at1405, false)).toBe("snack");
    expect(getMealSlotNameVi("snack")).toBe("Bữa phụ");

    const at1630 = new Date("2026-10-10T16:30:00");
    expect(getDefaultMealSlot(at1630, true)).toBe("pre_workout");
    expect(getDefaultMealSlot(at1630, false)).toBe("snack");
  });

  it("17:00–20:59 returns dinner (Bữa tối)", () => {
    const at1700 = new Date("2026-10-10T17:00:00");
    const at1930 = new Date("2026-10-10T19:30:00");
    const at2059 = new Date("2026-10-10T20:59:59");
    expect(getDefaultMealSlot(at1700, true)).toBe("dinner");
    expect(getDefaultMealSlot(at1930, false)).toBe("dinner");
    expect(getDefaultMealSlot(at2059, true)).toBe("dinner");
    expect(getMealSlotNameVi("dinner")).toBe("Bữa tối");
  });

  it("otherwise (e.g. 21:00 or 02:00) returns snack (Bữa phụ)", () => {
    const at2130 = new Date("2026-10-10T21:30:00");
    const at0200 = new Date("2026-10-10T02:00:00");
    expect(getDefaultMealSlot(at2130, true)).toBe("snack");
    expect(getDefaultMealSlot(at0200, false)).toBe("snack");
  });

  it("07:05 UTC (= 14:05 Saigon) on a training day returns pre_workout (Trước tập)", () => {
    // 2026-10-10T07:05:00.000Z is 14:05 in Asia/Ho_Chi_Minh
    const utcDate = new Date("2026-10-10T07:05:00.000Z");
    expect(getDefaultMealSlot(utcDate, true)).toBe("pre_workout");
  });

  describe("resolveMealSlot", () => {
    it("returns parsed slot when valid param is provided", () => {
      expect(resolveMealSlot("breakfast")).toBe("breakfast");
      expect(resolveMealSlot("lunch")).toBe("lunch");
      expect(resolveMealSlot("dinner")).toBe("dinner");
      expect(resolveMealSlot("snack")).toBe("snack");
      expect(resolveMealSlot("pre_workout")).toBe("pre_workout");
    });

    it("falls back to default slot according to time when param is null/invalid/missing", () => {
      const at1405 = new Date("2026-10-10T14:05:00");
      expect(resolveMealSlot(null, at1405, true)).toBe("pre_workout");
      expect(resolveMealSlot(undefined, at1405, true)).toBe("pre_workout");
      expect(resolveMealSlot("invalid_slot", at1405, true)).toBe("pre_workout");
      expect(resolveMealSlot(null, at1405, false)).toBe("snack");

      const at0800 = new Date("2026-10-10T08:00:00");
      expect(resolveMealSlot(null, at0800, true)).toBe("breakfast");
    });
  });
});

describe("nextMeal (by the clock)", () => {
  const meals = (logged: MealSlot[]) =>
    (["breakfast", "lunch", "pre_workout", "dinner", "snack"] as MealSlot[]).map((slot) => ({
      slot,
      itemCount: logged.includes(slot) ? 2 : 0,
    }));
  const at = (hhmm: string) => new Date(`2026-10-12T${hhmm}:00+07:00`);

  it("is the meal of the time of day when it is still empty", () => {
    expect(nextMeal(meals(["breakfast"]), at("12:30"))).toBe("lunch");
    expect(nextMeal([], at("18:00"))).toBe("dinner");
    expect(nextMeal(meals([]), at("18:00"))).toBe("dinner");
  });

  it("moves to the next empty meal when the meal of the clock is logged", () => {
    expect(nextMeal(meals(["breakfast", "lunch", "pre_workout", "dinner"]), at("18:00"))).toBe("snack");
    expect(nextMeal(meals(["breakfast", "lunch", "pre_workout"]), at("15:00"))).toBe("dinner");
  });

  it("goes back to an earlier empty meal when nothing later is empty", () => {
    expect(nextMeal(meals(["breakfast", "lunch", "pre_workout", "snack"]), at("21:30"))).toBe("dinner");
  });

  it("is null when every meal is logged", () => {
    expect(nextMeal(meals(["breakfast", "lunch", "pre_workout", "dinner", "snack"]), at("18:00"))).toBeNull();
  });

  it("uses Bữa phụ instead of Trước tập on a rest day at 15:00", () => {
    expect(nextMeal(meals([]), at("15:00"), false)).toBe("snack");
    expect(nextMeal(meals([]), at("15:00"), true)).toBe("pre_workout");
  });
});
