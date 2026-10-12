"use client";

import React from "react";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
  id,
  className = "",
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`shrink-0 w-[51px] h-11 p-0 border-0 bg-transparent flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative block w-[51px] h-[31px] rounded-[16px] transition-colors duration-200 box-border ${
          checked ? "bg-blue border border-transparent" : "bg-level-empty border border-card-border"
        }`}
      >
        <span
          className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-card shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200 ${
            checked ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
