"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { haptic } from "@/lib/haptics";
import { markUsed } from "@/lib/onboarding-store";

/** Pull this far and let go: the day is read again. */
export const PULL_TRIGGER_PX = 64;
/** cc-62 (S4): the pull follows the finger with rubber-band resistance and never passes this. */
const PULL_RANGE_PX = 120;
/** The finger must move this far, more down than sideways, before it pulls (a sideways swipe or a tap never does). */
export const PULL_SLOP_PX = 8;

/** How far the indicator is pulled for `dy` px of finger travel: 120 · (1 − e^(−dy/120)), 0 for an upward move. */
export function pullOffset(dy: number): number {
  return dy <= 0 ? 0 : PULL_RANGE_PX * (1 - Math.exp(-dy / PULL_RANGE_PX));
}

/** Whether a touch that moved (dx, dy) from where it started is a pull: past the slop, downward, more down than across. */
export function startsPull(dx: number, dy: number): boolean {
  return dy >= PULL_SLOP_PX && Math.abs(dy) > Math.abs(dx);
}
/** Where the indicator waits above the list, and where it sits while the day is read. */
const REST_PX = -40;

/**
 * cc-51: pull to refresh on Hôm nay. A touch that starts at the top of the scrolled list and moves down draws the
 * indicator; let go past 64 px and `onRefresh` runs (the cc-49 refetch) while it spins. The list sets
 * overscroll-behavior-y: contain, so the browser's own pull and bounce stay out of it. Off when `enabled` is false.
 * cc-57: the indicator follows the finger through refs (style.transform, no setState), so a drag re-renders nothing;
 * only "refreshing" is state. While the finger is down it has no transition (data-dragging, like a sheet).
 */
export function usePullRefresh(listRef: RefObject<HTMLElement | null>, onRefresh: (() => Promise<void>) | undefined, enabled: boolean) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ x: number; y: number; pulling: boolean; armed: boolean } | null>(null);
  const pullRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const list = listRef.current;
    if (!list || !enabled || !onRefresh) return;
    const paint = (px: number) => {
      const el = indicatorRef.current;
      if (!el) return;
      if (px > 0) {
        el.setAttribute("data-dragging", "");
        el.style.transform = `translateY(${px + REST_PX}px)`;
        el.style.opacity = "1";
      } else {
        // Let go: the inline values go, and the indicator eases back to its place above the list
        el.removeAttribute("data-dragging");
        el.style.transform = "";
        el.style.opacity = "";
      }
      if (arrowRef.current) arrowRef.current.style.transform = `rotate(${px >= PULL_TRIGGER_PX ? 180 : 0}deg)`;
    };
    const down = (e: TouchEvent) => {
      start.current = list.scrollTop <= 0 && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, pulling: false, armed: false } : null;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      // cc-70: a food held for a drag is the list's finger now; it must not pull the day
      if (list.hasAttribute("data-touch-dragging")) {
        start.current = null;
        pullRef.current = 0;
        paint(0);
        return;
      }
      const s = start.current;
      const dx = e.touches[0].clientX - s.x;
      const dy = e.touches[0].clientY - s.y;
      if (!s.pulling) {
        // Not decided yet: wait for the slop; a move up or sideways leaves the touch to the list
        if (Math.abs(dx) < PULL_SLOP_PX && Math.abs(dy) < PULL_SLOP_PX) return;
        if (!startsPull(dx, dy)) {
          start.current = null;
          return;
        }
        s.pulling = true;
      }
      if (dy <= 0) {
        pullRef.current = 0;
        paint(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      pullRef.current = pullOffset(dy);
      // One tick each way across the threshold, so the finger feels where a release would refresh
      const armed = pullRef.current >= PULL_TRIGGER_PX;
      if (armed !== s.armed) {
        s.armed = armed;
        haptic("tick");
      }
      paint(pullRef.current);
    };
    const up = () => {
      if (start.current === null) return;
      start.current = null;
      const pulled = pullRef.current;
      pullRef.current = 0;
      paint(0);
      if (pulled < PULL_TRIGGER_PX || !refreshRef.current) return;
      setRefreshing(true);
      markUsed("pull-refresh");
      refreshRef.current().finally(() => setRefreshing(false));
    };
    list.addEventListener("touchstart", down, { passive: true });
    list.addEventListener("touchmove", move, { passive: false });
    list.addEventListener("touchend", up);
    list.addEventListener("touchcancel", up);
    return () => {
      list.removeEventListener("touchstart", down);
      list.removeEventListener("touchmove", move);
      list.removeEventListener("touchend", up);
      list.removeEventListener("touchcancel", up);
    };
  }, [listRef, enabled, onRefresh]);

  return { indicatorRef, arrowRef, refreshing };
}

/** The circle at the top of the list: an arrow that turns when a release would refresh, then a spinner. */
export function PullIndicator({
  indicatorRef,
  arrowRef,
  refreshing,
}: {
  indicatorRef: RefObject<HTMLDivElement | null>;
  arrowRef: RefObject<SVGSVGElement | null>;
  refreshing: boolean;
}) {
  return (
    <div className="pointer-events-none sticky top-0 z-10 h-0">
      <div
        ref={indicatorRef}
        aria-hidden="true"
        className="m-pull mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-card text-blue shadow-card"
        style={refreshing ? { transform: "translateY(12px)", opacity: 1 } : undefined}
      >
        {refreshing ? (
          <span className="m-spin block h-4 w-4 rounded-full border-2 border-blue border-t-transparent" />
        ) : (
          <svg ref={arrowRef} className="m-pull-arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {/* Not a role=status: the toast is the app's one status region */}
      <span className="sr-only" aria-live="polite">
        {refreshing ? "Đang tải lại…" : ""}
      </span>
    </div>
  );
}
