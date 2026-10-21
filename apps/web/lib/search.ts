import { catalogVersion, type FoodItem } from "./catalog";
import type { TwinGroup } from "./food-twins";

/**
 * Remove Vietnamese diacritical marks and tone markers for fuzzy/ascii comparison.
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const norm = (str: string) => str.normalize("NFC").toLowerCase().trim();

/** Words of a name or query: spaces and ( ) / , are the separators. */
const wordsOf = (str: string) => str.split(/[\s()/,]+/).filter(Boolean);

/** True when the words of `needle` are a whole word, or a run of whole words, of `hay` (the words of a name). */
function hasWholeWords(hay: readonly string[], needle: string): boolean {
  const words = wordsOf(needle);
  if (words.length === 0) return false;
  for (let start = 0; start + words.length <= hay.length; start++) {
    if (words.every((w, k) => hay[start + k] === w)) return true;
  }
  return false;
}

/**
 * cc-58: what a search reads of a food, worked out once per food (the catalogue has thousands and a query runs on
 * every keystroke): the name as typed, folded of its accents, both as words, the brand folded, and the duplicate key.
 */
interface Folded {
  name: string;
  words: readonly string[];
  foldedName: string;
  foldedWords: readonly string[];
  foldedBrand: string | null;
  dupKey: string;
}
const foldedCache = new WeakMap<FoodItem, Folded>();
function foldedOf(food: FoodItem): Folded {
  let f = foldedCache.get(food);
  if (!f) {
    const name = norm(food.nameVi);
    const foldedName = removeVietnameseTones(food.nameVi);
    f = {
      name,
      words: wordsOf(name),
      foldedName,
      foldedWords: wordsOf(foldedName),
      foldedBrand: food.brand ? removeVietnameseTones(food.brand) : null,
      dupKey: `${name}|${food.nutrients?.energy ?? ""}`,
    };
    foldedCache.set(food, f);
  }
  return f;
}

/** One Vietnamese collator for every comparison (a new one per localeCompare call is slow). */
const VI_COLLATOR = new Intl.Collator("vi");

/**
 * How well a food matches the query, lower is better, or null for no match. Tiers 0 to 3 compare the accented
 * text (so "bơ" finds Quả bơ before Bột quế), tiers 4 to 6 the text with the accents folded away, 7 the brand.
 */
function matchTier(food: FoodItem, query: string, foldedQuery: string): number | null {
  const f = foldedOf(food);
  if (f.name === query) return 0;
  // Whole-word hits only outrank prefix matches when query is 2+ characters; a 1-character query like 'c' should not put 'Vitamin C' ahead of 'Chuối' or 'Cơm'
  if (query.length >= 2 && hasWholeWords(f.words, query)) return 1;
  if (f.name.startsWith(query)) return 2;
  if (hasWholeWords(f.words, query)) return 2.5;
  if (f.name.includes(query)) return 3;
  if (f.foldedName === foldedQuery) return 3.5;
  if (foldedQuery.length >= 2 && hasWholeWords(f.foldedWords, foldedQuery)) return 4;
  if (f.foldedName.startsWith(foldedQuery)) return 5;
  if (hasWholeWords(f.foldedWords, foldedQuery)) return 5.5;
  if (f.foldedName.includes(foldedQuery)) return 6;
  if (f.foldedBrand !== null && f.foldedBrand.includes(foldedQuery)) return 7;
  return null;
}

/**
 * The catalogue has the same food twice (same name, same energy per 100 g): keep the first. Kept per list and per
 * catalogue version (the list is the catalogue array itself, changed in place when a food is made or the live one arrives).
 */
