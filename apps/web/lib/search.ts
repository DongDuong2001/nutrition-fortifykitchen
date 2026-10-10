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

/**
 * Search foods by name or brand, ignoring diacritics and case.
 * Ranks exact matches first, then prefix matches, then substring matches.
 */
export function searchFoods(foods: FoodItem[], query: string): FoodItem[] {
  const cleanQ = removeVietnameseTones(query);
  if (!cleanQ) {
    return foods;
  }

  const matches: { food: FoodItem; score: number }[] = [];

  for (const food of foods) {
    const cleanName = removeVietnameseTones(food.nameVi);
    const cleanBrand = food.brand ? removeVietnameseTones(food.brand) : "";

    // Score calculation (lower score = higher rank)
    if (cleanName === cleanQ) {
      matches.push({ food, score: 0 });
    } else if (cleanName.startsWith(cleanQ)) {
      matches.push({ food, score: 10 + (cleanName.length - cleanQ.length) });
    } else if (cleanName.includes(" " + cleanQ)) {
      matches.push({ food, score: 20 });
    } else if (cleanName.includes(cleanQ)) {
      matches.push({ food, score: 30 });
    } else if (cleanBrand.includes(cleanQ)) {
      matches.push({ food, score: 40 });
    }
  }

  return matches.sort((a, b) => a.score - b.score).map((m) => m.food);
}

/**
 * Find similar foods when an exact/substring match returns empty or for SearchEmpty suggestions.
 * Splits query into keywords and matches any overlapping words.
 */
export function findSimilarFoods(foods: FoodItem[], query: string, limit = 4): FoodItem[] {
  const cleanQ = removeVietnameseTones(query);
  const words = cleanQ.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) {
    return foods.slice(0, limit);
  }

  const scored: { food: FoodItem; count: number }[] = [];

  for (const food of foods) {
    const cleanName = removeVietnameseTones(food.nameVi);
    let count = 0;
    for (const word of words) {
      if (cleanName.includes(word)) {
        count++;
      }
    }
    if (count > 0) {
      scored.push({ food, count });
    }
  }

  scored.sort((a, b) => b.count - a.count);
  return scored.slice(0, limit).map((s) => s.food);
}
