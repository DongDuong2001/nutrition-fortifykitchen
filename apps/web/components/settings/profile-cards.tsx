"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { FormRow } from "@/components/ui/form-row";
import { Row } from "@/components/ui/row";
import { SectionTitle } from "@/components/ui/section-title";
import { Switch } from "@/components/ui/switch";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalOptions, parseBirthYear, validateSetupDraft } from "@/lib/onboarding";
import { profileToDraft } from "@/lib/profile";
import { loadSettings } from "@/lib/settings";
import { getTrainingDurations } from "@/lib/training";
import type { SexType } from "@/lib/targets";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

// The same options as /training. Minutes are what the profile stores; 0 is a rest day.
const TRAINING_OPTIONS = getTrainingDurations();

// Each row sits in one card. Rows share left and right edges (see the alignment check).
function RowGroup({ children }: { children: ReactNode }) {
  return <div data-align-group="profile-row">{children}</div>;
}

// Same rule as setup: a year from 1900 to this year. An invalid year keeps its error on screen.
// It saves on blur or Enter, so typing "2" on the way to "2003" does not show an error.
// The row shows the year; tapping it turns into the field.
function BirthYearField() {
  const { profile, updateProfile } = useDiary();
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const shown = typed ?? String(profile.birthYear);
  const year = new Date().getFullYear();

  function birthYearError(value: string): string | undefined {
    return validateSetupDraft({ ...profileToDraft(profile), birthYear: value }, year).errors.birthYear;
  }

  function change(value: string) {
    setTyped(value);
    // Once an error is shown, re-check on every edit so it clears as soon as the year is valid
    if (error) setError(birthYearError(value));
  }

  function save() {
    const message = birthYearError(shown);
    setError(message);
    const birthYear = parseBirthYear(shown);
    if (message || birthYear === null) return;
    if (birthYear !== profile.birthYear) updateProfile({ birthYear });
    setTyped(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <RowGroup>
        <Row label="Năm sinh" value={String(profile.birthYear)} onClick={() => setEditing(true)} />
      </RowGroup>
    );
  }

  return (
    <RowGroup>
      <FormRow label="Năm sinh" htmlFor="profile-birth-year" error={error} className="border-t border-divider py-3">
        <input
          id="profile-birth-year"
          type="text"
          inputMode="numeric"
          autoFocus
          value={shown}
          onChange={(e) => change(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-invalid={error ? true : undefined}
          className={`h-[52px] w-full rounded-xl border-2 bg-card px-4 text-base font-semibold tabular-nums text-text outline-none focus:border-blue ${
            error ? "border-destructive" : "border-grabber"
          }`}
        />
      </FormRow>
    </RowGroup>
  );
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
      <BirthYearField />
      <RowGroup>
        <Row label="Cân nặng" value={`${formatNumber(profile.weightKg)} kg`} href="/settings/profile/weight" />
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
            columnsLg={2}
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
        <div role="group" aria-labelledby="profile-training-label" className="flex flex-col gap-2 border-t border-divider py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span id="profile-training-label" className="text-[15px]">Ngày tập mặc định</span>
            <span className="text-[13px] text-secondary">phút</span>
          </div>
          <ChipGroup
            size="lg"
            columns={5}
            items={TRAINING_OPTIONS.map((option) => ({
              id: option.id,
              label: option.minutes === 0 ? "Nghỉ" : String(option.minutes),
              ariaLabel: option.minutes === 0 ? "Nghỉ" : `${option.minutes} phút`,
              active: profile.trainingMinutesDefault === option.minutes,
              onClick: () => updateProfile({ trainingMinutesDefault: option.minutes }),
            }))}
          />
        </div>
      </RowGroup>
    </Card>
  );
}

export function AppCard() {
  // The saved language is read after mount, so the server and first paint both show Tiếng Việt
  const [language, setLanguage] = useState("Tiếng Việt");
  // "Đã bật" or "Đã tắt" from the saved reminders. Empty until mounted, so the first paint never claims "Đã bật"
  const [reminders, setReminders] = useState<string | null>(null);
  useEffect(() => {
    const saved = loadSettings();
    setLanguage(saved.language === "en" ? "English" : "Tiếng Việt");
    const anyOn = [saved.breakfastReminder, saved.lunchReminder, saved.dinnerReminder, saved.workoutSaltReminder, saved.eveningSummaryReminder].some(Boolean);
    setReminders(anyOn ? "Đã bật" : "Đã tắt");
  }, []);

  return (
    <Card as="section" aria-label="Ứng dụng" className="flex flex-col gap-1">
      <SectionTitle>Ứng dụng</SectionTitle>
      <RowGroup>
        <Row label="Ngôn ngữ" value={language} href="/settings/language" />
      </RowGroup>
      <RowGroup>
        <Row label="Nhắc nhở" value={reminders ?? ""} href="/settings/notifications" />
      </RowGroup>
      <RowGroup>
        <Row label="Cài như ứng dụng" href="/install" />
      </RowGroup>
    </Card>
  );
}
