/**
 * Sheets and the browser history (cc-51, review 07:00 M1). An open sheet pushes one entry, a copy of the router's own
 * state, so Back closes the sheet instead of leaving the page. Closed another way, the entry is taken back with a
 * delayed history.back(). Two things must never happen:
 * - a history.back() while a navigation is pending: the popstate makes Next restore the page and drop the navigation
 *   (a day picked in the calendar did nothing on a slow network);
 * - a navigation that leaves the sheet's entry behind, so one Back lands on the same page.
 * So a navigation from an open sheet replaces the sheet's entry (navigateFromSheet), and nothing is taken back then.
 */

interface SheetRouter {
  push(href: string): void;
  replace(href: string): void;
}

/** How long a closed sheet waits before taking its entry back (a route change or another sheet may come first). */
export const SHEET_BACK_DELAY_MS = 50;

// The open sheets with an entry, the topmost last
const openIds: number[] = [];
let lastId = 0;
// How many closing sheets must not take their entry back themselves (a navigation takes it, or goes back past it)
let sheetNavigating = 0;
// A closed sheet whose entry is about to be taken back
let pendingBack: { id: number; timer: ReturnType<typeof setTimeout> } | null = null;

const entryOnTop = (): number | undefined => window.history.state?.h1tSheet;

/** The open sheet whose entry is on top of the history, or null. */
export function topSheetId(): number | null {
  const top = openIds[openIds.length - 1];
  return top !== undefined && entryOnTop() === top ? top : null;
}

/** A sheet opens: its entry goes on top. A sheet that has just closed hands its entry over (no back, then push). */
export function openSheetEntry(): number {
  const id = ++lastId;
  const state = { ...(window.history.state ?? {}), h1tSheet: id };
  if (pendingBack && entryOnTop() === pendingBack.id) {
    clearTimeout(pendingBack.timer);
    pendingBack = null;
    window.history.replaceState(state, "");
  } else {
    window.history.pushState(state, "");
  }
  openIds.push(id);
  return id;
}

/**
 * A view drawn again on the entry it had: Back from a page it navigated to landed on that entry (the + sheet's portion
 * view after So sánh). The entry on top is a sheet's that no open sheet holds: it is taken as this one's, nothing is
 * pushed. Null when the entry on top is not such an entry.
 */
export function adoptSheetEntry(): number | null {
  const id = entryOnTop();
  if (id === undefined || openIds.includes(id)) return null;
  lastId = Math.max(lastId, id);
  openIds.push(id);
  return id;
}

/**
 * A sheet closes or unmounts. `href` is the address it opened on, `popped` true when Back closed it. Its entry is
 * taken back only when nothing navigates and nothing sits above it.
 */
export function closeSheetEntry(id: number, href: string, popped: boolean): void {
  const wasTop = openIds[openIds.length - 1] === id;
  const at = openIds.indexOf(id);
  if (at >= 0) openIds.splice(at, 1);
  if (sheetNavigating > 0) {
    sheetNavigating--;
    return;
  }
  if (popped || !wasTop) return;
  const timer = setTimeout(() => {
    if (pendingBack?.id === id) pendingBack = null;
    // The route changed (the sheet unmounted with its page), or another entry is on top: leave the history alone
    if (window.location.href === href && entryOnTop() === id) window.history.back();
  }, SHEET_BACK_DELAY_MS);
  pendingBack = { id, timer };
}

/**
 * Navigates from an open (or just closed) sheet: the sheet's entry becomes the destination, so Back returns to the
 * page under the sheet. Anywhere else it is a plain push.
 */
export function navigateFromSheet(router: SheetRouter, href: string): void {
  if (typeof window === "undefined") return router.push(href);
  const top = entryOnTop();
  if (top !== undefined && pendingBack?.id === top) {
    clearTimeout(pendingBack.timer);
    pendingBack = null;
    return router.replace(href);
  }
  if (top !== undefined && topSheetId() === top) {
    sheetNavigating++;
    return router.replace(href);
  }
  router.push(href);
}

/**
 * The page under some sheets is about to be left by going back past their entries (the add sheet closing after an add,
 * with a portion or kcal sheet still open over it). Those sheets must not take their entry back themselves while they
 * close; this says how many entries sit on top of the page's own, so the caller can go back past all of them at once.
 */
export function takeBackSheetEntries(): number {
  let count = openIds.length;
  if (pendingBack && entryOnTop() === pendingBack.id) {
    clearTimeout(pendingBack.timer);
    pendingBack = null;
    count++;
  }
  sheetNavigating += openIds.length;
  return count;
}
