/**
 * Where a food row was let go (cc-70 touch drag). The copy under the finger is removed at the drop and the row is drawn in its
 * new meal; row-motion.ts plays that row in from where the copy was (a FLIP from the copy's last box, scale included), so it
 * lands from under the finger instead of sliding in from the place it left. A landing is read once and is only good for a
 * moment: a move that comes later (another day, an undo) has nothing to do with it.
 */
export interface Landing {
  /** The centre of the copy on screen, in viewport px, and its width. */
  cx: number;
  cy: number;
  width: number;
  at: number;
}

/** A landing older than this is a different move. */
export const LANDING_MAX_AGE_MS = 1000;

const landings = new Map<string, Landing>();

export function setLanding(id: string, box: { cx: number; cy: number; width: number }, now = performance.now()): void {
  landings.set(id, { ...box, at: now });
}

export function takeLanding(id: string, now = performance.now()): Landing | null {
  const landing = landings.get(id) ?? null;
  landings.delete(id);
  return landing && now - landing.at <= LANDING_MAX_AGE_MS ? landing : null;
}

/** A row's FLIP keyframe from the copy's box to the row's own box (both in viewport px): translate, then scale about the centre. */
export function landingTransform(landing: Landing, row: { left: number; top: number; width: number; height: number }): string {
  const dx = landing.cx - (row.left + row.width / 2);
  const dy = landing.cy - (row.top + row.height / 2);
  const scale = row.width > 0 ? landing.width / row.width : 1;
  return `translate(${Math.round(dx * 10) / 10}px, ${Math.round(dy * 10) / 10}px) scale(${Math.round(scale * 1000) / 1000})`;
}
