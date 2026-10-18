"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDiary, type EntryView } from "../../lib/diary-store";
import { NO_ENERGY_MESSAGE, canLog, entryNumbers } from "../../lib/diary-edits";
import { MEAL_SLOTS, type MealSlot, getMealSlotNameVi } from "../../lib/meal-slot";
import { parseGramsInput } from "../../lib/portion";
import { formatAmount } from "../../lib/format";
import { nutrientName } from "../../lib/nutrients";
import { AppHeader } from "../ui/app-header";
import { ChipGroup } from "../ui/chip-group";
import { FormRow } from "../ui/form-row";
import { parseDecimalInput } from "../../lib/quick-entry";

import { hidesGrams, portionModeOf } from "../../lib/portion";
import { PortionArea } from "../ui/portion-area";
import { HOME_ROUTE } from "@/lib/nav";

const quickFieldClass =
  "h-12 w-full rounded-xl border-2 border-card-border bg-surface px-3 text-base text-text outline-none transition-colors focus:border-blue";

/**
 * Edit one diary entry: portion, meal, save or delete. Shown on the entry route, phone and desktop.
 * Starts from the view it is given, so the route renders it only once the diary is loaded.
 */
export function EntryEditor({ view }: { view: EntryView }) {
  const router = useRouter();
  const { updateEntry, deleteEntry } = useDiary();
  const food = view.food;
  // A food whose energy is unknown cannot take a new portion: its kcal would be written as 0 (NO_ENERGY_MESSAGE says so)
  const energyUnknown = food !== null && !canLog(food);
  const canPortion = view.canChangePortion && food !== null && !energyUnknown;

  const [gramsInput, setGramsInput] = useState(view.grams !== null ? String(view.grams) : "");
  const [servingLabel, setServingLabel] = useState(view.servingLabel);
  const [mealSlot, setMealSlot] = useState<MealSlot>(view.mealSlot);

  // A quick kcal entry (Chỉ ghi kcal) edits its name and numbers directly
  const quick = view.quick;
  const [quickName, setQuickName] = useState(view.name);
  const [quickKcal, setQuickKcal] = useState(quick && view.kcal !== null ? String(view.kcal) : "");
  const [quickProtein, setQuickProtein] = useState(quick?.protein != null ? String(quick.protein) : "");
  const [quickCarbs, setQuickCarbs] = useState(quick?.carbs != null ? String(quick.carbs) : "");
  const [quickFat, setQuickFat] = useState(quick?.fat != null ? String(quick.fat) : "");
  const quickValues = {
    kcal: parseDecimalInput(quickKcal),
    protein: parseDecimalInput(quickProtein),
    carbs: parseDecimalInput(quickCarbs),
    fat: parseDecimalInput(quickFat),
  };
  // A blank macro is unknown (null) and fine; typed text must be a number from 0 up
  const macroBad = (text: string, value: number | null) => text.trim() !== "" && value === null;
  const quickValid =
    quickValues.kcal !== null &&
    Math.round(quickValues.kcal) >= 1 &&
    !macroBad(quickProtein, quickValues.protein) &&
    !macroBad(quickCarbs, quickValues.carbs) &&
    !macroBad(quickFat, quickValues.fat);
  const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

  const grams = parseGramsInput(gramsInput);
  const canSave = quick ? quickValid : !canPortion || grams > 0;
  const preview = food && canPortion && grams > 0 ? entryNumbers(food, grams) : null;
  const iron = preview?.nutrients.iron ?? null;

  const handleSave = () => {
    if (!canSave) return;
    if (quick) {
      updateEntry(view.id, {
        mealSlot,
        quick: {
          name: quickName,
          calories: Math.round(quickValues.kcal ?? 0),
          protein: round1(quickValues.protein),
          carbs: round1(quickValues.carbs),
          fat: round1(quickValues.fat),
        },
      });
    } else {
      updateEntry(view.id, canPortion ? { grams, servingLabel, mealSlot } : { mealSlot });
    }
    router.push(HOME_ROUTE);
  };

  const handleDelete = () => {
    deleteEntry(view.id);
    router.push(HOME_ROUTE);
  };

  return (
    <div className="min-h-screen bg-page text-text font-sans">
      {/* Title is the food, subtitle the meal, as in design/screens/EditEntry.dc.html */}
      <AppHeader
        variant="sub"
        title={view.name}
        // The title keeps two lines; a longer name is shown in full above the meal
        subtitle={
          view.name.length > 40 ? (
            <>
              <span className="block break-words font-semibold">{view.name}</span>
              {getMealSlotNameVi(view.mealSlot)}
            </>
          ) : (
            getMealSlotNameVi(view.mealSlot)
          )
        }
        backHref={HOME_ROUTE}
      />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-8 pt-4">
        <section className="flex flex-col gap-4 rounded-[18px] lg:shadow-card border border-card-border bg-card p-4">
          {quick && (
            <div data-align-group="entry" className="flex w-full flex-col gap-3">
              <FormRow label="Tên" htmlFor="entry-quick-name">
                <input
                  id="entry-quick-name"
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  autoComplete="off"
                  className={quickFieldClass}
                />
              </FormRow>
              <FormRow label="Năng lượng (kcal)" htmlFor="entry-quick-kcal" required error={quickValues.kcal === null || Math.round(quickValues.kcal) < 1 ? "Nhập kcal lớn hơn 0" : undefined}>
                <input
                  id="entry-quick-kcal"
                  type="text"
                  inputMode="decimal"
                  value={quickKcal}
                  onChange={(e) => setQuickKcal(e.target.value)}
                  autoComplete="off"
                  className={`${quickFieldClass} text-right font-bold tabular-nums`}
                />
              </FormRow>
              <div className="grid grid-cols-3 gap-2">
                <FormRow label="Đạm (g)" htmlFor="entry-quick-protein">
                  <input id="entry-quick-protein" placeholder="—" aria-invalid={macroBad(quickProtein, quickValues.protein) ? true : undefined} type="text" inputMode="decimal" value={quickProtein} onChange={(e) => setQuickProtein(e.target.value)} autoComplete="off" className={`${quickFieldClass} text-right font-bold tabular-nums`} />
                </FormRow>
                <FormRow label="Tinh bột (g)" htmlFor="entry-quick-carbs">
                  <input id="entry-quick-carbs" placeholder="—" aria-invalid={macroBad(quickCarbs, quickValues.carbs) ? true : undefined} type="text" inputMode="decimal" value={quickCarbs} onChange={(e) => setQuickCarbs(e.target.value)} autoComplete="off" className={`${quickFieldClass} text-right font-bold tabular-nums`} />
                </FormRow>
                <FormRow label="Chất béo (g)" htmlFor="entry-quick-fat">
                  <input id="entry-quick-fat" placeholder="—" aria-invalid={macroBad(quickFat, quickValues.fat) ? true : undefined} type="text" inputMode="decimal" value={quickFat} onChange={(e) => setQuickFat(e.target.value)} autoComplete="off" className={`${quickFieldClass} text-right font-bold tabular-nums`} />
                </FormRow>
              </div>
              <p className="m-0 text-sm text-secondary">Món thêm nhanh không tính vào 22 vi chất. Ô bỏ trống sẽ hiện là — (chưa có dữ liệu), không tính là 0.</p>
            </div>
          )}

          {/* Portion: PortionArea with unit/gram tabs and steppers */}
          {!quick && food && (
          <div data-align-group="entry" className="flex w-full flex-col gap-2">
            {/* A gram or egg portion names its own fields (Bao nhiêu gam?); a unit one keeps the heading */}
            {portionModeOf(food) === "units" && <span className="text-sm font-bold">{hidesGrams(food) ? "Khẩu phần" : "Khối lượng"}</span>}
            <PortionArea
              food={food}
              gramsInput={gramsInput}
              setGramsInput={setGramsInput}
              selectedServingLabel={servingLabel}
              setSelectedServingLabel={setServingLabel}
              disabled={!canPortion}
              data-align-group="entry"
            />
            {energyUnknown && view.canChangePortion ? (
              <p role="note" className="m-0 text-sm text-secondary">{NO_ENERGY_MESSAGE}</p>
            ) : (
              view.portionNote && <p className="m-0 text-sm text-secondary">{view.portionNote}</p>
            )}
          </div>
          )}

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

          {/* Preview of the portion: kcal, Đạm, Béo, Iron (a quick entry has its own fields above) */}
          {!quick && (
            <div data-align-group="entry" className="grid w-full grid-cols-4 gap-2 rounded-xl bg-surface p-3">
              <Stat value={preview ? formatAmount(preview.calories, "kcal") : "—"} label="kcal" />
              <Stat value={preview ? `${formatAmount(preview.protein, "g")} g` : "—"} label="Đạm" />
              <Stat value={preview ? `${formatAmount(preview.fat, "g")} g` : "—"} label="Chất béo" />
              <Stat value={iron !== null ? `${formatAmount(iron, "mg")} mg` : "—"} label={nutrientName("iron")} />
            </div>
          )}

          {/* Actions */}
          <div data-align-group="entry" className="flex w-full flex-col gap-3">
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
              className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-transparent text-[15px] font-bold text-red transition-transform active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
              Xóa món này
            </button>
            <p className="m-0 text-center text-xs text-secondary">Sau khi xóa sẽ có nút “Hoàn tác” trong 5 giây.</p>
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
