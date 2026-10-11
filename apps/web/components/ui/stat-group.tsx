import React from "react";

export interface StatGroupItem {
  id: string;
  value: React.ReactNode;
  label: React.ReactNode;
}

export interface StatGroupProps {
  items: StatGroupItem[];
  columns?: number;
  className?: string;
  tone?: "light" | "dark";
  "data-align-group"?: string;
}

/**
 * StatGroup: same columns and gap as ChipGroup, centered value and label.
 */
export function StatGroup({
  items,
  columns,
  className = "",
  tone = "light",
  "data-align-group": dataAlignGroup,
}: StatGroupProps) {
  const colCount = columns || items.length || 4;

  return (
    <div
      data-align-group={dataAlignGroup}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      className={`grid gap-2 w-full ${className}`}
    >
      {items.map((it) => (
        <div key={it.id} className="flex flex-col items-center text-center justify-center">
          <div
            className={`font-display italic font-black text-xl tabular-nums leading-tight ${
              tone === "dark" ? "text-white" : "text-text"
            }`}
          >
            {it.value}
          </div>
          <div
            className={`text-[11px] font-semibold mt-0.5 ${
              tone === "dark" ? "text-muted-on-dark" : "text-secondary"
            }`}
          >
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
