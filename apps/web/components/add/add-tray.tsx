"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PortionArea } from "@/components/ui/portion-area";
import { Expand } from "@/components/ui/expand";
import { Presence, usePresence } from "@/components/ui/presence";
import { NO_ENERGY_MESSAGE } from "@/lib/diary-edits";
import { formatAmount } from "@/lib/format";
import { markUsed } from "@/lib/onboarding-store";
import { gramFieldText, parseGramsInput, parsePortionLabel, portionHint, scaleNutrients } from "@/lib/portion";
import { setPresent } from "@/lib/tour-bus";
import { createStableKeys, type TrayItem, type TrayTotals } from "@/lib/tray";
import { AlertLine } from "@/components/ui/alert-line";

const kcalText = (kcal: number | null) => (kcal === null ? "—" : formatAmount(kcal, "kcal"));

export interface TrayBarProps {
  totals: TrayTotals;
  mealName: string;
  canAdd: boolean;
  submitting?: boolean;
  onReview: () => void;
  onAdd: () => void;
  className?: string;
}

/**
 * The bar under the /add list while the tray holds a food ("Hai hàng", Hao 19/10): the count and total with Xem lại on
 * row 1, the one primary action full width on row 2. Row 1 truncates, so 20 món and 12.345 kcal never overlap a button.
 */
export function TrayBar({ totals, mealName, canAdd, submitting = false, onReview, onAdd, className = "" }: TrayBarProps) {
  return (
    <div
      role="region"
      aria-label={`${totals.count} món · ${kcalText(totals.kcal)} kcal`}
      data-tray-bar
      data-tour="tray-bar"
      className={`flex flex-col gap-1.5 rounded-card bg-ink p-2 text-on-dark shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2 pl-3">
        <span aria-hidden="true" className="min-w-0 flex-1 truncate text-callout font-semibold leading-tight tabular-nums">
          {totals.count} món · <span className="font-display text-lg font-bold">{kcalText(totals.kcal)}</span> kcal
        </span>
        <button
          type="button"
          onClick={onReview}
          data-testid="tray-review"
          className="min-h-11 min-w-11 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-3 text-callout font-bold text-sky"
        >
          Xem lại
        </button>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd || submitting}
        data-testid="tray-add"
        className="flex h-12 w-full min-w-0 cursor-pointer items-center justify-center rounded-full border-0 bg-cobalt px-4 text-callout font-bold text-on-accent disabled:cursor-default disabled:opacity-50"
      >
        <span className="truncate">{`Thêm ${totals.count} món vào ${mealName}`}</span>
      </button>
    </div>
  );
}


/** The line beside Xong: the ×N sum, what a raw / cooked amount stands for, or how eggs are counted. */
function rowHint(item: TrayItem): string | null {
  const p = parsePortionLabel(item.label);
  if (!p) return null;
  if (p.kind === "egg") return p.size ? "Cỡ ghi trên hộp, app tự trừ vỏ." : null;
  // Logged at other grams than the amount set: a raw / cooked conversion (lib/portion portionDetail reads it the same way)
  const converted = p.state !== null && Math.abs(item.grams - p.base * p.mult) > 0.5;
  return converted ? `${portionHint(p)}, bằng khoảng ${formatAmount(Math.round(item.grams), "g")} g lúc ${p.state === "cooked" ? "sống" : "chín"}` : portionHint(p);
}

/** How long a removed card takes to leave: .m-row-exit (fade and height close, --m-row). */
const LEAVE_MS = 200;

interface TrayRowProps {
  item: TrayItem;
  open: boolean;
  first: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<TrayItem>) => void;
}

/**
 * One food of the tray (Tray.dc.html): a bordered card whose header opens its editor (one at a time, cc-55's Expand),
 * and a × apart from it. cc-64 (2b): the × fades the card and closes its height together with the 12 px gap above it
 * (.m-row-exit .m-gap-3), so the cards below glide up instead of jumping when the food leaves the tray.
 */
function TrayRow({ onRemove, ...props }: TrayRowProps) {
  const [leaving, setLeaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // The latest onRemove, so a re-render while the card leaves does not restart its timer
  const remove = useRef(onRemove);
  remove.current = onRemove;
  useEffect(() => {
    if (!leaving) return;
    // The full height is drawn once before it closes, so the close is a transition
    let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setCollapsed(true))));
    const timer = setTimeout(() => remove.current(), LEAVE_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [leaving]);
  return (
    <li className={leaving ? `m-row-exit m-gap-3 ${collapsed ? "m-collapsed" : ""}` : undefined} aria-hidden={leaving || undefined} inert={leaving || undefined}>
      <div>
        <TrayCard {...props} onRemove={() => setLeaving(true)} />
      </div>
    </li>
  );
}

/** The card: the editor is the portion sheet's own area, compact: Sống | Chín or the egg sizes, grams + 100 g, ×N, Xong. */
function TrayCard({ item, open, first, onToggle, onRemove, onChange }: TrayRowProps) {
  const state = usePresence();
  const { food } = item;
  const kcal = scaleNutrients(food.nutrients, item.grams).energy;
  const hint = rowHint(item);
  const editorId = `tray-edit-${food.id}`;
  return (
    <div data-state={state} data-align-group="tray-review" className="m-pop flex flex-col rounded-2xl border border-card-border bg-card">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={editorId}
          data-tour={first ? "tray-row" : undefined}
          onClick={onToggle}
          className="m-tint flex min-h-15 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-l-2xl border-0 bg-transparent py-2 pr-1 pl-3 text-left text-text"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span title={food.nameVi} className="line-clamp-2 break-words text-callout font-bold leading-snug">
              {food.nameVi}
            </span>
            <span className="text-cap text-secondary">{item.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="font-display text-xl font-extrabold tabular-nums">
              {typeof kcal === "number" ? formatAmount(kcal, "kcal") : "—"} <span className="text-cap text-secondary">kcal</span>
            </span>
            {/* .m-chevron turns while the button has aria-expanded="true" */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="m-chevron text-secondary-strong">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Bỏ khỏi khay: ${food.nameVi}`}
          className="mr-1.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <Expand open={open} id={editorId} className="flex flex-col gap-3 px-3 pb-3">
        <PortionArea
          food={food}
          gramsInput={gramFieldText(item.grams)}
          setGramsInput={(v) => onChange({ grams: parseGramsInput(v) })}
          selectedServingLabel={item.label}
          setSelectedServingLabel={(label) => onChange({ label })}
          onFoodChange={(next) => onChange({ food: next })}
          variant="tray"
          data-align-group="tray-edit"
        />
        <div data-align-group="tray-edit" data-align-edge="left" className="flex items-center justify-between gap-2">
          <span className="text-cap text-secondary-strong">{hint}</span>
          <button type="button" onClick={onToggle} className="h-11 shrink-0 cursor-pointer rounded-full border-0 bg-ink px-4 text-sm font-bold text-on-dark">
            Xong
          </button>
        </div>
      </Expand>
    </div>
  );
}

