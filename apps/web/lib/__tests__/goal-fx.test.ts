import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playFx, type FxElement } from "../goal-fx";

// feat/sound-goals §5: a class is added for one run and taken off on animationend (or by a timer), restarting cleanly.

function fakeEl() {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  let handler: ((e: { target: unknown }) => void) | undefined;
  const el: FxElement & { classes: Set<string>; props: Map<string, string>; end(target?: unknown): void; removed: string[] } = {
    classes,
    props,
    removed: [],
    classList: { add: (c) => void classes.add(c), remove: (c) => void (classes.delete(c), el.removed.push(c)) },
    style: { setProperty: (n, v) => void props.set(n, v), removeProperty: (n) => void props.delete(n) },
    addEventListener: (_t, fn) => void (handler = fn),
    removeEventListener: () => void (handler = undefined),
    offsetWidth: 0,
    end: (target) => handler?.({ target: target ?? el }),
  };
  return el;
}

describe("playFx", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("adds the class, and takes it off when its own animation ends", () => {
    const el = fakeEl();
    playFx(el, "m-goal-pop");
    expect(el.classes.has("m-goal-pop")).toBe(true);
    el.end();
    expect(el.classes.has("m-goal-pop")).toBe(false);
  });
  it("an animationend that bubbles from a child is not its own: the class stays", () => {
    const el = fakeEl();
    playFx(el, "m-goal-pop");
    el.end({});
    expect(el.classes.has("m-goal-pop")).toBe(true);
  });
  it("a delay is a custom property for the run, gone with the class", () => {
    const el = fakeEl();
    playFx(el, "m-goal-sheen", 160);
    expect(el.props.get("--m-goal-delay")).toBe("160ms");
    el.end();
    expect(el.props.has("--m-goal-delay")).toBe(false);
  });
  it("no animationend (a tab in the background): a timer takes the class off", () => {
    const el = fakeEl();
    playFx(el, "m-goal-ring");
    vi.advanceTimersByTime(1199);
    expect(el.classes.has("m-goal-ring")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.classes.has("m-goal-ring")).toBe(false);
  });
  it("played again, it restarts: taken off first, then added", () => {
    const el = fakeEl();
    playFx(el, "m-goal-pop");
    playFx(el, "m-goal-pop");
    expect(el.removed.filter((c) => c === "m-goal-pop").length).toBeGreaterThanOrEqual(2);
    expect(el.classes.has("m-goal-pop")).toBe(true);
  });
});
