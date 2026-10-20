"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { AttentionList, type AttentionItem } from "@/components/overview/attention-list";
import { HeroCard, HeroNumber, HeroBar } from "@/components/overview/parts/hero-card";
import { Scoreboard } from "@/components/overview/scoreboard";
import { SectionTitle } from "@/components/ui/section-title";
import { formatNumber, formatRange } from "@/lib/format";
import { weekdayShort } from "@/lib/overview-board";
import { bestWorstDays, energyAttention, macroScoreRow, trainingSplit, type DayPick, type SplitSide } from "@/lib/overview-detail";
import { readDay } from "@/lib/training-checklist";
import { HOME_ROUTE } from "@/lib/nav";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Đạm, béo and tinh bột as shares of kcal: one slanted bar split in three, and the numbers under it. */
function MacroSplit({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const parts = [
    { key: "protein", label: "Đạm", share: protein, bg: "bg-cobalt" },
    { key: "fat", label: "Chất béo", share: fat, bg: "bg-ink" },
    { key: "carbs", label: "Tinh bột", share: carbs, bg: "bg-sky" },
  ];
  return (
    <section aria-labelledby="en-split" className="flex flex-col gap-3 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-4 text-text">
      <SectionTitle id="en-split">Chia kcal</SectionTitle>
      <div
        role="img"
        aria-label={`Đạm ${protein}%, chất béo ${fat}%, tinh bột ${carbs}% của kcal trung bình`}
        className="flex h-4 gap-1"
      >
        {parts.map((p) => (
          <span key={p.key} className={`block h-4 rounded-[1px] ${p.bg}`} style={{ width: `${p.share}%`, transform: "skewX(-14deg)" }} />
        ))}
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {parts.map((p) => (
          <li key={p.key} className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2 text-cap font-semibold text-secondary">
              <span aria-hidden="true" className={`inline-block h-3 w-3 shrink-0 rounded-[3px] ${p.bg}`} />
              {p.label}
            </span>
            <span className="font-display text-title font-extrabold leading-none tabular-nums">{p.share}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SplitTile({ title, side }: { title: string; side: SplitSide }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-3">
      <span className="text-cap font-semibold text-secondary">
        {title}
        {side.days > 0 ? ` · ${side.days} ngày` : ""}
      </span>
      {side.calories === null ? (
        <span className="font-display text-title font-extrabold leading-none text-secondary">—</span>
      ) : (
        <>
          <span className="font-display text-title font-bold leading-none tabular-nums">
            {formatNumber(Math.round(side.calories))} <span className="text-cap font-semibold text-secondary">kcal</span>
          </span>
          <span className="text-cap text-secondary">
            Đạm {side.protein === null ? "—" : `${formatNumber(Math.round(side.protein))} g`}
          </span>
        </>
      )}
    </div>
  );
}

function PickTile({ title, pick, note }: { title: string; pick: DayPick | null; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-3">
      <span className="text-cap font-semibold text-secondary">{title}</span>
      {pick === null ? (
        <span className="font-display text-title font-bold leading-none text-secondary">—</span>
      ) : (
        <>
          <span className="font-display text-title font-bold leading-none tabular-nums">
            {formatNumber(pick.value)} <span className="text-cap font-semibold text-secondary">kcal</span>
          </span>
          <span className="text-cap text-secondary">
            {weekdayShort(pick.iso)} {dm(pick.iso)}
            {note ? ` · ${note}` : ""}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Năng lượng (/trends): the average kcal against the target range, the scoreboard (Kcal, Đạm, Chất béo,
 * Tinh bột, Chất xơ; tap a row for its seven days), how kcal splits between đạm, béo and tinh bột, training
 * days against rest days, the best and the worst day, and what needs attention.
 */
export function EnergyTab() {
  const { overview, todayIso, targets } = useOverview();
  const { averages, composition, targetDays, days, period } = overview;
  const length = period.length;

  const split = useMemo(
    () => trainingSplit(days, (iso) => readDay(iso)?.minutes ?? null, todayIso),
    [days, todayIso]
  );
  const picks = useMemo(() => bestWorstDays(days, targets.calories, todayIso), [days, targets.calories, todayIso]);
  const attention = useMemo(
    () => energyAttention({ days, targets, todayIso, length }),
    [days, targets, todayIso, length]
  );

  if (!overview.enough || composition === null || averages.calories === null) return <NotEnoughData />;

  const kcal = targets.calories;
  const rows = (["calories", "protein", "fat", "carbs", "fiber"] as const).map((key) => {
    const row = macroScoreRow({ key, overview, targets, todayIso });
    return key === "fiber" ? { ...row, title: "Chất xơ*" } : row;
  });
  const items: AttentionItem[] = attention.map((row) => ({
    id: row.title,
    href: HOME_ROUTE,
    title: row.title,
    line: row.line,
    number: row.number,
    gap: row.gap,
  }));
  const noTraining = split.training.days === 0 && split.rest.days === 0;
  const worst = picks.worst;

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
        <HeroCard id="en-hero" label="Năng lượng trung bình">
          <HeroNumber
            id="en-hero-number"
            value={formatNumber(Math.round(averages.calories))}
            unit="kcal"
            side={
              <p className="m-0">
                Mục tiêu <b className="font-bold text-on-dark tabular-nums">{formatRange(kcal.min, kcal.max)}</b>
                <br />
                Đạt <b className="font-bold text-on-dark tabular-nums">{targetDays.calories.met}/{targetDays.calories.of}</b> ngày
              </p>
            }
          />
          <div role="img" aria-label="Trung bình so với mục tiêu kcal">
            <HeroBar pct={kcal.min > 0 ? (averages.calories / kcal.min) * 100 : 0} />
          </div>
        </HeroCard>

        <Scoreboard key={`${length}-${period.offset}`} rows={rows} label="Năng lượng và chất sinh năng lượng" />
        <p className="m-0 text-cap leading-snug text-secondary">* Chất xơ chỉ tính từ các món đã có dữ liệu chất xơ.</p>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
        <MacroSplit protein={composition.protein} fat={composition.fat} carbs={composition.carbs} />

        <section aria-labelledby="en-train" className="flex flex-col gap-3 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-4 text-text">
          <SectionTitle id="en-train">Ngày tập và ngày nghỉ</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <SplitTile title="Ngày tập" side={split.training} />
            <SplitTile title="Ngày nghỉ" side={split.rest} />
          </div>
          {noTraining && (
            <p className="m-0 text-cap leading-snug text-secondary">
              Chưa có ngày nào ghi giờ tập.{" "}
              <Link href="/training" className="font-bold text-cobalt">
                Mở Ngày tập
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="en-days" className="flex flex-col gap-3 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-4 text-text">
          <SectionTitle id="en-days">Ngày gần và xa mục tiêu</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <PickTile title="Gần mục tiêu nhất" pick={picks.best} />
            <PickTile
              title="Xa mục tiêu nhất"
              pick={worst}
              note={worst ? (worst.value < kcal.min ? `thiếu ${formatNumber(worst.distance)} kcal` : `trên ${formatNumber(worst.distance)} kcal`) : undefined}
            />
          </div>
        </section>

        <AttentionList items={items} />
      </div>
    </div>
  );
}
