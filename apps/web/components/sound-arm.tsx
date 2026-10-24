"use client";

import { useEffect } from "react";
import { armSound } from "@/lib/sound";

/** Once, at app start: the first tap or key anywhere makes the one AudioContext (nothing is made on load). */
export function SoundArm() {
  useEffect(() => armSound(), []);
  return null;
}
