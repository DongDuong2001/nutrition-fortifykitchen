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
