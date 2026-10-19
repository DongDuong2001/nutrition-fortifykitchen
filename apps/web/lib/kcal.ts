import { isAmount } from "./amount";
import { formatAmount } from "./format";

/**
 * Energy of a diary entry is a number or null (unknown: the server stored NULL). A total skips the unknown ones and
 * any that is not a usable amount (NaN, Infinity, negative); when none is known the total is unknown too (null, shown
 * as "—"), never 0.
 */
export function sumKcal(values: readonly (number | null)[]): number | null {
  let total: number | null = null;
  for (const value of values) {
    if (isAmount(value)) total = (total ?? 0) + value;
  }
  return total;
}

/** The number for a kcal slot: "1.041", or "—" when the energy is unknown. The unit is the caller's. */
export function kcalValue(kcal: number | null): string {
  return kcal === null ? "—" : formatAmount(kcal, "kcal");
}

/** The number with its unit: "1.041 kcal", or "— kcal" when the energy is unknown. */
export function kcalLabel(kcal: number | null): string {
  return `${kcalValue(kcal)} kcal`;
}
