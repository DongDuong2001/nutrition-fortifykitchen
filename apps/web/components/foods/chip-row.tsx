"use client";

import React, { useEffect, useRef } from "react";

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
}

/**
 * One horizontal row of pill chips. Same colours and 44 px height as the ChipGroup md chips,
 * with a faded right edge that shows the row scrolls. The active chip is brought into view.
 */
export function ChipRow({ items, ariaLabel, "data-align-group": dataAlignGroup }: ChipRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
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
    <div data-align-group={dataAlignGroup} className="relative">
      <div
        ref={scrollerRef}
        role="group"
        aria-label={ariaLabel}
        className="relative flex gap-2 overflow-x-auto pr-8 scrollbar-none"
      >
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            data-chip-id={it.id}
            aria-pressed={!!it.active}
            aria-label={it.ariaLabel}
            onClick={it.onClick}
            className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold cursor-pointer border-0 transition-all active:scale-[0.97] ${
              it.active ? "bg-ink text-white font-bold shadow-xs" : "bg-page text-text font-medium hover:bg-divider"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10"
        style={{ background: "linear-gradient(to left, var(--color-card), transparent)" }}
      />
    </div>
  );
}
