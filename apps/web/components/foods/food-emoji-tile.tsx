import React from "react";
import { foodEmoji } from "@/lib/food-emoji";
import type { FoodItem } from "@/lib/catalog";

/**
 * A food's icon (Hao 22/10: the phone's own emoji): the emoji on the page grey, radius 12. "row" is the 44 px tile of the
 * add list and the Khám phá cards (a 28 px emoji), "page" the food page's 112 px tile (72 px). Decorative: the name is beside it.
 * The emoji is drawn by ::before from data-emoji, so it is not part of the row's text (a copied name, a row's text for a
 * screen reader or a test is the name alone).
 */
export function FoodEmojiTile({ food, size = "row" }: { food: Pick<FoodItem, "id" | "nameVi" | "category" | "source" | "brand">; size?: "row" | "page" }) {
  return (
    <span
      aria-hidden="true"
      data-emoji={foodEmoji(food)}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-xl bg-page font-emoji leading-none before:content-[attr(data-emoji)] ${
        size === "page" ? "h-28 w-28 text-[4.5rem]" : "h-11 w-11 text-[1.75rem]"
      }`}
    />
  );
}
