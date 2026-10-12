"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { useDiary } from "@/lib/diary-store";
import { formatNumber } from "@/lib/format";
import { parseWeightKg, validateSetupDraft } from "@/lib/onboarding";
import { profileToDraft, targetRangeText, targetsFor } from "@/lib/profile";

const STEP_KG = 0.1;

// One decimal at most, and none when the weight is whole: "65 kg", "70,5 kg"
function weightText(kg: number): string {
  return formatNumber(Math.round(kg * 10) / 10);
}

export default function WeightPage() {
  const router = useRouter();
  const { profile, updateProfile, hydrated } = useDiary();
  // null until the user types or steps: then the saved weight is shown
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const year = new Date().getFullYear();
  const shown = typed ?? weightText(profile.weightKg);
  const weight = parseWeightKg(shown);
  const preview = weight === null ? null : targetsFor({ ...profile, weightKg: weight });

  function weightError(value: string): string | undefined {
    return validateSetupDraft({ ...profileToDraft(profile), weight: value }, year).errors.weight;
  }

  function change(value: string) {
    setTyped(value);
    // Once an error is shown, re-check on every edit so it clears as soon as the weight is valid
    if (error) setError(weightError(value));
  }

  function step(delta: number) {
    if (weight === null) return;
    change(weightText(weight + delta));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = weightError(shown);
    setError(message);
    if (message || weight === null) return;
    updateProfile({ weightKg: weight });
    router.push("/settings/profile");
  }

  const form = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3">
        <FormRow label="Cân nặng hôm nay" htmlFor="weight-input" error={error} className="items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Giảm 0,1 kg"
              onClick={() => step(-STEP_KG)}
              className="h-14 w-14 shrink-0 rounded-full border border-card-border bg-card text-sm font-bold tabular-nums active:scale-[0.97]"
            >
              −0,1
            </button>
            <div className="flex items-baseline gap-1.5">
              <input
                id="weight-input"
                type="text"
                inputMode="decimal"
                value={hydrated ? shown : ""}
                disabled={!hydrated}
                onChange={(e) => change(e.target.value)}
                aria-invalid={error ? true : undefined}
                className={`h-16 w-[140px] rounded-[10px] border-2 bg-card text-center font-display text-[44px] font-black italic tabular-nums text-text outline-none focus:border-blue ${
                  error ? "border-destructive" : "border-blue"
                }`}
              />
              <span className="text-base font-semibold text-secondary">kg</span>
            </div>
            <button
              type="button"
              aria-label="Tăng 0,1 kg"
              onClick={() => step(STEP_KG)}
              className="h-14 w-14 shrink-0 rounded-full border border-card-border bg-card text-sm font-bold tabular-nums active:scale-[0.97]"
            >
              +0,1
            </button>
          </div>
        </FormRow>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="m-0 text-[15px] font-bold">Mục tiêu sẽ cập nhật</h2>
        {preview ? (
          <>
            <TargetLine label="Năng lượng" value={`${targetRangeText(preview.calories, "kcal")} · giữ nguyên`} />
            <TargetLine label="Đạm" value={targetRangeText(preview.protein, "g")} />
            <TargetLine label="Kali" value={targetRangeText(preview.potassium, "mg")} />
          </>
        ) : (
          <p className="m-0 text-sm text-secondary">Nhập cân nặng để xem mục tiêu</p>
        )}
        <p className="m-0 text-[13px] text-secondary">Tính lại theo cân nặng mới.</p>
      </Card>

      <PillButton type="submit" disabled={!hydrated}>
        Lưu
      </PillButton>
    </form>
  );

  return (
    <AppShell alignContainer="weight-page">
        <AppHeader variant="sub" title="CÂN NẶNG" backHref="/settings/profile" className="lg:hidden" alignGroup="weight-header" />
        <h1 className="m-0 hidden px-8 pt-7 font-display text-[34px] font-black italic uppercase lg:block">Cân nặng</h1>

        <main className="mx-auto w-full max-w-[560px] px-4 pb-8 pt-4 lg:mx-0 lg:px-8">
          <div data-align-group="weight-header">{form}</div>
        </main>
    </AppShell>
  );
}

function TargetLine({ label, value }: { label: string; value: string }) {
  return (
    <div data-align-group="weight-row" className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-secondary">{label}</span>
      <span className="text-right font-semibold tabular-nums">{value}</span>
    </div>
  );
}
