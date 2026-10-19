import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, cleanDisplayName, limitDisplayName, validateDisplayName } from "../display-name";
import { shareName, shareNeedsName } from "../share-card";
import { validateSetupName } from "../onboarding";

describe("cleanDisplayName", () => {
  it("trims, and normalises to NFC so a decomposed letter equals the composed one", () => {
    expect(cleanDisplayName("  Học viên A  ")).toBe("Học viên A");
    const decomposed = "ệ"; // e + dot below + circumflex
    expect(cleanDisplayName(decomposed)).toBe("ệ");
    expect(cleanDisplayName(decomposed)).toHaveLength(1);
  });

  it("strips control and invisible format characters", () => {
    expect(cleanDisplayName("A​B\u0007C‮DE﻿")).toBe("ABCDE");
    expect(cleanDisplayName("Học\tviên\nA")).toBe("HọcviênA");
    expect(cleanDisplayName(null)).toBe("");
  });
});

describe("validateDisplayName", () => {
  it("needs a name", () => {
    expect(validateDisplayName("")).toBe("Nhập tên hiển thị");
    expect(validateDisplayName("   ")).toBe("Nhập tên hiển thị");
    expect(validateDisplayName("​​")).toBe("Nhập tên hiển thị");
    expect(validateDisplayName(undefined)).toBe("Nhập tên hiển thị");
  });

  it("needs at least one letter or digit", () => {
    expect(validateDisplayName("...")).toBe("Tên cần có ít nhất một chữ cái hoặc chữ số");
    expect(validateDisplayName("😀😀")).toBe("Tên cần có ít nhất một chữ cái hoặc chữ số");
    expect(validateDisplayName("- _ -")).not.toBeNull();
    expect(validateDisplayName("A")).toBeNull();
    expect(validateDisplayName("7")).toBeNull();
    expect(validateDisplayName("😀 Ệ")).toBeNull();
  });

  it("allows at most 40 characters, counted after cleaning", () => {
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX))).toBeNull();
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX + 1))).toBe("Tên hiển thị tối đa 40 ký tự");
    expect(validateDisplayName(`${"a".repeat(40)}​​  `)).toBeNull();
    expect(validateDisplayName("ệ".repeat(40))).toBeNull();
  });

  it("is the one rule of setup and the share image", () => {
    for (const v of ["", "   ", "...", "😀", "a".repeat(41), "Học viên A", "​A"]) {
      expect(validateSetupName(v)).toBe(validateDisplayName(v));
      expect(shareNeedsName(v)).toBe(validateDisplayName(v) !== null);
    }
    expect(shareName("  ​Học viên A ")).toBe("Học viên A");
    expect(shareName("...")).toBeNull();
  });
});

describe("a name with emoji (cc-63, B7)", () => {
  it("keeps the zero-width joiner of an emoji: 👩‍🍳 stays one picture", () => {
    expect(cleanDisplayName("👩‍🍳 Mai")).toBe("👩‍🍳 Mai");
    expect(cleanDisplayName("A​B")).toBe("AB");
  });

  it("drops a joiner at either end and the other invisible characters", () => {
    expect(cleanDisplayName("‍Mai‍")).toBe("Mai");
    expect(cleanDisplayName(" ‍ Mai")).toBe("Mai");
    expect(cleanDisplayName("M‍‍ai")).toBe("M‍‍ai");
  });

  it("counts 40 as code points, so 40 emoji fit and 41 do not", () => {
    expect(validateDisplayName("a🍜".repeat(20))).toBeNull();
    expect(validateDisplayName(`${"a🍜".repeat(20)}🍜`)).toBe("Tên hiển thị tối đa 40 ký tự");
  });

  it("limitDisplayName cuts at 40 code points, never inside a pair", () => {
    const cut = limitDisplayName("🍜".repeat(50));
    expect(Array.from(cut)).toHaveLength(40);
    expect(cut.includes("\uFFFD")).toBe(false);
    expect(limitDisplayName("Học viên A")).toBe("Học viên A");
    expect(limitDisplayName("a".repeat(40))).toBe("a".repeat(40));
  });
});
