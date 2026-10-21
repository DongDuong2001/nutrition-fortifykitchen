import { describe, expect, it, vi } from "vitest";
import { createSheetDrag, type AnimateFn, type DragElement, type DragHost } from "../ui/sheet-drag-controller";
import type { ReleasePlan } from "@/lib/sheet-physics";

// cc-62: the sheet drag without a browser. The element and motion's animate are fakes; the decisions come from
// lib/sheet-physics (tested there), these check what the controller does with them. The host's animate is a fake that records
// the plan (from, to, the linear() easing) and lets a test finish or stop it.

/** The samples of a plan's linear() easing. */
const samplesOf = (plan: ReleasePlan) => plan.easing.slice("linear(".length, -1).split(", ").map(Number);

function fakeEl(height = 600): DragElement & { attrs: Set<string> } {
  const attrs = new Set<string>();
  return {
    attrs,
    style: { transform: "", opacity: "" },
    dataset: { state: "open" },
    offsetHeight: height,
    setAttribute: (name: string) => void attrs.add(name),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
}

function fakeAnimate() {
  const runs: Array<{ plan: ReleasePlan; finish: () => void; stopped: boolean }> = [];
  const animate: AnimateFn = (_el, plan) => {
    let done: () => void = () => {};
    const run = { plan, finish: () => done(), stopped: false };
    runs.push(run);
    return {
      stop: () => void (run.stopped = true),
      then: (resolve: () => void) => void (done = resolve),
    };
  };
  return { animate, runs };
}

function setup(over: Partial<DragHost> = {}) {
  const sheet = fakeEl();
  const scrim = fakeEl();
  const { animate, runs } = fakeAnimate();
  let offset = 0;
  const host: DragHost = {
    sheet: () => sheet,
    scrim: () => scrim,
    readOffset: () => offset,
    reducedMotion: () => false,
    animate: () => animate,
    onDismiss: vi.fn(),
    ...over,
  };
  const drag = createSheetDrag(host);
  return { drag, host, sheet, scrim, runs, setOffset: (y: number) => (offset = y) };
}

/** A drag from y = 0 through `points` ([ms, finger y]), released at `releaseAt`. */
function gesture(drag: ReturnType<typeof createSheetDrag>, points: Array<[number, number]>, releaseAt: number) {
  drag.down(1, 0, 0);
  for (const [t, y] of points) drag.move(1, y, t);
  drag.up(1, releaseAt, false);
}

describe("the sheet drag controller", () => {
  it("follows the finger, the scrim fading with it", () => {
    const { drag, sheet, scrim } = setup();
    drag.down(1, 100, 0);
    drag.move(1, 400, 16);
    expect(sheet.style.transform).toBe("translateY(300px)");
    expect(sheet.attrs.has("data-dragging")).toBe(true);
    expect(scrim.style.opacity).toBe("0.5");
  });

  it("a slow 60 px drag stays open: a spring back to 0 with no bounce", () => {
    const { drag, host, runs } = setup();
    gesture(drag, [[300, 20], [600, 40], [900, 60]], 905);
    expect(host.onDismiss).not.toHaveBeenCalled();
    expect([runs[0].plan.from, runs[0].plan.to]).toEqual([60, 0]);
    expect(Math.max(...samplesOf(runs[0].plan))).toBeLessThanOrEqual(1.0001);
  });

  it("a fast flick closes: onDismiss at once, data-state closed, a spring to the sheet's height with the release velocity", () => {
    const { drag, host, sheet, runs } = setup();
    gesture(drag, [[16, 12], [32, 24], [48, 40]], 50);
    expect(host.onDismiss).toHaveBeenCalledTimes(1);
    expect(sheet.dataset.state).toBe("closed");
    expect([runs[0].plan.from, runs[0].plan.to]).toEqual([40, 600]);
    // The spring starts with the finger's speed (0.83 px/ms over the 560 px still to go): no bounce on a close
    expect(runs[0].plan.easing.startsWith("linear(0, ")).toBe(true);
    expect(Math.max(...samplesOf(runs[0].plan))).toBeLessThanOrEqual(1.0001);
  });

  it("the release animation is played before the close work, in the same pointerup", () => {
    const order: string[] = [];
    const onDismiss = vi.fn(() => order.push("dismiss"));
    const { drag, host } = setup({ onDismiss, animate: () => (() => (order.push("animate"), { stop: () => {}, then: () => {} })) });
    expect(host).toBeDefined();
    gesture(drag, [[16, 12], [32, 24], [48, 40]], 50);
    expect(order).toEqual(["animate", "dismiss"]);
  });

  it("drag down then flick back up stays open, with a little bounce", () => {
    const { drag, host, runs } = setup();
    gesture(drag, [[200, 250], [400, 320], [416, 300], [432, 280], [448, 260]], 450);
    expect(host.onDismiss).not.toHaveBeenCalled();
    // A flick that did not close settles with a little bounce: the spring goes a little past the top
    expect(Math.max(...samplesOf(runs[0].plan))).toBeGreaterThan(1.001);
  });

  it("clears the inline transform and data-dragging once the spring has finished, and settled() resolves", async () => {
    const { drag, sheet, scrim, runs } = setup();
    gesture(drag, [[16, 12], [32, 24], [48, 40]], 50);
    expect(scrim.attrs.has("data-dragging")).toBe(false);
    expect(scrim.style.opacity).toBe("");
    let settled = false;
    void drag.settled().then(() => (settled = true));
    runs[0].finish();
    await Promise.resolve();
    expect(settled).toBe(true);
    expect(sheet.style.transform).toBe("");
    expect(sheet.attrs.has("data-dragging")).toBe(false);
  });

  it("a grab mid-spring stops it and drags from where the sheet is on screen; the closing sheet is taken back", async () => {
    const onRegrab = vi.fn(() => true);
    const { drag, sheet, runs, setOffset } = setup({ onRegrab });
    gesture(drag, [[16, 12], [32, 24], [48, 40]], 50);
    let settled = false;
    void drag.settled().then(() => (settled = true));
    setOffset(310);
    expect(drag.down(2, 500, 120)).toBe(true);
    expect(runs[0].stopped).toBe(true);
    expect(onRegrab).toHaveBeenCalledTimes(1);
    expect(sheet.style.transform).toBe("translateY(310px)");
    await Promise.resolve();
    expect(settled).toBe(true);
    // The stopped spring finishing late changes nothing: the new drag owns the sheet
    runs[0].finish();
    expect(sheet.attrs.has("data-dragging")).toBe(true);
    drag.move(2, 450, 136);
    expect(sheet.style.transform).toBe("translateY(260px)");
  });

  it("a sheet closed another way is not grabbed when the host cannot open it again", () => {
    const { drag, sheet } = setup({ onRegrab: () => false });
    sheet.dataset.state = "closed";
    expect(drag.down(1, 0, 0)).toBe(false);
    expect(sheet.attrs.has("data-dragging")).toBe(false);
  });

  it("reduced motion, or no animation to play: no spring, the CSS transition finishes from the release point", () => {
    for (const over of [{ reducedMotion: () => true }, { animate: () => null }]) {
      const { drag, sheet, runs, host } = setup(over);
      gesture(drag, [[16, 12], [32, 24], [48, 40]], 50);
      expect(runs).toHaveLength(0);
      expect(host.onDismiss).toHaveBeenCalled();
      expect(sheet.style.transform).toBe("");
      expect(sheet.attrs.has("data-dragging")).toBe(false);
    }
  });

  it("a cancelled pointer never closes", () => {
    const { drag, host } = setup();
    drag.down(1, 0, 0);
    drag.move(1, 500, 16);
    drag.up(1, 20, true);
    expect(host.onDismiss).not.toHaveBeenCalled();
  });
});
