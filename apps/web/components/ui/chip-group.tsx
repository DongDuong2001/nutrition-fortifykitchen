import React from "react";
import { ChipScroller } from "@/components/ui/chip-scroller";

export interface ChipGroupItem {
  id: string;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** Read-only chip: not pressable, dimmed (a past day) */
  disabled?: boolean;
}

export interface ChipGroupProps {
  items?: ChipGroupItem[];
  leadingInput?: React.ReactNode;
  columns?: number;
  /** Columns from 1024 px up. Defaults to `columns`. */
  columnsLg?: number;
  className?: string;
  tone?: "light" | "dark";
  size?: "md" | "lg";
  "data-align-group"?: string;
  /** One row that scrolls sideways on phones and wraps from 1024 px (the food filters); needs ariaLabel */
  scroll?: boolean;
  ariaLabel?: string;
  "data-align-edge"?: string;
  /** A tab switch (one choice changes what the screen lists): role tablist / tab and aria-selected, not aria-pressed; needs ariaLabel */
  tabs?: boolean;
}

/**
 * ChipGroup: N equal columns, full width, aria-pressed (aria-selected as tabs), optional leading input cell.
 * size "md" (default): 44 px items, text-xs. size "lg": 52 px items, text-base, same height as the inputs.
 */
export function ChipGroup({
  items = [],
  leadingInput,
  columns,
  columnsLg,
  className = "",
  tone = "light",
  size = "md",
  "data-align-group": dataAlignGroup,
  scroll = false,
  ariaLabel = "",
  "data-align-edge": dataAlignEdge,
  tabs = false,
}: ChipGroupProps) {
  if (scroll) return <ChipScroller items={items} ariaLabel={ariaLabel} data-align-group={dataAlignGroup} data-align-edge={dataAlignEdge} />;
  const totalCount = (leadingInput ? 1 : 0) + items.length;
  const colCount = columns || (totalCount > 0 ? totalCount : 4);
  const colCountLg = columnsLg || colCount;

  const sizeClass =
    size === "lg" ? "h-[52px] rounded-full text-base" : "min-h-11 rounded-full text-xs";

  return (
    <div
      data-align-group={dataAlignGroup}
      role={tabs ? "tablist" : undefined}
      aria-label={tabs ? ariaLabel : undefined}
      style={{ "--chip-cols": colCount, "--chip-cols-lg": colCountLg } as React.CSSProperties}
      className={`grid grid-cols-[repeat(var(--chip-cols),minmax(0,1fr))] lg:grid-cols-[repeat(var(--chip-cols-lg),minmax(0,1fr))] gap-2 w-full ${className}`}
    >
      {leadingInput && (
        <div className="flex items-center min-h-11 w-full">
          {leadingInput}
        </div>
      )}
      {items.map((it) => {
        const isActive = !!it.active;
        // cc-66 (D10): a ring, never a border, so a chip keeps its size when it is picked (no 2 px jump). lg matches the
        // 52 px inputs with a 2 px grabber ring; md the 1 px chip ring. A picked chip has none (its fill is enough).
        const inactiveRing = size === "lg" ? "shadow-[inset_0_0_0_2px_var(--color-grabber)]" : "shadow-chip";
        const btnClasses =
          tone === "dark"
            ? isActive
              ? "bg-card text-ink font-bold shadow-xs"
              : "shadow-[inset_0_0_0_1px_var(--color-track-on-dark)] bg-transparent text-on-dark font-medium hover:bg-surface-dark"
            : isActive
            ? "bg-ink text-on-dark font-bold shadow-xs"
            : `bg-surface text-text ${inactiveRing} font-medium hover:bg-paper-dark`;
        const noBorder = "border-0";

        return (
          <button
            key={it.id}
            type="button"
            role={tabs ? "tab" : undefined}
            aria-pressed={tabs ? undefined : isActive}
            aria-selected={tabs ? isActive : undefined}
            aria-label={it.ariaLabel}
            disabled={it.disabled}
            onClick={it.onClick}
            className={`${sizeClass} px-2 flex items-center justify-center text-center active:scale-[0.97] transition-press ${noBorder} ${btnClasses} ${it.disabled ? "cursor-default opacity-50 active:scale-100" : "cursor-pointer"}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
