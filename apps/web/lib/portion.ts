import { formatAmount, formatNumber } from "./format";
import type { FoodItem } from "./mock/foods";
import { cookSwitchFor, type CookState, type CookSwitch } from "./yield";

function parseDecimal(input: string): number | null {
  const text = input.trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Grams as a gram field holds them: a decimal comma, no thousands dot ("1.000" would read as 1 g), blank for 0. */
export function gramFieldText(grams: number): string {
  return grams > 0 ? String(Math.round(grams * 10) / 10).replace(".", ",") : "";
}

/** A gram amount as shown: "2,5 g", "1.000 g". */
export function gramsServingLabel(grams: number): string {
  return `${formatAmount(grams, "g")} g`;
}

/** The serving label for grams typed in: "2,5" or "2.5" becomes "2,5 g". If the input is empty or invalid, returns fallback. */
export function formatGramsServingLabel(raw: string, fallback: string): string {
  const n = parseDecimal(raw);
  if (n === null) return fallback;
  return gramsServingLabel(n);
}

/** A food with a `category` and a source, as the supplement rules below need it. */
interface UnitFood {
  category?: string;
  source?: string | null;
  servings?: Array<{ label: string; grams: number }>;
}

export const GRAM_OR_VOLUME_LABEL = /^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)$/i;

/** The 28 recognized unit words for food portions. Multi-word units precede single-word ones. */
export const UNIT_WORDS = [
  "lòng trắng",
  "lòng đỏ",
  "cà phê",
  "quả",
  "trái",
  "củ",
  "chén",
  "tô",
  "dĩa",
  "phần",
  "ổ",
  "lát",
  "miếng",
  "cái",
  "con",
  "cuốn",
  "cây",
  "ly",
  "lon",
  "chai",
  "hộp",
  "hũ",
  "gói",
  "thanh",
  "muỗng",
  "nắm",
  "múi",
  "viên",
  "giọt",
  "xịt",
] as const;

export type UnitWord = (typeof UNIT_WORDS)[number];

/** Size words for unit portions. Multi-word sizes precede single-word ones. */
export const SIZE_WORDS = [
  "rất lớn",
  "cà phê",
  "nhỏ",
  "vừa",
  "lớn",
  "lưng",
  "đầy",
  "canh",
] as const;

export type SizeWord = (typeof SIZE_WORDS)[number];

