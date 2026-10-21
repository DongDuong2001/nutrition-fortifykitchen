import { describe, expect, it } from "vitest";
import { buildNutrientRows } from "../nutrient-rows";
import { NUTRIENT_CATALOG } from "../nutrients";
import { SAMPLE_DAY, type MockDayData } from "../mock/sample-day";

function rowFor(day: MockDayData, id: string) {
  return Object.values(buildNutrientRows(day))
    .flat()
    .find((row) => row.definition.id === id);
}

describe("buildNutrientRows", () => {
  it("reads amount, range and percentage for calcium from the sample day", () => {
    const row = rowFor(SAMPLE_DAY, "calcium");
    expect(row?.consumed).toBe(331);
    // V3-SPEC §6: the sample user's target from lib/rda (US DRI, a man of 23): 1.000 mg
    expect(row?.targetMin).toBe(1000);
    expect(row?.targetMax).toBeUndefined();
    expect(row?.percentage).toBe(33);
    expect(row?.formattedAmount).toBe("331 mg");
  });

  it("shows a dash, never 0, when a mineral amount is unknown", () => {
    const day: MockDayData = {
      ...SAMPLE_DAY,
      minerals: SAMPLE_DAY.minerals.map((m) =>
        m.key === "calcium" ? { ...m, consumed: null, percentage: null } : m
      ),
    };
    const row = rowFor(day, "calcium");
    expect(row?.consumed).toBeNull();
    expect(row?.percentage).toBeNull();
    expect(row?.formattedAmount).toBe("—");
  });

  it("shows a dash for a nutrient the day does not know (null in the nutrient record)", () => {
    const row = rowFor(SAMPLE_DAY, "alcohol");
    expect(row?.consumed).toBeNull();
    expect(row?.formattedAmount).toBe("—");
  });

  it("keeps every catalog nutrient, so any Vi chất row has a detail to open", () => {
    const rows = Object.values(buildNutrientRows(SAMPLE_DAY)).flat();
    expect(rows).toHaveLength(NUTRIENT_CATALOG.length);
    expect(rowFor(SAMPLE_DAY, "water")?.targetSource).toBe("none");
  });
});
