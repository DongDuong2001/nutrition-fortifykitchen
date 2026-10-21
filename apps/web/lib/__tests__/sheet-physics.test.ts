import { describe, expect, it } from "vitest";
import { FLICK_SPEED, SAMPLE_COUNT, projectedOffset, pushSample, releasePlan, releaseVelocity, shouldDismiss, springProgress, RELEASE_FALLBACK, RELEASE_SETTLE_MS, type DragSample } from "../sheet-physics";

// cc-62 (audit M1–M2): the release of a dragged sheet decides by velocity over the last 80 ms, never closes on an upward
// flick, and projects the momentum (pos + 499 · v) against half the sheet.

const H = 600;
const samples = (...pts: Array<[number, number]>): DragSample[] => pts.map(([t, y]) => ({ t, y }));

describe("the velocity window", () => {
  it("keeps the last five samples", () => {
    let s: DragSample[] = [];
    for (let i = 0; i < 9; i++) s = pushSample(s, { t: i * 16, y: i * 10 });
    expect(s).toHaveLength(SAMPLE_COUNT);
    expect(s[0]).toEqual({ t: 64, y: 40 });
  });

  it("is the slope over the last 80 ms only, not the whole drag", () => {
    // A slow 200 ms start, then a fast last 48 ms
    const s = samples([0, 0], [100, 10], [200, 20], [216, 40], [232, 60], [248, 80]);
    expect(releaseVelocity(s, 250)).toBeCloseTo(60 / 48, 5);
  });

  it("is 0 when the finger stood still for 100 ms before letting go", () => {
    const s = samples([0, 0], [16, 30], [32, 60]);
    expect(releaseVelocity(s, 131)).toBeGreaterThan(0);
    expect(releaseVelocity(s, 132)).toBe(0);
  });

  it("is 0 with one sample, and negative for an upward move", () => {
    expect(releaseVelocity(samples([0, 50]), 5)).toBe(0);
    expect(releaseVelocity(samples([0, 100], [16, 80], [32, 60]), 33)).toBeLessThan(0);
  });
});

describe("the release decision", () => {
  it("an upward flick never closes, even far down", () => {
    expect(shouldDismiss(H * 0.9, -0.5, H)).toBe(false);
    expect(shouldDismiss(H * 0.9, -0.01, H)).toBe(false);
  });

  it("a slow 60 px drag stays open", () => {
    const s = samples([0, 0], [300, 20], [600, 40], [900, 60]);
    expect(shouldDismiss(60, releaseVelocity(s, 905), H)).toBe(false);
  });

  it("a fast flick closes from a short distance", () => {
    const s = samples([0, 0], [16, 12], [32, 24], [48, 40]);
    const v = releaseVelocity(s, 50);
    expect(v).toBeGreaterThan(FLICK_SPEED);
    expect(shouldDismiss(40, v, H)).toBe(true);
  });

  it("drag down then flick back up stays open", () => {
    const s = samples([0, 0], [200, 250], [400, 320], [416, 300], [432, 280], [448, 260]);
    expect(shouldDismiss(260, releaseVelocity(s, 450), H)).toBe(false);
  });

  it("projects the momentum against half the sheet", () => {
    expect(projectedOffset(100, 0.3)).toBeCloseTo(249.7, 5);
    // 100 + 499 · 0.3 = 249.7: under 300, stays
    expect(shouldDismiss(100, 0.3, H)).toBe(false);
    // 200 + 499 · 0.3 = 349.7: past 300, closes, though not a flick
    expect(shouldDismiss(200, 0.3, H)).toBe(true);
    // Let go still, past half: closes
    expect(shouldDismiss(301, 0, H)).toBe(true);
    expect(shouldDismiss(299, 0, H)).toBe(false);
  });
});

describe("the release spring", () => {
  const samples = (easing: string) => easing.slice("linear(".length, -1).split(", ").map(Number);

  it("springProgress starts at 0 with the given speed and settles at 1", () => {
    const omega = 24;
    for (const [zeta, v0] of [[1, 0], [1, 6], [0.85, 4], [0.85, -3]] as const) {
      expect(springProgress(0, omega, zeta, v0)).toBeCloseTo(0, 9);
      const dt = 1e-5;
      expect((springProgress(dt, omega, zeta, v0) - springProgress(0, omega, zeta, v0)) / dt).toBeCloseTo(v0, 1);
      expect(springProgress(2, omega, zeta, v0)).toBeCloseTo(1, 6);
    }
  });

  it("a close carries the finger's speed over and never bounces; a slow snap back does not bounce either", () => {
    const close = releasePlan(40, true, 0.8, 600);
    expect([close.from, close.to, close.durationMs]).toEqual([40, 600, RELEASE_SETTLE_MS]);
    const s = samples(close.easing);
    expect(s[0]).toBe(0);
    expect(s[s.length - 1]).toBe(1);
    // 0.8 px/ms over 560 px: the sheet already moves at 1.43 per second at the start, so the first 7 ms are well over a plain ease
    expect(s[1]).toBeGreaterThan((1.43 * 0.007) * 0.8);
    expect(Math.max(...s)).toBeLessThanOrEqual(1.0001);
    const slow = samples(releasePlan(60, false, 0.05, 600).easing);
    expect(Math.max(...slow)).toBeLessThanOrEqual(1.0001);
  });

  it("a flick that did not close goes a little past the top; the overshoot stays small however hard the flick", () => {
    const flick = samples(releasePlan(100, false, -1.2, 600).easing);
    expect(Math.max(...flick)).toBeGreaterThan(1.001);
    expect(Math.max(...samples(releasePlan(3, false, -3, 600).easing))).toBeLessThan(1.5);
  });

  it("a finger moving away from the target first goes on that way, then comes back (negative start)", () => {
    // Let go at 100 px moving down at 0.2 px/ms but not enough to close: back to 0, so the first samples dip below 0
    const s = samples(releasePlan(100, false, 0.2, 600).easing);
    expect(Math.min(...s)).toBeLessThan(0);
    expect(s[s.length - 1]).toBe(1);
  });

  it("without linear() the sheet's own curve is used", () => {
    expect(releasePlan(40, true, 1, 600, false)).toEqual({ from: 40, to: 600, ...RELEASE_FALLBACK });
  });
});
