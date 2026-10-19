import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTOSCROLL_EDGE_PX, TOUCH_LIFT_MS, TOUCH_MOVE_PX, autoScrollDelta, canTouchDrag, createTouchDrag } from "../use-touch-drag";
import { isEditableDay } from "../day-rules";

// cc-70: hold a food, then drag it to another meal (the gesture; the DOM side is checked by tests/probes/cc_70_touch_drag.py)
type Slot = "breakfast" | "lunch" | "snack";

/** A gesture whose meals are bands of the screen: breakfast y < 100, lunch 100..200, snack from 200 on (nothing past x 300). */
function gesture(from: Slot = "breakfast") {
  const log: string[] = [];
  const g = createTouchDrag<Slot>({
    from,
    slotAt: (x, y) => (x > 300 ? null : y < 100 ? "breakfast" : y < 200 ? "lunch" : "snack"),
    onLift: () => log.push("lift"),
    onDragStart: () => log.push("start"),
    onMove: () => log.push("move"),
    onTarget: (s) => log.push(`target:${s}`),
    onDrop: (s) => log.push(`drop:${s}`),
    onSpringBack: () => log.push("back"),
    onLongPress: () => log.push("longpress"),
    onCancel: () => log.push("cancel"),
  });
  return { g, log };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createTouchDrag", () => {
  it("lifts after the 500 ms hold, not before", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS - 1);
    expect(log).toEqual([]);
    expect(g.phase).toBe("pressing");
    vi.advanceTimersByTime(1);
    expect(log).toEqual(["lift"]);
    expect(g.phase).toBe("lifted");
  });

  it("a move of more than 8 px before the lift cancels it: the list scrolls, nothing lifts", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    g.move(50, 50 + TOUCH_MOVE_PX); // exactly 8: still a hold
    expect(log).toEqual([]);
    g.move(50, 50 + TOUCH_MOVE_PX + 1);
    expect(log).toEqual(["cancel"]);
    expect(g.phase).toBe("idle");
    vi.advanceTimersByTime(TOUCH_LIFT_MS * 2);
    expect(log).toEqual(["cancel"]);
    expect(g.up(50, 70)).toBe("none");
  });

  it("let go before the hold is a tap: no lift, no action (the click selects the food)", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    vi.advanceTimersByTime(300);
    expect(g.up(50, 50)).toBe("tap");
    vi.advanceTimersByTime(1000);
    expect(log).toEqual([]);
  });

  it("after the lift, a move of more than 8 px is a drag; the meal under the finger is the target; letting go over another meal drops there", () => {
    const { g, log } = gesture("breakfast");
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    g.move(50, 50 + TOUCH_MOVE_PX); // a small wobble after the lift is not a drag
    expect(log).toEqual(["lift"]);
    g.move(50, 130);
    expect(log).toEqual(["lift", "start", "target:lunch"]);
    g.move(50, 160); // still lunch: no new target
    expect(log.at(-1)).toBe("move");
    expect(log.filter((l) => l.startsWith("target"))).toEqual(["target:lunch"]);
    g.move(50, 230);
    expect(log.filter((l) => l.startsWith("target"))).toEqual(["target:lunch", "target:snack"]);
    expect(g.up(50, 230)).toBe("drop");
    // The highlight is cleared before the move, and the gesture is over
    expect(log.slice(-2)).toEqual(["target:null", "drop:snack"]);
    expect(g.phase).toBe("idle");
  });

  it("over the meal it came from there is no target; letting go there springs back and changes nothing", () => {
    const { g, log } = gesture("breakfast");
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    g.move(50, 130);
    g.move(50, 60);
    expect(log.filter((l) => l.startsWith("target"))).toEqual(["target:lunch", "target:null"]);
    expect(g.up(50, 60)).toBe("spring-back");
    expect(log.some((l) => l.startsWith("drop"))).toBe(false);
    expect(log.at(-1)).toBe("back");
  });

  it("letting go outside any meal springs back", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    g.move(50, 130);
    g.move(350, 130);
    expect(log.filter((l) => l.startsWith("target"))).toEqual(["target:lunch", "target:null"]);
    expect(g.up(350, 130)).toBe("spring-back");
    expect(log.some((l) => l.startsWith("drop"))).toBe(false);
  });

  it("let go after the lift without moving is the long press action", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS + 100);
    expect(g.up(52, 51)).toBe("long-press");
    expect(log).toEqual(["lift", "longpress"]);
  });

  it("a cancel (a call, an app switch) after the lift or in the drag restores everything and changes nothing", () => {
    const lifted = gesture();
    lifted.g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    lifted.g.cancel();
    expect(lifted.log).toEqual(["lift", "cancel"]);
    expect(lifted.g.up(50, 50)).toBe("none");

    const dragging = gesture();
    dragging.g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    dragging.g.move(50, 130);
    dragging.g.cancel();
    expect(dragging.log).toEqual(["lift", "start", "target:lunch", "target:null", "cancel"]);
    expect(dragging.log.some((l) => l.startsWith("drop") || l === "longpress")).toBe(false);
    expect(dragging.g.phase).toBe("idle");
  });

  it("a cancel before the lift stops the hold: it never lifts", () => {
    const { g, log } = gesture();
    g.down(50, 50);
    g.cancel();
    vi.advanceTimersByTime(TOUCH_LIFT_MS * 2);
    expect(log).toEqual(["cancel"]);
  });

  it("the list scrolling under a still finger changes the target", () => {
    let band: Slot = "breakfast";
    const targets: (Slot | null)[] = [];
    const g = createTouchDrag<Slot>({
      from: "breakfast",
      slotAt: () => band,
      onLift: () => {},
      onDragStart: () => {},
      onMove: () => {},
      onTarget: (s) => targets.push(s),
      onDrop: () => {},
      onSpringBack: () => {},
      onLongPress: () => {},
      onCancel: () => {},
    });
    g.down(50, 50);
    vi.advanceTimersByTime(TOUCH_LIFT_MS);
    g.retarget(50, 50); // not dragging yet: ignored
    g.move(50, 80);
    expect(targets).toEqual([]);
    band = "lunch";
    g.retarget(50, 80);
    expect(targets).toEqual(["lunch"]);
  });
});

