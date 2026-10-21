// Hôm nay's state that other screens read. Its own tiny module so the /add sheet does not pull in the nav-direction store.
let day: string | null = null;

/**
 * cc-68: the earlier day Hôm nay is showing while it can be edited (yesterday), or null. The + of the nav opens /add from
 * wherever it is; /add reads this to add to that day (the + Thêm of a meal names the day in the URL instead).
 */
export function setHomeDay(iso: string | null): void {
  day = iso;
}

export function homeDay(): string | null {
  return day;
}
