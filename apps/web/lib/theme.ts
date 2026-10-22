/**
 * Dark mode, the hidden foundation (overnight 23/10, job 14; the plan is docs/plans/dark-mode.md).
 * Cài đặt › Giao diện offers Hệ thống / Sáng / Tối, kept on the device. Before the first paint THEME_SCRIPT puts
 * data-theme="dark" on <html> for Tối, or for Hệ thống on a phone set to dark; globals.css switches the tokens under it.
 * Light has no attribute and no rule, so it stays exactly as before.
 *
 * The flag is OFF: live users see no row and get no attribute until every screen is done. It turns on with
 * NEXT_PUBLIC_DARK_MODE=1 at build time, or, in a demo build only, with h1t_dark_preview=1 in localStorage (the
 * screenshots in the PR and tests/probes/dark_foundation.py use that).
 */

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "h1t_theme_v1";
export const DARK_PREVIEW_KEY = "h1t_dark_preview";
export const THEME_CHOICES: { id: ThemeChoice; label: string }[] = [
  { id: "system", label: "Hệ thống" },
  { id: "light", label: "Sáng" },
  { id: "dark", label: "Tối" },
];

const BUILD_ON = process.env.NEXT_PUBLIC_DARK_MODE === "1";
const DEMO_BUILD = process.env.NEXT_PUBLIC_DEMO_BUILD === "1";

/** The stored choice; anything else is Hệ thống. */
export function parseThemeChoice(raw: string | null | undefined): ThemeChoice {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** Whether a choice draws dark, given the phone's own setting. */
export function isDark(choice: ThemeChoice, systemDark: boolean): boolean {
  return choice === "dark" || (choice === "system" && systemDark);
}

/** Pure: the flag from the build switch and, in a demo build only, the preview key. */
export function darkModeOn(buildOn: boolean, demoBuild: boolean, preview: string | null): boolean {
  return buildOn || (demoBuild && preview === "1");
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function darkModeEnabled(): boolean {
  return darkModeOn(BUILD_ON, DEMO_BUILD, storage()?.getItem(DARK_PREVIEW_KEY) ?? null);
}

export function loadThemeChoice(): ThemeChoice {
  return parseThemeChoice(storage()?.getItem(THEME_KEY));
}

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/** Puts the attribute on <html> for a choice (nothing at all while the flag is off). */
export function applyTheme(choice: ThemeChoice = loadThemeChoice()): void {
  if (typeof document === "undefined" || !darkModeEnabled()) return;
  const root = document.documentElement;
  if (isDark(choice, window.matchMedia(SYSTEM_DARK).matches)) root.dataset.theme = "dark";
  else delete root.dataset.theme;
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    storage()?.setItem(THEME_KEY, choice);
  } catch {}
  applyTheme(choice);
}

/** Follows the phone switching between light and dark while the choice is Hệ thống. Returns the unsubscribe. */
export function followSystemTheme(): () => void {
  if (typeof window === "undefined" || !darkModeEnabled()) return () => {};
  const media = window.matchMedia(SYSTEM_DARK);
  const onChange = () => applyTheme();
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Inline in <head>, before the first paint (no flash of light on a dark choice). The same rules as darkModeOn and
 * isDark, written out because it runs before any bundle; lib/__tests__/theme.test.ts runs it against both.
 */
export const THEME_SCRIPT = `(function(){try{var l=window.localStorage;if(!(${BUILD_ON}||(${DEMO_BUILD}&&l.getItem("${DARK_PREVIEW_KEY}")==="1")))return;var c=l.getItem("${THEME_KEY}");if(c==="dark"||(c!=="light"&&window.matchMedia("${SYSTEM_DARK}").matches))document.documentElement.dataset.theme="dark"}catch(e){}})();`;
