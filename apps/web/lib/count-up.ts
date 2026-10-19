"use client";

import { useEffect, useRef, useState } from "react";

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

/**
 * A number that counts from its old value to the new one in 300 ms. The first value shows at once; null (unknown,
 * drawn as "—") never counts, nor does a change from or to null; with reduced motion every change is instant.
 */
export function useCountUp(value: number | null): number | null {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (value === null || from === null || !shouldCount(from, value) || reducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const next = countAt(from, value, time - start);
      shownRef.current = next;
      setShown(next);
      if (!Object.is(next, value)) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}
