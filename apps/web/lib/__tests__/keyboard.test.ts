import { describe, expect, it } from "vitest";
import { fieldHidden, keyboardInset } from "../keyboard";

describe("the on-screen keyboard (design-floor)", () => {
  it("measures the keyboard from the visual viewport", () => {
    expect(keyboardInset(844, 844, 0)).toBe(0);
    expect(keyboardInset(844, 508, 0)).toBe(336);
    expect(keyboardInset(844, 508, 20)).toBe(316);
    expect(keyboardInset(844, 900, 0)).toBe(0);
  });

  it("finds a field the keyboard covers, and leaves a visible one alone", () => {
    // 508 px visible: a field ending at 600 is under the keyboard; one at 200–244 is in view
    expect(fieldHidden(556, 600, 508, 0)).toBe(true);
    expect(fieldHidden(200, 244, 508, 0)).toBe(false);
    // scrolled up past the top of the visual viewport
    expect(fieldHidden(-10, 34, 508, 0)).toBe(true);
  });
});
