import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTE_HZ, SOUNDS, SOUND_GAP_MS, iosWithoutAudioSession, soundDue, soundWanted } from "../sound";

// feat/sound-goals: short synthesised sounds that answer the person's own tap (DESIGN.md D-A11Y-04).

describe("SOUNDS (the agreed note table, Hao 24/10)", () => {
  it("has each kind's notes: note, start, length, velocity", () => {
    expect(SOUNDS).toEqual({
      add: [{ note: "G5", at: 0, length: 0.12, velocity: 1, pop: true }],
      remove: [
        { note: "E5", at: 0, length: 0.1, velocity: 0.8 },
        { note: "C5", at: 0.06, length: 0.16, velocity: 0.8 },
      ],
      undo: [
        { note: "C5", at: 0, length: 0.1, velocity: 0.8 },
        { note: "G5", at: 0.06, length: 0.14, velocity: 0.8 },
      ],
      save: [
        { note: "E5", at: 0, length: 0.18, velocity: 0.7 },
        { note: "A5", at: 0, length: 0.18, velocity: 0.6 },
      ],
      goal: [
        { note: "E5", at: 0, length: 0.3, velocity: 0.9 },
        { note: "B5", at: 0.09, length: 0.5, velocity: 0.9 },
      ],
      day: [
        { note: "C5", at: 0, length: 0.35, velocity: 0.8 },
        { note: "E5", at: 0.08, length: 0.35, velocity: 0.8 },
        { note: "G5", at: 0.16, length: 0.6, velocity: 0.9 },
      ],
      full: [
        { note: "C5", at: 0, length: 0.3, velocity: 0.7 },
        { note: "E5", at: 0.07, length: 0.3, velocity: 0.7 },
        { note: "G5", at: 0.14, length: 0.3, velocity: 0.7 },
        { note: "C6", at: 0.21, length: 0.5, velocity: 0.8 },
        { note: "E6", at: 0.3, length: 0.9, velocity: 0.7 },
      ],
    });
  });
  it("tunes every note it uses (equal temperament, A5 = 880 Hz)", () => {
    expect(NOTE_HZ).toEqual({ C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.51 });
    for (const notes of Object.values(SOUNDS)) for (const n of notes) expect(NOTE_HZ[n.note]).toBeGreaterThan(0);
  });
});

describe("soundWanted", () => {
  it("on by default, off when switched off, on when switched on", () => {
    expect(soundWanted(null, false)).toBe(true);
    expect(soundWanted(false, false)).toBe(false);
    expect(soundWanted(true, false)).toBe(true);
  });
  it("an iPhone without navigator.audioSession (would ignore the silent switch): off until switched on", () => {
    expect(soundWanted(null, true)).toBe(false);
    expect(soundWanted(true, true)).toBe(true);
  });
});

describe("iosWithoutAudioSession", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
  it("an old iPhone Safari with no audioSession: true", () => {
    expect(iosWithoutAudioSession({ userAgent: iphone, maxTouchPoints: 5 })).toBe(true);
  });
  it("an iPhone with audioSession, or any Android: false", () => {
    expect(iosWithoutAudioSession({ userAgent: iphone, maxTouchPoints: 5, audioSession: { type: "auto" } })).toBe(false);
    expect(iosWithoutAudioSession({ userAgent: android, maxTouchPoints: 5 })).toBe(false);
  });
});

describe("soundDue (at most one sound per 120 ms)", () => {
  it("the first sound, and one 120 ms or more after the last: due", () => {
    expect(SOUND_GAP_MS).toBe(120);
    expect(soundDue(null, 1000)).toBe(true);
    expect(soundDue(1000, 1120)).toBe(true);
  });
  it("closer than 120 ms: not due", () => {
    expect(soundDue(1000, 1119)).toBe(false);
  });
});

