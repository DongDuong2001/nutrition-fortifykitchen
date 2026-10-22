import { describe, expect, it } from "vitest";
import { NUTRIENT_CATALOG } from "../nutrients";
import { NUTRIENT_COLORS, nutrientDot, nutrientFill } from "../nutrient-colors";
import { token } from "./css-tokens";

// V3-SPEC §1: one colour per nutrient, everywhere (row dot, Giàu tile, detail accent bar, "Thiếu nhất" chip, trend line).
describe("nutrient colours", () => {
  const micros = NUTRIENT_CATALOG.filter((n) => n.group === "minerals" || n.group === "vitamins");

  it("covers every mineral and vitamin of the catalogue (22)", () => {
    expect(micros).toHaveLength(22);
    for (const n of micros) expect(NUTRIENT_COLORS[n.id], n.id).toBeDefined();
  });

  it("follows the V3 table", () => {
    expect(NUTRIENT_COLORS).toMatchObject({
      calcium: "cyan", iron: "red", potassium: "purple", magnesium: "indigo", zinc: "teal", sodium: "blue",
      phosphorus: "mint", copper: "brown", selenium: "green", manganese: "pink",
      vitamin_a: "pink", b1: "brown", b2: "cyan", b3: "blue", b5: "indigo", b6: "purple", b12: "red", folate: "mint",
      vitamin_c: "orange", vitamin_d: "yellow", vitamin_e: "green", vitamin_k: "teal",
    });
  });

  it("gives a mineral the table has no row for yellow", () => {
    expect(nutrientFill("iodine")).toBe("var(--color-sys-yellow)");
  });

  it("uses the deep shade for the dot (light) and the base for fills, both real tokens", () => {
    for (const n of micros) {
      const dot = nutrientDot(n.id).match(/--color-([\w-]+)/)![1];
      const fill = nutrientFill(n.id).match(/--color-([\w-]+)/)![1];
      expect(dot.startsWith("deep-"), n.id).toBe(true);
      expect(token(dot), dot).not.toBe("");
      expect(token(fill), fill).not.toBe("");
    }
  });
});
