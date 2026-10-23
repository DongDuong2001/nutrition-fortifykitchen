"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { InstallRow } from "@/components/pwa/install-row";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { SectionHeader } from "@/components/ui/section-title";
import { Switch } from "@/components/ui/switch";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { SettingsRow } from "@/components/settings/settings-row";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { goalOptions, parseBirthYear, validateSetupDraft } from "@/lib/onboarding";
import { profileToDraft } from "@/lib/profile";
import { loadSettings, saveSettings } from "@/lib/settings";
import { canVibrate, haptic, hapticsWanted } from "@/lib/haptics";
import type { OnboardingFlags } from "@/lib/onboarding-flags";
import { loadFlags, markUsed, openReplay, setTipsOff, subscribeFlags } from "@/lib/onboarding-store";
import { startTour } from "@/lib/tour-bus";
import { getTrainingDurations, TRAINING_SIZE_NAME, type TrainingSize } from "@/lib/training";
import { readPrefs, writePrefs } from "@/lib/training-prefs";
import type { SexType } from "@/lib/targets";
import { HOME_ROUTE } from "@/lib/nav";
import { feedbackSeen, openFeedback, subscribeFeedback } from "@/lib/feedback";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

// The same options as /training. Minutes are what the profile stores; 0 is a rest day.
const TRAINING_OPTIONS = getTrainingDurations();

// V3 Hồ sơ: a field's one-line reason sits under its label (12 px, secondary)
function Reason({ children }: { children: ReactNode }) {
  return <span className="text-xs leading-snug text-secondary">{children}</span>;
}

interface ChoiceItem {
  id: string;
  label: ReactNode;
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}

