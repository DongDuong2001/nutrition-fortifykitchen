"use client";

import React from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { DayTemplateList } from "@/components/templates/template-list";
import { useBack } from "@/hooks/use-back";

/** Ngày ăn mẫu: the days saved from Hôm nay, one tap to open and copy. A pushed screen under Khám phá. */
export default function DayTemplatesPage() {
  const goBack = useBack();
  return (
    <AppShell>
      <AppHeader variant="sub" title="Ngày ăn mẫu" subtitle="Áp dụng cả ngày bằng một chạm" onBack={goBack} backLabel="Quay lại Khám phá" layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <DayTemplateList />
      </main>
    </AppShell>
  );
}
