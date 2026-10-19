import { vnDateParts, vnNoon } from "./vn-time";

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
const ONE_DECIMAL_UNITS = new Set(["g", "mg", "µg"]);

/**
 * An amount with its unit: kcal is whole. g, mg, µg are one decimal under 100, else whole.
 * Any value under 1 keeps up to two decimals. A positive value that would round to 0 shows "<0,01".
 * For plain counts, use formatNumber.
 */
export function formatAmount(value: number, unit: string): string {
  if (value > 0 && value < 0.005) return "<0,01";
  if (Math.abs(value) < 1) return formatTwoDecimals.format(value);
  if (ONE_DECIMAL_UNITS.has(unit) && Math.abs(value) < 100) return formatOneDecimal.format(value);
  return formatWhole.format(value);
}

const WEEKDAY_NAMES_VI: Record<string, string> = {
  Sun: "Chủ nhật",
  Mon: "Thứ Hai",
  Tue: "Thứ Ba",
  Wed: "Thứ Tư",
  Thu: "Thứ Năm",
  Fri: "Thứ Sáu",
  Sat: "Thứ Bảy",
};

function parseTargetDate(targetDate: Date | string): Date {
  if (targetDate instanceof Date) return targetDate;
  if (typeof targetDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return vnNoon(targetDate);
    }
    return new Date(targetDate);
  }
  return new Date(targetDate);
}

/**
 * Get Vietnamese weekday name (full name: "Thứ Hai"…"Thứ Bảy", "Chủ nhật").
 */
export function getWeekdayName(targetDate: Date | string): string {
  const target = parseTargetDate(targetDate);
  if (isNaN(target.getTime())) return "";
  const parts = vnDateParts(target);
  return WEEKDAY_NAMES_VI[parts.weekday] || parts.weekday;
}

/**
 * Format a date for header display relative to `now`:
 * - "Hôm nay dd/mm" if target is the same day as now in Asia/Ho_Chi_Minh
 * - "Chủ nhật dd/mm" for Sunday (never "Thứ 1")
 * - "Thứ Hai dd/mm" through "Thứ Bảy dd/mm" for Monday through Saturday
 *
 * `now` is a required parameter so that formatting is pure and hydration-safe (no `new Date()` inside).
 */
export function formatDayLabel(targetDate: Date | string, now: Date): string {
  const target = parseTargetDate(targetDate);
  if (isNaN(target.getTime()) || isNaN(now.getTime())) {
    return String(targetDate);
  }

  const targetParts = vnDateParts(target);
  const nowParts = vnDateParts(now);

  const isToday =
    targetParts.year === nowParts.year &&
    targetParts.month === nowParts.month &&
    targetParts.day === nowParts.day;

  if (isToday) {
    return `Hôm nay ${targetParts.day}/${targetParts.month}`;
  }

  // Yesterday in Asia/Ho_Chi_Minh (UTC+7 has no DST, exactly 24h before now)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayParts = vnDateParts(yesterday);
  const isYesterday =
    targetParts.year === yesterdayParts.year &&
    targetParts.month === yesterdayParts.month &&
    targetParts.day === yesterdayParts.day;

  if (isYesterday) {
    return `Hôm qua ${targetParts.day}/${targetParts.month}`;
  }

  const dayName = getWeekdayName(target);
  return `${dayName} ${targetParts.day}/${targetParts.month}`;
}

/**
 * Format a date as full Vietnamese desktop date:
 * e.g. "Thứ Bảy, 10/10/2026"
 */
export function formatDesktopDate(targetDate: Date | string): string {
  const target = parseTargetDate(targetDate);
  if (isNaN(target.getTime())) return String(targetDate);
  const parts = vnDateParts(target);
  const weekday = getWeekdayName(target);
  return `${weekday}, ${parts.day}/${parts.month}/${parts.year}`;
}


/**
 * A change with its sign: "+18", "−12" (a real minus sign, U+2212) and "0" for no change.
 * Decimals default to 0. A value that rounds to zero carries no sign.
 */
export function formatSigned(value: number, options?: FormatNumberOptions): string {
  const decimals = options?.decimals ?? 0;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  const text = formatNumber(Math.abs(rounded), { decimals });
  if (rounded === 0) return text;
  return `${rounded > 0 ? "+" : "−"}${text}`;
}

/** A whole percent with no space before the sign: "28%", or "+18%" / "−12%" when signed. */
export function formatPercent(value: number, options?: { signed?: boolean }): string {
  return `${options?.signed ? formatSigned(value) : formatNumber(Math.round(value))}%`;
}

/** The dates of a period: "06–12/10" within one month, "13/09–12/10" across two, "12/10" for one day. */
export function formatPeriodRange(startIso: string, endIso: string): string {
  const [, startMonth, startDay] = startIso.split("-");
  const [, endMonth, endDay] = endIso.split("-");
  if (startIso === endIso) return `${endDay}/${endMonth}`;
  return startMonth === endMonth ? `${startDay}–${endDay}/${endMonth}` : `${startDay}/${startMonth}–${endDay}/${endMonth}`;
}
