import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { getLevel, getLevelLabel } from "@/lib/levels";
import { HomeBar } from "./home-bar";

// The 24 px pill sits inside a 44 px hit area: padding that the negative margin takes back
const PILL = "-m-2.5 inline-flex shrink-0 items-center border-0 bg-transparent p-2.5 text-on-dark no-underline hover:text-sky";
const PILL_FACE =
  "inline-flex h-6 items-center rounded-full border border-muted-on-dark px-2 text-xs font-bold leading-none whitespace-nowrap";

export interface HeroPill {
  key: string;
  label: string;
  ariaLabel?: string;
  href?: string;
  onClick?: () => void;
  id?: string;
}

const MACROS: { key: "carbs" | "protein" | "fat" | "fiber"; label: string }[] = [
  { key: "carbs", label: "Tinh bột" },
  { key: "protein", label: "Đạm" },
  { key: "fat", label: "Chất béo" },
  { key: "fiber", label: "Chất xơ" },
];

/**
 * The ink card of the home screen: what the day (or one food, or one meal) holds against the day's target.
 * Row 1: the mode label and the pills; row 2: kcal, the target range and the percent; the kcal bar; four macros.
 */
export function HomeHero({
  label,
  pills,
  values,
  kcalTarget,
  macroTargets,
  finished,
  selected,
}: {
  label: string;
  pills: HeroPill[];
  values: HomeValues;
  kcalTarget: { min: number; max: number };
  macroTargets: Record<"carbs" | "protein" | "fat" | "fiber", number | null>;
  finished: boolean;
  /** Food or meal mode: the border turns sky. */
  selected: boolean;
}) {
  const kcalKnown = pctOf(values.kcal, kcalTarget.min);
  const kcalPct = kcalKnown ?? 0;
  return (
    <section
      aria-label="Tổng kcal và dinh dưỡng đa lượng"
      className={`mx-3 mt-2 flex flex-none flex-col gap-1 rounded-2xl border-2 bg-surface-dark px-3.5 pt-2 pb-2.5 text-on-dark ${
        selected ? "border-sky" : "border-surface-dark"
      }`}
    >
      <div data-align-group="home-hero" className="flex min-h-[22px] items-center justify-between gap-2">
        <h2 aria-live="polite" className="m-0 min-w-0 break-words text-xs font-bold leading-snug text-sky">
          {label}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {pills.map((p) =>
            p.href ? (
              <Link key={p.key} id={p.id} href={p.href} aria-label={p.ariaLabel} className={PILL}>
                <span className={PILL_FACE}>{p.label}</span>
              </Link>
            ) : (
              <button key={p.key} id={p.id} type="button" onClick={p.onClick} aria-label={p.ariaLabel} className={PILL}>
                <span className={PILL_FACE}>{p.label}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div data-align-group="home-hero" className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-display text-[32px] font-extrabold leading-none tabular-nums">{formatAmount(values.kcal, "kcal")}</span>
        <span className="text-[13px] text-muted-on-dark">
          / {formatAmount(kcalTarget.min, "kcal")}–{formatAmount(kcalTarget.max, "kcal")} kcal
        </span>
        <span className="font-display text-[26px] font-extrabold italic leading-none tabular-nums">{pctLabel(values.kcal, kcalTarget.min)}</span>
        {finished && kcalKnown !== null && <span className="text-[13px] font-bold text-sky">{getLevelLabel(getLevel(kcalKnown))}</span>}
      </div>

      <div data-align-group="home-hero">
        <HomeBar label="Kcal so với mục tiêu ngày" pct={kcalPct} surface="dark" heightClass="h-2" />
      </div>

      <div data-align-group="home-hero" className="mt-1 grid grid-cols-4 gap-2.5">
        {MACROS.map((m) => {
          const value = values[m.key];
          const pct = pctOf(value, macroTargets[m.key]);
          return (
            <div key={m.key} className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-bold leading-tight">{m.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs leading-tight text-muted-on-dark tabular-nums">
                  {value === null ? "—" : `${formatAmount(value, "g")} g`}
                </span>
                <span className="font-display text-[15px] font-bold leading-none tabular-nums">{pctLabel(value, macroTargets[m.key])}</span>
              </div>
              <HomeBar label={`${m.label} so với mục tiêu ngày`} pct={pct} surface="dark" heightClass="h-[5px]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
