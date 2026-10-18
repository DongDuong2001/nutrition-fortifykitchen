"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { PortionPanel } from "@/components/ui/portion-panel";
import { useDiary } from "@/lib/diary-store";
import { canLog } from "@/lib/diary-edits";
import { formatAmount, formatNumber } from "@/lib/format";
import { catalogFoodById, type FoodItem } from "@/lib/mock/foods";
import { MAX_UNIT_COUNT, gramsServingLabel, parseGramsInput, unitPortionText } from "@/lib/portion";
import { navigateFromSheet } from "@/lib/sheet-history";
import type { TrainingCheckItem } from "@/lib/training";
import { LON_STEP, carbsIn, gramsForCarbs, lonsForCarbs, mixPrefill, resolveChoices, unitServing, type ResolvedChoice } from "@/lib/training-foods";
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

type OnLogged = (itemId: string, entryIds: string[], qty: string) => void;

/**
 * cc-52: a tick on Ngày tập opens the portion sheet with the item's food, its Bự / Bé amount and Bữa phụ. Thêm logs the
 * entries (onLogged, with their ids for the tick's link); closing it logs nothing. Tinh bột nhanh's dose is grams of
 * carbs: mật mía opens the portion sheet at the grams that hold them, Red Bull and the mix count cans in half steps.
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
  const target = item.grams ?? 0;
  const byCan = choice && item.carbs && unitServing(choice.foods[0]) && (choice.foods.length === 2 || choice.key === "redbull");

  return (
    <div className="flex flex-col gap-3">
      {choices.length > 1 && (
        <fieldset data-align-group="training-log" className="m-0 flex flex-col border-0 p-0">
          <legend className="px-1 pb-1 text-[13px] font-semibold text-secondary">Chọn loại</legend>
          {choices.map((c) => (
            <label
              key={c.key}
              className={`flex min-h-[48px] items-center gap-3 border-t border-divider px-1 first-of-type:border-t-0 ${loggable(c) ? "cursor-pointer" : "cursor-default"}`}
            >
              <input
                type="radio"
                name="training-log-choice"
                value={c.key}
                checked={choiceKey === c.key}
                disabled={!loggable(c)}
                onChange={() => setChoiceKey(c.key)}
                className="h-[22px] w-[22px] shrink-0 accent-blue"
              />
              <span className="flex min-w-0 flex-1 flex-col py-1">
                <span className={`text-sm font-semibold ${loggable(c) ? "text-text" : "text-secondary"}`}>{c.label}</span>
                {c.missing.length > 0 && <span className="text-[13px] leading-snug text-secondary">Chưa có {c.missing.join(", ")} trong danh mục</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {/* Keyed by the choice: another choice starts from its own pre-filled amount */}
      {choice &&
        (byCan ? (
          <CanPanel key={choice.key} item={item} choice={choice} target={target} onLogged={onLogged} />
        ) : (
          <PortionChoice key={choice.key} item={item} choice={choice} onLogged={onLogged} />
        ))}
    </div>
  );
}

