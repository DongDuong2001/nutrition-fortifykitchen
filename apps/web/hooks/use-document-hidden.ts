"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/** True while the page is hidden (the tab or the app is in the background). False on the server and before mount. */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "hidden",
    () => false
  );
}
