"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { CoachDetailCard } from "@/components/coaching/coach-detail-card";
import { getCoachById } from "@/lib/coaches";

function CoachDetailInner() {
  const params = useParams();
  const coachId = params?.id as string;
  const coach = getCoachById(coachId);

  if (!coach) {
    return (
      <AppShell alignContainer="coach-detail">
        <AppHeader
          variant="sub"
          title="Không tìm thấy HLV"
          backHref="/explore/coaches"
          layout="wide"
        />
        <main className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="text-secondary">Không tìm thấy thông tin huấn luyện viên này.</p>
          <Link
            href="/explore/coaches"
            className="flex h-11 items-center justify-center rounded-full bg-blue px-6 text-sm font-bold text-on-accent no-underline"
          >
            Quay lại danh sách HLV
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell alignContainer="coach-detail">
      <AppHeader
        variant="sub"
        title={coach.name}
        subtitle={coach.title}
        backHref="/explore/coaches"
        layout="wide"
        alignGroup="coach-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-8 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <CoachDetailCard coach={coach} />
      </main>
    </AppShell>
  );
}

function CoachDetailSkeleton() {
  return (
    <AppShell alignContainer="coach-detail">
      <AppHeader
        variant="sub"
        title="Huấn luyện viên"
        backHref="/explore/coaches"
        layout="wide"
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-8 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
          <div className="h-[240px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
          <div className="h-[140px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
        </div>
      </main>
    </AppShell>
  );
}

export default function CoachDetailPage() {
  return (
    <Suspense fallback={<CoachDetailSkeleton />}>
      <CoachDetailInner />
    </Suspense>
  );
}

