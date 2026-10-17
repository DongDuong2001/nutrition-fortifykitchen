import { describe, expect, it } from "vitest";
import { ASK_COACH_TEXT, WRONG_CODE, joinPrompt, leaveConfirm, levelLabel, levelSourceText, levelSummaryLine, noticeText } from "../level-copy";

describe("level copy", () => {
  it("the fixed texts", () => {
    expect(WRONG_CODE).toBe("Mã không đúng. Kiểm tra lại với HLV của bạn.");
    expect(ASK_COACH_TEXT).toBe("Hỏi HLV để lên Level");
    expect(joinPrompt("HLV Khánh")).toBe("Tham gia theo dõi với HLV Khánh?");
    expect(leaveConfirm("HLV Khánh")).toBe("Rời HLV Khánh? Level của bạn sẽ về 0 và Hôm nay hiện danh sách cơ bản.");
    expect(levelSourceText(2)).toBe("Level 2 · do HLV đặt");
    expect(levelLabel(2, "HLV Khánh")).toBe("Level 2 · HLV Khánh");
  });

  it("the three cards", () => {
    expect(noticeText("HLV Khánh", { kind: "linked", from: 0, to: 1 })).toBe("Bạn đang được HLV Khánh theo dõi · Level 1");
    expect(noticeText("HLV Khánh", { kind: "lowered", from: 2, to: 1 })).toBe("HLV Khánh đã đổi Level của bạn thành 1");
    expect(noticeText("HLV Khánh", { kind: "raised", from: 1, to: 2 })).toBe(
      "HLV Khánh đã nâng bạn lên Level 2: thêm Selenium, Vitamin D, Vitamin E, Vitamin K, Vitamin B6, Folate, Vitamin B12"
    );
  });

  it("a raise that adds nothing does not end in 'thêm'", () => {
    expect(noticeText("HLV Khánh", { kind: "raised", from: 4, to: 5 })).toBe("HLV Khánh đã nâng bạn lên Level 5");
  });

  it("the explainer's lines", () => {
    expect(levelSummaryLine(1)).toBe("8 vi chất cơ bản");
    expect(levelSummaryLine(2)).toBe("14 vi chất");
    expect(levelSummaryLine(3)).toBe("18 vi chất và chi tiết béo, xơ");
    expect(levelSummaryLine(5)).toBe("22 vi chất và chi tiết béo, xơ");
  });
});
