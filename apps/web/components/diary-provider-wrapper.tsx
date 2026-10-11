"use client";

import React from "react";
import { DiaryProvider } from "@/lib/diary-store";
import { UndoToast } from "@/components/foods/undo-toast";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DiaryProvider>
      {children}
      <UndoToast />
    </DiaryProvider>
  );
}
