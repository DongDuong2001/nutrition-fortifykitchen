import type { FoodItem } from "./mock/foods";

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

/** True when the words of `needle` are a whole word, or a run of whole words, of `haystack`. */
function hasWholeWords(haystack: string, needle: string): boolean {
  const hay = wordsOf(haystack);
  const words = wordsOf(needle);
  if (words.length === 0) return false;
  for (let start = 0; start + words.length <= hay.length; start++) {
    if (words.every((w, k) => hay[start + k] === w)) return true;
  }
  return false;
}

/**
 * How well a food matches the query, lower is better, or null for no match. Tiers 0 to 3 compare the accented
 * text (so "bơ" finds Quả bơ before Bột quế), tiers 4 to 6 the text with the accents folded away, 7 the brand.
 */
function matchTier(food: FoodItem, query: string, foldedQuery: string): number | null {
  const name = norm(food.nameVi);
  if (name === query) return 0;
  if (hasWholeWords(name, query)) return 1;
  if (name.startsWith(query)) return 2;
  if (name.includes(query)) return 3;
  const foldedName = removeVietnameseTones(food.nameVi);
  if (foldedName === foldedQuery) return 3.5;
  if (hasWholeWords(foldedName, foldedQuery)) return 4;
  if (foldedName.startsWith(foldedQuery)) return 5;
  if (foldedName.includes(foldedQuery)) return 6;
  if (food.brand && removeVietnameseTones(food.brand).includes(foldedQuery)) return 7;
  return null;
}

/** The catalogue has the same food twice (same name, same energy per 100 g): keep the first. */
function withoutDuplicates(foods: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const key = `${norm(food.nameVi)}|${food.nutrients?.energy ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Normalizes query terms into alternative search variants (e.g. swapping "trái" and "quả", and stripping classifier).
 */
export function queryVariants(query: string): string[] {
  const q = norm(query);
  const variants = [q];
  if (/\btrái\b/i.test(q)) {
    variants.push(q.replace(/\btrái\b/gi, "quả"));
    variants.push(q.replace(/\btrái\s+/gi, ""));
  } else if (/\btrai\b/i.test(q)) {
    variants.push(q.replace(/\btrai\b/gi, "qua"));
    variants.push(q.replace(/\btrai\s+/gi, ""));
  } else if (/\bquả\b/i.test(q)) {
    variants.push(q.replace(/\bquả\b/gi, "trái"));
    variants.push(q.replace(/\bquả\s+/gi, ""));
  } else if (/\bqua\b/i.test(q)) {
    variants.push(q.replace(/\bqua\b/gi, "trai"));
    variants.push(q.replace(/\bqua\s+/gi, ""));
  }
  return Array.from(new Set(variants.map(norm).filter(Boolean)));
}

/**
 * Search foods by name or brand. The accents the user typed count first: "bơ" lists Quả bơ before Bột quế and
 * Bò xào, which only match once the accents are folded away (they stay in the list, below). Same tier: the
 * shorter name, then Vietnamese order. Duplicates collapse to one.
 */
export function searchFoods(foods: FoodItem[], query: string): FoodItem[] {
  const q = norm(query);
  if (!q) return withoutDuplicates(foods);

  const variants = queryVariants(q);

  const matches: { food: FoodItem; tier: number }[] = [];
  for (const food of withoutDuplicates(foods)) {
    let bestTier: number | null = null;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const foldedV = removeVietnameseTones(v);
      const tier = matchTier(food, v, foldedV);
      if (tier !== null) {
        const penalty = i === 0 ? 0 : i === 1 ? 0.05 : 0.2;
        const adjustedTier = tier + penalty;
        if (bestTier === null || adjustedTier < bestTier) {
          bestTier = adjustedTier;
        }
      }
    }
    if (bestTier !== null) matches.push({ food, tier: bestTier });
  }

  return matches
    .sort((a, b) => a.tier - b.tier || a.food.nameVi.length - b.food.nameVi.length || a.food.nameVi.localeCompare(b.food.nameVi, "vi"))
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
