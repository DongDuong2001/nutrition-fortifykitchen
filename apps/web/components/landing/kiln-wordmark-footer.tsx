"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/**
 * Kiln Wordmark Footer adapted for H1T MICRO.
 * Pure procedural geometry, interactive tile backdrop, back-to-top button,
 * and dynamic weight lens, styled using H1T MICRO design tokens.
 */

export type Pt = [number, number];

export const XH = 100;
export const ASC = 36;
export const DESC = 36;
export const SQUARE = 2.4;
const PI = Math.PI;
const TAU = PI * 2;

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const signedArea = (p: Pt[]): number => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
  }
  return a / 2;
};

export const orient = (p: Pt[], sign: 1 | -1): Pt[] => (signedArea(p) * sign >= 0 ? p : p.slice().reverse());

const sePt = (cx: number, cy: number, rx: number, ry: number, t: number): Pt => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / SQUARE),
    cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / SQUARE),
  ];
};

export const ring = (x0: number, y0: number, x1: number, y1: number, V: number, h: number): Pt[][] => {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = (y1 - y0) / 2;
  const irx = Math.max(1, rx - V);
  const iry = Math.max(1, ry - h);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * TAU;
    outer.push(sePt(cx, cy, rx, ry, t));
    inner.push(sePt(cx, cy, irx, iry, t));
  }
  return [orient(outer, 1), orient(inner, -1)];
};

export type Half = [axis: 0 | 1, at: number, side: 1 | -1];

export const clipHalf = (poly: Pt[], [axis, at, side]: Half): Pt[] => {
  const out: Pt[] = [];
  const inside = (p: Pt) => (p[axis] - at) * side <= 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const u = (at - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
  }
  return out;
};

export const keep = (shape: Pt[][], ...halves: Half[]): Pt[][] =>
  shape.map((poly) => halves.reduce(clipHalf, poly)).filter((poly) => poly.length >= 3 && Math.abs(signedArea(poly)) > 1e-6);

export const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] =>
  orient(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    1,
  );

export const diag = (xa: number, ya: number, xb: number, yb: number, t: number): Pt[] =>
  orient(
    [
      [xa, ya],
      [xa + t, ya],
      [xb + t, yb],
      [xb, yb],
    ],
    1,
  );

type GlyphFn = (V: number, h: number) => Pt[][];

const B = 112;

