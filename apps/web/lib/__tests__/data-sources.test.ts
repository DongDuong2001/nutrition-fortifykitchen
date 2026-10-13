import { describe, it, expect } from "vitest";
import { DATA_SOURCES, DATA_READING_GUIDE } from "../data-sources";
import { foodSourceLabel } from "../food-meta";

describe("DATA_SOURCES catalog", () => {
  it("defines entries for every standard source code supported in foodSourceLabel", () => {
    const codes = ["usda", "cnf", "vn-fct", "custom"];
    for (const code of codes) {
      const source = DATA_SOURCES.find((s) => s.id === code);
      expect(source, `Missing source entry for code: ${code}`).toBeDefined();
      expect(source?.name.length).toBeGreaterThan(0);
      expect(source?.description.length).toBeGreaterThan(0);
    }
  });

  it("has non-empty facts for data reading guide", () => {
    expect(DATA_READING_GUIDE.title).toBe("Cách đọc số liệu");
    expect(DATA_READING_GUIDE.bullet1).toContain("—");
    expect(DATA_READING_GUIDE.bullet2).toContain("không được tính là 0");
  });
});
