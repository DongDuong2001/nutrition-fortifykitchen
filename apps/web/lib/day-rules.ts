import { shiftIsoDate } from "./day-history";

/**
 * cc-68 (Hao 19/10): today AND yesterday are editable (add, edit, delete, move, copy into); two or more days back stay
 * read-only. The API allows the same window (409 PAST_DAY_READ_ONLY beyond it). One constant, so the yesterday UI can
 * ship together with, or right after, the API change: set it to 0 and only today is editable again.
 */
export const EDITABLE_PAST_DAYS = 1;

/** The oldest day that can still be edited when today is `todayIso`. */
export const editableFrom = (todayIso: string, pastDays: number = EDITABLE_PAST_DAYS): string => shiftIsoDate(todayIso, -Math.max(0, pastDays));

/** Whether `iso` can be added to, edited and deleted from: today, or one of the EDITABLE_PAST_DAYS before it. */
export const isEditableDay = (iso: string, todayIso: string, pastDays: number = EDITABLE_PAST_DAYS): boolean => iso <= todayIso && iso >= editableFrom(todayIso, pastDays);

/** Yesterday as YYYY-MM-DD (the Asia/Ho_Chi_Minh day before `todayIso`). */
export const yesterdayOf = (todayIso: string): string => shiftIsoDate(todayIso, -1);

/** How many days before today can be edited here: the rule in a real account, none in demo or the mock (their past is sample data). */
export const pastDaysFor = (live: boolean, demo: boolean): number => (live && !demo ? EDITABLE_PAST_DAYS : 0);
