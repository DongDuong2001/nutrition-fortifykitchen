"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearDirtyFields, hasUnsavedWork, installFormWatch } from "@/lib/unsaved-work";

/**
 * Mounted once in the root layout: notices fields the person edits (lib/unsaved-work) and forgets them when the page changes. It also
 * hands hasUnsavedWork to the inline script of lib/chunk-reload-script (window.h1tUnsaved), which cannot import it.
 */
export function UnsavedWorkWatch() {
  const pathname = usePathname();
  useEffect(() => installFormWatch(), []);
  useEffect(() => {
    window.h1tUnsaved = hasUnsavedWork;
    return () => void delete window.h1tUnsaved;
  }, []);
  useEffect(() => clearDirtyFields, [pathname]);
  return null;
}
