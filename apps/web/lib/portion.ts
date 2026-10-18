import { formatAmount, formatNumber } from "./format";

function parseDecimal(input: string): number | null {
  const text = input.trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
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

export function isChickenEggFood(nameVi: string | null | undefined): boolean {
  if (!nameVi) return false;
  return (
    nameVi === "Trứng gà" ||
    nameVi === "Lòng trắng trứng gà" ||
    nameVi === "Lòng đỏ trứng gà"
  );
}

export interface EggPartChip<T = unknown> {
  id: string;
  label: "Cả quả" | "Lòng trắng" | "Lòng đỏ";
  food: T;
  active: boolean;
}

export function getEggPartChips<T extends { id: string; nameVi: string }>(
  currentNameVi: string,
  catalog: T[]
): EggPartChip<T>[] {
  const parts: Array<{ label: "Cả quả" | "Lòng trắng" | "Lòng đỏ"; nameVi: string }> = [
    { label: "Cả quả", nameVi: "Trứng gà" },
    { label: "Lòng trắng", nameVi: "Lòng trắng trứng gà" },
    { label: "Lòng đỏ", nameVi: "Lòng đỏ trứng gà" },
  ];

  const chips: EggPartChip<T>[] = [];
  for (const p of parts) {
    const found = catalog.find((f) => f.nameVi === p.nameVi);
    if (found) {
      chips.push({
        id: found.id,
        label: p.label,
        food: found,
        active: currentNameVi === p.nameVi,
      });
    }
  }
  return chips;
}
