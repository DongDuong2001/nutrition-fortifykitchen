"use client";

import React, { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-client";
import { warnIfApiCrossOrigin } from "@/lib/api-mode";
import { DiaryProvider } from "@/lib/diary-store";
import { DiaryToast } from "@/components/diary-toast";
import dynamic from "next/dynamic";

// Lasting alerts (no room to save, session ran out) are rare: their chunk loads after the page, not in its first-load JS
const SyncAlerts = dynamic(() => import("@/components/sync/sync-alerts").then((m) => m.SyncAlerts), { ssr: false });
// The tour, the first-visit tips and the what's-new tour (with the release and tip copy) never draw on the first paint:
// their chunk loads right after it, so it is not in any screen's first-load JS
const OnboardingLayer = dynamic(() => import("@/components/onboarding/onboarding-layer").then((m) => m.OnboardingLayer), { ssr: false });
import { SetupGate } from "@/components/first-run/setup-gate";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  // The base URL the api-client really uses (its localhost default counts: that is cross-origin too)
  useEffect(() => warnIfApiCrossOrigin(getApiBaseUrl()), []);
  return (
    <SetupGate
      wrap={(content) => (
        <DiaryProvider>
          {content}
          <DiaryToast />
          <SyncAlerts />
          <OnboardingLayer />
        </DiaryProvider>
      )}
    >
      {children}
    </SetupGate>
  );
}
