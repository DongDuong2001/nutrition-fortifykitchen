import type { FoodItem } from "./catalog";
import { categoryOf, type FoodCategory } from "./food-categories";
import { isFortifyKitchenFood } from "./fortify-kitchen";

/**
 * Food icons are the phone's own emoji (Hao 22/10, option 2). foodEmoji(food): an exact id first, then the first name rule
 * that matches, then the food's category. Only emoji from Unicode 13 or older (Android 11+, iOS 14+) and no ZWJ sequences.
 * Rules match whole words of the Vietnamese name with its marks ("cá" is never "cà", "cua" is never "của"), in the order
 * below: drinks and dishes before what is in them ("Bún bò" is 🍜, "Cà phê sữa" is ☕), then proteins, produce and fruit.
 */

export type FoodEmojiSource = "id" | "rule" | "category";

/** Exact picks by food id, for a row the rules get wrong (docs/data/food-emoji-map.csv lists the category fallbacks). */
export const EMOJI_BY_ID: Readonly<Record<string, string>> = {};

export const CATEGORY_EMOJI: Readonly<Record<FoodCategory, string>> = {
  tinh_bot: "🍚",
  dam: "🍗",
  beo: "🥜",
  sua: "🥛",
  do_uong: "🥤",
  rau: "🥦",
  trai_cay: "🍎",
  mon_viet: "🍜",
  an_vat: "🍪",
  bo_sung: "💊",
  gia_vi: "🧂",
  cua_toi: "🍽️",
};
/** Đồ ăn của Minh Hào (Fortify Kitchen), when no name rule matches */
export const MINH_HAO_EMOJI = "🍱";

interface Rule {
  /** Phrases of whole words, lower case with their marks */
  words: string[];
  /** null: the food keeps its category's emoji (a fruit with no emoji of its own, "đậu phụ") */
  emoji: string | null;
  /** Only in these categories ("bơ" the fruit, not butter) */
  only?: FoodCategory[];
}

// Hao 22/10: the 21 fruits with no emoji get a drawn icon later; until then their category's, never a wrong fruit ("chanh dây" is not 🍋,
// "vú sữa" is not 🥛, "táo ta" is not an apple)
const NO_EMOJI_FRUITS = [
  "thanh long", "sầu riêng", "mít", "chôm chôm", "măng cụt", "ổi", "nhãn", "vải", "đu đủ", "khế", "mãng cầu", "na", "bưởi", "hồng xiêm",
  "vú sữa", "me", "cóc", "mận", "dưa gang", "chanh dây", "lựu", "táo ta",
];