const uniqueCache = new WeakMap<FoodItem[], { version: number; unique: FoodItem[] }>();
function withoutDuplicates(foods: FoodItem[]): FoodItem[] {
  const cached = uniqueCache.get(foods);
  const version = catalogVersion();
  if (cached && cached.version === version && cached.unique.length <= foods.length) return cached.unique;
  const seen = new Set<string>();
  const unique = foods.filter((food) => {
    const key = foldedOf(food).dupKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  uniqueCache.set(foods, { version, unique });
  return unique;
}

/**
 * Normalizes query terms into alternative search variants (e.g. swapping "trái" and "quả", and stripping classifier).
 */
export function queryVariants(query: string): string[] {
  const q = norm(query);
  // trái ↔ quả (accented or not), and the query without the classifier
  const swap: Record<string, string> = { "trái": "quả", trai: "qua", "quả": "trái", qua: "trai" };
  const word = /\b(trái|trai|quả|qua)\b/i.exec(q)?.[1].toLowerCase();
  const variants = word
    ? [q, q.replace(new RegExp(`\\b${word}\\b`, "gi"), swap[word]), q.replace(new RegExp(`\\b${word}\\s+`, "gi"), "")]
    : [q];
  return Array.from(new Set(variants.map(norm).filter(Boolean)));
}

/**
 * Search foods by name or brand. The accents the user typed count first: "bơ" lists Quả bơ before Bột quế and
 * Bò xào, which only match once the accents are folded away (they stay in the list, below). Same tier: the
 * shorter name, then Vietnamese order. Duplicates collapse to one.
 */
export function searchFoods(foods: FoodItem[], query: string): FoodItem[] {
  return rank(foods, query, null);
}

/** How a search sees raw and cooked twins (lib/food-twins passes itself in: lib/food-rows loads it after the first paint). */
export interface TwinLookup {
  groupOf: (food: FoodItem) => TwinGroup | null;
  collapse: (foods: readonly FoodItem[]) => FoodItem[];
  /** A name that says the food was made into something else (chiên, xào, kho): it comes after the plain row */
  prepared: (name: string) => boolean;
}

/**
 * cc-67: the same search, one row per food. A raw row and its plain cooked row are one result named without a state
 * ("Khoai lang"), found by the name of either, at the place its best name earns and by the length of the plain name, so
 * "Khoai lang" comes before "Khoai lang chiên". The row it opens on is the state the food is usually eaten in.
 */
export function searchWithTwins(foods: FoodItem[], query: string, twins: TwinLookup): FoodItem[] {
  return rank(foods, query, twins);
}

function rank(foods: FoodItem[], query: string, twins: TwinLookup | null): FoodItem[] {
  const q = norm(query);
  const unique = withoutDuplicates(foods);
  if (!q) return twins ? twins.collapse(unique) : unique;

  const variants = queryVariants(q).map((v, i) => ({ v, folded: removeVietnameseTones(v), penalty: i === 0 ? 0 : i === 1 ? 0.05 : 0.2 }));
  const tierOfFood = (food: FoodItem) => {
    let best = Infinity;
    for (const { v, folded, penalty } of variants) {
      const tier = matchTier(food, v, folded);
      if (tier !== null) best = Math.min(best, tier + penalty);
    }
    return best;
  };

  const matches: { food: FoodItem; tier: number; prepared: boolean; length: number }[] = [];
  const seen = new Set<TwinGroup>();
  const present = twins ? new Set(foods.map((f) => f.id)) : null;
  for (const food of unique) {
    const group = twins?.groupOf(food) ?? null;
    if (group && seen.has(group)) continue;
    if (group) seen.add(group);
    // A food is found by the name of any of its rows, and listed under its plain name
    const tier = Math.min(...(group ? group.members : [food]).map(tierOfFood));
    if (tier === Infinity) continue;
    const name = group?.name ?? food.nameVi;
    matches.push({ food: group && present?.has(group.start.id) ? group.start : food, tier, prepared: !!twins?.prepared(name), length: name.length });
  }

  return matches
    .sort((a, b) => a.tier - b.tier || Number(a.prepared) - Number(b.prepared) || a.length - b.length || VI_COLLATOR.compare(a.food.nameVi, b.food.nameVi))
    .map((m) => m.food);
}

/**
 * Find similar foods when an exact/substring match returns empty or for SearchEmpty suggestions.
 * Splits the query into words; a word counts most as a whole accented word of the name, then as accented text,
 * then with the accents folded away. More points first, then the shorter name.
 */
export function findSimilarFoods(foods: FoodItem[], query: string, limit = 4): FoodItem[] {
  const allQueries = queryVariants(query);
  const words = Array.from(new Set(allQueries.flatMap((q) => wordsOf(q)).filter((w) => w.length > 1)));

  if (words.length === 0) {
    return foods.slice(0, limit);
  }

  const scored: { food: FoodItem; points: number }[] = [];

  for (const food of foods) {
    const name = norm(food.nameVi);
    const nameWords = wordsOf(name);
    const foldedName = removeVietnameseTones(food.nameVi);
    let points = 0;
    for (const word of words) {
      if (nameWords.includes(word)) points += 3;
      else if (name.includes(word)) points += 2;
      else if (foldedName.includes(removeVietnameseTones(word))) points += 1;
    }
    if (points > 0) {
      scored.push({ food, points });
    }
  }

  scored.sort((a, b) => b.points - a.points || a.food.nameVi.length - b.food.nameVi.length);
  return scored.slice(0, limit).map((s) => s.food);
}
