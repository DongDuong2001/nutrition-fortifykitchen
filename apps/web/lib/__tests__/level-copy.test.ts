import { describe, expect, it } from "vitest";
import {
  ASK_COACH_TEXT,
  WRONG_CODE,
  explainerNextLine,
  explainerSummaryLine,
  joinPrompt,
  leaveConfirm,
  levelSourceText,
  levelSummaryLine,
  levelUpAnnouncement,
  levelUpReward,
  levelUpSubtitle,
  noticeText,
} from "../level-copy";

describe("level copy", () => {
  it("the fixed texts", () => {
    expect(WRONG_CODE).toBe("Mã không đúng. Kiểm tra lại với HLV của bạn.");
    expect(ASK_COACH_TEXT).toBe("Hỏi HLV để lên Level");
    expect(joinPrompt("HLV Khánh")).toBe("Tham gia theo dõi với HLV Khánh?");
    expect(leaveConfirm("HLV Khánh")).toBe("Rời HLV Khánh? Level của bạn sẽ về 0 và Hôm nay hiện danh sách cơ bản.");
    expect(levelSourceText(2)).toBe("Level 2 · do HLV đặt");
  });

  it("the calm card for a lower Level, with or without a coach object", () => {
    expect(noticeText("HLV Khánh", { kind: "lowered", from: 2, to: 1 })).toBe("HLV Khánh đã đổi Level của bạn thành 1");
    expect(noticeText(null, { kind: "lowered", from: 3, to: 1 })).toBe("HLV đã đổi Level của bạn thành 1");
  });

  it("the explainer's lines", () => {
    expect(levelSummaryLine(1)).toBe("8 vi chất cơ bản");
    expect(levelSummaryLine(2)).toBe("14 vi chất");
    expect(levelSummaryLine(3)).toBe("18 vi chất và chi tiết béo, xơ");
    expect(levelSummaryLine(5)).toBe("22 vi chất và chi tiết béo, xơ");
  });
});

describe("the explainer sheet (LevelExplainer.dc.html)", () => {
  it("Level 5 adds the gold share frame to its line", () => {
    expect(explainerSummaryLine(4)).toBe("22 vi chất và chi tiết béo, xơ");
    expect(explainerSummaryLine(5)).toBe("22 vi chất và chi tiết béo, xơ · khung ảnh chia sẻ vàng");
  });

  it("the next row says what it adds (addedNames)", () => {
    expect(explainerNextLine(2)).toBe("Tiếp theo: + Phosphorus, Copper, Vitamin B1, Vitamin B3, chi tiết béo và xơ");
    expect(explainerNextLine(0)).toBe("Tiếp theo: + 8 vi chất cơ bản");
  });

  it("Level 4 → 5 adds no nutrient: the next row names the gold frame", () => {
    expect(explainerNextLine(4)).toBe("Tiếp theo: + khung ảnh chia sẻ vàng");
  });
});

describe("the celebration (LevelUp.dc.html)", () => {
  it("the subtitle: no coach, a coach, and 0 → 1 with a coach", () => {
    expect(levelUpSubtitle({ from: 2, to: 3 }, null)).toBe("Bạn vừa được nâng lên Level 3.");
    expect(levelUpSubtitle({ from: 0, to: 2 }, null)).toBe("Bạn vừa được nâng lên Level 2.");
    expect(levelUpSubtitle({ from: 2, to: 3 }, "HLV Khánh")).toBe("HLV Khánh vừa nâng Level cho bạn.");
    expect(levelUpSubtitle({ from: 0, to: 1 }, "HLV Khánh")).toBe("HLV Khánh đang theo dõi bạn.");
  });

  it("the reward: a → b counted micros and one chip per added nutrient", () => {
    expect(levelUpReward({ from: 1, to: 2 })).toEqual({
      lead: "Hôm nay theo dõi",
      countFrom: 8,
      countTo: 14,
      tail: "vi chất, thêm:",
      chips: ["Selenium", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B6", "Folate", "Vitamin B12"],
      top: false,
    });
    // 14 → 22 counted (8 chips) plus the extras line
    expect(levelUpReward({ from: 2, to: 4 }).chips).toHaveLength(9);
    expect(levelUpReward({ from: 0, to: 1 })).toMatchObject({ countFrom: 8, countTo: 8, chips: [] });
  });

  it("Level 4 → 5: the top Level, all 22, the gold share frame as the gift", () => {
    expect(levelUpReward({ from: 4, to: 5 })).toEqual({
      lead: "Level cao nhất · đủ 22 vi chất · quà mới:",
      countFrom: 22,
      countTo: 22,
      tail: "",
      chips: ["Khung ảnh chia sẻ vàng"],
      top: true,
    });
  });

  it("a jump to 5 from below 4 lists the nutrients and the frame", () => {
    expect(levelUpReward({ from: 3, to: 5 }).chips.at(-1)).toBe("Khung ảnh chia sẻ vàng");
  });

  it("the screen reader line", () => {
    expect(levelUpAnnouncement({ from: 1, to: 2 }, null)).toBe(
      "Lên Level 2. Bạn vừa được nâng lên Level 2. Hôm nay theo dõi 8 → 14 vi chất, thêm: Selenium, Vitamin D, Vitamin E, Vitamin K, Vitamin B6, Folate, Vitamin B12."
    );
    expect(levelUpAnnouncement({ from: 4, to: 5 }, null)).toBe(
      "Lên Level 5. Bạn vừa được nâng lên Level 5. Level cao nhất · đủ 22 vi chất · quà mới: Khung ảnh chia sẻ vàng."
    );
    expect(levelUpAnnouncement({ from: 0, to: 1 }, "HLV Khánh")).toBe("Lên Level 1. HLV Khánh đang theo dõi bạn.");
  });
});
