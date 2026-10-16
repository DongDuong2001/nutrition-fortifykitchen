import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, cleanDisplayName, validateDisplayName } from "../display-name";
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
