import { MOCK_FOODS, catalogVersion, type FoodItem } from "./mock/foods";
import { COOKED_WORDS, RAW_COOKED_PAIRS, RAW_WORDS, rankIn, rowKey, cookStateOf, isPlainCooked, ownCookState, wordRe } from "./yield";

const PLAIN_RAW_RE = wordRe(["sống", "hạt khô", "khô"]);
// Words that only describe a state, or the part that is thrown away (Hao 19/10: never "bỏ vỏ" or "thịt quả" in a name)
const REFUSE_WORDS = ["bỏ vỏ", "cả vỏ", "bóc vỏ", "thịt quả", "bỏ hạt", "bỏ xương"];
const STRIP_WORDS = [...COOKED_WORDS, ...RAW_WORDS, "hầm", "áp chảo", ...REFUSE_WORDS];
const STRIP_PAREN_RE = wordRe(STRIP_WORDS);
const STRIP_BARE_RE = wordRe(STRIP_WORDS, "giu");
const REFUSE_RE = new RegExp(`\\s*(?<=^|[\\s(,/])(?:${REFUSE_WORDS.join("|")})(?=$|[\\s),/])`, "giu");

/**
 * The name without its state: the brackets that only hold a state or a cooking word go ("Cá lóc (cá quả, sống)" is
 * "Cá lóc", "Khoai lang (luộc, bỏ vỏ)" is "Khoai lang"), and so does a state word on its own ("Khoai lang luộc", "Tôm luộc").
 */
export function stripCookState(nameVi: string): string {
  const kept = nameVi.replace(/\s*\(([^)]*)\)/g, (all, inner: string) => (STRIP_PAREN_RE.test(inner) ? "" : all));
  const bare = kept.replace(STRIP_BARE_RE, (all) => all.slice(0, all.length - all.trimStart().length));
  return bare.replace(/\s+/g, " ").replace(/\s+([),])/g, "$1").trim() || nameVi;
}

/**
 * A name as a list shows it when the food has no twin: without bỏ vỏ, cả vỏ, thịt quả ("Khoai lang (nướng, cả vỏ)" is
 * "Khoai lang (nướng)"); the avocado is Bơ (trái), as Bơ lạt exists.
 */
export function tidyName(nameVi: string): string {
  const tidy = nameVi.replace(REFUSE_RE, "").replace(/\(\s*,?\s*\)/g, "").replace(/\(\s*,\s*/g, "(").replace(/,\s*\)/g, ")").replace(/\s+/g, " ").trim();
  return (tidy || nameVi).replace(/^(?:quả|trái) bơ$/i, "Bơ (trái)");
}

/**
 * cc-67 (Hao 19/10): one list row per food. A raw row and its plain cooked row (the cc-53c pairs by source + source_id,
 * and the names that only differ by sống / nấu chín / chín / luộc / hấp) are one food in a list: "Khoai lang", "Cơm trắng",
 * "Thịt bò nạc". The row opens on the state the food is usually eaten in (cơm, bún, khoai... chín; meat, fish, vegetables,
 * dry beans sống) and the portion sheet's Sống | Chín switch (lib/yield) reaches the other row.
 *
 * Rows that change the food (chiên, xào, nướng with sauce, kho, rim, rang) never join: they stay rows of their own, listed
 * after the plain one. Eggs go by quả, supplements, dishes and the user's own foods have no state: none of them group.
 */
export interface TwinGroup {
  /** The row's name, without a state: "Khoai lang" */
  name: string;
  raw: FoodItem;
  cooked: FoodItem;
  /** Every row of the food, the raw and the cooked one first (a second "luộc" row from another source follows) */
  members: FoodItem[];
  /** The row a list opens: the state the food is usually eaten in */
  start: FoodItem;
}

interface TwinIndex {
  version: number;
  size: number;
  byId: ReadonlyMap<string, TwinGroup>;
}

