import { describe, expect, it } from "vitest";
import { initialsOf } from "../coach-initials";

describe("initialsOf (cc-63, B8)", () => {
  it("is the first character of the first and the last word", () => {
    expect(initialsOf("Nguyễn Văn A")).toBe("NA");
    expect(initialsOf("Học viên A")).toBe("HA");
    expect(initialsOf("Trần Thị Mai Linh")).toBe("TL");
  });

  it("is one letter for one word", () => {
    expect(initialsOf("Linh")).toBe("L");
    expect(initialsOf("  Jo  ")).toBe("J");
  });

  it("skips empty words: a double space does not make a one-letter name", () => {
    expect(initialsOf("Nguyễn  Văn   A")).toBe("NA");
    expect(initialsOf("  Lê   Hoa ")).toBe("LH");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
  });

  it("keeps an emoji whole, never half a surrogate pair", () => {
    expect(initialsOf("🍜 Phở")).toBe("🍜P");
    expect(initialsOf("👩‍🍳 Mai")).toBe("👩‍🍳M");
    expect(initialsOf("Coach 🏋️")).toBe("C🏋️");
    expect(initialsOf("🍜")).toBe("🍜");
    expect(initialsOf("🍜 Phở").includes("�")).toBe(false);
  });

  it("upper-cases Vietnamese letters, composed or not", () => {
    expect(initialsOf("ân lê")).toBe("ÂL");
    expect(initialsOf("ệ lê")).toBe("ỆL");
    expect(initialsOf("e\u0323\u0302 lê")).toBe("ỆL"); // e + dot below + circumflex, typed as separate code points
  });
});
