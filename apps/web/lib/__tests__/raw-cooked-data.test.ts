import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FULL_GROUPS, FULL_PAIRS, SLIM_GROUPS, SLIM_PAIRS, slimText } from "../../scripts/slim-pairs.mjs";

const read = (file: string) => readFileSync(file, "utf8");

describe("the slim raw-cooked files lib/yield reads (scripts/slim-pairs.mjs)", () => {
  it("are exactly the research files in tests/fixtures, slimmed: no drift", () => {
    const text = slimText(JSON.parse(read(FULL_PAIRS)), JSON.parse(read(FULL_GROUPS)));
    expect(read(SLIM_PAIRS)).toBe(text.pairs);
    expect(read(SLIM_GROUPS)).toBe(text.groups);
  });

  it("keep every pair, and no names", () => {
    const slim: [string, string, number][] = JSON.parse(read(SLIM_PAIRS));
    expect(slim).toHaveLength(JSON.parse(read(FULL_PAIRS)).length);
    expect(slim[0]).toEqual(["usda_sr_legacy|FDC 169441", "usda_sr_legacy|FDC 169442", 65]);
    expect(read(SLIM_PAIRS)).not.toMatch(/name_vi|yield_source|Bắp bò/);
  });
});
