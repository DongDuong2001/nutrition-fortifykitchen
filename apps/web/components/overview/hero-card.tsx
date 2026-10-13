"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeroCard as HeroShell, HeroNumber, Segments } from "@/components/overview/parts/hero-card";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { formatNumber } from "@/lib/format";
import type { HeroState, MealBar } from "@/lib/overview-board";
import { getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";

type HeroView = "left" | "meals";

const ACTION_CLASS =
  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-card px-4 text-[15px] font-extrabold text-ink no-underline active:scale-[0.97] motion-reduce:active:scale-100";

function EatenSide({ hero }: { hero: HeroState }) {
  return (
    <>
      Đã ăn <b className="font-bold text-on-dark tabular-nums">{formatNumber(hero.eaten)}</b>
      <br />
      Tối thiểu <b className="font-bold text-on-dark tabular-nums">{formatNumber(hero.min)}</b>
    </>
  );
}

/**
 * Tóm tắt's dark card: today's kcal still missing as a big Saira number, the minimum eaten as ten slanted
 * segments, and the one next action. A two-way toggle swaps the number for today's kcal per meal.
 */
export function TodayHero({
  hero,
  meals,
  nextMeal,
}: {
  hero: HeroState;
  meals: MealBar[];
  /** The meal to log next by the clock, or null when every meal has entries */
  nextMeal: MealSlot | null;
}) {
  const [view, setView] = useState<HeroView>("left");
  const nextName = nextMeal ? getMealSlotNameVi(nextMeal).toLowerCase() : null;
  const toggleBase =
    "inline-flex min-h-[44px] items-center rounded-full border-0 px-4 text-[13px] cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100";
  const on = "bg-sky font-extrabold text-ink";
  const off = "bg-transparent font-bold text-muted-subtitle";

  const toggle = (
    <div role="group" aria-label="Chế độ xem hôm nay" className="inline-flex rounded-full bg-level-empty-dark p-1">
      <button type="button" aria-pressed={view === "left"} onClick={() => setView("left")} className={`${toggleBase} ${view === "left" ? on : off}`}>
        Còn thiếu
      </button>
      <button type="button" aria-pressed={view === "meals"} onClick={() => setView("meals")} className={`${toggleBase} ${view === "meals" ? on : off}`}>
        Theo bữa
      </button>
    </div>
  );

  const action = nextMeal ? (
    <Link id="overview-next-meal" href={`/add?meal=${nextMeal}`} onClick={() => rememberAddOpener("overview-next-meal")} className={ACTION_CLASS}>
      + Thêm vào {nextName}
    </Link>
  ) : (
    <Link href="/diary" className={ACTION_CLASS}>
      Xem nhật ký
    </Link>
  );

  return (
    <HeroShell id="ov-hero" label={view === "left" ? "Hôm nay còn thiếu" : "Hôm nay theo bữa"} aside={toggle} footer={action}>
      {view === "left" ? (
        <div className="flex flex-col gap-3">
          {hero.done ? (
            <div className="flex items-end justify-between gap-3">
              <p className="m-0 font-display text-[40px] font-black italic leading-none text-sky">Đã đủ kcal tối thiểu</p>
              <p className="m-0 shrink-0 text-right text-[13px] leading-normal text-muted-subtitle">
                <EatenSide hero={hero} />
              </p>
            </div>
          ) : (
            <HeroNumber id="ov-hero-number" value={formatNumber(hero.remaining)} unit="kcal" side={<EatenSide hero={hero} />} />
          )}
          <div role="img" aria-label={`Đã ăn ${hero.segments} trên 10 phần của mức tối thiểu`}>
            <Segments filled={hero.segments} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {meals.map((m) => (
              <li key={m.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-3">
                <span className="text-[13px] font-bold">{m.label}</span>
                <span aria-hidden="true" className="block h-3 rounded-[2px] bg-level-empty-dark" style={{ transform: "skewX(-14deg)" }}>
                  <span className="block h-3 rounded-[2px] bg-sky" style={{ width: `${Math.round(m.share * 100)}%` }} />
                </span>
                <span className="text-right">
                  {m.empty ? (
                    <span className="text-[13px] font-bold text-sky">Chưa ăn</span>
                  ) : (
                    <span className="font-display text-xl font-bold tabular-nums">{formatNumber(m.kcal)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-[13px] text-muted-subtitle">
            Tổng {formatNumber(hero.eaten)} kcal
            {hero.done
              ? " · đã đủ mức tối thiểu"
              : ` · còn thiếu ${formatNumber(hero.remaining)} kcal${nextName ? ` cho ${nextName}` : ""}`}
          </p>
        </div>
      )}
    </HeroShell>
  );
}
