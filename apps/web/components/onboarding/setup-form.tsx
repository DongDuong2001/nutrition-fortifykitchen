"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { errorText, reportClientError } from "@/lib/client-errors";
import { useDiary } from "@/lib/diary-store";
import { readPendingCoachCode, writePendingCoachCode } from "@/lib/pending-coach";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";
import { formatNumber } from "@/lib/format";
import { cleanDisplayName, limitDisplayName } from "@/lib/display-name";
import { markWhatsNewSeen } from "@/lib/onboarding-store";
import { latestRelease } from "@/lib/releases";
import {
  DEFAULT_DRAFT,
  dailyTargetRows,
  goalOptions,
  readDraft,
  validateSetupDraft,
  validateSetupName,
  writeDraft,
  type SetupDraft,
  type SetupErrors,
} from "@/lib/onboarding";
import type { SexType } from "@/lib/targets";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { AppHeader } from "@/components/ui/app-header";

export type SetupStep = "profile" | "goal";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const SKELETON_CLASS = "h-[52px] rounded-xl bg-divider animate-pulse motion-reduce:animate-none";
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Two-step setup. Phone shows one step per route. At ≥1024 px both steps sit on one
 * card (DesktopSetup), so the same state drives both routes.
 */
export function SetupForm({ step }: { step: SetupStep }) {
  const router = useRouter();
  const { updateProfile } = useDiary();
  const [draft, setDraft] = useState<SetupDraft>(DEFAULT_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<SetupErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Optional code of a coach (UI only here: the code waits in the session and is used when setup is done)
  const [coachCode, setCoachCode] = useState("");
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(readDraft());
    setCoachCode(readPendingCoachCode());
    setLoaded(true);
  }, []);

  const isProfile = step === "profile";
  const year = new Date().getFullYear();
  const profile = validateSetupDraft(draft, year).profile;
  // Tiếp tục and Hoàn tất wait for a name: it is what the share image shows
  const nameReady = validateSetupName(draft.displayName) === null;
  const targetWeight = profile?.weightKg ?? null;
  const options = goalOptions(targetWeight);
  const targetRows = dailyTargetRows(targetWeight, draft.sex, draft.goal);
  const targetCaption =
    targetWeight === null
      ? "Nhập cân nặng để xem mục tiêu"
      : `Tính cho ${formatNumber(targetWeight)} kg · ${draft.sex === "male" ? "Nam" : "Nữ"}`;

  function update(patch: Partial<SetupDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(next);
    // Once an error is shown, re-check on every edit so it clears as soon as the field is valid.
    if (Object.keys(errors).length > 0) setErrors(validateSetupDraft(next, year).errors);
  }

  // Inline validation as soon as a field is left, not only after the first submit
  function checkField(field: keyof SetupErrors) {
    const message = validateSetupDraft(draft, year).errors[field];
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return message ? { ...next, [field]: message } : next;
    });
  }

  // Enter in the birth year moves to the weight; Enter in the weight submits the step
  function nextFieldOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const message = validateSetupDraft(draft, year).errors.birthYear;
    if (message) {
      checkField("birthYear");
      return;
    }
    weightRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // On desktop both steps are on one card, so Enter saves just like the footer button.
    const finish =
      step === "goal" ||
      submitter?.value === "finish" ||
      window.matchMedia(DESKTOP_QUERY).matches;

    const result = validateSetupDraft(draft, year);
    const nameError = validateSetupName(draft.displayName);
    setErrors(nameError ? { ...result.errors, displayName: nameError } : result.errors);
    if (!result.profile || nameError) return;
    const displayName = cleanDisplayName(draft.displayName);

    if (!finish) {
      router.push("/setup/goal");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.saveSetup({ ...result.profile, displayName });
      updateProfile({ ...result.profile, displayName });
      // A new account gets the onboarding tour, not "Có gì mới"
      const latest = latestRelease();
      if (latest) markWhatsNewSeen(latest.id);
      router.push("/setup/done");
    } catch (err) {
      reportClientError({ kind: "setup", message: errorText(err) });
      const msg = err instanceof Error && err.message ? err.message : "Chưa lưu được hồ sơ. Thử lại sau ít phút.";
      setSaveError(msg);
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page lg:items-center lg:px-4 lg:py-8">
      <div className="lg:hidden">
        <AppHeader
          variant="sub"
          backHref={isProfile ? "/signin" : "/setup/profile"}
          actions={<span className="text-cap text-muted-subtitle">{isProfile ? "Bước 1 / 2" : "Bước 2 / 2"}</span>}
          progress={{ current: isProfile ? 1 : 2, total: 2 }}
          title={isProfile ? "VỀ BẠN" : "MỤC TIÊU"}
          subtitle={isProfile ? "Mục tiêu được tính theo cân nặng và giới tính. Bạn có thể sửa bất cứ lúc nào." : undefined}
        />
      </div>

      {!loaded ? (
        <div aria-busy="true" aria-live="polite" className="flex flex-1 flex-col gap-3 px-4 py-5">
          <div className={SKELETON_CLASS} />
          <div className={SKELETON_CLASS} />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col gap-6 px-4 py-5 lg:w-full lg:max-w-[760px] lg:flex-none lg:rounded-sheet lg:border lg:border-card-border lg:bg-card lg:p-8"
        >
          {/* Desktop heading (≥1024 px) */}
          <div className="hidden flex-col gap-3 lg:flex">
            <span className="text-cap font-semibold text-secondary">{isProfile ? "Bước 1 / 2 · Về bạn" : "Bước 2 / 2 · Mục tiêu"}</span>
            <div className="flex justify-end">
              <span className="font-display text-xl font-black italic uppercase">
                H1T <span className="text-cobalt">MICRO</span>
              </span>
            </div>
            <h1 className="m-0 font-display text-display-sm font-black italic uppercase">VỀ BẠN</h1>
            <p className="m-0 text-callout text-secondary">
              Mục tiêu được tính theo cân nặng và giới tính. Bạn có thể sửa bất cứ lúc nào.
            </p>
          </div>

          {/* Profile: sex, birth year, weight */}
          <section
            className={`${isProfile ? "flex" : "hidden"} flex-col gap-6 lg:flex`}
            aria-label="Thông tin cơ thể"
          >
            <FormRow
              label="Tên hiển thị"
              htmlFor="setup-display-name"
              required
              hint="Hiện trên ảnh chia sẻ"
              error={errors.displayName}
            >
              <input
                id="setup-display-name"
                type="text"
                autoComplete="nickname"
                enterKeyHint="next"
                value={draft.displayName ?? ""}
                onChange={(e) => update({ displayName: limitDisplayName(e.target.value) })}
                onBlur={() => {
                  const message = validateSetupName(draft.displayName);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.displayName;
                    return message ? { ...next, displayName: message } : next;
                  });
                }}
                placeholder="Tên của bạn"
                aria-invalid={errors.displayName ? true : undefined}
                className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base font-semibold text-text outline-none focus:border-cobalt ${
                  errors.displayName ? "border-destructive" : "border-grabber"
                }`}
              />
            </FormRow>

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-5">
              <div role="group" aria-label="Giới tính">
                <FormRow label="Giới tính" data-align-group="setup-row">
                  <ChipGroup
                    size="lg"
                    items={SEX_OPTIONS.map((option) => ({
                      id: option.value,
                      label: option.label,
                      active: draft.sex === option.value,
                      onClick: () => update({ sex: option.value }),
                    }))}
                  />
                </FormRow>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Năm sinh" htmlFor="setup-birth-year" error={errors.birthYear} data-align-group="setup-row">
                  <input
                    id="setup-birth-year"
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    enterKeyHint="next"
                    maxLength={4}
                    value={draft.birthYear}
                    onChange={(e) => update({ birthYear: e.target.value })}
                    onBlur={() => checkField("birthYear")}
                    onKeyDown={nextFieldOnEnter}
                    aria-invalid={errors.birthYear ? true : undefined}
                    className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base font-semibold tabular-nums text-text outline-none focus:border-cobalt ${
                      errors.birthYear ? "border-destructive" : "border-grabber"
                    }`}
                  />
                </FormRow>
                <FormRow label="Cân nặng (kg)" htmlFor="setup-weight" error={errors.weight} data-align-group="setup-row">
                  <input
                    id="setup-weight"
                    type="text"
                    ref={weightRef}
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint={isProfile ? "next" : "done"}
                    value={draft.weight}
                    onChange={(e) => update({ weight: e.target.value })}
                    onBlur={() => checkField("weight")}
                    aria-invalid={errors.weight ? true : undefined}
                    className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base font-semibold tabular-nums text-text outline-none focus:border-cobalt ${
                      errors.weight ? "border-destructive" : "border-grabber"
                    }`}
                  />
                </FormRow>
              </div>
            </div>

            {coachingAvailable(isLiveMode()) && (
            <FormRow label="Mã huấn luyện viên (nếu có)" htmlFor="setup-coach-code">
              <input
                id="setup-coach-code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="done"
                value={coachCode}
                onChange={(e) => {
                  setCoachCode(e.target.value);
                  writePendingCoachCode(e.target.value);
                }}
                placeholder="Mã gồm 10 ký tự"
                className="h-[52px] w-full rounded-xl border-2 border-grabber bg-surface px-4 text-base font-semibold uppercase text-text outline-none focus:border-cobalt"
              />
            </FormRow>
            )}

            {draft.sex === "female" && (
              <Card className="text-cap leading-normal text-secondary">
                Với nữ, bạn có thể bật “Gần/đang trong kỳ” trên trang Hồ sơ để tăng mục tiêu Iron lên 28 mg/ngày.
              </Card>
            )}
          </section>

          {/* Goal: options and daily targets from lib/targets.ts */}
          <section
            className={`${isProfile ? "hidden" : "flex"} flex-col gap-3 lg:flex lg:gap-4 lg:border-t lg:border-divider lg:pt-6`}
            aria-label="Mục tiêu"
          >
            <h2 className="m-0 sr-only text-xl font-bold lg:not-sr-only lg:block">Mục tiêu</h2>

            <div role="radiogroup" aria-label="Mục tiêu" className="grid gap-2 lg:grid-cols-2">
              {options.map((option) => {
                const on = draft.goal === option.goal;
                return (
                  <button
                    key={option.goal}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => update({ goal: option.goal })}
                    className={`flex min-h-[60px] items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3 text-left text-text lg:min-h-[72px] ${
                      on ? "border-cobalt" : "border-divider"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                        on ? "border-cobalt" : "border-divider"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-cobalt" : "bg-transparent"}`} />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-base font-bold">{option.name}</span>
                      <span className="text-cap text-secondary">{option.note}</span>
                      <span className="text-cap tabular-nums text-secondary">{option.rule}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{option.kcal}</span>
                  </button>
                );
              })}
            </div>

            <Card className="flex flex-col gap-2">
              <h3 className="m-0 text-callout font-bold">Mục tiêu mỗi ngày</h3>
              {targetRows.map((row) => (
                <div
                  key={row.label}
                  data-align-group="daily-targets"
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-secondary">{row.label}</span>
                  <span className="font-semibold tabular-nums">{row.value}</span>
                </div>
              ))}
              <p className="m-0 text-cap text-secondary">{targetCaption}</p>
            </Card>
          </section>

          {saveError && (
            <p role="alert" className="m-0 text-cap text-destructive-text">
              {saveError}
            </p>
          )}

          {/* Phone: one CTA per step */}
          <div className={`${isProfile ? "flex" : "hidden"} mt-auto lg:hidden`}>
            <PillButton type="submit" value="next" disabled={saving || !nameReady}>
              Tiếp tục
            </PillButton>
          </div>
          <div className={`${isProfile ? "hidden" : "flex"} mt-auto lg:hidden`}>
            <PillButton type="submit" value="finish" disabled={saving || !nameReady}>
              Hoàn tất
            </PillButton>
          </div>

          {/* Desktop footer (≥1024 px) */}
          <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-divider pt-6 lg:flex">
            <PillButton href={isProfile ? "/signin" : "/setup/profile"} variant="secondary" fullWidth={false}>
              Quay lại
            </PillButton>
            <PillButton type="submit" value="finish" fullWidth={false} disabled={saving || !nameReady}>
              Hoàn tất
            </PillButton>
          </div>
        </form>
      )}
    </div>
  );
}
