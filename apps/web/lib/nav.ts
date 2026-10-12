/**
 * Navigation map for IA v2 (design/IA-v2.md): the four tabs, which tab owns each route, where "back" goes
 * when there is no in-app history, and the in-app history stack. Pure functions, no React.
 */
export type NavTab = "overview" | "diary" | "explore" | "settings";

export const NAV_TABS: { tab: NavTab; href: string; label: string }[] = [
  { tab: "overview", href: "/", label: "Tổng quan" },
  { tab: "diary", href: "/diary", label: "Nhật ký" },
  { tab: "explore", href: "/explore", label: "Khám phá" },
  { tab: "settings", href: "/settings", label: "Cài đặt" },
];

/** The tab that owns each first path segment. Pushed screens highlight their owner. */
const OWNER: Record<string, NavTab> = {
  diary: "diary",
  add: "diary",
  entry: "diary",
  explore: "explore",
  foods: "explore",
  settings: "settings",
  profile: "settings",
  micros: "diary",
  trends: "overview",
  training: "diary",
};

function segments(pathname: string): string[] {
  return pathname.split("?")[0].split("/").filter(Boolean);
}

/** The tab to highlight for a route, or null for routes without the nav (sign-in, setup...). */
export function tabForPath(pathname: string | null | undefined): NavTab | null {
  if (!pathname) return null;
  const [first] = segments(pathname);
  if (first === undefined) return "overview";
  return OWNER[first] ?? null;
}

/** Where back goes when there is no in-app history: the screen's parent, or its owning tab. */
export function backFallback(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const parts = segments(pathname);
  const [first, second, third] = parts;
  if (first === "micros" && second) return "/micros";
  if (first === "micros" || first === "training") return "/diary";
  if (first === "settings") {
    if (third === "weight") return "/settings/profile";
    return "/settings";
  }
  if (first === "explore" || first === "foods") return "/explore";
  if (first === "add" || first === "entry") return "/diary";
  return "/";
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
