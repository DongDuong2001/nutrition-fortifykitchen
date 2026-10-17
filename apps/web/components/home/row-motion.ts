"use client";

import { useLayoutEffect, useReducer, useRef } from "react";
import type { HomeEntry, HomeMeal } from "@/lib/home";

const EXIT_MS = 200;

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
 * moved to another meal slides from where it was (FLIP). Nothing moves on the first draw or when `dayKey` changes.
 */
export function useRowMotion(meals: HomeMeal[], dayKey: string) {
  const listRef = useRef<HTMLDivElement>(null);
  const drawn = useRef<Drawn | null>(null);
  const exiting = useRef(new Map<string, { entry: HomeEntry; slot: HomeMeal["slot"]; index: number; timed: boolean }>());
  const boxes = useRef(new Map<string, { x: number; y: number }>());
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const prev = drawn.current?.day === dayKey ? drawn.current : null;
  const slotOf = new Map(meals.flatMap((m) => m.entries.map((e) => [e.id, m.slot] as const)));
  if (!prev) exiting.current.clear();
  else {
    for (const [slot, entries] of prev.order) {
      entries.forEach((entry, index) => {
        if (!slotOf.has(entry.id) && !exiting.current.has(entry.id)) exiting.current.set(entry.id, { entry, slot, index, timed: false });
      });
    }
  }
  for (const id of [...exiting.current.keys()]) if (slotOf.has(id)) exiting.current.delete(id);

  const rowsOf = (meal: HomeMeal): MotionRow[] => {
    const rows: MotionRow[] = meal.entries.map((entry) => ({ entry, state: prev && !prev.slotOf.has(entry.id) ? "enter" : "stay" }));
    for (const row of exiting.current.values()) {
      if (row.slot === meal.slot) rows.splice(Math.min(row.index, rows.length), 0, { entry: row.entry, state: "exit" });
    }
    return rows;
  };

  useLayoutEffect(() => {
    const before = drawn.current?.day === dayKey ? drawn.current : null;
    drawn.current = { day: dayKey, slotOf, order: new Map(meals.map((m) => [m.slot, m.entries])) };
    const list = listRef.current;
    if (!list) return;
    const origin = list.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    list.querySelectorAll<HTMLElement>("[data-entry-id]").forEach((el) => {
      const id = el.dataset.entryId ?? "";
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - origin.left, y: r.top - origin.top + list.scrollTop };
      next.set(id, pos);
      const old = boxes.current.get(id);
      const moved = before?.slotOf.has(id) && before.slotOf.get(id) !== slotOf.get(id);
      if (moved && old && !el.closest("[data-exiting]")) {
        el.classList.remove("m-flip");
        el.style.transform = `translate(${old.x - pos.x}px, ${old.y - pos.y}px)`;
        requestAnimationFrame(() => {
          el.classList.add("m-flip");
          el.style.transform = "";
        });
      }
    });
    boxes.current = next;
    // Rows just deleted: close their height on the next frame, and drop them when the animation is over
    const leaving = list.querySelectorAll<HTMLElement>("[data-exiting]:not(.m-collapsed)");
    if (leaving.length > 0) requestAnimationFrame(() => leaving.forEach((el) => el.classList.add("m-collapsed")));
    // Each leaving row is dropped by its own timer (no clock comparison: Date.now can be frozen)
    for (const [id, row] of exiting.current) {
      if (row.timed) continue;
      row.timed = true;
      setTimeout(() => {
        exiting.current.delete(id);
        rerender();
      }, EXIT_MS + 16);
    }
  });

  return { listRef, rowsOf };
}
