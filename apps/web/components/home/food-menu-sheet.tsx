"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { kcalLabel } from "@/lib/kcal";
import { portionLabel, type HomeEntry, type HomeMeal } from "@/lib/home";
import type { MealTargetSheet as MealTargetSheetType } from "./select-mode";

/**
 * Job I: the ⋯ of a food row on Hôm nay (a swipe to the right, or a tap on the ⋯ it shows): the actions a food already has. Sửa opens
 * the edit screen, Chuyển sang bữa… is the same move the hold-and-drag makes (the meal picker of Chọn nhiều món), Xoá is the delete
 * of the left swipe (no confirm: its toast has Hoàn tác). The text stays while the sheet closes.
 */
export function FoodMenuSheet({
  entry,
  onClose,
  onDelete,
  onMove,
}: {
  entry: HomeEntry | null;
  onClose: () => void;
  onDelete: (entry: HomeEntry) => void;
  onMove: (entry: HomeEntry, slot: HomeMeal["slot"]) => void;
}) {
  const router = useRouter();
  const [shown, setShown] = useState<HomeEntry | null>(entry);
  if (entry && entry !== shown) setShown(entry);
  const [moving, setMoving] = useState(false);
  // The meal picker is a chunk of select mode, already fetched when Hôm nay was idle: taken here once
  const [Picker, setPicker] = useState<typeof MealTargetSheetType | null>(null);
  useEffect(() => {
    if (entry && !Picker) void import("./select-mode").then((m) => setPicker(() => m.MealTargetSheet));
  }, [entry, Picker]);

  // Drawn on the body: the list card has its own clip and its day slides, and a sheet is fixed to the screen
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <>
      <Sheet open={entry !== null && !moving} onClose={onClose} title={shown?.name ?? ""} titleId="food-menu-title" description={shown ? `${portionLabel(shown)} · ${kcalLabel(shown.kcal)}` : undefined} desktopDialog>
        <div className="flex flex-col gap-3">
          <PillButton
            type="button"
            variant="secondary"
            onClick={() => {
              const target = shown;
              onClose();
              if (target) router.push(`/entry/${target.id}`);
            }}
          >
            Sửa
          </PillButton>
          <PillButton type="button" variant="secondary" onClick={() => setMoving(true)}>
            Chuyển sang bữa…
          </PillButton>
          <PillButton
            type="button"
            variant="danger"
            onClick={() => {
              const target = shown;
              onClose();
              if (target) onDelete(target);
            }}
          >
            Xoá
          </PillButton>
        </div>
      </Sheet>
      {Picker && shown && (
        <Picker
          open={entry !== null && moving}
          onClose={() => {
            setMoving(false);
            onClose();
          }}
          title={`Chuyển ${shown.name} sang`}
          description={`${portionLabel(shown)} · ${kcalLabel(shown.kcal)}`}
          withKeep={false}
          initial={shown.slot !== "pre_workout" ? shown.slot : "breakfast"}
          confirmLabel="Chuyển"
          onConfirm={(target) => {
            if (target === "keep") return;
            const picked = shown;
            setMoving(false);
            onClose();
            onMove(picked, target as HomeMeal["slot"]);
          }}
        />
      )}
    </>,
    document.body
  );
}

