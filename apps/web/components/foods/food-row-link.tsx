import React from "react";
import Link from "next/link";

export interface FoodRowLinkProps {
  href: string;
  name: string;
  /** Second line: portion and source, or the share of the daily target. */
  meta: string;
  /** Right side, bold: kcal or an amount. */
  value?: string;
  withBorderTop?: boolean;
}

/** One food in a Khám phá list: name and meta on the left, a figure and a chevron on the right. Min 48 px. */
export function FoodRowLink({ href, name, meta, value, withBorderTop = true }: FoodRowLinkProps) {
  return (
    <Link
      href={href}
      data-food-row
      className={`flex min-h-[56px] items-center gap-3 py-2 text-text no-underline active:scale-[0.99] motion-reduce:active:scale-100 ${
        withBorderTop ? "border-t border-divider" : ""
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{name}</span>
        <span className="line-clamp-2 text-[13px] leading-tight text-secondary">{meta}</span>
      </span>
      {value && <span className="shrink-0 text-[15px] font-bold tabular-nums">{value}</span>}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-secondary" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
