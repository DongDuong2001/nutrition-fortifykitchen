"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { FormRow } from "@/components/ui/form-row";
import { Row } from "@/components/ui/row";
import { Switch } from "@/components/ui/switch";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalName, goalOptions, parseBirthYear, validateSetupDraft } from "@/lib/onboarding";
import { profileToDraft, targetRangeText } from "@/lib/profile";
import { loadSettings } from "@/lib/settings";
import { getTrainingDurations } from "@/lib/training";
import type { SexType } from "@/lib/targets";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

// The same options as /training. Minutes are what the profile stores; 0 is a rest day.
const TRAINING_OPTIONS = getTrainingDurations();

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">{children}</h2>;
}

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
          className={`h-[52px] w-full rounded-[10px] border-2 bg-card px-4 text-base font-semibold tabular-nums text-text outline-none focus:border-blue ${
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
        <Row label="Cài như ứng dụng" hint="Mở như ứng dụng, không cần cửa hàng" href="/install" />
      </RowGroup>
    </Card>
  );
}

// The Pro offer. Its one action goes to the paywall (design: Xem gói).
export function ProCard() {
  return (
    <section aria-labelledby="profile-pro-title" className="flex flex-col gap-3 rounded-[18px] bg-blue p-4 text-white">
      <div className="flex flex-col gap-1">
        <h2 id="profile-pro-title" className="m-0 text-[17px] font-bold">
          Nâng cấp H1T MICRO Pro
        </h2>
        <p className="m-0 text-[13px] leading-snug">Gợi ý của Coach, xu hướng 30 ngày, món ăn &amp; công thức riêng</p>
      </div>
      <Link
        href="/paywall"
        className="inline-flex min-h-[44px] items-center self-start rounded-full bg-white px-5 text-[15px] font-bold text-ink transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Xem gói
      </Link>
    </section>
  );
}

// Log out is a navigation for now: nothing is cleared until the API has sessions (see OPEN_QUESTIONS).
// Delete account sits apart in its own red-titled card, as in the design's danger zone.
export function AccountCard() {
  return (
    <>
      <Card className="flex flex-col">
        <RowGroup>
          <Link
            href="/signin"
            className="flex min-h-[44px] items-center justify-center text-[15px] font-bold text-destructive transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Đăng xuất
          </Link>
        </RowGroup>
      </Card>
      <Card as="section" aria-labelledby="profile-danger-title" className="flex flex-col gap-1">
        <h2 id="profile-danger-title" className="m-0 text-xs font-bold uppercase tracking-wider text-destructive">
          Vùng nguy hiểm
        </h2>
        <RowGroup>
          <Row
            label={<span className="text-destructive">Xoá tài khoản</span>}
            hint="Xoá tài khoản sẽ xoá toàn bộ nhật ký và không thể khôi phục."
            href="/settings/delete-account"
          />
        </RowGroup>
      </Card>
    </>
  );
}
