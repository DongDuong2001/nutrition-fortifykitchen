"use client";

import React, { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { CoachCard } from "@/components/coaching/coach-card";
import { useBack } from "@/hooks/use-back";
import { COACH_SPECIALTIES, filterCoachesBySpecialty } from "@/lib/coaches";

/** Huấn luyện viên: the directory under Khám phá, filtered by specialty. */
export default function CoachesPage() {
  const goBack = useBack();
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
        subtitle="Đội ngũ huấn luyện viên dinh dưỡng và tập luyện đồng hành cùng bạn"
        onBack={goBack}
        layout="wide"
        alignGroup="coaches-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <ChipGroup scroll items={chips} ariaLabel="Lọc huấn luyện viên theo chuyên môn" />

        {coaches.length === 0 ? (
          <Card as="section" aria-label="Chưa có huấn luyện viên" className="text-cap leading-snug text-secondary">
            Chưa có huấn luyện viên ở lĩnh vực này. Hãy chọn một lĩnh vực khác.
          </Card>
        ) : (
          <section aria-label="Danh sách huấn luyện viên" className="flex flex-col gap-4">
            {coaches.map((c) => (
              <CoachCard key={c.id} coach={c} />
            ))}
          </section>
        )}
      </main>
    </AppShell>
  );
}
