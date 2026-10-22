import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_EMOJI, EMOJI_RULES, MINH_HAO_EMOJI, foodEmoji, foodEmojiWithSource, nameWords } from "../food-emoji";
import { FOOD_CATEGORIES, type FoodCategory } from "../food-categories";
import type { FoodItem } from "../catalog";

const food = (nameVi: string, category: FoodCategory | undefined = "tinh_bot", extra: Partial<FoodItem> = {}) =>
  ({ id: `id-${nameVi}`, nameVi, category, source: "USDA", ...extra }) as FoodItem;

describe("foodEmoji: name rules", () => {
  it.each([
    ["Phở bò", "mon_viet", "🍜"],
    ["Bún bò Huế", "mon_viet", "🍜"],
    ["Hủ tiếu Nam Vang", "mon_viet", "🍜"],
    ["Miến gà", "mon_viet", "🍜"],
    ["Cơm tấm sườn", "mon_viet", "🍚"],
    ["Xôi gấc", "tinh_bot", "🍚"],
    ["Bánh mì thịt", "mon_viet", "🥖"],
    ["Trứng gà luộc", "dam", "🥚"],
    ["Hột vịt lộn", "dam", "🥚"],
    ["Ức gà (chín)", "dam", "🍗"],
    ["Thịt bò thăn", "dam", "🥩"],
    ["Thịt ba chỉ", "dam", "🥓"],
    ["Thịt heo nạc", "dam", "🥩"],
    ["Cá hồi", "dam", "🐟"],
    ["Tôm sú", "dam", "🦐"],
    ["Cua biển", "dam", "🦀"],
    ["Ghẹ", "dam", "🦀"],
    ["Mực ống", "dam", "🦑"],
    ["Nghêu", "dam", "🦪"],
    ["Sữa tươi không đường", "sua", "🥛"],
    ["Sữa chua Hy Lạp", "sua", "🥣"],
    ["Phô mai cheddar", "sua", "🧀"],
    ["Cà phê sữa đá", "do_uong", "☕"],
    ["Americano", "do_uong", "☕"],
    ["Trà sữa", "do_uong", "🍵"],
    ["Nước ngọt có ga", "do_uong", "🥤"],
    ["Redbull", "do_uong", "🥤"],
    ["Bia", "do_uong", "🍺"],
    ["Khoai lang", "tinh_bot", "🍠"],
    ["Khoai tây", "tinh_bot", "🥔"],
    ["Bắp luộc", "tinh_bot", "🌽"],
    ["Bắp cải", "rau", "🥬"],
    ["Cà rốt", "rau", "🥕"],
    ["Cà chua", "rau", "🍅"],
    ["Dưa leo", "rau", "🥒"],
    ["Rau muống", "rau", "🥬"],
    ["Cải ngọt", "rau", "🥬"],
    ["Bông cải xanh", "rau", "🥦"],
    ["Nấm rơm", "rau", "🍄"],
    ["Ớt", "gia_vi", "🌶️"],
    ["Tỏi", "gia_vi", "🧄"],
    ["Hành tây", "rau", "🧅"],
    ["Chuối", "trai_cay", "🍌"],
    ["Táo", "trai_cay", "🍎"],
    ["Cam", "trai_cay", "🍊"],
    ["Quýt", "trai_cay", "🍊"],
    ["Chanh", "trai_cay", "🍋"],
    ["Dưa hấu", "trai_cay", "🍉"],
    ["Nho", "trai_cay", "🍇"],
    ["Dứa", "trai_cay", "🍍"],
    ["Xoài", "trai_cay", "🥭"],
    ["Dừa", "trai_cay", "🥥"],
    ["Bơ", "trai_cay", "🥑"],
    ["Dâu tây", "trai_cay", "🍓"],
    ["Đào", "trai_cay", "🍑"],
    ["Lê", "trai_cay", "🍐"],
    ["Kiwi", "trai_cay", "🥝"],
    ["Đậu phộng rang", "beo", "🥜"],
    ["Hạt điều", "beo", "🌰"],
    ["Yến mạch", "tinh_bot", "🥣"],
    ["Bánh bông lan", "an_vat", "🍰"],
    ["Kẹo dẻo", "an_vat", "🍫"],
    ["Socola đen", "an_vat", "🍫"],
    ["Kem vani", "an_vat", "🍦"],
    ["Mật ong", "gia_vi", "🍯"],
    ["Muối", "gia_vi", "🧂"],
    ["Dầu ô liu", "beo", "🫒"],
  ] as const)("%s (%s) → %s", (name, category, emoji) => {
    expect(foodEmojiWithSource(food(name, category))).toEqual({ emoji, source: "rule" });
  });

  it("whole words with their marks: cá is not cà, cua is not của, trà is not trái, bò is not bơ", () => {
    expect(foodEmoji(food("Cà tím", "rau"))).toBe(CATEGORY_EMOJI.rau);
    expect(foodEmoji(food("Món của mẹ", "cua_toi"))).toBe(CATEGORY_EMOJI.cua_toi);
    expect(foodEmoji(food("Trái bơ", "trai_cay"))).toBe("🥑");
    expect(foodEmoji(food("Bơ bò", "beo"))).toBe(CATEGORY_EMOJI.beo);
    expect(foodEmoji(food("Nhãn", "trai_cay"))).toBe(CATEGORY_EMOJI.trai_cay);
    expect(nameWords("Ức gà (chín), 100g")).toBe(" ức gà chín 100g ");
  });

  it("the 21 fruits with no emoji keep their category's, never a wrong one (chanh dây is not 🍋, vú sữa is not 🥛)", () => {
    for (const name of ["Chanh dây", "Vú sữa", "Táo ta", "Dưa gang", "Mãng cầu", "Bưởi", "Thanh long", "Sầu riêng", "Mít", "Chôm chôm", "Măng cụt", "Ổi", "Vải", "Đu đủ", "Khế", "Hồng xiêm", "Me", "Cóc", "Mận", "Lựu"]) {
      expect(foodEmojiWithSource(food(name, "trai_cay"))).toEqual({ emoji: CATEGORY_EMOJI.trai_cay, source: "category" });
    }
  });

  it("names that hold another rule's word (the review sheet's rule rows)", () => {
    expect(foodEmoji(food("Gạo tám thơm", "tinh_bot"))).toBe("🍚");
    expect(foodEmoji(food("Đậu bắp", "rau"))).toBe(CATEGORY_EMOJI.rau);
    expect(foodEmoji(food("Hoa chuối (bắp chuối)", "rau"))).toBe(CATEGORY_EMOJI.rau);
    expect(foodEmoji(food("Dưa lê", "trai_cay"))).toBe(CATEGORY_EMOJI.trai_cay);
    expect(foodEmoji(food("Trai sông (trai nước ngọt)", "dam"))).toBe("🦪");
    expect(foodEmoji(food("Đậu gà", "dam"))).toBe(CATEGORY_EMOJI.dam);
    expect(foodEmoji(food("Nấm đùi gà", "rau"))).toBe("🍄");
    expect(foodEmoji(food("Cải bó xôi", "rau"))).toBe("🥬");
    expect(foodEmoji(food("Cơm dừa", "beo"))).toBe("🥥");
    expect(foodEmoji(food("Ruột chanh dây", "gia_vi"))).toBe(CATEGORY_EMOJI.gia_vi);
    expect(foodEmoji(food("Bánh tráng nướng", "an_vat"))).toBe(CATEGORY_EMOJI.an_vat);
    expect(foodEmoji(food("Nước ép thơm", "do_uong"))).toBe("🍍");
  });

  it("rules limited to a category: butter is not an avocado, oyster sauce is not olive oil, cream is not ice cream", () => {
    expect(foodEmoji(food("Bơ lạt", "sua"))).toBe(CATEGORY_EMOJI.sua);
    expect(foodEmoji(food("Dầu hào", "gia_vi"))).toBe(CATEGORY_EMOJI.gia_vi);
    expect(foodEmoji(food("Kem tươi", "sua"))).toBe(CATEGORY_EMOJI.sua);
    expect(foodEmoji(food("Bánh xèo", "mon_viet"))).toBe(CATEGORY_EMOJI.mon_viet);
  });
});

