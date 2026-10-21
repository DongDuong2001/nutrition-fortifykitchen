import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import { isRecipeId } from "./recipe";
import type { FoodItem, FoodMatch } from "./catalog";
import { sourceKey, sourceName, type SearchTagLabel } from "./source-names";

/** Data sources of a food (cc-27d): how close its numbers are, where they come from, how much they cover. */

export const MATCH_ORDER: readonly FoodMatch[] = ["exact", "close", "proxy"];

export const MATCH_LABEL: Record<FoodMatch, { name: string; detail: string }> = {
  exact: { name: "Chính xác", detail: "đúng món" },
  close: { name: "Gần đúng", detail: "cùng món, khác cách chế biến" },
  proxy: { name: "Ước tính", detail: "món tương tự" },
  unknown: { name: "Chưa rõ nguồn", detail: "chưa ai đối chiếu với món gốc" },
};

/** What the source link says until someone has opened it and confirmed it is this food. */
export const UNVERIFIED_TEXT = "chưa kiểm chứng";

export const PROXY_NOTICE =
  "Ước tính. Chưa có dữ liệu riêng của món này, nên đang dùng số của món tương tự. Số thật có thể khác một chút.";

/**
 * A food the user typed in by hand (Tự nhập): kcal and macros, micros only if entered. A recipe is also the user's own
 * but is worked out from ingredients, so it is not manual. A food with no id (an old caller) is not told apart.
 */
export function isManualFood(food: { source?: string | null; id?: string }): boolean {
  return (food.source ?? "").trim().toLowerCase() === "user" && food.id !== undefined && !isRecipeId(food.id);
}

/** A food with no `match` is unknown: nothing says it is exact. */
export function matchOf(food: Pick<FoodItem, "match">): FoodMatch {
  return food.match ?? "unknown";
}

export function isProxy(food: Pick<FoodItem, "match">): boolean {
  return matchOf(food) === "proxy";
}

export type { SearchTagLabel } from "./source-names";

/**
 * The small tag of an /add search result. A proxy says Ước tính whatever its database. Otherwise the source decides, from the
 * one table lib/source-names shares with foodSourceLabel: usda* is USDA, label is Nhãn, the Vietnamese table is VN, cnf is
 * Canada, asean is ASEAN, literature is Tài liệu, fortify_kitchen (Fortify Kitchen's own recipes) is Fortify Kitchen, community (numbers from a shared database, not checked against the pack) and
 * recipe_calc (worked out from a recipe) are Ước tính, user is Tự nhập (typed by hand) or Của tôi (a recipe). A source the
 * table does not know, or none, says Chưa rõ.
 */
export function searchTag(food: Pick<FoodItem, "match"> & { source?: string | null; id?: string }): { label: SearchTagLabel; warning: boolean } {
  if (isProxy(food)) return { label: "Ước tính", warning: true };
  if (sourceKey(food.source) === "user") return { label: isManualFood(food) ? "Tự nhập" : "Của tôi", warning: false };
  const name = sourceName(food.source);
  return name ? { label: name.tag, warning: name.warning === true } : { label: "Chưa rõ", warning: false };
}

/** How many of the 22 counted micros the food has a value for. An unknown (null or missing) is not counted. */
export function microCoverage(food: Pick<FoodItem, "nutrients">): { known: number; total: number } {
  const known = COUNTED_NUTRIENT_KEYS.filter((k) => typeof food.nutrients[k] === "number").length;
  return { known, total: COUNTED_NUTRIENT_KEYS.length };
}

/** The "Có dữ liệu" row: "14/22 vi chất · các chất còn lại hiện “—”" (nothing about the rest when all are known). */
export function coverageText(food: Pick<FoodItem, "nutrients">): string {
  const { known, total } = microCoverage(food);
  return known === total ? `${known}/${total} vi chất` : `${known}/${total} vi chất · các chất còn lại hiện “—”`;
}