export const GLYPHS: Record<string, [number, GlyphFn]> = {
  a: [B, (V, h) => [...ring(0, 0, B, XH, V, h), rect(B - V, 0, B, XH)]],
  b: [B, (V, h) => [rect(0, -ASC, V, XH), ...ring(0, 0, B, XH, V, h)]],
  c: [82, (V, h) => keep(ring(0, 0, 122, XH, V, h), [0, 82, 1])],
  d: [B, (V, h) => [...ring(0, 0, B, XH, V, h), rect(B - V, -ASC, B, XH)]],
  e: [
    B,
    (V, h) => {
      const o = ring(0, 0, B, XH, V, h);
      return [
        ...keep(o, [1, XH / 2, 1]),
        ...keep(o, [1, XH / 2, -1], [0, 82, 1]),
        rect(V * 0.5, XH / 2 - h / 2, B, XH / 2 + h / 2),
      ];
    },
  ],
  f: [
    78,
    (V, h) => [
      rect(10, 26, 10 + V, XH),
      ...keep(ring(10, -ASC, 110, 88, V, h), [1, 26, 1], [0, 78, 1]),
      rect(0, 0, 74, h),
    ],
  ],
  g: [
    B,
    (V, h) => [
      ...ring(0, 0, B, XH, V, h),
      rect(B - V, 0, B, 92),
      ...keep(ring(0, 48, B, XH + DESC, V, h), [1, 92, -1], [0, 14, -1]),
    ],
  ],
  h: [B, (V, h) => [rect(0, -ASC, V, XH), ...keep(ring(0, 0, B, XH, V, h), [1, XH / 2, 1]), rect(B - V, XH / 2, B, XH)]],
  i: [30, (V) => [rect(15 - V / 2, 0, 15 + V / 2, XH)]],
  j: [46, (V, h) => [rect(31 - V / 2, 0, 31 + V / 2, XH + DESC), rect(0, XH + DESC - h, 31, XH + DESC)]],
  k: [100, (V) => [rect(0, -ASC, V, XH), diag(V * 0.7, 66, 100 - V * 1.1, 0, V * 1.1), diag(36, 44, 100 - V, XH, V)]],
  l: [30, (V) => [rect(15 - V / 2, -ASC, 15 + V / 2, XH)]],
  m: [
    184,
    (V, h) => [
      rect(0, 0, V, XH),
      ...keep(ring(0, 0, 92 + V / 2, XH, V, h), [1, XH / 2, 1]),
      ...keep(ring(92 - V / 2, 0, 184, XH, V, h), [1, XH / 2, 1]),
      rect(92 - V / 2, XH / 2, 92 + V / 2, XH),
      rect(184 - V, XH / 2, 184, XH),
    ],
  ],
  n: [B, (V, h) => [rect(0, 0, V, XH), ...keep(ring(0, 0, B, XH, V, h), [1, XH / 2, 1]), rect(B - V, XH / 2, B, XH)]],
  o: [B, (V, h) => ring(0, 0, B, XH, V, h)],
  p: [B, (V, h) => [rect(0, 0, V, XH + DESC), ...ring(0, 0, B, XH, V, h)]],
  q: [B, (V, h) => [...ring(0, 0, B, XH, V, h), rect(B - V, 0, B, XH + DESC)]],
  r: [84, (V, h) => [rect(0, 0, V, XH), ...keep(ring(0, 0, 108, XH + 10, V, h), [1, (XH + 10) / 2, 1], [0, 84, 1])]],
  s: [
    104,
    (V, h) => {
      const m = XH / 2;
      const up = ring(0, 0, 104, m + h / 2, V, h);
      const lo = ring(0, m - h / 2, 104, XH, V, h);
      return [
        ...keep(up, [0, 52, 1]),
        ...keep(up, [0, 52, -1], [0, 90, 1], [1, (m + h / 2) / 2, 1]),
        ...keep(lo, [0, 52, -1]),
        ...keep(lo, [0, 52, 1], [0, 14, -1], [1, (m - h / 2 + XH) / 2, -1]),
      ];
    },
  ],
  t: [80, (V, h) => [rect(12, -ASC * 0.8, 12 + V, 56), rect(0, 0, 76, h), ...keep(ring(12, 12, 112, XH, V, h), [1, 56, -1], [0, 80, 1])]],
  u: [B, (V, h) => [...keep(ring(0, 0, B, XH, V, h), [1, XH / 2, -1]), rect(0, 0, V, XH / 2), rect(B - V, 0, B, XH)]],
  v: [106, (V) => [diag(0, 0, 53 - V / 2, XH, V), diag(106 - V, 0, 53 - V / 2, XH, V)]],
  w: [
    176,
    (V) => [
      diag(0, 0, 44 - V / 2, XH, V),
      diag(88 - V / 2, 0, 44 - V / 2, XH, V),
      diag(88 - V / 2, 0, 132 - V / 2, XH, V),
      diag(176 - V, 0, 132 - V / 2, XH, V),
    ],
  ],
  x: [106, (V) => [diag(0, 0, 106 - V, XH, V), diag(106 - V, 0, 0, XH, V)]],
  y: [
    106,
    (V) => {
      const foot = 53 - V / 2;
      const slope = (foot - (106 - V)) / XH;
      return [diag(0, 0, foot, XH, V), diag(106 - V, 0, 106 - V + slope * (XH + DESC), XH + DESC, V)];
    },
  ],
  z: [98, (V, h) => [rect(0, 0, 98, h), rect(0, XH - h, 98, XH), diag(98 - V * 1.15, h * 0.5, 0, XH - h * 0.5, V * 1.15)]],
  // Added digit 1 for H1T MICRO brand wordmark
  "1": [52, (V) => [rect(26 - V / 2, 0, 26 + V / 2, XH), diag(8, 26, 26, 0, V)]],
  "-": [60, (_V, h) => [rect(0, XH / 2 - h / 2, 60, XH / 2 + h / 2)]],
  ".": [30, (V) => [rect(15 - V / 2, XH - V, 15 + V / 2, XH)]],
  " ": [46, () => []],
};

export const strokes = (k: number): { V: number; h: number } => {
  const w = clamp(Number.isFinite(k) ? k : 1, 0.4, 1.6);
  return { V: 30 * w, h: 19 * (0.55 + 0.45 * w) };
};

