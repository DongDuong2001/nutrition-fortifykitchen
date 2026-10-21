// The food research's dish recipes (tests/fixtures/dish-recipes.json, copied unchanged from food-research) carry the
// serving label and more than the app reads. This writes what the portion sheet's "Thành phần" needs, keyed by the
// dish's "source|source_id": its serving grams and, per ingredient, "source|source_id", grams, role, the name (shown
// only when an ingredient is not in the catalogue; never used to find one), the add-on label and grams and, when the
// ingredient can be swapped for another food, its alternatives [["source|source_id", name], ...].
// Runs before every build; lib/__tests__/dish-recipes.test.ts fails if the files drift.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
export const FULL_DISHES = path.join(root, "tests/fixtures/dish-recipes.json");
export const SLIM_DISHES = path.join(root, "lib/data/dish-recipes.slim.json");

const key = (row) => {
  if (row.source.includes("|") || row.source_id.includes("|")) throw new Error(`"|" in ${row.source} ${row.source_id}`);
  return `${row.source}|${row.source_id}`;
};

/**
 * The slim file's text: one dish per line so a data change reads as a small diff.
 * dish key → [serving grams, [[ingredient key, grams, role, name, add-on label | null, add-on grams | null], ...]].
 * A dish key is unique in the research file (Bún chả Hà Nội is vn_table and vn_fct): a repeat stops the build.
 */
export function slimText(dishes) {
  const out = new Map();
  for (const d of dishes) {
    const k = key(d.dish);
    if (out.has(k)) throw new Error(`dish key twice: ${k}`);
    // A 7th element, only on an ingredient that has alternatives (Hao 21/10: a user can swap it): [[key, name], ...]
    const ingredients = d.ingredients.map((i) => {
      const row = [key(i), i.grams, i.role, i.name_vi, i.addon ? i.addon.label : null, i.addon ? i.addon.grams : null];
      if (i.alternatives?.length) row.push(i.alternatives.map((a) => [key(a), a.name_vi]));
      return row;
    });
    out.set(k, [d.serving_grams, ingredients]);
  }
  const lines = [...out].map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return `{\n${lines.join(",\n")}\n}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = slimText(JSON.parse(readFileSync(FULL_DISHES, "utf8")));
  writeFileSync(SLIM_DISHES, text);
  console.log(`slim-dishes: ${Object.keys(JSON.parse(text)).length} dishes`);
}
