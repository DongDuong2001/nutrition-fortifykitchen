import { describe, expect, it } from "vitest";
import { macroLine, microsTile, trainingTile } from "../diary-rows";

describe("macroLine", () => {
  it("one meta line: đạm, tinh bột, béo in grams", () => {
    expect(macroLine({ protein: 12.4, carbs: 30, fat: 5 })).toBe("Đạm 12,4 g · Tinh bột 30 g · Béo 5 g");
  });
  it("an unknown macro is a dash, never 0", () => {
    expect(macroLine({ protein: null, carbs: 30, fat: null })).toBe("Đạm — · Tinh bột 30 g · Béo —");
  });
  it("all unknown: no line", () => {
    expect(macroLine({ protein: null, carbs: null, fat: null })).toBeNull();
  });
});

describe("microsTile", () => {
  it("n/22 with the lowest nutrients", () => {
    expect(microsTile({ achieved: 8, total: 22, mostLacking: ["Vitamin D", "Iốt"] }, false)).toEqual({
      value: "8/22",
      label: "vi chất",
      line: "Thiếu: Vitamin D, Iốt",
      pct: Math.round((8 / 22) * 100),
    });
  });
  it("nothing logged: a dash and no percentage", () => {
    expect(microsTile({ achieved: 0, total: 22, mostLacking: [] }, true)).toEqual({
      value: "—",
      label: "vi chất",
      line: "Chưa có món",
      pct: 0,
    });
  });
  it("all reached: says so", () => {
    expect(microsTile({ achieved: 22, total: 22, mostLacking: [] }, false).line).toBe("Không thiếu chất nào");
  });
});

describe("trainingTile", () => {
  it("training minutes and salt", () => {
    expect(trainingTile({ minutes: 60, saltText: "7–10,5", past: false })).toEqual({
      value: "60′",
      label: "Ngày tập",
      line: "muối 7–10,5 g",
    });
  });
  it("a rest day", () => {
    expect(trainingTile({ minutes: 0, saltText: "4–6", past: false })).toEqual({ value: "Nghỉ", label: "Ngày tập", line: "muối 4–6 g" });
  });
  it("a past day is view only", () => {
    expect(trainingTile({ minutes: 60, saltText: "7–10,5", past: true }).line).toBe("Chỉ xem");
  });
});
