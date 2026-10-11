"use client";

import React from "react";
import { DiaryProvider } from "@/lib/diary-store";
import { DiaryToast } from "@/components/diary-toast";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DiaryProvider>
      {children}
      <DiaryToast />
    </DiaryProvider>
  );
}
