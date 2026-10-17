"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { sexLabel } from "@/components/settings/profile-summary";
import { targetSections, type TargetSection } from "@/components/settings/target-rows";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";

/** Mục tiêu mỗi ngày, a pushed screen under Cài đặt. Read-only: the targets come from Hồ sơ. */
export function TargetsScreen() {
  const { profile, hydrated } = useDiary();
  const sections = targetSections(profile);

  return (
    <AppShell alignContainer="targets-page">
      <AppHeader
        variant="sub"
        title="Mục tiêu mỗi ngày"
        subtitle={
          hydrated
            ? `Tính từ hồ sơ · ${sexLabel(profile.sex)} · ${formatNumber(profile.weightKg)} kg · ${goalName(profile.goal)}`
            : undefined
        }
        backHref="/settings"
        layout="wide"
        alignGroup="targets-header"
      />

      <main className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pb-12 lg:pt-5">
        {hydrated ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <TargetCard id="targets-energy" section={sections[0]} note="* Chất xơ: tạm thời, chưa có quy tắc của huấn luyện viên." />
              <TargetCard id="targets-minerals" section={sections[1]} />
            </div>
            <TargetCard
              id="targets-vitamins"
              section={sections[2]}
              note="* Khuyến nghị dinh dưỡng Việt Nam 2016 (VN 2016). Đây không phải quy tắc của huấn luyện viên."
            />
            <p className="m-0 text-[13px] text-secondary">Cân nặng, mục tiêu và ngày tập mặc định sửa trong Hồ sơ. Bạn cũng có thể tùy chỉnh tỉ lệ đa lượng riêng.</p>
            <div className="flex flex-col gap-2">
              <PillButton href="/settings/targets/macros" variant="primary">
                Tùy chỉnh tỉ lệ Macro & Năng lượng ›
              </PillButton>
              <PillButton href="/settings/profile" variant="secondary">
                Sửa trong Hồ sơ
              </PillButton>
            </div>
          </div>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
            <div className="h-[260px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[260px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function TargetCard({ id, section, note }: { id: string; section: TargetSection; note?: string }) {
  const titleId = `${id}-title`;
  return (
    <Card as="section" id={id} aria-labelledby={titleId} className="flex flex-col gap-1">
      <SectionTitle id={titleId}>{section.title}</SectionTitle>
      {section.rows.map((row) => (
        <div
          key={row.label}
          data-align-group="targets-row"
          className="flex min-h-[48px] items-center justify-between gap-3 border-t border-divider py-2"
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px]">{row.label}</span>
            {row.detail && <span className="text-[13px] leading-snug text-secondary">{row.detail}</span>}
          </div>
          <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums">{row.value}</span>
        </div>
      ))}
      {note && <p className="m-0 border-t border-divider pt-3 text-[13px] text-secondary">{note}</p>}
    </Card>
  );
}
