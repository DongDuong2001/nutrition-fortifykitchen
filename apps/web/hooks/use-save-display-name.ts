"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";

/**
 * Saves a display name (already cleaned and valid): on this device at once, then to the API (PUT /me/profile takes the
 * whole profile). Resolves false when the API could not be reached, so the screen can say the name is only here so far.
 */
export function useSaveDisplayName(): (name: string) => Promise<boolean> {
  const { profile, updateProfile } = useDiary();
  return useCallback(
    async (name: string) => {
      updateProfile({ displayName: name });
      try {
        await apiClient.saveSetup({ sex: profile.sex, birthYear: profile.birthYear, weightKg: profile.weightKg, goal: profile.goal, displayName: name });
        return true;
      } catch {
        return false;
      }
    },
    [profile, updateProfile]
  );
}
