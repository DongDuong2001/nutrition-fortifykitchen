"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * The link page's background (LinkKhanh.dc.html, LinkKhanhDesktop.dc.html): line doodles that bob in place, a barbell
 * that drifts, a static floor line and dust blown left to right. Paths, positions and timings are the designs'; the
 * motion is .link-d / .link-p in globals.css and stops under prefers-reduced-motion. Decorative only (aria-hidden).
 */

type Kind =
  | "moon"
  | "alarm"
  | "medal"
  | "phone"
  | "book"
  | "hourglass"
  | "care"
  | "weather"
  | "brain"
  | "leaf"
  | "shoe"
  | "avocado"
  | "dumbbell"
  | "arm";

/** Each doodle in a 40 × 40 box. */
const SHAPES: Record<Kind, ReactNode> = {
  moon: (
    <>
      <path d="M26 6 A14 14 0 1 0 34 28 A11 11 0 1 1 26 6 Z" />
      <path d="M34 8 l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </>
  ),
  alarm: (
    <>
      <circle cx="20" cy="22" r="12" />
      <path d="M5 13 A8 8 0 0 1 13 5 Z M35 13 A8 8 0 0 0 27 5 Z M17 7.5 H23 M20 7.5 V10 M12 32 L8.5 36.5 M28 32 L31.5 36.5 M20 22 V29 M20 22 L24.5 26.5" />
      <circle cx="20" cy="22" r="1" />
    </>
  ),
  medal: (
    <>
      <path d="M12 2 L18 16 M28 2 L22 16" />
      <circle cx="20" cy="26" r="11" />
      <path d="M20 20 l2 4 4.5.6-3.3 3.1.8 4.5-4-2.2-4 2.2.8-4.5-3.3-3.1 4.5-.6z" />
    </>
  ),
  phone: (
    <>
      <rect x="11" y="3" width="18" height="34" rx="4" />
      <path d="M17 33 H23" />
      <path d="M20 23 C14 19 15 13 18 13 C19 13 20 14 20 15 C20 14 21 13 22 13 C25 13 26 19 20 23 Z" />
    </>
  ),
  book: <path d="M20 10 C14 6 7 6 2 8 V32 C7 30 14 30 20 34 C26 30 33 30 38 32 V8 C33 6 26 6 20 10 Z M20 10 V34" />,
  hourglass: (
    <>
      <path d="M8 6 H32 M8 38 H32 M11 6 C11 15 18 18 18 22 C18 26 11 29 11 38 M29 6 C29 15 22 18 22 22 C22 26 29 29 29 38 M14 11 H26 M14 36 C16 32 24 32 26 36 M20 22 V31" />
      <path d="M20 6 L16 2.5 M20 6 L24 2.5 M20 6 V1" />
    </>
  ),
  care: (
    <>
      <path d="M23 19 C17.5 15 15 12 16.3 8.8 C17.6 5.6 21.6 5.8 23 9 C24.4 5.8 28.4 5.6 29.7 8.8 C31 12 28.5 15 23 19 Z" />
      <path d="M3 25 V36 H8 V25 Z" />
      <path d="M8 27 L14 25 C16 24.5 18 25 19.5 26 L24 28 C25.5 28.8 25 31 23.2 30.8 L17 30" />
      <path d="M8 34 L17 36.5 C19 37 21 36.8 23 36 L35.5 30 C37.5 29 36.5 26 34 26.8 L25 29.5" />
    </>
  ),
  weather: (
    <>
      <circle cx="14" cy="12" r="6" />
      <path d="M14 2 V0 M4 12 H2 M7 5 L5.5 3.5 M21 5 L22.5 3.5" />
      <path d="M12 30 H32 A6 6 0 0 0 31 18 A8 8 0 0 0 16 20 A5 5 0 0 0 12 30 Z" />
      <path d="M16 34 L14 38 M23 34 L21 38 M30 34 L28 38" />
    </>
  ),
  brain: (
    <>
      <path d="M19 8 C16 5 10 6 9 10 C5 11 4 16 6 19 C3 22 4 28 8 29 C9 33 14 35 19 34 V8 Z M21 8 C24 5 30 6 31 10 C35 11 36 16 34 19 C37 22 36 28 32 29 C31 33 26 35 21 34 V8 Z" />
      <path d="M13 14 C15 15 16 17 15 19 M11 23 C14 22 16 24 16 27 M27 14 C25 15 24 17 25 19 M29 23 C26 22 24 24 24 27" />
    </>
  ),
  leaf: (
    <>
      <path d="M6 30 C4 24 10 14 20 9 C28 5 35 6 36 10 C37 14 32 22 24 28 C16 34 8 34 6 30 Z" />
      <path d="M6 30 L2 35 M36 10 L39 5 M13 23 l3 1 M21 16 l3 1 M23 23 l2.5 1" />
    </>
  ),
  shoe: (
    <>
      <path d="M4 19 C4 13 9 10 14 12 C17 8 23 8 25 12 C28 10 33 13 33 18 L33 25 C30 28 25 28 21 26 C17 29 10 28 7 25 C5 23 4 21 4 19 Z" />
      <ellipse cx="33" cy="21.5" rx="2.3" ry="3.6" />
      <path d="M14 12 C13 16 13 21 14 26.5 M25 12 C24 16 24 21 25 26.8" />
      <circle cx="12" cy="32" r="5" className="fill-page" />
      <circle cx="18" cy="34" r="5" className="fill-page" />
      <circle cx="18" cy="34" r="2" />
    </>
  ),
  avocado: (
    <>
      <path d="M20 4 C14 4 12 10 11 16 C8 22 8 30 13 34 C17 37 23 37 27 34 C32 30 32 22 29 16 C28 10 26 4 20 4 Z" />
      <circle cx="20" cy="25" r="5.5" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="5" y="14" width="4" height="12" rx="1" />
      <rect x="9" y="10" width="5" height="20" rx="1.5" />
      <rect x="26" y="10" width="5" height="20" rx="1.5" />
      <rect x="31" y="14" width="4" height="12" rx="1" />
      <path d="M14 20 H26" />
    </>
  ),
  arm: <path d="M6 34 C6 26 8 20 12 14 L16 8 C18 5 22 5 23 8 L22 12 L17 14 L16 20 C20 17 27 16 31 20 C35 24 34 32 28 34 Z" />,
};

