import { describe, expect, it } from "vitest";
import { FLICK_SPEED, SAMPLE_COUNT, projectedOffset, pushSample, releaseSpring, releaseVelocity, shouldDismiss, type DragSample } from "../sheet-physics";

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
  it("closes with no bounce, snaps back with 0.15 after a flick and 0 otherwise, velocity in px/s", () => {
    expect(releaseSpring(true, 1.2)).toEqual({ type: "spring", bounce: 0, visualDuration: 0.3, velocity: 1200 });
    expect(releaseSpring(false, -0.8)).toMatchObject({ bounce: 0.15, velocity: -800 });
    expect(releaseSpring(false, 0.1).bounce).toBe(0);
  });
});
