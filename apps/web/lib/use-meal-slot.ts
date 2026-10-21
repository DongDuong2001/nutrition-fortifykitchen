"use client";

import { useSyncExternalStore } from "react";
import { type MealSlot, resolveMealSlot } from "./meal-slot";

const subscribeNever = () => () => {};
const noSlotOnServer = () => null;

/**
 * Hook that resolves the meal slot on the client side based on URL param or current time.
 * Returns null while the server's page is being hydrated (the time of day is the device's, so the server cannot know it) and
 * the real slot from the first render of a screen opened in the browser, so "Thêm vào: Bữa trưa" never shows a "—" first.
 */
export function useMealSlot(param?: string | null): MealSlot | null {
  return useSyncExternalStore(subscribeNever, () => resolveMealSlot(param), noSlotOnServer);
}