/** [kind, x, y, dx, dy, tilt (deg), period t (s), delay (s)]: where a doodle sits and how it bobs. */
type Doodle = [Kind, number, number, number, number, number, number, number];

// Phone: an even grid inside 390 × 844
const PHONE_DOODLES: Doodle[] = [
  ["moon", 104, 14, 8, -12, -5, 23, -10],
  ["alarm", 246, 14, -8, 12, 5, 27, -4],
  ["medal", 20, 92, 8, -12, 4, 20, -13],
  ["phone", 330, 92, -8, 12, -4, 25, -7],
  ["book", 20, 168, 8, 12, 5, 19, -2],
  ["hourglass", 328, 452, -8, -12, -5, 24, -15],
  ["care", 330, 168, -8, -12, 4, 21, -9],
  ["weather", 330, 14, -8, -12, -4, 28, -18],
  ["brain", 20, 14, 8, 12, 4, 22, -6],
  ["leaf", 124, 452, 8, -12, -5, 26, -12],
  ["shoe", 226, 452, -8, 12, 5, 18, -3],
  ["avocado", 22, 452, 8, 12, -4, 24, -11],
  ["dumbbell", 36, 592, 8, -10, 4, 20, -8],
  ["arm", 318, 712, -8, -10, -4, 23, -16],
];

// Desktop: scattered over 1440 × 900, drawn 1.4 times larger
const DESKTOP_DOODLES: Doodle[] = [
  ["moon", 390, 160, 10, -14, -5, 23, -10],
  ["alarm", 1040, 110, -10, 14, 5, 27, -4],
  ["medal", 70, 270, 10, -14, 4, 20, -13],
  ["phone", 1190, 250, -10, 14, -4, 25, -7],
  ["book", 270, 350, 10, 14, 5, 19, -2],
  ["hourglass", 430, 720, -10, -14, -5, 24, -15],
  ["care", 1350, 360, -10, -14, 4, 21, -9],
  ["weather", 1300, 56, -10, -14, -4, 28, -18],
  ["brain", 160, 70, 10, 14, 4, 22, -6],
  ["leaf", 370, 560, 10, -14, -5, 26, -12],
  ["shoe", 1030, 390, -10, 14, 5, 18, -3],
  ["avocado", 140, 500, 10, 14, -4, 24, -11],
  ["dumbbell", 190, 690, 10, -12, 4, 20, -8],
  ["arm", 1330, 730, -10, -12, -4, 23, -16],
];

/** The barbell: two bar lines, the plates (ellipses rotated -29°) and the collar ticks. */
interface Barbell {
  bars: string[];
  plates: [number, number, number, number][];
  ticks: string;
  motion: [number, number, number, number, number];
  strokeWidth: number;
}

