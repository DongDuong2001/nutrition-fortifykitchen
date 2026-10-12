"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDiary, type EntryView } from "@/lib/diary-store";
import { entryNumbers } from "@/lib/diary-edits";
import { MEAL_SLOTS, type MealSlot, getMealSlotNameVi } from "@/lib/meal-slot";
import { parseGramsInput } from "@/lib/portion";
import { formatAmount } from "@/lib/format";
import { AppHeader } from "@/components/ui/app-header";
import { ChipGroup } from "@/components/ui/chip-group";

/**
 * Edit one diary entry: portion, meal, save or delete. Shown on the entry route, phone and desktop.
 * Starts from the view it is given, so the route renders it only once the diary is loaded.
 */
export function EntryEditor({ view }: { view: EntryView }) {
  const router = useRouter();
  const { updateEntry, deleteEntry } = useDiary();
  const food = view.food;
  const canPortion = view.canChangePortion && food !== null;

  const [gramsInput, setGramsInput] = useState(view.grams !== null ? String(view.grams) : "");
  const [servingLabel, setServingLabel] = useState(view.servingLabel);
  const [mealSlot, setMealSlot] = useState<MealSlot>(view.mealSlot);

  const grams = parseGramsInput(gramsInput);
  const canSave = !canPortion || grams > 0;
  const preview = food && canPortion && grams > 0 ? entryNumbers(food, grams) : null;
  const iron = preview?.nutrients.iron ?? null;

  const handleSave = () => {
    if (!canSave) return;
    updateEntry(view.id, canPortion ? { grams, servingLabel, mealSlot } : { mealSlot });
    router.push("/today");
  };

  const handleDelete = () => {
    deleteEntry(view.id);
    router.push("/today");
  };

  return (
    <div className="min-h-screen bg-page text-text font-sans">
      {/* Title is the food, subtitle the meal, as in design/screens/EditEntry.dc.html */}
      <AppHeader
        variant="sub"
        title={view.name}
        subtitle={getMealSlotNameVi(view.mealSlot)}
        backHref="/today"
        alignGroup="entry-header"
      />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-8 pt-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-4">
          {/* Portion: gram field and the food's serving chips */}
          <div data-align-group="entry" className="flex w-full flex-col gap-2">
            <span className="text-sm font-bold">Khối lượng</span>
            <div className="flex w-full items-stretch gap-2">
              <span
                className={`flex h-12 w-[104px] shrink-0 items-center gap-1.5 rounded-[10px] border-2 px-3 focus-within:ring-2 focus-within:ring-blue ${
                  canPortion ? "border-blue bg-card" : "border-card-border bg-page"
                }`}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Số gam"
                  value={gramsInput}
                  disabled={!canPortion}
                  onChange={(e) => {
                    setGramsInput(e.target.value);
                    setServingLabel(`${e.target.value} g`);
                  }}
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold tabular-nums outline-none focus-visible:outline-none disabled:opacity-60"
                />
                <span className="text-sm font-normal text-secondary">g</span>
              </span>
              <div role="group" aria-label="Khẩu phần" className="flex min-w-0 flex-1 gap-2">
                {food?.servings.map((s) => {
                  const active = servingLabel === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      disabled={!canPortion}
                      aria-pressed={active}
                      onClick={() => {
                        setGramsInput(String(s.grams));
                        setServingLabel(s.label);
                      }}
                      className={`h-12 min-w-0 flex-1 cursor-pointer rounded-[10px] border-0 px-2 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-60 ${
                        active ? "bg-ink text-on-dark font-bold" : "bg-page text-text"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {view.portionNote && <p className="m-0 text-sm text-secondary">{view.portionNote}</p>}
          </div>

          {/* Meal: inline chips, as in the design. The meal changes on Lưu. 3 columns on phone, 5 on desktop. */}
          <fieldset data-align-group="entry" className="m-0 flex w-full min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-bold">Chuyển sang bữa</legend>
            <ChipGroup
              columns={3}
              columnsLg={5}
              items={MEAL_SLOTS.map((slot) => ({
                id: slot.id,
                label: slot.nameVi,
                active: slot.id === mealSlot,
                onClick: () => setMealSlot(slot.id),
              }))}
            />
          </fieldset>

          {/* Preview of the portion: kcal, Đạm, Béo, Sắt */}
          <div data-align-group="entry" className="grid w-full grid-cols-4 gap-2 rounded-xl bg-page p-3">
            <Stat value={preview ? formatAmount(preview.calories, "kcal") : "—"} label="kcal" />
            <Stat value={preview ? `${formatAmount(preview.protein, "g")} g` : "—"} label="Đạm" />
            <Stat value={preview ? `${formatAmount(preview.fat, "g")} g` : "—"} label="Béo" />
            <Stat value={iron !== null ? `${formatAmount(iron, "mg")} mg` : "—"} label="Sắt" />
          </div>

          {/* Actions */}
          <div data-align-group="entry" className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-full border-0 bg-blue text-base font-bold text-on-accent transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              Lưu thay đổi
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-transparent text-[15px] font-bold text-red transition-transform active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
              Xoá món này
            </button>
            <p className="m-0 text-center text-xs text-secondary">Sau khi xoá sẽ có nút “Hoàn tác” trong 5 giây.</p>
          </div>
        </section>
      </div>

    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[17px] font-bold tabular-nums">{value}</div>
      <div className="text-[13px] text-secondary">{label}</div>
    </div>
  );
}