const n1 = (v: number): string => String(Math.round(v * 10) / 10);

export const glyphPath = (ch: string, k: number, dx: number = 0): string => {
  const g = GLYPHS[ch];
  if (!g) return "";
  const { V, h } = strokes(k);
  return g[1](V, h)
    .map((poly) => "M" + poly.map((p) => n1(p[0] + dx) + " " + n1(p[1])).join("L") + "Z")
    .join("");
};

export const supported = (word: string): boolean => word.length > 0 && [...word].every((c) => c in GLYPHS);

export type Placed = { ch: string; x: number; w: number };

export const layoutWord = (
  word: string,
  tracking: number = 10,
): { letters: Placed[]; width: number; top: number; bottom: number } => {
  const letters: Placed[] = [];
  let x = 0;
  for (const ch of word) {
    const g = GLYPHS[ch];
    if (!g) continue;
    letters.push({ ch, x, w: g[0] });
    x += g[0] + tracking;
  }
  const width = letters.length ? x - tracking : 0;
  const top = /[bdfhklt1]/.test(word) ? -ASC : 0;
  const bottom = /[gjpqy]/.test(word) ? XH + DESC : XH;
  return { letters, width, top, bottom };
};

export const lensWeights = (
  centres: number[],
  px: number | null,
  base: number,
  boost: number,
  radius: number,
): number[] =>
  centres.map((c) => {
    if (px === null || !Number.isFinite(px) || !(radius > 0)) return base;
    const d = (c - px) / radius;
    return base + boost * Math.exp(-d * d);
  });

export const approach = (from: number, to: number, k: number, dt: number): number =>
  to + (from - to) * Math.pow(1 - clamp(k, 0, 1), clamp(dt, 0, 0.1) * 60);

export type Tile = { cx: number; cy: number; r: number; sx: number; sw: number };
export const TILES: Tile[] = [
  { cx: 0.385, cy: 0.5, r: 0.415, sx: 0.755, sw: 0.245 },
  { cx: 0.615, cy: 0.5, r: 0.415, sx: 0, sw: 0.245 },
  { cx: 0.5, cy: 1.04, r: 0.5, sx: 0.5, sw: 0 },
  { cx: 1, cy: 0, r: 0.6, sx: 0, sw: 0.3 },
];

export const nextTile = (i: number, n: number = TILES.length): number => {
  if (!(n > 0)) return 0;
  const v = Number.isFinite(i) ? Math.trunc(i) : 0;
  return (((v + 1) % n) + n) % n;
};

export const leanTile = (t: Tile, px: number, py: number, amount: number = 0.035): Tile => ({
  ...t,
  cx: t.cx + amount * clamp(Number.isFinite(px) ? px : 0, -1, 1),
  cy: t.cy + amount * 1.6 * clamp(Number.isFinite(py) ? py : 0, -1, 1),
});

export type KilnLink = { label: string; href: string };

export type KilnWordmarkFooterProps = {
  brand?: string;
  wordmark?: string;
  motto?: string[];
  address?: string[];
  navigationTitle?: string;
  navigation?: KilnLink[][];
  followTitle?: string;
  socials?: KilnLink[][];
  year?: number;
  registry?: string;
  legal?: KilnLink[];
  surface?: string;
  deep?: string;
  ink?: string;
  paper?: string;
  fontSans?: string;
  weight?: number;
  lens?: boolean;
  defaultTile?: number;
  onTileChange?: (index: number) => void;
  className?: string;
};

const DEFAULT_NAV: KilnLink[][] = [
  [
    { label: "Tính năng cốt lõi", href: "#features" },
    { label: "Đối tượng phù hợp", href: "#audiences" },
    { label: "Quy trình 3 bước", href: "#how-it-works" },
  ],
  [
    { label: "Minh bạch số liệu", href: "#transparency" },
    { label: "Đăng ký tài khoản", href: "/signup" },
    { label: "Đăng nhập", href: "/signin" },
  ],
];

const DEFAULT_SOCIALS: KilnLink[][] = [
  [
    { label: "Tạo tài khoản mới", href: "/signup" },
    { label: "Đăng nhập hệ thống", href: "/signin" },
  ],
  [
    { label: "Điều khoản dịch vụ", href: "/terms" },
    { label: "Chính sách bảo mật", href: "/privacy" },
  ],
];

