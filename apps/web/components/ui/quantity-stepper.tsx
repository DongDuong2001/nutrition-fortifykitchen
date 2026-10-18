import React, { useState, useEffect } from "react";
import { MIN_UNIT_AMOUNT, MAX_UNIT_AMOUNT, UNIT_AMOUNT_STEP, clampUnitAmount, parseUnitAmountInput, unitCountOf, unitPortion } from "@/lib/portion";
import { formatNumber } from "@/lib/format";

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
 * "Số lượng ×N" for a unit portion (0.5 to 20 in 0.5 steps): N × the chosen serving.
 * Amount stepper that is also a typed field (comma or dot).
 */
export function QuantityStepper({ servings, label, grams, onChange, tone = "light", disabled = false, className = "" }: QuantityStepperProps) {
  const current = unitCountOf(servings, label, grams);
  const count = current ? current.count : 1;
  const serving = current?.serving ?? servings[0];
  const dark = tone === "dark";

  const [typedText, setTypedText] = useState(formatNumber(count));

  useEffect(() => {
    setTypedText(formatNumber(count));
  }, [count]);

  if (!serving) return null;

  const set = (next: number) => {
    const clamped = clampUnitAmount(next);
    const p = unitPortion(serving, clamped);
    setTypedText(formatNumber(clamped));
    onChange(p.grams, p.label);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedText(val);
    const parsed = parseUnitAmountInput(val);
    if (parsed !== null) {
      const p = unitPortion(serving, parsed);
      onChange(p.grams, p.label);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseUnitAmountInput(typedText);
    if (parsed !== null) {
      set(parsed);
    } else {
      setTypedText(formatNumber(count));
    }
  };

  const button = `flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-lg font-bold transition-transform active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-40 ${
    dark ? "bg-card/20 text-on-dark" : "bg-surface text-text"
  }`;

  return (
    <div
      role="group"
      aria-label="Số lượng"
      data-tour="unit-stepper"
      className={`flex items-center justify-between gap-2 ${className}`}
    >
      <span className={`text-sm font-semibold ${dark ? "text-muted-on-dark" : "text-secondary"}`}>Số lượng</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Giảm số lượng"
          disabled={disabled || count <= MIN_UNIT_AMOUNT}
          onClick={() => set(count - UNIT_AMOUNT_STEP)}
          className={button}
        >
          <span aria-hidden="true">−</span>
        </button>
        <div
          className={`flex h-11 min-w-[72px] items-center justify-center rounded-xl border px-2 focus-within:ring-2 ${
            dark
              ? "border-card-border/30 bg-surface-dark focus-within:ring-sky text-on-dark"
              : "border-card-border bg-card focus-within:ring-blue text-text"
          }`}
        >
          <span className="sr-only">{`×${count}`}</span>
          <span aria-hidden="true" className={`font-bold select-none text-base mr-0.5 ${dark ? "text-muted-on-dark" : "text-secondary"}`}>
            ×
          </span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="Số lượng"
            data-tour="unit-amount"
            value={typedText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            className={`w-10 bg-transparent text-center text-base font-bold tabular-nums outline-none border-0 focus-visible:outline-none ${
              dark ? "text-on-dark" : "text-text"
            }`}
          />
        </div>
        <button
          type="button"
          aria-label="Tăng số lượng"
          disabled={disabled || count >= MAX_UNIT_AMOUNT}
          onClick={() => set(count + UNIT_AMOUNT_STEP)}
          className={button}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
