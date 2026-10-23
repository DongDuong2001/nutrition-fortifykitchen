import type { MouseEvent } from "react";
import { homeDay } from "@/lib/home-scroll";

/** fix/compare-back: the + sheet as So sánh left it, for the Back from the comparison (components/add/add-screen). */
export const ADD_RETURN_KEY = "h1t_add_return_v1";

/**
 * Remembers which control opened /add, so focus can return to it. Storage may be blocked. A + tapped anywhere (the nav's on the
 * comparison page too) starts a new add: the So sánh return note goes.
 */
export function rememberAddOpener(id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADD_RETURN_KEY);
    sessionStorage.setItem("last_add_opener_id", id);
  } catch {
    // Storage unavailable: focus falls back to the default opener.
  }
}

/**
 * The + of the nav and of the sidebar: remembers the opener, and when Hôm nay is showing yesterday opens /add?date=… so the
 * screen under the sheet stays on that day (it reads the day from the address) and the sheet adds to it. Any other click is
 * the link as it is, and so is a modified one (a new tab).
 */
export function openAddFrom(id: string, e: MouseEvent<HTMLElement>, router: { push(href: string): void }) {
  rememberAddOpener(id);
  const day = homeDay();
  if (!day || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  router.push(`/add?date=${day}`);
}
