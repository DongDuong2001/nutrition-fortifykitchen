import type { FoodItem } from "./mock/foods";
import PAIRS from "./data/raw-cooked-pairs.slim.json";
import GROUP_MEDIANS from "./data/raw-cooked-group-yields.slim.json";

/**
 * Raw or cooked (cc-53b, coach rule 3). A food is weighed either before cooking ("Cân sống") or after ("Đã nấu chín").
 * Where the catalogue has both rows (Cá chép (sống) and Cá chép (nấu chín)), the switch logs the other row. Where it
 * has one, the grams are converted with a yield factor, so the row that is logged gets its own weight.
 *
 * cc-53c: the food research's raw-cooked-pairs.json comes first, by source + source_id: it gives a row's state, its
 * other row and the yield of that pair. The research files sit in tests/fixtures; the app reads their slim copies in
 * lib/data (scripts/slim-pairs.mjs: keys and yields only, so names and sources stay out of the bundle). A row it does not list (the demo foods, a new row)
 * falls back to the group yield, then to the name: its state words and nameStem.
 */
export type CookState = "raw" | "cooked";
export type YieldGroup = "meat" | "offal" | "fish" | "rice" | "pasta" | "noodle" | "tuber" | "legume" | "grain";

/** Cooked grams per raw gram: the research's median for a group (raw-cooked-group-yields.json, cooked g per 100 g raw) */
const groupMedian = (group: keyof typeof GROUP_MEDIANS) => GROUP_MEDIANS[group] / 100;

/**
 * Cooked weight per gram of raw (or dry) weight, for a row the pairs do not list: the median of the group's pairs in
 * the food research's raw-cooked-group-yields.json (its sources: USDA Table of Cooking Yields for Meat and Poultry 2012,
 * Bognár 2002, USDA SR Legacy fillet measures, protein and dry-matter balance). Shellfish, eggs and glutinous rice have
 * a group there but no group here: their rows are paired, or go by quả. other_grains (4.60) is pulled up by the oat
 * porridge rows; it only ever stands behind the pairs, which carry each grain's own yield.
 */
export const COOKED_PER_RAW: Readonly<Record<YieldGroup, number>> = {
  meat: groupMedian("meat_poultry"),
  offal: groupMedian("offal"),
  fish: groupMedian("fish"),
  rice: groupMedian("rice"),
  pasta: groupMedian("pasta"),
  noodle: groupMedian("noodle_dry"),
  tuber: groupMedian("tuber"),
  legume: groupMedian("legume"),
  grain: groupMedian("other_grains"),
};

interface PairLink {
  /** The state of the row this link was found by */
  own: CookState;
  /** The other row, `${source}|${source_id}` */
  other: string;
  /** Cooked grams per raw gram of this pair */
  factor: number;
}

/** Every pair a row is in, by `${source}|${source_id}`: a raw row can have several cooked rows, and the other way round */
const PAIR_LINKS = new Map<string, PairLink[]>();
const addLink = (key: string, link: PairLink) => PAIR_LINKS.set(key, [...(PAIR_LINKS.get(key) ?? []), link]);
for (const [raw, cooked, cookedPer100] of PAIRS as [string, string, number][]) {
  addLink(raw, { own: "raw", other: cooked, factor: cookedPer100 / 100 });
  addLink(cooked, { own: "cooked", other: raw, factor: cookedPer100 / 100 });
}
const rowKey = (food: Pick<FoodItem, "source" | "sourceId">) => `${food.source}|${food.sourceId}`;

/** The pairs the research lists for a food (none for a food without a source_id, or an egg: eggs go by quả) */
function pairLinksOf(food: Pick<FoodItem, "nameVi" | "source" | "sourceId">): PairLink[] {
  if (!food.sourceId || /^trứng\s/iu.test(food.nameVi)) return [];
  return PAIR_LINKS.get(rowKey(food)) ?? [];
}

const COOKED_WORDS = ["nấu chín", "chín", "luộc", "hấp", "nướng", "chiên", "rang", "áp chảo", "quay", "kho", "xào", "rim"];
const RAW_WORDS = ["sống", "hạt khô", "khô"];
// "nấu chín" before "chín", "hạt khô" before "khô": the longer word is taken first
const wordRe = (words: readonly string[], flags = "iu") => new RegExp(`(?:^|[\\s(,])(${words.join("|")})(?=$|[\\s),])`, flags);
// Built once: the pair search runs them over the whole catalogue
const COOKED_RE = wordRe(COOKED_WORDS);
const RAW_RE = wordRe(RAW_WORDS);
const STATE_WORDS_RE = wordRe([...COOKED_WORDS, ...RAW_WORDS], "giu");
// The cooked row to prefer when there are several (Cá nục luộc, nấu chín, nướng)
const COOKED_RANK = ["nấu chín", "chín", "luộc", "hấp"].map((w) => wordRe([w]));
const RAW_RANK = RAW_WORDS.map((w) => wordRe([w]));

/** The state the name says, or null when it says none ("Ức gà phi lê"). A cooking word wins: "Bún khô (luộc)" is cooked. */
export function cookStateOf(nameVi: string): CookState | null {
  if (COOKED_RE.test(nameVi)) return "cooked";
  if (RAW_RE.test(nameVi)) return "raw";
  return null;
}

/** The name without its state, to match a raw row with its cooked row: "Cá lóc (cá quả, sống)" and "Cá lóc (nấu chín)". */
export function nameStem(nameVi: string): string {
  return nameVi
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(STATE_WORDS_RE, " ")
    .replace(/[\s,]+/g, " ")
    .trim();
}

const has = (name: string, words: readonly string[]) => words.some((w) => new RegExp(`(?:^|\\s)${w}(?=$|[\\s,)])`, "iu").test(name));

