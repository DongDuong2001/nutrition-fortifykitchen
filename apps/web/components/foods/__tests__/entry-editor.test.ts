import { describe, it, expect } from "vitest";
import { formatGramsServingLabel } from "../serving-label";

describe("formatGramsServingLabel", () => {
  it("formats decimal grams with comma in Vietnamese format", () => {
    expect(formatGramsServingLabel("2,5", "100 g")).toBe("2,5 g");
    expect(formatGramsServingLabel("2.5", "100 g")).toBe("2,5 g");
  });

  it("formats integer grams", () => {
    expect(formatGramsServingLabel("100", "50 g")).toBe("100 g");
  });

  it("keeps previous serving label when input is empty or invalid", () => {
    expect(formatGramsServingLabel("", "100 g")).toBe("100 g");
    expect(formatGramsServingLabel("   ", "100 g")).toBe("100 g");
    expect(formatGramsServingLabel("abc", "100 g")).toBe("100 g");
  });
});
