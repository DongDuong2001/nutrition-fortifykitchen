"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { type FoodItem, MOCK_FOODS } from "@/lib/mock/foods";
import {
  parseGramsInput,
  formatGramsServingLabel,
  gramsServingLabel,
  hidesGrams,
  parseUnitServing,
  parseUnitAmount,
  formatUnitServingLabel,
  findNearestUnitServing,
  getFoodUnitTabs,
  capitalizeWord,
  eggParts,
  gramFieldText as fieldText,
  eggSizes,
  portionHint,
  portionModeOf,
  fitPortion,
  resolvePortion,
  startPortion,
  withBase,
  withMult,
  overGramLimit,
  MAX_GRAMS_MESSAGE,
  MIN_GRAMS_MESSAGE,
  gramsTooSmall,
  MAX_GRAMS_PER_PORTION,
  MAX_MULT,
  type PortionState,
} from "@/lib/portion";
import { cookSwitchFor, useRowsReady } from "@/lib/food-rows";
import type { CookState } from "@/lib/yield";
import { QuantityStepper, TimesStepper } from "@/components/ui/quantity-stepper";
import { markUsed } from "@/lib/onboarding-store";
import { setPresent, type Presence } from "@/lib/tour-bus";
import { ChipGroup } from "@/components/ui/chip-group";
import { AlertLine } from "@/components/ui/alert-line";

export interface PortionAreaProps {
  food: FoodItem;
  gramsInput: string;
  setGramsInput: (val: string) => void;
  selectedServingLabel: string;
  setSelectedServingLabel: (val: string) => void;
  /** The logged food changes (a raw / cooked pair, an egg part). Without it the food stays and grams are converted. */
  onFoodChange?: (food: FoodItem) => void;
  disabled?: boolean;
  /** cc-53b: panel is the portion sheet (labels, hints, tips); tray is a row of Khay · xem lại (compact, no tips) */
  variant?: "panel" | "tray";
  className?: string;
  "data-align-group"?: string;
}

/**
 * The portion of one food (coach rules, cc-53b): grams × N with Sống | Chín for normal foods, Quả | Gam for eggs, and
 * the unit of the pack or the dish for supplements, món Việt, cans and the user's own foods (cc-53's unit tabs).
 */
export function PortionArea(props: PortionAreaProps) {
  return portionModeOf(props.food) === "units" ? <UnitPortionArea {...props} /> : <GramPortionArea {...props} />;
}


/** A thing on screen with a tip of its own, counted while it shows. */
function usePresent(name: Presence, on: boolean) {
  useEffect(() => {
    if (!on) return;
    setPresent(name, true);
    return () => setPresent(name, false);
  }, [name, on]);
}

/** The − and + beside the gram field step by this many grams */
const GRAM_STEP = 10;

