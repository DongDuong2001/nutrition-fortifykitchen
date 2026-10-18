import type { FoodItem } from "./mock/foods";

/**
 * Raw or cooked (cc-53b, coach rule 3). A food is weighed either before cooking ("Cân sống") or after ("Đã nấu chín").
 * Where the catalogue has both rows (Cá chép (sống) and Cá chép (nấu chín)), the switch logs the other row. Where it
 * has one, the grams are converted with a yield factor, so the row that is logged gets its own weight.
 *
 * Pairs are found by name until the food research's raw-cooked-pairs.json lands; that file replaces nameStem and
 * the factors below without changing the callers.
 */
export type CookState = "raw" | "cooked";
export type YieldGroup = "meat" | "fish" | "rice" | "pasta" | "noodle";

/**
 * Cooked weight per gram of raw (or dry) weight. Starting values set by the coach for cc-53b (Hao 18/10), in line with:
 * - meat and poultry 0.70: USDA Table of Cooking Yields for Meat and Poultry (Release 2, 2014), lean cuts roasted,
 *   grilled or boiled lose about 25–35 % of their weight;
 * - fish 0.80: USDA Agriculture Handbook 102, Food Yields Summarized by Different Stages of Preparation (1975), fish
 *   fillets baked or broiled;
 * - white rice 2.5, dry pasta 2.25, dry rice noodles (bún, phở) 2.5: the same handbook, cereals cooked in water.
 */
export const COOKED_PER_RAW: Readonly<Record<YieldGroup, number>> = { meat: 0.7, fish: 0.8, rice: 2.5, pasta: 2.25, noodle: 2.5 };

const COOKED_WORDS = ["nấu chín", "chín", "luộc", "hấp", "nướng", "chiên", "rang", "áp chảo", "quay", "kho", "xào", "rim"];
const RAW_WORDS = ["sống", "hạt khô", "khô"];
// "nấu chín" before "chín", "hạt khô" before "khô": the longer word is taken first
const wordRe = (words: readonly string[]) => new RegExp(`(?:^|[\\s(,])(${words.join("|")})(?=$|[\\s),])`, "giu");

/** The state the name says, or null when it says none ("Ức gà phi lê"). A cooking word wins: "Bún khô (luộc)" is cooked. */
export function cookStateOf(nameVi: string): CookState | null {
  const name = nameVi.toLowerCase();
  if (wordRe(COOKED_WORDS).test(name)) return "cooked";
  if (wordRe(RAW_WORDS).test(name)) return "raw";
  return null;
}

/** The name without its state, to match a raw row with its cooked row: "Cá lóc (cá quả, sống)" and "Cá lóc (nấu chín)". */
export function nameStem(nameVi: string): string {
  return nameVi
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(wordRe([...COOKED_WORDS, ...RAW_WORDS]), " ")
    .replace(/[\s,]+/g, " ")
    .trim();
}

const has = (name: string, words: readonly string[]) => words.some((w) => new RegExp(`(?:^|\\s)${w}(?=$|[\\s,)])`, "iu").test(name));

// Processed, dried or canned: no cooking yield applies
const PROCESSED = ["trứng", "chả", "giò", "xúc xích", "lạp xưởng", "nem", "pate", "ruốc", "chà bông", "xông khói", "hộp", "đóng hộp", "khô", "hạt khô", "đậu", "sữa"];
const MEAT = ["gà", "heo", "lợn", "bò", "vịt", "ngan", "ngỗng", "dê", "cừu", "thịt", "sườn", "ba chỉ", "nạc", "ức", "đùi", "cánh", "thăn", "gan", "tim", "cật", "chim cút"];
const PASTA = ["mì ý", "nui", "pasta", "spaghetti", "mì"];
const NOODLES = ["bún", "phở", "hủ tiếu", "miến"];
const TUBERS = ["khoai", "củ", "sắn", "môn"];

/** The yield group of a food, or null when no factor applies to it. */
export function yieldGroupOf(food: Pick<FoodItem, "nameVi" | "category">): YieldGroup | null {
  const name = food.nameVi.toLowerCase();
  if (food.category === "dam") {
    if (has(name, PROCESSED)) return null;
    if (/^cá\s/.test(name)) return "fish";
    if (has(name, MEAT)) return "meat";
    return null;
  }
  if (food.category === "tinh_bot") {
    if (/^(cơm|gạo)\s/.test(name)) return "rice";
    if (has(name, ["mì gói", "mì ăn liền"])) return null;
    if (has(name, NOODLES)) return "noodle";
    if (has(name, PASTA)) return "pasta";
  }
  return null;
}

/**
 * Where raw or cooked matters (coach): meat, fish, rice, grains, noodles, tubers and legumes. Vegetables and fruit,
 * eggs, dairy and the rest have no switch.
 */
function rawCookedMatters(food: Pick<FoodItem, "nameVi" | "category">): boolean {
  const name = food.nameVi.toLowerCase();
  if (has(name, ["trứng"])) return false;
  if (food.category === "dam" || food.category === "tinh_bot") return true;
  return food.category === "rau" && TUBERS.some((w) => name.startsWith(w));
}

/**
 * The food's own state: its cookState when the data has one, else what its name says, else cơm and fresh noodles are
 * cooked and the rest raw (meat and fish rows without a word are USDA raw cuts as a rule).
 */
export function ownCookState(food: Pick<FoodItem, "nameVi" | "category" | "cookState">): CookState {
  if (food.cookState) return food.cookState;
  const said = cookStateOf(food.nameVi);
  if (said) return said;
  const group = yieldGroupOf(food);
  if (group === "rice") return /^cơm\s/i.test(food.nameVi) ? "cooked" : "raw";
  return group === "noodle" ? "cooked" : "raw";
}

// The cooked row to prefer when there are several (Cá nục luộc, nấu chín, nướng)
const COOKED_ORDER = ["nấu chín", "chín", "luộc", "hấp"];

function pairOf(food: FoodItem, catalog: readonly FoodItem[], own: CookState): FoodItem | null {
  const stem = nameStem(food.nameVi);
  const other: CookState = own === "raw" ? "cooked" : "raw";
  const found = catalog.filter((f) => f.id !== food.id && f.category === food.category && cookStateOf(f.nameVi) === other && nameStem(f.nameVi) === stem);
  if (found.length === 0) return null;
  const rank = (f: FoodItem) => {
    const name = f.nameVi.toLowerCase();
    const at = (other === "cooked" ? COOKED_ORDER : RAW_WORDS).findIndex((w) => wordRe([w]).test(name));
    return at === -1 ? 99 : at;
  };
  return [...found].sort((a, b) => rank(a) - rank(b))[0];
}

export interface CookSwitch {
  /** The state of the food the panel opened with */
  own: CookState;
  /** The other row of the catalogue, logged when the user picks the other state (only where the food can be swapped) */
  pair: FoodItem | null;
  /** Cooked grams per raw gram, when no pair is used */
  factor: number | null;
}

/**
 * The Sống | Chín switch of a food, or null when it shows none: raw or cooked must matter for the food, and picking the
 * other state must log something true (the paired row, or a yield factor). `canSwap` is false where the logged food
 * cannot change (editing an entry).
 */
export function cookSwitchFor(food: FoodItem, catalog: readonly FoodItem[], canSwap: boolean): CookSwitch | null {
  if (!rawCookedMatters(food)) return null;
  const own = ownCookState(food);
  const pair = canSwap ? pairOf(food, catalog, own) : null;
  const group = yieldGroupOf(food);
  const factor = group ? COOKED_PER_RAW[group] : null;
  if (!pair && factor === null) return null;
  return { own, pair, factor };
}
