"use client";

import React, { useState } from "react";
import Link from "next/link";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { formatNumber } from "@/lib/format";
import type { HeroState, MealBar } from "@/lib/overview-board";
import { getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";

type HeroView = "left" | "meals";

/** Slanted segments (the Cobalt Sign motif) on the dark card: sky filled, dark empty. */
function Segments({ filled, total = 10 }: { filled: number; total?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-3 rounded-[1px] ${i < filled ? "bg-sky" : "bg-level-empty-dark"}`}
          style={{ transform: "skewX(-14deg)" }}
        />
      ))}
    </div>
  );
}

/**
 * The one dark card of Tóm tắt: today's kcal still missing as a big Saira number, the minimum eaten as ten
 * slanted segments, and the one next action. A two-way toggle swaps the number for today's kcal per meal.
 */
export function HeroCard({
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
  const label = view === "left" ? "Hôm nay còn thiếu" : "Hôm nay theo bữa";
  const nextName = nextMeal ? getMealSlotNameVi(nextMeal).toLowerCase() : null;
  const toggleBase =
    "inline-flex min-h-[44px] items-center rounded-full border-0 px-4 text-[13px] cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100";

  return (
    <section
      id="ov-hero"
      aria-labelledby="ov-hero-label"
      className="flex flex-col gap-3 rounded-[18px] bg-surface-dark p-4 text-on-dark"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="ov-hero-label" className="m-0 font-display text-[13px] font-bold uppercase tracking-wider text-sky">
          {label}
        </h2>
        <div role="group" aria-label="Chế độ xem hôm nay" className="inline-flex rounded-full bg-level-empty-dark p-0.5">
          <button
            type="button"
            aria-pressed={view === "left"}
            onClick={() => setView("left")}
            className={`${toggleBase} ${view === "left" ? "bg-sky font-extrabold text-ink" : "bg-transparent font-bold text-muted-subtitle"}`}
          >
            Còn thiếu
          </button>
          <button
            type="button"
            aria-pressed={view === "meals"}
            onClick={() => setView("meals")}
            className={`${toggleBase} ${view === "meals" ? "bg-sky font-extrabold text-ink" : "bg-transparent font-bold text-muted-subtitle"}`}
          >
            Theo bữa
          </button>
        </div>
      </div>

      {view === "left" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            {hero.done ? (
              <p className="m-0 font-display text-[40px] font-black italic leading-none text-sky">Đã đủ kcal tối thiểu</p>
            ) : (
              <p className="m-0 min-w-0">
                <span
                  id="ov-hero-number"
                  className="font-display text-[96px] font-black italic leading-[0.82] tabular-nums text-sky"
                >
                  {formatNumber(hero.remaining)}
                </span>{" "}
                <span className="text-base font-semibold text-muted-subtitle">kcal</span>
              </p>
            )}
            <p className="m-0 shrink-0 text-right text-[13px] leading-normal text-muted-subtitle">
              Đã ăn <b className="font-bold text-on-dark tabular-nums">{formatNumber(hero.eaten)}</b>
              <br />
              Tối thiểu <b className="font-bold text-on-dark tabular-nums">{formatNumber(hero.min)}</b>
            </p>
          </div>
          <div
            role="img"
            aria-label={`Đã ăn ${hero.segments} trên 10 phần của mức tối thiểu`}
          >
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

      {nextMeal ? (
        <Link
          id="overview-next-meal"
          href={`/add?meal=${nextMeal}`}
          onClick={() => rememberAddOpener("overview-next-meal")}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-card px-4 text-[15px] font-extrabold text-ink no-underline active:scale-[0.97] motion-reduce:active:scale-100"
        >
          + Thêm vào {nextName}
        </Link>
      ) : (
        <Link
          href="/diary"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-card px-4 text-[15px] font-extrabold text-ink no-underline active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Xem nhật ký
        </Link>
      )}
    </section>
  );
}
