// The app's day is the Asia/Ho_Chi_Minh day: UTC+7 all year, no daylight saving. One place for the zone, the day key,
// the date parts, the clock time and the next midnight (date.ts, format.ts, day-archive.ts and meal-slot.ts read these),
// so every screen agrees on the day whatever zone the phone is set to.

export const TIMEZONE_VN = "Asia/Ho_Chi_Minh";

const DAY_MS = 24 * 60 * 60 * 1000;
// Ho Chi Minh is UTC+7 all year, so its midnight is 17:00 UTC
const OFFSET_MS = 7 * 60 * 60 * 1000;

const dayKeyFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: TIMEZONE_VN, year: "numeric", month: "2-digit", day: "2-digit" });

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE_VN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const clockFormatter = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE_VN, hour: "numeric", minute: "numeric", hour12: false });

/** The Ho Chi Minh day of an instant, as YYYY-MM-DD. */
export function vnDayKey(instant: Date): string {
  return dayKeyFormatter.format(instant);
}

/** The Ho Chi Minh date of an instant as strings: year "2026", month "10", day "05", weekday "Mon". */
export function vnDateParts(instant: Date): { year: string; month: string; day: string; weekday: string } {
  const out = { year: "", month: "", day: "", weekday: "" };
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type === "year" || part.type === "month" || part.type === "day" || part.type === "weekday") out[part.type] = part.value;
  }
  return out;
}

/** The Ho Chi Minh clock time of an instant (hours 0–23). */
export function vnClock(instant: Date): { hours: number; minutes: number } {
  let hours = 0;
  let minutes = 0;
  for (const part of clockFormatter.formatToParts(instant)) {
    if (part.type === "hour") hours = parseInt(part.value, 10) % 24; // some engines say 24 at midnight
    else if (part.type === "minute") minutes = parseInt(part.value, 10);
  }
  return { hours, minutes };
}

/** Noon of a Ho Chi Minh day (YYYY-MM-DD): an instant safely inside that day in every zone. */
export function vnNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+07:00`);
}

/** Milliseconds until the next midnight in Ho Chi Minh. Never 0: at midnight sharp it is a whole day. */
export function msUntilNextDay(now: Date): number {
  const local = now.getTime() + OFFSET_MS;
  return DAY_MS - (((local % DAY_MS) + DAY_MS) % DAY_MS);
}
