"use client";

import React, { useEffect } from "react";
import { markUsed } from "@/lib/onboarding-store";
import { MAX_UNIT_COUNT, unitCountOf, unitPortion } from "@/lib/portion";
import { setPresent } from "@/lib/tour-bus";

export interface QuantityStepperProps {
  servings: ReadonlyArray<{ label: string; grams: number }>;
  /** The portion label and nominal grams now chosen; the count is worked out from them. */
  label: string;
  grams: number;
  onChange: (grams: number, label: string) => void;
  tone?: "light" | "dark";
  disabled?: boolean;
  className?: string;
}

/**
 * "Số lượng ×N" for a supplement logged by the unit (1 to 10): N × the chosen serving. The grams stay nominal
 * (N × the serving's), the label is the collapsed "N viên". data-tour="quantity-stepper" is its one tip target,
 * wherever it shows (supplements, eggs and fruit by the piece): keep it on the root.
 */
export function QuantityStepper({ servings, label, grams, onChange, tone = "light", disabled = false, className = "" }: QuantityStepperProps) {
  const current = unitCountOf(servings, label, grams);
  const shown = current !== null;
  // Its first-visit tip waits for it to be on screen
  useEffect(() => {
    if (!shown) return;
    setPresent("stepper", true);
    return () => setPresent("stepper", false);
  }, [shown]);
  if (!current) return null;
  const { serving, count } = current;
  const dark = tone === "dark";
  const set = (next: number) => {
    const p = unitPortion(serving, next);
    markUsed("quantity-step");
    onChange(p.grams, p.label);
  };
  const button = `flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-lg font-bold transition-transform active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-40 ${
    dark ? "bg-card/20 text-on-dark" : "bg-surface text-text"
  }`;
  return (
    <div role="group" aria-label="Số lượng" data-tour="quantity-stepper" className={`flex items-center justify-between gap-2 ${className}`}>
      <span className={`text-sm font-semibold ${dark ? "text-muted-on-dark" : "text-secondary"}`}>Số lượng</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Giảm số lượng" disabled={disabled || count <= 1} onClick={() => set(count - 1)} className={button}>
          <span aria-hidden="true">−</span>
        </button>
        <output aria-live="polite" aria-label="Số lượng hiện tại" className={`min-w-8 text-center text-base font-bold tabular-nums ${dark ? "text-on-dark" : "text-text"}`}>
          {`×${count}`}
        </output>
        <button type="button" aria-label="Tăng số lượng" disabled={disabled || count >= MAX_UNIT_COUNT} onClick={() => set(count + 1)} className={button}>
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
