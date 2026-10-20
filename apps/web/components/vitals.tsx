"use client";

import { useEffect } from "react";
import { isLiveMode } from "@/lib/api-mode";

/** Live mode: one page view in five loads lib/vitals and reports its LCP, INP and CLS (the rest download nothing). */
export function Vitals() {
  useEffect(() => {
    if (!isLiveMode()) return;
    // The rate is lib/vitals' VITALS_SAMPLE_RATE (0.2), written here so the module is not loaded to read it
    if (Math.random() >= 0.2) return;
    void import("@/lib/vitals").then((m) => m.startVitals());
  }, []);
  return null;
}
