"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { CoachDetailCard } from "@/components/coaching/coach-detail-card";
import { useBack } from "@/hooks/use-back";
import { getCoachById } from "@/lib/coaches";

const MAIN = "mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8";

function CoachDetailInner() {
  const params = useParams();
  const goBack = useBack();
  const coachId = params?.id as string;
  const coach = getCoachById(coachId);

  if (!coach) {
    return (
      <AppShell alignContainer="coach-detail">
        <AppHeader variant="sub" title="Không tìm thấy huấn luyện viên" onBack={goBack} layout="wide" alignGroup="coach-header" />
        <main className={MAIN}>
          <Card as="section" aria-label="Không tìm thấy" className="flex flex-col gap-3">
            <p className="m-0 text-cap leading-snug text-secondary">
              Không tìm thấy thông tin huấn luyện viên này. Có thể hồ sơ đã được gỡ.
            </p>
            <PillButton href="/explore/coaches">Về danh sách huấn luyện viên</PillButton>
          </Card>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell alignContainer="coach-detail">
      <AppHeader variant="sub" title={coach.name} onBack={goBack} layout="wide" alignGroup="coach-header" />
      <main className={MAIN}>
        <CoachDetailCard coach={coach} />
      </main>
    </AppShell>
  );
}

/** One coach: the profile and the ways to reach them. */
export default function CoachDetailPage() {
  return (
    <Suspense
      fallback={
        <AppShell alignContainer="coach-detail">
          <main className={MAIN} aria-busy="true">
            <div className="h-40 rounded-card bg-level-empty motion-safe:animate-pulse" />
            <div className="h-24 rounded-card bg-level-empty motion-safe:animate-pulse" />
          </main>
        </AppShell>
      }
    >
      <CoachDetailInner />
    </Suspense>
  );
}
