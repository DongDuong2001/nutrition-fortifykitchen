import type { MockDayData } from "./mock/sample-day";
import { formatDesktopDate } from "./format";

const TIMEZONE_VN = "Asia/Ho_Chi_Minh";

const isoDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TIMEZONE_VN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns today's date as YYYY-MM-DD in Asia/Ho_Chi_Minh timezone.
 * Uses the client's clock, so it must be called on the client after mount.
 */
export function getTodayIsoVN(): string {
  return isoDateFormatter.format(new Date());
}

/**
 * Returns a copy of the day set to the given date (YYYY-MM-DD): the date, its "Hôm nay" label and the
 * desktop subtitle. Pure: the day it is given is not changed.
 */
export function withRuntimeDate(day: MockDayData, isoDate: string): MockDayData {
  const [, month, dayOfMonth] = isoDate.split("-");
  const { trainingMinutes, goalLabel, weightKg } = day.user;
  return {
    ...day,
    date: isoDate,
    dateLabel: `Hôm nay, ${dayOfMonth}/${month}`,
    desktopDateLabel: `${formatDesktopDate(isoDate)} · Ngày tập ${trainingMinutes}′ · ${goalLabel} · ${weightKg} kg`,
  };
}
