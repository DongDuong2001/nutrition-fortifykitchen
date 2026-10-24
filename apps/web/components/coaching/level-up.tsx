"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LevelBadge } from "@/components/profile/level-badge";
import { MAX_LEVEL } from "@/lib/coaching-link";
import { cueSound } from "@/lib/cue";
import { haptic } from "@/lib/haptics";
import { levelUpAnnouncement, levelUpReward, levelUpSubtitle, type LevelStep } from "@/lib/level-copy";
import s from "./level-up.module.css";

/**
 * "Lên Level n!" (design/levelup LevelUp.dc.html, Hao 23/10): a lazy chunk, mounted by LevelUpHost only when it will play. The
 * timeline and its overrides (cross-fades, Nova, reduced motion) are in level-up.module.css; this part runs the clock, the sweep
 * from the header and back (Web Animations, transform and opacity only) and the haptics. A tap during the intro skips to the
 * waiting state; ✕, Esc or "Xem chỉ số mới" close it (the latter then opens the explainer).
 */

/** The hatch, the module's --h. */
const H = 2400;
/** The metamorphosis starts at 1.0 s; its three cross-fades start 0.35, 0.8 and 1.15 s into it (level-up.module.css alt-old). */
const CROSS_FADES = [1350, 1800, 2150];
const TICK_MS = 55;
const LAND_MS = 450;

/** The board's 390 × 844 sweep: header → right edge → bottom → left → centre, two cubic segments. */
const PATH = [
  [420, 70],
  [430, 560],
  [230, 690],
  [40, 810],
  [-40, 380],
] as const;

type Point = [number, number];

const rnd = (i: number) => {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/** cubic-bezier(x1, y1, x2, y2) as a function of time (the CSS timing function), by bisection: enough for 24 samples. */
function ease(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

const bezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const u = 1 - t;
  return [0, 1].map((k) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]) as Point;
};

const centre = (el: Element | null): Point | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};

