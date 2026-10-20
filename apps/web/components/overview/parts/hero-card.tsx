import React from "react";
import { LevelBar } from "@/components/ui/level-bar";

/** The continuous bar of a dark card (the level bar's shape), sky filled: a share, not a level. Hidden from AT; the caller labels it. */
export function HeroBar({ pct }: { pct: number }) {
  return (
    <div aria-hidden="true">
      <LevelBar label="" pct={pct} surface="dark" heightClass="h-[10px]" color="var(--color-sky)" />
    </div>
  );
}

/**
 * The one dark accent card of a Tổng quan screen: a small Saira label (uppercase, sky), an optional control at
 * its right, the body (usually a HeroNumber and its side stats, then HeroBar) and an optional footer action.
 */
export function HeroCard({
  id,
  label,
  aside,
  children,
  footer,
}: {
  id: string;
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="flex flex-col gap-3 rounded-card bg-surface-dark p-4 text-on-dark">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-label`} className="m-0 font-display text-cap font-extrabold uppercase tracking-wider text-sky">
          {label}
        </h2>
        {aside}
      </div>
      {children}
      {footer}
    </section>
  );
}

/** The big number of a hero: Saira italic 900 in sky, 96 px, with its unit and an optional side column. */
export function HeroNumber({
  value,
  unit,
  side,
  id,
}: {
  value: string;
  unit?: string;
  side?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <p className="m-0 min-w-0">
        <span id={id} className="font-display text-[6rem] font-black italic leading-[0.82] tabular-nums text-sky tracking-display">
          {value}
        </span>
        {unit && (
          <>
            {unit.startsWith("/") ? null : " "}
            <span className="text-base font-semibold text-muted-subtitle">{unit}</span>
          </>
        )}
      </p>
      {side && <div className="shrink-0 text-right text-cap leading-normal text-muted-subtitle">{side}</div>}
    </div>
  );
}
