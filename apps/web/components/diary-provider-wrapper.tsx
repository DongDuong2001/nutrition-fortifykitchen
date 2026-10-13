"use client";

import React from "react";
import { DiaryProvider } from "@/lib/diary-store";
import { DiaryToast } from "@/components/diary-toast";
import { SetupGate } from "@/components/first-run/setup-gate";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DiaryProvider>
      <SetupGate>{children}</SetupGate>
      <DiaryToast />
    </DiaryProvider>
  );
}
