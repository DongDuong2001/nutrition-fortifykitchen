import { getEmptySegmentColor, homeBarColor, homeBarTone, homeSegments, type SegmentTone } from "@/lib/levels";

/**
 * The slanted 10-segment bar of the home screen, in the four level colours on every day (lib/levels homeBarTone).
 * An unknown value (null) is an empty bar, never coloured.
 */
export function HomeBar({
  label,
  pct,
  surface = "light",
  heightClass = "h-[6px]",
  gap = 3,
}: {
  label: string;
  pct: number | null;
  surface?: SegmentTone;
  heightClass?: string;
  gap?: number;
}) {
  const value = pct ?? 0;
  const n = homeSegments(value);
  const fill = homeBarColor(homeBarTone(value), surface);
  const empty = getEmptySegmentColor(surface);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct === null ? undefined : Math.min(100, Math.max(0, Math.round(value)))}
      aria-valuetext={pct === null ? "Chưa có dữ liệu" : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      className="grid w-full grid-cols-10 items-center"
      style={{ gap: `${gap}px` }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`${heightClass} rounded-[1px]`}
          style={{ backgroundColor: i < n ? fill : empty, transform: "skewX(-14deg)" }}
        />
      ))}
    </div>
  );
}
