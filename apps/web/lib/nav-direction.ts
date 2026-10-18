/**
 * Which way a screen change goes (cc-55), for components/route-transition.tsx and the /add sheet.
 * - "push": a screen opened on top (a food, a settings page): it slides in from the right.
 * - "back": Back (the browser's, the phone's or a screen's own back button): the slide reverses.
 * - "sheet-up": /add opens. It is a sheet over Hôm nay and slides itself up, so the screen change has no transition.
 * - "sheet-down": Back out of /add: its panel slides down off Hôm nay.
 * - "tab": a tab of the bottom nav or the sidebar: no transition at all (tapped hundreds of times a day).
 * - "none": the first screen, the same screen with another query, /add closed by its own ✕ (it slid down already),
 *   and everything when reduced motion or Data Saver is on.
 * navKind is pure; the rest is a tiny store fed by popstate and by the screens that go back in code.
 */
import { HOME_ROUTE, NAV_TABS } from "./nav";

export type NavKind = "none" | "push" | "back" | "sheet-up" | "sheet-down" | "tab";

/** The routes that are a sheet over Hôm nay rather than a screen of their own. */
export const SHEET_ROUTES = ["/add"];

const TAB_ROOTS = new Set(NAV_TABS.map((t) => t.href));

const path = (p: string) => p.split("?")[0].replace(/\/+$/, "") || "/";
export const isTabRoot = (p: string) => TAB_ROOTS.has(path(p));
export const isSheetRoute = (p: string) => SHEET_ROUTES.includes(path(p));

export interface NavFlags {
  /** The change came from popstate (the browser's or the phone's Back) or from a screen's own back button. */
  back: boolean;
  /** The sheet being left already slid down (its ✕, Esc, the scrim or a drag closed it). */
  sheetClosed: boolean;
}

export function navKind(from: string | null, to: string, flags: NavFlags): NavKind {
  if (from === null || path(from) === path(to)) return "none";
  if (isSheetRoute(from)) return flags.sheetClosed || !flags.back ? "none" : "sheet-down";
  if (isSheetRoute(to)) return flags.back ? "none" : "sheet-up";
  if (isTabRoot(from) && isTabRoot(to)) return "tab";
  if (flags.back) return "back";
  if (isTabRoot(to)) return "tab";
  return "push";
}

/** The view-transition class of a change (globals.css ::view-transition-*), or "none" for no transition. */
export function transitionClass(kind: NavKind): string {
  if (kind === "push") return "m-vt-push";
  if (kind === "back") return "m-vt-back";
  if (kind === "sheet-down") return "m-vt-sheet-down";
  return "none";
}

// ---- the store (client only) ----
let flags: NavFlags = { back: false, sheetClosed: false };
// Where the last popstate landed. A popstate that changes no route (a sheet taking its history entry back) must not
// make a later change look like Back, so Back counts only when the new screen is the one popstate landed on.
let poppedTo: string | null = null;
let current: { path: string; kind: NavKind; popped: boolean } | null = null;
const scrollOf = new Map<string, number>();

const motionOff = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true ||
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/** A screen goes back in code (router.back or replace to its parent): the change slides back, like Back. */
export function markBack(): void {
  flags.back = true;
}

/** The /add sheet slid down by itself before leaving: the change that follows has no transition. */
export function markSheetClosed(): void {
  flags.sheetClosed = true;
  flags.back = true;
}

/**
 * The kind of change that lands on `pathname`, worked out once per path (React may render a screen more than once).
 * Called while the new screen renders, when the old one is still on screen: its scroll position is kept for /add.
 */
export function navKindFor(pathname: string): NavKind {
  if (typeof window === "undefined") return "none";
  if (current?.path === pathname) return current.kind;
  const from = current?.path ?? null;
  if (from !== null) scrollOf.set(path(from), window.scrollY);
  const popped = poppedTo === path(pathname);
  let kind = navKind(from, pathname, { ...flags, back: flags.back || popped });
  if (kind !== "sheet-up" && motionOff()) kind = "none";
  flags = { back: false, sheetClosed: false };
  poppedTo = null;
  current = { path: pathname, kind, popped };
  return kind;
}

/**
 * The class for React's <ViewTransition> on this screen change. A popstate is never React's: React finishes it in the
 * same task without a view transition, so startPopTransition below runs that one itself.
 */
export function reactTransitionClass(pathname: string): string {
  const kind = navKindFor(pathname);
  return current?.popped ? "none" : transitionClass(kind);
}

/** Where Hôm nay was scrolled when it was left, so the /add sheet draws it behind at the same place. */
export function scrollOfHome(): number {
  return scrollOf.get(HOME_ROUTE) ?? 0;
}

// ---- Back (popstate) as a view transition ----
/** How long a Back waits for the screen it lands on before it gives up on the animation (the page is not cached). */
const POP_WAIT_MS = 300;
let committed: { path: string; resolve: () => void } | null = null;

/** The screen for `pathname` is on the page (RouteTransition's layout effect): a Back waiting for it can animate. */
export function screenCommitted(pathname: string): void {
  if (committed && committed.path === path(pathname)) {
    committed.resolve();
    committed = null;
  }
}

if (typeof window !== "undefined") {
  let replaying = false;
  // Capture: it runs before Next's own popstate handler. For a Back that changes the screen it starts the view
  // transition (the old screen is captured first) and hands the popstate to Next inside it.
  window.addEventListener(
    "popstate",
    (e) => {
      if (replaying) return;
      const to = path(window.location.pathname);
      const kind = current ? navKind(current.path, to, { back: true, sheetClosed: flags.sheetClosed }) : "none";
      const ua = (e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true;
      if ((kind !== "back" && kind !== "sheet-down") || ua || motionOff() || !document.startViewTransition) return;
      e.stopImmediatePropagation();
      const root = document.documentElement;
      root.dataset.vt = kind;
      const vt = document.startViewTransition(() => {
        replaying = true;
        try {
          window.dispatchEvent(new PopStateEvent("popstate", { state: e.state }));
        } finally {
          replaying = false;
        }
        if (current?.path === to) return;
        return new Promise<void>((resolve) => {
          committed = { path: to, resolve };
          setTimeout(() => {
            if (committed?.path !== to) return;
            committed = null;
            vt.skipTransition();
            resolve();
          }, POP_WAIT_MS);
        });
      });
      vt.finished.finally(() => delete root.dataset.vt);
    },
    { capture: true }
  );
  // Every popstate (the one Next receives too): where it landed
  window.addEventListener("popstate", () => {
    poppedTo = path(window.location.pathname);
  });
}
