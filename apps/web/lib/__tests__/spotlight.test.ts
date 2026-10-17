import { describe, expect, it } from "vitest";
import { cardPlacement, holeFor, roundHole, type Box } from "../spotlight";

const VIEW = { width: 390, height: 844 };

describe("holeFor", () => {
  it("grows the element's box by 6 px each side", () => {
    expect(holeFor({ left: 100, top: 200, width: 50, height: 40 }, VIEW)).toEqual({ left: 94, top: 194, width: 62, height: 52 });
  });

  it("stays inside the screen", () => {
    expect(holeFor({ left: 0, top: 0, width: 390, height: 100 }, VIEW)).toEqual({ left: 0, top: 0, width: 390, height: 106 });
    expect(holeFor({ left: 350, top: 800, width: 60, height: 60 }, VIEW)).toEqual({ left: 344, top: 794, width: 46, height: 50 });
  });
});

describe("cardPlacement", () => {
  const card = { width: 340, height: 200 };

  it("puts the card below the hole when there is room", () => {
    const hole: Box = { left: 16, top: 100, width: 358, height: 120 };
    const p = cardPlacement(hole, VIEW, card);
    expect(p.side).toBe("below");
    expect(p.top).toBe(hole.top + hole.height + 12);
  });

  it("puts it above when the hole is low", () => {
    const hole: Box = { left: 150, top: 700, width: 90, height: 90 };
    const p = cardPlacement(hole, VIEW, card);
    expect(p.side).toBe("above");
    expect(p.top + card.height + 12).toBe(hole.top);
  });

  it("never overlaps the hole, whatever the hole", () => {
    const holes: Box[] = [
      { left: 0, top: 0, width: 390, height: 60 },
      { left: 100, top: 380, width: 190, height: 80 },
      { left: 10, top: 760, width: 370, height: 84 },
      { left: 0, top: 120, width: 390, height: 600 },
    ];
    for (const hole of holes) {
      const p = cardPlacement(hole, VIEW, card);
      const height = Math.min(card.height, p.maxHeight);
      const bottom = p.top + height;
      const clear = p.side === "below" ? p.top >= hole.top + hole.height : bottom <= hole.top;
      expect(clear, JSON.stringify(hole)).toBe(true);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(VIEW.height);
    }
  });

  it("keeps the card 16 px from the sides and points the arrow at the hole's middle", () => {
    const hole: Box = { left: 300, top: 100, width: 80, height: 40 };
    const p = cardPlacement(hole, VIEW, card);
    expect(p.left).toBe(390 - 16 - 340);
    expect(p.width).toBe(340);
    expect(p.arrowLeft).toBe(hole.left + hole.width / 2 - p.left);
    const narrow = cardPlacement({ left: 0, top: 100, width: 20, height: 20 }, VIEW, card);
    expect(narrow.arrowLeft).toBeGreaterThanOrEqual(20);
  });

  it("is narrower than the screen on a small phone", () => {
    expect(cardPlacement({ left: 10, top: 100, width: 50, height: 50 }, { width: 320, height: 640 }, card).width).toBe(288);
  });
});

describe("roundHole", () => {
  it("is 44 px and centred on the element, whatever its size", () => {
    expect(roundHole({ left: 300, top: 10, width: 44, height: 44 })).toEqual({ left: 300, top: 10, width: 44, height: 44 });
    expect(roundHole({ left: 100, top: 100, width: 60, height: 30 })).toEqual({ left: 108, top: 93, width: 44, height: 44 });
  });
});
