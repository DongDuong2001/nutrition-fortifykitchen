import React from "react";
import { LevelBar } from "@/components/ui/level-bar";

/**
 * The continuous bar of an ink card (the level bar's shape). Sky filled by default: a share, not a level (Tóm tắt's Vi chất card).
 * `level`: the fill takes the level colour of `pct` (V3: the kcal and Vi chất heroes follow the four levels). `scale` puts
 * the two end labels under it ("0" and "2.275 kcal"). Hidden from AT; the caller labels it.
 */
export function HeroBar({ pct, level = false, scale }: { pct: number; level?: boolean; scale?: { from: string; to: string } }) {
  return (
    <div aria-hidden="true">
      <LevelBar label="" pct={pct} surface="dark" heightClass="h-[10px]" color={level ? undefined : "var(--color-sky)"} />
      {scale && (
        <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted-subtitle">
          <span>{scale.from}</span>
          <span>{scale.to}</span>
        </div>
      )}
    </div>
  );
}

/** The one-line note at the foot of an ink hero. */
export function HeroNote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-cap leading-snug text-muted-subtitle">{children}</p>;
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
    <section id={id} aria-labelledby={`${id}-label`} className="flex flex-col gap-3 rounded-card bg-ink p-4 text-on-dark">
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

/** The big number of a hero: Saira italic 900 in sky, 72 px (V3), with its unit and an optional side column. */
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
      <p className={`m-0 flex min-w-0 items-baseline ${unit && !unit.startsWith("/") ? "gap-2" : ""}`}>
        <span id={id} className="font-display text-[4.5rem] font-black italic leading-none tabular-nums text-sky tracking-[0.01em]">
          {value}
        </span>
        {unit && <span className="text-base font-semibold text-muted-subtitle">{unit}</span>}
      </p>
      {side && <div className="shrink-0 text-right text-cap leading-normal text-muted-subtitle">{side}</div>}
    </div>
  );
}
