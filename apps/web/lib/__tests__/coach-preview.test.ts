import { describe, expect, it } from "vitest";
import { levelChangedToast, loggedToday, lastLoggedText, previewForLevel, previewHasChanges } from "../coach-preview";

const names = (g: { items: { name: string; status: string }[] }, status: string) => g.items.filter((i) => i.status === status).map((i) => i.name);

describe("previewForLevel", () => {
  it("no change: everything is the same", () => {
    const groups = previewForLevel(2, 2);
    expect(previewHasChanges(groups)).toBe(false);
    expect(groups.map((g) => g.title)).toEqual(["Khoáng chất", "Vitamin"]);
  });

  it("raising 1 to 2 marks what is added", () => {
    const groups = previewForLevel(1, 2);
    const minerals = groups.find((g) => g.title === "Khoáng chất")!;
    const vitamins = groups.find((g) => g.title === "Vitamin")!;
    expect(names(minerals, "added")).toEqual(["Selen"]);
    expect(names(vitamins, "added")).toEqual(["Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B6", "Vitamin B9", "Vitamin B12"]);
    // Vitamin C is on Level 1's list and not on Level 2's: it is marked removed
    expect(names(vitamins, "removed")).toEqual(["Vitamin C"]);
    expect(previewHasChanges(groups)).toBe(true);
  });

  it("raising to 3 brings the extras band first, all added", () => {
    const groups = previewForLevel(2, 3);
    expect(groups.map((g) => g.title)).toEqual(["Chi tiết béo & xơ", "Khoáng chất", "Vitamin"]);
    expect(names(groups[0], "added")).toHaveLength(6);
  });

  it("lowering 3 to 2 lists the extras band as removed", () => {
    const groups = previewForLevel(3, 2);
    const extras = groups.find((g) => g.title === "Chi tiết béo & xơ")!;
    expect(extras.items.every((i) => i.status === "removed")).toBe(true);
    expect(names(groups.find((g) => g.title === "Khoáng chất")!, "removed")).toEqual(["Phốt pho", "Đồng"]);
  });

  it("the draft's own order is kept for what stays and what is added", () => {
    const vitamins = previewForLevel(1, 4).find((g) => g.title === "Vitamin")!;
    expect(vitamins.items.map((i) => i.name).slice(0, 3)).toEqual(["Vitamin A", "Vitamin C", "Vitamin D"]);
  });
});

describe("texts", () => {
  it("the save toast", () => {
    expect(levelChangedToast("Học viên A", 3)).toBe("Đã đổi Level của Học viên A thành 3");
  });

  it("last logged", () => {
    expect(lastLoggedText(null, null)).toBe("Chưa ghi món nào");
    expect(lastLoggedText(1, "Hôm qua 15/10")).toBe("Ghi gần nhất: Hôm qua 15/10");
    expect(loggedToday(0)).toBe(true);
    expect(loggedToday(1)).toBe(false);
    expect(loggedToday(null)).toBe(false);
  });
});
