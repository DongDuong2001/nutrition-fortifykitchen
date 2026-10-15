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
    expect(res.canApplyForCoach).toBe(false);
  });

  it("calculates level 2 when streak is at least 7 days and micros at least 10", () => {
    const res = calculateMasteryLevel(7, 10);
    expect(res.level).toBe(2);
    expect(res.title).toBe("Kỷ luật cơ bản");
    expect(res.canApplyForCoach).toBe(false);
  });

  it("keeps level 1 if streak is 10 days but micros under 10", () => {
    const res = calculateMasteryLevel(10, 8);
    expect(res.level).toBe(1);
  });

  it("calculates level 3 when streak is 14 days and micros at least 14", () => {
    const res = calculateMasteryLevel(14, 15);
    expect(res.level).toBe(3);
    expect(res.title).toBe("Cân bằng vi chất");
    expect(res.canApplyForCoach).toBe(false);
  });

  it("calculates level 4 when streak is 30 days and micros at least 18, unlocking coach application", () => {
    const res = calculateMasteryLevel(35, 18.5);
    expect(res.level).toBe(4);
    expect(res.title).toBe("Dinh dưỡng tối ưu");
    expect(res.canApplyForCoach).toBe(true);
    expect(res.nextLevel?.level).toBe(5);
  });

  it("keeps level 4 for regular users with 65 days streak until verified as coach", () => {
    const res = calculateMasteryLevel(65, 21, false);
    expect(res.level).toBe(4);
    expect(res.title).toBe("Dinh dưỡng tối ưu");
    expect(res.canApplyForCoach).toBe(true);
    expect(res.nextRequirementText).toContain("Đăng ký xét duyệt");
  });

  it("calculates level 5 directly when user is certified as coach (isCoach = true)", () => {
    const res = calculateMasteryLevel(65, 21, true);
    expect(res.level).toBe(5);
    expect(res.title).toContain("Huấn luyện viên");
    expect(res.isCoach).toBe(true);
    expect(res.nextLevel).toBeNull();
    expect(res.progressPct).toBe(100);
  });

  it("retrieves details for specific level id", () => {
    const lvl3 = getMasteryLevelDetails(3);
    expect(lvl3.title).toBe("Cân bằng vi chất");
    expect(lvl3.shortLabel).toContain("Cấp 3");
  });
});