const PHONE_BARBELL: Barbell = {
  bars: ["M58 742 L302 606", "M64 752 L308 616"],
  plates: [
    [78, 738, 24, 56],
    [96, 728, 24, 56],
    [114, 718, 16, 38],
    [276, 628, 16, 38],
    [294, 618, 24, 56],
    [312, 608, 24, 56],
  ],
  ticks: "M55 690 L73 680 M100 786 L118 776 M271 570 L289 560 M316 666 L334 656",
  motion: [6, -10, 1.5, 26, -5],
  strokeWidth: 1.3,
};

const DESKTOP_BARBELL: Barbell = {
  bars: ["M700 860 L1240 560", "M708 873 L1248 573"],
  plates: [
    [730, 852, 38, 90],
    [758, 836, 38, 90],
    [786, 820, 25, 60],
    [1160, 604, 25, 60],
    [1188, 588, 38, 90],
    [1216, 572, 38, 90],
  ],
  ticks: "M1160 497 L1188 481 M1218 660 L1246 644 M700 776 L728 760 M760 930 L788 914",
  motion: [8, -12, 1, 26, -5],
  strokeWidth: 1.4,
};

/** [start x or null for the wind's start, y, sway, period t (s), delay (s), length]: one dust dash. */
type Dust = [number | null, number, number, number, number, number];

const PHONE_DUST: Dust[] = [
  [22, 30, 6, 4.5, -0.5, 6],
  [300, 62, -8, 6, -3.5, 4],
  [150, 96, 10, 4, -1.5, 7],
  [40, 128, -6, 7, -5.5, 5],
  [260, 158, 8, 5, -2.5, 3],
  [90, 192, -10, 3.5, -1, 6],
  [330, 224, 6, 6.5, -4.5, 5],
  [200, 258, -8, 4.5, -3, 4],
  [20, 292, 9, 5.5, -2, 7],
  [360, 326, -7, 4, -3.5, 5],
  [120, 360, 10, 7.5, -6, 3],
  [240, 396, -6, 5, -0.5, 6],
  [60, 432, 8, 6, -4, 4],
  [310, 466, -9, 3.5, -2.5, 7],
  [180, 500, 7, 6.5, -5, 5],
  [30, 536, -8, 4.5, -1, 6],
  [280, 570, 10, 5.5, -3, 4],
  [110, 604, -6, 4, -2, 7],
  [350, 640, 8, 7, -6.5, 3],
  [210, 674, -10, 5, -1.5, 6],
  [70, 710, 7, 6, -4.5, 5],
  [320, 744, -7, 4.5, -4, 4],
  [160, 778, 9, 5.5, -0.5, 7],
  [10, 812, -6, 6.5, -5, 5],
  [270, 832, 6, 4, -3, 4],
  [230, 12, 8, 5, -2, 5],
];

const DESKTOP_DUST: Dust[] = [
  [null, 8, 6, 11, -7.2, 4],
  [null, 34, -6, 10, -5.8, 8],
  [null, 47, 6, 10, -4.2, 5],
  [null, 65, -12, 15, -12.4, 4],
  [null, 95, 9, 9, -5.3, 4],
  [null, 116, 9, 9, -7.7, 6],
  [null, 129, -12, 18, -10.3, 8],
  [null, 154, -12, 11, -6.4, 9],
  [null, 166, 9, 10, -7.1, 8],
  [null, 185, 6, 12, -8.2, 7],
  [null, 213, 9, 16, -14.8, 6],
  [null, 228, 12, 11, -8.6, 4],
  [null, 251, 6, 18, -15.8, 9],
  [null, 269, -12, 10, -5.1, 5],
  [null, 293, 6, 11, -4.6, 9],
  [null, 305, 9, 18, -14.2, 6],
  [null, 328, 9, 14, -7.0, 7],
  [null, 345, -6, 10, -4.7, 9],
  [null, 365, 12, 13, -7.5, 9],
  [null, 394, 12, 13, -5.0, 9],
  [null, 408, -6, 16, -2.7, 4],
  [null, 430, -6, 12, -1.6, 5],
  [null, 449, -12, 16, -2.7, 7],
  [null, 471, 6, 11, -9.5, 6],
  [null, 492, 12, 14, -12.4, 5],
  [null, 506, -9, 11, -2.6, 5],
  [null, 524, -6, 11, -3.1, 5],
  [null, 549, 9, 14, -7.9, 5],
  [null, 572, 9, 18, -11.8, 9],
  [null, 585, 6, 18, -7.2, 7],
  [null, 605, -12, 15, -2.9, 5],
  [null, 629, -6, 10, -6.0, 4],
  [null, 644, 9, 11, -1.1, 6],
  [null, 671, -9, 10, -6.1, 5],
  [null, 692, 9, 14, -5.1, 4],
  [null, 705, 6, 16, -7.7, 6],
  [null, 725, 12, 10, -3.4, 6],
  [null, 750, 9, 11, -0.3, 8],
  [null, 768, -12, 18, -13.6, 6],
  [null, 796, 12, 10, -8.5, 8],
  [null, 808, -6, 11, -8.5, 8],
  [null, 830, -6, 18, -11.5, 8],
  [null, 854, -9, 12, -9.8, 9],
  [null, 874, 9, 12, -5.9, 9],
];

