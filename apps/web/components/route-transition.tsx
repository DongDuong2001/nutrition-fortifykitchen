"use client";

import { useLayoutEffect } from "react";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { reactTransitionClass, screenCommitted } from "@/lib/nav-direction";

/**
 * cc-55: the screen changes. Wraps every page in one view transition whose class says which way it goes
 * (lib/nav-direction): a push slides in from the right. Back (a popstate) is started by lib/nav-direction itself,
 * since React finishes a popstate without one. Tabs, first loads, reduced motion and Data Saver get "none", so no
 * transition starts at all. The motion itself is CSS (globals.css ::view-transition-*).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const vt = reactTransitionClass(pathname);
  useLayoutEffect(() => screenCommitted(pathname), [pathname]);
  return (
    <ViewTransition default={vt} enter="none" exit="none">
      {children}
    </ViewTransition>
  );
}