// Processed, dried or canned: no cooking yield applies
const PROCESSED = ["trứng", "chả", "giò", "xúc xích", "lạp xưởng", "nem", "pate", "ruốc", "chà bông", "xông khói", "hộp", "đóng hộp", "khô", "hạt khô", "đậu", "sữa"];
const OFFAL = ["gan", "tim", "cật", "lưỡi", "mề"];
const MEAT = ["gà", "heo", "lợn", "bò", "vịt", "ngan", "ngỗng", "dê", "cừu", "thịt", "sườn", "ba chỉ", "nạc", "ức", "đùi", "cánh", "thăn", "chim cút"];
const PASTA = ["mì ý", "nui", "pasta", "spaghetti", "mì"];
const NOODLES = ["bún", "phở", "hủ tiếu", "miến"];
const TUBERS = ["khoai", "củ", "sắn", "môn"];
const GRAINS = ["yến mạch", "quinoa", "hạt kê", "kê", "kiều mạch", "lúa mạch"];

/** The yield group of a food, or null when no factor applies to it. */
export function yieldGroupOf(food: Pick<FoodItem, "nameVi" | "category">): YieldGroup | null {
  const name = food.nameVi.toLowerCase();
  if (food.category === "dam") {
    // Dry beans only: the median is a dry weight's (tofu and cooked beans have no dry weight here)
    if (/^đậu\s/.test(name) && !has(name, ["hũ", "phụ"]) && has(name, ["khô"])) return "legume";
    if (has(name, PROCESSED)) return null;
    if (/^cá\s/.test(name)) return "fish";
    if (has(name, OFFAL)) return "offal";
    if (has(name, MEAT)) return "meat";
    return null;
  }
  if (food.category === "tinh_bot") {
    if (/^(cơm|gạo)\s/.test(name)) return "rice";
    if (has(name, ["mì gói", "mì ăn liền"])) return null;
    if (has(name, NOODLES)) return "noodle";
    if (has(name, PASTA)) return "pasta";
    if (TUBERS.some((w) => name.startsWith(w)) && !has(name, ["khô", "sấy", "chiên", "bột"])) return "tuber";
    if (GRAINS.some((w) => name.startsWith(w + " ") || name === w)) return "grain";
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
 * The food's own state: its cookState when the data has one, else its side in the research pairs, else what its name
 * says, else cơm and fresh noodles are cooked and the rest raw (meat and fish rows without a word are USDA raw cuts).
 */
export function ownCookState(food: Pick<FoodItem, "nameVi" | "category" | "cookState" | "source" | "sourceId">): CookState {
  if (food.cookState) return food.cookState;
  const links = pairLinksOf(food);
  if (links.length > 0) return links[0].own;
  const said = cookStateOf(food.nameVi);
  if (said) return said;
  const group = yieldGroupOf(food);
  if (group === "rice") return /^cơm\s/i.test(food.nameVi) ? "cooked" : "raw";
  return group === "noodle" ? "cooked" : "raw";
}


/** Where a name stands among the rows to prefer for a state (stable sort: equal names keep their order) */
function rankIn(state: CookState, nameVi: string): number {
  const at = (state === "cooked" ? COOKED_RANK : RAW_RANK).findIndex((re) => re.test(nameVi));
  return at === -1 ? 99 : at;
}

function pairOf(food: FoodItem, catalog: readonly FoodItem[], own: CookState): FoodItem | null {
  const stem = nameStem(food.nameVi);
  const other: CookState = own === "raw" ? "cooked" : "raw";
  const found = catalog.filter((f) => f.id !== food.id && f.category === food.category && cookStateOf(f.nameVi) === other && nameStem(f.nameVi) === stem);
  return [...found].sort((a, b) => rankIn(other, a.nameVi) - rankIn(other, b.nameVi))[0] ?? null;
}

/**
 * The switch from the research pairs: of the other rows the catalogue has, the preferred one (nấu chín, chín, luộc,
 * hấp; then the file's order), with the yield of that very pair. With none, the file's first pair gives the yield (the
 * file lists the preferred row first wherever a row has several).
 */
function pairSwitch(own: CookState, links: readonly PairLink[], catalog: readonly FoodItem[], canSwap: boolean): CookSwitch {
  const other: CookState = own === "raw" ? "cooked" : "raw";
  const found = canSwap ? links.flatMap((link) => catalog.filter((f) => f.sourceId && rowKey(f) === link.other).map((pair) => ({ link, pair }))) : [];
  const best = found.sort((a, b) => rankIn(other, a.pair.nameVi) - rankIn(other, b.pair.nameVi))[0];
  return best ? { own, pair: best.pair, factor: best.link.factor } : { own, pair: null, factor: links[0].factor };
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
 * The Sống | Chín switch of a food, or null when it shows none. A row in the research pairs always has one (eggs aside).
 * Otherwise raw or cooked must matter for the food, and picking the other state must log something true (the paired
 * row, or a yield factor). `canSwap` is false where the logged food cannot change (editing an entry).
 */
export function cookSwitchFor(food: FoodItem, catalog: readonly FoodItem[], canSwap: boolean): CookSwitch | null {
  const own = ownCookState(food);
  const links = pairLinksOf(food).filter((l) => l.own === own);
  if (links.length > 0) return pairSwitch(own, links, catalog, canSwap);
  if (!rawCookedMatters(food)) return null;
  const pair = canSwap ? pairOf(food, catalog, own) : null;
  const group = yieldGroupOf(food);
  const factor = group ? COOKED_PER_RAW[group] : null;
  if (!pair && factor === null) return null;
  return { own, pair, factor };
}
