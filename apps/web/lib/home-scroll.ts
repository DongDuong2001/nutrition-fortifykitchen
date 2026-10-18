// cc-55: where Hôm nay was scrolled when it was left (lib/nav-direction records it), so the /add sheet draws Hôm nay
// behind itself at the same place. Its own tiny module so the /add page does not pull in the nav-direction store.
let y: number | null = null;

export function setHomeScroll(value: number): void {
  y = value;
}

export function homeScroll(): number {
  return y ?? 0;
}

/** cc-55b: /add was opened from Hôm nay in this tab (not by a link or a reload). */
export function cameFromHome(): boolean {
  return y !== null;
}
