/**
 * cc-67 part 2 (Hao 19/10): fruit, and any food sold with an inedible part (peel, rind, seed, bone, shell), are logged as
 * grams of the edible part only. Their nutrients are per 100 g of edible part already (USDA, NIN), so a "1 quả" or "1 con"
 * of the whole fruit, fish or crab would only guess at the waste. No unit or size serving stays for them: the portion panel
 * shows 100 g, the typed grams and ×N. Eggs are the exception (by quả, shell taken off by the app, lib/portion).
 *
 * Data prep, not shipped in the app: the data scan (lib/__tests__/edible-part-scan.test.ts, npm run scan:edible) uses it to list
 * what Dong's importer removes (docs/data/edible-part-portions-2026-10-19.json). The app itself only keeps fruit by weight
 * (weighedFruit in lib/mock/foods.ts) until the database has the new portions.
 */
export type EdibleKind = "fruit" | "fish" | "other";

interface Edible {
  nameVi: string;
  category?: string;
  source?: string | null;
  servings: Array<{ label: string; grams: number; display?: string }>;
}

// A serving by weight or volume stays ("100 g", "30 g", "3 oz", "200 ml"); a count of anything ("1 quả", "1 con") goes
const BY_WEIGHT = /^[\d.,/ ]+\s*(?:g|kg|oz|ml|l)(?=$|[\s(])/i;
// Processed or made into something else (dried shrimp, fish sauce, sausage, a drink) is not the food in its shell
const PROCESSED = /hộp|khô|mắm|ruốc|chà bông|xông khói|viên|chả|giò (?:lụa|thủ)|sốt|bột|sữa|nước ép|mứt/;
// Sold with a peel, rind, cob, shell or bone: banana, avocado, coconut, sugarcane, corn on the cob, shellfish, crab, snails, bone-in poultry, ribs
const INEDIBLE =
  /^(?:chuối|quả bơ|bơ vỏ|dừa|cơm dừa|mía|gấc|bắp\/ngô|(?:ngô|bắp) (?:ngọt|nếp)|tôm|cua|ghẹ|rạm|sò|vẹm|nghêu|ngao|hến|hàu|trai|tu hài|ốc|bào ngư|cầu gai|cánh gà|má đùi gà|đùi gà|chân gà|sườn|chân giò|gà nguyên con|chim cút|vịt nguyên con|ếch)(?=$|[\s(,/])(?!.*(?:bỏ da|bỏ xương|xay))|cả bắp/;
// A whole fish or a cut with the bone: "1 con cá (phần ăn được)", "1 khúc cá lóc", "1 miếng saba (nửa con)"
const WHOLE_FISH = /\b(?:con|khúc)\b/;

/** What kind of inedible part the food has, or null when it has none. */
export function edibleKind(food: Pick<Edible, "nameVi" | "category" | "source">): EdibleKind | null {
  const name = food.nameVi.toLowerCase().normalize("NFC");
  if (food.category === "trai_cay") return "fruit";
  // Dishes, the user's own foods and eggs keep their units
  if (food.category === "mon_viet" || food.category === "cua_toi" || food.source === "user" || /^trứng|^lòng/.test(name)) return null;
  if (food.category === "dam" && /^cá(?=\s)/.test(name)) return "fish";
  return !PROCESSED.test(name) && INEDIBLE.test(name) ? "other" : null;
}

/** The serving labels that a food of this kind loses: all the counts, or for fish the whole-fish ones. */
const goes = (kind: EdibleKind, label: string) => !BY_WEIGHT.test(label) && (kind !== "fish" || WHOLE_FISH.test(label));

/** The food with its count servings taken away; the very same object when it has none to lose. */
export function edibleServings<T extends Edible>(food: T): T {
  const kind = edibleKind(food);
  if (!kind || !food.servings.some((s) => goes(kind, s.label))) return food;
  const kept = food.servings.filter((s) => !goes(kind, s.label));
  return { ...food, servings: kept.length > 0 ? kept : [{ label: "100 g", grams: 100 }] };
}

/** The unit servings a food loses (for the data scan): labels as they are now. */
export function removedServings(food: Edible): string[] {
  const kind = edibleKind(food);
  return kind ? food.servings.filter((s) => goes(kind, s.label)).map((s) => s.label) : [];
}
