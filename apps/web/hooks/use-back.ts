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
