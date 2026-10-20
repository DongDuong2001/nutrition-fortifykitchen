import React from "react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { formatAmount } from "@/lib/format";
import type { CompareColumn, CompareRow, CompareSection } from "@/lib/food-compare";

export interface CompareTableProps {
  columns: CompareColumn[];
  sections: CompareSection[];
  onRemove: (id: string) => void;
}

// Phone: the nutrient name takes its own full-width line, the value columns sit under it.
// From 1024 px: a classic table, the name in a first column and the header row sticky.
const ROW_GRID =
  "grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-x-2 lg:grid-cols-[minmax(0,12rem)_repeat(var(--n),minmax(0,1fr))] lg:items-center";

function Value({ row, index }: { row: CompareRow; index: number }) {
  const value = row.values[index];
  if (value === null) {
    return (
      <span className="text-callout text-secondary" aria-label="Chưa có dữ liệu">
        —
      </span>
    );
  }
  const top = row.highest[index];
  return (
    <span className={`inline-flex items-baseline justify-center gap-1 tabular-nums ${top ? "font-bold text-cobalt" : "font-medium text-text"}`}>
      {top && <span aria-hidden="true" className="h-2 w-2 shrink-0 self-center rounded-full bg-cobalt" />}
      <span className="text-callout">{formatAmount(value, row.unit)}</span>
      <span className="text-xs font-normal text-secondary">{row.unit}</span>
      {top && <span className="sr-only"> (cao nhất)</span>}
    </span>
  );
}

/**
 * The comparison: one header row (food names, grams under them, a 44 px remove button per column) and the rows
 * grouped as Vi chất (macros, Vitamin, Khoáng chất). The highest known value of a row has a cobalt dot and weight.
 * Every column's header and cells share one data-align-group, so their edges are checked together.
 */
export function CompareTable({ columns, sections, onRemove }: CompareTableProps) {
  const n = columns.length;
  const vars = { "--n": n } as React.CSSProperties;
  return (
    <Card as="section" aria-label="So sánh dinh dưỡng" className="flex flex-col">
      <div role="table" aria-label="So sánh dinh dưỡng" className="flex flex-col">
        <div role="rowgroup" className="z-sticky bg-card lg:sticky lg:top-0 lg:border-b lg:border-card-border">
          <div role="row" style={vars} className={`${ROW_GRID} items-start pb-2`}>
            <div role="columnheader" className="hidden pb-2 text-cap font-semibold text-secondary lg:block">
              Dinh dưỡng
            </div>
            {columns.map((c, i) => (
              <div
                key={c.id}
                role="columnheader"
                data-align-group={`compare-col-${i}`}
                className="flex min-w-0 flex-col items-center gap-1 text-center"
              >
                <span title={c.name} className="break-words text-cap font-bold leading-snug text-text">
                  {c.name}
                </span>
                {c.portion && <span className="break-words text-xs leading-snug text-secondary">{c.portion}</span>}
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  aria-label={`Bỏ ${c.name} khỏi so sánh`}
                  className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} role="rowgroup" aria-label={section.title} className="flex flex-col">
            <div role="row">
              <div role="columnheader" aria-colspan={n + 1} className="pt-4 pb-1">
                <SectionTitle as="h3">{section.title}</SectionTitle>
              </div>
            </div>
            {section.rows.length > 0 && section.rows.map((row) => (
              <div key={row.id} role="row" style={vars} className={`${ROW_GRID} gap-y-1 border-t border-divider py-2`}>
                <div role="rowheader" className="col-span-full text-cap font-semibold text-secondary lg:col-span-1 lg:text-callout lg:text-text">
                  {row.name}
                </div>
                {columns.map((c, i) => (
                  <div key={c.id} role="cell" data-align-group={`compare-col-${i}`} className="flex min-w-0 items-center justify-center text-center">
                    <Value row={row} index={i} />
                  </div>
                ))}
              </div>
            ))}
            {section.missing.length > 0 && (
              <p className="m-0 border-t border-divider pt-2 text-cap leading-snug text-secondary">
                Chưa có dữ liệu: {section.missing.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
