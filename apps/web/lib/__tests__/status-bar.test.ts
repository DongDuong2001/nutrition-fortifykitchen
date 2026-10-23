import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS_BAR, isIos, statusBarStyleOf, watchScrolled } from "../status-bar";
import { contrast } from "./css-tokens";

// The two ways to deal with the clock of the installed app (fix/status-bar-scrim): "translucent" keeps iOS's black-translucent
// status bar (content runs under it, the clock is white, the scrim is dark while scrolled); "default" lets iOS draw its own bar with
// a black clock and nothing under it, so the scrim is not needed on iOS (it stays for Android).
describe("the status bar mode", () => {
  it("is translucent unless STATUS_BAR=default was set at build time, and maps to the apple-mobile-web-app-status-bar-style value", () => {
    expect(STATUS_BAR).toBe("translucent");
    expect(statusBarStyleOf("translucent")).toBe("black-translucent");
    expect(statusBarStyleOf("default")).toBe("default");
  });

  it("knows an iPhone, an iPad and an iPad that says it is a Mac, and not Android or a desktop", () => {
    expect(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 0)).toBe(false);
    expect(isIos("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile", 5)).toBe(false);
  });
});

// A fake IntersectionObserver that lets the test say what is in view
function fakeObserver() {
  const seen: { callback: (entries: { isIntersecting: boolean }[]) => void; observed: unknown[]; disconnected: boolean }[] = [];
  const Ctor = function (this: (typeof seen)[number], callback: (typeof seen)[number]["callback"]) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    seen.push(this);
  } as unknown as typeof IntersectionObserver;
  Ctor.prototype.observe = function (this: (typeof seen)[number], el: unknown) {
    this.observed.push(el);
  };
  Ctor.prototype.disconnect = function (this: (typeof seen)[number]) {
    this.disconnected = true;
  };
  return { Ctor, seen };
}

describe("watchScrolled: the data-scrolled mark of the scrim, from one IntersectionObserver on a sentinel", () => {
  const target = () => ({ dataset: {} as Record<string, string | undefined> }) as unknown as HTMLElement;
  const sentinel = {} as Element;

  it("is marked while the sentinel at the top of the page is out of view, and not while it is in view", () => {
    const { Ctor, seen } = fakeObserver();
    const el = target();
    watchScrolled(sentinel, el, { mode: "translucent", ios: true, IO: Ctor });
    expect(seen).toHaveLength(1);
    expect(seen[0].observed).toEqual([sentinel]);
    expect("scrolled" in el.dataset).toBe(false);
    seen[0].callback([{ isIntersecting: false }]);
    expect("scrolled" in el.dataset).toBe(true);
    seen[0].callback([{ isIntersecting: true }]);
    expect("scrolled" in el.dataset).toBe(false);
  });

  it("stops watching when the header goes away", () => {
    const { Ctor, seen } = fakeObserver();
    watchScrolled(sentinel, target(), { mode: "translucent", ios: true, IO: Ctor })();
    expect(seen[0].disconnected).toBe(true);
  });

  it("is on for good where there is no IntersectionObserver: content must never be left under the clock", () => {
    const el = target();
    watchScrolled(sentinel, el, { mode: "translucent", ios: true, IO: undefined });
    expect("scrolled" in el.dataset).toBe(true);
  });

  it("does nothing on iOS in default mode (iOS draws its own bar, content never goes under it), but still works elsewhere (Android)", () => {
    const ios = fakeObserver();
    const el = target();
    watchScrolled(sentinel, el, { mode: "default", ios: true, IO: ios.Ctor });
    expect(ios.seen).toHaveLength(0);
    expect("scrolled" in el.dataset).toBe(false);
    const android = fakeObserver();
    watchScrolled(sentinel, target(), { mode: "default", ios: false, IO: android.Ctor });
    expect(android.seen).toHaveLength(1);
  });
});

describe("the dark tint under a white clock", () => {
  const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
  const [r, g, b, a] = /--color-glass-tab-dark:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(css)!.slice(1).map(Number);
  // the glass over the lightest thing that can be behind it (white), as a solid colour
  const over = (c: number) => Math.round(c * a + 255 * (1 - a));
  const worst = "#" + [r, g, b].map((c) => over(c).toString(16).padStart(2, "0")).join("");

  it("keeps the white clock at 3:1 or better over the lightest content", () => {
    expect(contrast("#FFFFFF", worst)).toBeGreaterThanOrEqual(3);
  });
});