describe("foodEmoji: category fallbacks", () => {
  it("every category has one, as the brief lists", () => {
    expect(CATEGORY_EMOJI).toEqual({
      tinh_bot: "🍚", dam: "🍗", beo: "🥜", sua: "🥛", do_uong: "🥤", rau: "🥦", trai_cay: "🍎", mon_viet: "🍜", an_vat: "🍪", bo_sung: "💊", gia_vi: "🧂", cua_toi: "🍽️",
    });
    for (const c of FOOD_CATEGORIES) expect(foodEmojiWithSource(food("Zzz", c.key))).toEqual({ emoji: CATEGORY_EMOJI[c.key], source: "category" });
  });

  it("a supplement is always 💊: its name names a flavour (vị cam, Chocolate, kẹo dẻo), not a food", () => {
    expect(foodEmoji(food("Magnesium Bis-Glycinate vị cam (bột)", "bo_sung"))).toBe("💊");
    expect(foodEmoji(food("Vitamin D3 Gummies (kẹo dẻo)", "bo_sung"))).toBe("💊");
  });

  it("a food with no or an unknown category is Món ăn của tôi", () => {
    expect(foodEmoji({ ...food("Zzz"), category: undefined as unknown as FoodCategory })).toBe("🍽️");
    expect(foodEmoji({ ...food("Zzz"), category: "khac" as FoodCategory })).toBe("🍽️");
  });

  it("Đồ ăn của Minh Hào is 🍱 unless a name rule matches", () => {
    expect(foodEmoji(food("Granola Minh Hào", "tinh_bot", { source: "fortify_kitchen" as FoodItem["source"] }))).toBe(MINH_HAO_EMOJI);
    expect(foodEmoji(food("Ức gà nướng", "dam", { source: "fortify_kitchen" as FoodItem["source"] }))).toBe("🍗");
  });
});

