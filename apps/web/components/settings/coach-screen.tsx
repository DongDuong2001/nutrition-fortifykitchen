"use client";

import { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { LevelBadge } from "@/components/profile/level-badge";
import { LevelExplainerSheet } from "@/components/coaching/level-explainer-sheet";
import { notFound } from "next/navigation";
import { useCoaching } from "@/hooks/use-coaching";
import { useBack } from "@/hooks/use-back";
import { LEVELS } from "@/lib/coaching-link";
import { NO_COACH_TEXT, WRONG_CODE, leaveConfirm, levelSourceText } from "@/lib/level-copy";

/** Cài đặt › Huấn luyện viên: join with a code, or see the coach and the Level, learn what Level is, or leave. */
export function CoachScreen() {
  const goBack = useBack();
  const { hydrated, coach, level, joinByCode, leave, available } = useCoaching();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Live mode has no coaching yet: the app's 404, nothing else rendered
  if (!available) notFound();

  function join(event: React.FormEvent) {
    event.preventDefault();
    if (joinByCode(code) === null) {
      setError(WRONG_CODE);
      return;
    }
    setError(null);
    setCode("");
  }

  return (
    <AppShell alignContainer="coach-settings">
      <AppHeader variant="sub" title="Huấn luyện viên" onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[760px] lg:px-8">
        {!hydrated ? (
          <div aria-busy="true" className="h-[160px] rounded-[18px] bg-divider motion-safe:animate-pulse" />
        ) : coach === null ? (
          <Card as="section" aria-labelledby="coach-none" className="flex flex-col gap-3">
            <h2 id="coach-none" className="m-0 text-base font-bold">
              {NO_COACH_TEXT}
            </h2>
            <p className="m-0 text-[13px] leading-snug text-secondary">Nhập mã để HLV theo dõi và mở thêm chỉ số trong Hôm nay.</p>
            <form onSubmit={join} noValidate className="flex flex-col gap-3">
              <FormRow label="Mã huấn luyện viên" htmlFor="coach-code" error={error ?? undefined}>
                <input
                  id="coach-code"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="H1T-…"
                  aria-invalid={error ? true : undefined}
                  className={`h-[52px] w-full rounded-xl border-2 bg-card px-4 text-base font-semibold uppercase text-text outline-none focus:border-blue ${
                    error ? "border-destructive" : "border-card-border"
                  }`}
                />
              </FormRow>
              <PillButton type="submit">Tham gia</PillButton>
            </form>
          </Card>
        ) : (
          <>
            <Card as="section" aria-labelledby="coach-name" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 id="coach-name" className="m-0 break-words text-base font-bold">
                    {coach.name}
                  </h2>
                  <p className="m-0 text-[13px] leading-snug text-secondary">{levelSourceText(level)}</p>
                </div>
                <LevelBadge level={level} />
              </div>
              <PillButton type="button" variant="secondary" onClick={() => setExplainerOpen(true)} aria-haspopup="dialog">
                Level là gì?
              </PillButton>
            </Card>
            <PillButton type="button" variant="secondary" onClick={() => setLeaveOpen(true)} aria-haspopup="dialog" className="text-destructive-text">
              Rời HLV
            </PillButton>
          </>
        )}
      </main>

      <LevelExplainerSheet open={explainerOpen} onClose={() => setExplainerOpen(false)} level={LEVELS.includes(level) ? level : 0} />
      <Sheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Rời huấn luyện viên?" titleId="leave-coach-title" desktopDialog>
        <p className="m-0 px-1 text-[15px] leading-snug text-text">{coach ? leaveConfirm(coach.name) : ""}</p>
        <PillButton
          type="button"
          variant="destructive"
          onClick={() => {
            leave();
            setLeaveOpen(false);
          }}
        >
          {coach ? `Rời ${coach.name}` : "Rời HLV"}
        </PillButton>
        <PillButton type="button" variant="secondary" onClick={() => setLeaveOpen(false)}>
          Hủy
        </PillButton>
      </Sheet>
    </AppShell>
  );
}
