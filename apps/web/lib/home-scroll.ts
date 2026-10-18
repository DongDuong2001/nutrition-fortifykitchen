// cc-55: where Hôm nay was scrolled when it was left (lib/nav-direction records it), so the /add sheet draws Hôm nay
// behind itself at the same place. Its own tiny module so the /add page does not pull in the nav-direction store.
let y = 0;

export function setHomeScroll(value: number): void {
  y = value;
}

export function homeScroll(): number {
  return y;
}
