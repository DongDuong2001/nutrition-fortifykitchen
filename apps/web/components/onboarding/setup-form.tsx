"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
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
  parseWeightKg,
  readDraft,
  validateSetupDraft,
  validateSetupName,
  writeDraft,
  type SetupDraft,
  type SetupErrors,
} from "@/lib/onboarding";
import type { SexType } from "@/lib/targets";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { HEADER_ICON_BUTTON } from "@/components/ui/app-header";
import { SectionTitle } from "@/components/ui/section-title";
import { StepBars } from "@/components/ui/step-bars";
import { AlertLine } from "@/components/ui/alert-line";
import { AuthField, authErrorId, authHintId } from "@/components/onboarding/auth-field";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { fieldClass } from "@/components/foods/food-field";

export type SetupStep = "profile" | "goal";

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const SKELETON_CLASS = "h-12 rounded-xl bg-divider animate-pulse motion-reduce:animate-none";
const DESKTOP_QUERY = "(min-width: 1024px)";

// The range lib/onboarding's validateSetupDraft accepts for the weight; the − and + buttons stay inside it
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;
const WEIGHT_STEP = 0.5;

// The macro identity colours (V3-SPEC §1) of the three rows of "Mục tiêu mỗi ngày": a dot before the name, the value in its text shade
function targetTone(label: string): { dot: string; text: string } {
  if (label.startsWith("Đạm")) return { dot: "bg-macro-dam", text: "text-macro-dam-text" };
  if (label.startsWith("Chất béo")) return { dot: "bg-macro-beo", text: "text-macro-beo-text" };
  return { dot: "bg-macro-kcal", text: "text-macro-kcal-text" };
}

