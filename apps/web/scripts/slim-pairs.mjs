// The food research's raw-cooked files (tests/fixtures, copied unchanged from food-research) carry names and sources the
// app never reads. This writes what lib/yield needs: [raw "source|source_id", cooked "source|source_id", yield] per pair,
// and each group's median. Runs before every build; lib/__tests__/raw-cooked-data.test.ts fails if the files drift.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
export const FULL_PAIRS = path.join(root, "tests/fixtures/raw-cooked-pairs.json");
export const FULL_GROUPS = path.join(root, "tests/fixtures/raw-cooked-group-yields.json");
export const SLIM_PAIRS = path.join(root, "lib/data/raw-cooked-pairs.slim.json");
export const SLIM_GROUPS = path.join(root, "lib/data/raw-cooked-group-yields.slim.json");

const key = (row) => {
  if (row.source.includes("|") || row.source_id.includes("|")) throw new Error(`"|" in ${row.source} ${row.source_id}`);
  return `${row.source}|${row.source_id}`;
};

/** The slim files' text, one pair per line so a data change reads as a small diff */
export function slimText(pairs, groups) {
  const rows = pairs.map((p) => JSON.stringify([key(p.raw), key(p.cooked), p.yield]));
  const medians = Object.fromEntries(groups.map((g) => [g.group, g.median]));
  return { pairs: `[\n${rows.join(",\n")}\n]\n`, groups: `${JSON.stringify(medians, null, 2)}\n` };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = slimText(JSON.parse(readFileSync(FULL_PAIRS, "utf8")), JSON.parse(readFileSync(FULL_GROUPS, "utf8")));
  writeFileSync(SLIM_PAIRS, text.pairs);
  writeFileSync(SLIM_GROUPS, text.groups);
  console.log(`slim-pairs: ${text.pairs.split("\n").length - 3} pairs, ${Object.keys(JSON.parse(text.groups)).length} groups`);
}
