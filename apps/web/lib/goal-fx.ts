import { fxPlan, type FxStep } from "./goal-moments";
import type { Moment } from "./goals";
import { sparks } from "./goal-sparks";

/**
 * feat/sound-goals §5: runs a moment's classes on the live Hôm nay. A class is added for one run and removed on `animationend`
 * (a timer takes it off if that event never comes), so a later re-render never finds it and nothing changes layout. Reduced motion
 * adds nothing but the label's fade. Never touches the share image: the selectors are the live column and hero (data-fx).
 */
export interface FxElement {
  classList: { add(c: string): void; remove(c: string): void };
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void };
  addEventListener(type: "animationend", fn: (e: { target: unknown }) => void): void;
  removeEventListener(type: "animationend", fn: (e: { target: unknown }) => void): void;
  /** Reading it restarts a class that was just taken off */
  readonly offsetWidth?: number;
}

/** The longest any goal animation runs (the ring, 700 ms + 80 ms) plus the stagger: the timer's margin. */
const SETTLE_MS = 1200;

export function playFx(el: FxElement, cls: string, delayMs = 0): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  if (delayMs > 0) el.style.setProperty("--m-goal-delay", `${delayMs}ms`);
  el.classList.add(cls);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const done = (e?: { target: unknown }) => {
    if (e && e.target !== el) return;
    el.classList.remove(cls);
    el.style.removeProperty("--m-goal-delay");
    el.removeEventListener("animationend", done);
    clearTimeout(timer);
  };
  el.addEventListener("animationend", done);
  timer = setTimeout(done, SETTLE_MS + delayMs);
}

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** The sheen's own delay in the CSS (--m-goal-delay default), so a staggered row starts after it as a single bar does. */
const SHEEN_DELAY_MS = 120;

function onScreen(el: Element, within: Element | null): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const box = within?.getBoundingClientRect();
  return !box || (r.top >= box.top - 1 && r.bottom <= box.bottom + 1);
}

function runStep(step: FxStep): void {
  if (step.stagger !== undefined) {
    const column = document.querySelector('aside[data-fx="column"]');
    const all = [...document.querySelectorAll<HTMLElement>(step.sel)].filter((el) => !step.visibleOnly || onScreen(el, column));
    all.slice(0, step.max ?? all.length).forEach((el, i) => playFx(el, step.cls, SHEEN_DELAY_MS + i * step.stagger!));
    return;
  }
  const el = document.querySelector<HTMLElement>(step.sel);
  if (el) playFx(el, step.cls);
}

/** Ten sparks out of the column counter into the layer beside the card, each stopping within the card ±8 px. */
export function spawnSparks(): void {
  const column = document.querySelector<HTMLElement>('aside[data-fx="column"]');
  const count = column?.querySelector<HTMLElement>('[data-fx="count"]');
  const layer = column?.parentElement?.querySelector<HTMLElement>('[data-fx="sparks"]');
  if (!column || !count || !layer) return;
  const card = column.getBoundingClientRect();
  const c = count.getBoundingClientRect();
  const originX = c.left + c.width / 2 - card.left;
  const originY = c.top + c.height / 2 - card.top;
  const colors = ["var(--color-cobalt)", "var(--color-sky)", "var(--color-level-gandu)", "var(--color-level-dat)"];
  const host = document.createElement("span");
  host.className = "m-goal-sparks";
  host.style.left = `${originX}px`;
  host.style.top = `${originY}px`;
  sparks({ width: card.width, height: card.height, originX, originY }).forEach(({ angle, distance }, i) => {
    const spark = document.createElement("i");
    spark.style.setProperty("--a", `${angle}deg`);
    spark.style.setProperty("--d", `${distance}px`);
    spark.style.setProperty("--spark", colors[i % colors.length]);
    spark.style.setProperty("--spark-delay", `${60 + (i % 3) * 20}ms`);
    host.appendChild(spark);
  });
  layer.appendChild(host);
  setTimeout(() => host.remove(), SETTLE_MS);
}

/** Runs the moment's plan on the live screen. */
export function runMoment(moment: Moment): void {
  const plan = fxPlan(moment);
  const motionless = reduced();
  for (const step of plan.steps) if (!motionless || step.cls === "m-goal-label") runStep(step);
  if (plan.sparks && !motionless) spawnSparks();
}
