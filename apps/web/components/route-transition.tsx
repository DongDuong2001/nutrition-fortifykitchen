"use client";

import { useLayoutEffect, useState } from "react";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { reactTransitionClass, screenCommitted } from "@/lib/nav-direction";

/**
 * cc-55: the screen changes. Wraps every page in one view transition whose class says which way it goes
 * (lib/nav-direction): a push slides in from the right. Back (a popstate) is started by lib/nav-direction itself,
 * since React finishes a popstate without one. Tabs, first loads and Data Saver get "none" (reduced motion: a 120 ms cross-fade), so no
 * transition starts at all. The motion itself is CSS (globals.css ::view-transition-*).
 *
 * feat/glide: the slide runs once, on the navigation commit. After it the screen is "settled": its class goes back to
 * "none", so the transitions a screen starts for itself later (its deferred list render, router.replace("?loai=…"), any
 * startTransition) never replay the push. `settled` is the last path whose commit this layout effect saw: a render for
 * another path is a navigation (class from lib/nav-direction), a render for the same path is the screen itself ("none").
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [settled, setSettled] = useState<string | null>(null);
  const vt = settled === pathname ? "none" : reactTransitionClass(pathname);
  useLayoutEffect(() => {
    screenCommitted(pathname);
    setSettled(pathname);
  }, [pathname]);
  return (
    <ViewTransition default={vt} enter="none" exit="none">
      {children}
    </ViewTransition>
  );
}
