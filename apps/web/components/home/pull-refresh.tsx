"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { markUsed } from "@/lib/onboarding-store";

/** Pull this far (after the 0.5 resistance) and let go: the day is read again. */
const PULL_TRIGGER_PX = 64;
const PULL_MAX_PX = 96;

/**
 * cc-51: pull to refresh on Hôm nay. A touch that starts at the top of the scrolled list and moves down draws the
 * indicator; let go past 64 px and `onRefresh` runs (the cc-49 refetch) while it spins. The list sets
 * overscroll-behavior-y: contain, so the browser's own pull and bounce stay out of it. Off when `enabled` is false.
 */
export function usePullRefresh(listRef: RefObject<HTMLElement | null>, onRefresh: (() => Promise<void>) | undefined, enabled: boolean) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const list = listRef.current;
    if (!list || !enabled || !onRefresh) return;
    const down = (e: TouchEvent) => {
      start.current = list.scrollTop <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = (e.touches[0].clientY - start.current) * 0.5;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      pullRef.current = Math.min(PULL_MAX_PX, dy);
      setPull(pullRef.current);
    };
    const up = () => {
      if (start.current === null) return;
      start.current = null;
      const pulled = pullRef.current;
      pullRef.current = 0;
      setPull(0);
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

  return { pull, refreshing, ready: pull >= PULL_TRIGGER_PX };
}

/** The circle at the top of the list: an arrow that turns when a release would refresh, then a spinner. */
export function PullIndicator({ pull, refreshing, ready }: { pull: number; refreshing: boolean; ready: boolean }) {
  const shown = refreshing || pull > 0;
  return (
    <div className="pointer-events-none sticky top-0 z-10 h-0">
      <div
        aria-hidden="true"
        className="m-pull mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-card text-blue shadow-card"
        style={{ transform: `translateY(${refreshing ? 12 : pull - 40}px)`, opacity: shown ? 1 : 0 }}
      >
        {refreshing ? (
          <span className="m-spin block h-4 w-4 rounded-full border-2 border-blue border-t-transparent" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: `rotate(${ready ? 180 : 0}deg)`, transition: "transform 150ms ease-out" }}>
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
