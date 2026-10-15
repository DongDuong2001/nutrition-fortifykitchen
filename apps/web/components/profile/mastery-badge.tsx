"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import type { MasteryLevelInfo } from "@/lib/mastery-levels";
import { CoachApplicationSheet } from "@/components/coaching/coach-application-sheet";

/** The user's mastery level (Cấp 1 to 5): the level, what it asks for, the way to the next one. */
export function MasteryBadge({ info }: { info: MasteryLevelInfo }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const isLevel5 = info.level === 5 || info.isCoach;

  return (
    <>
      <Card as="section" aria-label={`Cấp độ vi chất: ${info.title}`} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-2xl font-extrabold italic ${
                isLevel5 ? "bg-level-yellow text-on-accent" : "bg-blue text-on-accent"
              }`}
            >
              {info.level}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="flex flex-wrap items-center gap-2">
                <SectionTitle as="h3">{info.title}</SectionTitle>
                {isLevel5 && (
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-bold text-warning-text">
                    Chứng nhận
                  </span>
                )}
              </span>
              <span className="text-[13px] text-secondary">{info.shortLabel}</span>
            </div>
          </div>
          {info.nextLevel ? (
            <span className="shrink-0 font-display text-2xl font-extrabold italic tabular-nums text-blue">
              {info.progressPct}%
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-page px-3 py-1 text-[13px] font-bold text-blue">
              {isLevel5 ? "Huấn luyện viên tiêu biểu" : "Cấp cao nhất"}
            </span>
          )}
        </div>

        <p className="m-0 text-[13px] leading-snug text-secondary">{info.description}</p>

        {info.nextLevel && (
          <div className="flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label="Tiến độ lên cấp tiếp theo"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={info.progressPct}
              className="h-2 w-full overflow-hidden rounded-full bg-level-empty"
            >
              <div className="h-full rounded-full bg-blue" style={{ width: `${info.progressPct}%` }} />
            </div>
            {info.nextRequirementText && (
              <span className="text-[13px] leading-snug text-secondary">{info.nextRequirementText}</span>
            )}
          </div>
        )}

        {info.canApplyForCoach && (
          <div className="flex flex-col gap-3 border-t border-divider pt-3">
            <span className="text-[13px] font-semibold leading-snug text-text">
              Bạn đủ điều kiện ứng tuyển huấn luyện viên cộng đồng
            </span>
            <PillButton type="button" onClick={() => setSheetOpen(true)}>
              Nộp đơn ứng tuyển
            </PillButton>
          </div>
        )}
      </Card>

      <CoachApplicationSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
