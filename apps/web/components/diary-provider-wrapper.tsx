"use client";

import React, { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-client";
import { warnIfApiCrossOrigin } from "@/lib/api-mode";
import { DiaryProvider } from "@/lib/diary-store";
import { DiaryToast } from "@/components/diary-toast";
import { SyncAlerts } from "@/components/sync/sync-alerts";
import { SetupGate } from "@/components/first-run/setup-gate";
import { OnboardingLayer } from "@/components/onboarding/onboarding-layer";

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
