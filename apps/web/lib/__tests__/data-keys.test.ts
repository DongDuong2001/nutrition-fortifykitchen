import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_KEYS } from "../../scripts/live-keys.mjs";
import { SLIM_PAIRS } from "../../scripts/slim-pairs.mjs";
import { SLIM_DISHES } from "../../scripts/slim-dishes.mjs";

const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const live = new Set<string>(read(LIVE_KEYS));

/**
 * The raw/cooked pairs and the dish recipes find foods by "source|source_id", never by name, so a data job that moves a
 * row's source_id (or archives a row) silently breaks the link. Every key in both slim files must be a live food in
 * tests/fixtures/live-food-keys.json; that fixture is regenerated from a catalogue export (scripts/live-keys.mjs) in the
 * same PR as the data change.
 */
describe("every key the data files point at is a live food", () => {
  it("raw-cooked-pairs.slim.json: both rows of every pair", () => {
    const pairs: [string, string, number][] = read(SLIM_PAIRS);
    const missing = pairs.flatMap(([raw, cooked]) => [raw, cooked]).filter((k) => !live.has(k));
    expect(missing).toEqual([]);
  });

  it("dish-recipes.slim.json: every dish, ingredient and alternative", () => {
    const dishes: Record<string, [number, [string, number, string, string, string | null, number | null, [string, string][]?][]]> = read(SLIM_DISHES);
    const keys = Object.entries(dishes).flatMap(([dish, [, rows]]) => [dish, ...rows.flatMap((r) => [r[0], ...(r[6] ?? []).map((a) => a[0])])]);
    expect(keys.filter((k) => !live.has(k))).toEqual([]);
  });

  it("the key list itself is sorted and has no repeats", () => {
    const keys: string[] = read(LIVE_KEYS);
    expect(keys).toEqual([...new Set(keys)].sort());
  });
});
