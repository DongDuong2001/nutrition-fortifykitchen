import React from "react";
import { PillButton } from "@/components/ui/pill-button";
import { MAX_COMPARE_FOODS, MIN_COMPARE_FOODS } from "@/lib/food-compare";

export interface CompareBarProps {
  /** Names of the foods picked so far, in order. */
  names: string[];
  onSubmit: () => void;
  className?: string;
}

/**
 * The bar of the add sheet's So sánh mode: who is picked, and "So sánh (n)", enabled from 2 foods.
 * Sits under the list on a phone and in the right pane of the desktop dialog.
 */
export function CompareBar({ names, onSubmit, className = "" }: CompareBarProps) {
  const count = names.length;
  return (
    <div data-compare-bar className={`flex flex-col gap-2 ${className}`}>
      <p aria-live="polite" className="m-0 line-clamp-2 text-[13px] leading-snug text-secondary">
        {count === 0
          ? `Chọn ${MIN_COMPARE_FOODS} đến ${MAX_COMPARE_FOODS} món để so sánh.`
          : count < MIN_COMPARE_FOODS
            ? `${names.join(", ")}. Chọn thêm ít nhất 1 món.`
            : names.join(", ")}
      </p>
      <PillButton variant="primary" onClick={onSubmit} disabled={count < MIN_COMPARE_FOODS}>
        So sánh ({count})
      </PillButton>
    </div>
  );
}
