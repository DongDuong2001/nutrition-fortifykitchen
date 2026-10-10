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

  // If decimal is present, format up to 2 decimal places without trailing zeros
  if (value % 1 !== 0) {
    const formatter = new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 2,
    });
    return formatter.format(value);
  }

  const formatter = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
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
