"use client";

import React from "react";
import { DiaryProvider } from "@/lib/diary-store";
import { DiaryToast } from "@/components/diary-toast";
import { SetupGate } from "@/components/first-run/setup-gate";
import { OnboardingLayer } from "@/components/onboarding/onboarding-layer";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SetupGate
      wrap={(content) => (
        <DiaryProvider>
          {content}
          <DiaryToast />
          <OnboardingLayer />
        </DiaryProvider>
      )}
    >
      {children}
    </SetupGate>
  );
}
