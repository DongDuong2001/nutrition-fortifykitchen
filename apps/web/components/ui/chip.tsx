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
      className={`h-11 px-4 rounded-full text-sm font-semibold inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-[0.97] min-h-[44px] ${
        selected
          ? "bg-ink text-white border-0 shadow-sm"
          : "bg-card text-text border border-black/12 hover:bg-black/[0.03]"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
