"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { useDiary } from "@/lib/diary-store";
import { formatAmount } from "@/lib/format";
import { pctLabel, portionLabel } from "@/lib/home";
import { getNutrientDefinition } from "@/lib/nutrients";
import { macroSourceOf } from "@/lib/nutrient-sources";

/**
 * cc-51 D4: a nutrient of Hôm nay tapped. The foods of today that add to it, largest first, each with its amount and
 * its share of the day's target. Mineral and vitamin names stay in English (one catalogue field, cc-44).
 * Job A: Tinh bột, Đạm, Chất béo and Chất xơ (a hold on the hero, a tap on Chất xơ) open the same sheet, titled "<tên> hôm nay"
 * with a "% mục tiêu" caption over the share column.
 */
export function NutrientSourcesSheet({
  nutrient,
  value,
  target,
  onClose,
}: {
  nutrient: string | null;
  value: number | null;
  target: number | null;
  onClose: () => void;
}) {
  const { nutrientSources } = useDiary();
  const def = nutrient ? getNutrientDefinition(nutrient) : null;
  const sources = nutrient ? nutrientSources(nutrient) : [];
  const unit = def?.unit ?? "";
  const isMacro = macroSourceOf(nutrient) !== null;
  return (
    <Sheet
      open={nutrient !== null && def !== null}
      onClose={onClose}
      title={def ? (isMacro ? `${def.name} hôm nay` : def.name) : ""}
      titleId="nutrient-sources-title"
      description={value === null ? "Chưa có dữ liệu hôm nay" : `${formatAmount(value, unit)} ${unit} · ${pctLabel(value, target)} mục tiêu ngày`}
      desktopDialog
    >
      {sources.length === 0 ? (
        <p className="m-0 px-1 py-2 text-sm text-secondary">Hôm nay chưa có món nào có {def?.name}.</p>
      ) : (
        <ul data-align-group="nutrient-sources" className="m-0 flex list-none flex-col p-0">
          {isMacro && (
            <li aria-hidden="true" data-align-group="nutrient-sources" className="flex items-center justify-between gap-3 px-1 pb-1 text-cap text-secondary">
              <span>Món</span>
              <span>% mục tiêu</span>
            </li>
          )}
          {sources.map((s) => (
            <li key={s.id} data-align-group="nutrient-sources" className="flex min-h-11 items-center justify-between gap-3 border-b border-divider px-1 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-callout font-semibold leading-snug text-text">{s.name}</span>
                <span className="text-cap text-secondary">{portionLabel({ qty: s.qty, grams: s.grams ?? null, foodId: s.foodId ?? "" })}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="font-display text-callout font-bold leading-none tabular-nums text-text tracking-label">{pctLabel(s.amount, target)}</span>
                <span className="text-cap tabular-nums text-secondary">
                  {formatAmount(s.amount, unit)} {unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {nutrient && (
        <Link href={`/micros/${nutrient}`} replace className="flex min-h-11 items-center px-1 text-callout font-bold text-cobalt no-underline">
          Xem chi tiết ›
        </Link>
      )}
    </Sheet>
  );
}
