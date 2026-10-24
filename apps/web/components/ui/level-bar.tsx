import { getLevel, getLevelColor, getLevelLabel, type SegmentTone } from "@/lib/levels";

/**
 * The level bar (Hao, 17/10): one continuous rounded bar. The fill is min(pct, 100)% wide in the level colour of pct
 * (lib/levels); the radius is half the height. An unknown value (null) is an empty track, never coloured.
 * Track: --color-track on light surfaces, --color-level-empty-dark inside ink cards.
 */
export function LevelBar({
  label,
  pct,
  surface = "light",
  heightClass,
  color,
}: {
  label: string;
  pct: number | null;
  surface?: SegmentTone;
  /** h-[10px] for kcal and nutrients, h-[7px] for macros, h-[9px] for phone nutrient rows. */
  heightClass: string;
  /** A fill that is not a level (Tổng quan's share of nutrients reached). */
  color?: string;
}) {
  // A NaN or an Infinity is no value: an empty track, as for null (translateX(NaN%) draws nothing and breaks the style)
  const known = typeof pct === "number" && Number.isFinite(pct);
  const value = known ? Math.max(0, pct) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={known ? Math.min(100, Math.round(value)) : undefined}
      aria-valuetext={known ? `${Math.round(value)}% · ${getLevelLabel(getLevel(value))}` : "Chưa có dữ liệu"}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full ${heightClass} ${surface === "dark" ? "bg-level-empty-dark" : "bg-track"}`}
    >
      {/* cc-51: a full-width rounded fill slid left (transform only) keeps its rounded end and eases to a new value.
          cc-57: always drawn (off the track at 0), so a bar going from 0 to a value grows instead of appearing */}
      <div
        className="m-bar h-full w-full rounded-full"
        style={{ transform: `translateX(${Math.min(value, 100) - 100}%)`, backgroundColor: color ?? getLevelColor(getLevel(value), surface) }}
      />
    </div>
  );
}