/** One food by grams, in the shared portion panel. A carbs dose pre-fills the grams that hold it and says so. */
function PortionChoice({ item, choice, onLogged }: { item: TrainingCheckItem; choice: ResolvedChoice; onLogged: OnLogged }) {
  const router = useRouter();
  const { addFoodEntry } = useDiary();
  const food = choice.foods[0];
  const grams = (item.carbs ? gramsForCarbs(food, item.grams ?? 0) : null) ?? item.grams ?? 0;
  const [gramsInput, setGramsInput] = useState(gramsText(grams));
  const [servingLabel, setServingLabel] = useState(item.servingLabel ?? gramsServingLabel(grams));
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
          ≈ {formatAmount(parsed, "g")} g {choice.short} · {formatAmount(Math.round(carbsIn(food, parsed)), "g")} g tinh bột
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
 * Red Bull, alone or with mật mía (Hao 18/10): cans in half steps (the portion panel's stepper counts whole units), the
 * mix's mật mía in grams, and a live total of carbs against the dose. The mix starts at 1 can, mật mía topping up.
 */
function CanPanel({ item, choice, target, onLogged }: { item: TrainingCheckItem; choice: ResolvedChoice; target: number; onLogged: OnLogged }) {
  const { addFoodEntry, addFoodEntries } = useDiary();
  const [redBull, matMia] = choice.foods;
  const can = unitServing(redBull)!;
  const start = matMia ? mixPrefill(redBull, matMia, target) : { lons: lonsForCarbs(redBull, target), grams: 0 };
  const [lons, setLons] = useState(start.lons);
  const [gramsInput, setGramsInput] = useState(gramsText(start.grams));
  const [submitting, setSubmitting] = useState(false);
  const grams = matMia ? parseGramsInput(gramsInput) : 0;
  const total = Math.round(carbsIn(redBull, lons * can.grams) + (matMia ? carbsIn(matMia, grams) : 0));
  const step = (d: number) => setLons((n) => Math.min(MAX_UNIT_COUNT, Math.max(LON_STEP, n + d)));

  const add = async () => {
    if (submitting) return;
    setSubmitting(true);
    const can1 = { food: redBull, grams: lons * can.grams, label: unitPortionText(can.label, lons), id: generateUuid() };
    const lonText = `${formatNumber(lons)} lon`;
    if (matMia && grams > 0) {
      const mm = { food: matMia, grams, label: gramsServingLabel(grams), id: generateUuid() };
      if (addFoodEntries([can1, mm], "snack")) return onLogged(item.id, [can1.id, mm.id], `${lonText} Red Bull + ${formatAmount(grams, "g")} g mật mía`);
    } else if (await addFoodEntry(redBull, can1.grams, "snack", can1.label, { id: can1.id })) {
      return onLogged(item.id, [can1.id], `${lonText} Red Bull`);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-card-border bg-surface p-4">
      <div data-align-group="training-can" className="flex min-h-[48px] items-center justify-between gap-3">
        <span className="min-w-0 text-base font-bold text-text">{redBull.nameVi}</span>
        <div role="group" aria-label="Số lon Red Bull" className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => step(-LON_STEP)}
            disabled={lons <= LON_STEP}
            aria-label="Bớt nửa lon"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-lg font-bold text-text active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-[64px] text-center text-[15px] font-bold tabular-nums text-text">
            {formatNumber(lons)} lon
          </span>
          <button
            type="button"
            onClick={() => step(LON_STEP)}
            disabled={lons >= MAX_UNIT_COUNT}
            aria-label="Thêm nửa lon"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-lg font-bold text-text active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100"
          >
            +
          </button>
        </div>
      </div>
      {matMia && (
        <label data-align-group="training-can" className="flex min-h-[48px] items-center justify-between gap-3 border-t border-card-border pt-3">
          <span className="min-w-0 text-base font-bold text-text">{matMia.nameVi}</span>
          <span className="flex h-11 w-[120px] shrink-0 items-center rounded-xl border-2 border-blue bg-card px-2 focus-within:ring-2 focus-within:ring-blue">
            <input
              type="text"
              inputMode="decimal"
              aria-label="Số gam mật mía"
              value={gramsInput}
              onChange={(e) => setGramsInput(e.target.value)}
              className="w-full border-0 bg-transparent text-right text-sm font-bold tabular-nums text-text outline-none"
            />
            <span className="ml-1 text-xs font-semibold text-secondary">g</span>
          </span>
        </label>
      )}
      <p role="status" data-align-group="training-can" className="m-0 border-t border-card-border pt-3 text-sm font-semibold tabular-nums text-text">
        Tinh bột {formatAmount(total, "g")} / {formatAmount(target, "g")} g
      </p>
      <PillButton onClick={add} disabled={submitting}>
        Thêm vào Bữa phụ
      </PillButton>
    </div>
  );
}
