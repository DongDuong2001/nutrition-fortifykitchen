import { describe, expect, it } from "vitest";
import { calculateMasteryLevel, getMasteryLevelDetails, MASTERY_LEVELS } from "../mastery-levels";

describe("mastery-levels", () => {
  it("defines all 5 progressive mastery tiers", () => {
    expect(MASTERY_LEVELS).toHaveLength(5);
    expect(MASTERY_LEVELS[0].level).toBe(1);
    expect(MASTERY_LEVELS[4].level).toBe(5);
  });

  it("calculates level 1 for new user with zero streak or low micros", () => {
    const res = calculateMasteryLevel(0, 0);
    expect(res.level).toBe(1);
    expect(res.title).toBe("Người mới bắt đầu");
    expect(res.nextLevel?.level).toBe(2);
  });

  it("calculates level 2 when streak is at least 7 days and micros at least 10", () => {
    const res = calculateMasteryLevel(7, 10);
    expect(res.level).toBe(2);
    expect(res.title).toBe("Kỷ luật cơ bản");
  });

  it("keeps level 1 if streak is 10 days but micros under 10", () => {
    const res = calculateMasteryLevel(10, 8);
    expect(res.level).toBe(1);
  });

  it("calculates level 3 when streak is 14 days and micros at least 14", () => {
    const res = calculateMasteryLevel(14, 15);
    expect(res.level).toBe(3);
    expect(res.title).toBe("Cân bằng vi chất");
  });

  it("calculates level 4 when streak is 30 days and micros at least 18", () => {
    const res = calculateMasteryLevel(35, 18.5);
    expect(res.level).toBe(4);
    expect(res.title).toBe("Dinh dưỡng tối ưu");
  });

  it("calculates level 5 for high streak and high micronutrient coverage", () => {
    const res = calculateMasteryLevel(65, 21);
    expect(res.level).toBe(5);
    expect(res.title).toBe("Bậc thầy H1T");
    expect(res.nextLevel).toBeNull();
    expect(res.progressPct).toBe(100);
  });

  it("retrieves details for specific level id", () => {
    const lvl3 = getMasteryLevelDetails(3);
    expect(lvl3.title).toBe("Cân bằng vi chất");
    expect(lvl3.shortLabel).toContain("Cấp 3");
  });
});
