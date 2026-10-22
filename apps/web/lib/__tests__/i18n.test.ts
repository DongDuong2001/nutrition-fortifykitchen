import { describe, expect, it } from "vitest";
import { englishOn, formatNumberIn, translate } from "@/lib/i18n";
import { vi } from "@/lib/i18n/vi";
import { en } from "@/lib/i18n/en";

describe("i18n foundation", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(translate("vi", "settings.coach.linked", { name: "Minh", level: 3 })).toBe("Minh · Level 3");
    expect(translate("en", "settings.hero.protein", { range: "120–150 g" })).toBe("protein 120–150 g");
    expect(translate("vi", "settings.hero.protein")).toBe("đạm {range}");
  });

  it("en has every vi key, none empty", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    for (const message of Object.values(en)) expect(typeof message === "string" ? message : message.other).not.toBe("");
  });

  it("the flag is off unless the build turns it on, or a demo build has the preview key", () => {
    expect(englishOn(false, false, "1")).toBe(false);
    expect(englishOn(false, true, null)).toBe(false);
    expect(englishOn(false, true, "1")).toBe(true);
    expect(englishOn(true, false, null)).toBe(true);
  });

  it("numbers follow the locale: 1.234,5 in vi, 1,234.5 in en", () => {
    expect(formatNumberIn("vi", 1234.5)).toBe("1.234,5");
    expect(formatNumberIn("en", 1234.5)).toBe("1,234.5");
  });
});
