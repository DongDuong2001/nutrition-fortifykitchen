// The live build's stand-ins for lib/mock/* (perf/live-bundle). next.config.ts swaps each sample module for the file of
// the same name here when NEXT_PUBLIC_API_MODE=live, so the sample day, the sample foods and their history never ship to
// the browser. Live mode never has a demo (lib/demo.ts), so it read nothing but these values before: each stub keeps the
// real module's exports and what it gives outside demo mode. lib/__tests__/live-stubs.test.ts holds them to that.
import type { FoodItem } from "../../catalog";

/** No sample food: the catalogue starts empty and fills from the database (lib/catalog). */
export const SAMPLE_FOODS: FoodItem[] = [];
