/**
 * Locks the page's scroll (body overflow hidden) while at least one sheet needs it. Counted: the add sheet and the portion sheet
 * over it both lock, and the first to close must not give the page its scroll back under the second, so the original value is saved
 * by the first lock and restored by the last release.
 */
let locks = 0;
let saved = "";

/** Returns the release function; calling it twice releases once. */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  if (locks++ === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) document.body.style.overflow = saved;
  };
}

/** Tests only. */
export function bodyScrollLocks(): number {
  return locks;
}
