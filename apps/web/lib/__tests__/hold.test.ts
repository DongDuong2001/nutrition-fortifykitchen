import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHold, guardNextClick, HOLD_MOVE_PX, HOLD_MS, CLICK_GUARD_MS } from "../hold";

// Job A (hero hold): press and hold opens the foods behind a macro. A short tap, a finger that moves and a scroll never do.
describe("createHold", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("holds as long as a meal row does (500 ms)", () => {
    expect(HOLD_MS).toBe(500);
  });

  it("fires once after the hold time, with the thing that was pressed", () => {
    const onHold = vi.fn();
    const hold = createHold<string>(onHold);
    hold.start("protein", 100, 100);
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledExactlyOnceWith("protein", true);
  });

  it("a tap shorter than the hold does nothing", () => {
    const onHold = vi.fn();
    const hold = createHold<string>(onHold);
    hold.start("fat", 0, 0);
    vi.advanceTimersByTime(200);
    hold.cancel();
    vi.advanceTimersByTime(1000);
    expect(onHold).not.toHaveBeenCalled();
    expect(hold.takeFired()).toBe(false);
  });

  it("a move of more than 10 px cancels it (a scroll never opens it)", () => {
    const onHold = vi.fn();
    const hold = createHold<string>(onHold);
    hold.start("carbs", 100, 100);
    hold.move(100, 100 + HOLD_MOVE_PX);
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    const h2 = createHold<string>(second);
    h2.start("carbs", 100, 100);
    h2.move(100, 100 + HOLD_MOVE_PX + 1);
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(second).not.toHaveBeenCalled();
  });

  it("the click that follows a hold is taken once, so the hold does not also toggle the kcal view", () => {
    const hold = createHold<string>(() => {});
    hold.start("protein", 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    hold.cancel(); // pointerup
    expect(hold.takeFired()).toBe(true);
    expect(hold.takeFired()).toBe(false);
  });

  it("a new press forgets a hold nobody clicked after (finger slid off before the click)", () => {
    const hold = createHold<string>(() => {});
    hold.start("protein", 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    hold.start("fat", 0, 0);
    expect(hold.takeFired()).toBe(false);
  });

  it("a right-click after an earlier hold nobody clicked after still opens it (reset by the new press)", () => {
    const onHold = vi.fn();
    const hold = createHold<string>(onHold);
    hold.start("protein", 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    hold.reset();
    hold.fire("protein");
    expect(onHold).toHaveBeenCalledTimes(2);
  });

  it("a right-click or the browser's own long-press menu fires it at once, and only once with the timer", () => {
    const onHold = vi.fn();
    const hold = createHold<string>(onHold);
    hold.start("protein", 0, 0);
    hold.fire("protein");
    vi.advanceTimersByTime(HOLD_MS * 2);
    hold.fire("protein");
    expect(onHold).toHaveBeenCalledExactlyOnceWith("protein", false);
  });
});

// The sheet a hold opens has a scrim that closes on a click, and the lifted finger can still deliver one
describe("guardNextClick", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const fakeDoc = () => {
    const listeners = new Map<string, EventListener>();
    return {
      listeners,
      addEventListener: (type: string, fn: EventListener) => void listeners.set(type, fn),
      removeEventListener: (type: string, fn: EventListener) => void (listeners.get(type) === fn && listeners.delete(type)),
      dispatch: (type: string) => {
        const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
        listeners.get(type)?.(event as unknown as Event);
        return event;
      },
    };
  };

  it("swallows the click that ends the hold, once", () => {
    const doc = fakeDoc();
    guardNextClick(doc);
    doc.dispatch("pointerup");
    const click = doc.dispatch("click");
    expect(click.stopPropagation).toHaveBeenCalled();
    expect(click.preventDefault).toHaveBeenCalled();
    expect(doc.listeners.has("click")).toBe(false);
  });

  it("lets a later tap through when no click followed the lifted finger", () => {
    const doc = fakeDoc();
    guardNextClick(doc);
    doc.dispatch("pointerup");
    vi.advanceTimersByTime(CLICK_GUARD_MS);
    expect(doc.listeners.has("click")).toBe(false);
    expect(doc.listeners.has("pointerup")).toBe(false);
  });

  it("a new press ends the guard, so a stray guard never eats a real tap (reviewer 24/10)", () => {
    const doc = fakeDoc();
    guardNextClick(doc);
    doc.dispatch("pointerdown");
    expect(doc.listeners.has("click")).toBe(false);
    expect(doc.listeners.has("pointerdown")).toBe(false);
    const click = doc.dispatch("click");
    expect(click.preventDefault).not.toHaveBeenCalled();
  });

  it("the click that ends the hold comes with no new press, so it is still swallowed", () => {
    const doc = fakeDoc();
    guardNextClick(doc);
    vi.advanceTimersByTime(600);
    doc.dispatch("pointerup");
    expect(doc.dispatch("click").preventDefault).toHaveBeenCalled();
    expect(doc.listeners.has("pointerdown")).toBe(false);
  });

  it("keeps guarding while the finger is still down", () => {
    const doc = fakeDoc();
    guardNextClick(doc);
    vi.advanceTimersByTime(5000);
    expect(doc.listeners.has("click")).toBe(true);
  });
});
