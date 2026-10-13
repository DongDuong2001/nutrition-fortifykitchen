import React from "react";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import type { AttentionRow } from "@/lib/overview-board";

/**
 * "Cần chú ý": at most three facts, each a white row with a title, one short line and the number in Saira.
 * The row opens the screen that explains it.
 */
export function AttentionList({
  rows,
  hrefFor,
}: {
  rows: AttentionRow[];
  hrefFor: (row: AttentionRow) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="ov-attention" className="flex flex-col gap-2">
      <SectionTitle id="ov-attention">Cần chú ý</SectionTitle>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.key ?? "protein"}`}>
            <Link
              href={hrefFor(row)}
              className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-card-border bg-card p-4 text-text no-underline active:scale-[0.99] motion-reduce:active:scale-100"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-snug">{row.title}</span>
                <span className="mt-1 block text-[13px] leading-snug text-secondary">{row.line}</span>
              </span>
              <span
                className={`font-display text-[26px] font-bold tabular-nums ${row.gap ? "text-destructive-text" : "text-text"}`}
              >
                {row.number}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
