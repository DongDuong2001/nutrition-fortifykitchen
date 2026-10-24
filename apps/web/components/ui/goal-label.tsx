"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** m-goal-label runs 80 ms + 200 ms; a copy that is not displayed (the other width of a screen) never ends its animation, so a timer takes the class off. */
const SETTLE_MS = 600;

/**
 * feat/sound-goals: a goal moment's label (a check and the words), or the usual one gliding back. It glides in once (m-goal-label:
 * 80 ms out, 200 ms in; a 120 ms fade under reduced motion) and the class is gone when it ends. Key it per run so each starts afresh.
 */
export function GoalLabel({ children, plain = false }: { children: ReactNode; plain?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.classList.remove("m-goal-label"), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span ref={ref} className={`m-goal-label ${plain ? "" : "inline-flex items-center gap-1"}`} onAnimationEnd={(e) => e.currentTarget.classList.remove("m-goal-label")}>
      {children}
    </span>
  );
}

/** The check before a moment's words. */
export function GoalCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
