import { describe, expect, it } from "vitest";
import { LANDING_MAX_AGE_MS, landingTransform, setLanding, takeLanding } from "../touch-drag-landing";

// A food row let go by a finger lands from the copy that was under the finger (row-motion.ts plays the FLIP).

describe("touch drag landing", () => {
  it("is read once", () => {
    setLanding("a", { cx: 100, cy: 200, width: 360 }, 1000);
    expect(takeLanding("a", 1100)).toMatchObject({ cx: 100, cy: 200, width: 360 });
    expect(takeLanding("a", 1100)).toBeNull();
  });

  it("is only good for a moment: an old one is another move", () => {
    setLanding("b", { cx: 1, cy: 2, width: 3 }, 0);
    expect(takeLanding("b", LANDING_MAX_AGE_MS + 1)).toBeNull();
    setLanding("c", { cx: 1, cy: 2, width: 3 }, 0);
    expect(takeLanding("c", LANDING_MAX_AGE_MS)).not.toBeNull();
  });

  it("the row starts where the copy is: translate by the gap between the two centres, scaled by the copy's width", () => {
    // The copy (3 % larger, 371 px wide) has its centre at (195, 300); the row sits at x 15, y 500, 360 x 60: centre (195, 530)
    const t = landingTransform({ cx: 195, cy: 300, width: 370.8, at: 0 }, { left: 15, top: 500, width: 360, height: 60 });
    expect(t).toBe("translate(0px, -230px) scale(1.03)");
  });
});
