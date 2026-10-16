import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import type { FoodItem, FoodMatch } from "./mock/foods";

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

/** A food with no `match` is unknown: nothing says it is exact. */
export function matchOf(food: Pick<FoodItem, "match">): FoodMatch {
  return food.match ?? "unknown";
}

export function isProxy(food: Pick<FoodItem, "match">): boolean {
  return matchOf(food) === "proxy";
}

export type SearchTagLabel = "USDA" | "Nhãn" | "VN" | "Ước tính" | "Của tôi" | "Chưa rõ";

/**
 * The small tag of an /add search result. A proxy says Ước tính whatever its database. Otherwise the source decides:
 * usda* is USDA, label is Nhãn, the Vietnamese table is VN, community (numbers from a shared database, not checked
 * against the pack) is Ước tính, user is Của tôi. A source it does not know, or none, says Chưa rõ.
 */
export function searchTag(food: Pick<FoodItem, "match"> & { source?: string | null }): { label: SearchTagLabel; warning: boolean } {
  if (isProxy(food)) return { label: "Ước tính", warning: true };
  const source = (food.source ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (source.startsWith("usda")) return { label: "USDA", warning: false };
  if (source === "label") return { label: "Nhãn", warning: false };
  if (source === "vn-fct" || source === "vn-table") return { label: "VN", warning: false };
  if (source === "community") return { label: "Ước tính", warning: true };
  if (source === "user") return { label: "Của tôi", warning: false };
  return { label: "Chưa rõ", warning: false };
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
