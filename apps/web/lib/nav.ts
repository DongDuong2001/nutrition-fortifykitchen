/**
 * Navigation map for the bottom nav and the desktop sidebar: the four tabs, which tab owns each route, where
 * "back" goes when there is no in-app history, and the in-app history stack. Pure functions, no React.
 * Hôm nay is HOME_ROUTE (/app; "/" is the coach link page), Tổng quan is /trends, Nhật ký is no longer a tab (it lives under Hôm nay).
 */
import { HOME_ROUTE, OVERVIEW_ROUTE } from "./home-route";

/** Hôm nay. Every link, redirect and route check that means Hôm nay uses this (it lives in ./home-route). */
export { HOME_ROUTE };

export type NavTab = "today" | "overview" | "explore" | "settings";

export const NAV_TABS: { tab: NavTab; href: string; label: string }[] = [
  { tab: "today", href: HOME_ROUTE, label: "Hôm nay" },
  { tab: "overview", href: OVERVIEW_ROUTE, label: "Tổng quan" },
  { tab: "explore", href: "/explore", label: "Khám phá" },
  { tab: "settings", href: "/settings", label: "Cài đặt" },
];

/** The tab that owns each first path segment. Pushed screens highlight their owner. */
const OWNER: Record<string, NavTab> = {
  app: "today",
  diary: "today",
  add: "today",
  entry: "today",
  explore: "explore",
  foods: "explore",
  settings: "settings",
  profile: "settings",
  privacy: "settings",
  terms: "settings",
  admin: "settings",
  micros: "today",
  trends: "overview",
  training: "today",
};

function segments(pathname: string): string[] {
  return pathname.split("?")[0].split("/").filter(Boolean);
}

/** The tab to highlight for a route, or null for routes without the nav (sign-in, setup...). */
export function tabForPath(pathname: string | null | undefined): NavTab | null {
  if (!pathname) return null;
  const [first] = segments(pathname);
  return OWNER[first] ?? null;
}

/** Where back goes when there is no in-app history: the screen's parent, or its owning tab. */
export function backFallback(pathname: string | null | undefined, search?: string | null): string {
  if (!pathname) return HOME_ROUTE;
  const [first, second, third] = segments(pathname);
  const target = backTarget(first, second, third, search);
  // Day screens keep the day being viewed, so back from a past day lands on that day, not on today.
  const date = new URLSearchParams(search ?? "").get("date");
  const isDayScreen = first === "micros" || first === "training" || first === "add" || first === "entry";
  return isDayScreen && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${target}?date=${date}` : target;
}

/** Compare goes back to the first food of its ?ids= list (the page it was opened from), else to the add sheet. */
function compareBack(search: string | null | undefined): string {
  const ids = new URLSearchParams(search ?? "").get("ids") ?? "";
  const first = ids.split(",").map((id) => id.trim()).find((id) => /^[\w-]+$/.test(id));
  return first ? `/foods/${first}` : "/add";
}

function backTarget(first: string | undefined, second: string | undefined, third: string | undefined, search?: string | null): string {
  if (first === "micros" && second) return "/micros";
  if (first === "micros" || first === "training") return HOME_ROUTE;
  if (first === "trends" && second) return "/trends";
  if (first === "settings") {
    if (third === "weight") return "/settings/profile";
    return "/settings";
  }
  if (first === "explore" && second === "coaches" && third) return "/explore/coaches";
  if (first === "explore" && second === "ngay-mau" && third) return "/explore/ngay-mau";
  if (first === "foods" && second === "compare") return compareBack(search);
  if (first === "explore" || first === "foods") return "/explore";
  if (first === "privacy" || first === "terms" || first === "admin") return "/settings";
  if (first === "add" || first === "entry") return HOME_ROUTE;
  return HOME_ROUTE;
}

const MAX_HISTORY = 50;

/**
 * The in-app history after landing on `pathname`. A path equal to the one before the current is a browser back,
 * so it pops. When a path only looks like a back (A → B → A by link) the stack is shorter than the real
 * history, which is safe: back then goes to the owning tab instead of leaving the app.
 */
export function nextHistory(stack: readonly string[], pathname: string): string[] {
  if (stack.length === 0) return [pathname];
  if (stack[stack.length - 1] === pathname) return [...stack];
  if (stack.length >= 2 && stack[stack.length - 2] === pathname) return stack.slice(0, -1);
  return [...stack, pathname].slice(-MAX_HISTORY);
}

export function canGoBack(stack: readonly string[]): boolean {
  return stack.length > 1;
}

/** The query keys that belong to Hôm nay: a past day, demo mode and its persona and level, the meal, the state previews. */
const HOME_QUERY_KEYS = ["date", "demo", "as", "level", "meal", "loading", "offline"];

/**
 * Old links to Hôm nay were "/?date=…" (and the like). "/" is now the coach link page, so a "/" with any Hôm nay key
 * goes to HOME_ROUTE with the whole query kept. Null when the query has none of them.
 */
export function homeRedirectFor(params: Record<string, string | string[] | undefined>): string | null {
  if (!HOME_QUERY_KEYS.some((key) => params[key] !== undefined)) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  return `${HOME_ROUTE}?${query.toString()}`;
}
