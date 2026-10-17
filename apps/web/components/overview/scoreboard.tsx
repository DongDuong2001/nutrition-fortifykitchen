"use client";

import React, { useState } from "react";
import { ScoreRow } from "@/components/overview/parts/score-row";
import type { ScoreRowData } from "@/lib/overview-detail";

export type { ScoreRowData };

/**
 * The scoreboard: one white card of ScoreRows (Kcal, Đạm, Cân nặng, …). One row open at a time; the first row
 * starts open. Each row remembers its selected day, the last day of the period until the user picks another.
 * Only the open row draws its chart.
 */
export function Scoreboard({ rows, label = "Bảng điểm" }: { rows: ScoreRowData[]; label?: string }) {
  const [open, setOpen] = useState<string | null>(rows[0]?.key ?? null);
  const [picked, setPicked] = useState<Record<string, number>>({});

  return (
    <section aria-label={label} className="overflow-hidden rounded-[18px] lg:shadow-card border border-card-border bg-card text-text">
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row, i) => (
          <ScoreRow
            key={row.key}
            row={row}
            first={i === 0}
            open={open === row.key}
            selected={Math.min(picked[row.key] ?? row.days.length - 1, row.days.length - 1)}
            onToggle={() => setOpen(open === row.key ? null : row.key)}
            onSelect={(d) => setPicked((p) => ({ ...p, [row.key]: d }))}
            alignGroup="overview-rows"
          />
        ))}
      </ul>
    </section>
  );
}