/** The ↓ above the footer while cards are below: it pops in and out (Presence + .m-pop). */
function MoreBelow({ onClick }: { onClick: () => void }) {
  const state = usePresence();
  return (
    <button
      type="button"
      data-state={state}
      aria-label="Còn món bên dưới, cuộn xuống"
      onClick={onClick}
      className="m-pop absolute inset-x-0 -top-14 mx-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-text shadow-md"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </button>
  );
}

export interface TrayReviewSheetProps {
  open: boolean;
  onClose: () => void;
  items: TrayItem[];
  totals: TrayTotals;
  mealName: string;
  canAdd: boolean;
  submitting?: boolean;
  onRemove: (foodId: string) => void;
  /** A change to one item: its grams and label, or the food (a raw / cooked pair) */
  onChangeItem: (foodId: string, patch: Partial<TrayItem>) => void;
  onChangeMeal: () => void;
  onAdd: () => void;
}

/**
 * "Khay · xem lại" (design/portion-mockup/Tray.dc.html): every food as a card that opens to edit, and a dark footer
 * floating over the list with the meal, the total and the one add (one write, one Hoàn tác). A ↓ shows above the
 * footer while foods are below.
 */
export function TrayReviewSheet({
  open,
  onClose,
  items,
  totals,
  mealName,
  canAdd,
  submitting = false,
  onRemove,
  onChangeItem,
  onChangeMeal,
  onAdd,
}: TrayReviewSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="tray-review-title" desktopDialog>
      <TrayReview
        items={items}
        totals={totals}
        mealName={mealName}
        canAdd={canAdd}
        submitting={submitting}
        onRemove={onRemove}
        onChangeItem={onChangeItem}
        onChangeMeal={onChangeMeal}
        onAdd={onAdd}
      />
    </Sheet>
  );
}

