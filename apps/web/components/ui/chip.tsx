import React from "react";

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: React.ReactNode;
}

export function Chip({
  selected = false,
  children,
  className = "",
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`h-11 px-4 rounded-full text-sm font-semibold inline-flex items-center justify-center transition-press cursor-pointer select-none active:scale-[0.97] min-h-11 ${
        selected
          ? "bg-ink text-on-dark border-0 shadow-sm"
          : "bg-surface text-text border border-card-border hover:bg-paper-dark"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
