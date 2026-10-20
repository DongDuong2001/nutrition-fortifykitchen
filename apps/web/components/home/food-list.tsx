"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { kcalLabel } from "@/lib/kcal";
import { missingMicros, portionDetailOf, portionLabel, type HomeEntry, type HomeMeal, type HomeMode } from "@/lib/home";
import { mealFullySelected } from "@/lib/multi-select";
import { markUsed } from "@/lib/onboarding-store";
import { useDiary } from "@/lib/diary-store";
import { haptic } from "@/lib/haptics";
import { inkPill } from "./ink-pill";
import { useRowMotion } from "./row-motion";
import { PullIndicator, usePullRefresh } from "./pull-refresh";
import { useTouchDrag } from "@/lib/use-touch-drag";
import { Expand } from "@/components/ui/expand";

const LONG_PRESS_MS = 500;
const MOVE_LIMIT_PX = 10;

const noSelect: React.CSSProperties = { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" };

/** The share image's row: the same row without the button, long press or dot. A long name wraps. */
function ShareFoodRow({ entry }: { entry: HomeEntry }) {
  return (
    <div className="flex min-h-[30px] w-full items-center justify-between gap-2 border-b border-b-divider px-3 py-1 text-text">
      <span data-share-wrap className="min-w-0 break-words text-cap font-semibold leading-snug">{entry.name}</span>
      <span className="shrink-0 whitespace-nowrap font-display text-callout font-bold leading-none tabular-nums text-text tracking-label">{portionLabel(entry)}</span>
    </div>
  );
}

function FoodRow({
  entry,
  selected,
  editable,
  onSelect,
  onLongPress,
  tourTarget,
  motionClass = "",
  touchDrag,
}: {
  entry: HomeEntry;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onLongPress?: (id: string) => void;
  tourTarget?: string;
  /** cc-51: m-row-enter for a row that just arrived (row-motion.ts) */
  motionClass?: string;
  /** cc-70: hold, then drag to another meal (touch and pen). Off: the long press alone. */
  touchDrag?: { enabled: boolean; onTarget: (slot: HomeMeal["slot"] | null) => void; onDrop: (slot: HomeMeal["slot"]) => void };
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  const quantity = portionLabel(entry);
  const detail = portionDetailOf(entry);
  const missing = missingMicros(entry);
  // The server has not saved it yet (live mode): it stays on the device and is sent again
  const { unsavedIds, localOnlyIds } = useDiary();
  const unsaved = unsavedIds.has(entry.id);
  // Review 05:30 M1: a food without a server row (a recipe made in the app) stays on this device only
  const localOnly = localOnlyIds.has(entry.id);

  // Released after the lift without moving: the long press, as before
  const longPress = () => {
    suppressClick.current = true;
    markUsed("long-press-edit");
    if (onLongPress) onLongPress(entry.id);
    else router.push(`/entry/${entry.id}`);
  };
  const drag = useTouchDrag({
    enabled: editable && !!touchDrag?.enabled,
    slot: entry.slot,
    onLongPress: longPress,
    onTarget: (slot) => touchDrag?.onTarget(slot as HomeMeal["slot"] | null),
    onDrop: (slot) => touchDrag?.onDrop(slot as HomeMeal["slot"]),
  });

  return (
    <button
      type="button"
      draggable={editable}
      onDragStart={(e) => {
        // A finger or a pen drags through the pointer events, not through the browser's own drag
        if (drag.touchLast() && touchDrag?.enabled) {
          e.preventDefault();
          return;
        }
        cancel();
        setIsDragging(true);
        e.dataTransfer.setData("application/json", JSON.stringify({ id: entry.id, fromSlot: entry.slot }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      aria-pressed={selected}
      data-tour={tourTarget}
      data-entry-id={entry.id}
      aria-label={`${entry.name}, ${quantity}${detail ? `, ${detail}` : ""}${missing ? ", thiếu dữ liệu vi chất" : ""}${unsaved ? ", chưa lưu" : ""}${localOnly ? ", chỉ trên máy này" : ""}`}
      onClick={() => {
        if (suppressClick.current || drag.justLifted.current) {
          suppressClick.current = false;
          drag.justLifted.current = false;
          return;
        }
        onSelect();
      }}
      onPointerDown={(e) => {
        if (drag.onPointerDown(e)) return;
        if (!editable) return;
        origin.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          timer.current = null;
          suppressClick.current = true;
          haptic("longPress");
          markUsed("long-press-edit");
          if (onLongPress) {
            onLongPress(entry.id);
          } else {
            router.push(`/entry/${entry.id}`);
          }
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (drag.onPointerMove(e)) return;
        const o = origin.current;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_LIMIT_PX) cancel();
      }}
      onPointerUp={(e) => {
        if (!drag.onPointerUp(e)) cancel();
      }}
      onPointerCancel={(e) => {
        if (!drag.onPointerCancel(e)) cancel();
      }}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      style={noSelect}
      className={`${motionClass} ${touchDrag?.enabled ? "m-drag-lift" : ""} flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 border-0 border-b border-b-divider px-3 py-1 text-left lg:min-h-12 ${
        isDragging ? "opacity-40" : ""
      } ${
        selected ? "bg-cobalt text-on-accent" : "bg-transparent text-text"
      }`}
    >
      {/* The name, its markers and, on a line of its own, how it was weighed (cc-53b) */}
      <span className={`flex min-w-0 flex-wrap items-center gap-x-1.5 ${detail ? "py-0.5" : ""}`}>
        <span className="min-w-0 break-words text-cap font-semibold leading-tight line-clamp-2 lg:text-callout" title={entry.name}>
          {entry.name}
        </span>
        {missing && (
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected ? "bg-sky" : "bg-secondary"}`}
          />
        )}
        {unsaved && (
          <span
            aria-hidden="true"
            data-unsaved
            data-tour="unsaved-marker"
            className={`shrink-0 whitespace-nowrap text-micro font-semibold leading-none ${selected ? "text-sky" : "text-secondary"}`}
          >
            Chưa lưu
          </span>
        )}
        {localOnly && (
          <span
            aria-hidden="true"
            data-local-only
            className={`shrink-0 whitespace-nowrap text-micro font-semibold leading-none ${selected ? "text-sky" : "text-secondary"}`}
          >
            Chỉ trên máy này
          </span>
        )}
        {/* Today.dc.html: Cân sống, Đã nấu chín · 100 g × 3, Cỡ lớn */}
        {detail && <span className={`basis-full text-micro leading-tight lg:text-cap ${selected ? "text-sky" : "text-secondary"}`}>{detail}</span>}
      </span>
      <span className={`shrink-0 font-display text-callout font-extrabold leading-none tabular-nums lg:text-[1.125rem] ${selected ? "text-sky" : "text-text"}`}>
        {quantity}
      </span>
    </button>
  );
}

/**
 * The left column of the home body: four meals, each an ink pill header (tap = that meal alone) and its foods
 * as 32 px rows (48 px from lg) (tap = that food alone, long press = edit, today only). Only this list scrolls; headers stick.
 */
export interface SelectProps {
  ids: ReadonlySet<string>;
  onToggleFood: (id: string) => void;
  onToggleMeal: (slot: HomeMeal["slot"]) => void;
}

/** Select mode: a 52 px checkbox row for every food, a 44 px meal header with Chọn cả bữa. */
function SelectList({ meals, select }: { meals: HomeMeal[]; select: SelectProps }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-page pb-3">
      {meals
        .filter((meal) => meal.entries.length > 0)
        .map((meal) => {
          const all = mealFullySelected(select.ids, meal.entries);
          return (
            <section key={meal.slot} aria-label={meal.fullName}>
              <div className="sticky top-0 z-sticky flex min-h-11 w-full items-center justify-between gap-2 bg-paper-dark px-3 text-text">
                <span className="text-micro font-extrabold leading-none">{meal.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-display text-cap font-bold leading-none tabular-nums tracking-label">{kcalLabel(meal.kcal)}</span>
                  <button
                    type="button"
                    onClick={() => select.onToggleMeal(meal.slot)}
                    className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-1 text-cap font-bold text-cobalt"
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
                    <span className="min-w-0 flex-1 break-words text-cap font-semibold leading-snug">{entry.name}</span>
                    <span className={`shrink-0 font-display text-callout font-medium leading-none tabular-nums ${checked ? "text-sky" : "text-secondary"}`}>
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
  dayWord = "hôm nay",
  addDate,
  isEmpty,
  canCopyYesterday,
  copyLabel = "Chép hôm qua",
  onFood,
  onMeal,
  onCopyYesterday,
  onLongPressSelect,
  onMoveFood,
  touchDrag = true,
  share = false,
  select,
  dayKey = "",
  onPullRefresh,
}: {
  meals: HomeMeal[];
  mode: HomeMode;
  /** A day older than yesterday: nothing can be added, edited or moved. */
  readOnly: boolean;
  /** "hôm nay" or "hôm qua": the day shown, for the empty line. */
  dayWord?: string;
  /** The day a food added from here goes to, when it is not today (yesterday): /add?date=. */
  addDate?: string;
  isEmpty: boolean;
  canCopyYesterday: boolean;
  /** The label of the copy button: "Chép hôm qua", or "Chép hôm kia" on yesterday. */
  copyLabel?: string;
  onFood: (id: string) => void;
  onMeal: (slot: HomeMeal["slot"]) => void;
  onCopyYesterday: () => void;
  onLongPressSelect?: (id: string) => void;
  onMoveFood?: (entryId: string, targetSlot: HomeMeal["slot"]) => void;
  /** cc-70: foods lift after a hold and drag to another meal with a finger. False while a sheet is open. */
  touchDrag?: boolean;
  /** The share image: meals with no food are left out, nothing is a control, no legend. */
  share?: boolean;
  /** Select mode (Chọn nhiều món): rows are checkboxes and nothing else is pressable. */
  select?: SelectProps;
  /** The day shown: rows of another day are a new list, so no row enters, leaves or moves when it changes (cc-51); the day itself slides in (home-screen .m-day-*). */
  dayKey?: string;
  /** Pull to refresh (cc-51): today only. */
  onPullRefresh?: () => Promise<void>;
}) {
  const [dragOverSlot, setDragOverSlot] = useState<HomeMeal["slot"] | null>(null);
  const { listRef, rowsOf } = useRowMotion(meals, dayKey);
  const pull = usePullRefresh(listRef, onPullRefresh, !share && !select && !readOnly);
  // Whether the empty-day line offered Như hôm qua: it keeps the button while it closes
  const hadCopy = useRef(false);

  if (select) return <SelectList meals={meals} select={select} />;
  if (share) {
    const pill = inkPill(true);
    return (
      <div className="min-w-0 flex-1 bg-page pb-3">
        {meals
          .filter((meal) => meal.entries.length > 0)
          .map((meal) => (
            <section key={meal.slot} aria-label={meal.fullName}>
              <div className={pill.wrap}>
                <div data-ink-pill className={`${pill.pill} justify-between bg-ink text-on-dark`}>
                  <span className={pill.label}>{meal.label}</span>
                  <span className={pill.kcal}>{kcalLabel(meal.kcal)}</span>
                </div>
              </div>
              {meal.entries.map((entry) => (
                <ShareFoodRow key={entry.id} entry={entry} />
              ))}
            </section>
          ))}
      </div>
    );
  }
  const pill = inkPill();
  if (isEmpty) hadCopy.current = canCopyYesterday;
  return (
    <div ref={listRef} data-food-scroll className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-page pb-3 lg:rounded-2xl lg:border lg:border-card-border lg:shadow-card">
      {onPullRefresh && !readOnly && <PullIndicator {...pull} />}
      {/* cc-64 (A8): the first food of the day closes this line (150 ms) while the food's row rises in, so the list does
          not jump up 44 px; Như hôm qua stays in it while it closes */}
      <Expand open={isEmpty} className="flex min-h-11 flex-col items-start px-3 pt-2 lg:flex-row lg:items-center lg:justify-between lg:gap-2 lg:py-2">
          <p className="m-0 text-callout font-semibold text-text">{readOnly ? "Chưa có món nào ngày này" : `Chưa có món nào ${dayWord}`}</p>
          {(isEmpty ? canCopyYesterday : hadCopy.current) && (
            <button
              type="button"
              onClick={onCopyYesterday}
              className="-mx-2 min-h-11 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-2 text-cap font-bold text-cobalt lg:mx-0"
            >
              {copyLabel}
            </button>
          )}
      </Expand>
      {meals.map((meal) => {
        const firstEntryId = meals.find((m) => m.entries.length > 0)?.entries[0].id;
        const mealSelected = mode.kind === "meal" && mode.slot === meal.slot;
        const isDropTarget = dragOverSlot === meal.slot;
        return (
          <section
            key={meal.slot}
            aria-label={meal.fullName}
            data-meal-slot={meal.slot}
            onDragOver={(e) => {
              if (readOnly) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragEnter={(e) => {
              if (readOnly) return;
              e.preventDefault();
              setDragOverSlot(meal.slot);
            }}
            onDragLeave={(e) => {
              if (readOnly) return;
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverSlot((curr) => (curr === meal.slot ? null : curr));
              }
            }}
            onDrop={(e) => {
              if (readOnly) return;
              e.preventDefault();
              setDragOverSlot(null);
              try {
                const raw = e.dataTransfer.getData("application/json");
                if (!raw) return;
                const data = JSON.parse(raw);
                if (data.id && data.fromSlot !== meal.slot && onMoveFood) {
                  onMoveFood(data.id, meal.slot);
                }
              } catch {
                // Ignore parse error
              }
            }}
            className={`transition-press ${
              isDropTarget ? "bg-cobalt/10 ring-2 ring-cobalt/60 rounded-xl" : ""
            }`}
          >
            <div className={`sticky top-0 z-sticky ${pill.wrap}`}>
            <div data-ink-pill data-tour="meal-pill" className={`${pill.pill} ${mealSelected ? "bg-cobalt" : "bg-ink"} text-on-dark ${isDropTarget ? "ring-2 ring-sky" : ""}`}>
              <button
                type="button"
                aria-pressed={mealSelected}
                aria-label={`Xem riêng ${meal.fullName.toLocaleLowerCase("vi-VN")}`}
                onClick={() => onMeal(meal.slot)}
                data-testid="meal-header"
                style={noSelect}
                className="relative flex min-w-0 flex-1 cursor-pointer flex-wrap items-center self-stretch justify-between gap-x-2 gap-y-0.5 border-0 bg-transparent px-0 py-0.5 text-left text-inherit before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] lg:before:-inset-y-1"
              >
                <span className={pill.label}>{meal.label}</span>
                <span className={`${pill.kcal} ${isDropTarget ? "shrink whitespace-normal text-right" : ""}`}>
                  {isDropTarget ? "Thả vào đây để chuyển" : meal.entries.length > 0 ? kcalLabel(meal.kcal) : ""}
                </span>
              </button>
              {!readOnly && (
                <Link
                  id={`home-add-${meal.slot}`}
                  href={addDate ? `/add?meal=${meal.slot}&date=${addDate}` : `/add?meal=${meal.slot}`}
                  onClick={() => {
                    markUsed("meal-add");
                    rememberAddOpener(`home-add-${meal.slot}`);
                  }}
                  aria-label={`Thêm vào ${meal.fullName}`}
                  data-export="hide"
                  data-tour="meal-add"
                  data-testid="meal-add"
                  className={`relative flex h-6 shrink-0 items-center text-xs font-bold leading-none no-underline transition-press before:absolute before:-inset-y-2.5 before:-inset-x-2 before:content-[''] hover:text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60 lg:h-9 lg:text-cap lg:before:-inset-y-1 ${
                    mealSelected ? "text-on-accent focus-visible:outline-on-accent" : "text-sky focus-visible:outline-sky"
                  }`}
                >
                  + Thêm
                </Link>
              )}
            </div>
            </div>
            {rowsOf(meal).map(({ entry, state }) =>
              state === "exit" ? (
                <div key={entry.id} data-exiting className="m-row-exit" aria-hidden="true" inert>
                  <div>
                    <FoodRow entry={entry} selected={false} editable={false} onSelect={() => {}} />
                  </div>
                </div>
              ) : (
                <FoodRow
                  key={entry.id}
                  entry={entry}
                  selected={mode.kind === "food" && mode.id === entry.id}
                  editable={!readOnly}
                  tourTarget={entry.id === firstEntryId ? "home-food-list" : undefined}
                  onSelect={() => onFood(entry.id)}
                  onLongPress={onLongPressSelect}
                  motionClass={state === "enter" ? "m-row-enter" : ""}
                  touchDrag={
                    onMoveFood
                      ? { enabled: touchDrag && !readOnly, onTarget: setDragOverSlot, onDrop: (slot) => onMoveFood(entry.id, slot) }
                      : undefined
                  }
                />
              )
            )}
            {rowsOf(meal).length === 0 && (
              <p className="m-0 flex h-8 items-center border-b border-b-divider px-3 text-cap font-normal text-secondary lg:h-12 lg:text-callout">
                {readOnly ? "Không có món" : "Chưa ăn"}
              </p>
            )}
          </section>
        );
      })}
      <p className="m-0 px-3 pt-3 text-micro leading-snug text-secondary lg:text-cap">
        <span aria-hidden="true">●</span> Thiếu dữ liệu vi chất · chạm tên bữa để xem riêng bữa đó
      </p>
    </div>
  );
}