const DEFAULT_LEGAL: KilnLink[] = [
  { label: "Điều khoản dịch vụ", href: "/terms" },
  { label: "Chính sách bảo mật", href: "/privacy" },
  { label: "Bản quyền & Dữ liệu", href: "/settings/data-sources" },
];

const CSS =
  ".kwf{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;color:var(--kwf-ink);background:var(--kwf-deep);font-family:var(--kwf-sans);-webkit-font-smoothing:antialiased;text-transform:uppercase}" +
  ":where(.kwf) a{color:inherit;text-decoration:none}" +
  ":where(.kwf) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}" +
  ":where(.kwf) p,:where(.kwf) ul,:where(.kwf) h2,:where(.kwf) h3{margin:0;padding:0}" +
  ":where(.kwf) ul{list-style:none}" +
  ".kwf .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
  ".kwf-tile{position:absolute;inset:0;width:100%;height:100%;max-width:none;z-index:-1;display:block;pointer-events:none;opacity:0.35}" +
  ".kwf-in-wrap{position:relative;padding:2.5cqw 3cqw 2cqw}" +
  ".kwf-top{display:flex;justify-content:space-between;align-items:flex-start;gap:2cqw;min-height:16cqw}" +
  ".kwf-motto{font-size:clamp(22px,3.5cqw,54px);line-height:.96;font-weight:900;font-style:italic;letter-spacing:-.015em}" +
  ".kwf-motto span{display:block}" +
  ".kwf-key{position:relative;flex:none;width:clamp(36px,3.8cqw,52px);height:clamp(60px,7cqw,96px);border-radius:clamp(8px,1cqw,16px);background:var(--kwf-ink);color:var(--kwf-paper);overflow:hidden;display:grid;place-items:center;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-radius .35s}" +
  ".kwf-key:hover{transform:translateY(-3px);border-radius:999px}" +
  ".kwf-key:active{transform:translateY(1px) scale(.96)}" +
  ".kwf-key svg{width:56%;height:auto;max-width:none;display:block;overflow:visible}" +
  ".kwf-key:hover svg,.kwf-key:focus-visible svg{animation:kwf-shoot .7s cubic-bezier(.6,0,.2,1)}" +
  ".kwf-key:focus-visible,.kwf-link:focus-visible{outline:2px solid var(--kwf-ink);outline-offset:3px}" +
  "@keyframes kwf-shoot{0%{transform:none}45%{transform:translateY(-160%)}46%{transform:translateY(160%)}100%{transform:none}}" +
  ".kwf-row{display:grid;grid-template-columns:30fr 46fr 24fr;gap:2cqw;font-size:clamp(11px,1.2cqw,15px);line-height:1.25;letter-spacing:-.005em}" +
  ".kwf-col h3{font-size:inherit;font-weight:800;letter-spacing:.05em;margin-bottom:1.4em;color:var(--kwf-surface)}" +
  ".kwf-cols{display:flex;gap:1.5em 2em;flex-wrap:wrap}" +
  ".kwf-cols ul{display:flex;flex-direction:column;gap:.6em}" +
  ".kwf-addr p{white-space:pre-line;line-height:1.4}" +
  ".kwf-link{position:relative;display:inline-block;padding:0 .14em;margin:0 -.14em;transition:color .25s;min-height:44px;display:inline-flex;align-items:center}" +
  ".kwf-link::before{content:'';position:absolute;inset:.4em 0;background:var(--kwf-surface);transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.7,0,.2,1);z-index:-1;border-radius:3px}" +
  ".kwf-link:hover,.kwf-link:focus-visible{color:#ffffff}" +
  ".kwf-link:hover::before,.kwf-link:focus-visible::before{transform:scaleX(1);transform-origin:left}" +
  ".kwf-word{display:block;width:100%;height:auto;max-width:none;margin-top:2cqw;overflow:hidden;touch-action:pan-y;cursor:default}" +
  ".kwf-word text{text-transform:none}" +
  ".kwf-l{transform:translateY(118%);transform-box:fill-box;transition:transform 1s cubic-bezier(.16,.9,.18,1);transition-delay:var(--kwf-d,0ms)}" +
  ".kwf-l path{transform-box:fill-box;transform-origin:50% 100%;cursor:pointer}" +
  ".kwf-shown .kwf-l{transform:none}" +
  ".kwf-fade{opacity:0;transform:translateY(10px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--kwf-d,0ms)}" +
  ".kwf-shown .kwf-fade{opacity:1;transform:none}" +
  ".kwf-bar{margin-top:2cqw;border:1px solid rgba(243,241,236,0.18);border-radius:clamp(8px,1.05cqw,16px);padding:.6cqw 1.4cqw;display:flex;align-items:center;gap:1.5cqw;font-size:clamp(10px,1.05cqw,13px)}" +
  ".kwf-copy{font-size:clamp(13px,1.4cqw,18px);font-weight:700;letter-spacing:-.01em;white-space:nowrap}" +
  ".kwf-reg{flex:1;min-width:0;opacity:0.8}" +
  ".kwf-legal{display:flex;gap:.75em;white-space:nowrap}" +
  "@container (max-width: 768px){" +
  ".kwf-in-wrap{padding:24px 20px 20px}" +
  ".kwf-top{min-height:32cqw}" +
  ".kwf-motto{font-size:clamp(24px,7.5cqw,38px)}" +
  ".kwf-row{grid-template-columns:1fr;gap:24px;font-size:13px}" +
  ".kwf-col h3{margin-bottom:.8em}" +
  ".kwf-cols{gap:1.2em 2em}" +
  ".kwf-word{margin-top:28px}" +
  ".kwf-bar{flex-wrap:wrap;gap:8px 16px;padding:12px 16px;margin-top:20px;font-size:11px}" +
  ".kwf-reg{flex-basis:100%;order:3}" +
  "}" +
  "@media (prefers-reduced-motion: reduce){" +
  ".kwf-l,.kwf-fade{transform:none;opacity:1;transition:none}" +
  ".kwf-key,.kwf-link,.kwf-link::before{transition:none}" +
  ".kwf-key:hover svg,.kwf-key:focus-visible svg{animation:none}" +
  "}";

