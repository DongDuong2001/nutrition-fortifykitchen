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
