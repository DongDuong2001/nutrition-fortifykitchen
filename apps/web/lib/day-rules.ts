import { daysBefore, shiftIsoDate } from "./day-history";

/**
 * cc-68 (Hao 19/10): today AND yesterday are editable (add, edit, delete, move, copy into); two or more days back stay
 * read-only. The API allows the same window (409 PAST_DAY_READ_ONLY beyond it). One constant, so the yesterday UI can
 * ship together with, or right after, the API change: set it to 0 and only today is editable again.
 */
export const EDITABLE_PAST_DAYS = 1;

/** The oldest day that can still be edited when today is `todayIso`. */
export function editableFrom(todayIso: string, pastDays: number = EDITABLE_PAST_DAYS): string {
  return shiftIsoDate(todayIso, -Math.max(0, pastDays));
}

/** Whether `iso` can be added to, edited and deleted from: today, or one of the EDITABLE_PAST_DAYS before it. */
export function isEditableDay(iso: string, todayIso: string, pastDays: number = EDITABLE_PAST_DAYS): boolean {
  return iso <= todayIso && iso >= editableFrom(todayIso, pastDays);
}

/** A day before today that is not editable (older than the window). */
export function isReadOnlyDay(iso: string, todayIso: string, pastDays: number = EDITABLE_PAST_DAYS): boolean {
  return iso < todayIso && !isEditableDay(iso, todayIso, pastDays);
}

/** Yesterday as YYYY-MM-DD (the Asia/Ho_Chi_Minh day before `todayIso`). */
export function yesterdayOf(todayIso: string): string {
  return shiftIsoDate(todayIso, -1);
}

/** The earlier day a "Chép hôm qua" on `iso` copies from. */
export function dayBefore(iso: string): string {
  return shiftIsoDate(iso, -1);
}

/** Whole days between two days; kept here so callers of the rules need one import. */
export function daysAgo(iso: string, todayIso: string): number {
  return daysBefore(iso, todayIso);
}
