"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearDirtyFields, installFormWatch } from "@/lib/unsaved-work";

/** Mounted once in the root layout: notices fields the person edits (lib/unsaved-work) and forgets them when the page changes. */
export function UnsavedWorkWatch() {
  const pathname = usePathname();
  useEffect(() => installFormWatch(), []);
  useEffect(() => clearDirtyFields, [pathname]);
  return null;
}