export function capitalizeWord(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export interface ParsedUnitServing {
  unit: UnitWord;
  unitDisplay: string;
  size?: SizeWord;
  sizeDisplay?: string;
  hint?: string;
  rawLabel: string;
}

const UNIT_SERVING_PATTERN = new RegExp(
  `^1\\s+(${UNIT_WORDS.join("|")})(?:\\s+(${SIZE_WORDS.join("|")}))?(?:\\s*\\(([^)]+)\\))?$`,
  "i"
);

const UNIT_AMOUNT_PATTERN = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s+(${UNIT_WORDS.join("|")})(?:\\s+(${SIZE_WORDS.join("|")}))?(?:\\s*\\(([^)]+)\\))?$`,
  "i"
);

/**
 * Parses a 1-unit serving label: "1 <unit>[ <size>][ (<hint>)]".
 * Returns null if the label does not match.
 */
export function parseUnitServing(label: string | null | undefined): ParsedUnitServing | null {
  if (!label) return null;
  const trimmed = label.trim();
  const m = UNIT_SERVING_PATTERN.exec(trimmed);
  if (!m) return null;
  const unit = m[1].toLowerCase() as UnitWord;
  const size = m[2]?.toLowerCase() as SizeWord | undefined;
  return {
    unit,
    unitDisplay: capitalizeWord(unit),
    size,
    sizeDisplay: size ? capitalizeWord(size) : undefined,
    hint: m[3]?.trim(),
    rawLabel: trimmed,
  };
}

export interface ParsedUnitAmount {
  amount: number;
  unit: UnitWord;
  unitDisplay: string;
  size?: SizeWord;
  sizeDisplay?: string;
  hint?: string;
  rawLabel: string;
}

/**
 * Parses a label with quantity: "<amount> <unit>[ <size>][ (<hint>)]", e.g. "2 trái vừa", "1,5 chén đầy".
 */
export function parseUnitAmount(label: string | null | undefined): ParsedUnitAmount | null {
  if (!label) return null;
  const trimmed = label.trim();
  const m = UNIT_AMOUNT_PATTERN.exec(trimmed);
  if (!m) return null;
  const amount = Number(m[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;
  const unit = m[2].toLowerCase() as UnitWord;
  const size = m[3]?.toLowerCase() as SizeWord | undefined;
  return {
    amount,
    unit,
    unitDisplay: capitalizeWord(unit),
    size,
    sizeDisplay: size ? capitalizeWord(size) : undefined,
    hint: m[4]?.trim(),
    rawLabel: trimmed,
  };
}

export function formatUnitServingLabel(amount: number, unit: string, size?: string, hint?: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const formattedAmount = formatNumber(rounded);
  const sizePart = size ? ` ${size}` : "";
  const hintPart = hint ? ` (${hint})` : "";
  return `${formattedAmount} ${unit}${sizePart}${hintPart}`.trim();
}

export const MIN_UNIT_AMOUNT = 0.5;
export const MAX_UNIT_AMOUNT = 20;
export const UNIT_AMOUNT_STEP = 0.5;

export function clampUnitAmount(val: number): number {
  if (isNaN(val) || val < MIN_UNIT_AMOUNT) return MIN_UNIT_AMOUNT;
  if (val > MAX_UNIT_AMOUNT) return MAX_UNIT_AMOUNT;
  return Math.round(val * 2) / 2;
}

export function parseUnitAmountInput(input: string): number | null {
  if (!input) return null;
  const clean = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const n = parseFloat(clean);
  if (isNaN(n) || n <= 0) return null;
  return clampUnitAmount(n);
}

/**
 * Finds the nearest unit serving and amount (0.5..20 in 0.5 steps) for a target gram weight.
 */
export function findNearestUnitServing(
  servings: ReadonlyArray<{ label: string; grams: number }>,
  targetUnit: string,
  targetGrams: number
): { serving: { label: string; grams: number }; amount: number; parsed: ParsedUnitServing } | null {
  const matching = servings
    .map((s) => ({ serving: s, parsed: parseUnitServing(s.label) }))
    .filter(
      (x): x is { serving: { label: string; grams: number }; parsed: ParsedUnitServing } =>
        x.parsed !== null && x.parsed.unit.toLowerCase() === targetUnit.toLowerCase() && x.serving.grams > 0
    );

  if (matching.length === 0) return null;

  let best = matching[0];
  let bestAmount = 1;
  let minDiff = Infinity;

  for (const m of matching) {
    for (let a = MIN_UNIT_AMOUNT; a <= MAX_UNIT_AMOUNT; a += UNIT_AMOUNT_STEP) {
      const g = a * m.serving.grams;
      const diff = Math.abs(g - targetGrams);
      if (diff < minDiff || (diff === minDiff && Math.abs(a - 1) < Math.abs(bestAmount - 1))) {
        minDiff = diff;
        best = m;
        bestAmount = a;
      }
    }
  }

  return { serving: best.serving, amount: bestAmount, parsed: best.parsed };
}

/** True when a serving label represents a discrete unit count (backward compatibility). */
export function isUnitServingLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const trimmed = label.trim();
  return parseUnitServing(trimmed) !== null || parseUnitAmount(trimmed) !== null || (!GRAM_OR_VOLUME_LABEL.test(trimmed) && Boolean(trimmed));
}

/**
 * Supplements (Thực phẩm bổ sung) are logged by the unit on the pack: "1 viên", "1 giọt", "1 muỗng". Their grams are
 * nominal (1 g per unit), only there so the totals stay grams × per-100 g. Whose numbers come from the label never
 * show a gram figure, unless one of its portions is a real weight or volume ("100 g" of a whey powder): that one keeps
 * the gram field.
 */
export function hidesGrams(food: UnitFood | null | undefined): boolean {
  return (
    !!food &&
    food.category === "bo_sung" &&
    (food.source ?? "").trim().toLowerCase() === "label" &&
    !(food.servings ?? []).some((s) => GRAM_OR_VOLUME_LABEL.test(s.label.trim()))
  );
}

/**
 * A portion label times a quantity, in the natural form: 2 × "1 viên" is "2 viên", 3 × "1 muỗng" is "3 muỗng",
 * 1 × "2 viên (liều trên nhãn)" stays as it is. A label with no leading number reads "2 × muỗng canh".
 */
export function unitPortionText(label: string, qty: number): string {
  const text = label.trim();
  const q = Math.round(qty * 100) / 100;
  if (!(q > 0) || q === 1) return text;
  const parsed = parseUnitServing(text);
  if (parsed) {
    return formatUnitServingLabel(q, parsed.unit, parsed.size, parsed.hint);
  }
  const lead = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(text);
  if (lead) return `${formatNumber(Number(lead[1].replace(",", ".")) * q)} ${lead[2]}`;
  return `${formatNumber(q)} × ${text}`;
}

/**
 * The amount of an entry as shown (Hôm nay rows, the share image, the portion panel): the quantity of its
 * portion, never grams when a unit serving (quả, trái, viên, chén, tô...) is used.
 * Null when the entry was logged in grams/volume: the caller keeps its usual grams text.
 */
export function unitAmountText(food: UnitFood | null | undefined, label: string | null | undefined, grams: number | null): string | null {
  if (!food) return null;
  const text = (label ?? "").trim();
  if (!text || GRAM_OR_VOLUME_LABEL.test(text)) return null;

  // A matching serving by label: calculate count if grams given
  const serving = food?.servings?.find((s) => s.label === text);
  if (serving && serving.grams > 0 && grams !== null && grams > 0) {
    const count = Math.round((grams / serving.grams) * 2) / 2;
    return unitPortionText(serving.label, count);
  }

  // If text is already a unit amount label ("2 trái vừa", "1,5 chén đầy", "3 cuốn", "2 viên")
  const parsedAmt = parseUnitAmount(text);
  if (parsedAmt) return text;

  // If text is a 1-unit serving template ("1 quả", "1 viên")
  const parsedServing = parseUnitServing(text);
  if (parsedServing) {
    return text;
  }

  if (food?.category === "bo_sung") return text;
  return null;
}

/** The most units of a portion one entry takes (the ×N stepper). */
export const MAX_UNIT_COUNT = 20;

export interface UnitPortion {
  grams: number;
  label: string;
}

/** N units of a serving: the grams are N × the serving's grams, the label is the collapsed "N viên" or "N quả". */
export function unitPortion(serving: { label: string; grams: number }, count: number): UnitPortion {
  const n = clampUnitAmount(count);
  return { grams: Math.round(serving.grams * n * 10) / 10, label: unitPortionText(serving.label, n) };
}

/**
 * Which serving and how many of it a label and grams stand for: "2 quả" at 110 g is 2 × "1 quả"; a serving's own
 * label is 1 × it. A label that matches nothing falls back to the first serving with the count its grams give.
 */
export function unitCountOf(
  servings: ReadonlyArray<{ label: string; grams: number }>,
  label: string,
  grams: number
): { serving: { label: string; grams: number }; count: number } | null {
  if (servings.length === 0) return null;

  // Check if there is a base 1-unit serving that produces this label and grams
  for (const serving of servings) {
    for (let n = 0.5; n <= MAX_UNIT_COUNT; n += 0.5) {
      if (Math.abs(serving.grams * n - grams) < 1e-6 && unitPortionText(serving.label, n) === label) {
        return { serving, count: n };
      }
    }
  }

  const parsedAmt = parseUnitAmount(label);
  if (parsedAmt) {
    const match = servings.find((s) => {
      const p = parseUnitServing(s.label);
      return p && p.unit === parsedAmt.unit && p.size === parsedAmt.size;
    });
    if (match) {
      const count = parsedAmt.amount === 1 && grams > 0 && Math.abs(grams - match.grams) > 1e-3
        ? Math.round((grams / match.grams) * 2) / 2
        : parsedAmt.amount;
      return { serving: match, count };
    }
  }

  const own = servings.find((s) => s.label === label);
  if (own) {
    const n = own.grams > 0 && grams > 0 ? Math.round((grams / own.grams) * 2) / 2 : 1;
    return { serving: own, count: clampUnitAmount(n) };
  }
  for (const serving of servings) {
    if (!GRAM_OR_VOLUME_LABEL.test(serving.label) && serving.grams > 0 && grams > 0) {
      const n = Math.round((grams / serving.grams) * 2) / 2;
      if (n >= MIN_UNIT_AMOUNT && n <= MAX_UNIT_AMOUNT) {
        return { serving, count: n };
      }
    }
  }
  const first = servings[0];
  return { serving: first, count: clampUnitAmount(Math.round((grams / (first.grams || 1)) * 2) / 2 || 1) };
}

/** Maximum grams allowed for a single food entry (5 kg). Prevents accidental overflow or typing mistakes. */
export const MAX_GRAMS_PER_PORTION = 5000;

/**
 * Parses user-entered grams supporting Vietnamese decimal comma ("2,5") or standard dot ("2.5").
 * Clamped to MAX_GRAMS_PER_PORTION.
 */
export function parseGramsInput(input: string): number {
  if (!input) return 0;
  const normalized = input.trim().replace(",", ".");
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return 0;
  if (num > MAX_GRAMS_PER_PORTION) return MAX_GRAMS_PER_PORTION;
  return num;
}

/**
 * Scales a record of nutrients (defined per 100 g) to a specific gram amount.
 * Preserves null values as null (never converts unknown to 0).
 */
export function scaleNutrients(
  nutrientsPer100g: Record<string, number | null>,
  grams: number
): Record<string, number | null> {
  const factor = grams / 100;
  const result: Record<string, number | null> = {};

  for (const [key, val] of Object.entries(nutrientsPer100g)) {
    if (val === null || val === undefined) {
      result[key] = null;
    } else {
      result[key] = val * factor;
    }
  }

  return result;
}

export interface MacroPreview {
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
}

/** A macro of the preview card: "2,1 g", or "—" when unknown (never "0 g"). */
export function macroGramsText(grams: number | null): string {
  return grams === null ? "—" : `${formatAmount(grams, "g")} g`;
}

/**
 * Calculates primary macros for live preview and quick display. An unknown value stays null (shown as "—"), never 0.
 */
export function calculateMacroPreview(
  nutrientsPer100g: Record<string, number | null>,
  grams: number
): MacroPreview {
  const scaled = scaleNutrients(nutrientsPer100g, grams);
  const tenth = (v: number | null | undefined) => (typeof v === "number" ? Math.round(v * 10) / 10 : null);
  return {
    calories: typeof scaled.energy === "number" ? Math.round(scaled.energy) : null,
    carbs: tenth(scaled.carbs),
    protein: tenth(scaled.protein),
    fat: tenth(scaled.fat),
    fiber: tenth(scaled.fiber),
  };
}

export interface FoodUnitTab {
  id: string;
  label: string;
}

export interface FoodUnitTabsResult {
  tabs: FoodUnitTab[];
  defaultTab: string;
}

/**
 * Returns the segmented toggle tabs in data order plus "Gam" ("Trái | Gam", "Gam | Chén").
 * Returns null if the food has no unit portions or hides grams (supplements).
 */
export function getFoodUnitTabs(
  servings: Array<{ label: string; grams: number }> | undefined,
  noGrams = false
): FoodUnitTabsResult | null {
  if (noGrams || !servings || servings.length === 0) return null;
  const unitServings = servings.filter((s) => parseUnitServing(s.label) !== null);
  const uniqueUnits: string[] = [];
  for (const s of unitServings) {
    const p = parseUnitServing(s.label);
    if (p && !uniqueUnits.includes(p.unit)) {
      uniqueUnits.push(p.unit);
    }
  }
  if (uniqueUnits.length === 0) return null;

  const firstIsUnit = parseUnitServing(servings[0]?.label) !== null;
  const unitTabs: FoodUnitTab[] = uniqueUnits.map((u) => ({ id: u, label: capitalizeWord(u) }));
  const gamTab: FoodUnitTab = { id: "gam", label: "Gam" };

  if (firstIsUnit) {
    return {
      tabs: [...unitTabs, gamTab],
      defaultTab: uniqueUnits[0],
    };
  } else {
    return {
      tabs: [gamTab, ...unitTabs],
      defaultTab: "gam",
    };
  }
}

export interface EggPart<T> {
  label: "Cả quả" | "Lòng trắng" | "Lòng đỏ";
  food: T;
  active: boolean;
}

const WHITE = /^lòng trắng trứng gà/i;
const YOLK = /^lòng đỏ trứng gà/i;

/**
 * Cả quả | Lòng trắng | Lòng đỏ for a chicken egg weighed in grams (coach rule 4: whites and yolks are their own
 * foods). On an egg, Cả quả is that egg; on a white or a yolk it is the raw egg row. Empty when fewer than two exist.
 */
export function eggParts<T extends { id: string; nameVi: string }>(food: T, catalog: readonly T[]): EggPart<T>[] {
  const name = food.nameVi;
  const onPart = WHITE.test(name) || YOLK.test(name);
  if (!onPart && !/^trứng gà(?=$|[\s(])/i.test(name)) return [];
  const whole = onPart ? catalog.find((f) => f.nameVi === "Trứng gà" || f.nameVi === "Trứng gà (sống)") : food;
  const parts: Array<[EggPart<T>["label"], T | undefined]> = [
    ["Cả quả", whole],
    ["Lòng trắng", catalog.find((f) => WHITE.test(f.nameVi))],
    ["Lòng đỏ", catalog.find((f) => YOLK.test(f.nameVi))],
  ];
  const found = parts.filter((x): x is [EggPart<T>["label"], T] => !!x[1]).map(([label, f]) => ({ label, food: f, active: f.id === food.id }));
  return found.length > 1 ? found : [];
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* cc-53b: the coach's portion model. Normal foods go by grams (a gram amount × N, raw or cooked), eggs by the piece   */
/* (size from the box × how many), and supplements, món Việt, cans and recipes keep their unit (the code above).       */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What the user set for a food weighed in grams: an amount, how many times it, and when it was weighed. */
export interface GramPortion {
  kind: "grams";
  base: number;
  mult: number;
  /** null when the food has no Sống | Chín switch */
  state: CookState | null;
}

/** Eggs by the piece: the size on the box (null when the food has one size) and how many. */
export interface EggPortion {
  kind: "egg";
  size: SizeWord | null;
  count: number;
}

export type PortionState = GramPortion | EggPortion;

/** The most times ×N multiplies an amount (and the most eggs). */
export const MAX_MULT = 20;

const STATE_TEXT: Record<CookState, string> = { raw: "Cân sống", cooked: "Đã nấu chín" };
const EGG_SIZES: readonly SizeWord[] = ["nhỏ", "vừa", "lớn", "rất lớn"];
const round1 = (n: number) => Math.round(n * 10) / 10;

/** A new amount keeps N (coach rule 2). */
export function withBase(p: GramPortion, base: number): GramPortion {
  return { ...p, base };
}

/** N in whole steps, 1 to MAX_MULT. */
export function withMult(p: GramPortion, mult: number): GramPortion {
  return { ...p, mult: Math.min(MAX_MULT, Math.max(1, Math.round(mult))) };
}

/** "100 g × 3 = 300 g", or how to start when N is 1. */
export function portionHint(p: GramPortion): string {
  const base = formatNumber(p.base);
  return p.mult === 1 ? `Bấm + để nhân ${base} g này lên` : `${base} g × ${p.mult} = ${formatNumber(round1(p.base * p.mult))} g`;
}

/**
 * The serving_label of a portion: "150 g", "100 g × 3", "Đã nấu chín · 150 g", "Cỡ lớn · 3 quả", "2 quả".
 * The server keeps it as the entry's label; parsePortionLabel reads it back when the entry is edited.
 */
export function formatPortionLabel(p: PortionState): string {
  if (p.kind === "egg") return `${p.size ? `Cỡ ${p.size} · ` : ""}${p.count} quả`;
  const amount = `${formatNumber(p.base)} g${p.mult > 1 ? ` × ${p.mult}` : ""}`;
  return p.state ? `${STATE_TEXT[p.state]} · ${amount}` : amount;
}

/** "1.200" and "2,5" (vi-VN), and the dot decimals of older labels ("2.5"). */
function readNumber(text: string): number {
  const vi = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text) ? text.replace(/\./g, "") : text;
  return Number(vi.replace(",", "."));
}

const GRAM_LABEL = /^(?:(Cân sống|Đã nấu chín) · )?(\d[\d.,]*) g(?: × (\d+))?$/;
const EGG_LABEL = new RegExp(`^(?:Cỡ (${EGG_SIZES.join("|")}) · )?(\\d+) quả$`);

/** The portion a label written by formatPortionLabel stands for; null for anything else (a unit label, an old one). */
export function parsePortionLabel(label: string | null | undefined): PortionState | null {
  const text = (label ?? "").trim();
  const g = GRAM_LABEL.exec(text);
  if (g) {
    const base = readNumber(g[2]);
    if (!Number.isFinite(base)) return null;
    const state = g[1] === STATE_TEXT.raw ? "raw" : g[1] === STATE_TEXT.cooked ? "cooked" : null;
    return { kind: "grams", base, mult: g[3] ? Number(g[3]) : 1, state };
  }
  const e = EGG_LABEL.exec(text);
  if (e) return { kind: "egg", size: (e[1] as SizeWord | undefined) ?? null, count: Number(e[2]) };
  return null;
}

export interface EggSize {
  size: SizeWord | null;
  /** "Lớn" */
  label: string;
  /** The box range, weighed with the shell: "55–60 g" */
  hint: string;
  /** The edible grams of one egg of this size */
  serving: { label: string; grams: number };
}

/** The egg sizes of a food, from its own "1 quả <size> (trứng 55-60 g)" portions, smallest first. */
export function eggSizes(food: Pick<UnitFood, "servings">): EggSize[] {
  const sizes: EggSize[] = [];
  for (const serving of food.servings ?? []) {
    const p = parseUnitServing(serving.label);
    if (!p || p.unit !== "quả" || serving.grams <= 0) continue;
    if (p.size && !EGG_SIZES.includes(p.size)) continue;
    sizes.push({
      size: p.size ?? null,
      label: p.sizeDisplay ?? "1 quả",
      hint: (p.hint ?? "").replace(/^trứng\s+/i, "").replace(/(\d)\s*-\s*(\d)/, "$1–$2"),
      serving,
    });
  }
  return sizes.sort((a, b) => (a.size ? EGG_SIZES.indexOf(a.size) : 0) - (b.size ? EGG_SIZES.indexOf(b.size) : 0));
}

type ModeFood = UnitFood & { nameVi: string };

/** An egg (Trứng gà, Trứng vịt…) with portions by the piece. Lòng trắng and lòng đỏ go by grams. */
export function isEggFood(food: ModeFood): boolean {
  return /^trứng\s/i.test(food.nameVi) && eggSizes(food).length > 0;
}

/**
 * How a food's portion is set (coach rules 1, 4 and 5): "units" for supplements, món Việt and dishes by the phần, cans
 * (Red Bull in lon) and the user's own foods and recipes, which keep their unit; "egg" for eggs; "grams" for everything else.
 */
export function portionModeOf(food: ModeFood): "units" | "egg" | "grams" {
  if (hidesGrams(food) || food.category === "bo_sung" || food.category === "mon_viet" || food.category === "cua_toi" || food.source === "user") return "units";
  // A dish by the plate ("1 phần") and a can ("1 lon") keep their unit whatever their category says
  if ((food.servings ?? []).some((s) => ["lon", "phần"].includes(parseUnitServing(s.label)?.unit ?? ""))) return "units";
  return isEggFood(food) ? "egg" : "grams";
}

/**
 * The portion an entry (or a picked food) opens with: its label when this model wrote it, an old egg label ("2 quả
 * vừa (trứng 50-55 g)") as eggs, else its grams.
 */
export function startPortion(food: ModeFood, label: string | null | undefined, grams: number): PortionState {
  const egg = portionModeOf(food) === "egg";
  const parsed = parsePortionLabel(label);
  if (parsed && (parsed.kind === "grams" || egg)) return parsed;
  if (egg) {
    const unit = parseUnitAmount(label) ?? (parseUnitServing(label) ? { ...parseUnitServing(label)!, amount: 1 } : null);
    if (unit && unit.unit === "quả") {
      const size = eggSizes(food).some((s) => s.size === (unit.size ?? null)) ? (unit.size ?? null) : null;
      return { kind: "egg", size, count: Math.min(MAX_MULT, Math.max(1, Math.round(unit.amount))) };
    }
  }
  return { kind: "grams", base: grams > 0 ? round1(grams) : 100, mult: 1, state: null };
}

/**
 * What is logged for a portion: the food row, its grams (so per-100 g scaling on the server stays right) and the label.
 * Cooked chicken with only raw data logs the raw row at 150 / 0.74 = 203 g; a food with a pair logs the pair.
 */
export function resolvePortion(food: FoodItem, p: PortionState, sw: CookSwitch | null): { food: FoodItem; grams: number; label: string } {
  if (p.kind === "egg") {
    const sizes = eggSizes(food);
    const pick = sizes.find((s) => s.size === p.size) ?? sizes[0];
    const size = sizes.length > 1 && pick ? pick.size : null;
    return { food, grams: round1((pick?.serving.grams ?? 0) * p.count), label: formatPortionLabel({ ...p, size }) };
  }
  const amount = p.base * p.mult;
  const state = sw ? (p.state ?? sw.own) : null;
  let logged = food;
  let grams = amount;
  if (sw && state !== sw.own) {
    if (sw.pair) logged = sw.pair;
    else if (sw.factor) grams = sw.own === "raw" ? amount / sw.factor : amount * sw.factor;
  }
  return { food: logged, grams: round1(grams), label: formatPortionLabel({ ...p, state }) };
}

/**
 * The amount Hôm nay shows for a label this model wrote with a state, ×N or an egg size ("150 g", "300 g", "3 quả");
 * null otherwise. "2 quả" alone is also an older fruit label: it keeps the unit text (or grams) as before.
 */
export function portionAmountText(label: string | null | undefined): string | null {
  const p = parsePortionLabel(label);
  if (!p) return null;
  if (p.kind === "egg") return p.size ? `${p.count} quả` : null;
  if (!p.state && p.mult === 1) return null;
  return `${formatAmount(p.base * p.mult, "g")} g`;
}

/** The line under a Hôm nay row: how it was weighed ("Đã nấu chín · bằng 203 g lúc sống", "100 g × 3", "Cỡ lớn"). */
export function portionDetail(label: string | null | undefined, grams: number | null): string | null {
  const p = parsePortionLabel(label);
  if (!p) return null;
  if (p.kind === "egg") return p.size ? `Cỡ ${p.size}` : null;
  const times = p.mult > 1 ? `${formatNumber(p.base)} g × ${p.mult}` : null;
  if (!p.state) return times;
  const amount = p.base * p.mult;
  if (grams !== null && Math.abs(grams - amount) > 0.5) {
    return `${STATE_TEXT[p.state]} · bằng ${formatAmount(Math.round(grams), "g")} g lúc ${p.state === "cooked" ? "sống" : "chín"}`;
  }
  return times ? `${STATE_TEXT[p.state]} · ${times}` : STATE_TEXT[p.state];
}

/** The kcal card's line beside the kcal: "3 quả lớn", "300 g đã nấu chín", "200 g lúc sống", "300 g". */
export function portionSummary(p: PortionState, sw: CookSwitch | null): string {
  if (p.kind === "egg") return `${p.count} quả${p.size ? ` ${p.size}` : ""}`;
  const state = sw ? (p.state ?? sw.own) : null;
  const amount = `${formatNumber(round1(p.base * p.mult))} g`;
  return state === "raw" ? `${amount} lúc sống` : state === "cooked" ? `${amount} đã nấu chín` : amount;
}

/**
 * The note under the kcal card: how eggs are weighed, what a raw / cooked amount stands for, or that fruit and the foods
 * with a peel, shell or bone are weighed without it (cc-67). Null when there is nothing to say. `loggedGrams` is what resolvePortion logs.
 */
export function portionNote(p: PortionState, sw: CookSwitch | null, loggedGrams: number, egg = false, edible = false): string | null {
  if (p.kind === "egg") return "Hộp ghi cân cả vỏ, app tự trừ vỏ khi tính.";
  if (egg) return "Bóc vỏ rồi cân thì nhập số gam ở đây.";
  if (!sw) return edible ? "Cân phần ăn được, bỏ vỏ, hạt và xương." : null;
  const state = p.state ?? sw.own;
  const amount = p.base * p.mult;
  const g = (n: number) => `${formatAmount(Math.round(n), "g")} g`;
  const converted = state !== sw.own && !sw.pair && sw.factor !== null;
  if (converted && state === "cooked") {
    // Meat and fish lose weight in cooking, dry grains and beans gain it, tubers keep it
    const why = sw.factor === 1 ? "" : `Món chín ${(sw.factor ?? 1) < 1 ? "nhẹ" : "nặng"} hơn lúc sống, nên `;
    return `${why}${g(amount)} chín bằng khoảng ${g(loggedGrams)} sống. App tính theo số đó cho bạn.`;
  }
  if (converted) return `${g(amount)} lúc sống nấu xong thành khoảng ${g(loggedGrams)}. App tính theo số đó cho bạn.`;
  if (state === "raw") return "Cân lúc đã nấu chín thì chọn Đã nấu chín.";
  if (sw.factor !== null && amount > 0) return `${g(amount)} chín là khoảng ${g(amount / sw.factor)} trước khi nấu.`;
  return null;
}

/**
 * The portion a food starts at when nothing was logged for it before: its first portion for a unit food, one medium
 * egg (or the first size), else its first gram portion or 100 g, weighed in the food's own state.
 */
export function defaultPortionOf(food: FoodItem): { label: string; grams: number } {
  const mode = portionModeOf(food);
  if (mode === "units") return food.servings[0] ?? { label: "100 g", grams: 100 };
  if (mode === "egg") {
    const sizes = eggSizes(food);
    const size = (sizes.find((s) => s.size === "vừa") ?? sizes[0]).size;
    return resolvePortion(food, { kind: "egg", size, count: 1 }, null);
  }
  const gram = food.servings.find((s) => /^\d+(?:[.,]\d+)?\s*g$/i.test(s.label.trim()) && s.grams > 0);
  return resolvePortion(food, { kind: "grams", base: gram?.grams ?? 100, mult: 1, state: null }, cookSwitchFor(food, [], false));
}
