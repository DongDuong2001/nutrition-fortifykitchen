import { FIRST_FOOD, momentFor, type Moment } from "./goals";
import { HERO_MACRO_LABEL, type HeroMacro } from "./macro-kcal";
import { nutrientName } from "./nutrients";

/**
 * feat/sound-goals §4, §5: the moment waiting to play on Hôm nay (module state, like lib/interruption), what it says, what it
 * animates, and the column's "Thiếu nhiều nhất" slot. Pure except the queue.
 */

/** What a moment says: the polite announcement (D-MOT-02) and the hero label it shows for 2,4 s, when it has one. */
export function momentText(key: string): { announce: string; label: string | null } {
  if (key === "kcal") return { announce: "Đủ kcal hôm nay", label: "Đủ kcal hôm nay" };
  if (key === "macros") return { announce: "Đủ tinh bột, đạm, chất béo", label: "Đủ tinh bột, đạm, chất béo" };
  if (key === "column") return { announce: "Đủ chất hôm nay", label: null };
  if (key === FIRST_FOOD) return { announce: "Món đầu tiên!", label: "Món đầu tiên!" };
  if (key === "training") return { announce: "Xong Ngày tập hôm nay", label: null };
  if (key === "fiber") return { announce: "Chất xơ đạt mục tiêu", label: null };
  if (key.startsWith("macro:")) return { announce: `${HERO_MACRO_LABEL[key.slice(6) as HeroMacro]} đạt mục tiêu`, label: null };
  return { announce: `${nutrientName(key)} đạt mục tiêu`, label: null };
}

/** How long a moment's hero label holds before the usual one glides back (--m-goal-hold). */
export const GOAL_LABEL_HOLD_MS = 2400;
/** How long the polite line keeps its words (long enough to be read out; then empty, so the same goal on another day is announced afresh). */
export const ANNOUNCE_MS = 4000;

export interface QueuedMoment {
  /** The day the add was made on */
  date: string;
  /** Every goal queued since the last play, the lead included */
  keys: string[];
  moment: Moment;
}

let queued: QueuedMoment | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** The moment waiting to play, or null. The same object until it changes. */
export const queuedMoment = (): QueuedMoment | null => queued;