export const EMOJI_RULES: readonly Rule[] = [
  // Anywhere: "Ruột chanh dây" is not a lemon whatever its category
  { words: NO_EMOJI_FRUITS, emoji: null },
  // Names that hold another rule's word but are not that food ("Đậu bắp" is okra, not corn; "Đậu gà" is chickpeas)
  { words: ["đậu phụ", "đậu hũ", "hạt nêm", "nước mắm", "bơ bò", "bơ lạt", "bơ thực vật", "đậu bắp", "hoa chuối", "bắp chuối", "dưa lê", "đậu gà", "bánh tráng"], emoji: null },
  { words: ["gạo"], emoji: "🍚" },
  { words: ["nấm đùi gà"], emoji: "🍄" },
  { words: ["cải bó xôi"], emoji: "🥬" },
  { words: ["cơm dừa"], emoji: "🥥" },
  { words: ["trai sông", "trai"], emoji: "🦪", only: ["dam", "mon_viet"] },
  { words: ["quả bơ", "trái bơ"], emoji: "🥑" },
  { words: ["cá cơm"], emoji: "🐟" },
  // Drinks
  { words: ["cold brew", "g7", "cà phê", "cafe", "coffee", "americano", "latte", "espresso", "cappuccino", "bạc xỉu"], emoji: "☕" },
  { words: ["trà", "matcha"], emoji: "🍵" },
  { words: ["nước ngọt", "redbull", "red bull", "coca", "pepsi", "sting", "soda"], emoji: "🥤" },
  { words: ["bia"], emoji: "🍺" },
  // Dishes
  { words: ["bánh mì"], emoji: "🥖" },
  { words: ["khoai mì", "bột mì", "lúa mì"], emoji: null },
  { words: ["phở", "bún", "mì", "hủ tiếu", "miến"], emoji: "🍜" },
  { words: ["cơm", "xôi"], emoji: "🍚" },
  // Milk and eggs
  { words: ["sữa chua", "yogurt", "yaourt"], emoji: "🥣" },
  { words: ["phô mai", "cheese"], emoji: "🧀" },
  { words: ["sữa"], emoji: "🥛" },
  { words: ["trứng", "hột vịt"], emoji: "🥚" },
  // Proteins
  { words: ["gà"], emoji: "🍗" },
  { words: ["bò"], emoji: "🥩" },
  { words: ["ba chỉ", "ba rọi", "xông khói", "bacon"], emoji: "🥓" },
  { words: ["tôm"], emoji: "🦐" },
  { words: ["cua", "ghẹ"], emoji: "🦀" },
  { words: ["mực"], emoji: "🦑" },
  { words: ["bạch tuộc"], emoji: "🐙" },
  { words: ["tép"], emoji: "🦐" },
  { words: ["sò", "ốc", "nghêu", "hàu", "hến", "vẹm", "tu hài", "bào ngư"], emoji: "🦪" },
  { words: ["cá"], emoji: "🐟" },
  // Last of the proteins: "Tôm rim thịt" is shrimp
  { words: ["heo", "lợn", "thịt"], emoji: "🥩" },
  // Vegetables
  { words: ["khoai lang"], emoji: "🍠" },
  { words: ["khoai tây"], emoji: "🥔" },
  { words: ["bắp cải", "cải bắp"], emoji: "🥬" },
  { words: ["bắp", "ngô"], emoji: "🌽" },
  { words: ["cà rốt"], emoji: "🥕" },
  { words: ["cà chua"], emoji: "🍅" },
  { words: ["dưa leo", "dưa chuột"], emoji: "🥒" },
  { words: ["bông cải", "súp lơ"], emoji: "🥦" },
  { words: ["nấm"], emoji: "🍄" },
  { words: ["ớt"], emoji: "🌶️" },
  { words: ["tỏi"], emoji: "🧄" },
  { words: ["hành"], emoji: "🧅" },
  { words: ["rau", "cải"], emoji: "🥬" },
  // Fruit
  { words: ["chuối"], emoji: "🍌" },
  { words: ["táo"], emoji: "🍎" },
  { words: ["cam", "quýt"], emoji: "🍊" },
  { words: ["chanh"], emoji: "🍋" },
  { words: ["dưa hấu"], emoji: "🍉" },
  { words: ["nho"], emoji: "🍇" },
  { words: ["dứa"], emoji: "🍍" },
  // "thơm" is pineapple only as a fruit or a drink: "Gạo tám thơm" is fragrant rice
  { words: ["thơm"], emoji: "🍍", only: ["trai_cay", "do_uong", "an_vat"] },
  { words: ["xoài"], emoji: "🥭" },
  { words: ["dừa"], emoji: "🥥" },
  { words: ["bơ"], emoji: "🥑", only: ["trai_cay"] },
  { words: ["dâu"], emoji: "🍓" },
  { words: ["đào"], emoji: "🍑", only: ["trai_cay", "do_uong", "an_vat"] },
  { words: ["lê"], emoji: "🍐", only: ["trai_cay", "do_uong", "an_vat"] },
  { words: ["kiwi"], emoji: "🥝" },
  // Nuts, grains, sweets, seasoning
  { words: ["đậu phộng", "lạc"], emoji: "🥜" },
  { words: ["hạt", "hạnh nhân", "óc chó", "mè", "vừng"], emoji: "🌰" },
  { words: ["yến mạch", "oat", "oats"], emoji: "🥣" },
  { words: ["kẹo", "socola", "sô cô la", "chocolate"], emoji: "🍫" },
  { words: ["kem"], emoji: "🍦", only: ["an_vat"] },
  { words: ["mật ong", "mật mía"], emoji: "🍯" },
  { words: ["nước lọc", "nước khoáng"], emoji: "💧" },
  { words: ["muối"], emoji: "🧂", only: ["gia_vi"] },
  { words: ["dầu"], emoji: "🫒", only: ["beo"] },
  { words: ["bánh"], emoji: "🍰", only: ["an_vat"] },
];

/** The name as whole words: lower case, NFC, punctuation as spaces, padded so " cá " finds a word. */
export function nameWords(name: string): string {
  return ` ${name.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

type EmojiFood = Pick<FoodItem, "id" | "nameVi" | "category" | "source" | "brand">;

export function foodEmojiWithSource(food: EmojiFood): { emoji: string; source: FoodEmojiSource } {
  const byId = EMOJI_BY_ID[food.id];
  if (byId) return { emoji: byId, source: "id" };
  const category = categoryOf(food as FoodItem);
  // A supplement's name names its flavour ("vị cam", "Chocolate", "kẹo dẻo"), not a food: always 💊
  if (category === "bo_sung") return { emoji: CATEGORY_EMOJI.bo_sung, source: "category" };
  const words = nameWords(food.nameVi);
  for (const rule of EMOJI_RULES) {
    if (rule.only && !rule.only.includes(category)) continue;
    if (rule.words.some((w) => words.includes(` ${w} `))) {
      return rule.emoji ? { emoji: rule.emoji, source: "rule" } : { emoji: fallback(food, category), source: "category" };
    }
  }
  return { emoji: fallback(food, category), source: "category" };
}

const fallback = (food: EmojiFood, category: FoodCategory) => (isFortifyKitchenFood(food) ? MINH_HAO_EMOJI : CATEGORY_EMOJI[category]);

/** The food's icon: the phone's own emoji. */
export const foodEmoji = (food: EmojiFood): string => foodEmojiWithSource(food).emoji;
