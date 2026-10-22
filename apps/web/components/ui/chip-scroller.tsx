"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export interface ChipScrollerItem {
  id: string;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** A 20 px IconTile before the label (V3 filter chips): the chip gets 12 px before it, 8 between. */
  icon?: React.ReactNode;
}

export interface ChipScrollerProps {
  items: ChipScrollerItem[];
  ariaLabel: string;
  "data-align-group"?: string;
  "data-align-edge"?: string;
  /** The row sits in a sheet's glass header: it runs from edge to edge of the sheet (16 px padding, scrolls under the gutters), with the same fades. */
  sheet?: boolean;
}

/**
 * ChipGroup's `scroll` row (it used to be its own ChipRow): one row of pill chips. Same colours and 44 px height as the ChipGroup md chips.
 * On phone it scrolls sideways. The fades are a mask on the row itself (24 px each side), so they fade into whatever is behind it (the
 * page, a card, a tab's colour wash): the right one shows only while there is more to the right, the left one once the row is scrolled,
 * and a row that does not overflow has none. From 1024 px it wraps onto more lines, with no scrolling and no fades.
 * The active chip is brought into view.
 */
export function ChipScroller({ items, ariaLabel, "data-align-group": dataAlignGroup, "data-align-edge": dataAlignEdge, sheet = false }: ChipScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Which edges have more row behind them (only the phone's one-line row scrolls; the page's row and the sheet header's alike)
  const [edges, setEdges] = useState({ left: false, right: false });
  const activeId = items.find((it) => it.active)?.id;

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const left = scroller.scrollLeft > 0;
    const right = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // Measured on mount, on resize of the row or of its chips (a label that loads late, a larger text size) and after each scroll
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    for (const child of Array.from(scroller.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeId) return;
    const chip = Array.from(scroller.children).find(
      (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.chipId === activeId,
    );
    if (!chip) return;
    // Only a chip that is cut off or out of view is brought in: one that is fully on screen stays where it is (the row never shifts under a tap)
    const left = chip.offsetLeft - scroller.scrollLeft;
    if (left >= 0 && left + chip.offsetWidth <= scroller.clientWidth) return;
    scroller.scrollTo({ left: chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2 });
  }, [activeId]);

  // The mask of the row (only its alpha counts, so currentColor is the opaque stop): opaque in the middle, 24 px of fade at each edge that has more behind it; none when nothing overflows
  const mask = !edges.left && !edges.right
    ? "none"
    : `linear-gradient(to right, ${edges.left ? "transparent 0, currentColor 24px" : "currentColor 0"}, ${edges.right ? "currentColor calc(100% - 24px), transparent 100%" : "currentColor 100%"})`;

  return (
    <div data-align-group={dataAlignGroup} data-align-edge={dataAlignEdge} className="relative">
      <div
        ref={scrollerRef}
        role="group"
        aria-label={ariaLabel}
        onScroll={measure}
        data-fade-edges={`${edges.left ? "left" : ""}${edges.left && edges.right ? " " : ""}${edges.right ? "right" : ""}` || "none"}
        style={{ "--chip-mask": mask } as React.CSSProperties}
        className={`relative flex flex-nowrap gap-2 overflow-x-auto scrollbar-none [-webkit-mask-image:var(--chip-mask)] [mask-image:var(--chip-mask)] lg:flex-wrap lg:overflow-visible lg:[-webkit-mask-image:none] lg:[mask-image:none] ${
          sheet ? "-mx-4 scroll-px-4 px-4 lg:mx-0 lg:px-0" : "pr-8 lg:pr-0"
        }`}
      >
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            data-chip-id={it.id}
            aria-pressed={it.onClick ? !!it.active : undefined}
            aria-current={!it.onClick && it.active ? "true" : undefined}
            aria-label={it.ariaLabel}
            onClick={it.onClick}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full text-xs font-semibold cursor-pointer border-0 transition-press active:scale-[0.97] ${
              it.icon ? "flex items-center gap-2 pl-3 pr-4 text-cap" : "px-4"
            } ${
              it.active ? "bg-ink text-on-dark font-bold shadow-xs" : "bg-surface text-text font-normal hover:bg-divider"
            }`}
          >
            {it.icon}
            {it.icon ? <span>{it.label}</span> : it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
