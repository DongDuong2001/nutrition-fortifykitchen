import { formatAmount } from "../../lib/format";
import { parseDecimalInput } from "../../lib/quick-entry";

/** Formats grams input into serving label. If invalid/empty, returns fallback. */
export function formatGramsServingLabel(raw: string, fallback: string): string {
  const n = parseDecimalInput(raw);
  if (n === null) return fallback;
  return `${formatAmount(n, "g")} g`;
}
