/**
 * Job I: which food row rests open (Xóa or ⋯ showing) — one at a time. Opening a row closes the one before; every row listens.
 * `swipedAway` remembers a row that was swiped off to the left and deleted, so the row that plays its exit (components/home/row-motion)
 * starts from the left edge instead of jumping back.
 */
let openId: string | null = null;
const listeners = new Set<() => void>();
const swiped = new Set<string>();

export const getOpenRow = (): string | null => openId;
export function setOpenRow(id: string | null): void {
  if (openId === id) return;
  openId = id;
  listeners.forEach((l) => l());
}
export const subscribeOpenRow = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function markSwipedAway(id: string): void {
  swiped.add(id);
  // Long enough for the exit to be drawn once (200 ms), short enough that a row put back by Hoàn tác is a normal row
  setTimeout(() => swiped.delete(id), 1000);
}
export const wasSwipedAway = (id: string): boolean => swiped.has(id);