function GramPortionArea({
  food,
  gramsInput,
  setGramsInput,
  selectedServingLabel,
  setSelectedServingLabel,
  onFoodChange,
  disabled = false,
  variant = "panel",
  className = "",
  "data-align-group": alignGroup,
}: PortionAreaProps) {
  const panel = variant === "panel";
  const isEggFood = portionModeOf(food) === "egg";
  const canSwap = !!onFoodChange;
  const ready = useRowsReady();
  const sw = useMemo(() => cookSwitchFor(food, MOCK_FOODS, canSwap), [food, canSwap, ready]);
  const sizes = useMemo(() => eggSizes(food), [food]);
  const parts = useMemo(() => (canSwap ? eggParts(food, MOCK_FOODS) : []), [food, canSwap]);

  // The state is held here and written out as grams + label; a label from outside (another food, Lưu & chọn tiếp)
  // starts it again. emitted is the last label this area wrote, so its own writes do not restart it.
  const emitted = useRef<string | null>(null);
  const [p, setP] = useState<PortionState>(() => startPortion(food, selectedServingLabel, parseGramsInput(gramsInput)));
  const [text, setText] = useState(() => (p.kind === "grams" ? fieldText(p.base) : ""));
  const lastEgg = useRef<PortionState | null>(p.kind === "egg" ? p : null);

  // The amount went over the limit: the field is written back clamped and says why
  const [overLimit, setOverLimit] = useState(false);
  const [touched, setTouched] = useState(false);

  const emit = (next: PortionState, hit = false) => {
    const out = fitPortion(food, next, sw);
    setP(out.portion);
    if (out.portion.kind === "grams" && (out.clamped || hit)) setText(fieldText(out.portion.base));
    setOverLimit(out.clamped || hit);
    emitted.current = out.label;
    setGramsInput(fieldText(out.grams));
    setSelectedServingLabel(out.label);
    if (out.food.id !== food.id) onFoodChange?.(out.food);
  };

  // Another food, or a label from outside, starts the state again; the first render writes the portion in this
  // model's form (an old "1 trái vừa" becomes its grams)
  const shownFood = useRef<string | null>(null);
  useEffect(() => {
    // cc-67: the raw / cooked data loads a moment after the first paint. Until it is here a "…đã nấu chín" label cannot be read,
    // and writing the portion out now would turn it into plain grams: wait, and start again when the data arrives.
    if (!ready) return;
    if (food.id === shownFood.current && selectedServingLabel === emitted.current) return;
    shownFood.current = food.id;
    const next = startPortion(food, selectedServingLabel, parseGramsInput(gramsInput));
    if (next.kind === "grams") setText(fieldText(next.base));
    if (next.kind === "egg") lastEgg.current = next;
    emit(next);
    // emit and gramsInput: read at the moment the label changes, not followed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food.id, selectedServingLabel, ready]);

  usePresent("multiply", panel && p.kind === "grams");
  usePresent("cook", panel && p.kind === "grams" && !!sw);
  usePresent("egg", panel && isEggFood);

  const state: CookState | null = p.kind === "grams" && sw ? (p.state ?? sw.own) : null;
  const ids = useId();
  const align = { "data-align-group": alignGroup, "data-align-edge": "left" } as const;

  // V3 segmented control: a seg-track with a raised, ringed pill for the picked side (44 px hit areas)
  const segment = (on: boolean) =>
    `h-11 ${panel ? "rounded-[10px] text-callout" : "rounded-[9px] text-sm"} cursor-pointer border-0 disabled:opacity-50 ${
      on ? "bg-raised font-bold text-text shadow-[0_0_0_1px_var(--color-card-border)]" : "bg-transparent font-semibold text-secondary"
    }`;
  const track = `grid grid-cols-2 gap-1 bg-seg-track p-1 ${panel ? "rounded-xl" : "rounded-xl"}`;
  // The gram field's edge: cobalt while it is fine, destructive when the amount is over the limit or too small
  const gramsBad = overLimit || gramsTooSmall(text, touched);
  // ±10 g on the field (the design's − and +): the same write as typing the new amount
  const stepGrams = (delta: number) => {
    if (p.kind !== "grams") return;
    const typed = Math.max(0, Math.round((p.base + delta) * 10) / 10);
    const next = withBase(p, typed);
    setText(fieldText(typed));
    emit(next, overGramLimit(fieldText(typed)) || next.base < typed);
  };
  const gramStep = "flex h-15 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border-0 bg-surface p-0 text-text disabled:opacity-40";

  const chip100 =
    p.kind === "grams" ? (
      <button
        type="button"
        aria-pressed={p.base === 100}
        disabled={disabled}
        onClick={() => {
          setText("100");
          emit(withBase(p, 100));
        }}
        className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border-0 disabled:opacity-50 ${
 panel ? "min-h-11 min-w-[72px] px-4 text-callout" : "h-12 px-3 text-sm"
 } ${p.base === 100 ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"}`}
      >
        100 g
      </button>
    ) : null;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {/* Sống | Chín: where raw or cooked matters and something true can be logged for both */}
      {p.kind === "grams" && sw && (
        <div {...align} className="flex flex-col">
          {panel && <span className="flex min-h-11 items-center text-cap font-bold text-text">Bạn cân lúc nào?</span>}
          <div role="group" aria-label="Sống hoặc chín" data-tour={panel ? "cook-state" : undefined} className={track}>
            {(["raw", "cooked"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={state === s}
                disabled={disabled}
                onClick={() => {
                  if (state === s) return;
                  markUsed("cook-state");
                  emit({ ...p, state: s });
                }}
                className={segment(state === s)}
              >
                {s === "raw" ? "Cân sống" : "Đã nấu chín"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Eggs: Quả (size from the box × how many) | Gam (weighed, whites and yolks as their own foods) */}
      {isEggFood && (
        <div {...align} className="flex flex-col gap-3">
          {panel && (
            <div role="group" aria-label="Ghi theo" data-tour="egg-mode" className={track}>
              {(["egg", "grams"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={p.kind === k}
                  disabled={disabled}
                  onClick={() => {
                    if (p.kind === k) return;
                    markUsed("egg-mode");
                    if (k === "grams") {
                      lastEgg.current = p;
                      const grams = Math.round(resolvePortion(food, p, null).grams) || 100;
                      setText(fieldText(grams));
                      emit({ kind: "grams", base: grams, mult: 1, state: null });
                    } else {
                      const size = (sizes.find((z) => z.size === "vừa") ?? sizes[0])?.size ?? null;
                      emit(lastEgg.current ?? { kind: "egg", size, count: 1 });
                    }
                  }}
                  className={segment(p.kind === k)}
                >
                  {k === "egg" ? "Quả" : "Gam"}
                </button>
              ))}
            </div>
          )}
          {p.kind === "egg" && sizes.length > 1 && (
            <div className="flex flex-col gap-2">
              {panel && (
                <span className="text-cap font-bold text-text">
                  Trứng cỡ nào? <span className="font-normal text-secondary">Xem trên hộp là biết</span>
                </span>
              )}
              <div role="group" aria-label="Cỡ trứng" className={`grid gap-2 ${panel ? "grid-cols-2" : "grid-cols-4"}`}>
                {sizes.map((z) => {
                  const on = z.size === p.size;
                  return (
                    <button
                      key={z.serving.label}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => {
                        markUsed("egg-mode");
                        emit({ ...p, size: z.size });
                      }}
                      className={`flex cursor-pointer flex-col justify-center rounded-xl border-0 disabled:opacity-50 ${
 panel ? "min-h-[52px] items-start px-3 py-2 text-left" : "h-11 items-center px-1 text-cap"
 } ${on ? "bg-ink text-on-dark" : "bg-surface text-text"}`}
                    >
                      <span className={panel ? `text-callout ${on ? "font-bold" : "font-semibold"}` : ""}>{z.label}</span>
                      {panel && z.hint && <span className={`text-xs ${on ? "text-muted-subtitle" : "text-secondary"}`}>{z.hint}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Whites and yolks are their own foods: weighed in grams */}
      {p.kind === "grams" && parts.length > 0 && (
        <div {...align} role="group" aria-label="Phần trứng" className="grid grid-cols-3 gap-2">
          {parts.map((part) => (
            <button
              key={part.label}
              type="button"
              aria-pressed={part.active}
              disabled={disabled}
              onClick={() => {
                if (!part.active) onFoodChange?.(part.food);
              }}
              className={`min-h-11 cursor-pointer rounded-full border-0 px-2 text-cap disabled:opacity-50 ${
 part.active ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"
 }`}
            >
              {part.label}
            </button>
          ))}
        </div>
      )}

      {/* The gram field and its one chip, 100 g. Panel: the label and the chip on one row, then − field +. Tray: field and chip in a row. */}
      {p.kind === "grams" && (
        <div {...align} className="flex flex-col gap-2">
          {panel && (
            <div className="flex min-h-11 items-center justify-between gap-2">
              <label htmlFor={`${ids}-grams`} className="text-cap font-bold text-text">
                Bao nhiêu gam?
              </label>
              {chip100}
            </div>
          )}
          <div className="flex items-stretch gap-2">
            {panel && (
              <button type="button" aria-label="Giảm 10 gam" disabled={disabled || p.base <= 0} onClick={() => stepGrams(-GRAM_STEP)} className={gramStep}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            <div
              className={`flex min-w-0 flex-1 items-center gap-1 bg-surface focus-within:ring-2 focus-within:ring-cobalt/30 ${gramsBad ? "shadow-[inset_0_0_0_2px_var(--color-destructive-text)]" : "shadow-[inset_0_0_0_2px_var(--color-cobalt)]"} ${
 panel ? "h-15 rounded-[14px] px-4" : "h-12 rounded-xl px-3"
 }`}
            >
              <input
                id={`${ids}-grams`}
                data-tour={panel ? "portion-grams-input" : undefined}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                aria-label={panel ? "Số gam" : `Số gam ${food.nameVi}`}
                value={text}
                disabled={disabled}
                aria-describedby={overLimit || gramsTooSmall(text, touched) ? `${ids}-grams-error` : undefined}
                aria-invalid={gramsTooSmall(text, touched) || undefined}
                onBlur={() => setTouched(true)}
                onChange={(e) => {
                  const typed = parseGramsInput(e.target.value);
                  const next = withBase(p, typed);
                  setText(e.target.value);
                  emit(next, overGramLimit(e.target.value) || next.base < typed);
                }}
                className={`h-full w-full min-w-0 border-0 bg-transparent p-0 text-right font-display font-extrabold text-text tabular-nums outline-none ${panel ? "text-display" : "text-2xl"}`}
              />
              <span className={`font-semibold text-secondary ${panel ? "text-base" : "text-sm"}`}>g</span>
            </div>
            {panel ? (
              <button type="button" aria-label="Tăng 10 gam" disabled={disabled} onClick={() => stepGrams(GRAM_STEP)} className={gramStep}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              chip100
            )}
          </div>
          <AlertLine show={gramsBad} gap={2} id={`${ids}-grams-error`} className="m-0 px-1 text-cap font-semibold leading-snug text-destructive-text">
            {overLimit ? MAX_GRAMS_MESSAGE : MIN_GRAMS_MESSAGE}
          </AlertLine>
        </div>
      )}

      {/* ×N multiplies whatever amount is set; eggs count the pieces */}
      <div {...align}>
        {p.kind === "grams" ? (
          <TimesStepper
            label="Nhân khẩu phần nhanh"
            hint={portionHint(p) ?? undefined}
            value={p.mult}
            valueText={`×${p.mult}`}
            max={p.base > 0 ? Math.max(1, Math.min(MAX_MULT, Math.floor(MAX_GRAMS_PER_PORTION / p.base))) : MAX_MULT}
            onChange={(n) => emit(withMult(p, n))}
            variant={variant}
            disabled={disabled}
            usedEvent="portion-multiply"
            dataTour={panel ? "portion-multiply" : undefined}
          />
        ) : (
          <TimesStepper
            label="Mấy quả?"
            hint={`${p.count} quả${p.size ? ` ${p.size}` : ""}`}
            value={p.count}
            valueText={String(p.count)}
            max={MAX_MULT}
            onChange={(n) => emit({ ...p, count: n })}
            variant={variant}
            disabled={disabled}
            usedEvent="egg-mode"
          />
        )}
      </div>
    </div>
  );
}

/** cc-53's unit tabs ("Lon | Gam", "Viên"), kept for the foods that keep their unit (coach rule 5). */
function UnitPortionArea({
  food,
  gramsInput,
  setGramsInput,
  selectedServingLabel,
  setSelectedServingLabel,
  disabled = false,
  className = "",
  "data-align-group": dataAlignGroup,
}: PortionAreaProps) {
  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);
  const noGrams = hidesGrams(food);
  // One id per panel: two portion areas on one page (the Khay review) must not share an id
  const gramsId = useId();
  const [gramsTouched, setGramsTouched] = useState(false);
  const [overLimit, setOverLimit] = useState(false);

  // Tabs for the food (in data order plus "Gam", e.g. "Lon | Gam", "Phần | Gam")
  const tabsInfo = useMemo(() => getFoodUnitTabs(food.servings, noGrams), [food.servings, noGrams]);

  // Determine current active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (noGrams) return "unit";
    if (!tabsInfo) return "gam";
    const parsed = parseUnitAmount(selectedServingLabel) ?? parseUnitServing(selectedServingLabel);
    if (parsed && tabsInfo.tabs.some((t) => t.id === parsed.unit)) {
      return parsed.unit;
    }
    if (selectedServingLabel.includes("g") || selectedServingLabel === "100 g") {
      return "gam";
    }
    return tabsInfo.defaultTab;
  });

  // Sync activeTab when food changes or when selectedServingLabel strongly indicates a tab
  useEffect(() => {
    if (noGrams) {
      setActiveTab("unit");
      return;
    }
    if (!tabsInfo) {
      setActiveTab("gam");
      return;
    }
    const parsed = parseUnitAmount(selectedServingLabel) ?? parseUnitServing(selectedServingLabel);
    if (parsed && tabsInfo.tabs.some((t) => t.id === parsed.unit)) {
      setActiveTab(parsed.unit);
    } else if (selectedServingLabel.includes("g") && tabsInfo.tabs.some((t) => t.id === "gam")) {
      setActiveTab("gam");
    }
  }, [food.id, selectedServingLabel, tabsInfo, noGrams]);

  // Tab switch handler: switching tabs keeps the equivalent amount
  const handleTabChange = (targetTab: string) => {
    if (targetTab === activeTab || disabled) return;
    setActiveTab(targetTab);

    if (targetTab === "gam") {
      // Unit → Gam fills grams
      const g = parsedGrams > 0 ? parsedGrams : 100;
      setGramsInput(String(g));
      setSelectedServingLabel(gramsServingLabel(g));
    } else {
      // Gam → Unit picks nearest size and amount
      const currentG = parsedGrams > 0 ? parsedGrams : 100;
      const nearest = findNearestUnitServing(food.servings, targetTab, currentG);
      if (nearest) {
        const totalGrams = Math.round(nearest.amount * nearest.serving.grams);
        setGramsInput(String(totalGrams));
        const newLabel = formatUnitServingLabel(
          nearest.amount,
          nearest.parsed.unit,
          nearest.parsed.size,
          nearest.parsed.hint
        );
        setSelectedServingLabel(newLabel);
      }
    }
  };

  // Unit portions for the active tab
  const isUnitTab = activeTab !== "gam";
  const unitServings = useMemo(() => {
    if (!isUnitTab) return [];
    if (noGrams) return food.servings;
    return food.servings.filter((s) => parseUnitServing(s.label)?.unit === activeTab);
  }, [isUnitTab, noGrams, food.servings, activeTab]);

  // Parsed unit info of selectedServingLabel
  const parsedCurrent = useMemo(() => {
    const withAmount = parseUnitAmount(selectedServingLabel);
    if (withAmount) return withAmount;
    const p = parseUnitServing(selectedServingLabel);
    if (p) return { amount: 1, unit: p.unit, size: p.size, hint: p.hint };
    return null;
  }, [selectedServingLabel]);

  const currentAmount = parsedCurrent?.amount ?? 1;

  // Active size serving
  const activeSizeServing = useMemo(() => {
    if (unitServings.length === 0) return null;
    return (
      unitServings.find((s) => {
        const p = parseUnitServing(s.label);
        return p && parsedCurrent && p.size === parsedCurrent.size;
      }) ??
      unitServings.find((s) => s.label === selectedServingLabel) ??
      unitServings[0]
    );
  }, [unitServings, parsedCurrent, selectedServingLabel]);

  // Gram servings for Gam tab
  const gramServings = useMemo(() => {
    return food.servings.filter((s) => parseUnitServing(s.label) === null);
  }, [food.servings]);

  return (
    <div data-align-group={dataAlignGroup} className={`flex flex-col gap-2 w-full ${className}`}>
      {/* 1. Segmented Toggle (if food has unit portions and does not hide grams) */}
      {tabsInfo && (
        <div
          role="group"
          aria-label="Đơn vị khẩu phần"
          data-tour="unit-toggle"
          className="grid w-full gap-1 rounded-xl bg-seg-track p-1"
          style={{ gridTemplateColumns: `repeat(${tabsInfo.tabs.length}, minmax(0, 1fr))` }}
        >
          {tabsInfo.tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-11 rounded-[10px] border-0 text-sm flex items-center justify-center transition-press cursor-pointer disabled:opacity-50 ${
 isActive
 ? "bg-raised font-bold text-text shadow-[0_0_0_1px_var(--color-card-border)]"
 : "bg-transparent font-semibold text-secondary hover:text-text"
 }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Unit Tab Content */}
      {isUnitTab && (
        <div className="flex flex-col gap-2 w-full">
          {/* Size chips: only with a choice (cc-61); one size is the tab above and the stepper below */}
          {unitServings.length > 1 && (
            <div
              role="group"
              aria-label="Kích cỡ"
              className="grid gap-2 w-full"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, Math.min(unitServings.length, 4))}, minmax(0, 1fr))`,
              }}
            >
              {unitServings.map((s) => {
                const parsed = parseUnitServing(s.label);
                let chipText = s.label;
                if (parsed) {
                  chipText = parsed.sizeDisplay ?? capitalizeWord(parsed.unit);
                }
                const isActive = activeSizeServing?.label === s.label;

                return (
                  <button
                    key={s.label}
                    type="button"
                    aria-pressed={isActive}
                    disabled={disabled}
                    onClick={() => {
                      if (!parsed) {
                        setGramsInput(String(s.grams));
                        setSelectedServingLabel(s.label);
                        return;
                      }
                      const newGrams = Math.round(currentAmount * s.grams * 10) / 10;
                      const newLabel = formatUnitServingLabel(
                        currentAmount,
                        parsed.unit,
                        parsed.size,
                        parsed.hint
                      );
                      setGramsInput(String(newGrams));
                      setSelectedServingLabel(newLabel);
                    }}
                    className={`min-h-11 rounded-full text-xs px-2 flex items-center justify-center text-center transition-press cursor-pointer font-semibold border disabled:opacity-50 ${
 isActive
 ? "bg-ink text-on-dark font-bold border-transparent"
 : "bg-surface text-text border-transparent hover:bg-paper-dark"
 }`}
                  >
                    {chipText}
                  </button>
                );
              })}
            </div>
          )}

          {/* Amount Stepper + Typed Input */}
          <QuantityStepper
            servings={food.servings}
            label={selectedServingLabel}
            grams={parsedGrams}
            disabled={disabled}
            onChange={(g, l) => {
              setGramsInput(String(g));
              setSelectedServingLabel(l);
            }}
          />
        </div>
      )}

      {/* 3. Gam Tab Content */}
      {!isUnitTab && (
        <div className="flex flex-col gap-2 w-full">
          {/* Gram typed input and gram chips */}
          <ChipGroup
            columns={Math.max(1, gramServings.length + 1)}
            leadingInput={
              <label
                className="flex items-center justify-center rounded-xl px-2 h-11 w-full cursor-text box-border focus-within:ring-2 bg-surface shadow-[inset_0_0_0_2px_var(--color-cobalt)] text-text focus-within:ring-cobalt"
              >
                <input
                  id={`${gramsId}-grams`}
                  data-tour="portion-grams-input"
                  type="text"
                  inputMode="decimal"
                  aria-label="Số gam"
                  value={gramsInput}
                  disabled={disabled}
                  aria-describedby={overLimit || gramsTooSmall(gramsInput, gramsTouched) ? `${gramsId}-grams-error` : undefined}
                  aria-invalid={gramsTooSmall(gramsInput, gramsTouched) || undefined}
                  onBlur={() => setGramsTouched(true)}
                  onChange={(e) => {
                    // Over the limit: the field is written back clamped, so the label, the grams and the kcal agree
                    const over = overGramLimit(e.target.value);
                    const text = over ? fieldText(MAX_GRAMS_PER_PORTION) : e.target.value;
                    setOverLimit(over);
                    setGramsInput(text);
                    setSelectedServingLabel(formatGramsServingLabel(text, `${text} g`));
                  }}
                  className="w-full bg-transparent border-0 outline-none focus-visible:outline-none font-bold text-base tabular-nums text-right text-text"
                />
                <span
                  className="text-xs ml-1 font-semibold text-secondary"
                >
                  g
                </span>
              </label>
            }
            items={gramServings.map((s) => ({
              id: s.label,
              label: s.label,
              active: selectedServingLabel === s.label,
              onClick: () => {
                setGramsInput(String(s.grams));
                setSelectedServingLabel(s.label);
                setOverLimit(false);
              },
            }))}
          />
          <AlertLine show={overLimit || gramsTooSmall(gramsInput, gramsTouched)} gap={2} id={`${gramsId}-grams-error`} className="m-0 px-1 text-cap font-semibold leading-snug text-destructive-text">
            {overLimit ? MAX_GRAMS_MESSAGE : MIN_GRAMS_MESSAGE}
          </AlertLine>
        </div>
      )}
    </div>
  );
}
