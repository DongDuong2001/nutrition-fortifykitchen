import {
  type AddedDiaryEntry,
  SAMPLE_ITEMS,
  type SampleEdits,
  type SampleItemInfo,
  sampleEffect,
} from "./diary-edits";

/** One food of today that adds to a nutrient: its share in the same unit as the nutrient. */
export interface NutrientSource {
  id: string;
  name: string;
  qty: string;
  amount: number;
  /** For the portion as Hôm nay shows it (lib/home portionLabel: "2 viên" for a supplement, never its grams) */
  foodId: string;
  grams: number | null;
}

/**
 * The foods of today that add to one nutrient, largest first. Deleted sample items, zero and unknown
 * amounts are left out. The sample items are read through their edits, the same as the day total.
 */
export function nutrientSourcesIn(
  added: AddedDiaryEntry[],
  sampleEdits: SampleEdits,
  key: string,
  sampleItems: SampleItemInfo[] = SAMPLE_ITEMS
): NutrientSource[] {
  const fromSamples = sampleItems.map((info) => {
    const effect = sampleEffect(info, sampleEdits[info.item.id]);
    return {
      id: info.item.id,
      name: info.item.name,
      qty: effect.qty,
      amount: effect.deleted ? null : effect.numbers?.nutrients[key],
      foodId: info.food?.id ?? "",
      grams: sampleEdits[info.item.id]?.grams ?? info.grams,
    };
  });
  const fromAdded = added.map((entry) => ({
    id: entry.id,
    name: entry.foodName,
    qty: entry.displayQty,
    amount: entry.nutrients[key],
    foodId: entry.kind === "quick" ? "" : entry.foodId,
    grams: entry.kind === "quick" ? null : entry.grams,
  }));

  return [...fromSamples, ...fromAdded]
    .filter((s): s is NutrientSource => typeof s.amount === "number" && s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
