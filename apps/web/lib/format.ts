export interface FormatNumberOptions {
  decimals?: number;
}

/**
 * Format a number according to Vietnamese conventions (dots for thousands, commas for decimals).
 * Example: 1041 -> "1.041", 2.1 -> "2,1"
 */
export function formatNumber(value: number, options?: FormatNumberOptions): string {
  if (options?.decimals !== undefined) {
    const formatter = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    });
    return formatter.format(value);
  }

  // Check if effectively integer
  if (Math.abs(Math.round(value) - value) < 1e-6) {
    const formatter = new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
    });
    return formatter.format(Math.round(value));
  }

  // For values < 1 (adaptive precision: e.g. 0.6 -> "0,6", 0.04 -> "0,04")
  if (Math.abs(value) < 1) {
    const formatter = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(value);
  }

  const formatter = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

/**
 * Format a numerical range: "1.950–2.275"
 */
export function formatRange(min: number, max: number, options?: FormatNumberOptions): string {
  if (min === max) {
    return formatNumber(min, options);
  }
  return `${formatNumber(min, options)}–${formatNumber(max, options)}`;
}

const formatWhole = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const formatOneDecimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const formatTwoDecimals = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const ONE_DECIMAL_UNITS = new Set(["g", "µg"]);

/**
 * An amount with its unit: kcal and mg are whole numbers. g and µg are one decimal under 100, else whole.
 * Any value under 1 keeps up to two decimals. A positive value that would round to 0 shows "<0,01".
 * For plain counts, use formatNumber.
 */
export function formatAmount(value: number, unit: string): string {
  if (value > 0 && value < 0.005) return "<0,01";
  if (Math.abs(value) < 1) return formatTwoDecimals.format(value);
  if (ONE_DECIMAL_UNITS.has(unit) && Math.abs(value) < 100) return formatOneDecimal.format(value);
  return formatWhole.format(value);
}
