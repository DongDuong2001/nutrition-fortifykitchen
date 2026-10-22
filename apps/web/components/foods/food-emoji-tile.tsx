import React from "react";
import { foodEmoji } from "@/lib/food-emoji";
import type { FoodItem } from "@/lib/catalog";

/**
 * A food's icon (Hao 22/10: the phone's own emoji): the emoji on the page grey, radius 12. "row" is the 44 px tile of the
 * add list and the Khám phá cards (a 28 px emoji), "page" the food page's 112 px tile (72 px). Decorative: the name is beside it.
 */
export function FoodEmojiTile({ food, size = "row" }: { food: Pick<FoodItem, "id" | "nameVi" | "category" | "source" | "brand">; size?: "row" | "page" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-xl bg-page font-emoji leading-none ${
        size === "page" ? "h-28 w-28 text-[4.5rem]" : "h-11 w-11 text-[1.75rem]"
      }`}
    >
      {foodEmoji(food)}
    </span>
  );
}