const px = (n: number) => `${n}px`;

function bob(x: number, y: number, dx: number, dy: number, tilt: number, t: number, dl: number): CSSProperties {
  return { "--x": px(x), "--y": px(y), "--dx": px(dx), "--dy": px(dy), "--tilt": `${tilt}deg`, "--t": `${t}s`, "--dl": `${dl}s` } as CSSProperties;
}

interface Layout {
  doodles: Doodle[];
  scale: number | null;
  doodleWidth: number;
  barbell: Barbell;
  floor: string;
  dust: Dust[];
  dustWidth: number;
  /** --wind-from, --wind-mid, --wind-to: where a dash enters, the middle of its path, and where it leaves. */
  wind: [number, number, number];
}

const PHONE: Layout = {
  doodles: PHONE_DOODLES,
  scale: null,
  doodleWidth: 1.4,
  barbell: PHONE_BARBELL,
  floor: "M0 800 Q195 760 390 806",
  dust: PHONE_DUST,
  dustWidth: 1.6,
  wind: [-24, 195, 414],
};

const DESKTOP: Layout = {
  doodles: DESKTOP_DOODLES,
  scale: 1.4,
  doodleWidth: 1.1,
  barbell: DESKTOP_BARBELL,
  floor: "M0 860 Q720 780 1440 850",
  dust: DESKTOP_DUST,
  dustWidth: 1.8,
  wind: [-30, 720, 1470],
};

function Scene({ layout }: { layout: Layout }) {
  const { barbell } = layout;
  const [from, mid, to] = layout.wind;
  return (
    <>
      <g fill="none" strokeWidth={layout.doodleWidth} strokeLinecap="round" strokeLinejoin="round" className="stroke-doodle">
        {layout.doodles.map(([kind, ...motion]) => (
          <g key={kind} className="link-d" style={bob(...motion)}>
            {layout.scale ? <g transform={`scale(${layout.scale})`}>{SHAPES[kind]}</g> : SHAPES[kind]}
          </g>
        ))}
      </g>
      <g className="link-d stroke-doodle-line" style={bob(0, 0, ...barbell.motion)} fill="none" strokeWidth={barbell.strokeWidth} strokeLinejoin="round">
        {barbell.bars.map((d) => (
          <path key={d} d={d} />
        ))}
        {barbell.plates.map(([cx, cy, rx, ry]) => (
          <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-29 ${cx} ${cy})`} />
        ))}
        <path d={barbell.ticks} />
      </g>
      <path d={layout.floor} fill="none" strokeWidth={barbell.strokeWidth} className="stroke-doodle-line" />
      <g
        strokeWidth={layout.dustWidth}
        strokeLinecap="round"
        className="stroke-doodle-dust"
        style={{ "--wind-from": px(from), "--wind-mid": px(mid), "--wind-to": px(to) } as CSSProperties}
      >
        {layout.dust.map(([sx, y, sy, t, dl, length]) => (
          <g
            key={`${y}-${dl}`}
            className="link-p"
            style={{ ...(sx === null ? {} : { "--sx": px(sx) }), "--y": px(y), "--sy": px(sy), "--t": `${t}s`, "--dl": `${dl}s` } as CSSProperties}
          >
            <path d={`M0 0 h${length}`} />
          </g>
        ))}
      </g>
    </>
  );
}

/** Phone (under 1024 px): the 390 × 844 scene scaled to the viewport width. Desktop: 1440 × 900, cropped to cover. */
export function LinkBackground() {
  // The desktop scene's loops stop while it is off screen and under Data Saver (globals.css [data-still])
  const desk = useRef<SVGSVGElement>(null);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const el = desk.current;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
      setStill(true);
      return;
    }
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStill(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 390 844" className="pointer-events-none absolute top-0 left-0 h-auto w-full lg:hidden">
        <Scene layout={PHONE} />
      </svg>
      <svg
        ref={desk}
        data-still={still ? "" : undefined}
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      >
        <Scene layout={DESKTOP} />
      </svg>
    </>
  );
}
