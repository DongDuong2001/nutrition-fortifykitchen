"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { kcalLabel, kcalValue } from "@/lib/kcal";
import { missingMicros, portionDetailOf, portionLabel, type HomeEntry, type HomeMeal, type HomeMode } from "@/lib/home";
import { mealFullySelected } from "@/lib/multi-select";
import { markUsed } from "@/lib/onboarding-store";
import { useDiary } from "@/lib/diary-store";
import { haptic } from "@/lib/haptics";
import { inkPill } from "./ink-pill";
import { MEAL_DOT } from "./meal-dot";
import { TemplatePill } from "@/components/templates/template-pill";
import { useRowMotion } from "./row-motion";
import { PullIndicator, usePullRefresh } from "./pull-refresh";
import { useTouchDrag } from "@/lib/use-touch-drag";
import { Expand } from "@/components/ui/expand";

const LONG_PRESS_MS = 500;
const MOVE_LIMIT_PX = 10;

const noSelect: React.CSSProperties = { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" };

// fix/dish-portion-label: the amount of every food row (Hôm nay, the share image, Chọn nhiều món) takes at most 40 % of
// the row and wraps there, so a long amount never squeezes the name to one letter per line; a short one is unchanged
const AMOUNT_GUARD = "max-w-[40%] shrink-0 text-right leading-none";

/** The share image's row: the same row without the button, long press or dot. A long name wraps. */
function ShareFoodRow({ entry }: { entry: HomeEntry }) {
  return (
    <div className="flex min-h-[30px] w-full items-center justify-between gap-2 border-b border-b-divider px-3 py-1 text-text">
      <span data-share-wrap className="min-w-0 break-words text-cap font-semibold leading-snug">{entry.name}</span>
      <span className={`${AMOUNT_GUARD} font-display text-callout font-bold tabular-nums text-text tracking-label`}>{portionLabel(entry)}</span>
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
      data-align-group="home-meals"
      className={`${motionClass} ${touchDrag?.enabled ? "m-drag-lift" : ""} relative flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-0 px-3 py-1 text-left after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-divider after:content-[''] lg:min-h-12 ${
        isDragging ? "opacity-40" : ""
      } ${
        selected ? "bg-cobalt text-on-accent" : "bg-transparent text-text"
      }`}
    >
      {/* The name, its markers and, on a line of its own, how it was weighed (cc-53b) */}
      <span className={`flex min-w-0 flex-wrap items-center gap-x-1.5 ${detail ? "py-0.5" : ""}`}>
        <span className="min-w-0 break-words text-callout font-semibold leading-tight line-clamp-2" title={entry.name}>
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
      <span className={`${AMOUNT_GUARD} font-condensed text-callout font-extrabold tabular-nums lg:text-[1.125rem] ${selected ? "text-sky" : "text-text"}`}>
        {quantity}
      </span>
    </button>
  );
}

/**
 * The meals card of the home body (V3): each meal a 44 px header row (tap the name = that meal alone, the cobalt + adds to it)
 * and its foods as 44 px rows (48 px from lg) (tap = that food alone, long press = edit, today only). The page scrolls on a
 * phone; from lg this card scrolls and its headers stick.
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
                    <span className={`${AMOUNT_GUARD} font-display text-callout font-medium tabular-nums ${checked ? "text-sky" : "text-secondary"}`}>
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
  templatePill,
  onFood,
  onMeal,
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
  /**
   * The "Chép ngày mẫu" pill at the top of the meals card of an empty day (it opens the picker, which also holds Hôm qua), and its ×
   * (hides the pill for this day only). Absent: no pill, the plain empty line shows.
   */
  templatePill?: { onOpen: () => void; onHide: () => void; hideLabel: string } | null;
  onFood: (id: string) => void;
  onMeal: (slot: HomeMeal["slot"]) => void;
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
  // The pill keeps its place while the empty row closes (the first food of the day)
  const lastPill = useRef<NonNullable<typeof templatePill> | null>(null);

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
  if (templatePill) lastPill.current = templatePill;
  const shownPill = templatePill ?? lastPill.current;
  return (
    // V3: a white card (178 px at 390) beside the vi chất card. The page scrolls on a phone; from lg the card keeps its own scroll.
    <div ref={listRef} data-food-scroll className="min-w-0 flex-1 overflow-hidden rounded-card bg-card lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain lg:border lg:border-card-border lg:shadow-card">
      {onPullRefresh && !readOnly && <PullIndicator {...pull} />}
      {/* cc-64 (A8): the first food of the day closes this row (150 ms) while the food's row rises in, so the list does
          not jump up 44 px. An empty day offers "Chép ngày mẫu" (NMEmpty); a day that is only viewed, or whose pill was hidden with
          its ×, keeps the plain line */}
      <Expand open={isEmpty && !!templatePill}>
        {shownPill && (
          <>
            {/* The empty line stays for screen readers while the pill stands in for it on the page */}
            <p className="sr-only">{`Chưa có món nào ${dayWord}`}</p>
            <TemplatePill onOpen={shownPill.onOpen} onHide={shownPill.onHide} hideLabel={shownPill.hideLabel} />
          </>
        )}
      </Expand>
      <Expand open={isEmpty && !templatePill} className="flex min-h-11 flex-col items-start px-3 pt-2 lg:flex-row lg:items-center lg:justify-between lg:gap-2 lg:py-2">
        <p className="m-0 text-callout font-semibold text-text">{readOnly ? "Chưa có món nào ngày này" : `Chưa có món nào ${dayWord}`}</p>
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
            {/* V3-SPEC §3.7: a 44 px row, the meal dot, the name, the kcal number (no unit) and a 44 px cobalt + */}
            <div
              data-tour="meal-pill"
              data-meal-header=""
              data-align-group="home-meals"
              className={`flex min-h-11 items-center pl-3 lg:sticky lg:top-0 lg:z-sticky ${mealSelected ? "bg-cobalt-tint" : "bg-card"} ${isDropTarget ? "ring-2 ring-inset ring-cobalt" : ""}`}
            >
              <button
                type="button"
                aria-pressed={mealSelected}
                aria-label={`Xem riêng ${meal.fullName.toLocaleLowerCase("vi-VN")}`}
                onClick={() => onMeal(meal.slot)}
                data-testid="meal-header"
                style={noSelect}
                className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left text-text"
              >
                <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${MEAL_DOT[meal.slot]}`} />
                <span className="whitespace-nowrap font-display text-callout font-extrabold uppercase leading-[1.1] tracking-[0.01em]">{meal.label}</span>
                <span className={`ml-0.5 font-condensed text-cap font-extrabold leading-none tabular-nums text-secondary ${isDropTarget ? "whitespace-normal" : "whitespace-nowrap"}`}>
                  {isDropTarget ? "Thả vào đây để chuyển" : meal.entries.length > 0 ? kcalValue(meal.kcal) : ""}
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
                  className="inline-flex h-11 w-11 flex-none items-center justify-center text-cobalt no-underline transition-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt active:scale-[0.97] motion-reduce:active:scale-100"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Link>
              )}
            </div>
            <div aria-hidden="true" className="mx-3 h-px bg-divider" />
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
              <p className="m-0 mx-3 flex min-h-11 items-center border-b border-b-divider text-cap font-normal text-secondary lg:min-h-12 lg:text-callout">
                {readOnly ? "Không có món" : "Chưa ăn"}
              </p>
            )}
          </section>
        );
      })}
      <p className="m-0 p-3 text-xs leading-snug text-secondary lg:text-cap">
        <span aria-hidden="true">●</span> Thiếu dữ liệu vi chất · chạm tên bữa để xem riêng bữa đó
      </p>
    </div>
  );
}
