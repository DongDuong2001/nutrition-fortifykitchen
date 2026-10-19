/**
 * A usable amount of food energy or a nutrient: a finite number of 0 or more. A NaN, an Infinity or a negative one is
 * bad data (a broken import, a division by zero): it adds nothing to a total, and a total of nothing is unknown.
 */
export function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