/** A Web Audio stand-in that records the nodes made and how the context was resumed. */
class FakeContext {
  static made = 0;
  state = "suspended";
  currentTime = 0;
  destination = {};
  oscillators: { frequency: number; started: number; stopped: number }[] = [];
  gains: FakeGain[] = [];
  constructor() {
    FakeContext.made += 1;
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect: () => undefined };
  }
  createOscillator() {
    const o = { frequency: 0, started: -1, stopped: -1 };
    this.oscillators.push(o);
    return {
      type: "",
      frequency: { setValueAtTime: (v: number) => void (o.frequency = v), exponentialRampToValueAtTime: () => undefined },
      connect: () => undefined,
      start: (t: number) => void (o.started = t),
      stop: (t: number) => void (o.stopped = t),
    };
  }
}
class FakeGain {
  connected = true;
  gain = { value: 1, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined, cancelScheduledValues: () => undefined, linearRampToValueAtTime: (v: number) => void (this.gain.value = v) };
  connect() {
    return undefined;
  }
  disconnect() {
    this.connected = false;
  }
}

describe("playSound (Web Audio, one context)", () => {
  let listeners: Record<string, (() => void)[]>;
  let doc: { hidden: boolean; addEventListener: (type: string, fn: () => void) => void };
  let now: number;
  const fire = (type: string) => listeners[type]?.forEach((fn) => fn());
  const context = () => (globalThis as unknown as { __ctx: FakeContext }).__ctx;

  beforeEach(() => {
    vi.resetModules();
    FakeContext.made = 0;
    listeners = {};
    now = 10_000;
    const on = (type: string, fn: () => void) => void (listeners[type] ??= []).push(fn);
    doc = { hidden: false, addEventListener: on };
    vi.stubGlobal("document", doc);
    vi.stubGlobal("navigator", { userAgent: "Android", maxTouchPoints: 5 });
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("window", {
      addEventListener: on,
      AudioContext: class extends FakeContext {
        constructor() {
          super();
          (globalThis as unknown as { __ctx: FakeContext }).__ctx = this;
        }
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes no context on load, nor before the first tap", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    playSound("add", null);
    expect(FakeContext.made).toBe(0);
  });

  it("the first pointerdown makes and resumes the one context; later taps never make another", async () => {
    const { armSound } = await import("../sound");
    armSound();
    armSound();
    fire("pointerdown");
    fire("pointerdown");
    expect(FakeContext.made).toBe(1);
    expect(context().state).toBe("running");
  });

  it("plays each note as a sine at f plus one at 3,98·f, the overtone 0,35 of the length", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    playSound("goal", null);
    const freqs = context().oscillators.map((o) => o.frequency);
    expect(freqs).toEqual([659.25, 659.25 * 3.98, 987.77, 987.77 * 3.98]);
    const [e5, e5over] = context().oscillators;
    expect(e5.stopped - e5.started).toBeCloseTo(0.3 + 0.02);
    expect(e5over.stopped - e5over.started).toBeCloseTo(0.3 * 0.35 + 0.02);
  });

  it("a pop starts its note at 1,5·f", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    playSound("add", null);
    expect(context().oscillators[0].frequency).toBeCloseTo(783.99 * 1.5);
  });

  it("switched off, or the page hidden: no node", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    playSound("add", false);
    doc.hidden = true;
    playSound("add", true);
    expect(context().oscillators).toHaveLength(0);
  });

  it("a second sound within 120 ms is dropped; after that it plays and stops the one still sounding", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    playSound("full", null);
    now += 50;
    playSound("add", null);
    expect(context().oscillators).toHaveLength(10);
    now += 120;
    playSound("add", null);
    expect(context().oscillators).toHaveLength(12);
    const [fullOut] = context().gains;
    expect(fullOut.gain.value).toBe(0);
  });

  it("an iOS context interrupted in the background is resumed when the app is visible again", async () => {
    const { armSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    context().state = "interrupted";
    fire("visibilitychange");
    expect(context().state).toBe("running");
  });

  it("a context that will not resume skips the sound silently", async () => {
    const { armSound, playSound } = await import("../sound");
    armSound();
    fire("pointerdown");
    context().resume = () => Promise.reject(new Error("no"));
    context().state = "suspended";
    expect(() => playSound("add", null)).not.toThrow();
    expect(context().oscillators).toHaveLength(0);
  });
});
