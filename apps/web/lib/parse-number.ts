/**
 * A number typed in a field, read the Vietnamese way: "1,5" and "1.5" are 1.5, "1.000" (a dot and exactly three digits,
 * no comma) is 1000, "1.234,5" is 1234.5. Blank, text ("12abc"), exponents ("1e3"), signs and "1.2.3" give null, so a
 * field never reads half of what was typed. A trailing separator ("2,") reads as the number so far.
 */
export function parseNumberInput(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (/^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/.test(text)) return Number(text.replace(/\./g, "").replace(",", "."));
  if (/^\d+(?:[.,]\d*)?$/.test(text) || /^[.,]\d+$/.test(text)) {
    const n = Number(text.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
