"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { backFallback, canGoBack, nextHistory } from "@/lib/nav";

// The in-app history of this tab. It lives for the page session and starts empty after a reload.
let history: string[] = [];

/** Mounted once in the root layout: records each in-app path so a screen knows whether back stays in the app. */
export function useTrackHistory() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) history = nextHistory(history, pathname);
  }, [pathname]);
}

/** The page before this one in this tab's in-app history, or null (a link or a reload landed here). */
export function previousInAppPath(): string | null {
  return history.length > 1 ? history[history.length - 2] : null;
}

/** The newest path of the in-app history. Read while a new screen renders, it is the page the person came from. */
export function lastInAppPath(): string | null {
  return history[history.length - 1] ?? null;
}

/**
 * Back for pushed screens: the previous in-app page when there is one, otherwise the owning tab
 * (backFallback), so a direct link or a reload never leaves the app.
 */
export function useBack(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (canGoBack(history)) router.back();
    else router.replace(backFallback(pathname, window.location.search));
  }, [router, pathname]);
}
