"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api-client";
import { isLiveMode } from "@/lib/api-mode";
import { demoActive } from "@/lib/demo";
import { loadFoodRows } from "@/lib/food-rows";
import { browsableFoods, catalogStatus, catalogVersion, subscribeCatalog } from "@/lib/catalog";

/**
 * The foods lists and search read, kept in step with the catalogue: the screen renders again when the live load
 * arrives or a food is made. `pending` is the live catalogue not here yet (show a loading state, never "no foods");
 * `failed` is a load that brought nothing (offer Thử lại with `retry`). Mock mode has neither.
 * `version` changes with the catalogue: put it in the deps of anything computed from CATALOG_FOODS.
 */
export function useCatalogFoods() {
  const version = useSyncExternalStore(subscribeCatalog, catalogVersion, () => 0);
  const status = catalogStatus();
  const live = isLiveMode();
  // Demo mode is known after mount and changes what browsableFoods returns
  const demo = demoActive();
  // A new array whenever the catalogue changes (a made food, a recipe sync), shared by every screen until then
  // (lib/catalog browsableFoods); it was copied once more per consumer
  const foods = useMemo(() => browsableFoods(), [version, demo]);

  // cc-67: a list has one row per food once the index is there (lib/food-rows); it draws again when it arrives
  useEffect(() => {
    void loadFoodRows();
  }, []);

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
