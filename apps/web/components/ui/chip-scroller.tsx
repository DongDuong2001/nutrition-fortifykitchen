"use client";

import React, { useEffect, useRef, useState } from "react";

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
  /** The row sits in a sheet's glass header: it runs from edge to edge of the sheet (16 px padding, scrolls under the gutters) and has no fades. */
  sheet?: boolean;
}

/**
 * ChipGroup's `scroll` row (it used to be its own ChipRow): one row of pill chips. Same colours and 44 px height as the ChipGroup md chips.
 * On phone it scrolls sideways: a right fade always shows, and a left fade shows once the row is scrolled.
 * From 1024 px it wraps onto more lines, with no scrolling and no fades.
 * The active chip is brought into view.
 */
export function ChipScroller({ items, ariaLabel, "data-align-group": dataAlignGroup, "data-align-edge": dataAlignEdge, sheet = false }: ChipScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const activeId = items.find((it) => it.active)?.id;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeId) return;
    const chip = Array.from(scroller.children).find(
      (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.chipId === activeId,
    );
    if (!chip) return;
    scroller.scrollTo({ left: chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2 });
  }, [activeId]);

  return (
    <div data-align-group={dataAlignGroup} data-align-edge={dataAlignEdge} className="relative">
      <div
        ref={scrollerRef}
        role="group"
        aria-label={ariaLabel}
        onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
        className={`relative flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible ${
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
      {!sheet && (
      <>
      <div
        aria-hidden="true"
        data-fade="left"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 transition-opacity lg:hidden ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "linear-gradient(to right, var(--color-card), transparent)" }}
      />
      <div
        aria-hidden="true"
        data-fade="right"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 lg:hidden"
        style={{ background: "linear-gradient(to left, var(--color-card), transparent)" }}
      />
      </>
      )}
    </div>
  );
}
