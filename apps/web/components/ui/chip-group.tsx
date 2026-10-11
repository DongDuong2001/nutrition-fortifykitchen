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
  size?: "md" | "lg";
  "data-align-group"?: string;
}

/**
 * ChipGroup: N equal columns, full width, aria-pressed, optional leading input cell.
 * size "md" (default): 44 px items, text-xs. size "lg": 52 px items, text-base, same height as the inputs.
 */
export function ChipGroup({
  items = [],
  leadingInput,
  columns,
  className = "",
  tone = "light",
  size = "md",
  "data-align-group": dataAlignGroup,
}: ChipGroupProps) {
  const totalCount = (leadingInput ? 1 : 0) + items.length;
  const colCount = columns || (totalCount > 0 ? totalCount : 4);

  const sizeClass =
    size === "lg" ? "h-[52px] rounded-[10px] text-base" : "min-h-[44px] rounded-xl text-xs";

  return (
    <div
      data-align-group={dataAlignGroup}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      className={`grid gap-2 w-full ${className}`}
    >
      {leadingInput && (
        <div className="flex items-center min-h-[44px] w-full">
          {leadingInput}
        </div>
      )}
      {items.map((it) => {
        const isActive = !!it.active;
        // lg matches the 52 px inputs: 2 px grabber border. md keeps its shipped 1 px card border.
        const inactiveBorder = size === "lg" ? "border-2 border-grabber" : "border border-card-border";
        const btnClasses =
          tone === "dark"
            ? isActive
              ? "bg-white text-ink font-bold shadow-xs"
              : "bg-surface-dark text-white font-medium hover:bg-surface-dark/80"
            : isActive
            ? "bg-ink text-white font-bold shadow-xs"
            : `bg-card text-text ${inactiveBorder} font-medium hover:bg-page`;
        // md keeps border-0 on every chip, as shipped in ui-05-fix. lg draws the inactive border.
        const noBorder = size === "md" || isActive || tone === "dark" ? "border-0" : "";

        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={isActive}
            aria-label={it.ariaLabel}
            onClick={it.onClick}
            className={`${sizeClass} px-2 flex items-center justify-center text-center cursor-pointer active:scale-[0.97] transition-all ${noBorder} ${btnClasses}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
