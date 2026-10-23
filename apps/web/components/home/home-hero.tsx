import Link from "next/link";
import { formatAmount, formatRange } from "@/lib/format";
import { kcalValue } from "@/lib/kcal";
import { pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { getLevel, getLevelColor, getLevelLabel } from "@/lib/levels";
import { LevelBar } from "@/components/ui/level-bar";
import { useRef } from "react";
import { useCountUpText } from "@/lib/count-up";
import { Expand } from "@/components/ui/expand";

// The 32 px pill sits inside a 44 px hit area: the row is 32 px high, so the negative margin takes the extra 12 px back
const PILL = "m-on-ink-press -my-1.5 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-on-dark no-underline hover:text-sky";
const PILL_FACE =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-muted-on-dark px-2 text-callout font-bold leading-none whitespace-nowrap";

export interface HeroPill {
  key: string;
  label: string;
  ariaLabel?: string;
  href?: string;
  onClick?: () => void;
  id?: string;
  /** data-tour, for a tour step that points at the pill */
  tour?: string;
}

// Hôm nay readability (C3, Hao 22/10): three macros; Chất xơ has its own row at the top of the nutrient column
const MACROS: { key: "carbs" | "protein" | "fat"; label: string }[] = [
  { key: "carbs", label: "Tinh bột" },
  { key: "protein", label: "Đạm" },
  { key: "fat", label: "Chất béo" },
];

/**
 * The ink card of the home screen: what the day (or one food, or one meal) holds against the day's target.
 * Row 1: the mode label and the pills; row 2: kcal (40 px), the target range and the percent; the kcal bar; three macros (C3).
 */
export function HomeHero({
  label,
  pills,
  values,
  kcalTarget,
  macroTargets,
  finished,
  selected,
  kcalNote,
  share = false,
  countKey,
}: {
  label: string;
  pills: HeroPill[];
  values: HomeValues;
  kcalTarget: { min: number; max: number };
  macroTargets: Record<"carbs" | "protein" | "fat" | "fiber", number | null>;
  finished: boolean;
  /** Food or meal mode: the border turns sky. */
  selected: boolean;
  /** "2 món chưa rõ kcal": under the card when some of the shown foods have no energy value. */
  kcalNote?: string | null;
  /** The share image: drawn at 390 px on any screen, so no desktop classes. */
  share?: boolean;
  /** The day and the selection: the kcal counts only while this stays the same (an add or a delete), never on a change of day or selection. */
  countKey?: string;
}) {
  const kcalKnown = pctOf(values.kcal, kcalTarget.min);
  // cc-51, cc-64 (R1): the big kcal and its percent count to a new value in 300 ms after an add or a delete, written to
  // their text nodes (no React render per frame); the first value, "—", a new day and a new selection show at once
  const kcalRef = useRef<HTMLSpanElement>(null);
  // The unknown-kcal line keeps its last text while it closes
  const lastNote = useRef<string | null>(null);
  if (kcalNote) lastNote.current = kcalNote;
  const pctRef = useRef<HTMLSpanElement>(null);
  useCountUpText(share ? null : values.kcal, countKey ?? label, [
    { ref: kcalRef, format: (n) => kcalValue(n) },
    { ref: pctRef, format: (n) => pctLabel(n, kcalTarget.min) },
  ]);
  const shownKcal = values.kcal;
  const kcalPct = kcalKnown ?? 0;
  return (
    <>
      <section
        aria-label="Tổng kcal và dinh dưỡng đa lượng"
        data-tour="home-hero"
        className={`mx-3 mt-2 flex flex-none flex-col gap-2 rounded-2xl ${share ? "" : "lg:mx-0"} bg-ink px-4 pt-3 pb-4 text-on-dark ${
          selected ? "ring-2 ring-inset ring-sky" : ""
        }`}
      >
        {/* cc-64: with large text the pills wrap under the label instead of running past the card */}
        <div data-align-group="home-hero" className="flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h2 aria-live="polite" className={`m-0 min-w-0 text-xs font-bold leading-snug text-sky ${share ? "whitespace-nowrap" : "break-words"}`}>
            {label}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {pills.map((p) =>
              p.href ? (
                <Link key={p.key} id={p.id} href={p.href} aria-label={p.ariaLabel} data-tour={p.tour} className={PILL}>
                  <span className={PILL_FACE}>{p.label}</span>
                </Link>
              ) : (
                <button key={p.key} id={p.id} type="button" onClick={p.onClick} aria-label={p.ariaLabel} data-tour={p.tour} className={PILL}>
                  <span className={PILL_FACE}>{p.label}</span>
                </button>
              )
            )}
          </div>
        </div>

        <div data-align-group="home-hero" className="flex flex-wrap items-baseline gap-x-1.5">
          <span ref={kcalRef} className="font-display text-[2.5rem] font-black italic leading-none tabular-nums tracking-display">{kcalValue(shownKcal)}</span>
          <span className={`text-sm text-on-dark/80 ${share ? "whitespace-nowrap" : ""}`}>
            / {formatRange(kcalTarget.min, kcalTarget.max)} kcal
          </span>
          <span ref={pctRef} className="ml-1 font-display text-[2.5rem] font-extrabold italic leading-none tabular-nums tracking-display">{pctLabel(shownKcal, kcalTarget.min)}</span>
          {finished && kcalKnown !== null && <span className="text-cap font-bold text-sky">{getLevelLabel(getLevel(kcalKnown))}</span>}
        </div>

        <div data-align-group="home-hero">
          <LevelBar label="Kcal so với mục tiêu ngày" pct={kcalPct} surface="dark" heightClass="h-[10px]" />
        </div>

        <div data-align-group="home-hero" className="mt-1 grid grid-cols-3 gap-3">
          {MACROS.map((m) => {
            const value = values[m.key];
            const target = macroTargets[m.key];
            const pct = pctOf(value, target);
            return (
              <div key={m.key} className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-bold leading-tight">{m.label}</span>
                {/* Amount/target and percent on one line, 8 px apart, 13 px at 80 % white and 16 px (C3). Macro numbers in Saira Condensed
                    (V3 keeps it for tight numbers) and no spaces around "/": "154/143 g 108%" fits the 106 px column at 390 */}
                {/* Share image: in a wider face the percent goes under the amount instead of into the next column */}
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap font-condensed text-cap font-extrabold leading-none text-on-dark/80 tabular-nums">
                    {value === null ? "—" : formatAmount(value, "g")}
                    {target !== null ? `/${formatAmount(target, "g")} g` : " g"}
                  </span>
                  {/* The percent takes its level's colour (V3-SPEC §1); unknown stays white */}
                  <span
                    className="shrink-0 whitespace-nowrap font-condensed text-base font-extrabold leading-none tabular-nums"
                    style={pct === null ? undefined : { color: getLevelColor(getLevel(pct)) }}
                  >
                    {pctLabel(value, target)}
                  </span>
                </div>
                <LevelBar label={`${m.label} so với mục tiêu ngày`} pct={pct} surface="dark" heightClass="h-[7px]" />
              </div>
            );
          })}
        </div>
      </section>
      {share ? (
        kcalNote && <p className="m-0 mx-3 mt-1 flex-none text-cap leading-snug text-secondary">{kcalNote}</p>
      ) : (
        // cc-64 (A3): the line opens and closes with Expand; the text it last had stays while it closes
        <Expand open={!!kcalNote} wrapClassName="flex-none">
          <p className="m-0 mx-3 mt-1 lg:mx-0 text-cap leading-snug text-secondary">{kcalNote ?? lastNote.current}</p>
        </Expand>
      )}
    </>
  );
}
