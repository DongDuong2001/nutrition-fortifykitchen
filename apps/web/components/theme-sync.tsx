"use client";

import { useEffect } from "react";
import { followSystemTheme } from "@/lib/theme";

/** Hệ thống follows the phone switching light and dark while the app is open (nothing while the dark mode flag is off). */
export function ThemeSync() {
  useEffect(() => followSystemTheme(), []);
  return null;
}
