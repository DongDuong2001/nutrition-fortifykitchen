import React from "react";
import { formatAmount } from "@/lib/format";

/**
 * The three pieces Hôm nay's Vi chất column (components/home/nutrient-column) and the Ngày ăn mẫu builder (components/templates/
 * template-micros) both show: "x/N đạt" with the lowest micros, a group title, and a Level 3 extra as an amount. One place, so the two
 * screens cannot drift apart. `snap` is for the column that cuts its scroll area at whole rows (components/home/column-scroll).
 */

/**
 * C3: the count is the biggest number (40 px, cobalt), "đạt" 17 px; the lacking names in full ink and bolder than their label (Hao's canvas
 * comment). Only the label is at 75 %: an opacity on the parent would fade the names too. 8 px under the count: the 40 px Saira glyph box
 * reaches about 11 px below its 40 px line. The space after the label is outside it, so the names can go to the next line where the share
 * image keeps the label on one line (share-sheet markLines).
 */
export function LevelSummary({ summary }: { summary: { reached: number; total: number; lacking: string[] } }) {
  return (
    <p data-level-summary className="m-0 flex flex-none flex-col gap-2 px-3 pb-2 pt-3 text-text">
      <span className="block text-body-lg font-bold leading-none">
        <span className="font-condensed text-[2.5rem] font-extrabold leading-none tabular-nums text-cobalt">
          {summary.reached}/{summary.total}
        </span>{" "}
        đạt
      </span>
      {summary.lacking.length > 0 && (
        <span className="text-sm leading-5">
          <span className="text-text/75">Thiếu nhiều nhất:</span> <b className="text-callout font-bold text-text">{summary.lacking.join(", ")}</b>
        </span>
      )}
    </p>
  );
}

/** V3: an inset hairline, then the section header in Saira (no ink band). The hairline is part of the header so a snapping area's rows start on it. */
export function GroupTitle({ title, snap = false }: { title: string; snap?: boolean }) {
  return (
    <h3
      {...(snap ? { "data-snap-row": true } : {})}
      className={`relative m-0 p-3 font-display text-body-lg font-extrabold uppercase leading-5 tracking-[0.01em] text-text before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-divider before:content-['']${
        snap ? " flex-none snap-start" : ""
      }`}
    >
      {title}
    </h3>
  );
}

/** Level 3 and up: an amount only, no bar and no percent. An unknown amount says so, never 0. */
export function ExtraRow({ name, unit, amount, snap = false }: { name: string; unit: string; amount: number | null; snap?: boolean }) {
  return (
    <div
      data-align-group="home-nutrient"
      data-extra
      {...(snap ? { "data-snap-row": true } : {})}
      className={`flex min-h-11 items-center justify-between gap-2 px-3 py-1 lg:min-h-12${snap ? " snap-start" : ""}`}
    >
      <span className="min-w-0 break-words text-callout font-semibold leading-snug text-text">{name}</span>
      <span className="shrink-0 text-xs leading-tight text-secondary tabular-nums">
        {amount === null ? "chưa có dữ liệu" : `${formatAmount(amount, unit)} ${unit}`}
      </span>
    </div>
  );
}
