import React from "react";
import Link from "next/link";

/**
 * One "Cần chú ý" row: a white card link with the title, one short line (and an optional second line), and the
 * number in Saira, vertically centred at the right. `gap` colours the number as a shortfall.
 */
export function AttentionRow({
  href,
  title,
  line,
  extra,
  number,
  gap = false,
}: {
  href: string;
  title: string;
  line: string;
  extra?: string;
  number: string;
  gap?: boolean;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-4 text-text no-underline active:scale-[0.99] transition-press motion-reduce:active:scale-100"
    >
      <span className="min-w-0">
        <span className="block text-callout font-bold leading-snug">{title}</span>
        <span className="mt-1 block text-cap leading-snug text-secondary">{line}</span>
        {extra && <span className="mt-1 block text-cap leading-snug text-secondary">{extra}</span>}
      </span>
      <span className={`font-display text-title font-extrabold tabular-nums ${gap ? "text-destructive-text" : "text-text"}`}>{number}</span>
    </Link>
  );
}
