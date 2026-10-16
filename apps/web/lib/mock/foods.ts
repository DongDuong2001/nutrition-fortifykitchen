import type { FoodCategory } from "../food-categories";
import { demoActive } from "../demo";

export interface FoodServing {
  label: string;
  grams: number;
  /** The chip text when it should not be built from label and grams ("½ phần"). */
  display?: string;
}

export interface FoodItem {
  id: string;
  nameVi: string;
  category: FoodCategory;
  brand?: string;
  source: "USDA" | "VN FCT" | "user";
  servings: FoodServing[];
  tipVi?: string;
  nutrients: Record<string, number | null>; // per 100g
  /** Sample food of the demo day: found in lists and search only in demo mode (see browsableFoods). */
  demoOnly?: boolean;
  /** How close the numbers are to this very food. Missing, like "unknown", reads as Chưa rõ nguồn: never as exact. */
  match?: FoodMatch;
  /** Where the numbers come from: the database, the id of the original food there and a link to it. */
  sourceRef?: FoodSourceRef;
}

/**
 * exact: this food. close: the same food, cooked or made another way. proxy: a similar food stands in for it.
 * unknown: nobody has checked yet, so no claim is made.
 */
export type FoodMatch = "exact" | "close" | "proxy" | "unknown";

export interface FoodSourceRef {
  db: string;
  id: string;
  url?: string;
  /** True only once someone has opened the source and confirmed it is this food. Every ref starts false. */
  verified?: boolean;
}

/** The database is known from the food's source; the id of the original food is not. */
const unlisted = (db: string): FoodSourceRef => ({ db, id: "chưa rõ", verified: false });

const fdc = (id: number): FoodSourceRef => ({ db: "SR Legacy", id: `FDC ${id}`, url: `https://fdc.nal.usda.gov/food-details/${id}/nutrients`, verified: false });

/**
 * The catalogue as lists and search read it. Foods that only exist for the demo day are left out unless demo mode
 * is on. Look-ups by id (a saved entry, a recent, a favourite) read MOCK_FOODS directly and still find them.
 */
export function browsableFoods(): FoodItem[] {
  return demoActive() ? MOCK_FOODS : MOCK_FOODS.filter((f) => !f.demoOnly);
}

