"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * The scrolling part of the Hôm nay nutrient column. Nothing is ever drawn over a row: no fade, no overlay, and the
 * "x/N đạt" verdict above it and the "Đủ 22 vi chất" link below it are not on it. When the rows do not fit, the area is
 * cut to end on the bottom of the last whole row (at the top of the list), so no row is half cut above the link; the
 * strip left over is empty space. Scrolling snaps to row tops (proximity), so a list at rest starts on a row.
 */
export function ColumnScroll({ fitKey, children }: { fitKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const scrollableRef = useRef(false);

  // cc-58: the cut is measured when the rows change (`fitKey`: the Level's groups, the row count, the picked food) and
  // when the column's box resizes, not after every render of the page
  const measure = useCallback((el: HTMLElement) => {
    fitToWholeRows(el);
    const next = el.scrollHeight > el.clientHeight + 1;
    if (next === scrollableRef.current) return;
    scrollableRef.current = next;
    setScrollable(next);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) measure(el);
  }, [fitKey, measure]);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const observer = new ResizeObserver(() => measure(el));
    // The column's own box, not the scroll area: cutting the area must not trigger another fit
    observer.observe(parent);
    // cc-61: the blocks around the area (the x/N đạt header wraps, and the web font loads after the first fit) and the
    // sections inside it re-fit when they change height; cutting the area changes neither, so this cannot loop
    for (const sibling of parent.children) if (sibling !== el) observer.observe(sibling);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [fitKey, measure]);

  return (
    <div
      ref={ref}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? "Danh sách vi chất" : undefined}
      className="flex min-h-0 flex-1 snap-y snap-proximity flex-col overflow-y-auto"
    >
      {children}
    </div>
  );
}

/** Cuts the area to the bottom of the last row that fits whole from the top of the list; no cut when all rows fit. */
function fitToWholeRows(el: HTMLElement): void {
  el.style.maxHeight = "";
  const room = el.clientHeight;
  if (el.scrollHeight <= room + 1) return;
  const top = el.getBoundingClientRect().top - el.scrollTop;
  let end = 0;
  for (const row of el.querySelectorAll<HTMLElement>("[data-snap-row]")) {
    const bottom = row.getBoundingClientRect().bottom - top;
    if (bottom <= room + 0.5) end = Math.max(end, bottom);
  }
  if (end > 0 && end < room) el.style.maxHeight = `${Math.floor(end)}px`;
}
