import React from "react";

export interface ChipGroupItem {
  id: string;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface ChipGroupProps {
  items?: ChipGroupItem[];
  leadingInput?: React.ReactNode;
  columns?: number;
  className?: string;
  tone?: "light" | "dark";
  "data-align-group"?: string;
}

/**
 * ChipGroup: N equal columns, full width, 44 px items, aria-pressed, optional leading input cell.
 */
export function ChipGroup({
  items = [],
  leadingInput,
  columns,
  className = "",
  tone = "light",
  "data-align-group": dataAlignGroup,
}: ChipGroupProps) {
  const totalCount = (leadingInput ? 1 : 0) + items.length;
  const colCount = columns || (totalCount > 0 ? totalCount : 4);

  const gridColsClass =
    colCount === 4
      ? "grid-cols-4"
      : colCount === 3
      ? "grid-cols-3"
      : colCount === 2
      ? "grid-cols-2"
      : colCount === 5
      ? "grid-cols-5"
      : "grid-cols-4";

  return (
    <div
      data-align-group={dataAlignGroup}
      className={`grid ${gridColsClass} gap-2 w-full ${className}`}
    >
      {leadingInput && (
        <div className="flex items-center min-h-[44px] w-full">
          {leadingInput}
        </div>
      )}
      {items.map((it) => {
        const isActive = !!it.active;
        const btnClasses =
          tone === "dark"
            ? isActive
              ? "bg-white text-ink font-bold shadow-xs"
              : "bg-surface-dark text-white font-medium hover:bg-surface-dark/80"
            : isActive
            ? "bg-ink text-white font-bold shadow-xs"
            : "bg-card text-text border border-card-border font-medium hover:bg-page";

        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={isActive}
            aria-label={it.ariaLabel}
            onClick={it.onClick}
            className={`min-h-[44px] px-2 rounded-xl text-xs flex items-center justify-center text-center cursor-pointer active:scale-[0.97] transition-all border-0 ${btnClasses}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