export const MOCK_FOODS: FoodItem[] = [
  // 1. Chà là (calibrated so 30g gives 84 kcal, 22g carb, 197mg kali, 0.7g protein, 0.1g fat, 2g fiber)
  {
    id: "food-cha-la",
    category: "trai_cay",
    nameVi: "Chà là",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(168191),
    servings: [
      { label: "30 g", grams: 30 },
      { label: "3 quả", grams: 30 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nên dùng 30 g đầu buổi tập · tinh bột hấp thu chậm. 2–3 quả trước tập 30–45 phút.",
    nutrients: {
      energy: 280, // 280 * 0.3 = 84 kcal
      carbs: 73.33, // 73.33 * 0.3 = 22.0 g
      net_carbs: 66.66,
      protein: 2.33, // 2.33 * 0.3 = 0.7 g
      fat: 0.33, // 0.33 * 0.3 = 0.1 g
      fiber: 6.67, // 6.67 * 0.3 = 2.0 g
      potassium: 656.67, // 656.67 * 0.3 = 197.0 mg
      calcium: 63.33, // 63.33 * 0.3 = 19.0 mg
      magnesium: 43.33, // 43.33 * 0.3 = 13.0 mg
      iron: 1.0, // 1.0 * 0.3 = 0.3 mg
      copper: 0.33, // 0.33 * 0.3 = 0.1 mg
      b6: 0.17, // 0.17 * 0.3 = 0.05 mg
      sodium: 3.33,
      sugars: 63.0,
      monounsaturated_fat: 0.03,
      polyunsaturated_fat: 0.03,
      saturated_fat: 0.03,
    },
  },
  // 2. Yến mạch (60g = 228 kcal)
  {
    id: "food-yen-mach",
    category: "tinh_bot",
    nameVi: "Yến mạch",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(173904),
    servings: [
      { label: "60 g", grams: 60 },
      { label: "1 chén", grams: 40 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Tinh bột phức giàu beta-glucan, no lâu.",
    nutrients: {
      energy: 380, // 380 * 0.6 = 228 kcal
      carbs: 66.67, // 40 g / 60g
      net_carbs: 56.67,
      protein: 13.33, // 8 g / 60g
      fat: 6.67, // 4 g / 60g
      fiber: 10.0, // 6 g / 60g
      potassium: 350,
      magnesium: 138,
      iron: 4.25,
      zinc: 3.64,
      phosphorus: 410,
      b1: 0.46,
      sodium: 6,
    },
  },
  // 3. Yogurt kefir (200 ml ~ 200g = 126 kcal)
  {
    id: "food-yogurt-kefir",
    category: "sua",
    nameVi: "Yogurt kefir",
    brand: "Vinamilk",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171284),
    servings: [
      { label: "200 ml", grams: 200 },
      { label: "1 hộp", grams: 100 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Lợi khuẩn đường ruột, hỗ trợ hấp thu vi chất.",
    nutrients: {
      energy: 63, // 63 * 2 = 126 kcal
      carbs: 4.5, // 9 g / 200g
      protein: 3.5, // 7 g / 200g
      fat: 3.5, // 7 g / 200g
      calcium: 120, // 240 mg / 200g
      potassium: 150,
      sodium: 50,
      b12: 0.3,
      b2: 0.18,
      fiber: 0,
    },
  },
  // 4. Chuối (1 quả ~ 100g = 105 kcal)
  {
    id: "food-chuoi",
    category: "trai_cay",
    nameVi: "Chuối",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(173944),
    servings: [
      { label: "1 quả", grams: 100 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nguồn kali và vitamin B6 tự nhiên nhanh.",
    nutrients: {
      energy: 105,
      carbs: 27,
      net_carbs: 23.9,
      protein: 1.3,
      fat: 0.3,
      fiber: 3.1,
      potassium: 422,
      magnesium: 32,
      vitamin_c: 10.3,
      b6: 0.43,
      sodium: 1,
    },
  },
  // 5. Cơm gạo lứt (150g = 168 kcal)
  {
    id: "food-com-gao-lut",
    category: "tinh_bot",
    nameVi: "Cơm gạo lứt",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "150 g", grams: 150 },
      { label: "1 bát", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 112, // 112 * 1.5 = 168 kcal
      carbs: 23.33, // 35 g / 150g
      net_carbs: 21.66,
      protein: 2.33, // 3.5 g / 150g
      fat: 0.8, // 1.2 g / 150g
      fiber: 1.67, // 2.5 g / 150g
      magnesium: 43,
      potassium: 86,
      phosphorus: 115,
      manganese: 0.9,
      sodium: 2,
    },
  },
  // 6. Thịt bò nạc (150g = 320 kcal)
  {
    id: "food-thit-bo-nac",
    category: "dam",
    nameVi: "Thịt bò nạc",
    source: "USDA",
    sourceRef: unlisted("USDA"),
    match: "close",
    servings: [
      { label: "150 g", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Giàu sắt heme và kẽm sinh khả dụng cao.",
    nutrients: {
      energy: 213.33, // 213.33 * 1.5 = 320 kcal
      protein: 26.0, // 39 g / 150g
      fat: 12.0, // 18 g / 150g
      carbs: 0,
      fiber: 0,
      iron: 2.6, // 3.9 mg / 150g
      zinc: 5.47, // 8.2 mg / 150g
      b12: 2.1,
      potassium: 350,
      sodium: 65,
    },
  },
  // 7. Bột củ dền (3g = 10 kcal)
  {
    id: "food-bot-cu-den",
    category: "bo_sung",
    nameVi: "Bột củ dền",
    brand: "Dalahouse",
    source: "user",
    match: "unknown",
    sourceRef: unlisted("Nhãn bao bì"),
    demoOnly: true,
    servings: [
      { label: "3 g", grams: 3 },
      { label: "1 muỗng", grams: 3 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Giàu nitrate tự nhiên tăng giãn mạch và sức bền.",
    nutrients: {
      energy: 333.33, // 333.33 * 0.03 = 10 kcal
      carbs: 66.67, // 2 g / 3g
      protein: 13.33,
      fat: 1.0,
      fiber: 20.0,
      potassium: 1200,
      folate: 350,
      iron: 6.5,
      sodium: 180,
    },
  },
  // 8. Mật mía (20g / 1 muỗng = 58 kcal)
  {
    id: "food-mat-mia",
    category: "an_vat",
    nameVi: "Mật mía",
    brand: "Golden Barrel",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(168820),
    servings: [
      { label: "1 muỗng", grams: 20 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Tinh bột hấp thu nhanh bổ sung trong buổi tập kéo dài.",
    nutrients: {
      energy: 290, // 290 * 0.2 = 58 kcal
      carbs: 75.0, // 15 g / 20g
      net_carbs: 75.0,
      protein: 0,
      fat: 0,
      fiber: 0,
      potassium: 1464,
      calcium: 205,
      iron: 4.7,
      magnesium: 242,
      sodium: 37,
    },
  },
  // 9. Bánh tráng (10g = 33 kcal)
  {
    id: "food-banh-trang",
    category: "tinh_bot",
    nameVi: "Bánh tráng",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "10 g", grams: 10 },
      { label: "3 cái", grams: 30 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 330,
      carbs: 78,
      protein: 4.2,
      fat: 0.5,
      fiber: 1.2,
      sodium: 310,
      potassium: 55,
    },
  },
  // 10. Bánh tráng nướng (50g / 1 cái = 95 kcal)
  {
    id: "food-banh-trang-nuong",
    category: "an_vat",
    nameVi: "Bánh tráng nướng",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 cái", grams: 50 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 190,
      carbs: 26,
      protein: 5.5,
      fat: 7.2,
      fiber: 1.0,
      sodium: 280,
      calcium: 45,
    },
  },
  // 11. Bún chả Hà Nội (100g = 185 kcal)
  {
    id: "food-bun-cha",
    category: "mon_viet",
    nameVi: "Bún chả Hà Nội",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 phần", grams: 350 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 185,
      carbs: 22,
      protein: 11.5,
      fat: 5.5,
      fiber: 1.2,
      sodium: 460,
      calcium: 38,
      iron: 1.6,
    },
  },
  // 12. Phở bò (1 tô ~ 600g = 450 kcal)
  {
    id: "food-pho-bo",
    category: "mon_viet",
    nameVi: "Phở bò",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 tô", grams: 600 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 75,
      carbs: 10.5,
      protein: 4.8,
      fat: 1.8,
      sodium: 380,
      potassium: 95,
      iron: 0.8,
      fiber: 0.5,
    },
  },
  // 13. Cơm tấm sườn (1 dĩa ~ 400g = 620 kcal)
  {
    id: "food-com-tam-suon",
    category: "mon_viet",
    nameVi: "Cơm tấm sườn",
    source: "VN FCT",
    sourceRef: unlisted("VN FCT"),
    match: "proxy",
    servings: [
      { label: "1 dĩa", grams: 400 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 155,
      carbs: 21,
      protein: 7.5,
      fat: 4.8,
      sodium: 310,
      potassium: 120,
      iron: 1.1,
      fiber: 0.8,
    },
  },
  // 14. Bánh mì thịt (1 ổ ~ 200g = 420 kcal)
  {
    id: "food-banh-mi-thit",
    category: "mon_viet",
    nameVi: "Bánh mì thịt",
    source: "VN FCT",
    sourceRef: unlisted("VN FCT"),
    match: "close",
    servings: [
      { label: "1 ổ", grams: 200 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 210,
      carbs: 28,
      protein: 9.5,
      fat: 6.8,
      sodium: 450,
      potassium: 140,
      iron: 1.4,
      fiber: 1.8,
    },
  },
  // 15. Bún bò Huế (1 tô ~ 600g = 530 kcal)
  {
    id: "food-bun-bo-hue",
    category: "mon_viet",
    nameVi: "Bún bò Huế",
    source: "VN FCT",
    sourceRef: unlisted("VN FCT"),
    match: "proxy",
    servings: [
      { label: "1 tô", grams: 600 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 88.33,
      carbs: 11.2,
      protein: 5.6,
      fat: 2.5,
      sodium: 420,
      potassium: 110,
      iron: 1.0,
      fiber: 0.6,
    },
  },
  // 16. Trứng gà (1 quả ~ 55g = 78 kcal)
  {
    id: "food-trung-ga",
    category: "dam",
    nameVi: "Trứng gà",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171287),
    servings: [
      { label: "1 quả", grams: 55 },
      { label: "2 quả", grams: 110 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Protein chuẩn tham chiếu, giàu lutein.",
    nutrients: {
      energy: 142,
      protein: 12.6,
      fat: 9.5,
      carbs: 0.7,
      fiber: 0,
      vitamin_a: 160,
      vitamin_d: 2.0,
      b12: 0.89,
      selenium: 31,
      cholesterol: 372,
      sodium: 142,
      potassium: 138,
      iron: 1.75,
    },
  },
  // 17. Ức gà (100g = 165 kcal)
  {
    id: "food-uc-ga",
    category: "dam",
    nameVi: "Ức gà phi lê",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171077),
    servings: [
      { label: "100 g", grams: 100 },
      { label: "150 g", grams: 150 },
      { label: "200 g", grams: 200 },
    ],
    tipVi: "Đạm tinh khiết, ít mỡ, tối ưu cho phục hồi cơ bắp.",
    nutrients: {
      energy: 165,
      protein: 31.0,
      fat: 3.6,
      carbs: 0,
      fiber: 0,
      b3: 13.7,
      b6: 0.88,
      phosphorus: 228,
      potassium: 256,
      sodium: 74,
      selenium: 27.6,
    },
  },
  // 18. Cá hồi (100g = 208 kcal)
  {
    id: "food-ca-hoi",
    category: "dam",
    nameVi: "Cá hồi",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(175167),
    servings: [
      { label: "100 g", grams: 100 },
      { label: "150 g", grams: 150 },
    ],
    tipVi: "Giàu Omega-3 tự nhiên (EPA + DHA) và Vitamin D.",
    nutrients: {
      energy: 208,
      protein: 20.4,
      fat: 13.4,
      carbs: 0,
      fiber: 0,
      omega3: 2.5,
      dha: 1.4,
      epa: 0.9,
      vitamin_d: 11.0,
      b12: 3.2,
      potassium: 363,
      selenium: 36.5,
      sodium: 59,
    },
  },
  // 19. Đậu hũ (100g = 76 kcal)
  {
    id: "food-dau-hu",
    category: "dam",
    nameVi: "Đậu hũ trắng",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 bìa", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 76,
      protein: 8.1,
      fat: 4.8,
      carbs: 1.9,
      fiber: 0.3,
      calcium: 350,
      iron: 5.4,
      magnesium: 30,
      potassium: 121,
      sodium: 7,
    },
  },
  // 20. Rau muống (100g = 19 kcal)
  {
    id: "food-rau-muong",
    category: "rau",
    nameVi: "Rau muống",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 dĩa luộc", grams: 200 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 19,
      carbs: 2.1,
      protein: 2.6,
      fat: 0.2,
      fiber: 2.1,
      calcium: 100,
      iron: 1.4,
      vitamin_c: 23,
      vitamin_a: 320,
      potassium: 312,
      sodium: 25,
    },
  },
  // 21. Cải bó xôi (100g = 23 kcal)
  {
    id: "food-cai-bo-xoi",
    category: "rau",
    nameVi: "Cải bó xôi (Spinach)",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(168462),
    servings: [
      { label: "100 g", grams: 100 },
      { label: "1 chén", grams: 30 },
    ],
    tipVi: "Giàu folate, vitamin K và magie.",
    nutrients: {
      energy: 23,
      carbs: 3.6,
      protein: 2.9,
      fat: 0.4,
      fiber: 2.2,
      folate: 194,
      vitamin_k: 483,
      vitamin_a: 469,
      vitamin_c: 28,
      iron: 2.7,
      magnesium: 79,
      potassium: 558,
      sodium: 79,
    },
  },
  // 22. Sữa tươi không đường (100ml ~ 100g = 62 kcal)
  {
    id: "food-sua-tuoi",
    category: "sua",
    nameVi: "Sữa tươi không đường",
    brand: "TH True Milk",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 hộp 180 ml", grams: 180 },
      { label: "1 ly 250 ml", grams: 250 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 62,
      protein: 3.2,
      fat: 3.5,
      carbs: 4.5,
      fiber: 0,
      calcium: 110,
      potassium: 150,
      phosphorus: 90,
      b2: 0.17,
      sodium: 44,
    },
  },
  // 23. Khoai lang (100g = 86 kcal)
  {
    id: "food-khoai-lang",
    category: "tinh_bot",
    nameVi: "Khoai lang luộc",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(168482),
    servings: [
      { label: "1 củ", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nguồn tinh bột hấp thu chậm tự nhiên và beta-carotene dồi dào.",
    nutrients: {
      energy: 86,
      carbs: 20.1,
      net_carbs: 17.1,
      protein: 1.6,
      fat: 0.1,
      fiber: 3.0,
      potassium: 337,
      vitamin_a: 709,
      vitamin_c: 2.4,
      manganese: 0.26,
      sodium: 55,
    },
  },
  // 24. Quả bơ (100g = 160 kcal)
  {
    id: "food-bo",
    category: "trai_cay",
    nameVi: "Quả bơ",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171705),
    servings: [
      { label: "1/2 quả", grams: 100 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Chất béo đơn không bão hòa lành mạnh và giàu kali.",
    nutrients: {
      energy: 160,
      fat: 14.7,
      monounsaturated_fat: 9.8,
      polyunsaturated_fat: 1.8,
      saturated_fat: 2.1,
      carbs: 8.5,
      fiber: 6.7,
      net_carbs: 1.8,
      protein: 2.0,
      potassium: 485,
      folate: 81,
      vitamin_e: 2.07,
      vitamin_k: 21,
      magnesium: 29,
      sodium: 7,
    },
  },
  // 25. Hạt điều (100g = 553 kcal)
  {
    id: "food-hat-dieu",
    category: "beo",
    nameVi: "Hạt điều rang",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "1 nắm (~30 g)", grams: 30 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 553,
      fat: 43.8,
      protein: 18.2,
      carbs: 30.2,
      fiber: 3.3,
      magnesium: 292,
      copper: 2.2,
      iron: 6.7,
      zinc: 5.8,
      phosphorus: 593,
      potassium: 660,
      sodium: 12,
    },
  },
  // 26. Hạnh nhân (100g = 579 kcal)
  {
    id: "food-hanh-nhan",
    category: "beo",
    nameVi: "Hạnh nhân",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(170567),
    servings: [
      { label: "1 nắm (~30 g)", grams: 30 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 579,
      fat: 49.9,
      protein: 21.2,
      carbs: 21.6,
      fiber: 12.5,
      vitamin_e: 25.6,
      magnesium: 270,
      calcium: 269,
      b2: 1.14,
      potassium: 733,
      sodium: 1,
    },
  },
  // 27. Bưởi (100g = 42 kcal)
  {
    id: "food-buoi",
    category: "trai_cay",
    nameVi: "Bưởi da xanh",
    source: "VN FCT",
    match: "unknown",
    sourceRef: unlisted("VN FCT"),
    servings: [
      { label: "3 múi", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 42,
      carbs: 10.6,
      protein: 0.8,
      fat: 0.1,
      fiber: 1.6,
      vitamin_c: 61,
      potassium: 216,
      sodium: 2,
    },
  },
  // 28. Táo (100g = 52 kcal)
  {
    id: "food-tao",
    category: "trai_cay",
    nameVi: "Táo Envy",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171688),
    servings: [
      { label: "1 quả", grams: 180 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 52,
      carbs: 13.8,
      net_carbs: 11.4,
      fiber: 2.4,
      protein: 0.3,
      fat: 0.2,
      potassium: 107,
      vitamin_c: 4.6,
      sodium: 1,
    },
  },
  // 29. Bông cải xanh (Broccoli) (100g = 34 kcal)
  {
    id: "food-bong-cai-xanh",
    category: "rau",
    nameVi: "Bông cải xanh",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(170379),
    servings: [
      { label: "1 chén hấp", grams: 100 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {
      energy: 34,
      carbs: 6.6,
      protein: 2.8,
      fat: 0.4,
      fiber: 2.6,
      vitamin_c: 89.2,
      vitamin_k: 101.6,
      folate: 63,
      potassium: 316,
      calcium: 47,
      sodium: 33,
    },
  },
  // 30. Whey Protein Isolate (30g = 110 kcal)
  {
    id: "food-whey-protein",
    category: "bo_sung",
    nameVi: "Whey Protein Isolate",
    brand: "Optimum Nutrition",
    source: "USDA",
    match: "unknown",
    sourceRef: unlisted("USDA"),
    servings: [
      { label: "1 muỗng (30 g)", grams: 30 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Hấp thu cực nhanh sau buổi tập, leucine > 2,5 g.",
    nutrients: {
      energy: 367, // 367 * 0.3 = 110 kcal
      protein: 80.0, // 24 g / 30g
      fat: 1.0,
      carbs: 3.33, // 1 g / 30g
      fiber: 0,
      calcium: 433,
      potassium: 467,
      sodium: 167,
      leucine: 8.6,
      isoleucine: 4.8,
      valine: 4.5,
    },
  },
];
