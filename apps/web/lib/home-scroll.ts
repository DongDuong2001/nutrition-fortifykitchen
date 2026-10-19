// cc-55: where Hôm nay was scrolled when it was left (lib/nav-direction records it), so the /add sheet draws Hôm nay
// behind itself at the same place. Its own tiny module so the /add page does not pull in the nav-direction store.
let y: number | null = null;

export function setHomeScroll(value: number): void {
  y = value;
}

export function homeScroll(): number {
  return y ?? 0;
}

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

/** cc-55b: /add was opened from Hôm nay in this tab (not by a link or a reload). */
export function cameFromHome(): boolean {
  return y !== null;
}
