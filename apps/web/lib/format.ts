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

const TIMEZONE_VN = "Asia/Ho_Chi_Minh";

const WEEKDAY_NAMES_VI: Record<string, string> = {
  Sun: "Chủ nhật",
  Mon: "Thứ 2",
  Tue: "Thứ 3",
  Wed: "Thứ 4",
  Thu: "Thứ 5",
  Fri: "Thứ 6",
  Sat: "Thứ 7",
};

const vnDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE_VN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

function getSaigonDateParts(d: Date) {
  const parts = vnDateFormatter.formatToParts(d);
  let year = "";
  let month = "";
  let day = "";
  let weekday = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
    else if (part.type === "weekday") weekday = part.value;
  }
  return { year, month, day, weekday };
}

function parseTargetDate(targetDate: Date | string): Date {
  if (targetDate instanceof Date) return targetDate;
  if (typeof targetDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return new Date(`${targetDate}T12:00:00+07:00`);
    }
    return new Date(targetDate);
  }
  return new Date(targetDate);
}

/**
 * Format a date for header display relative to `now`:
 * - "Hôm nay, dd/mm" if target is the same day as now in Asia/Ho_Chi_Minh
 * - "Chủ nhật, dd/mm" for Sunday (never "Thứ 1")
 * - "Thứ 2, dd/mm" through "Thứ 7, dd/mm" for Monday through Saturday
 *
 * `now` is a required parameter so that formatting is pure and hydration-safe (no `new Date()` inside).
 */
export function formatDayLabel(targetDate: Date | string, now: Date): string {
  const target = parseTargetDate(targetDate);
  if (isNaN(target.getTime()) || isNaN(now.getTime())) {
    return String(targetDate);
  }

  const targetParts = getSaigonDateParts(target);
  const nowParts = getSaigonDateParts(now);

  const isToday =
    targetParts.year === nowParts.year &&
    targetParts.month === nowParts.month &&
    targetParts.day === nowParts.day;

  if (isToday) {
    return `Hôm nay, ${targetParts.day}/${targetParts.month}`;
  }

  // Yesterday in Asia/Ho_Chi_Minh (UTC+7 has no DST, exactly 24h before now)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayParts = getSaigonDateParts(yesterday);
  const isYesterday =
    targetParts.year === yesterdayParts.year &&
    targetParts.month === yesterdayParts.month &&
    targetParts.day === yesterdayParts.day;

  if (isYesterday) {
    return `Hôm qua, ${targetParts.day}/${targetParts.month}`;
  }

  const dayName = WEEKDAY_NAMES_VI[targetParts.weekday] || targetParts.weekday;
  return `${dayName}, ${targetParts.day}/${targetParts.month}`;
}

