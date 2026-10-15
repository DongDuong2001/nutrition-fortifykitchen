"use client";

import React, { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { ChipRow } from "@/components/foods/chip-row";
import { CoachCard } from "@/components/coaching/coach-card";
import { COACH_SPECIALTIES, filterCoachesBySpecialty } from "@/lib/coaches";

export default function CoachesPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("Tất cả");
  const coaches = filterCoachesBySpecialty(selectedSpecialty);

  const chips = COACH_SPECIALTIES.map((s) => ({
    id: s,
    label: s,
    active: s === selectedSpecialty,
    onClick: () => setSelectedSpecialty(s),
  }));

  return (
    <AppShell alignContainer="coaches-page">
      <AppHeader
        variant="sub"
        title="Huấn luyện viên"
        subtitle="Đội ngũ HLV chuyên môn dinh dưỡng & tập luyện đồng hành cùng bạn"
        backHref="/explore"
        layout="wide"
        alignGroup="coaches-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-8 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <ChipRow items={chips} ariaLabel="Lọc huấn luyện viên theo chuyên môn" />

        <div className="flex flex-col gap-4 pt-1">
          {coaches.length === 0 ? (
            <div className="rounded-[18px] border border-card-border bg-card p-8 text-center text-secondary text-sm">
              Chưa có huấn luyện viên nào trong chuyên môn này.
            </div>
          ) : (
            coaches.map((c) => (
              <CoachCard key={c.id} coach={c} />
            ))
          )}
        </div>

      </main>
    </AppShell>
  );
}
