"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { sexLabel } from "@/components/settings/profile-summary";
import { CustomTargetSheet } from "@/components/settings/custom-target-sheet";
import { targetSections, type TargetRowData, type TargetSection } from "@/components/settings/target-rows";
import { withCustomTarget } from "@/lib/custom-targets";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";
import { useState } from "react";

const DRI_NOTE = "Theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính của bạn";

/**
 * Mục tiêu mỗi ngày, a pushed screen under Cài đặt. The targets come from Hồ sơ; with custom targets on (a flag that is off
 * today), a vitamin or mineral row can be tapped to set its own target.
 */
export function TargetsScreen() {
  const { profile, hydrated, updateProfile } = useDiary();
  const sections = targetSections(profile);
  const [editing, setEditing] = useState<TargetRowData | null>(null);
  const setCustom = (id: string, amount: number | null) => {
    updateProfile({ customTargets: withCustomTarget(profile.customTargets, id, amount) });
    setEditing(null);
  };

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
              <TargetCard id="targets-minerals" section={sections[1]} note={`Trừ muối. ${DRI_NOTE}.`} onEdit={setEditing} />
            </div>
            <TargetCard
              id="targets-vitamins"
              section={sections[2]}
              note={`${DRI_NOTE}.`}
              onEdit={setEditing}
            />
            <p className="m-0 text-cap text-secondary">Cân nặng, mục tiêu và ngày tập mặc định sửa trong Hồ sơ. Bạn cũng có thể tùy chỉnh tỉ lệ đa lượng riêng.</p>
            <div className="flex flex-col gap-2">
              <PillButton href="/settings/targets/macros" variant="primary">
                Tùy chỉnh tỉ lệ đa lượng ›
              </PillButton>
              <PillButton href="/settings/profile" variant="secondary">
                Sửa trong Hồ sơ
              </PillButton>
            </div>
            <CustomTargetSheet row={editing} onSave={setCustom} onReset={(id) => setCustom(id, null)} onClose={() => setEditing(null)} />
          </div>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
            <div className="h-[260px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[260px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function TargetCard({ id, section, note, onEdit }: { id: string; section: TargetSection; note?: string; onEdit?: (row: TargetRowData) => void }) {
  const titleId = `${id}-title`;
  return (
    <Card as="section" id={id} aria-labelledby={titleId} className="flex flex-col gap-1">
      <SectionTitle id={titleId}>{section.title}</SectionTitle>
      {section.rows.map((row) => {
        const body = (
          <>
            <div className="flex min-w-0 flex-col">
              <span className="text-callout">{row.label}</span>
              {row.detail && <span className="text-cap leading-snug text-secondary">{row.detail}</span>}
              {row.max && <span className="text-cap leading-snug text-secondary">{row.max}</span>}
            </div>
            <span className="flex shrink-0 flex-col items-end text-right">
              <span className="text-callout font-semibold tabular-nums">{row.value}</span>
              {row.custom && <span className="text-cap font-semibold text-cobalt">tự đặt</span>}
            </span>
          </>
        );
        const rowClass = "flex min-h-12 items-center justify-between gap-3 border-t border-divider py-2";
        return row.editable && onEdit ? (
          <button
            key={row.label}
            type="button"
            data-align-group="targets-row"
            onClick={() => onEdit(row)}
            aria-label={`${row.label}, ${row.value}${row.custom ? ", tự đặt" : ""}. Bấm để đặt mục tiêu riêng`}
            className={`${rowClass} w-full cursor-pointer bg-transparent text-left text-text active:bg-surface`}
          >
            {body}
          </button>
        ) : (
          <div key={row.label} data-align-group="targets-row" className={rowClass}>
            {body}
          </div>
        );
      })}
      {note && <p className="m-0 border-t border-divider pt-3 text-cap text-secondary">{note}</p>}
    </Card>
  );
}
