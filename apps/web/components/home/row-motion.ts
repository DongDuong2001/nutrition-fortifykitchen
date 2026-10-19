"use client";

import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import type { HomeEntry, HomeMeal } from "@/lib/home";

const EXIT_MS = 200;
/** A row moved to another meal slides there in this long (globals.css --m-row). */
const FLIP_MS = 200;

export interface MotionRow {
  entry: HomeEntry;
  /** "enter": just arrived (added, or put back by Hoàn tác); "exit": deleted, fading while its height closes. */
  state: "enter" | "exit" | "stay";
}

interface Drawn {
  day: string;
  slotOf: Map<string, HomeMeal["slot"]>;
  order: Map<HomeMeal["slot"], HomeEntry[]>;
}

/**
 * cc-51: motion of the Hôm nay food rows (globals.css .m-row-enter, .m-row-exit, .m-flip). A row that arrives rises in;
 * a deleted row stays in its place for 200 ms while it fades and its height closes, so the rows below glide up; a row
 * moved to another meal slides from where it was (FLIP, played with the Web Animations API). Nothing moves on the first draw or when `dayKey` changes.
 */
export function useRowMotion(meals: HomeMeal[], dayKey: string) {
  const listRef = useRef<HTMLDivElement>(null);
  const drawn = useRef<Drawn | null>(null);
  const exiting = useRef(new Map<string, { entry: HomeEntry; slot: HomeMeal["slot"]; index: number; timed: boolean; timer?: ReturnType<typeof setTimeout> }>());
  const boxes = useRef(new Map<string, { x: number; y: number }>());
  const [tick, rerender] = useReducer((n: number) => n + 1, 0);

  const prev = drawn.current?.day === dayKey ? drawn.current : null;
  const slotOf = new Map(meals.flatMap((m) => m.entries.map((e) => [e.id, m.slot] as const)));
  if (!prev) {
    for (const row of exiting.current.values()) clearTimeout(row.timer);
    exiting.current.clear();
  } else {
    for (const [slot, entries] of prev.order) {
      entries.forEach((entry, index) => {
        if (!slotOf.has(entry.id) && !exiting.current.has(entry.id)) exiting.current.set(entry.id, { entry, slot, index, timed: false });
      });
    }
  }
  // A row put back by Hoàn tác stops leaving: its timer goes too, or it would cut short a second delete of the same row
  for (const [id, row] of [...exiting.current]) {
    if (!slotOf.has(id)) continue;
    clearTimeout(row.timer);
    exiting.current.delete(id);
  }

  const rowsOf = (meal: HomeMeal): MotionRow[] => {
    const rows: MotionRow[] = meal.entries.map((entry) => ({ entry, state: prev && !prev.slotOf.has(entry.id) ? "enter" : "stay" }));
    for (const row of exiting.current.values()) {
      if (row.slot === meal.slot) rows.splice(Math.min(row.index, rows.length), 0, { entry: row.entry, state: "exit" });
    }
    return rows;
  };

  // Runs when the rows change (or a leaving row is dropped), not on every render of the list. All reads first, then the writes.
  useLayoutEffect(() => {
    const before = drawn.current?.day === dayKey ? drawn.current : null;
    drawn.current = { day: dayKey, slotOf, order: new Map(meals.map((m) => [m.slot, m.entries])) };
    const list = listRef.current;
    if (!list) return;
    const origin = list.getBoundingClientRect();
    const scrollTop = list.scrollTop;
    const next = new Map<string, { x: number; y: number }>();
    const flips: { el: HTMLElement; dx: number; dy: number }[] = [];
    list.querySelectorAll<HTMLElement>("[data-entry-id]").forEach((el) => {
      const id = el.dataset.entryId ?? "";
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - origin.left, y: r.top - origin.top + scrollTop };
      next.set(id, pos);
      const old = boxes.current.get(id);
      const moved = before?.slotOf.has(id) && before.slotOf.get(id) !== slotOf.get(id);
      if (moved && old && !el.closest("[data-exiting]")) flips.push({ el, dx: old.x - pos.x, dy: old.y - pos.y });
    });
    // cc-64 (P1): the browser never painted the inverted transform when it was set and cleared in one frame, so a moved
    // row snapped. WAAPI plays it from the inverted place to its own, on the compositor; reduced motion: no slide
    if (flips.length > 0 && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-in-out").trim() || "cubic-bezier(0.77, 0, 0.175, 1)";
      for (const { el, dx, dy } of flips) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: FLIP_MS, easing });
      }
    }
    boxes.current = next;
    // Rows just deleted: close their height on the next frame, and drop them when the animation is over
    const leaving = list.querySelectorAll<HTMLElement>("[data-exiting]:not(.m-collapsed)");
    if (leaving.length > 0) requestAnimationFrame(() => leaving.forEach((el) => el.classList.add("m-collapsed")));
    // Each leaving row is dropped by its own timer (no clock comparison: Date.now can be frozen)
    for (const [id, row] of exiting.current) {
      if (row.timed) continue;
      row.timed = true;
      row.timer = setTimeout(() => {
        exiting.current.delete(id);
        rerender();
      }, EXIT_MS + 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotOf is derived from meals
  }, [meals, dayKey, tick]);

  useEffect(
    () => () => {
      for (const row of exiting.current.values()) clearTimeout(row.timer);
    },
    []
  );

  return { listRef, rowsOf };
}
