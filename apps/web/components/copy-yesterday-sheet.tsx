"use client";

import { useMemo, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useDiary } from "@/lib/diary-store";
import { copyMeals, dayEntries, entriesKcal, shiftIsoDate } from "@/lib/day-history";
import { formatDayLabel } from "@/lib/format";
import { kcalLabel } from "@/lib/kcal";
import { MEAL_SLOTS, getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";
import type { AddedDiaryEntry } from "@/lib/diary-edits";

/** Meals that start unticked. The snack is left out by default, as in CopyYesterday.dc.html. */
const UNTICKED_BY_DEFAULT: MealSlot[] = ["snack"];

interface CopyYesterdaySheetProps {
  open: boolean;
  onClose: () => void;
  /** The day the meals are copied into (cc-68): today, or yesterday while it can be edited. Today when absent. */
  targetIso?: string;
}

/** "Chép bữa hôm qua?": pick the meals of the day before and copy them into the day on screen (today, or yesterday). */
export function CopyYesterdaySheet({ open, onClose, targetIso }: CopyYesterdaySheetProps) {
  const { todayIso, dayArchive } = useDiary();
  const target = targetIso ?? todayIso;
  const source = target ? shiftIsoDate(target, -1) : null;
  const entries = useMemo(
    () => (source && todayIso ? dayEntries(source, todayIso) : []),
    [source, todayIso, dayArchive]
  );

  if (!source || !target) return null;

  // Day label in the app's date style: "Hôm qua 12/10", and "Hôm kia" for the day before yesterday
  const sourceWord = target === todayIso ? "hôm qua" : "hôm kia";
  const dayLabel = target === todayIso ? formatDayLabel(source, new Date(`${todayIso}T12:00:00+07:00`)) : `Hôm kia ${source.slice(8)}/${source.slice(5, 7)}`;
  const description = `${dayLabel} · ${kcalLabel(entriesKcal(entries))}`;

  return (
    <Sheet open={open} onClose={onClose} title={`Chép bữa ${sourceWord}?`} description={description}>
      <CopyChoices entries={entries} onDone={onClose} target={target} sourceWord={sourceWord} isToday={target === todayIso} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so every opening starts from the default ticks.
function CopyChoices({ entries, onDone, target, sourceWord, isToday }: { entries: AddedDiaryEntry[]; onDone: () => void; target: string; sourceWord: string; isToday: boolean }) {
  const { copyEntries } = useDiary();
  const meals = MEAL_SLOTS.map((slot) => ({
    slot: slot.id,
    name: getMealSlotNameVi(slot.id),
    items: entries.filter((e) => e.mealSlot === slot.id),
  })).filter((meal) => meal.items.length > 0);

  const [ticked, setTicked] = useState<Set<MealSlot>>(
    () => new Set(meals.map((m) => m.slot).filter((slot) => !UNTICKED_BY_DEFAULT.includes(slot)))
  );

  function toggle(slot: MealSlot) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  const chosen = meals.filter((m) => ticked.has(m.slot)).map((m) => m.slot);

  function copy() {
    const copied = copyMeals(entries, chosen, `copy-${Date.now()}`, new Date().toISOString());
    // Each copy is sent as its own entry (copyEntries), so the device and the server share its id
    copyEntries(copied, `Đã chép ${chosen.length} bữa từ ${sourceWord}${isToday ? "" : " vào hôm qua"}`, target);
    onDone();
  }

  if (meals.length === 0) {
    return <div className="py-2 text-sm text-secondary">{sourceWord === "hôm qua" ? "Hôm qua" : "Hôm kia"} chưa ghi bữa nào.</div>;
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex flex-col gap-0.5">
        {meals.map((meal) => {
          const kcal = entriesKcal(meal.items);
          return (
            <label
              key={meal.slot}
              className="min-h-[52px] px-3 rounded-xl flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={ticked.has(meal.slot)}
                onChange={() => toggle(meal.slot)}
                className="h-6 w-6 m-0 shrink-0 accent-cobalt"
              />
              <span className="flex-1 text-base font-semibold text-text">{meal.name}</span>
              <span className="text-sm text-secondary tabular-nums">
                {meal.items.length} món · {kcalLabel(kcal)}
              </span>
            </label>
          );
        })}
      </div>
      <div className="text-cap text-secondary px-1">Món đã có {isToday ? "hôm nay" : "hôm qua"} sẽ không bị ghi đè.</div>
      <PillButton variant="primary" onClick={copy} disabled={chosen.length === 0} className="mt-2">
        {chosen.length > 0 ? `Chép ${chosen.length} bữa` : "Chọn bữa để chép"}
      </PillButton>
      <PillButton variant="secondary" onClick={onDone}>
        Hủy
      </PillButton>
    </div>
  );
}
