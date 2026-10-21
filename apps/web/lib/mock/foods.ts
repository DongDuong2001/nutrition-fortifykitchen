// perf/live-bundle: the catalogue moved to lib/catalog.ts and the sample foods to lib/mock/sample-foods.ts. This keeps
// the old import path working for the files not repointed yet (the /add screen, the portion panel, lib/home.ts: the
// overnight branches change them) and for the tests; MOCK_FOODS is the catalogue itself, CATALOG_FOODS.
export * from "../catalog";
export { CATALOG_FOODS as MOCK_FOODS } from "../catalog";
