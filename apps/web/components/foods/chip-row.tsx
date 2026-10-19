"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ChipRowItem {
  id: string;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface ChipRowProps {
  items: ChipRowItem[];
  ariaLabel: string;
  "data-align-group"?: string;
  "data-align-edge"?: string;
}

/**
 * One row of pill chips. Same colours and 44 px height as the ChipGroup md chips.
 * On phone it scrolls sideways: a right fade always shows, and a left fade shows once the row is scrolled.
 * From 1024 px it wraps onto more lines, with no scrolling and no fades.
 * The active chip is brought into view.
 */
export function ChipRow({ items, ariaLabel, "data-align-group": dataAlignGroup, "data-align-edge": dataAlignEdge }: ChipRowProps) {
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
        className="relative flex flex-nowrap gap-2 overflow-x-auto pr-8 scrollbar-none lg:flex-wrap lg:overflow-visible lg:pr-0"
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
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold cursor-pointer border-0 transition-press active:scale-[0.97] ${
              it.active ? "bg-ink text-on-dark font-bold shadow-xs" : "bg-surface text-text font-medium hover:bg-divider"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
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
    </div>
  );
}
