// PWA helpers: what the service worker caches and what it never does, and the install state of this device.
// public/sw.js is plain JS served as-is and cannot import this file, so it carries a copy of routeFor;
// lib/__tests__/pwa.test.ts runs the real sw.js and checks both agree.

import { HOME_ROUTE } from "./nav";

/** Manifest colours, the same values as --color-paper and --color-ink in globals.css (a manifest cannot read CSS). */
export const PAPER_COLOR = "#FFFFFF";
export const INK_COLOR = "#111317";

/** The app shell, precached when the service worker installs. */
export const PRECACHE_PAGES = ["/", HOME_ROUTE, "/trends", "/explore", "/settings", "/offline"] as const;

/**
 * Inline in the root layout's <head>: an app installed when start_url was "/" still opens on "/", which is now the coach
 * link page. Standalone on "/" hides the page and replaces it with Hôm nay before the first paint, query kept.
 */
export const STANDALONE_HOME_SCRIPT = `(function(){try{var s=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;if(s&&window.location.pathname==="/"){document.documentElement.style.visibility="hidden";window.location.replace("${HOME_ROUTE}"+window.location.search)}}catch(e){}})();`;

/** Sign-in and account routes, the auth callback, the invite page (its code is in the path) and the API: never read from or written to a cache. */
export const NEVER_CACHED = ["/signin", "/signup", "/reset-password", "/login", "/auth", "/join", "/api"] as const;

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

export function isAndroidDevice(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** The phone the install steps are for, or null on anything else. */
export function phoneKind(userAgent: string, maxTouchPoints = 0): "ios" | "android" | null {
  if (isIosDevice(userAgent, maxTouchPoints)) return "ios";
  return isAndroidDevice(userAgent) ? "android" : null;
}

/** A touch phone: a coarse pointer and a viewport under 1024 px (the width where the desktop layout starts). */
export function isTouchPhone(coarsePointer: boolean, viewportWidth: number): boolean {
  return coarsePointer && viewportWidth < 1024;
}

export type InAppBrowser = "Zalo" | "Facebook" | "Messenger" | "Instagram" | "TikTok";

/** The app a page is open in when it is a social app's own browser, which cannot install a web app. Else null. */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/Zalo/i.test(userAgent)) return "Zalo";
  if (/Messenger/i.test(userAgent)) return "Messenger";
  if (/FBAN|FBAV|FB_IAB/.test(userAgent)) return "Facebook";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(userAgent)) return "TikTok";
  return null;
}

// The install pop-up (design: Install-Ask). Kept per account in h1t_settings_v1 as `installPrompt`.
export const INSTALL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
export const INSTALL_MAX_DISMISSALS = 3;

export interface InstallPromptState {
  dismissCount: number;
  /** Epoch ms; the pop-up stays away until then. */
  snoozeUntil: number;
  done: boolean;
  /** The first day (YYYY-MM-DD) the app was opened on this account, to tell the 2nd day from the 1st. */
  firstSeenIso: string | null;
}

export const DEFAULT_INSTALL_PROMPT: InstallPromptState = { dismissCount: 0, snoozeUntil: 0, done: false, firstSeenIso: null };

/** Anything read from storage, made into a valid state. */
export function normalizeInstallPrompt(raw: unknown): InstallPromptState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_INSTALL_PROMPT };
  const r = raw as Record<string, unknown>;
  const count = typeof r.dismissCount === "number" && Number.isFinite(r.dismissCount) && r.dismissCount > 0 ? Math.floor(r.dismissCount) : 0;
  const until = typeof r.snoozeUntil === "number" && Number.isFinite(r.snoozeUntil) && r.snoozeUntil > 0 ? r.snoozeUntil : 0;
  return {
    dismissCount: count,
    snoozeUntil: until,
    done: r.done === true,
    firstSeenIso: typeof r.firstSeenIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.firstSeenIso) ? r.firstSeenIso : null,
  };
}

/** "Để sau", the close button or Esc: one more dismissal and a 3-day snooze. */
export function dismissInstallPrompt(state: InstallPromptState, now: number): InstallPromptState {
  return { ...state, dismissCount: state.dismissCount + 1, snoozeUntil: now + INSTALL_SNOOZE_MS };
}

/** "Tôi đã cài xong" or the appinstalled event. */
export function completeInstallPrompt(state: InstallPromptState): InstallPromptState {
  return { ...state, done: true };
}

/** Records the first day the app was opened; the same state comes back when it is already there. */
export function noteInstallOpen(state: InstallPromptState, todayIso: string): InstallPromptState {
  return state.firstSeenIso === null ? { ...state, firstSeenIso: todayIso } : state;
}

export interface InstallPromptInput {
  touchPhone: boolean;
  standalone: boolean;
  /** Signed in, or in demo mode. */
  signedIn: boolean;
  setupDone: boolean;
  pathname: string;
  hasLoggedFood: boolean;
  todayIso: string;
  state: InstallPromptState;
  now: number;
  shownThisSession: boolean;
  /** Another overlay, sheet, tour or tip is open. */
  busy: boolean;
}

/** Whether the install pop-up may open by itself now. All conditions must hold. */
export function shouldShowInstallPrompt(i: InstallPromptInput): boolean {
  if (!i.touchPhone || i.standalone || !i.signedIn || !i.setupDone) return false;
  if (i.pathname !== HOME_ROUTE || i.busy || i.shownThisSession) return false;
  const secondDay = i.state.firstSeenIso !== null && i.state.firstSeenIso < i.todayIso;
  if (!i.hasLoggedFood && !secondDay) return false;
  if (i.state.done || i.state.dismissCount >= INSTALL_MAX_DISMISSALS) return false;
  return i.now >= i.state.snoozeUntil;
}
