import React, { useState, useEffect } from "react";
import { MIN_UNIT_AMOUNT, MAX_UNIT_AMOUNT, UNIT_AMOUNT_STEP, clampUnitAmount, parseUnitAmountInput, unitCountOf, unitPortion } from "@/lib/portion";
import { formatNumber } from "@/lib/format";
import { markUsed } from "@/lib/onboarding-store";
import { setPresent } from "@/lib/tour-bus";

/** The round 44 px − / + of every stepper (units, ×N, how many eggs). */
const stepButton = (colors: string) =>
 `flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 font-bold disabled:cursor-default disabled:opacity-40 ${colors}`;

export interface QuantityStepperProps {
  servings: ReadonlyArray<{ label: string; grams: number }>;
  /** The portion label and nominal grams now chosen; the count is worked out from them. */
  label: string;
  grams: number;
  onChange: (grams: number, label: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * "Số lượng ×N" for a unit portion (0.5 to 20 in 0.5 steps): N × the chosen serving.
 * Amount stepper that is also a typed field (comma or dot). data-tour="unit-stepper" on the root is its one tip
 * target wherever it shows (supplements, eggs, fruit and other unit portions).
 */
export function QuantityStepper({ servings, label, grams, onChange, disabled = false, className = "" }: QuantityStepperProps) {
  const current = unitCountOf(servings, label, grams);
  const count = current ? current.count : 1;
  const serving = current?.serving ?? servings[0];

  const [typedText, setTypedText] = useState(formatNumber(count));

  useEffect(() => {
    setTypedText(formatNumber(count));
  }, [count]);

  // Its first-visit tip waits for it to be on screen
  const shown = !!serving;
  useEffect(() => {
    if (!shown) return;
    setPresent("stepper", true);
    return () => setPresent("stepper", false);
  }, [shown]);

  if (!serving) return null;

  const set = (next: number) => {
    markUsed("quantity-step");
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
      markUsed("quantity-step");
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

  const button = stepButton("bg-surface text-lg text-text");

  return (
    <div
      role="group"
      aria-label="Số lượng"
      data-tour="unit-stepper"
      className={`flex items-center justify-between gap-2 ${className}`}
    >
      <span className="text-cap font-bold text-text">Số lượng</span>
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
          className="flex h-11 min-w-[72px] items-center justify-center rounded-xl bg-surface px-2 shadow-[inset_0_0_0_2px_var(--color-cobalt)] focus-within:ring-2 focus-within:ring-cobalt text-text"
        >
          <span className="sr-only">{`×${count}`}</span>
          <span aria-hidden="true" className="font-bold select-none text-base mr-0.5 text-secondary">
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
            className="w-10 bg-transparent text-center text-base font-bold tabular-nums outline-none border-0 focus-visible:outline-none text-text"
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

export interface TimesStepperProps {
  /** "Nhân khẩu phần nhanh" or "Mấy quả?" */
  label: string;
  /** The line under the label: "100 g × 3 = 300 g" */
  hint?: string;
  value: number;
  /** "×3" for a multiplier, "3" for a count */
  valueText: string;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** panel: the portion card's row (label and hint left, grey round − ×N + right); tray: the label left, a paper pill right, no hint */
  variant?: "panel" | "tray";
  disabled?: boolean;
  /** The usage event its tip waits for */
  usedEvent?: string;
  dataTour?: string;
}

/**
 * cc-53b: the ×N row of a gram portion (whole steps from 1) and the egg count, on the stepper's buttons. No typed field:
 * the amount is typed in the gram field above it.
 */
export function TimesStepper({ label, hint, value, valueText, min = 1, max, onChange, variant = "panel", disabled = false, usedEvent, dataTour }: TimesStepperProps) {
  const step = (next: number) => {
    if (usedEvent) markUsed(usedEvent);
    onChange(Math.min(max, Math.max(min, next)));
  };
  const panel = variant === "panel";
  const button = stepButton(panel ? "bg-fill p-0 text-text" : "bg-transparent text-xl text-text");
  const glyph = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  const controls = (
    <div role="group" aria-label={label} className={`ml-auto flex shrink-0 items-center gap-1 ${panel ? "" : "rounded-full bg-surface p-0.5"}`}>
      <button type="button" aria-label={`Giảm ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => step(value - 1)} className={button}>
        {panel ? glyph("M5 12h14") : <span aria-hidden="true">−</span>}
      </button>
      <output aria-live="polite" className={`text-center tabular-nums ${panel ? "min-w-9 text-callout font-bold" : "min-w-10 font-display text-xl font-bold"}`}>
        {valueText}
      </output>
      <button type="button" aria-label={`Tăng ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => step(value + 1)} className={button}>
        {panel ? glyph("M12 5v14M5 12h14") : <span aria-hidden="true">+</span>}
      </button>
    </div>
  );
  return (
    // At large text sizes the label keeps at least 7.5rem and the buttons move to a line of their own, at the right
    <div data-tour={dataTour} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ${panel ? "min-h-14" : ""}`}>
      <span className="flex min-w-0 grow basis-[7.5rem] flex-col gap-0.5">
        <span className="text-cap font-bold text-text">{label}</span>
        {panel && hint && <span className="text-xs tabular-nums text-secondary">{hint}</span>}
      </span>
      {controls}
    </div>
  );
}
