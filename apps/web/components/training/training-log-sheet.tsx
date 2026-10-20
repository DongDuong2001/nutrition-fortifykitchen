"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { PortionArea } from "@/components/ui/portion-area";
import { PortionPanel } from "@/components/ui/portion-panel";
import { useDiary } from "@/lib/diary-store";
import { canLog } from "@/lib/diary-edits";
import { formatAmount } from "@/lib/format";
import { catalogFoodById, type FoodItem } from "@/lib/catalog";
import { gramsServingLabel, parseGramsInput } from "@/lib/portion";
import { navigateFromSheet } from "@/lib/sheet-history";
import type { TrainingCheckItem } from "@/lib/training";
import { carbsIn, gramsForCarbs, lonPortion, lonsForCarbs, mixPrefill, resolveChoices, type ResolvedChoice } from "@/lib/training-foods";
import { generateUuid } from "@/lib/uuid";

/** Grams as the gram field takes them: a decimal comma and no thousands dot (formatAmount's "1.000" reads as 1 g). */
export const gramsText = (grams: number) => String(grams).replace(".", ",");

/** What a checklist item can log now: its catalogue choices (a choice with a missing food cannot be picked). */
export function itemChoices(item: TrainingCheckItem, foods: readonly FoodItem[]): ResolvedChoice[] {
  if (item.own) {
    const food = catalogFoodById(item.foodId);
    return [{ key: item.id, label: item.label, short: item.label, foods: food ? [food] : [], missing: food ? [] : [item.label] }];
  }
  return resolveChoices(item.foods ?? [], foods);
}

const loggable = (c: ResolvedChoice) => c.foods.length > 0 && c.foods.every(canLog);

/** An item logs to the diary when one of its choices can be logged; otherwise it is tick-only. */
export const canLogItem = (item: TrainingCheckItem, foods: readonly FoodItem[]) => itemChoices(item, foods).some(loggable);

/**
 * What a tap on a checklist item does: untick it; open the portion sheet; wait for the live catalogue, which is still
 * loading (the row shows it is busy and the sheet opens once it is there); or tick it (no catalogue food for it).
 */
export function tickAction(item: TrainingCheckItem, ticked: readonly string[], foods: readonly FoodItem[], catalogPending: boolean) {
  if (ticked.includes(item.id)) return "untick" as const;
  if (canLogItem(item, foods)) return "sheet" as const;
  return catalogPending ? ("wait" as const) : ("tick" as const);
}

type OnLogged = (itemId: string, entryIds: string[], qty: string) => void;

/**
 * The amount a tick pre-fills, in the unit the portion area opens on: a can food (Red Bull) in lon, in half cans; the
 * rest in gam. Tinh bột nhanh's dose is grams of carbs (Hao 18/10), so its amount comes from the food's carbs.
 */
function prefill(item: TrainingCheckItem, food: FoodItem): { grams: number; label: string } {
  const dose = item.grams ?? 0;
  if (item.carbs) {
    const cans = lonPortion(food, lonsForCarbs(food, dose));
    if (cans) return cans;
    const grams = gramsForCarbs(food, dose) ?? dose;
    return { grams, label: gramsServingLabel(grams) };
  }
  return { grams: dose, label: item.servingLabel ?? gramsServingLabel(dose) };
}

/** "Tinh bột 45 / 45 g": the carbs of the amounts against the dose. */
const carbTotal = (carbs: number, dose: number) => `Tinh bột ${formatAmount(Math.round(carbs), "g")} / ${formatAmount(dose, "g")} g`;

/**
 * cc-52: a tick on Ngày tập opens the portion sheet with the item's food, its Bự / Bé amount and Bữa phụ. Thêm logs the
 * entries (onLogged, with their ids for the tick's link); closing it logs nothing.
 */
export function TrainingLogSheet({
  item,
  foods,
  onClose,
  onLogged,
}: {
  item: TrainingCheckItem | null;
  foods: readonly FoodItem[];
  onClose: () => void;
  onLogged: OnLogged;
}) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.label} titleId="training-log-title" description="Ghi vào Bữa phụ" desktopDialog>
      {item && <LogBody item={item} foods={foods} onLogged={onLogged} />}
    </Sheet>
  );
}

