"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  isChickenEggFood,
  getEggPartChips,
  capitalizeWord,
} from "@/lib/portion";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { markUsed } from "@/lib/onboarding-store";
import { ChipGroup } from "@/components/ui/chip-group";

export interface PortionAreaProps {
  food: FoodItem;
  gramsInput: string;
  setGramsInput: (val: string) => void;
  selectedServingLabel: string;
  setSelectedServingLabel: (val: string) => void;
  onFoodChange?: (food: FoodItem) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  className?: string;
  "data-align-group"?: string;
}

export function PortionArea({
  food,
  gramsInput,
  setGramsInput,
  selectedServingLabel,
  setSelectedServingLabel,
  onFoodChange,
  disabled = false,
  tone = "light",
  className = "",
  "data-align-group": dataAlignGroup,
}: PortionAreaProps) {
  const isDark = tone === "dark";
  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);
  const noGrams = hidesGrams(food);

  // Tabs for the food (in data order plus "Gam", e.g. "Trái | Gam", "Gam | Chén")
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
    // The unit-toggle tip stays quiet once the toggle was used
    markUsed("unit-toggle");

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

  // Chicken egg part chips
  const isEgg = isChickenEggFood(food.nameVi);
  const eggParts = useMemo(() => {
    if (!isEgg) return [];
    return getEggPartChips(food.nameVi, MOCK_FOODS);
  }, [isEgg, food.nameVi]);

  // Gram servings for Gam tab
  const gramServings = useMemo(() => {
    return food.servings.filter((s) => parseUnitServing(s.label) === null);
  }, [food.servings]);

  return (
    <div data-align-group={dataAlignGroup} className={`flex flex-col gap-2 w-full ${className}`}>
      {/* 1. Segmented Toggle (if food has unit portions and does not hide grams) */}
      {tabsInfo && (
        <div
          role="tablist"
          aria-label="Đơn vị khẩu phần"
          data-tour="unit-toggle"
          className={`grid gap-1 p-1 rounded-2xl w-full border ${
            isDark ? "bg-surface-dark/80 border-card-border/30" : "bg-card-border/20 border-card-border/40"
          }`}
          style={{ gridTemplateColumns: `repeat(${tabsInfo.tabs.length}, minmax(0, 1fr))` }}
        >
          {tabsInfo.tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                disabled={disabled}
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-[44px] rounded-xl text-sm font-bold flex items-center justify-center transition-all cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 ${
                  isActive
                    ? isDark
                      ? "bg-surface text-text shadow-xs"
                      : "bg-ink text-on-dark shadow-xs"
                    : isDark
                    ? "text-muted-on-dark hover:text-on-dark"
                    : "text-secondary hover:text-text"
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
          {/* Size chips */}
          {unitServings.length > 0 && (
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
                  if (isEgg) {
                    chipText = `${parsed.sizeDisplay ?? capitalizeWord(parsed.unit)}${parsed.hint ? ` (${parsed.hint})` : ""}`;
                  } else if (parsed.sizeDisplay) {
                    chipText = parsed.sizeDisplay;
                  } else {
                    chipText = capitalizeWord(parsed.unit);
                  }
                }
                const isActive = activeSizeServing?.label === s.label;

                return (
                  <button
                    key={s.label}
                    type="button"
                    data-tour="unit-size"
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
                    className={`min-h-[44px] rounded-full text-xs px-2 flex items-center justify-center text-center transition-all cursor-pointer font-semibold border active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 ${
                      isActive
                        ? isDark
                          ? "bg-surface text-text font-bold shadow-xs border-transparent"
                          : "bg-ink text-on-dark font-bold shadow-xs border-transparent"
                        : isDark
                        ? "bg-surface-dark text-on-dark border-card-border/40 hover:bg-card-border/20"
                        : "bg-surface text-text border-card-border hover:bg-paper-dark"
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
            tone={tone}
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
          {/* Egg part chips: Cả quả | Lòng trắng | Lòng đỏ */}
          {eggParts.length > 0 && (
            <div
              role="group"
              aria-label="Phần trứng"
              className="grid grid-cols-3 gap-2 w-full"
            >
              {eggParts.map((part) => (
                <button
                  key={part.label}
                  type="button"
                  aria-pressed={part.active}
                  disabled={disabled}
                  onClick={() => {
                    if (onFoodChange && !part.active) {
                      onFoodChange(part.food as FoodItem);
                    }
                  }}
                  className={`min-h-[44px] rounded-full text-xs px-2 flex items-center justify-center text-center transition-all cursor-pointer font-semibold border active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 ${
                    part.active
                      ? isDark
                        ? "bg-surface text-text font-bold shadow-xs border-transparent"
                        : "bg-ink text-on-dark font-bold shadow-xs border-transparent"
                      : isDark
                      ? "bg-surface-dark text-on-dark border-card-border/40 hover:bg-card-border/20"
                      : "bg-surface text-text border-card-border hover:bg-paper-dark"
                  }`}
                >
                  {part.label}
                </button>
              ))}
            </div>
          )}

          {/* Gram typed input and gram chips */}
          <ChipGroup
            tone={tone}
            columns={Math.max(1, gramServings.length + 1)}
            leadingInput={
              <label
                className={`flex items-center justify-center rounded-xl px-2 h-11 w-full cursor-text box-border border-2 focus-within:ring-2 ${
                  isDark
                    ? "bg-surface-dark border-sky text-on-dark focus-within:ring-sky"
                    : "bg-card border-blue text-text focus-within:ring-blue"
                }`}
              >
                <input
                  id="portion-grams-input"
                  data-tour="portion-grams-input"
                  type="text"
                  inputMode="decimal"
                  aria-label="Số gam"
                  value={gramsInput}
                  disabled={disabled}
                  onChange={(e) => {
                    const text = e.target.value;
                    setGramsInput(text);
                    setSelectedServingLabel(formatGramsServingLabel(text, `${text} g`));
                  }}
                  className={`w-full bg-transparent border-0 outline-none focus-visible:outline-none font-bold text-sm tabular-nums text-right ${
                    isDark ? "text-on-dark" : "text-text"
                  }`}
                />
                <span
                  className={`text-xs ml-1 font-semibold ${
                    isDark ? "text-muted-on-dark" : "text-secondary"
                  }`}
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
              },
            }))}
          />
        </div>
      )}
    </div>
  );
}
