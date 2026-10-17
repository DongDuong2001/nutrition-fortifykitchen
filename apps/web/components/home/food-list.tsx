"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { kcalLabel } from "@/lib/kcal";
import { missingMicros, portionLabel, type HomeEntry, type HomeMeal, type HomeMode } from "@/lib/home";
import { mealFullySelected } from "@/lib/multi-select";
import { markUsed } from "@/lib/onboarding-store";

const LONG_PRESS_MS = 500;
const MOVE_LIMIT_PX = 10;

const noSelect: React.CSSProperties = { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" };

/** The share image's row: the same row without the button, long press or dot. A long name wraps. */
function ShareFoodRow({ entry }: { entry: HomeEntry }) {
  return (
    <div className="flex min-h-7 w-full items-center justify-between gap-2 border-b border-b-divider px-3 py-1 text-text">
      <span className="min-w-0 break-words text-[13px] font-semibold leading-snug">{entry.name}</span>
      <span className="shrink-0 font-display text-[15px] font-medium leading-none tabular-nums text-secondary">{portionLabel(entry)}</span>
    </div>
  );
}

function FoodRow({
  entry,
  selected,
  editable,
  onSelect,
  tourTarget,
}: {
  entry: HomeEntry;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  tourTarget?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  const quantity = portionLabel(entry);
  const missing = missingMicros(entry);

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-tour={tourTarget}
      aria-label={`${entry.name}, ${quantity}${missing ? ", thiếu dữ liệu vi chất" : ""}`}
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
          markUsed("long-press-edit");
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
            aria-hidden="true"
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
export interface SelectProps {
  ids: ReadonlySet<string>;
  onToggleFood: (id: string) => void;
  onToggleMeal: (slot: HomeMeal["slot"]) => void;
}

/** Select mode: a 52 px checkbox row for every food, a 44 px meal header with Chọn cả bữa. */
function SelectList({ meals, select }: { meals: HomeMeal[]; select: SelectProps }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-paper pb-3">
      {meals
        .filter((meal) => meal.entries.length > 0)
        .map((meal) => {
          const all = mealFullySelected(select.ids, meal.entries);
          return (
            <section key={meal.slot} aria-label={meal.fullName}>
              <div className="sticky top-0 z-10 flex min-h-11 w-full items-center justify-between gap-2 bg-paper-dark px-3 text-text">
                <span className="text-[11px] font-extrabold leading-none">{meal.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-display text-[13px] font-bold leading-none tabular-nums">{kcalLabel(meal.kcal)}</span>
                  <button
                    type="button"
                    onClick={() => select.onToggleMeal(meal.slot)}
                    className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-1 text-[13px] font-bold text-blue"
                  >
                    {all ? "Bỏ chọn bữa" : "Chọn cả bữa"}
                  </button>
                </span>
              </div>
              {meal.entries.map((entry) => {
                const checked = select.ids.has(entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => select.onToggleFood(entry.id)}
                    className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-0 border-b border-b-divider px-3 text-left ${
                      checked ? "bg-cobalt text-on-accent" : "bg-transparent text-text"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 ${
                        checked ? "border-on-accent bg-on-accent text-cobalt" : "border-secondary"
                      }`}
                    >
                      {checked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug">{entry.name}</span>
                    <span className={`shrink-0 font-display text-[15px] font-medium leading-none tabular-nums ${checked ? "text-sky" : "text-secondary"}`}>
                      {portionLabel(entry)}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
    </div>
  );
}

export function FoodList({
  meals,
  mode,
  readOnly,
  isEmpty,
  canCopyYesterday,
  onFood,
  onMeal,
  onCopyYesterday,
  share = false,
  select,
}: {
  meals: HomeMeal[];
  mode: HomeMode;
  readOnly: boolean;
  isEmpty: boolean;
  canCopyYesterday: boolean;
  onFood: (id: string) => void;
  onMeal: (slot: HomeMeal["slot"]) => void;
  onCopyYesterday: () => void;
  /** The share image: meals with no food are left out, nothing is a control, no legend. */
  share?: boolean;
  /** Select mode (Chọn nhiều món): rows are checkboxes and nothing else is pressable. */
  select?: SelectProps;
}) {
  if (select) return <SelectList meals={meals} select={select} />;
  if (share) {
    return (
      <div className="min-w-0 flex-1 bg-paper pb-3">
        {meals
          .filter((meal) => meal.entries.length > 0)
          .map((meal) => (
            <section key={meal.slot} aria-label={meal.fullName}>
              <div className="flex h-[22px] w-full items-center justify-between gap-2 bg-paper-dark px-3 text-text">
                <span className="text-[11px] font-extrabold leading-none">{meal.label}</span>
                <span className="font-display text-[13px] font-bold leading-none tabular-nums">{kcalLabel(meal.kcal)}</span>
              </div>
              {meal.entries.map((entry) => (
                <ShareFoodRow key={entry.id} entry={entry} />
              ))}
            </section>
          ))}
      </div>
    );
  }
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
        const firstEntryId = meals.find((m) => m.entries.length > 0)?.entries[0].id;
        const mealSelected = mode.kind === "meal" && mode.slot === meal.slot;
        return (
          <section key={meal.slot} aria-label={meal.fullName}>
            <div
              className={`sticky top-0 z-10 flex h-[22px] w-full items-center gap-3 px-3 lg:h-11 ${
                mealSelected ? "bg-cobalt text-on-accent" : "bg-paper-dark text-text"
              }`}
            >
              <button
                type="button"
                aria-pressed={mealSelected}
                aria-label={`Xem riêng ${meal.fullName.toLocaleLowerCase("vi-VN")}`}
                onClick={() => onMeal(meal.slot)}
                style={noSelect}
                className="flex h-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 border-0 bg-transparent p-0 text-inherit"
              >
                <span className="text-[11px] font-extrabold leading-none">{meal.label}</span>
                <span className="font-display text-[13px] font-bold leading-none tabular-nums">
                  {meal.entries.length > 0 ? kcalLabel(meal.kcal) : ""}
                </span>
              </button>
              {!readOnly && (
                <Link
                  id={`home-add-${meal.slot}`}
                  href={`/add?meal=${meal.slot}`}
                  onClick={() => {
                    markUsed("meal-add");
                    rememberAddOpener(`home-add-${meal.slot}`);
                  }}
                  aria-label={`Thêm vào ${meal.fullName}`}
                  data-export="hide"
                  data-tour="meal-add"
                  className={`relative flex h-[22px] shrink-0 items-center text-[13px] font-bold leading-none no-underline transition-opacity duration-150 before:absolute before:-inset-y-[11px] before:-inset-x-2 before:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60 ${
                    mealSelected ? "text-on-accent focus-visible:outline-on-accent" : "text-blue focus-visible:outline-blue"
                  }`}
                >
                  + Thêm
                </Link>
              )}
            </div>
            {meal.entries.map((entry) => (
              <FoodRow
                key={entry.id}
                entry={entry}
                selected={mode.kind === "food" && mode.id === entry.id}
                editable={!readOnly}
                tourTarget={entry.id === firstEntryId ? "home-food-list" : undefined}
                onSelect={() => onFood(entry.id)}
              />
            ))}
            {meal.entries.length === 0 && (
              <p className="m-0 flex h-7 items-center border-b border-b-divider px-3 text-[13px] text-secondary lg:h-11">
                {readOnly ? "Không có món" : "Chưa ăn"}
              </p>
            )}
          </section>
        );
      })}
      <p className="m-0 px-3 pt-3 text-[11px] leading-snug text-secondary">
        <span aria-hidden="true">●</span> Thiếu dữ liệu vi chất · chạm tên bữa để xem riêng bữa đó
      </p>
    </div>
  );
}
