"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { Row } from "@/components/ui/row";
import { Switch } from "@/components/ui/switch";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalName, goalOptions } from "@/lib/onboarding";
import { targetRangeText } from "@/lib/profile";
import type { SexType } from "@/lib/targets";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">{children}</h2>;
}

// Each row sits in one card. Rows share left and right edges (see the alignment check).
function RowGroup({ children }: { children: ReactNode }) {
  return <div data-align-group="profile-row">{children}</div>;
}

export function BodyCard({ alignGroup }: { alignGroup?: string }) {
  const { profile, updateProfile } = useDiary();
  return (
    <Card as="section" aria-label="Cơ thể" data-align-group={alignGroup} className="flex flex-col gap-1">
      <SectionTitle>Cơ thể</SectionTitle>
      <RowGroup>
        <div role="group" aria-labelledby="profile-sex-label" className="flex flex-col gap-2 border-t border-divider py-3">
          <span id="profile-sex-label" className="text-[15px]">
            Giới tính
          </span>
          <ChipGroup
            size="lg"
            columns={2}
            items={SEX_OPTIONS.map((option) => ({
              id: option.value,
              label: option.label,
              active: profile.sex === option.value,
              onClick: () => updateProfile({ sex: option.value }),
            }))}
          />
        </div>
      </RowGroup>
      {profile.sex === "female" && (
        <RowGroup>
          <div className="flex min-h-[52px] items-center gap-3 border-t border-divider py-1">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px]">Gần/đang trong kỳ</span>
              <span className="text-[13px] leading-tight text-secondary">Chỉ với Nữ · sắt 18 → 28 mg/ngày</span>
            </div>
            <Switch
              checked={profile.periodMode}
              onCheckedChange={(periodMode) => updateProfile({ periodMode })}
              aria-label="Gần/đang trong kỳ"
            />
          </div>
        </RowGroup>
      )}
      <RowGroup>
        <Row label="Năm sinh" value={String(profile.birthYear)} showChevron={false} />
      </RowGroup>
      <RowGroup>
        <Row label="Cân nặng" value={`${formatNumber(profile.weightKg)} kg`} href="/profile/weight" />
      </RowGroup>
    </Card>
  );
}

export function GoalCard() {
  const { profile, updateProfile } = useDiary();
  const options = goalOptions(profile.weightKg);
  return (
    <Card as="section" aria-label="Mục tiêu" className="flex flex-col gap-1">
      <SectionTitle>Mục tiêu</SectionTitle>
      <RowGroup>
        <div role="group" aria-labelledby="profile-goal-label" className="flex flex-col gap-2 border-t border-divider py-3">
          <span id="profile-goal-label" className="text-[15px]">Mục tiêu</span>
          <ChipGroup
            size="lg"
            columns={2}
            columnsLg={4}
            items={options.map((option) => ({
              id: option.goal,
              label: option.name,
              active: profile.goal === option.goal,
              onClick: () => updateProfile({ goal: option.goal }),
            }))}
          />
        </div>
      </RowGroup>
      <RowGroup>
        <Row label="Ngày tập mặc định" value={`${profile.trainingMinutesDefault} phút`} showChevron={false} />
      </RowGroup>
    </Card>
  );
}

export function TargetsCard() {
  const { profile, targets } = useDiary();
  const rows = [
    { label: "Năng lượng", value: targetRangeText(targets.calories, "kcal") },
    { label: "Đạm", value: targetRangeText(targets.protein, "g") },
    { label: "Béo", value: targetRangeText(targets.fat, "g") },
    { label: "Kali", value: targetRangeText(targets.potassium, "mg") },
    { label: "Sắt", value: targetRangeText(targets.iron, "mg") },
  ];
  const sex = profile.sex === "male" ? "Nam" : "Nữ";
  return (
    <Card as="section" aria-label="Mục tiêu mỗi ngày" className="flex flex-col gap-1">
      <SectionTitle>Mục tiêu mỗi ngày</SectionTitle>
      {rows.map((row) => (
        <RowGroup key={row.label}>
          <div className="flex items-baseline justify-between gap-3 border-t border-divider py-2.5 text-[15px]">
            <span className="text-secondary">{row.label}</span>
            <span className="font-semibold tabular-nums">{row.value}</span>
          </div>
        </RowGroup>
      ))}
      <p className="m-0 pt-2 text-[13px] text-secondary">
        Tính cho {formatNumber(profile.weightKg)} kg · {sex} · {goalName(profile.goal)}
      </p>
    </Card>
  );
}
