"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const PresenceState = createContext<"open" | "closed">("open");

/** "closed" while the element is drawn only for its exit (inside <Presence>); "open" otherwise. */
export const usePresence = () => useContext(PresenceState);

/**
 * cc-55: the exit for things that unmount (toasts, tip cards, expanding rows). Wrap the conditional child:
 * `<Presence>{toast && <Toast … />}</Presence>`. When the child goes away, the last one stays drawn for `exitMs` with
 * usePresence() === "closed", so it can set data-state="closed" and play its m-* exit; then it unmounts. Shown again
 * meanwhile, the same element turns "open" and its transition reverses from where it is.
 */
export function Presence({ children, exitMs = 150 }: { children: React.ReactNode; exitMs?: number }) {
  const shown = children !== null && children !== undefined && children !== false;
  const last = useRef<React.ReactNode>(null);
  const [, setGone] = useState(0);
  if (shown) last.current = children;

  useEffect(() => {
    if (shown || last.current === null) return;
    const timer = setTimeout(() => {
      last.current = null;
      setGone((n) => n + 1);
    }, exitMs);
    return () => clearTimeout(timer);
  }, [shown, exitMs]);

  if (shown) return <PresenceState.Provider value="open">{children}</PresenceState.Provider>;
  if (last.current === null) return null;
  return <PresenceState.Provider value="closed">{last.current}</PresenceState.Provider>;
}
