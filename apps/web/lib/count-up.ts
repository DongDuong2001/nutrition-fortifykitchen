"use client";

import type React from "react";
import { useEffect, useRef } from "react";

/** cc-51: how long a number takes to count to its new value. */
export const COUNT_MS = 300;

/** The number shown `elapsed` ms into a count from `from` to `to`: ease-out, whole numbers, exactly `to` at the end. */
export function countAt(from: number, to: number, elapsed: number, ms: number = COUNT_MS): number {
  if (elapsed >= ms || !Number.isFinite(from) || !Number.isFinite(to)) return to;
  const t = Math.max(0, elapsed) / ms;
  const eased = 1 - (1 - t) ** 3;
  return Math.round(from + (to - from) * eased);
}

/**
 * Whether a change counts up. Object.is, not ===: NaN !== NaN would keep the frame loop going for ever, and a value
 * that is not a finite number (NaN, Infinity) has nothing to count to.
 */
export function shouldCount(from: number | null, to: number | null): boolean {
  if (from === null || to === null || Object.is(from, to)) return false;
  return Number.isFinite(from) && Number.isFinite(to);
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** An element whose text is counted, and how a number is written in it. */
export interface CountTarget {
  ref: React.RefObject<HTMLElement | null>;
  format: (value: number | null) => string;
}

/**
 * cc-64 (R1): the count without a React render per frame. The caller renders the final value as the element's text;
 * when `value` changes and `resetKey` (the day and the selection) did not, each target's text node is written for 300 ms
 * from the old number to the new one, through its nodeValue, so React keeps the same text node. A new day, a new
 * selection, the first value, null and reduced motion show the new number at once (what React rendered).
 */
export function useCountUpText(value: number | null, resetKey: string, targets: readonly CountTarget[]): void {
  const last = useRef<{ value: number | null; key: string } | null>(null);
  // The number on screen right now (mid-count it is between the old value and the new one)
  const onScreen = useRef<number | null>(null);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    const before = last.current;
    last.current = { value, key: resetKey };
    const from = onScreen.current ?? before?.value ?? null;
    onScreen.current = value;
    if (!before || before.key !== resetKey || value === null || from === null || !shouldCount(from, value) || reducedMotion()) return;
    const write = (n: number) => {
      onScreen.current = n;
      for (const t of targetsRef.current) {
        const node = t.ref.current?.firstChild;
        if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = t.format(n);
      }
    };
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const next = countAt(from, value, time - start);
      write(next);
      if (!Object.is(next, value)) frame = requestAnimationFrame(step);
    };
    write(from);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      // Leave the text as React rendered it (it may not render again), but remember where the count was, so a new count
      // starts from the number that was on screen
      const mid = onScreen.current;
      write(value);
      onScreen.current = mid;
    };
  }, [value, resetKey]);
}
