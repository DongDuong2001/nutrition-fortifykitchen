import { isLiveMode } from "./api-mode";

/**
 * Web vitals of real page views (live mode, 1 view in 5): LCP, INP and CLS, sent once per page view when the page is
 * hidden (switched away, closed or put in the background), as kind "vitals" on POST /api/v1/client-errors, which logs
 * them like the failure reports (no table). Read with the browser's own PerformanceObserver; no library.
 * components/vitals.tsx loads this module only for a sampled view, so most page loads never download it.
 */

export const VITALS_SAMPLE_RATE = 0.2;
export type VitalName = "LCP" | "INP" | "CLS";

export interface ShiftEntry {
  startTime: number;
  value: number;
  hadRecentInput: boolean;
}

/** CLS: the largest session window of layout shifts (shifts under 1 s apart, a window at most 5 s), input-led shifts left out. */
export function clsOf(shifts: readonly ShiftEntry[]): number {
  let worst = 0;
  let windowValue = 0;
  let windowStart = -Infinity;
  let last = -Infinity;
  for (const s of shifts) {
    if (s.hadRecentInput) continue;
    if (s.startTime - last >= 1000 || s.startTime - windowStart >= 5000) {
      windowValue = 0;
      windowStart = s.startTime;
    }
    windowValue += s.value;
    last = s.startTime;
    worst = Math.max(worst, windowValue);
  }
  return worst;
}

/** INP: the slowest interaction (the 98th percentile once there are 50 or more), by interaction id. 0 when there was none. */
export function inpOf(events: readonly { interactionId: number; duration: number }[]): number {
  const byInteraction = new Map<number, number>();
  for (const e of events) {
    if (!e.interactionId) continue;
    byInteraction.set(e.interactionId, Math.max(byInteraction.get(e.interactionId) ?? 0, e.duration));
  }
  const durations = [...byInteraction.values()].sort((a, b) => b - a);
  if (durations.length === 0) return 0;
  return durations[Math.min(durations.length - 1, Math.floor(durations.length / 50))];
}

/** Whether this page view is one of the sampled ones (`random` is Math.random()). */
export const sampled = (random: number): boolean => random < VITALS_SAMPLE_RATE;

/** The query string and hash are never sent. */
export const pageOf = (pathname: string): string => pathname.split(/[?#]/)[0];

let started = false;

/** Watches this page view and sends its LCP, INP and CLS once, when the page is hidden. Live mode only. */
export function startVitals(): void {
  if (started || !isLiveMode() || typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  started = true;
  const page = pageOf(window.location.pathname);
  let lcp = 0;
  const shifts: ShiftEntry[] = [];
  const events: { interactionId: number; duration: number }[] = [];
  const watch = (type: string, onEntries: (list: PerformanceEntryList) => void, extra: Record<string, unknown> = {}) => {
    try {
      new PerformanceObserver((list) => onEntries(list.getEntries())).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    } catch {
      // A browser without this entry type (Safari has no layout-shift or event timing): that vital is not sent
    }
  };
  watch("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcp = last.startTime;
  });
  watch("layout-shift", (entries) => shifts.push(...(entries as unknown as ShiftEntry[])));
  watch("event", (entries) => events.push(...(entries as unknown as { interactionId: number; duration: number }[])), { durationThreshold: 40 });

  let sent = false;
  const send = (closing: boolean) => {
    if (sent || (!closing && document.visibilityState !== "hidden")) return;
    sent = true;
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
    const values: Array<[VitalName, number]> = [
      ["LCP", lcp],
      ["INP", inpOf(events)],
      ["CLS", clsOf(shifts)],
    ];
    for (const [name, value] of values) {
      // A vital the browser never measured (no LCP entry, no interaction) is not sent as a 0
      if (name !== "CLS" && value <= 0) continue;
      try {
        void fetch(`${base}/client-errors`, {
          method: "POST",
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "vitals", name, page, value: Math.round(value * 1000) / 1000, version }),
        }).catch(() => {});
      } catch {
        // Reporting must never break the app
      }
    }
  };
  document.addEventListener("visibilitychange", () => send(false));
  window.addEventListener("pagehide", () => send(true));
}
