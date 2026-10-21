import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { FLICK_SPEED, TOAST_FLICK_SPEED, releaseVelocity } from "../sheet-physics";

// cc-fluid-add: the toast's swipe. Its own flick speed, a second finger ignored while one swipes, and the transition written
// for the slide taken off when it ends (the toast's own exit and rise are CSS transitions that an inline one would override).

const swipe = readFileSync(path.resolve(__dirname, "../../components/ui/use-toast-swipe.ts"), "utf8");
const host = readFileSync(path.resolve(__dirname, "../../components/diary-toast.tsx"), "utf8");

describe("toast swipe", () => {
  it("a flick is 0.11 px/ms, gentler than a sheet's 0.4", () => {
    expect(TOAST_FLICK_SPEED).toBe(0.11);
    expect(TOAST_FLICK_SPEED).toBeLessThan(FLICK_SPEED);
    expect(swipe).toContain("TOAST_FLICK_SPEED");
    expect(swipe).not.toMatch(/[^_]FLICK_SPEED/);
    // 6 px in 50 ms is 0.12 px/ms: a flick for a toast, not for a sheet
    const v = releaseVelocity([{ t: 0, y: 0 }, { t: 50, y: 6 }], 60);
    expect(v).toBeGreaterThan(TOAST_FLICK_SPEED);
    expect(v).toBeLessThan(FLICK_SPEED);
  });

  it("ignores a second pointerdown while one is down, and clears the inline transition when the slide back ends", () => {
    expect(swipe).toMatch(/if \(e\.button !== 0 \|\| drag\.current\) return;/);
    expect(swipe).toContain('addEventListener("transitionend"');
    expect(swipe).toMatch(/el\.style\.transition = ""/);
  });

  it("one toast element for every toast: a constant key, the clock restarted by its own key", () => {
    expect(host).toContain('key="diary-toast"');
    expect(host).toContain("countdownKey=");
    // It rides up over the Khay bar with a transition instead of swapping classes (see toast-pause.test)
    expect(host).toContain("m-toast-host");
  });
});
