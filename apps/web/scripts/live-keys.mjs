// The catalogue keys the app's data files may point at. tests/fixtures/live-food-keys.json lists "source|source_id" of every
// live (not archived) food; lib/__tests__/data-keys.test.ts checks that each key in raw-cooked-pairs.slim.json and
// dish-recipes.slim.json is in it. Regenerate it from a fresh export of the catalogue (GET /api/v1/foods, which leaves archived
// rows out) in the same PR as any data job that moves, adds or archives a source/source_id:
//   node scripts/live-keys.mjs path/to/export.json
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
export const LIVE_KEYS = path.join(root, "tests/fixtures/live-food-keys.json");

/** Sorted, unique "source|source_id" of the foods in an export; a "|" in either part would make the key ambiguous. */
export function liveKeys(foods) {
  const keys = new Set();
  for (const f of foods) {
    if (f.is_archived) continue;
    if (f.source.includes("|") || f.source_id.includes("|")) throw new Error(`"|" in ${f.source} ${f.source_id}`);
    keys.add(`${f.source}|${f.source_id}`);
  }
  return [...keys].sort();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error("usage: node scripts/live-keys.mjs path/to/export.json");
  const keys = liveKeys(JSON.parse(readFileSync(process.argv[2], "utf8")));
  writeFileSync(LIVE_KEYS, `[\n${keys.map((k) => JSON.stringify(k)).join(",\n")}\n]\n`);
  console.log(`live-keys: ${keys.length} keys`);
}
