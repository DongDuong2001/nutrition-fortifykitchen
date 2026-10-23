import React from "react";
import Link from "next/link";

export interface FoodRowLinkProps {
  href: string;
  name: string;
  /** Second line: portion and source, or the share of the daily target. */
  meta: string;
  /** Right side, bold: kcal or an amount. */
  value?: string;
  /** Colour of `value` (a CSS colour or var()): the group's or nutrient's own colour on its list page. Default: the text colour. */
  valueColor?: string;
  withBorderTop?: boolean;
  /** The food's category as data-category, for the probes (fix/rich-tabs) */
  category?: string;
  /** Third line, the calm upper-limit line of Đủ 22 vi chất ("Vượt mức an toàn (400 µg)"), on a Giàu … row (A3, 23/10) */
  note?: string | null;
  /** A control beside the row, outside its link (the ⋯ of Món ăn của tôi): the row then is a flex of the link and this. */
  trailing?: React.ReactNode;
}

/** One food in a Khám phá list: name and meta on the left, a figure and a chevron on the right. Min 48 px. */
export function FoodRowLink({ href, name, meta, value, valueColor, withBorderTop = true, category, note, trailing }: FoodRowLinkProps) {
  const link = (
    <Link
      href={href}
      data-food-row
      data-category={category}
      className={`flex min-h-14 items-center gap-3 py-2 text-text no-underline m-tint transition-press ${trailing ? "min-w-0 flex-1" : ""} ${
        withBorderTop && !trailing ? "border-t border-divider" : ""
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-callout font-semibold leading-snug">{name}</span>
        <span className="line-clamp-2 text-cap leading-tight text-secondary">{meta}</span>
        {note && (
          <span data-testid="upper-limit-line" className="text-xs font-semibold leading-snug text-secondary">
            {note}
          </span>
        )}
      </span>
      {value && (
        <span className="shrink-0 text-callout font-bold tabular-nums" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-secondary" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
  if (!trailing) return link;
  return (
    <div className={`flex items-center gap-1 ${withBorderTop ? "border-t border-divider" : ""}`}>
      {link}
      {trailing}
    </div>
  );
}