/** A row that can be one state of a food: not an egg, not the user's own, not a supplement or a dish. Vegetables count since cc-67. */
const canGroup = (food: FoodItem) => !/^(trứng|lòng (trắng|đỏ))(?=$|[\s(,])/iu.test(food.nameVi) && food.source !== "user" && ["dam", "tinh_bot", "rau"].includes(food.category);

/** The state a row stands for in its name: sống, the plain cooked words, or none at all (a raw row that says nothing) */
function roleOf(food: FoodItem): "raw" | "cooked" | null {
  if (isPlainCooked(food.nameVi)) return "cooked";
  return PLAIN_RAW_RE.test(food.nameVi) || (cookStateOf(food.nameVi) === null && ownCookState(food) === "raw") ? "raw" : null;
}

/** Starch staples (cơm, bún, phở, mì, miến, khoai, ngô, yến mạch) open on Chín; meat, fish, vegetables and dry beans on Sống */
const startOf = ({ raw, cooked }: Pick<TwinGroup, "raw" | "cooked">) => (raw.category === "tinh_bot" || /^(khoai|ngô)/i.test(raw.nameVi) ? cooked : raw);

function build(foods: readonly FoodItem[]): TwinIndex {
  const byId = new Map<string, TwinGroup>();
  const groups: TwinGroup[] = [];
  // A raw row takes its first cooked row, and any other plain cooked row of the same raw. A cooked row that several raw
  // rows point at (Cơm trắng) belongs to the first; the others stay rows of their own.
  const join = (raw: FoodItem, cooked: FoodItem) => {
    const group = byId.get(raw.id);
    if (!group && !byId.has(cooked.id)) {
      const made = { raw, cooked, members: [raw, cooked] } as TwinGroup;
      groups.push(made);
      byId.set(raw.id, made).set(cooked.id, made);
    } else if (group?.raw === raw && !byId.has(cooked.id) && isPlainCooked(cooked.nameVi)) {
      group.members.push(cooked);
      byId.set(cooked.id, group);
    }
  };

  // 1. The research pairs (cc-53c), in the file's order
  const byKey = new Map<string, FoodItem>();
  for (const food of foods) if (food.sourceId && !byKey.has(rowKey(food))) byKey.set(rowKey(food), food);
  for (const [rawKey, cookedKey] of RAW_COOKED_PAIRS) {
    const raw = byKey.get(rawKey);
    const cooked = byKey.get(cookedKey);
    if (raw && cooked && raw !== cooked && canGroup(raw) && canGroup(cooked)) join(raw, cooked);
  }

  // 2. Names: the rows left with the same name once the state is taken out ("Bắp cải (sống)" and "Bắp cải (luộc)").
  //    "Khoai lang (tím)" keeps its bracket, so it never joins "Khoai lang (luộc)".
  const buckets = new Map<string, { raw: FoodItem[]; cooked: FoodItem[] }>();
  for (const food of foods) {
    const role = byId.has(food.id) || !canGroup(food) ? null : roleOf(food);
    if (!role) continue;
    const key = `${food.category}|${stripCookState(food.nameVi).toLowerCase()}`;
    const bucket = buckets.get(key) ?? { raw: [], cooked: [] };
    bucket[role].push(food);
    buckets.set(key, bucket);
  }
  for (const { raw, cooked } of buckets.values()) {
    if (raw.length === 0 || cooked.length === 0) continue;
    // The row with the plain state word first (Cá chép (sống) before a bare Cá chép), nấu chín before chín, luộc, hấp
    raw.sort((a, b) => rankIn("raw", a.nameVi) - rankIn("raw", b.nameVi));
    cooked.sort((a, b) => rankIn("cooked", a.nameVi) - rankIn("cooked", b.nameVi));
    for (const row of cooked) join(raw[0], row);
    const group = byId.get(raw[0].id);
    for (const row of raw.slice(1)) if (group && !byId.has(row.id)) byId.set(row.id, group), group.members.push(row);
  }

  // The row a list opens has the name people say ("Cơm trắng", not "Gạo tẻ trắng (hạt khô)")
  for (const group of groups) {
    group.start = startOf(group);
    group.name = stripCookState(group.start.nameVi);
  }
  return { version: catalogVersion(), size: foods.length, byId };
}

let cached: TwinIndex | null = null;
function index(): TwinIndex {
  if (!cached || cached.version !== catalogVersion() || cached.size !== MOCK_FOODS.length) cached = build(MOCK_FOODS);
  return cached;
}

/** The food a row belongs to, or null for a row that is its own food. */
export function twinGroupOf(food: Pick<FoodItem, "id"> | null | undefined): TwinGroup | null {
  return food ? (index().byId.get(food.id) ?? null) : null;
}

/** What a list shows for a food: the name without its state when raw and cooked share a row, else its own name. */
export function rowName(food: Pick<FoodItem, "id" | "nameVi">): string {
  return twinGroupOf(food)?.name ?? tidyName(food.nameVi);
}

/** The ids of every row of the food ([id] for a row that is alone): a list row is selected, favourite or in the tray by any of them. */
export function twinIdsOf(food: Pick<FoodItem, "id">): readonly string[] {
  const group = twinGroupOf(food);
  return group ? group.members.map((m) => m.id) : [food.id];
}

/**
 * The list without twins: each food once, in the place of its first row, as the row it opens on (the row that is there
 * stands in when a category filter left the opening row out).
 */
export function collapseTwins(foods: readonly FoodItem[]): FoodItem[] {
  const present = new Set(foods.map((f) => f.id));
  return dedupeTwins(foods, (f) => f).map((f) => {
    const start = twinGroupOf(f)?.start;
    return start && present.has(start.id) ? start : f;
  });
}

/** Items about foods, each food once: the first item of a food keeps its place and its row (a recent keeps the state it was logged in). */
export function dedupeTwins<T>(items: readonly T[], foodOf: (item: T) => FoodItem): T[] {
  const seen = new Set<TwinGroup>();
  return items.filter((item) => {
    const group = twinGroupOf(foodOf(item));
    if (!group) return true;
    if (seen.has(group)) return false;
    seen.add(group);
    return true;
  });
}
