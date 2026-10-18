import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PhaseChecklist } from "../phase-checklist";
import { tickAction } from "../training-log-sheet";
import { getTrainingPhases } from "@/lib/training";
import type { FoodItem } from "@/lib/mock/foods";

const SALT: FoodItem = { id: "mu", nameVi: "Muối ăn", category: "gia_vi", source: "USDA", servings: [{ label: "1 g", grams: 1 }], nutrients: { energy: 0 } };
const phases = getTrainingPhases(60, [], { size: "bu" });
const salt = phases[1].items[0];

// cc-52c: a tick while the live catalogue is still loading must not do nothing
describe("tickAction", () => {
  it("a ticked item unticks", () => {
    expect(tickAction(salt, [salt.id], [], true)).toBe("untick");
  });

  it("an item whose food is in the catalogue opens the portion sheet, loaded or not", () => {
    expect(tickAction(salt, [], [SALT], false)).toBe("sheet");
    expect(tickAction(salt, [], [SALT], true)).toBe("sheet");
  });

  it("while the catalogue is still loading, an item it may have waits (the row shows it is busy)", () => {
    expect(tickAction(salt, [], [], true)).toBe("wait");
  });

  it("once loaded, an item with no catalogue food is a plain tick", () => {
    expect(tickAction(salt, [], [], false)).toBe("tick");
  });
});

describe("PhaseChecklist busy row", () => {
  it("the waiting row says the catalogue is loading, with aria-busy; the others are as usual", () => {
    const html = renderToString(<PhaseChecklist phases={phases} ticked={[]} onToggle={() => {}} busyId={salt.id} />);
    expect(html).toContain("Đang tải danh mục…");
    expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
    expect(html.match(/Đang tải danh mục…/g)).toHaveLength(1);
  });

  it("no busy row by default", () => {
    const html = renderToString(<PhaseChecklist phases={phases} ticked={[]} onToggle={() => {}} />);
    expect(html).not.toContain("Đang tải danh mục…");
    expect(html).not.toContain("aria-busy");
  });
});
