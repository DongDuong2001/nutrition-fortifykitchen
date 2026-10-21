import React from "react";
import Link from "next/link";
import { getLevel, type NutrientLevel } from "@/lib/levels";
import { nutrientDot } from "@/lib/nutrient-colors";

/** The level as text on a white card: the deep shade of its colour (V3-SPEC §1). */
const LEVEL_TEXT: Record<NutrientLevel, string> = {
  thieu: "text-deep-red",
  trungbinh: "text-deep-yellow",
  ganDu: "text-deep-mint",
  dat: "text-deep-green",
};

/**
 * One "Cần chú ý" row: a white card link with the title (a nutrient's colour dot before it), one short line (and an
 * optional second line), the number in Saira vertically centred at the right, and a chevron. `gap` colours the number as
 * a shortfall; `percentage` colours it by its level; with neither it is ink.
 */
export function AttentionRow({
  href,
  title,
  line,
  extra,
  number,
  gap = false,
  percentage = null,
  dotKey,
  large = false,
}: {
  href: string;
  title: string;
  line: string;
  extra?: string;
  number: string;
  gap?: boolean;
  /** The nutrient's share of its target: the number takes that level's colour */
  percentage?: number | null;
  /** A nutrient id: its colour dot goes before the title */
  dotKey?: string;
  /** 26 px number (Tóm tắt) instead of 22 px */
  large?: boolean;
}) {
  const tone = gap ? "text-destructive-text" : percentage !== null ? LEVEL_TEXT[getLevel(percentage)] : "text-text";
  return (
    <Link
      href={href}
      data-align-group="overview-attention"
      className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-card border border-transparent bg-card p-4 text-text no-underline shadow-ring m-tint transition-press lg:shadow-card"
    >
      <span className="min-w-0">
        <span className="block text-callout font-bold leading-snug">
          {dotKey && (
            <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-[1px]" style={{ backgroundColor: nutrientDot(dotKey) }} />
          )}
          {title}
        </span>
        <span className="mt-1 block text-cap leading-snug text-secondary">{line}</span>
        {extra && <span className="mt-1 block text-cap leading-snug text-secondary">{extra}</span>}
      </span>
      <span className={`font-display font-extrabold leading-none tabular-nums ${large ? "text-title" : "text-title-sm"} ${tone}`}>{number}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-secondary">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
