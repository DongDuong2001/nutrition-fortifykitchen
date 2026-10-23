import type { CSSProperties } from "react";
import { LEVELS, type Level } from "@/lib/coaching-link";

/**
 * The Level tag (Badge.dc.html, Hao 23/10): slanted like the progress bar segments (skewX −14°, the text skewed back so it stands
 * upright), Saira italic 800, "LEVEL" and the number at one size, with a glass finish (solid face, 1 px specular top edge, a sheen
 * on the upper half, a dark lower edge, a lift shadow). Five slanted pips under it, filled to the Level, sit outside the layout box
 * so the tag is always the centre. Level 4 and 5 stand in one gold frame; Level 5 is the gold tag, framed, with a gold glow.
 * `mini` (Hôm nay's header, list rows): no pips, and the frame becomes a thin gold edge on the tag, so nothing sticks out of a row.
 * Static: only the celebration asks for one shine sweep (`shine`) and fills the new pips (`pipsFrom`); their keyframes ship with it.
 * Sizes in rem, the rest in em, so it follows Dynamic Type. No red, yellow or green: those mean Thiếu, Trung bình and Gần đủ.
 */
// mini: header and list rows · fly: the celebration's sweep · share: the share image · hero: the celebration
export type LevelBadgeSize = "mini" | "fly" | "share" | "hero";

const FONT_SIZE: Record<LevelBadgeSize, string> = { mini: "0.875rem", fly: "1.25rem", share: "1.625rem", hero: "2.75rem" };

const v = (token: string) => `var(--color-${token})`;
const alpha = (token: string, pct: number) => `color-mix(in srgb, ${v(token)} ${pct}%, transparent)`;

export interface BadgeColours {
  bg: string;
  label: string;
  number: string;
  shadow: string;
}

/**
 * bg / label / number / shadow per Level; every label is 4.5:1 or more on its tag (components/profile/__tests__/level-badge.test.tsx).
 * L2's label is white at 88 %: the board's 85 % measures 4.48:1 on cobalt.
 */
export function badgeColours(level: Level, onDark: boolean): BadgeColours {
  switch (level) {
    case 0:
      return { bg: v("paper-dark"), label: v("secondary-strong"), number: v("ink"), shadow: v("level-edge") };
    case 1:
      return { bg: v("sky"), label: v("ink"), number: v("ink"), shadow: v("cobalt") };
    case 2:
      return { bg: v("cobalt"), label: alpha("on-dark", 88), number: v("on-dark"), shadow: onDark ? v("sky") : v("ink") };
    case 3:
      return { bg: v("ink"), label: v("sky"), number: v("on-dark"), shadow: v("cobalt") };
    case 4:
      return { bg: v("ink"), label: v("sky"), number: v("gold"), shadow: v("gold") };
    case 5:
      return { bg: v("gold"), label: v("ink"), number: v("ink"), shadow: onDark ? v("gold-light") : v("ink") };
  }
}

/** A filled pip: cobalt on light / sky on dark for Level 1–3, gold for 4–5. */
export function pipColour(level: Level, onDark: boolean): string {
  return level >= 4 ? v("gold") : onDark ? v("sky") : v("cobalt");
}

function tagShadow(level: Level, onDark: boolean, framed: boolean, mini: boolean): string {
  // Inside the frame the hard "stamp" shadow would fill the air above the frame's bottom line: a soft drop gives the depth instead
  const stamp = framed ? "0 0.14em 0.35em rgb(0 0 0 / 0.28)" : `0 0.12em 0 ${badgeColours(level, onDark).shadow}`;
  return [
    "inset 0 1px 0 rgb(255 255 255 / 0.55)",
    "inset 0 -1px 0 rgb(0 0 0 / 0.22)",
    stamp,
    `0 0.25em 0.6em rgb(0 0 0 / ${onDark ? 0.35 : 0.18})`,
    ...(level === 5 ? [`0 0 0.7em ${alpha("gold", 55)}`] : []),
    ...(mini && level >= 4 ? [`0 0 0 0.08em ${v("gold")}`] : []),
    // An ink tag never sinks into an ink background
    ...(onDark && level === 3 ? [`0 0 0 1px ${alpha("sky", 50)}`] : []),
    ...(onDark && level === 4 ? [`0 0 0 1px ${alpha("gold", 55)}`] : []),
  ].join(", ");
}