const BOOST = 0.42;

function LinkItem({ link }: { link: KilnLink }) {
  const { label, href } = link;
  return (
    <Link className="kwf-link" href={href}>
      {label}
    </Link>
  );
}

export function KilnWordmarkFooter({
  brand = "H1T MICRO",
  wordmark = "h1t micro",
  motto = ["22 VI CHẤT", "CHUẨN KHOA HỌC"],
  address = [
    "Hệ thống theo dõi dinh dưỡng và vi chất",
    "↳ Dữ liệu Viện Dinh Dưỡng & USDA",
    "Hà Nội — Việt Nam",
  ],
  navigationTitle = "Tính năng",
  navigation = DEFAULT_NAV,
  followTitle = "Tài khoản & Kết nối",
  socials = DEFAULT_SOCIALS,
  year = 2026,
  registry = "Hệ thống chuẩn hóa 22 vi chất và kiểm soát năng lượng theo khuyến nghị RNI/RDA",
  legal = DEFAULT_LEGAL,
  surface = "#1238D6", // Cobalt Blue
  deep = "#111317", // Ink Black
  ink = "#F3F1EC", // Paper
  paper = "#111317",
  fontSans = "var(--font-sans)",
  weight = 0.95,
  lens = true,
  defaultTile = 0,
  onTileChange,
  className = "",
}: KilnWordmarkFooterProps) {
  const word = (wordmark ?? brand).toLowerCase();
  const drawn = supported(word);
  const lay = useMemo(() => layoutWord(drawn ? word : ""), [word, drawn]);
  const centres = useMemo(() => lay.letters.map((l) => l.x + l.w / 2), [lay]);
  const base = clamp(Number.isFinite(weight) ? weight : 1, 0.5, 1.4);

  const rootRef = useRef<HTMLElement>(null);
  const wordRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const discRef = useRef<SVGEllipseElement>(null);
  const slabRef = useRef<SVGRectElement>(null);

  const [size, setSize] = useState({ w: 1200, h: 620 });
  const [shown, setShown] = useState(false);
  const [tile, setTile] = useState(() => ((Math.trunc(defaultTile) % TILES.length) + TILES.length) % TILES.length || 0);

  const anim = useRef({
    k: [] as number[],
    kT: [] as number[],
    cur: { ...TILES[tile] } as Tile,
    target: { ...TILES[tile] } as Tile,
    lean: [0, 0] as [number, number],
    size: { w: 1200, h: 620 },
    reduced: false,
    raf: 0,
    last: 0,
  });

  if (anim.current.k.length !== lay.letters.length) {
    anim.current.k = lay.letters.map(() => base);
    anim.current.kT = lay.letters.map(() => base);
  }

  const paint = useCallback(() => {
    const a = anim.current;
    const { w, h } = a.size;
    const d = discRef.current;
    if (d) {
      d.setAttribute("cx", n1(a.cur.cx * w));
      d.setAttribute("cy", n1(a.cur.cy * h));
      d.setAttribute("rx", n1(a.cur.r * w));
      d.setAttribute("ry", n1(a.cur.r * w));
    }
    const s = slabRef.current;
    if (s) {
      s.setAttribute("x", n1(a.cur.sx * w));
      s.setAttribute("width", n1(Math.max(0, a.cur.sw * w)));
    }
    lay.letters.forEach((l, i) => {
      const p = pathRefs.current[i];
      if (p) p.setAttribute("d", glyphPath(l.ch, a.k[i], l.x));
    });
  }, [lay]);

  const kick = useCallback(() => {
    const a = anim.current;
    if (a.raf) return;
    a.last = 0;
    const step = (now: number) => {
      const dt = a.last ? (now - a.last) / 1000 : 1 / 60;
      a.last = now;
      const snap = a.reduced;
      let busy = false;
      const goal = leanTile(a.target, a.lean[0], a.lean[1]);
      for (const key of ["cx", "cy", "r", "sx", "sw"] as const) {
        const next = snap ? goal[key] : approach(a.cur[key], goal[key], 0.075, dt);
        a.cur[key] = Math.abs(next - goal[key]) < 1e-4 ? goal[key] : next;
        if (a.cur[key] !== goal[key]) busy = true;
      }
      for (let i = 0; i < a.k.length; i++) {
        const next = snap ? a.kT[i] : approach(a.k[i], a.kT[i], 0.16, dt);
        a.k[i] = Math.abs(next - a.kT[i]) < 1e-3 ? a.kT[i] : next;
        if (a.k[i] !== a.kT[i]) busy = true;
      }
      paint();
      a.raf = busy ? requestAnimationFrame(step) : 0;
    };
    a.raf = requestAnimationFrame(step);
  }, [paint]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const a = anim.current;
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    a.reduced = !!mq?.matches;
    const onMq = () => {
      a.reduced = !!mq?.matches;
    };
    mq?.addEventListener("change", onMq);

    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(1, Math.round(entry.contentRect.width));
      const h = Math.max(1, Math.round(entry.contentRect.height));
      a.size = { w, h };
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setShown(true);
            io?.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      io.observe(el);
    } else {
      setShown(true);
    }

    return () => {
      ro.disconnect();
      io?.disconnect();
      mq?.removeEventListener("change", onMq);
      cancelAnimationFrame(a.raf);
      a.raf = 0;
    };
  }, []);

  useLayoutEffect(() => {
    paint();
  }, [size, paint]);

  useEffect(() => {
    const a = anim.current;
    a.kT = a.kT.map(() => base);
    kick();
  }, [base, kick]);

  const turnTile = () => {
    const i = nextTile(tile);
    setTile(i);
    anim.current.target = { ...TILES[i] };
    kick();
    onTileChange?.(i);
  };

  const onRootMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    anim.current.lean = [((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1];
    kick();
  };
  const onRootLeave = () => {
    anim.current.lean = [0, 0];
    kick();
  };
  const onRootClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as Element).closest("a,button,.kwf-word")) return;
    if (window.getSelection?.()?.toString()) return;
    turnTile();
  };

  const vbH = lay.bottom - lay.top;
  const onWordMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!lens || !lay.width) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * lay.width;
    anim.current.kT = lensWeights(centres, x, base, BOOST, 150);
    kick();
  };
  const onWordLeave = () => {
    anim.current.kT = lensWeights(centres, null, base, BOOST, 150);
    kick();
  };
  const stamp = (i: number) => {
    const a = anim.current;
    a.k[i] = Math.min(1.6, a.k[i] + 0.55);
    kick();
    const p = pathRefs.current[i];
    if (p && !a.reduced && typeof p.animate === "function") {
      p.animate(
        [
          { transform: "none" },
          { transform: "scale(1.05, 0.8)", offset: 0.25 },
          { transform: "scale(0.98, 1.05)", offset: 0.6 },
          { transform: "none" },
        ],
        { duration: 620, easing: "cubic-bezier(.3,.7,.3,1)" },
      );
    }
  };

  const backToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: anim.current.reduced ? "auto" : "smooth" });
    }
  };

  const t = anim.current.cur;
  const vars = {
    "--kwf-surface": surface,
    "--kwf-deep": deep,
    "--kwf-ink": ink,
    "--kwf-paper": paper,
    "--kwf-sans": fontSans,
  } as React.CSSProperties;

  let delay = 0;
  const fade = () => ({ "--kwf-d": (delay += 45) + "ms" }) as React.CSSProperties;

  return (
    <footer
      ref={rootRef}
      className={"kwf" + (shown ? " kwf-shown" : "") + (className ? " " + className : "")}
      style={vars}
      onPointerMove={onRootMove}
      onPointerLeave={onRootLeave}
      onClick={onRootClick}
    >
      <style>{CSS}</style>

      <svg className="kwf-tile" viewBox={"0 0 " + size.w + " " + size.h} preserveAspectRatio="none" aria-hidden="true">
        <ellipse ref={discRef} cx={n1(t.cx * size.w)} cy={n1(t.cy * size.h)} rx={n1(t.r * size.w)} ry={n1(t.r * size.w)} fill={surface} />
        <rect ref={slabRef} x={n1(t.sx * size.w)} y={0} width={n1(Math.max(0, t.sw * size.w))} height={size.h} fill={surface} />
      </svg>

      <div className="kwf-in-wrap">
        <div className="kwf-top">
          <h2 className="kwf-motto kwf-fade font-display" style={fade()}>
            {motto.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </h2>
          <button type="button" className="kwf-key kwf-fade" style={fade()} aria-label="Lên đầu trang" onClick={backToTop}>
            <svg viewBox="0 0 24 34" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 33V2M2 12 12 2l10 10" />
            </svg>
          </button>
        </div>

        <div className="kwf-row">
          <div className="kwf-col kwf-addr kwf-fade" style={fade()}>
            <h3>{brand}</h3>
            {address.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <nav className="kwf-col kwf-nav kwf-fade" style={fade()} aria-label={navigationTitle}>
            <h3>{navigationTitle}</h3>
            <div className="kwf-cols">
              {navigation.map((col, i) => (
                <ul key={i}>
                  {col.map((link) => (
                    <li key={link.label}>
                      <LinkItem link={link} />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </nav>
          <div className="kwf-col kwf-fade" style={fade()}>
            <h3>{followTitle}</h3>
            <div className="kwf-cols">
              {socials.map((col, i) => (
                <ul key={i}>
                  {col.map((link) => (
                    <li key={link.label}>
                      <LinkItem link={link} />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>

        <p className="sr-only">{word}</p>
        {drawn ? (
          <svg
            ref={wordRef}
            className="kwf-word"
            viewBox={"0 " + lay.top + " " + lay.width + " " + vbH}
            aria-hidden="true"
            onPointerMove={onWordMove}
            onPointerLeave={onWordLeave}
          >
            {lay.letters.map((l, i) => (
              <g key={i + l.ch} className="kwf-l" style={{ "--kwf-d": 140 + i * 70 + "ms" } as React.CSSProperties}>
                <path
                  ref={(el) => {
                    pathRefs.current[i] = el;
                  }}
                  d={glyphPath(l.ch, anim.current.k[i] ?? base, l.x)}
                  fill={ink}
                  onClick={() => stamp(i)}
                />
              </g>
            ))}
          </svg>
        ) : (
          <svg className="kwf-word" viewBox="0 0 1000 200" aria-hidden="true">
            <text
              x="0"
              y="168"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
              fontSize="200"
              fontWeight="900"
              fill={ink}
              style={{ fontFamily: fontSans }}
            >
              {word}
            </text>
          </svg>
        )}

        <div className="kwf-bar kwf-fade" style={fade()}>
          <p className="kwf-copy">
            &copy;{year} {brand}
          </p>
          <p className="kwf-reg">{registry}</p>
          <p className="kwf-legal">
            {legal.map((link, i) => (
              <React.Fragment key={link.label}>
                {i > 0 && <span aria-hidden="true">&mdash;</span>}
                <LinkItem link={link} />
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default KilnWordmarkFooter;
