import { demoBuildAllowed } from "./demo";
import { isIosDevice } from "./pwa";

/**
 * feat/sound-goals (Hao 24/10): short synthesised sounds, no files. Each answers the person's own tap (DESIGN.md D-A11Y-04): an
 * add, a delete, an undo, a save, a goal reached. Never for errors, scrolling, typing, a tab switch, a sheet opening or anything
 * the app does by itself. lib/cue plays them with their haptic; nothing else calls playSound.
 *
 * iOS: one AudioContext, made and resumed on the first user activation (a chime that plays after the + sheet closes still sounds),
 * resumed again when the app comes back from the background. `navigator.audioSession.type = "ambient"` follows the Ring/Silent
 * switch and mixes with the person's music; an iPhone without that API would ignore the switch, so sound is off there by default.
 */
export type SoundKind = "add" | "remove" | "undo" | "save" | "goal" | "day" | "full";

export const NOTE_HZ = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.51 } as const;

export interface Note {
  note: keyof typeof NOTE_HZ;
  /** Start, seconds after the sound begins */
  at: number;
  /** Length in seconds */
  length: number;
  velocity: number;
  /** Starts at 1,5·f and falls to f in 30 ms */
  pop?: true;
}

export const SOUNDS: Readonly<Record<SoundKind, readonly Note[]>> = {
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
};

export const SOUND_GAP_MS = 120;
/** A sound whose context was not running plays only if resume() settles this soon after the call; later it is out of step with its tap. */
export const RESUME_WAIT_MS = 100;
/** A touch pointerdown is not a user activation (HTML spec; touch counts at pointerup / touchend); keydown covers Esc and Enter. */
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
// The mockup's synth (design/sound-goals, cue()): an overtone at 3,98·f, 0,18 as loud, 0,35 of the note's length
const OVERTONE = { mul: 3.98, gain: 0.18, length: 0.35 };
const MASTER_GAIN = 0.22;
const LOW_PASS_HZ = 6000;

/** "Âm thanh": on unless switched off; an iPhone without navigator.audioSession stays off until it is switched on. */
export function soundWanted(setting: boolean | null, iosWithoutAudioSession: boolean): boolean {
  return setting ?? !iosWithoutAudioSession;
}

type AudioNavigator = { userAgent: string; maxTouchPoints?: number; audioSession?: { type: string } };

/** An iPhone or iPad whose Safari has no audioSession (before 17): Web Audio would play through the silent switch. */
export function iosWithoutAudioSession(nav: AudioNavigator): boolean {
  return isIosDevice(nav.userAgent, nav.maxTouchPoints ?? 0) && !nav.audioSession;
}

/** At most one sound per 120 ms. */
export function soundDue(lastAt: number | null, now: number): boolean {
  return lastAt === null || now - lastAt >= SOUND_GAP_MS;
}

let ctx: AudioContext | null = null;
let current: GainNode | null = null;
let lastAt: number | null = null;
let armed = false;

function resume(c: AudioContext): Promise<void> {
  return c.state === "running" ? Promise.resolve() : c.resume();
}

function unlock(): void {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const session = (navigator as AudioNavigator).audioSession;
    if (session) session.type = "ambient";
    try {
      ctx = new AC();
    } catch {
      return;
    }
  }
  resume(ctx).catch(() => undefined);
}

/** Once, at start-up: the first tap or key anywhere makes the context and each one resumes it until it runs; coming back from the background resumes it too. */
export function armSound(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ctx) resume(ctx).catch(() => undefined);
  });
}

function build(c: AudioContext, kind: SoundKind): void {
  const t0 = c.currentTime + 0.01;
  // A new sound stops the one still playing, so nothing stacks
  if (current) {
    current.gain.cancelScheduledValues(t0);
    current.gain.setValueAtTime(current.gain.value, t0);
    current.gain.linearRampToValueAtTime(0, t0 + 0.01);
  }
  const out = c.createGain();
  out.gain.value = MASTER_GAIN;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = LOW_PASS_HZ;
  out.connect(lp);
  lp.connect(c.destination);
  current = out;
  for (const { note, at, length, velocity, pop } of SOUNDS[kind]) {
    const t = t0 + at;
    for (const [mul, amp, len] of [[1, 1, length], [OVERTONE.mul, OVERTONE.gain, length * OVERTONE.length]]) {
      const f = NOTE_HZ[note] * mul;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(pop ? f * 1.5 : f, t);
      if (pop) o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(velocity * amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + len + 0.02);
    }
  }
  // The probes cannot hear: a demo build counts the sounds that made nodes
  if (demoBuildAllowed(process.env.NODE_ENV, process.env.NEXT_PUBLIC_DEMO_BUILD)) {
    const w = window as unknown as { __h1tSoundCount?: number };
    w.__h1tSoundCount = (w.__h1tSoundCount ?? 0) + 1;
  }
}

/** Plays `kind` when the switch allows it, the page is visible and the first tap made the context. Never throws. */
export function playSound(kind: SoundKind, setting: boolean | null): void {
  const c = ctx;
  if (!c || typeof document === "undefined" || document.hidden) return;
  if (!soundWanted(setting, iosWithoutAudioSession(navigator as AudioNavigator))) return;
  const now = performance.now();
  if (!soundDue(lastAt, now)) return;
  lastAt = now;
  const play = () => {
    try {
      build(c, kind);
    } catch {
      // A closed context: no sound
    }
  };
  if (c.state === "running") return play();
  // An iOS context goes "interrupted" after a call or the lock screen: resume it, and skip the sound if it will not or is late
  let late = false;
  const timer = setTimeout(() => void (late = true), RESUME_WAIT_MS);
  c.resume().then(
    () => {
      clearTimeout(timer);
      if (!late) play();
    },
    () => clearTimeout(timer)
  );
}
