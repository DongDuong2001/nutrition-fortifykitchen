/**
 * The status bar of the installed phone app, and what the app does about its clock (fix/status-bar-scrim).
 *
 * "translucent" (the default): iOS's black-translucent bar. Content runs under it and iOS draws the clock in WHITE, so the scrim
 *   under it (components/ui/app-header) is dark glass, shown only while something has scrolled under the bar.
 * "default": iOS draws its own bar with a black clock and content never goes under it, so the scrim is not needed on iOS; it stays
 *   for Android, where it is the tab bar's white glass.
 *
 * STATUS_BAR=default at build time (next.config.ts bakes it into NEXT_PUBLIC_STATUS_BAR) picks the second; the home-screen app has to be
 * added again for the meta tag to take. Change the default here to change it for every build.
 */
export type StatusBarMode = "translucent" | "default";

export const STATUS_BAR: StatusBarMode = process.env.NEXT_PUBLIC_STATUS_BAR === "default" ? "default" : "translucent";

/** The value of apple-mobile-web-app-status-bar-style (Next's appleWebApp.statusBarStyle) for a mode. */
export const statusBarStyleOf = (mode: StatusBarMode): "black-translucent" | "default" => (mode === "default" ? "default" : "black-translucent");

/** An iPhone, an iPad, or an iPad that says it is a Mac (a Mac has no touch points). */
export function isIos(ua: string = navigator.userAgent, touchPoints: number = navigator.maxTouchPoints): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}

/**
 * Marks `target` with data-scrolled while the sentinel (a 1 px element at the top of the page) is out of view, that is, while
 * the page is scrolled and content can be under the status bar. One IntersectionObserver, nothing per frame. Without
 * IntersectionObserver the mark stays on: content must never be left under the clock. In "default" mode on iOS it does nothing.
 * Returns what to call when the header goes away.
 */
export function watchScrolled(
  sentinel: Element,
  target: HTMLElement,
  {
    mode = STATUS_BAR,
    ios = isIos(),
    IO = typeof IntersectionObserver === "undefined" ? undefined : IntersectionObserver,
  }: { mode?: StatusBarMode; ios?: boolean; IO?: typeof IntersectionObserver } = {}
): () => void {
  if (mode === "default" && ios) return () => {};
  if (!IO) {
    target.dataset.scrolled = "";
    return () => {};
  }
  const observer = new IO(([entry]) => {
    if (entry.isIntersecting) delete target.dataset.scrolled;
    else target.dataset.scrolled = "";
  });
  observer.observe(sentinel);
  return () => observer.disconnect();
}