describe("canTouchDrag: only on a day that can be edited, not in select mode, not under a sheet", () => {
  const today = "2026-10-19";
  const editableOn = (iso: string) => isEditableDay(iso, today);

  it("today and yesterday yes; the day before yesterday is read-only", () => {
    expect(canTouchDrag({ editable: editableOn("2026-10-19"), selecting: false, sheetOpen: false })).toBe(true);
    expect(canTouchDrag({ editable: editableOn("2026-10-18"), selecting: false, sheetOpen: false })).toBe(true);
    expect(canTouchDrag({ editable: editableOn("2026-10-17"), selecting: false, sheetOpen: false })).toBe(false);
  });

  it("select mode and an open sheet switch it off", () => {
    expect(canTouchDrag({ editable: true, selecting: true, sheetOpen: false })).toBe(false);
    expect(canTouchDrag({ editable: true, selecting: false, sheetOpen: true })).toBe(false);
  });
});

describe("autoScrollDelta: the list scrolls with the finger within 48 px of its top or bottom edge", () => {
  const top = 100;
  const bottom = 700;

  it("nothing in the middle, nothing at the band's inner edge", () => {
    expect(autoScrollDelta(400, top, bottom)).toBe(0);
    expect(autoScrollDelta(top + AUTOSCROLL_EDGE_PX, top, bottom)).toBe(0);
    expect(autoScrollDelta(bottom - AUTOSCROLL_EDGE_PX, top, bottom)).toBe(0);
  });

  it("up near the top, down near the bottom, faster the closer to the edge, the most at and past it", () => {
    expect(autoScrollDelta(top + 24, top, bottom)).toBeLessThan(0);
    expect(autoScrollDelta(top + 24, top, bottom)).toBeGreaterThan(autoScrollDelta(top + 4, top, bottom));
    expect(autoScrollDelta(top - 30, top, bottom)).toBe(autoScrollDelta(top, top, bottom));
    expect(autoScrollDelta(bottom - 24, top, bottom)).toBeGreaterThan(0);
    expect(autoScrollDelta(bottom - 4, top, bottom)).toBeGreaterThan(autoScrollDelta(bottom - 24, top, bottom));
    expect(autoScrollDelta(bottom + 30, top, bottom)).toBe(autoScrollDelta(bottom, top, bottom));
  });
});