export function LevelBadge({
  level,
  size = "mini",
  onDark = false,
  shine = false,
  pipsFrom,
  className = "",
}: {
  level: Level;
  size?: LevelBadgeSize;
  /** On an ink surface (the celebration): the L2 / L5 shadows lighten and the ink tags get an outline. */
  onDark?: boolean;
  /** One sheen sweep across the tag (the celebration's class `lv-shine`). */
  shine?: boolean;
  /** The celebration: the pips above this Level fill in one after another (class `lv-pip`). */
  pipsFrom?: Level;
  className?: string;
}) {
  const c = badgeColours(level, onDark);
  const mini = size === "mini";
  const framed = level >= 4 && !mini;
  const empty = onDark ? "rgb(255 255 255 / 0.18)" : "rgb(17 19 23 / 0.14)";
  return (
    <span
      role="img"
      aria-label={`Level ${level}`}
      data-level-badge={level}
      className={`relative inline-flex shrink-0 flex-col items-center font-display leading-none ${className}`}
      style={{ fontSize: FONT_SIZE[size] }}
    >
      {/* The box covers what is painted: skewX(−14°) pushes each side out by height × tan 14° / 2 (0.19em for the tag, 0.26em for the
          frame), so the row pads it and the frame keeps its 0.42em of air round the tag inside a 0.26em inset */}
      <span className="relative inline-flex items-center" style={{ padding: framed ? "0.3em 0.68em" : "0 0.19em" }}>
        {framed && (
          <span
            aria-hidden="true"
            data-level-frame
            className="absolute inset-x-[0.26em] inset-y-0 -skew-x-[14deg] rounded-[0.48em]"
            style={{
              border: `0.07em solid ${v("gold")}`,
              backgroundColor: alpha("gold", 10),
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.35), 0 0 0.6em ${alpha("gold", 25)}`,
            }}
          />
        )}
        <span
          className="relative inline-flex flex-none -skew-x-[14deg] items-center overflow-hidden rounded-[0.36em] px-[0.5em] py-[0.26em]"
          style={{ backgroundColor: c.bg, boxShadow: tagShadow(level, onDark, framed, mini) }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[52%] bg-linear-to-b from-white/25 to-white/5" />
          {shine && (
            <span
              aria-hidden="true"
              data-shine
              className="lv-shine pointer-events-none absolute -inset-y-[20%] left-0 w-[38%] bg-linear-to-r from-white/0 via-white/55 to-white/0"
            />
          )}
          <span aria-hidden="true" className="relative inline-flex skew-x-[14deg] items-baseline gap-[0.3em] font-extrabold italic leading-none">
            <span style={{ color: c.label }}>LEVEL</span>
            <span className="tabular-nums" style={{ color: c.number }}>
              {level}
            </span>
          </span>
        </span>
      </span>
      {!mini && (
        <span
          aria-hidden="true"
          data-pips="true"
          className="absolute left-1/2 top-full flex -translate-x-1/2 gap-[0.14em]"
          style={{ paddingTop: framed ? "0.32em" : "0.36em" }}
        >
          {LEVELS.slice(1).map((i) => {
            const fill = pipsFrom !== undefined && i > pipsFrom && i <= level;
            // --pip-i: the place of a new pip, so the celebration fills them one after another
            const pip = { backgroundColor: i <= level ? pipColour(level, onDark) : empty, ...(fill ? { "--pip-i": i - pipsFrom - 1 } : {}) } as CSSProperties;
            return (
              <span
                key={i}
                data-pip={i <= level ? "on" : "off"}
                data-pip-fill={fill || undefined}
                className={`block h-[0.18em] w-[0.62em] -skew-x-[14deg] rounded-[0.05em] ${fill ? "lv-pip" : ""}`}
                style={pip}
              />
            );
          })}
        </span>
      )}
    </span>
  );
}
