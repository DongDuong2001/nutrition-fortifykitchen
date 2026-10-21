/**
 * Room for the "Có bản mới" toast on a phone: it sits right above the bottom nav and the screens leave the room for it instead
 * of letting it cover the last rows of a list. The toast sets --update-bar-h on <html> while it is up; the bottom padding of the tab
 * frame, Hôm nay's list height and the diary toast's place read it (globals.css and the components with `var(--update-bar-h`).
 */
export const UPDATE_BAR_HEIGHT_PX = 64;

export function setUpdateBar(visible: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--update-bar-h", visible ? `${UPDATE_BAR_HEIGHT_PX}px` : "0px");
}
