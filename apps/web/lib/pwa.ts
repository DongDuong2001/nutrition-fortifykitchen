// PWA helpers: what the service worker caches and what it never does, and the install state of this device.
// public/sw.js is plain JS served as-is and cannot import this file, so it carries a copy of routeFor;
// lib/__tests__/pwa.test.ts runs the real sw.js and checks both agree.

/** Manifest colours, the same values as --color-paper and --color-ink in globals.css (a manifest cannot read CSS). */
export const PAPER_COLOR = "#F3F1EC";
export const INK_COLOR = "#111317";

/** The app shell, precached when the service worker installs. */
export const PRECACHE_PAGES = ["/", "/diary", "/explore", "/settings", "/offline"] as const;

/** Sign-in and account routes plus the API: never read from or written to a cache. */
export const NEVER_CACHED = ["/signin", "/signup", "/reset-password", "/login", "/api"] as const;

export type RouteKind =
  | "never" // auth and API: always the network, never a cache
  | "static" // hashed build assets, icons, fonts: cache first
  | "navigate" // a page load: network first, then the cache, then /offline
  | "pass"; // anything else: the browser handles it

const FONT_FILE = /\.(?:woff2?|ttf|otf)$/i;

/** True for the prefix itself and anything below it ("/signin" and "/signin/expired", not "/signing"). */
function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isNeverCached(pathname: string): boolean {
  return NEVER_CACHED.some((prefix) => under(pathname, prefix));
}

export function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/") || FONT_FILE.test(pathname);
}

/** How the service worker treats a same-origin request. */
export function routeFor(pathname: string, mode: string, method: string): RouteKind {
  if (method !== "GET") return "pass";
  if (isNeverCached(pathname)) return "never";
  if (isStaticAsset(pathname)) return "static";
  if (mode === "navigate") return "navigate";
  return "pass";
}

/** The service worker is registered in production only, so `next dev` never serves a stale shell. */
export function shouldRegisterServiceWorker(nodeEnv: string | undefined, supported: boolean): boolean {
  return nodeEnv === "production" && supported;
}

export type InstallView =
  | "installed" // already running as an app
  | "prompt" // the browser offered beforeinstallprompt: one button
  | "ios" // iPhone/iPad: three steps
  | "manual"; // nothing to offer here

export interface InstallEnv {
  standalone: boolean;
  canPrompt: boolean;
  ios: boolean;
}

export function installView({ standalone, canPrompt, ios }: InstallEnv): InstallView {
  if (standalone) return "installed";
  if (canPrompt) return "prompt";
  if (ios) return "ios";
  return "manual";
}

/** iPhone, iPod and iPad, including iPadOS 13+ which reports itself as a Mac with touch. */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** Safari itself (not Chrome, Firefox or Edge on iOS): the browser the three steps describe. */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  return isIosDevice(userAgent, maxTouchPoints) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
}