const STEPPER_BUTTON =
  "flex h-12 w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50";

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

  // − and + beside the weight: 0,5 kg a tap, kept inside the range the field accepts (an empty or odd value starts from the sample 65)
  function stepWeight(direction: 1 | -1) {
    const current = parseWeightKg(draft.weight) ?? parseWeightKg(DEFAULT_DRAFT.weight) ?? WEIGHT_MIN;
    const next = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, Math.round((current + direction * WEIGHT_STEP) / WEIGHT_STEP) * WEIGHT_STEP));
    update({ weight: formatNumber(next) });
  }

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

  const stepLabel = isProfile ? "Bước 1 / 2" : "Bước 2 / 2";
  const title = isProfile ? "Về bạn" : "Mục tiêu";
  const weightDescribedBy = [authHintId("setup-weight"), errors.weight ? authErrorId("setup-weight") : null].filter(Boolean).join(" ");

  return (
    <div className="flex min-h-dvh flex-col bg-page text-text lg:items-center lg:px-4 lg:py-8">
      {/* V3-SPEC §4: a 24 px fade from the page colour under the floating Back circle */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-sticky h-6 bg-linear-to-b from-page to-transparent lg:hidden" />

      <main className="flex flex-1 flex-col lg:w-full lg:max-w-[760px] lg:flex-none lg:gap-6 lg:rounded-sheet lg:border lg:border-card-border lg:bg-card lg:p-8">
        {/* One h1 for every width (D-A11Y-03): the phone's row of Back, title and step, and the desktop card's heading */}
        <header className="flex flex-none flex-col gap-2 pt-[max(8px,env(safe-area-inset-top))] lg:gap-3 lg:pt-0">
          <div className="hidden items-center justify-between lg:flex">
            <span className="text-cap font-semibold text-secondary">{isProfile ? "Bước 1 / 2 · Về bạn" : "Bước 2 / 2 · Mục tiêu"}</span>
            <BrandMark />
          </div>
          <div className="flex min-h-11 items-center gap-3 px-4 lg:px-0">
            <Link href={isProfile ? "/signin" : "/setup/profile"} aria-label="Quay lại" className={`${HEADER_ICON_BUTTON} lg:hidden`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </Link>
            <h1 className="m-0 min-w-0 flex-1 font-display text-headline font-extrabold italic uppercase leading-[1.1] tracking-display lg:text-display-sm">{title}</h1>
            <span className="flex-none text-cap font-semibold tabular-nums text-secondary lg:hidden">{stepLabel}</span>
          </div>
          <p className={`m-0 pl-[72px] pr-4 text-callout leading-snug text-secondary lg:p-0 ${isProfile ? "" : "max-lg:hidden"}`}>
            Mục tiêu được tính theo cân nặng và giới tính. Bạn có thể sửa bất cứ lúc nào.
          </p>
          <div className="mx-4 mt-2 lg:hidden">
            <StepBars current={isProfile ? 1 : 2} total={2} tone="light" />
          </div>
        </header>

        {!loaded ? (
          <div aria-busy="true" aria-live="polite" className="flex flex-1 flex-col gap-3 px-4 py-5 lg:p-0">
            <div className={SKELETON_CLASS} />
            <div className={SKELETON_CLASS} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-5 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 lg:gap-6 lg:p-0">
            {/* Profile: name, sex, birth year, weight */}
            <section className={`${isProfile ? "flex" : "hidden"} flex-col gap-5 lg:flex lg:gap-6`} aria-label="Thông tin cơ thể">
              <AuthField
                label="Tên hiển thị"
                htmlFor="setup-display-name"
                aside="Bắt buộc"
                hint="Hiện trên ảnh chia sẻ. Bạn đổi tên được sau."
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
                  className={`${fieldClass({ bad: !!errors.displayName })} text-base`}
                />
              </AuthField>

              <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-4">
                <AuthField label="Giới tính" htmlFor="setup-sex" group hint="Chỉ dùng để chọn mức khuyến nghị vi chất theo giới, ví dụ Iron 8 mg (nam) và 18 mg (nữ)." data-align-group="setup-row" className="h-full">
                  <div
                    id="setup-sex"
                    role="radiogroup"
                    aria-labelledby="setup-sex-label"
                    aria-describedby={authHintId("setup-sex")}
                    className="grid grid-cols-2 gap-1 rounded-xl bg-seg-track p-1"
                  >
                    {SEX_OPTIONS.map((option) => {
                      const on = draft.sex === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => update({ sex: option.value })}
                          className={`min-h-11 cursor-pointer rounded-[9px] border-0 text-cap font-semibold text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100 ${
                            on ? "bg-raised shadow-[0_0_0_1px_var(--color-card-border)]" : "bg-transparent"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </AuthField>

                  <AuthField
                    label="Năm sinh"
                    htmlFor="setup-birth-year"
                    aside="Từ 1920 đến 2015"
                    hint="Dùng để tính tuổi, vì khuyến nghị vi chất khác nhau theo tuổi."
                    error={errors.birthYear}
                    data-align-group="setup-row"
                    className="h-full"
                  >
                    <input
                      id="setup-birth-year"
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-year"
                      enterKeyHint="next"
                      maxLength={4}
                      placeholder="2003"
                      value={draft.birthYear}
                      onChange={(e) => update({ birthYear: e.target.value })}
                      onBlur={() => checkField("birthYear")}
                      onKeyDown={nextFieldOnEnter}
                      className={`${fieldClass({ bad: !!errors.birthYear })} text-base font-semibold tabular-nums`}
                    />
                  </AuthField>
                  <AuthField
                    label="Cân nặng"
                    htmlFor="setup-weight"
                    aside="Từ 30 đến 300 kg"
                    hint="Dùng để tính mục tiêu kcal, đạm và béo mỗi ngày."
                    error={errors.weight}
                    data-align-group="setup-row"
                    className="h-full"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={`flex h-12 min-w-[7rem] flex-1 items-center gap-2 rounded-xl bg-card px-3 ${
                          errors.weight ? "shadow-[inset_0_0_0_2px_var(--color-destructive-text)]" : "shadow-field focus-within:shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
                        }`}
                      >
                        <input
                          id="setup-weight"
                          type="text"
                          ref={weightRef}
                          inputMode="decimal"
                          autoComplete="off"
                          enterKeyHint={isProfile ? "next" : "done"}
                          placeholder="65"
                          value={draft.weight}
                          onChange={(e) => update({ weight: e.target.value })}
                          onBlur={() => checkField("weight")}
                          aria-describedby={weightDescribedBy}
                          aria-invalid={errors.weight ? true : undefined}
                          className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 font-display text-headline font-extrabold italic tabular-nums text-text outline-none placeholder:text-secondary focus-visible:outline-none"
                        />
                        <span aria-hidden="true" className="text-callout text-secondary">
                          kg
                        </span>
                      </div>
                      <div className="flex flex-none rounded-xl bg-card shadow-field">
                        <button type="button" aria-label="Giảm 0,5 kg" onClick={() => stepWeight(-1)} className={`${STEPPER_BUTTON} rounded-l-xl`}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                        <span aria-hidden="true" className="my-3 w-px bg-card-border" />
                        <button type="button" aria-label="Tăng 0,5 kg" onClick={() => stepWeight(1)} className={`${STEPPER_BUTTON} rounded-r-xl`}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </AuthField>
              </div>

              {coachingAvailable(isLiveMode()) && (
                <AuthField label="Mã huấn luyện viên (nếu có)" htmlFor="setup-coach-code">
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
                    className={`${fieldClass()} text-base font-semibold uppercase`}
                  />
                </AuthField>
              )}

              {draft.sex === "female" && (
                <Card className="text-cap leading-normal text-secondary">
                  Với nữ, bạn có thể bật “Gần/đang trong kỳ” trên trang Hồ sơ để tăng mục tiêu Iron lên 28 mg/ngày.
                </Card>
              )}
            </section>

            {/* Goal: options and daily targets from lib/targets.ts */}
            <section
              className={`${isProfile ? "hidden" : "flex"} flex-col gap-4 lg:flex lg:border-t lg:border-divider lg:pt-6`}
              aria-label="Mục tiêu"
            >
              <SectionTitle as="h2" className="sr-only lg:not-sr-only">
                Mục tiêu
              </SectionTitle>
              <p className="m-0 text-xs text-secondary">Dùng để tính kcal mỗi ngày. Bạn đổi lại được trong Cài đặt.</p>

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
                      className={`flex min-h-[68px] w-full cursor-pointer items-center gap-3 rounded-2xl border-0 px-4 py-3 text-left text-text transition-press active:scale-[0.99] motion-reduce:active:scale-100 ${
                        on ? "bg-cobalt-tint shadow-[inset_0_0_0_2px_var(--color-cobalt)]" : "bg-card shadow-ring"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full ${
                          on ? "bg-cobalt" : "shadow-[inset_0_0_0_2px_var(--color-secondary)]"
                        }`}
                      >
                        {on && (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-on-accent">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="text-callout font-bold">{option.name}</span>
                        <span className="text-cap leading-snug text-secondary">{option.note}</span>
                        <span className="text-xs tabular-nums text-secondary">{option.rule}</span>
                      </span>
                      <span className="flex flex-none flex-col items-end">
                        <span className="text-callout font-bold tabular-nums text-cobalt">{option.kcal}</span>
                        {option.kcal !== "—" && <span className="text-xs text-secondary">kcal</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Card as="section" aria-labelledby="daily-title" className="flex flex-col gap-2">
                <SectionTitle as="h3" id="daily-title">
                  Mục tiêu mỗi ngày
                </SectionTitle>
                {targetRows.map((row) => {
                  const tone = targetTone(row.label);
                  return (
                    <div key={row.label} data-align-group="daily-targets" className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-secondary">
                        <span aria-hidden="true" className={`mr-2 inline-block h-2 w-2 rounded-full align-[1px] ${tone.dot}`} />
                        {row.label}
                      </span>
                      <span className={`font-bold tabular-nums ${tone.text}`}>{row.value}</span>
                    </div>
                  );
                })}
                <p className="m-0 text-xs text-secondary">{targetCaption}</p>
              </Card>
            </section>

            <AlertLine show={!!saveError} gap={6} className="m-0 text-cap text-destructive-text">
              {saveError}
            </AlertLine>

            {/* Phone: one CTA per step, with the reason it waits */}
            <div className={`${isProfile ? "flex" : "hidden"} mt-auto flex-col gap-2 lg:hidden`}>
              {!nameReady && (
                <p id="next-reason" role="status" aria-live="polite" className="m-0 text-center text-cap text-secondary">
                  Nhập tên hiển thị để tiếp tục.
                </p>
              )}
              <PillButton type="submit" value="next" disabled={saving || !nameReady} aria-describedby={nameReady ? undefined : "next-reason"}>
                Tiếp tục
              </PillButton>
            </div>
            <div className={`${isProfile ? "hidden" : "flex"} mt-auto flex-col gap-2 lg:hidden`}>
              {!nameReady && (
                <p id="finish-reason" role="status" aria-live="polite" className="m-0 text-center text-cap text-secondary">
                  Quay lại bước 1 và nhập tên hiển thị để hoàn tất.
                </p>
              )}
              <PillButton type="submit" value="finish" disabled={saving || !nameReady} aria-describedby={nameReady ? undefined : "finish-reason"}>
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
      </main>
    </div>
  );
}
