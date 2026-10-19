import React from "react";
import Link from "next/link";

/** One small card of a carousel that opens the food detail: name (two lines at most) and "portion · kcal". */
export function FoodCardLink({ href, name, meta }: { href: string; name: string; meta: string }) {
  return (
    <li className="w-[11rem] shrink-0 snap-start">
      <Link
        href={href}
        className="flex min-h-[88px] flex-col gap-1 rounded-card lg:shadow-card border border-card-border bg-card p-3 text-text no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
      >
        <span title={name} className="line-clamp-2 break-words text-callout font-semibold leading-snug">
          {name}
        </span>
        <span className="line-clamp-2 text-cap leading-tight text-secondary">{meta}</span>
      </Link>
    </li>
  );
}