function LogBody({ item, foods, onLogged }: { item: TrainingCheckItem; foods: readonly FoodItem[]; onLogged: OnLogged }) {
  const choices = itemChoices(item, foods);
  const [choiceKey, setChoiceKey] = useState(() => choices.find(loggable)?.key ?? "");
  const choice = choices.find((c) => c.key === choiceKey && loggable(c));

  return (
    <div className="flex flex-col gap-3">
      {choices.length > 1 && (
        <fieldset data-align-group="training-log" className="m-0 flex flex-col border-0 p-0">
          <legend className="px-1 pb-1 text-cap font-semibold text-secondary">Chọn loại</legend>
          {choices.map((c) => (
            <label
              key={c.key}
              className={`flex min-h-12 items-center gap-3 border-t border-divider px-1 first-of-type:border-t-0 ${loggable(c) ? "cursor-pointer" : "cursor-default"}`}
            >
              <input
                type="radio"
                name="training-log-choice"
                value={c.key}
                checked={choiceKey === c.key}
                disabled={!loggable(c)}
                onChange={() => setChoiceKey(c.key)}
                className="h-[22px] w-[22px] shrink-0 accent-cobalt"
              />
              <span className="flex min-w-0 flex-1 flex-col py-1">
                <span className={`text-sm font-semibold ${loggable(c) ? "text-text" : "text-secondary"}`}>{c.label}</span>
                {c.missing.length > 0 && <span className="text-cap leading-snug text-secondary">Chưa có {c.missing.join(", ")} trong danh mục</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {/* Keyed by the choice: another choice starts from its own pre-filled amount */}
      {choice &&
        (choice.foods.length === 2 ? (
          <MixPanel key={choice.key} item={item} redBull={choice.foods[0]} matMia={choice.foods[1]} onLogged={onLogged} />
        ) : (
          <PortionChoice key={choice.key} item={item} choice={choice} onLogged={onLogged} />
        ))}
    </div>
  );
}

/** One food in the shared portion panel (its portion area: lon for Red Bull, gam for mật mía and muối). */
function PortionChoice({ item, choice, onLogged }: { item: TrainingCheckItem; choice: ResolvedChoice; onLogged: OnLogged }) {
  const router = useRouter();
  const { addFoodEntry } = useDiary();
  const food = choice.foods[0];
  const start = prefill(item, food);
  const [gramsInput, setGramsInput] = useState(gramsText(start.grams));
  const [servingLabel, setServingLabel] = useState(start.label);
  const [submitting, setSubmitting] = useState(false);
  const parsed = parseGramsInput(gramsInput);

  const add = async () => {
    if (parsed <= 0 || submitting) return;
    setSubmitting(true);
    const id = generateUuid();
    const qty = servingLabel || gramsServingLabel(parsed);
    if (await addFoodEntry(food, parsed, "snack", qty, { id })) onLogged(item.id, [id], qty);
    else setSubmitting(false);
  };

  // A link in the panel (Xem chi tiết) leaves through navigateFromSheet, so Back returns to Ngày tập, not to the sheet
  const leaveByLink = (e: React.MouseEvent) => {
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigateFromSheet(router, link.getAttribute("href")!);
  };

  return (
    <>
      {item.carbs && (
        <p role="status" data-align-group="training-log" className="m-0 px-1 text-sm font-semibold text-text tabular-nums">
          ≈ {servingLabel || gramsServingLabel(parsed)} {choice.short} · {formatAmount(Math.round(carbsIn(food, parsed)), "g")} g tinh bột
        </p>
      )}
      <div onClickCapture={leaveByLink}>
        <PortionPanel
          food={food}
          gramsInput={gramsInput}
          setGramsInput={setGramsInput}
          selectedServingLabel={servingLabel}
          setSelectedServingLabel={setServingLabel}
          mealSlot="snack"
          onAdd={add}
          isSubmitting={submitting}
        />
      </div>
    </>
  );
}

/**
 * Red Bull + mật mía (Hao 18/10): two portion areas, Red Bull in lon and mật mía in gam, and a live total of carbs
 * against the dose. It starts at 1 lon with mật mía topping up; Thêm logs two entries with one Hoàn tác.
 */
function MixPanel({ item, redBull, matMia, onLogged }: { item: TrainingCheckItem; redBull: FoodItem; matMia: FoodItem; onLogged: OnLogged }) {
  const { addFoodEntries } = useDiary();
  const dose = item.grams ?? 0;
  const start = mixPrefill(redBull, matMia, dose);
  const can = lonPortion(redBull, start.lons) ?? { grams: 0, label: "" };
  const [rbInput, setRbInput] = useState(gramsText(can.grams));
  const [rbLabel, setRbLabel] = useState(can.label);
  const [mmInput, setMmInput] = useState(gramsText(start.grams));
  const [mmLabel, setMmLabel] = useState(gramsServingLabel(start.grams));
  const [submitting, setSubmitting] = useState(false);
  const rb = parseGramsInput(rbInput);
  const mm = parseGramsInput(mmInput);

  const add = () => {
    if (submitting || rb + mm <= 0) return;
    setSubmitting(true);
    const parts = [
      { food: redBull, grams: rb, label: rbLabel || gramsServingLabel(rb), id: generateUuid(), short: "Red Bull" },
      { food: matMia, grams: mm, label: mmLabel || gramsServingLabel(mm), id: generateUuid(), short: "mật mía" },
    ].filter((p) => p.grams > 0);
    if (addFoodEntries(parts, "snack")) {
      onLogged(item.id, parts.map((p) => p.id), parts.map((p) => `${p.label} ${p.short}`).join(" + "));
    } else {
      setSubmitting(false);
    }
  };

  const area = (food: FoodItem, input: string, setInput: (v: string) => void, label: string, setLabel: (v: string) => void) => (
    <div data-align-group="training-mix" className="flex flex-col gap-2">
      <span className="text-base font-bold text-text">{food.nameVi}</span>
      <PortionArea food={food} gramsInput={input} setGramsInput={setInput} selectedServingLabel={label} setSelectedServingLabel={setLabel} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-card border border-transparent shadow-ring bg-surface p-4">
      {area(redBull, rbInput, setRbInput, rbLabel, setRbLabel)}
      <div className="border-t border-card-border pt-3">{area(matMia, mmInput, setMmInput, mmLabel, setMmLabel)}</div>
      <p role="status" data-align-group="training-mix" className="m-0 border-t border-card-border pt-3 text-sm font-semibold tabular-nums text-text">
        {carbTotal(carbsIn(redBull, rb) + carbsIn(matMia, mm), dose)}
      </p>
      <PillButton onClick={add} disabled={submitting || rb + mm <= 0}>
        Thêm vào Bữa phụ
      </PillButton>
    </div>
  );
}