/** The V3 Hồ sơ choice chips: 48 px pills in equal columns on the card, the picked one ink (no ring, so none jumps). */
function ChoiceGrid({ items, columns }: { items: ChoiceItem[]; columns: number }) {
  return (
    <div style={{ "--choice-cols": columns } as CSSProperties} className="grid grid-cols-[repeat(var(--choice-cols),minmax(0,1fr))] gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.active}
          aria-label={item.ariaLabel}
          disabled={item.disabled}
          onClick={item.onClick}
          className={`hit-44 relative flex h-12 items-center justify-center rounded-full border-0 px-2 text-center text-callout active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${
            item.active ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"
          } ${item.disabled ? "cursor-default opacity-50 active:scale-100" : "cursor-pointer"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// A labelled group of choices: the label (with a small unit at its right), its reason under it, then the chips.
// The line above it (the card's header, or the group before) is its border; every row of Hồ sơ shares the "profile-row" edges.
function ChoiceGroup({
  labelId,
  label,
  unit,
  reason,
  children,
}: {
  labelId: string;
  label: string;
  unit?: string;
  reason: string;
  children: ReactNode;
}) {
  return (
    <div data-align-group="profile-row" role="group" aria-labelledby={labelId} className="flex flex-col gap-2 border-t border-divider pb-4 pt-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span id={labelId} className="text-callout">
            {label}
          </span>
          {unit && <span className="text-cap text-secondary">{unit}</span>}
        </div>
        <Reason>{reason}</Reason>
      </div>
      {children}
    </div>
  );
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
      <SettingsRow
        tone="profile"
        glyph={SETTINGS_ICONS.calendar}
        label="Năm sinh"
        hint="Dùng để chọn mức khuyến nghị theo tuổi."
        value={String(profile.birthYear)}
        onClick={() => setEditing(true)}
        minHeight="16"
        data-align-group="profile-row"
      />
    );
  }

  return (
    <div data-align-group="profile-row" className="border-t border-divider py-3">
      <FormRow label="Năm sinh" htmlFor="profile-birth-year" error={error}>
        <Reason>Dùng để chọn mức khuyến nghị theo tuổi.</Reason>
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
          aria-describedby={error ? "profile-birth-year-error" : undefined}
          className={`h-12 w-full rounded-xl border-0 bg-surface px-3 text-base font-semibold tabular-nums text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)] ${
            error ? "shadow-[inset_0_0_0_2px_var(--color-destructive)]" : ""
          }`}
        />
      </FormRow>
    </div>
  );
}

export function BodyCard({ alignGroup }: { alignGroup?: string }) {
  const { profile, updateProfile } = useDiary();
  return (
    <Card as="section" aria-label="Cơ thể" padding={false} data-align-group={alignGroup} className="flex flex-col px-4 pt-4">
      <SectionHeader className="mb-2">Cơ thể</SectionHeader>
      <ChoiceGroup labelId="profile-sex-label" label="Giới tính" reason="Chỉ dùng để chọn mức khuyến nghị vi chất cho bạn.">
        <ChoiceGrid
          columns={2}
          items={SEX_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
            active: profile.sex === option.value,
            onClick: () => updateProfile({ sex: option.value }),
          }))}
        />
      </ChoiceGroup>
      {profile.sex === "female" && (
        <div data-align-group="profile-row" className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-callout">Gần/đang trong kỳ</span>
            <Reason>Chỉ với nữ · Iron lên 28 mg/ngày</Reason>
          </div>
          <Switch
            checked={profile.periodMode}
            onCheckedChange={(periodMode) => updateProfile({ periodMode })}
            aria-label="Gần/đang trong kỳ"
          />
        </div>
      )}
      <BirthYearField />
      <SettingsRow
        tone="body"
        glyph={SETTINGS_ICONS.scale}
        label="Cân nặng"
        hint="Dùng để tính kcal, đạm và chất béo."
        value={
          <span className="whitespace-nowrap">
            <span className="font-display text-headline font-extrabold italic leading-8 tracking-[0.01em]">{formatNumber(profile.weightKg)}</span>
            <span className="text-callout font-semibold"> kg</span>
          </span>
        }
        href="/settings/profile/weight"
        minHeight="16"
        data-align-group="profile-row"
      />
    </Card>
  );
}

export function GoalCard() {
  const { profile, updateProfile } = useDiary();
  const options = goalOptions(profile.weightKg);
  return (
    <Card as="section" aria-label="Mục tiêu" padding={false} className="flex flex-col px-4 pt-4">
      <SectionHeader className="mb-2">Mục tiêu</SectionHeader>
      <ChoiceGroup labelId="profile-goal-label" label="Mục tiêu" reason="Dùng để chọn số kcal mỗi kg cân nặng.">
        <ChoiceGrid
          columns={2}
          items={options.map((option) => ({
            id: option.goal,
            label: option.name,
            active: profile.goal === option.goal,
            onClick: () => updateProfile({ goal: option.goal }),
          }))}
        />
      </ChoiceGroup>
      <ChoiceGroup labelId="profile-training-label" label="Ngày tập mặc định" unit="phút" reason="Dùng để tính lượng muối khi tập.">
        <ChoiceGrid
          columns={5}
          items={TRAINING_OPTIONS.map((option) => ({
            id: option.id,
            label: option.minutes === 0 ? "Nghỉ" : String(option.minutes),
            ariaLabel: option.minutes === 0 ? "Nghỉ" : `${option.minutes} phút`,
            active: profile.trainingMinutesDefault === option.minutes,
            onClick: () => updateProfile({ trainingMinutesDefault: option.minutes }),
          }))}
        />
      </ChoiceGroup>
      <TrainingSizeRow />
    </Card>
  );
}

// cc-52: Bự / Bé for Ngày tập (per account, on this device: lib/training-prefs). Read after mount, with the account.
function TrainingSizeRow() {
  const { hydrated } = useDiary();
  const [size, setSize] = useState<TrainingSize | null | undefined>(undefined);
  useEffect(() => {
    if (hydrated) setSize(readPrefs().size);
  }, [hydrated]);
  const choose = (next: TrainingSize) => {
    markUsed("training-size");
    writePrefs({ ...readPrefs(), size: next, asked: true });
    setSize(next);
  };
  return (
    <ChoiceGroup labelId="profile-training-size-label" label="Nhóm Bự / Bé" unit="liều khi tập" reason="Dùng để chọn liều khi tập.">
      <ChoiceGrid
        columns={2}
        items={(["be", "bu"] as const).map((option) => ({
          id: option,
          label: TRAINING_SIZE_NAME[option],
          ariaLabel: `${TRAINING_SIZE_NAME[option]}, ${option === "be" ? "liều thấp" : "liều cao"}`,
          active: size === option,
          disabled: size === undefined,
          onClick: () => choose(option),
        }))}
      />
    </ChoiceGroup>
  );
}

export function AppCard() {
  // The saved language is read after mount, so the server and first paint both show Tiếng Việt
  const [language, setLanguage] = useState("Tiếng Việt");
  // "Đã bật" or "Đã tắt" from the saved reminders. Empty until mounted, so the first paint never claims "Đã bật"
  const [reminders, setReminders] = useState<string | null>(null);
  // The tour and tips (cc-42): read after mount for the same reason
  const router = useRouter();
  const [flags, setFlags] = useState<OnboardingFlags | null>(null);
  // "Rung khi chạm" (cc-51): only on a phone that can vibrate (Android; iOS has no vibrate), read after mount
  const [haptics, setHaptics] = useState<boolean | null>(null);
  useEffect(() => {
    if (!canVibrate()) return;
    setHaptics(hapticsWanted(loadSettings().haptics, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true));
  }, []);
  const toggleHaptics = (on: boolean) => {
    saveSettings({ haptics: on });
    setHaptics(on);
    markUsed("haptics-switch");
    if (on) haptic("saved");
  };
  useEffect(() => {
    setFlags(loadFlags());
    return subscribeFlags(() => setFlags(loadFlags()));
  }, []);
  const replay = () => {
    openReplay();
    startTour();
    router.push(HOME_ROUTE);
  };
  useEffect(() => {
    const saved = loadSettings();
    setLanguage(saved.language === "en" ? "English" : "Tiếng Việt");
    const anyOn = [saved.breakfastReminder, saved.lunchReminder, saved.dinnerReminder, saved.workoutSaltReminder, saved.eveningSummaryReminder].some(Boolean);
    setReminders(anyOn ? "Đã bật" : "Đã tắt");
  }, []);

  return (
    <Card as="section" aria-label="Ứng dụng" className="flex flex-col gap-1">
      <SectionHeader>Ứng dụng</SectionHeader>
      <SettingsRow
        dense
        tone="app"
        glyph={SETTINGS_ICONS.replay}
        label="Xem lại hướng dẫn"
        hint="Ghi bữa ăn đầu tiên · 1 phút"
        onClick={replay}
        divider={false}
        minHeight="14"
        data-align-group="profile-row"
      >
        {flags && !flags.replayOpened && (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-cobalt px-2 text-xs font-bold text-on-accent">Mới</span>
        )}
      </SettingsRow>
      <SettingsRow dense tone="app" glyph={SETTINGS_ICONS.news} label="Có gì mới" href="/settings/whats-new" minHeight="14" data-align-group="profile-row" />
      <SettingsRow
        dense
        tone="app"
        glyph={SETTINGS_ICONS.tips}
        label="Mẹo trên từng màn hình"
        hint="Bật lại để xem mẹo lần đầu"
        chevron={false}
        minHeight="14"
        data-align-group="profile-row"
      >
        <Switch
          checked={flags ? !flags.tipsOff : true}
          disabled={flags === null}
          onCheckedChange={(on) => setTipsOff(!on)}
          aria-label="Mẹo trên từng màn hình"
        />
      </SettingsRow>
      {haptics !== null && (
        <div data-tour="haptics-switch">
          <SettingsRow
            dense
            tone="app"
            glyph={SETTINGS_ICONS.vibrate}
            label="Rung khi chạm"
            hint="Rung nhẹ khi lưu, xóa hay hoàn tác"
            chevron={false}
            minHeight="14"
            data-align-group="profile-row"
          >
            <Switch checked={haptics} onCheckedChange={toggleHaptics} aria-label="Rung khi chạm" />
          </SettingsRow>
        </div>
      )}
      <SettingsRow dense tone="language" glyph={SETTINGS_ICONS.language} label="Ngôn ngữ" value={language} href="/settings/language" data-align-group="profile-row" />
      <SettingsRow dense tone="notifications" glyph={SETTINGS_ICONS.bell} label="Nhắc nhở" value={reminders ?? ""} href="/settings/notifications" data-align-group="profile-row" />
      <SettingsRow dense tone="app" glyph={SETTINGS_ICONS.install} label="Thêm vào màn hình chính" href="/install" data-align-group="profile-row" />
      <InstallRow alignGroup="profile-row" />
      <SettingsRow dense tone="privacy" glyph={SETTINGS_ICONS.document} label="Điều khoản dịch vụ" href="/terms" data-align-group="profile-row" />
      <SettingsRow dense tone="privacy" glyph={SETTINGS_ICONS.shield} label="Chính sách bảo mật" href="/privacy" data-align-group="profile-row" />
    </Card>
  );
}

/**
 * HỖ TRỢ (feedback-mailto, board 1): Góp ý & hỗ trợ (the type sheet, with "Mới" until it has been opened once) and
 * Nguồn dữ liệu, moved here from Ứng dụng.
 */
export function SupportCard() {
  // Read after mount, so the first paint never shows a badge it will take away
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    setIsNew(!feedbackSeen());
    return subscribeFeedback(() => setIsNew(!feedbackSeen()));
  }, []);
  return (
    <Card as="section" aria-label="Hỗ trợ" className="flex flex-col gap-1">
      <SectionHeader>Hỗ trợ</SectionHeader>
      <SettingsRow
        dense
        tone="body"
        glyph={SETTINGS_ICONS.chat}
        label="Góp ý & hỗ trợ"
        hint="Báo lỗi, sai số liệu, yêu cầu thêm món"
        onClick={() => openFeedback({ screen: "Cài đặt" })}
        divider={false}
        minHeight="16"
        data-align-group="profile-row"
      >
        {isNew && <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-cobalt px-2 text-xs font-bold text-on-accent">Mới</span>}
      </SettingsRow>
      <SettingsRow dense tone="data" glyph={SETTINGS_ICONS.database} label="Nguồn dữ liệu" href="/settings/data-sources" minHeight="14" data-align-group="profile-row" />
      <SettingsRow dense tone="data" glyph={SETTINGS_ICONS.document} label="Tài liệu" hint="Quy tắc và tài liệu của app" href="/documents" minHeight="14" data-align-group="profile-row" />
    </Card>
  );
}