describe("only Unicode 13 or older, no ZWJ sequences", () => {
  // Unicode 13.0 (2020) emoji used here: 🫒. Anything newer (🫛 14, 🫚 15, 🫜 16) would show as a box on Android 11 / iOS 14.
  const NEWER = /[\u{1FA7B}-\u{1FA7C}\u{1FAA9}-\u{1FAAF}\u{1FAB7}-\u{1FABF}\u{1FAC3}-\u{1FAC5}\u{1FACE}-\u{1FACF}\u{1FAD7}-\u{1FADF}\u{1FAE0}-\u{1FAFF}\u{1F6DD}-\u{1F6DF}\u{1F7F0}\u{1F979}\u{1F9CC}]/u;
  const all = [...Object.values(CATEGORY_EMOJI), MINH_HAO_EMOJI, ...EMOJI_RULES.flatMap((r) => (r.emoji ? [r.emoji] : []))];
  it.each(all)("%s", (e) => {
    expect(e).not.toContain("‍");
    expect(NEWER.test(e)).toBe(false);
  });
});

// docs/data/food-emoji-map.csv, the review sheet for Hao: EMOJI_MAP=<path to a GET /foods export (a list of rows)> npx vitest run lib/__tests__/food-emoji.test.ts
describe.runIf(!!process.env.EMOJI_MAP)("food-emoji-map.csv", () => {
  it("writes every catalogue food with its emoji and where it came from", () => {
    type Row = { id: string; name_vi: string; category?: string; source?: string; brand?: string };
    const rows = JSON.parse(readFileSync(process.env.EMOJI_MAP!, "utf8")) as Row[];
    const csv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = ["id,name,category,emoji,source"];
    let fallback = 0;
    for (const r of [...rows].sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.name_vi.localeCompare(b.name_vi, "vi"))) {
      const pick = foodEmojiWithSource({ id: r.id, nameVi: r.name_vi, category: r.category as FoodCategory, source: r.source as FoodItem["source"], brand: r.brand });
      if (pick.source === "category") fallback++;
      lines.push([r.id, r.name_vi, r.category ?? "", pick.emoji, pick.source].map(csv).join(","));
    }
    writeFileSync(join(__dirname, "../../../../docs/data/food-emoji-map.csv"), lines.join("\n") + "\n");
    console.info(`food-emoji-map.csv: ${rows.length} foods, ${fallback} on their category's emoji`);
    expect(rows.length).toBeGreaterThan(0);
  });
});