function TrayReview({ items, totals, mealName, canAdd, submitting, onRemove, onChangeItem, onChangeMeal, onAdd }: Omit<TrayReviewSheetProps, "open" | "onClose">) {
  // One row open at a time; the first opens when the sheet does, as in the design
  const [openId, setOpenId] = useState<string | null>(items[0]?.food.id ?? null);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  // A Sống ↔ Chín swap changes a card's food id: the card keeps its key, so it does not remount or lose focus
  const [cardKeys] = useState(createStableKeys);
  cardKeys.keep(items.map((i) => i.food.id));

  // The ↓: shown while the end of the list is under the footer (an IntersectionObserver, no scroll handler)
  useEffect(() => {
    const list = listRef.current;
    const end = endRef.current;
    if (!list || !end || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setMoreBelow(!entry.isIntersecting), { root: list, rootMargin: "0px 0px -232px 0px" });
    io.observe(end);
    return () => io.disconnect();
  }, []);

  // The row tip waits for the rows to be on screen
  const shown = items.length > 0;
  useEffect(() => {
    if (!shown) return;
    setPresent("tray", true);
    return () => setPresent("tray", false);
  }, [shown]);

  const kcal = kcalText(totals.kcal);

  return (
    <div data-tray-review className="relative -mx-4 -mb-6 flex h-[min(790px,88dvh)] flex-col lg:h-[min(720px,80dvh)]">
      <div className="flex shrink-0 flex-col gap-0.5 px-5 pb-3">
        <h2 id="tray-review-title" className="m-0 font-display text-headline font-bold uppercase leading-tight">
          Khay · xem lại
        </h2>
        <p className="m-0 text-cap text-secondary">
          {mealName} · {items.length} món · chạm từng món để chỉnh
        </p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-60">
        <ul data-align-container="tray-review" className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((item, i) => (
            <TrayRow
              key={cardKeys.keyFor(item.food.id)}
              item={item}
              first={i === 0}
              open={openId === item.food.id}
              onToggle={() => {
                markUsed("tray-row");
                setOpenId((id) => (id === item.food.id ? null : item.food.id));
              }}
              onRemove={() => onRemove(item.food.id)}
              onChange={(patch) => {
                if (patch.food && patch.food.id !== item.food.id) cardKeys.renamed(item.food.id, patch.food.id);
                onChangeItem(item.food.id, patch);
                // A pair swaps the food: its row stays open
                if (patch.food) setOpenId(patch.food.id);
              }}
            />
          ))}
        </ul>
        <AlertLine show={items.length > 0 && !canAdd} className="m-0 mt-3 rounded-xl bg-warning-bg px-3 py-2 text-cap leading-snug text-warning-text">
          {NO_ENERGY_MESSAGE}
        </AlertLine>
        <div ref={endRef} aria-hidden="true" className="h-px" />
      </div>

      {/* The footer floats over the list; the list's bottom padding lets the last card clear it */}
      <div className="absolute inset-x-3 bottom-4 flex flex-col gap-3 rounded-[22px] bg-ink p-4 text-on-dark shadow-2xl">
        <Presence>
          {moreBelow && (
            <MoreBelow
              onClick={() => {
                const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
                listRef.current?.scrollBy({ top: listRef.current.clientHeight * 0.7, behavior: reduce ? "auto" : "smooth" });
              }}
            />
          )}
        </Presence>
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold">Thêm vào</span>
          <button
            type="button"
            onClick={onChangeMeal}
            aria-label={`Thêm vào ${mealName}, đổi bữa`}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-on-dark/15 bg-surface-dark px-4 text-sm font-bold text-on-dark "
          >
            {mealName}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold text-muted-subtitle">Tổng cộng</span>
          <span className="font-display text-[1.875rem] font-bold leading-none tabular-nums">
            {kcal} <span className="text-callout text-sky">kcal</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd || submitting}
          data-testid="tray-add"
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-cobalt text-body-lg font-bold text-on-accent disabled:cursor-default disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {`Thêm ${items.length} món vào ${mealName}`}
        </button>
      </div>
    </div>
  );
}
