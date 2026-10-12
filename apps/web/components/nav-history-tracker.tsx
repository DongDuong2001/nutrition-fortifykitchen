"use client";

import { useTrackHistory } from "@/hooks/use-back";

/** Renders nothing. Keeps the in-app history that the back button of pushed screens reads. */
export function NavHistoryTracker() {
  useTrackHistory();
  return null;
}
