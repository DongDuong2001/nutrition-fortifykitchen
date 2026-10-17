"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api-client";
import { isLiveMode } from "@/lib/api-mode";
import { demoActive } from "@/lib/demo";
import { browsableFoods, catalogStatus, catalogVersion, subscribeCatalog } from "@/lib/mock/foods";

/**
 * The foods lists and search read, kept in step with the catalogue: the screen renders again when the live load
 * arrives or a food is made. `pending` is the live catalogue not here yet (show a loading state, never "no foods");
 * `failed` is a load that brought nothing (offer Thử lại with `retry`). Mock mode has neither.
 * `version` changes with the catalogue: put it in the deps of anything computed from MOCK_FOODS.
 */
export function useCatalogFoods() {
  const version = useSyncExternalStore(subscribeCatalog, catalogVersion, () => 0);
  const status = catalogStatus();
  const live = isLiveMode();
  // Demo mode is known after mount and changes what browsableFoods returns
  const demo = demoActive();
  // A copy: in demo mode browsableFoods() is MOCK_FOODS itself, which is changed in place, so a memo keyed on
  // `foods` would otherwise never see a made food or a recipe sync
  const foods = useMemo(() => browsableFoods().slice(), [version, demo]);

  // A screen opened directly (a deep link) starts the load itself; one call at a time, whoever asks
  useEffect(() => {
    if (live && status === "idle") apiClient.loadAllFoods().catch(() => {});
  }, [live, status]);

  const retry = useCallback(() => {
    apiClient.loadAllFoods().catch(() => {});
  }, []);

  return {
    foods,
    version,
    pending: live && (status === "idle" || status === "loading"),
    failed: live && status === "failed",
    retry,
  };
}