export function subscribeMoment(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** An add reached `keys` on `date`: it waits for Hôm nay. A second add before the first played joins it (the highest tier leads); an earlier day's is dropped. */
export function queueMoment(date: string, keys: readonly string[]): void {
  if (keys.length === 0) return;
  const all = queued?.date === date ? [...new Set([...queued.keys, ...keys])] : [...keys];
  const moment = momentFor(all);
  if (!moment) return;
  queued = { date, keys: all, moment };
  changed();
}

export function clearQueuedMoment(): void {
  if (!queued) return;
  queued = null;
  changed();
}

// Where the add came from, when it is not Hôm nay's: Ngày tập records its nutrient goals and replays none of them on Hôm nay.
// Set just before the add; one that was never taken (the add was refused) goes stale and does not mark a later add.
const ADD_SOURCE_MS = 2000;
let addSource: { source: "training"; at: number } | null = null;
export function setAddSource(source: "training" | null, now = Date.now()): void {
  addSource = source ? { source, at: now } : null;
}
/** The source of the add that just happened, once. */
export function takeAddSource(now = Date.now()): "training" | null {
  const taken = addSource;
  addSource = null;
  return taken && now - taken.at <= ADD_SOURCE_MS ? taken.source : null;
}

export interface ColumnSummary {
  reached: number;
  total: number;
  lacking: string[];
  /** Every counted nutrient and Chất xơ at 100 %: the slot reads "Đủ chất hôm nay" */
  done: boolean;
}

/**
 * The "x/N đạt" verdict with Chất xơ taken in (RA2, RA3): at n/n with Chất xơ short the slot names Chất xơ, and Đủ chất shows only
 * while the numbers say so, so a delete or undo brings the lacking names back. `fiberPct`: the percent as the bars round it.
 */
export function columnSummary(base: { reached: number; total: number; lacking: string[] }, fiberPct: number | null): ColumnSummary {
  const full = base.total > 0 && base.reached === base.total;
  const fiberDone = (fiberPct ?? 0) >= 100;
  return { ...base, lacking: full && !fiberDone ? ["Chất xơ"] : base.lacking, done: full && fiberDone };
}

export interface FxStep {
  /** Where, from the document: the live Hôm nay only (never the share image) */
  sel: string;
  cls: "m-goal-pop" | "m-goal-sheen" | "m-goal-ring" | "m-goal-label";
  /** Every match, one after another: `stagger` ms apart, at most `max`, only those on screen */
  stagger?: number;
  max?: number;
  visibleOnly?: boolean;
}

const COL = 'aside[data-fx="column"]';
const HERO = '[data-fx="hero"]';
const MACROS: readonly HeroMacro[] = ["carbs", "protein", "fat"];
const rowPct = (id: string) => `${COL} [data-nutrient-row="${id}"] [data-fx="pct"]`;
const rowBar = (id: string) => `${COL} [data-nutrient-row="${id}"] [role="progressbar"]`;
const macroPct = (m: string) => `${HERO} [data-hero-macro="${m}"] [data-fx="pct"]`;
const macroBar = (m: string) => `${HERO} [data-hero-macro="${m}"] [role="progressbar"]`;
const KCAL_PCT = `${HERO} [data-fx="kcal-pct"]`;
const KCAL_BAR = `${HERO} [data-fx="kcal-bar"] [role="progressbar"]`;
const COUNT = `${COL} [data-fx="count"]`;

/** The number of a goal, popping on its own. */
function popOf(key: string): string[] {
  if (key === "kcal") return [KCAL_PCT];
  if (key === "macros") return MACROS.map(macroPct);
  if (key.startsWith("macro:")) return [macroPct(key.slice(6))];
  if (key === "fiber") return [rowPct("fiber")];
  if (key === "column" || key === "training" || key === FIRST_FOOD) return [];
  return [rowPct(key), COUNT];
}

/**
 * What a moment animates (lib/goal-fx runs it): the lead plays in full; the other goals of the same add only pop their number.
 * `sparks`: Đủ chất's ten. Ngày tập plays on /training, so nothing here.
 */
export function fxPlan(moment: Moment): { steps: FxStep[]; sparks: boolean } {
  const steps: FxStep[] = [];
  const add = (step: FxStep) => {
    if (!steps.some((s) => s.cls === step.cls && s.sel === step.sel)) steps.push(step);
  };
  const { lead } = moment;
  if (lead === "kcal" || lead === "macros") {
    add({ sel: HERO, cls: "m-goal-ring" });
    for (const sel of lead === "kcal" ? [KCAL_PCT] : MACROS.map(macroPct)) add({ sel, cls: "m-goal-pop" });
    for (const sel of lead === "kcal" ? [KCAL_BAR] : MACROS.map(macroBar)) add({ sel, cls: "m-goal-sheen" });
  } else if (lead === "column") {
    add({ sel: COUNT, cls: "m-goal-pop" });
    add({ sel: `${COL} [data-nutrient-row] [role="progressbar"]`, cls: "m-goal-sheen", stagger: 40, max: 10, visibleOnly: true });
    add({ sel: `${COL} [data-fx="done-line"]`, cls: "m-goal-label" });
  } else if (lead.startsWith("macro:")) {
    add({ sel: macroPct(lead.slice(6)), cls: "m-goal-pop" });
    add({ sel: macroBar(lead.slice(6)), cls: "m-goal-sheen" });
  } else if (lead !== "training" && lead !== FIRST_FOOD) {
    for (const sel of popOf(lead)) add({ sel, cls: "m-goal-pop" });
    add({ sel: lead === "fiber" ? rowBar("fiber") : rowBar(lead), cls: "m-goal-sheen" });
  }
  if (lead === "training") return { steps: [], sparks: false };
  for (const key of moment.pops) for (const sel of popOf(key)) add({ sel, cls: "m-goal-pop" });
  return { steps, sparks: lead === "column" };
}
