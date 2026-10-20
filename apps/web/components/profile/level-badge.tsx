import type { Level } from "@/lib/coaching-link";

/**
 * The Level tag: slanted like the progress bar segments (skewX −14°, the text skewed back so it stands upright),
 * Saira italic 800, "LEVEL" and the number at one size. Colours by Level are tokens (globals.css): L0 paper, L1
 * sky, L2 cobalt, L3 ink with a cobalt shadow, L4 ink with a gold number and shadow, L5 gold. No red, yellow or
 * green: those mean Thiếu, Trung bình and Gần đủ.
 */
const STYLE: Record<Level, { bg: string; label: string; number: string; shadow: string }> = {
  0: { bg: "var(--color-paper-dark)", label: "var(--color-secondary)", number: "var(--color-ink)", shadow: "var(--color-card-border)" },
  1: { bg: "var(--color-sky)", label: "var(--color-cobalt)", number: "var(--color-ink)", shadow: "var(--color-cobalt)" },
  2: { bg: "var(--color-cobalt)", label: "var(--color-sky)", number: "var(--color-on-dark)", shadow: "var(--color-ink)" },
  3: { bg: "var(--color-ink)", label: "var(--color-sky)", number: "var(--color-on-dark)", shadow: "var(--color-cobalt)" },
  4: { bg: "var(--color-ink)", label: "var(--color-sky)", number: "var(--color-gold)", shadow: "var(--color-gold)" },
  5: { bg: "var(--color-gold)", label: "var(--color-ink)", number: "var(--color-ink)", shadow: "var(--color-ink)" },
};

export type LevelBadgeSize = "share" | "list";

// share: 26 px at the 390 px scale of the share image. list: smaller, for rows and cards.
const SIZE: Record<LevelBadgeSize, string> = {
  share: "text-title px-3 py-1.5",
  list: "text-[0.875rem] px-2 py-1",
};

export function LevelBadge({ level, size = "list", className = "" }: { level: Level; size?: LevelBadgeSize; className?: string }) {
  const c = STYLE[level];
  return (
    <span
      role="img"
      aria-label={`Level ${level}`}
      data-level-badge={level}
      className={`inline-flex shrink-0 -skew-x-[14deg] items-center rounded-lg ${SIZE[size]} ${className}`}
      style={{ backgroundColor: c.bg, boxShadow: `0 2px 0 ${c.shadow}` }}
    >
      <span aria-hidden="true" className="inline-flex skew-x-[14deg] items-baseline gap-[0.3em] font-display font-extrabold italic leading-none">
        <span style={{ color: c.label }}>LEVEL</span>
        <span className="tabular-nums" style={{ color: c.number }}>
          {level}
        </span>
      </span>
    </span>
  );
}
