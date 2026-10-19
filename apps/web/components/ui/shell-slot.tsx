"use client";

import { createContext, useContext, useLayoutEffect } from "react";

// cc-57: the bar slot of the tabs' shared frame (TabsShell in app-shell.tsx). A page that needs it (Hôm nay's select
// mode) asks with useShellBottomBar and portals into the host element it gets back. This file is small on purpose: the
// page imports it, not app-shell.tsx, so the shell is in one chunk (the tabs layout) and not copied into the page's.
export interface ShellSlot {
  setBarActive: (active: boolean) => void;
  barHost: HTMLElement | null;
}
export const ShellSlotContext = createContext<ShellSlot | null>(null);

/** Takes the bottom nav's place while `active` (Hôm nay's select mode). Returns the element to portal the bar into. */
export function useShellBottomBar(active: boolean): HTMLElement | null {
  const slot = useContext(ShellSlotContext);
  const setBarActive = slot?.setBarActive;
  useLayoutEffect(() => {
    if (!setBarActive || !active) return;
    setBarActive(true);
    return () => setBarActive(false);
  }, [setBarActive, active]);
  return active ? (slot?.barHost ?? null) : null;
}
