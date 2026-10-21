import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESS_MIN_MS, installPressFeedback, pressTargetOf, type PressTarget } from "../press-feedback";

// Press feedback on touch-down: the pressed control is marked data-pressed at the pointerdown (a touch or a pen) and unmarked
// at pointerup or pointercancel, never before PRESS_MIN_MS. A mouse keeps CSS :active. A fake document and elements, no DOM.

class FakeEl implements PressTarget {
  attrs = new Map<string, string>();
  constructor(
    public tag: string,
    public parent: FakeEl | null = null
  ) {}
  closest(selector: string): FakeEl | null {
    for (let el: FakeEl | null = this; el; el = el.parent) {
      if (selector.includes("[inert]") && (el.attrs.has("inert") || el.attrs.has("data-no-press"))) return el;
      if (selector.startsWith("button") && (el.tag === "button" || el.tag === "a" || el.attrs.get("role") === "button")) return el;
    }
    return null;
  }
  hasAttribute = (n: string) => this.attrs.has(n);
  getAttribute = (n: string) => this.attrs.get(n) ?? null;
  setAttribute = (n: string, v: string) => void this.attrs.set(n, v);
  removeAttribute = (n: string) => void this.attrs.delete(n);
}

function fakeDocument() {
  const handlers = new Map<string, (e: unknown) => void>();
  const doc = {
    addEventListener: (type: string, fn: (e: unknown) => void) => void handlers.set(type, fn),
    removeEventListener: (type: string) => void handlers.delete(type),
  };
  const fire = (type: string, e: Record<string, unknown>) => handlers.get(type)?.(e);
  return { doc: doc as unknown as Document, fire };
}

describe("press target", () => {
  it("is the nearest pressable ancestor; nothing for plain content, a disabled control, an inert subtree or an opt-out", () => {
    const button = new FakeEl("button");
    const label = new FakeEl("span", button);
    expect(pressTargetOf(label)).toBe(button);
    expect(pressTargetOf(new FakeEl("div"))).toBeNull();
    const off = new FakeEl("button");
    off.setAttribute("disabled", "");
    expect(pressTargetOf(off)).toBeNull();
    const aria = new FakeEl("button");
    aria.setAttribute("aria-disabled", "true");
    expect(pressTargetOf(aria)).toBeNull();
    const inertRoot = new FakeEl("div");
    inertRoot.setAttribute("inert", "");
    expect(pressTargetOf(new FakeEl("button", inertRoot))).toBeNull();
    const optOut = new FakeEl("div");
    optOut.setAttribute("data-no-press", "");
    expect(pressTargetOf(new FakeEl("button", optOut))).toBeNull();
  });
});

describe("press feedback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const { doc, fire } = fakeDocument();
    let t = 0;
    const off = installPressFeedback(doc, () => t);
    return { fire, off, at: (ms: number) => (t = ms) };
  };

  it("marks the control at the touch-down and unmarks it at pointerup", () => {
    const { fire, at } = setup();
    const btn = new FakeEl("button");
    fire("pointerdown", { pointerType: "touch", pointerId: 1, target: btn });
    expect(btn.hasAttribute("data-pressed")).toBe(true);
    at(300);
    fire("pointerup", { pointerId: 1 });
    expect(btn.hasAttribute("data-pressed")).toBe(false);
  });

  it("a tap shorter than PRESS_MIN_MS keeps the mark until it has shown", () => {
    const { fire, at } = setup();
    const btn = new FakeEl("button");
    fire("pointerdown", { pointerType: "touch", pointerId: 1, target: btn });
    at(30);
    fire("pointerup", { pointerId: 1 });
    expect(btn.hasAttribute("data-pressed")).toBe(true);
    vi.advanceTimersByTime(PRESS_MIN_MS - 30);
    expect(btn.hasAttribute("data-pressed")).toBe(false);
  });

  it("a cancelled pointer (the touch became a scroll) clears it, and a mouse is left to :active", () => {
    const { fire, at } = setup();
    const btn = new FakeEl("button");
    fire("pointerdown", { pointerType: "touch", pointerId: 2, target: btn });
    at(500);
    fire("pointercancel", { pointerId: 2 });
    expect(btn.hasAttribute("data-pressed")).toBe(false);
    fire("pointerdown", { pointerType: "mouse", pointerId: 3, target: btn });
    expect(btn.hasAttribute("data-pressed")).toBe(false);
  });

  it("a control another finger still holds stays marked, and removing the listeners clears every mark", () => {
    const { fire, off, at } = setup();
    const btn = new FakeEl("button");
    fire("pointerdown", { pointerType: "touch", pointerId: 1, target: btn });
    fire("pointerdown", { pointerType: "touch", pointerId: 2, target: btn });
    at(400);
    fire("pointerup", { pointerId: 1 });
    expect(btn.hasAttribute("data-pressed")).toBe(true);
    off();
    expect(btn.hasAttribute("data-pressed")).toBe(false);
  });
});
