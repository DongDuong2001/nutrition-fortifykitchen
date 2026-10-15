"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { formatAmount } from "@/lib/format";
import { missingMicros, type HomeEntry, type HomeMeal, type HomeMode } from "@/lib/home";

const LONG_PRESS_MS = 500;
const MOVE_LIMIT_PX = 10;

const noSelect: React.CSSProperties = { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" };

function FoodRow({ entry, selected, editable, onSelect }: { entry: HomeEntry; selected: boolean; editable: boolean; onSelect: () => void }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  const quantity = entry.grams !== null ? `${formatAmount(entry.grams, "g")} g` : entry.qty;
  const missing = missingMicros(entry);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${entry.name}, ${quantity}`}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onSelect();
      }}
      onPointerDown={(e) => {
        if (!editable) return;
        origin.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          timer.current = null;
          suppressClick.current = true;
          router.push(`/entry/${entry.id}`);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_LIMIT_PX) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      style={noSelect}
      className={`flex h-7 w-full cursor-pointer items-center justify-between gap-2 border-0 border-b border-b-divider px-3 text-left lg:h-11 ${
        selected ? "bg-cobalt text-on-accent" : "bg-transparent text-text"
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate text-[13px] font-semibold leading-none" title={entry.name}>
          {entry.name}
        </span>
        {missing && (
          <span
            role="img"
            aria-label="Thiếu dữ liệu vi chất"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected ? "bg-sky" : "bg-muted-dark"}`}
          />
        )}
      </span>
      <span className={`shrink-0 font-display text-[15px] font-medium leading-none tabular-nums ${selected ? "text-sky" : "text-secondary"}`}>
        {quantity}
      </span>
    </button>
  );
}

/**
 * The left column of the home body: four meals, each a 24 px header (tap = that meal alone) and its foods
 * as 28 px rows (tap = that food alone, long press = edit, today only). Only this list scrolls; headers stick.
 */
export function FoodList({
  meals,
  mode,
  readOnly,
  isEmpty,
  canCopyYesterday,
  onFood,
  onMeal,
  onCopyYesterday,
}: {
  meals: HomeMeal[];
  mode: HomeMode;
  readOnly: boolean;
  isEmpty: boolean;
  canCopyYesterday: boolean;
  onFood: (id: string) => void;
  onMeal: (slot: HomeMeal["slot"]) => void;
  onCopyYesterday: () => void;
}) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-paper pb-3">
      {isEmpty && (
        <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-2">
          <p className="m-0 text-[13px] text-secondary">{readOnly ? "Chưa có món nào ngày này" : "Chưa có món nào hôm nay"}</p>
          {canCopyYesterday && (
            <button
              type="button"
              onClick={onCopyYesterday}
              className="min-h-11 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-2 text-[13px] font-bold text-blue"
            >
              Chép hôm qua
            </button>
          )}
        </div>
      )}
      {meals.map((meal) => {
        const mealSelected = mode.kind === "meal" && mode.slot === meal.slot;
        return (
          <section key={meal.slot} aria-label={meal.fullName}>
            <button
              type="button"
              aria-pressed={mealSelected}
              aria-label={`Xem riêng ${meal.fullName.toLocaleLowerCase("vi-VN")}`}
              onClick={() => onMeal(meal.slot)}
              style={noSelect}
              className={`sticky top-0 z-10 flex h-6 w-full cursor-pointer items-center justify-between gap-2 border-0 px-3 lg:h-11 ${
                mealSelected ? "bg-cobalt text-on-accent" : "bg-paper-dark text-text"
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase leading-none tracking-[0.04em]">{meal.label}</span>
              <span className="font-display text-[13px] font-bold leading-none tabular-nums">
                {meal.entries.length > 0 ? `${formatAmount(meal.kcal, "kcal")} kcal` : ""}
              </span>
            </button>
            {meal.entries.map((entry) => (
              <FoodRow
                key={entry.id}
                entry={entry}
                selected={mode.kind === "food" && mode.id === entry.id}
                editable={!readOnly}
                onSelect={() => onFood(entry.id)}
              />
            ))}
            {meal.entries.length === 0 &&
              (readOnly ? (
                <p className="m-0 flex h-7 items-center border-b border-b-divider px-3 text-[13px] text-secondary lg:h-11">Chưa ăn</p>
              ) : (
                <Link
                  id={`home-add-${meal.slot}`}
                  href={`/add?meal=${meal.slot}`}
                  onClick={() => rememberAddOpener(`home-add-${meal.slot}`)}
                  aria-label={`Thêm vào ${meal.fullName}`}
                  className="relative flex h-7 items-center border-b border-b-divider px-3 text-[13px] text-secondary no-underline before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] lg:h-11"
                >
                  Chưa ăn · <span className="ml-1 font-bold text-blue">Thêm</span>
                </Link>
              ))}
          </section>
        );
      })}
      <p className="m-0 px-3 pt-3 text-[11px] leading-snug text-secondary">
        <span aria-hidden="true">●</span> Thiếu dữ liệu vi chất · chạm tên bữa để xem riêng bữa đó
      </p>
    </div>
  );
}
