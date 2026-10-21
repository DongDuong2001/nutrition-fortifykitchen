import type { FoodItem, FoodSourceRef } from "../catalog";
import { RECIPE_DISH_FOODS, RECIPE_INGREDIENT_FOODS } from "./recipe-dishes";

// The sample foods of demo and mock mode (perf/live-bundle: the data only; the store is lib/catalog.ts, which makes
// fruit weighed by grams). A live build replaces this module with lib/mock/live/sample-foods.ts (next.config.ts).

/** The database is known from the food's source; the id of the original food is not. */
const unlisted = (db: string): FoodSourceRef => ({ db, id: "chưa rõ", verified: false });

const fdc = (id: number): FoodSourceRef => ({ db: "SR Legacy", id: `FDC ${id}`, url: `https://fdc.nal.usda.gov/food-details/${id}/nutrients`, verified: false });

export const SAMPLE_FOODS: FoodItem[] = [
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
    match: "proxy",
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
  // 4. Chuối (per 100 g from FDC 173944; 1 quả = 118 g, the USDA medium banana, = 105 kcal)
  {
    id: "food-chuoi",
    category: "trai_cay",
    nameVi: "Chuối",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(173944),
    servings: [
      { label: "1 trái vừa", grams: 118 },
      { label: "1 trái nhỏ", grams: 90 },
      { label: "1 trái lớn", grams: 136 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nguồn Potassium và Vitamin B6 tự nhiên nhanh.",
    nutrients: {
      energy: 89,
      carbs: 22.84,
      net_carbs: 20.24,
      protein: 1.09,
      fat: 0.33,
      fiber: 2.6,
      potassium: 358,
      magnesium: 27,
      vitamin_c: 8.7,
      b6: 0.367,
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
    tipVi: "Giàu Iron heme và Zinc sinh khả dụng cao.",
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
  // Bánh khoai nướng Minh Hào (1 miếng = 1/10 khuôn, 102,8 g = 216 kcal): a dish with swappable parts (Hao 21/10), values as in docs/data/new-foods-2026-10-21c.json
  {
    id: "food-banh-khoai-nuong",
    category: "an_vat",
    demoOnly: true,
    nameVi: "Bánh khoai nướng Minh Hào",
    source: "fortify_kitchen" as FoodItem["source"],
    sourceId: "fortify_kitchen:banh-khoai-nuong",
    match: "unknown",
    sourceRef: unlisted("Fortify Kitchen"),
    servings: [
      { label: "1 miếng (1/10 khuôn)", grams: 102.8 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: {energy: 210.6, water: 58.4, carbs: 22.8, fiber: 3.2, fat: 10.6, monounsaturated_fat: 2.11, polyunsaturated_fat: 0.586, saturated_fat: 2.7, protein: 6.1, b1: 0.0565, b2: 0.234, b3: 0.852, b5: 0.626, b6: 0.19, folate: 19, b12: 0.196, vitamin_a: 31.1, vitamin_e: 0.693, vitamin_k: 1.5, calcium: 103, copper: 0.327, iron: 1.98, magnesium: 66.5, manganese: 0.705, phosphorus: 148, potassium: 372, selenium: 6.15, sodium: 92.7, zinc: 0.986},
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
  // 16. Trứng gà (edible grams per box size, as the live rows: food-research eggs-notes.md, 0.88 × the label midpoint)
  {
    id: "food-trung-ga",
    category: "dam",
    nameVi: "Trứng gà",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171287),
    servings: [
      { label: "1 quả vừa (trứng 50-55 g)", grams: 46.2 },
      { label: "1 quả nhỏ (trứng 45-50 g)", grams: 41.8 },
      { label: "1 quả lớn (trứng 55-60 g)", grams: 50.6 },
      { label: "1 quả rất lớn (trứng 60-65 g)", grams: 55 },
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
  // 17. Ức gà (100g = 165 kcal; FDC 171477, cooked and roasted)
  {
    id: "food-uc-ga",
    category: "dam",
    nameVi: "Ức gà phi lê",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171477),
    cookState: "cooked",
    servings: [
      { label: "100 g", grams: 100 },
      { label: "150 g", grams: 150 },
      { label: "200 g", grams: 200 },
    ],
    tipVi: "Đạm tinh khiết, ít mỡ, tối ưu cho phục hồi cơ bắp.",
    nutrients: {
      energy: 165,
      protein: 31.02,
      fat: 3.57,
      carbs: 0,
      fiber: 0,
      b3: 13.71,
      b6: 0.6,
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
    tipVi: "Giàu Folate, Vitamin K và Magnesium.",
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
  // 23. Khoai lang luộc (100g = 76 kcal; FDC 168484, boiled without skin)
  {
    id: "food-khoai-lang",
    category: "tinh_bot",
    nameVi: "Khoai lang luộc",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(168484),
    servings: [
      { label: "1 củ", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nguồn tinh bột hấp thu chậm tự nhiên và beta-carotene dồi dào.",
    nutrients: {
      energy: 76,
      carbs: 17.72,
      net_carbs: 15.22,
      protein: 1.37,
      fat: 0.14,
      fiber: 2.5,
      potassium: 230,
      vitamin_a: 787,
      vitamin_c: 12.8,
      manganese: 0.266,
      sodium: 27,
    },
  },
  // 24. Bơ (trái) (100g = 160 kcal)
  {
    id: "food-bo",
    category: "trai_cay",
    nameVi: "Bơ (trái)",
    source: "USDA",
    match: "unknown",
    sourceRef: fdc(171705),
    servings: [
      { label: "1/2 quả", grams: 100 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Chất béo đơn không bão hòa lành mạnh và giàu Potassium.",
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
  {
    id: "food-long-trang-trung-ga",
    category: "dam",
    nameVi: "Lòng trắng trứng gà",
    source: "USDA",
    match: "close",
    sourceRef: fdc(172183),
    servings: [
      { label: "1 lòng trắng", grams: 33 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Nguồn protein thuần khiết, gần như không chứa chất béo.",
    nutrients: {
      energy: 52,
      protein: 10.9,
      fat: 0.17,
      carbs: 0.73,
      fiber: 0,
      sodium: 166,
      potassium: 163,
      magnesium: 11,
    },
  },
  {
    id: "food-long-do-trung-ga",
    category: "dam",
    nameVi: "Lòng đỏ trứng gà",
    source: "USDA",
    match: "close",
    sourceRef: fdc(172184),
    servings: [
      { label: "1 lòng đỏ", grams: 17 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Giàu choline, lutein và các vitamin tan trong dầu (A, D, E).",
    nutrients: {
      energy: 322,
      protein: 15.9,
      fat: 26.5,
      carbs: 3.59,
      fiber: 0,
      vitamin_a: 381,
      vitamin_d: 5.4,
      b12: 1.95,
      iron: 2.73,
    },
  },
  {
    id: "food-com-trang",
    category: "tinh_bot",
    nameVi: "Cơm trắng (chín)",
    source: "USDA",
    match: "close",
    sourceRef: fdc(169756),
    servings: [
      { label: "100 g", grams: 100 },
      { label: "1 chén lưng", grams: 130 },
      { label: "1 chén đầy", grams: 180 },
    ],
    tipVi: "Nguồn tinh bột phổ biến, dễ tiêu hóa.",
    nutrients: {
      energy: 130,
      carbs: 28.2,
      protein: 2.7,
      fat: 0.3,
      fiber: 0.4,
      sodium: 1,
      potassium: 35,
    },
  },
  {
    id: "food-mi-y-kho",
    category: "tinh_bot",
    nameVi: "Mì ý (khô)",
    source: "USDA",
    match: "close",
    sourceRef: fdc(168936),
    servings: [
      { label: "100 g", grams: 100 },
      { label: "80 g", grams: 80 },
    ],
    tipVi: "Tinh bột chậm, GI trung bình, thích hợp nạp năng lượng tập luyện.",
    nutrients: {
      energy: 371,
      carbs: 74.7,
      protein: 13.0,
      fat: 1.5,
      fiber: 3.2,
      iron: 1.8,
      sodium: 6,
    },
  },
  {
    id: "food-red-bull",
    category: "tinh_bot",
    nameVi: "Red Bull",
    brand: "Red Bull",
    source: "USDA",
    match: "close",
    sourceRef: unlisted("USDA"),
    servings: [
      { label: "1 lon", grams: 250 },
      { label: "100 ml", grams: 100 },
    ],
    tipVi: "Nước tăng lực chứa caffeine và taurine.",
    nutrients: {
      energy: 45,
      carbs: 11.0,
      protein: 0,
      fat: 0,
      fiber: 0,
      caffeine: 32,
      sodium: 105,
      b3: 6.4,
      b5: 2.0,
      b6: 0.56,
      b12: 1.0,
    },
  },
  {
    id: "food-dau-an",
    category: "beo",
    nameVi: "Dầu ăn",
    source: "USDA",
    match: "close",
    sourceRef: fdc(171413),
    servings: [
      { label: "1 muỗng canh", grams: 14 },
      { label: "1 muỗng cà phê", grams: 5 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Chất béo tinh khiết, 1 muỗng canh ~ 124 kcal.",
    nutrients: {
      energy: 884,
      fat: 100,
      carbs: 0,
      protein: 0,
      fiber: 0,
      vitamin_e: 14.8,
      vitamin_k: 5.4,
    },
  },
  {
    id: "food-bun-dau",
    category: "dam",
    nameVi: "Bún đậu",
    source: "VN FCT",
    match: "proxy",
    sourceRef: unlisted("Bảng TPDD Việt Nam"),
    servings: [
      { label: "1 phần", grams: 350 },
      { label: "100 g", grams: 100 },
    ],
    tipVi: "Món ăn truyền thống gồm bún lá, đậu hũ rán giòn và rau thơm.",
    nutrients: {
      energy: 145,
      carbs: 18.5,
      protein: 6.8,
      fat: 4.9,
      fiber: 1.2,
      sodium: 180,
      potassium: 140,
      calcium: 65,
    },
  },
  {
    id: "11111111-2222-4333-8444-555555555555",
    category: "bo_sung",
    nameVi: "CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle",
    brand: "CanPrev",
    source: "label",
    match: "close",
    sourceRef: unlisted("Nhãn bao bì"),
    servings: [
      { label: "1 viên", grams: 1 },
    ],
    tipVi: "Magnesium hữu cơ êm dịu dạ dày, hỗ trợ thư giãn cơ bắp.",
    nutrients: {
      energy: null,
      carbs: null,
      protein: null,
      fat: null,
      fiber: null,
      magnesium: 8000,
    },
  },
];

// cc-67: raw rows for the sample's cooked ones, so the demo shows one row per food (lib/food-twins): "Khoai lang" opens on
// Chín (Khoai lang luộc) and Sống switches to this row. USDA SR Legacy sweet potato, raw (FDC 168482), per 100 g.
SAMPLE_FOODS.push({
  id: "food-khoai-lang-song",
  category: "tinh_bot",
  nameVi: "Khoai lang (sống)",
  source: "USDA",
  demoOnly: true,
  match: "unknown",
  sourceRef: fdc(168482),
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: {
    energy: 86,
    carbs: 20.12,
    protein: 1.57,
    fat: 0.05,
    fiber: 3,
  },
});

SAMPLE_FOODS.push(...RECIPE_INGREDIENT_FOODS, ...RECIPE_DISH_FOODS);

// Hao 21/10: Đồ ăn của Minh Hào has demo rows, so the chip, the Khám phá carousel and their probes have data. Demo only
// (never in the live bundle: lib/mock/live/sample-foods.ts is empty), named "(mẫu demo)" so nobody takes them for the
// real rows of Fortify Kitchen that the import brings. Plain foods: a weighed portion first, never parts or ingredients.
const FORTIFY_DEMO_SOURCE = "fortify_kitchen" as FoodItem["source"];
SAMPLE_FOODS.push(
  {
    id: "demo-fk-uc-ga",
    category: "mon_viet",
    nameVi: "Ức gà nấu chậm Minh Hào (mẫu demo)",
    brand: "Fortify Kitchen",
    source: FORTIFY_DEMO_SOURCE,
    sourceId: "fortify_kitchen:demo-uc-ga",
    match: "unknown",
    sourceRef: unlisted("Fortify Kitchen"),
    demoOnly: true,
    servings: [
      { label: "1 phần lẻ (150 g sống)", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: { energy: 136, protein: 22.6, fat: 2.7, carbs: 3.8, fiber: 0.1, sugars: 3.09, saturated_fat: 0.567, sodium: 141 },
  },
  {
    id: "demo-fk-tom-the",
    category: "mon_viet",
    nameVi: "Tôm thẻ nấu chậm Minh Hào (mẫu demo)",
    brand: "Fortify Kitchen",
    source: FORTIFY_DEMO_SOURCE,
    sourceId: "fortify_kitchen:demo-tom-the",
    match: "unknown",
    sourceRef: unlisted("Fortify Kitchen"),
    demoOnly: true,
    servings: [
      { label: "1 phần lẻ (150 g sống)", grams: 150 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: { energy: 87, protein: 13.7, fat: 1.1, carbs: 4.7, fiber: 0.1, sugars: 3.09, saturated_fat: 0.265, sodium: 662 },
  },
  {
    id: "demo-fk-mi-y",
    category: "mon_viet",
    nameVi: "Mì Ý sốt cà Minh Hào (mẫu demo)",
    brand: "Fortify Kitchen",
    source: FORTIFY_DEMO_SOURCE,
    sourceId: "fortify_kitchen:demo-mi-y-sot-ca",
    match: "unknown",
    sourceRef: unlisted("Fortify Kitchen"),
    demoOnly: true,
    servings: [
      { label: "1 phần", grams: 370.9 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: { energy: 102.2, protein: 3.5, fat: 1.5, carbs: 18.9, fiber: 1.7, saturated_fat: 0.398, sodium: 145 },
  }
);
