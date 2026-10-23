"use client";

import React, { useCallback, useState } from "react";
import { Sheet, SHEET_EXIT_MS } from "@/components/ui/sheet";
import { SHEET_BACK_DELAY_MS } from "@/lib/sheet-history";
import { PillButton } from "@/components/ui/pill-button";
import { IconButton } from "@/components/ui/icon-button";
import { useDayTemplates } from "@/hooks/use-day-templates";
import type { FoodItem } from "@/lib/catalog";
import { useDiary } from "@/lib/diary-store";
import { deleteOwnFood } from "@/lib/own-food-actions";
import { foodUses, usedNote } from "@/lib/own-foods";
import { isRecipeId } from "@/lib/recipe";
import { markUsed } from "@/lib/onboarding-store";

/** Where Sửa món opens: the dish builder for a dish made from ingredients, Tự nhập filled in for any other own food. */
export const editFoodHref = (food: FoodItem, meal?: string | null) =>
  `/foods/new?${isRecipeId(food.id) ? "recipe" : "edit"}=${encodeURIComponent(food.id)}${meal ? `&meal=${meal}` : ""}`;

/**
 * Xoá món for the screens (Job C): no confirm, the food goes at once with a Hoàn tác toast. The one exception is a food a Ngày ăn mẫu
 * or a Bữa ăn đã lưu holds: the sheet says how many first (the diary keeps its numbers either way). `confirm` is that sheet; render it
 * once on the screen. `then` runs after the delete (the food page leaves itself).
 */
export function useOwnFoodDelete() {
  const { notifyUndo, savedMeals } = useDiary();
  const { templates } = useDayTemplates();
  const [asked, setAsked] = useState<{ food: FoodItem; uses: number; then?: () => void } | null>(null);
  const [open, setOpen] = useState(false);

  // `after`: the confirm sheet is still closing (it takes its history entry back when it has gone): a Back before that would only close it
  const run = useCallback(
    (food: FoodItem, then?: () => void, after = 0) => {
      if (!deleteOwnFood(food, notifyUndo) || !then) return;
      if (after > 0) window.setTimeout(then, after);
      else then();
    },
    [notifyUndo]
  );

  const requestDelete = useCallback(
    (food: FoodItem, then?: () => void) => {
      const uses = foodUses(food.id, savedMeals, templates);
      if (uses === 0) return run(food, then);
      setAsked({ food, uses, then });
      setOpen(true);
    },
    [run, savedMeals, templates]
  );

  const confirm = (
    <Sheet open={open} onClose={() => setOpen(false)} title={asked ? `Xoá ${asked.food.nameVi}?` : ""} titleId="own-food-delete-title" desktopDialog>
      <div className="flex flex-col gap-3">
        <p className="m-0 px-1 text-sm leading-snug text-secondary">{asked ? usedNote(asked.uses) : ""}</p>
        <PillButton type="button" variant="tertiary" onClick={() => setOpen(false)}>
          Huỷ
        </PillButton>
        <PillButton
          type="button"
          variant="destructive"
          onClick={() => {
            setOpen(false);
            if (asked) run(asked.food, asked.then, SHEET_EXIT_MS + SHEET_BACK_DELAY_MS + 100);
          }}
        >
          Xoá món
        </PillButton>
      </div>
    </Sheet>
  );
  return { requestDelete, confirm };
}

/** The ⋯ of a row in Món ăn của tôi: one 44 px button that opens the menu of that food (Sửa món, Xoá món). */
export function OwnFoodMenuButton({ food, onOpen, tour }: { food: FoodItem; onOpen: (food: FoodItem) => void; tour?: boolean }) {
  return (
    <IconButton
      label={`Tuỳ chọn cho ${food.nameVi}`}
      aria-haspopup="dialog"
      data-tour={tour ? "own-food-menu" : undefined}
      className="-mr-2 text-secondary"
      onClick={() => {
        markUsed("own-food-menu");
        onOpen(food);
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    </IconButton>
  );
}

/** What the ⋯ opens: Sửa món and Xoá món for that food, in the sheet the rest of the app uses. */
export function OwnFoodMenuSheet({ food, onClose, onDelete }: { food: FoodItem | null; onClose: () => void; onDelete: (food: FoodItem) => void }) {
  // The text stays while the sheet closes
  const [shown, setShown] = useState<FoodItem | null>(food);
  if (food && food !== shown) setShown(food);
  return (
    <Sheet open={food !== null} onClose={onClose} title={shown?.nameVi ?? ""} titleId="own-food-menu-title" desktopDialog>
      <div className="flex flex-col gap-3">
        {shown && (
          <PillButton type="button" variant="secondary" href={editFoodHref(shown)} replace onClick={onClose}>
            Sửa món
          </PillButton>
        )}
        <PillButton
          type="button"
          variant="danger"
          onClick={() => {
            const target = shown;
            onClose();
            if (target) onDelete(target);
          }}
        >
          Xoá món
        </PillButton>
      </div>
    </Sheet>
  );
}
