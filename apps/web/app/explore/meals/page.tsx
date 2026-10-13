"use client";

import React from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { SavedMealsCard } from "@/components/explore/saved-meals-card";
import { useBack } from "@/hooks/use-back";

/** Bữa của tôi: every saved meal, one tap to add, ⋯ to rename or delete. A pushed screen under Khám phá. */
export default function SavedMealsPage() {
  const goBack = useBack();
  return (
    <AppShell>
      <AppHeader variant="sub" title="Bữa của tôi" subtitle="Bữa đã lưu, thêm lại bằng một chạm" onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <SavedMealsCard />
      </main>
    </AppShell>
  );
}
