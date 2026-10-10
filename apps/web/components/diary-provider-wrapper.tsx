"use client";

import React from "react";
import { DiaryProvider } from "@/lib/diary-store";

export function DiaryProviderWrapper({ children }: { children: React.ReactNode }) {
  return <DiaryProvider>{children}</DiaryProvider>;
}
