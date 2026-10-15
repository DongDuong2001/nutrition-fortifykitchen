import React from "react";
import { Card } from "@/components/ui/card";
import type { MasteryLevelInfo } from "@/lib/mastery-levels";

export function MasteryBadge({ info }: { info: MasteryLevelInfo }) {
  return (
    <Card as="section" className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-xs font-black text-on-accent shadow-xs">
            {info.level}
          </span>
          <div>
            <h3 className="m-0 text-sm font-extrabold text-text">{info.title}</h3>
            <span className="text-xs font-medium text-secondary">{info.shortLabel}</span>
          </div>
        </div>
        {info.nextLevel ? (
          <span className="text-xs font-bold text-blue">{info.progressPct}%</span>
        ) : (
          <span className="rounded-full bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
            Tối đa
          </span>
        )}
      </div>

      <p className="m-0 text-xs text-secondary leading-relaxed">{info.description}</p>

      {info.nextLevel && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-page border border-card-border">
            <div
              className="h-full bg-blue transition-all duration-300 rounded-full"
              style={{ width: `${info.progressPct}%` }}
            />
          </div>
          {info.nextRequirementText && (
            <span className="text-[11px] font-medium text-secondary">
              Tiếp theo ({info.nextLevel.title}): {info.nextRequirementText}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