const at = ([x, y]: Point, scale: number) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`;

/** The sweep's keyframes: a wind-up at the header (to 0.78), then along the curve to the centre, growing to 1.7. */
function sweep(from: Point, to: Point, column: DOMRect): Keyframe[] {
  const map = ([x, y]: readonly [number, number]): Point => [column.left + (x / 390) * column.width, (y / 844) * window.innerHeight];
  const [c1, c2, mid, c3, c4] = PATH.map(map);
  const eased = ease(0.45, 0.05, 0.25, 1);
  const frames: Keyframe[] = [
    { offset: 0, transform: at(from, 1) },
    { offset: 0.16, transform: at(from, 0.78) },
  ];
  const n = 24;
  for (let k = 1; k <= n; k++) {
    const p = eased(k / n) * 2;
    const point = p <= 1 ? bezier(from, c1, c2, mid, p) : bezier(mid, c3, c4, to, p - 1);
    frames.push({ offset: 0.16 + (0.84 * k) / n, transform: at(point, 0.78 + 0.92 * (k / n)) });
  }
  return frames;
}

type Phase = "intro" | "card" | "land";

export function LevelUp({ step, coachName, onClose }: { step: LevelStep; coachName: string | null; onClose: (explain: boolean) => void }) {
  const { from, to } = step;
  const reward = levelUpReward(step);
  const gold = to >= 4;
  const top = to === MAX_LEVEL;
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // A phone with 4 cores or fewer: half the particles, no backdrop blur
  const [lite] = useState(() => (navigator.hardwareConcurrency ?? 8) <= 4);
  const [phase, setPhase] = useState<Phase>(reduced ? "card" : "intro");
  const [skipped, setSkipped] = useState(reduced);
  const [tick, setTick] = useState(0);
  const [said, setSaid] = useState("");
  const timers = useRef<number[]>([]);
  const flyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const explainRef = useRef(false);
  // ✕ takes the focus when it opens; its ring shows only once a key is pressed (keyboard focus), not on a phone that opened it
  const [mountFocus, setMountFocus] = useState(true);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // The clock: haptics, the count, the card. A polite announcement, and the focus on ✕
  useEffect(() => {
    later(() => setSaid(levelUpAnnouncement(step, coachName)), 150);
    closeRef.current?.focus({ preventScroll: true });
    if (reduced) return clear;
    for (const ms of CROSS_FADES) later(() => haptic("tick"), ms);
    later(() => haptic("levelUp"), H - 100);
    const steps = reward.countTo - reward.countFrom;
    for (let i = 1; i <= steps; i++) later(() => setTick(i), H + 650 + i * TICK_MS);
    later(() => setPhase("card"), H + 100);
    return clear;
    // Once per mount: the step does not change while it plays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The sweep from the header badge (or the top centre) to the centre, with a ghost trail
  useEffect(() => {
    if (reduced) return;
    const target = centre(anchorRef.current);
    const column = columnRef.current?.getBoundingClientRect();
    if (!target || !column) return;
    const start = centre(document.querySelector("[data-header-level]")) ?? [column.left + column.width / 2, 30];
    const frames = sweep(start, target, column);
    const anims = flyRefs.current.flatMap((el, i) => {
      if (!el) return [];
      const delay = i * 50;
      const base = Number(getComputedStyle(el).opacity);
      return [
        el.animate(frames, { duration: 1000, delay, fill: "both" }),
        el.animate([{ opacity: base }, { opacity: 0 }], { duration: 120, delay: 980 + delay, fill: "forwards" }),
      ];
    });
    return () => anims.forEach((a) => a.cancel());
  }, [reduced]);

  const skip = () => {
    if (phase !== "intro") return;
    clear();
    setSkipped(true);
    setPhase("card");
  };

  const land = (explain: boolean) => {
    if (phase === "land") return;
    clear();
    explainRef.current = explain;
    setPhase("land");
  };

  // Closing: the badge flies back into the header, then the host unmounts this and the header pulses twice
  useEffect(() => {
    if (phase !== "land") return;
    const done = () => {
      // The badge has landed, after the person's own ✕, Esc or "Xem chỉ số mới" (D-A11Y-04): the full chime, sound only (the hatch vibrated)
      cueSound("full");
      // Back to where it came from; "Xem chỉ số mới" opens the explainer, which takes the focus itself
      if (!explainRef.current) document.querySelector<HTMLElement>("[data-header-level]")?.focus({ preventScroll: true });
      onClose(explainRef.current);
    };
    const from = centre(anchorRef.current);
    const to = centre(document.querySelector("[data-header-level]"));
    if (reduced || !from || !to || !landRef.current) {
      const t = window.setTimeout(done, reduced ? 200 : 0);
      return () => window.clearTimeout(t);
    }
    const anim = landRef.current.animate([{ transform: at(from, 1) }, { transform: at(to, 0.32) }], {
      duration: LAND_MS,
      easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      fill: "forwards",
    });
    const t = window.setTimeout(done, LAND_MS + 30);
    return () => {
      anim.cancel();
      window.clearTimeout(t);
    };
    // onClose is the host's, stable for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduced]);

  // Esc closes; Tab stays on the two buttons (a modal moment: the page under it is not reachable)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setMountFocus(false);
      if (e.key === "Escape") land(false);
      if (e.key !== "Tab") return;
      const buttons = Array.from(columnRef.current?.querySelectorAll("button") ?? []);
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const intro = phase === "intro" && !skipped;
  const leaving = phase === "land";
  const count = skipped || reduced ? reward.countTo : Math.min(reward.countTo, reward.countFrom + tick);
  const half = (n: number) => (lite ? Math.ceil(n / 2) : n);
  const circle = (d: number, extra: CSSProperties = {}): CSSProperties => ({ left: -d / 2, top: -d / 2, width: d, height: d, ...extra });
  const vars = (v: Record<string, string | number>) => v as CSSProperties;
  const tierCol = gold ? "var(--color-gold)" : "var(--color-sky)";

  return (
    <div
      className={`${s.stage} ${gold ? s.gold : ""} ${top ? s.top : ""} ${lite ? s.lite : ""} ${skipped && !reduced ? s.now : ""} ${leaving ? s.leave : ""} z-tour font-sans`}
      style={vars({ "--cy": "min(300px, 36dvh)" })}
      data-level-up={to}
    >
      <div aria-hidden="true" className={s.scrim} onClick={skip} />
      <p className="sr-only" aria-live="polite">
        {said}
      </p>

      <div ref={columnRef} role="dialog" aria-modal="true" aria-labelledby="level-up-title" className={s.column}>
        {intro && (
          <>
            <div aria-hidden="true" className={s.vig} />
            <div aria-hidden="true" className={s.anchor}>
              <div className={s.chargeGlow} />
              {Array.from({ length: half(16) }, (_, i) => {
                const a = (i / half(16)) * Math.PI * 2 + rnd(i) * 0.4;
                const r = 150 + rnd(i + 2) * 50;
                const d = 4 + Math.round(rnd(i + 4) * 3);
                return (
                  <span
                    key={i}
                    className={s.implode}
                    style={vars({
                      width: d,
                      height: d,
                      background: i % 3 === 0 ? tierCol : "var(--color-on-dark)",
                      boxShadow: `0 0 8px ${tierCol}`,
                      "--x": `${Math.round(Math.cos(a) * r)}px`,
                      "--y": `${Math.round(Math.sin(a) * r)}px`,
                      animationDelay: `${(1 + i * 0.075 * (16 / half(16))).toFixed(2)}s`,
                    })}
                  />
                );
              })}
              <div className={s.charge}>
                <div className={s.altOld}>
                  <LevelBadge level={from} size="hero" onDark />
                </div>
                <div className={s.altNew}>
                  <LevelBadge level={to} size="hero" onDark />
                </div>
              </div>
            </div>
            <p aria-hidden="true" className={s.hint}>
              Đang lên Level…
            </p>
          </>
        )}

        <div className={`absolute inset-0 ${leaving ? s.gone : ""} ${intro ? s.shake : ""}`} aria-hidden="true">
          <div ref={anchorRef} className={s.anchor}>
            <div className={`${s.circle} ${s.glow}`} style={circle(240 + to * 30)} />
            {to >= 3 && <div className={`${s.circle} ${s.rays}`} style={circle(to === MAX_LEVEL ? 420 : 350)} />}
            {to >= 2 && <div className={`${s.circle} ${s.ring1}`} style={circle(196)} />}
            {to >= 3 && <div className={`${s.circle} ${s.seg}`} style={circle(256)} />}
            {gold && <div className={`${s.circle} ${s.goldRing}`} style={circle(310)} />}
            {top &&
              Array.from({ length: 7 }, (_, i) => {
                const a = (i / 7) * Math.PI * 2 + 0.5;
                const r = 138 + (i % 2) * 34;
                const d = 8 + (i % 3) * 3;
                return (
                  <span
                    key={i}
                    className={s.star}
                    style={{
                      left: Math.round(Math.cos(a) * r - d / 2),
                      top: Math.round(Math.sin(a) * r - d / 2),
                      width: d,
                      height: d,
                      background: i % 2 ? "var(--color-gold-light)" : "var(--color-gold)",
                      animationDelay: `calc(var(--h) + ${(0.3 + i * 0.12).toFixed(2)}s)`,
                    }}
                  />
                );
              })}
            <div className={`${s.circle} ${s.shock}`} style={circle(180)} />
            <div className={`${s.circle} ${s.shock2}`} style={circle(180)} />
            <div className={`${s.circle} ${s.plate}`} style={circle(150 + to * 10, { background: `rgb(255 255 255 / ${(0.07 + to * 0.015).toFixed(3)})` })} />
            <div className={`${s.circle} ${s.glint}`} style={circle(156 + to * 10)} />
            <div className={`${s.circle} ${s.nova}`} />
            {Array.from({ length: half(10) }, (_, i) => {
              const a = (i / half(10)) * Math.PI * 2 + 0.3;
              const r = 130 + (i % 3) * 24;
              const d = 8 + (i % 3) * 3;
              const cols = ["var(--color-on-dark)", "var(--color-sky)", gold ? "var(--color-gold)" : "var(--color-on-dark)"];
              return (
                <span
                  key={i}
                  className={s.spark}
                  style={vars({ width: d, height: d, background: cols[i % 3], "--x": `${Math.round(Math.cos(a) * r)}px`, "--y": `${Math.round(Math.sin(a) * r)}px` })}
                />
              );
            })}
            {Array.from({ length: half(26) }, (_, i) => {
              const a = -Math.PI / 2 + (rnd(i + 1) - 0.5) * Math.PI * 1.5;
              const d = 130 + rnd(i + 7) * 120;
              const cols = ["var(--color-sky)", "var(--color-cobalt)", "var(--color-on-dark)", gold ? "var(--color-gold)" : "var(--color-sys-mint)", "var(--color-on-dark)"];
              return (
                <span
                  key={i}
                  className={s.confetti}
                  style={vars({
                    width: 5 + Math.round(rnd(i + 5) * 3),
                    height: 11 + Math.round(rnd(i + 9) * 8),
                    background: cols[i % 5],
                    "--x": `${Math.round(Math.cos(a) * d)}px`,
                    "--y": `${Math.round(Math.sin(a) * d - 30)}px`,
                    "--r": `${Math.round((rnd(i + 3) - 0.5) * 1080)}deg`,
                    animationDelay: `calc(var(--h) + ${((i % 5) * 0.02).toFixed(2)}s)`,
                  })}
                />
              );
            })}
            <div className={s.badge}>
              <div className={s.pop}>
                <div className={s.stamp}>
                  <LevelBadge level={to} size="hero" onDark shine pipsFrom={from} />
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className={s.flash} />
        </div>

        <div className={`${s.card} ${leaving ? s.gone : ""}`}>
          <h2 id="level-up-title" className={`${s.title} m-0 font-display text-[2.75rem] font-black uppercase italic leading-none tracking-display`}>
            Lên Level <span className={s.titleNum}>{to}</span>!
          </h2>
          <p className={`${s.d2} m-0 text-callout leading-snug text-muted-subtitle`}>{levelUpSubtitle(step, coachName)}</p>
          {reward.chips.length > 0 && (
            <div className={`${s.d3} mt-2 flex flex-col items-center gap-2.5`}>
              {reward.top ? (
                <p className="m-0 text-cap font-bold text-gold">{reward.lead}</p>
              ) : (
                <p className="m-0 text-cap font-bold text-sky">
                  {reward.lead}{" "}
                  <span className="font-condensed text-body-lg font-extrabold tabular-nums">
                    {reward.countFrom} → {count}
                  </span>{" "}
                  {reward.tail}
                </p>
              )}
              <ul className="m-0 flex list-none flex-wrap justify-center gap-1.5 p-0">
                {reward.chips.map((name, i) => (
                  <li
                    key={name}
                    className={`${s.chip} inline-flex h-7 items-center whitespace-nowrap rounded-full bg-white/12 px-2.5 text-cap font-semibold shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.18)]`}
                    style={vars({ "--i": i })}
                  >
                    <span aria-hidden="true" className={`${s.plus} mr-1 font-extrabold`}>
                      +
                    </span>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`absolute inset-x-6 bottom-[calc(40px+env(safe-area-inset-bottom))] ${leaving ? s.gone : ""}`}>
          <button
            type="button"
            onClick={() => land(true)}
            className={`${s.d4} relative h-13 w-full cursor-pointer overflow-hidden rounded-full border-0 bg-on-dark text-body-lg font-bold text-ink`}
          >
            Xem chỉ số mới
            <span aria-hidden="true" className={s.btnShine} />
          </button>
        </div>
        {/* DESIGN.md D-SHT-05: Close on the leading side */}
        <button
          ref={closeRef}
          type="button"
          aria-label="Đóng"
          data-mount-focus={mountFocus || undefined}
          onBlur={() => setMountFocus(false)}
          onClick={() => land(false)}
          className={`${s.d4} ${leaving ? s.gone : ""} absolute left-2 top-[calc(8px+env(safe-area-inset-top))] data-mount-focus:outline-none inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-on-dark`}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {intro &&
        [3, 2, 1, 0].map((g) => (
          <span
            key={g}
            aria-hidden="true"
            ref={(el) => {
              flyRefs.current[g] = el;
            }}
            className={`${s.fly} ${g ? s[`ghost${g}`] : ""}`}
          >
            <LevelBadge level={from} size="fly" onDark />
          </span>
        ))}
      {leaving && !reduced && (
        <span ref={landRef} aria-hidden="true" className={s.fly}>
          <LevelBadge level={to} size="hero" />
        </span>
      )}
    </div>
  );
}
