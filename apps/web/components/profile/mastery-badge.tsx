"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import type { MasteryLevelInfo } from "@/lib/mastery-levels";
import { CoachApplicationSheet } from "@/components/coaching/coach-application-sheet";

export function MasteryBadge({ info }: { info: MasteryLevelInfo }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const isLevel5 = info.level === 5 || info.isCoach;

  return (
    <>
      <Card as="section" className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-xs ${
                isLevel5 ? "bg-level-yellow text-card" : "bg-blue text-on-accent"
              }`}
            >
              {info.level}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="m-0 text-sm font-extrabold text-text">{info.title}</h3>
                {isLevel5 && (
                  <span className="rounded-full bg-warning-bg border border-level-yellow/40 px-2 py-0.5 text-[11px] font-bold text-warning-text">
                    Chứng nhận
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-secondary">{info.shortLabel}</span>
            </div>
          </div>
          {info.nextLevel ? (
            <span className="text-xs font-bold text-blue">{info.progressPct}%</span>
          ) : (
            <span className="rounded-full bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
              {isLevel5 ? "HLV Tiêu biểu" : "Tối đa"}
            </span>
          )}
        </div>

        <p className="m-0 text-xs text-secondary leading-relaxed">{info.description}</p>

        {info.nextLevel && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-page border border-card-border">
              <div
                className="h-full bg-blue transition-all duration-300 rounded-full"
                style={{ width: `${info.progressPct}%` }}
              />
            </div>
            {info.nextRequirementText && (
              <span className="text-[11px] font-medium text-secondary">
                {info.nextRequirementText}
              </span>
            )}
          </div>
        )}

        {info.canApplyForCoach && (
          <div className="pt-2 border-t border-card-border/60 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-text">
              Bạn đủ điều kiện ứng tuyển HLV cộng đồng
            </span>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-full bg-blue px-4 text-xs font-bold text-on-accent border-0 cursor-pointer transition-transform duration-150 active:scale-[0.97]"
            >
              Nộp đơn ứng tuyển
            </button>
          </div>
        )}
      </Card>


      <CoachApplicationSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
