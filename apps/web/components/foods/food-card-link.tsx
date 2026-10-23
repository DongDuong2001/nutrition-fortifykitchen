import React from "react";
import Link from "next/link";
import { FoodEmojiTile } from "@/components/foods/food-emoji-tile";
import type { FoodItem } from "@/lib/catalog";

/**
 * One small card of a carousel that opens the food detail: the food's emoji tile (when given `food`), name (two lines at most) and "portion · kcal", and when given a
 * `tag` (the source's small pill) under them.
 */
export function FoodCardLink({
  href,
  name,
  meta,
  kcal,
  tag,
  food,
}: {
  href: string;
  name: string;
  meta: string;
  /** V3: the food's kcal after the portion, bold in the link colour ("60 g · 228 kcal") */
  kcal?: string;
  tag?: React.ReactNode;
  /** The food, for its emoji tile above the name (Khám phá: Đồ ăn của Minh Hào, Gần đây, Yêu thích) */
  food?: Pick<FoodItem, "id" | "nameVi" | "category" | "source" | "brand">;
}) {
  return (
    <li className="w-[11rem] shrink-0 snap-start">
      <Link
        href={href}
        className={`flex ${tag ? "h-full " : ""}min-h-[88px] flex-col gap-1 m-hover rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-3 text-text no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100`}
      >
        {food && <FoodEmojiTile food={food} />}
        <span title={name} className="line-clamp-2 break-words text-callout font-semibold leading-snug">
          {name}
        </span>
        <span className="line-clamp-2 text-cap leading-tight text-secondary">
          {meta}
          {kcal && (
            <>
              {" · "}
              <span className="font-bold text-cobalt">{kcal}</span>
            </>
          )}
        </span>
        {tag && <span className="mt-auto flex pt-1">{tag}</span>}
      </Link>
    </li>
  );
}
