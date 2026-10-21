"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { tabForPath, type NavTab } from "./nav";

/**
 * The tab the nav (bottom bar, sidebar) highlights. /add opens as a sheet over whichever tab it was opened from, and that
 * tab stays on screen under the sheet, so while /add is the URL the highlight stays where it was instead of jumping to Hôm nay.
 */
export function useActiveTab(currentTab?: NavTab): NavTab | null {
  const pathname = usePathname();
  const last = useRef<NavTab | null>(null);
  const fromPath = tabForPath(pathname);
  if (pathname !== "/add") last.current = fromPath;
  return currentTab ?? (pathname === "/add" && last.current ? last.current : fromPath);
}
