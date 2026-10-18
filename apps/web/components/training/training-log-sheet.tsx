"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { PortionPanel } from "@/components/ui/portion-panel";
import { useDiary } from "@/lib/diary-store";
import { canLog } from "@/lib/diary-edits";
import { catalogFoodById, type FoodItem } from "@/lib/mock/foods";
import { gramsServingLabel, parseGramsInput } from "@/lib/portion";
import { navigateFromSheet } from "@/lib/sheet-history";
import type { TrainingCheckItem } from "@/lib/training";
import { resolveChoices, type ResolvedChoice } from "@/lib/training-foods";
import { generateUuid } from "@/lib/uuid";

/** Grams as the gram field takes them: a decimal comma and no thousands dot (formatAmount's "1.000" reads as 1 g). */
export const gramsText = (grams: number) => String(grams).replace(".", ",");

/** What a checklist item can log now: its catalogue choices (one food each; a missing one cannot be picked). */
export function itemChoices(item: TrainingCheckItem, foods: readonly FoodItem[]): ResolvedChoice[] {
  if (item.own) {
    const food = catalogFoodById(item.foodId) ?? null;
    return [{ key: item.id, label: item.label, food, missing: food ? [] : [item.label] }];
  }
  return resolveChoices(item.foods ?? [], foods);
}

/** An item logs to the diary when one of its choices is a food that can be logged; otherwise it is tick-only. */
export const canLogItem = (item: TrainingCheckItem, foods: readonly FoodItem[]) =>
  itemChoices(item, foods).some((c) => c.food && canLog(c.food));

/**
 * cc-52: a tick on Ngày tập opens the portion sheet with the item's food, its Bự / Bé amount and Bữa phụ. Thêm logs
 * the entry (onLogged, with its id for the tick's link); closing it logs nothing.
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
  onLogged: (itemId: string, entryId: string, qty: string) => void;
}) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.label} titleId="training-log-title" description="Ghi vào Bữa phụ" desktopDialog>
      {item && <LogBody item={item} foods={foods} onLogged={onLogged} />}
    </Sheet>
  );
}

function LogBody({ item, foods, onLogged }: { item: TrainingCheckItem; foods: readonly FoodItem[]; onLogged: (itemId: string, entryId: string, qty: string) => void }) {
  const router = useRouter();
  const { addFoodEntry } = useDiary();
  const choices = itemChoices(item, foods);
  const [choiceKey, setChoiceKey] = useState(() => choices.find((c) => c.food)?.key ?? "");
  const grams = item.grams ?? 0;
  const prefillLabel = item.servingLabel ?? gramsServingLabel(grams);
  const [gramsInput, setGramsInput] = useState(gramsText(grams));
  const [servingLabel, setServingLabel] = useState(prefillLabel);
  const [submitting, setSubmitting] = useState(false);
  const food = choices.find((c) => c.key === choiceKey)?.food ?? null;

  const pick = (key: string) => {
    setChoiceKey(key);
    setGramsInput(gramsText(grams));
    setServingLabel(prefillLabel);
  };

  const add = async () => {
    const parsed = parseGramsInput(gramsInput);
    if (!food || parsed <= 0 || submitting) return;
    setSubmitting(true);
    const id = generateUuid();
    const qty = servingLabel || gramsServingLabel(parsed);
    if (await addFoodEntry(food, parsed, "snack", qty, { id })) onLogged(item.id, id, qty);
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
    <div className="flex flex-col gap-3">
      {choices.length > 1 && (
        <fieldset data-align-group="training-log" className="m-0 flex flex-col border-0 p-0">
          <legend className="px-1 pb-1 text-[13px] font-semibold text-secondary">Chọn loại</legend>
          {choices.map((c) => (
            <label
              key={c.key}
              className={`flex min-h-[48px] items-center gap-3 border-t border-divider px-1 first-of-type:border-t-0 ${c.food ? "cursor-pointer" : "cursor-default"}`}
            >
              <input
                type="radio"
                name="training-log-choice"
                value={c.key}
                checked={choiceKey === c.key}
                disabled={!c.food}
                onChange={() => pick(c.key)}
                className="h-[22px] w-[22px] shrink-0 accent-blue"
              />
              <span className="flex min-w-0 flex-1 flex-col py-1">
                <span className={`text-sm font-semibold ${c.food ? "text-text" : "text-secondary"}`}>{c.label}</span>
                {!c.food && (
                  <span className="text-[13px] leading-snug text-secondary">
                    {c.missing.length > 0 ? `Chưa có ${c.missing.join(", ")} trong danh mục` : "Chưa có cách chia liều cho món trộn"}
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {food && (
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
      )}
    </div>
  );
}
