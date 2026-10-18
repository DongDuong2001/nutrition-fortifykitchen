import type { FoodItem } from "./foods";

/**
 * cc-54, demo mode only: the ingredients of the demo catalogue's Phở bò, as the food research imported them
 * (food-research/h1t-foods-units-import.json: the same source, source_id, per 100 g values and portions). The demo
 * catalogue has none of them, and the portion sheet finds a dish's ingredients by (source, source_id), never by name.
 * lib/dish-recipes adds these (demoOnly) when the recipes load in demo mode; a live catalogue has the real rows.
 */
export const DISH_DEMO_FOODS: FoodItem[] = [
  {
    id: "dish-demo-fdc-168914-banh-pho-chin",
    nameVi: "Bánh phở (tươi)",
    category: "tinh_bot",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 168914:banh-pho-chin",
    demoOnly: true,
    servings: [{ label: "100 g", grams: 100 }, { label: "1 chén vừa", grams: 176 }],
    nutrients: {alcohol: 0, b1: 0.018, b12: 0, b2: 0.004, b3: 0.072, b5: 0.011, b6: 0.006, calcium: 4, carbs: 24, cholesterol: 0, copper: 0.038, energy: 108, fat: 0.2, fiber: 1, folate: 1, iron: 0.14, magnesium: 3, manganese: 0.11, monounsaturated_fat: 0.026, phosphorus: 20, polyunsaturated_fat: 0.023, potassium: 4, protein: 1.79, saturated_fat: 0.023, selenium: 4.5, sodium: 19, sugars: 0.03, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.03, vitamin_k: 0, water: 73.8, zinc: 0.25},
  },
  {
    id: "dish-demo-fdc-171811",
    nameVi: "Thịt bò thăn (chín)",
    category: "dam",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 171811",
    demoOnly: true,
    servings: [{ label: "100 g", grams: 100 }, { label: "1 miếng nhỏ", grams: 50 }, { label: "1 miếng vừa", grams: 100 }, { label: "1 miếng lớn", grams: 150 }],
    nutrients: {alcohol: 0, b1: 0.079, b12: 1.66, b2: 0.15, b3: 8.31, b5: 0.58, b6: 0.62, calcium: 19, carbs: 0, cholesterol: 82, copper: 0.086, energy: 200, fat: 8.39, fiber: 0, folate: 10, iron: 1.84, magnesium: 25, manganese: 0.011, monounsaturated_fat: 3.35, phosphorus: 230, polyunsaturated_fat: 0.32, potassium: 370, protein: 29, saturated_fat: 3.19, selenium: 33.7, sodium: 60, sugars: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0.1, vitamin_e: 0.4, vitamin_k: 1.4, water: 62.9, zinc: 5.38},
  },
  {
    id: "dish-demo-fdc-174047",
    nameVi: "Nạm bò (chín)",
    category: "dam",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 174047",
    demoOnly: true,
    servings: [{ label: "100 g", grams: 100 }, { label: "1 miếng nhỏ", grams: 50 }, { label: "1 miếng vừa", grams: 100 }, { label: "1 miếng lớn", grams: 150 }],
    nutrients: {b1: 0.067, b12: 2.42, b2: 0.208, b3: 4.825, b5: 0.652, b6: 0.317, calcium: 16, carbs: 0, cholesterol: 97, copper: 0.115, energy: 196, fat: 6, fiber: 0, folate: 11, iron: 2.81, magnesium: 22, manganese: 0.012, monounsaturated_fat: 2.554, phosphorus: 204, polyunsaturated_fat: 0.207, potassium: 266, protein: 33.15, saturated_fat: 2.274, selenium: 34, sodium: 54, sugars: 0, vitamin_a: 0, vitamin_c: 0, vitamin_e: 0.47, vitamin_k: 1.7, water: 60.61, zinc: 7.98},
  },
  {
    id: "dish-demo-fdc-170005",
    nameVi: "Hành lá",
    category: "rau",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 170005",
    demoOnly: true,
    servings: [{ label: "1 cây nhỏ", grams: 5 }, { label: "1 cây vừa", grams: 15 }, { label: "1 cây lớn", grams: 25 }, { label: "1 muỗng canh (thái)", grams: 6 }, { label: "100 g", grams: 100 }],
    nutrients: {b1: 0.055, b12: 0, b2: 0.08, b3: 0.525, b5: 0.075, b6: 0.061, calcium: 72, carbs: 7.34, cholesterol: 0, copper: 0.083, energy: 32, fat: 0.19, fiber: 2.6, folate: 64, iron: 1.48, magnesium: 20, manganese: 0.16, monounsaturated_fat: 0.027, phosphorus: 37, polyunsaturated_fat: 0.074, potassium: 276, protein: 1.83, saturated_fat: 0.032, selenium: 0.6, sodium: 16, sugars: 2.33, trans_fat: 0, vitamin_a: 50, vitamin_c: 18.8, vitamin_d: 0, vitamin_e: 0.55, vitamin_k: 207, water: 89.83, zinc: 0.39},
  },
  {
    id: "dish-demo-fdc-170000",
    nameVi: "Hành tây",
    category: "rau",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 170000",
    demoOnly: true,
    servings: [{ label: "1 củ nhỏ", grams: 70 }, { label: "1 củ vừa", grams: 110 }, { label: "1 củ lớn", grams: 150 }, { label: "100 g", grams: 100 }],
    nutrients: {alcohol: 0, b1: 0.046, b12: 0, b2: 0.027, b3: 0.12, b5: 0.12, b6: 0.12, calcium: 23, carbs: 9.34, cholesterol: 0, copper: 0.039, energy: 40, fat: 0.1, fiber: 1.7, folate: 19, iron: 0.21, magnesium: 10, manganese: 0.13, monounsaturated_fat: 0.013, phosphorus: 29, polyunsaturated_fat: 0.017, potassium: 146, protein: 1.1, saturated_fat: 0.042, selenium: 0.5, sodium: 4, sugars: 4.24, trans_fat: 0, vitamin_a: 0, vitamin_c: 7.4, vitamin_d: 0, vitamin_e: 0.02, vitamin_k: 0.4, water: 89.1, zinc: 0.17},
  },
  {
    id: "dish-demo-fdc-169957",
    nameVi: "Giá đỗ (sống)",
    category: "rau",
    source: "usda_sr_legacy" as FoodItem["source"],
    sourceId: "FDC 169957",
    demoOnly: true,
    servings: [{ label: "1 chén", grams: 104 }, { label: "1 nắm", grams: 30 }, { label: "100 g", grams: 100 }],
    nutrients: {b1: 0.084, b12: 0, b2: 0.124, b3: 0.749, b5: 0.38, b6: 0.088, calcium: 13, carbs: 5.94, cholesterol: 0, copper: 0.164, energy: 30, fat: 0.18, fiber: 1.8, folate: 61, iron: 0.91, magnesium: 21, manganese: 0.188, monounsaturated_fat: 0.022, phosphorus: 54, polyunsaturated_fat: 0.058, potassium: 149, protein: 3.04, saturated_fat: 0.046, selenium: 0.6, sodium: 6, sugars: 4.13, trans_fat: 0, vitamin_a: 1, vitamin_c: 13.2, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 33, water: 90.4, zinc: 0.41},
  },
  {
    id: "dish-demo-nin-4094-hung-lui-song",
    nameVi: "Húng lủi",
    category: "rau",
    source: "vn_nin" as FoodItem["source"],
    sourceId: "NIN 4094:hung-lui-song",
    demoOnly: true,
    servings: [{ label: "1 nắm", grams: 10 }, { label: "1 chén (lá nén nhẹ)", grams: 20 }, { label: "100 g", grams: 100 }],
    nutrients: {b1: 0.14, b2: 0.15, b3: 1, calcium: 170, carbs: 5.4, copper: 0.74, energy: 30, fat: 0, fiber: 3, iron: 3.8, manganese: 0.88, phosphorus: 49, potassium: 216.7, protein: 2, sodium: 6.3, vitamin_a: 296.67, vitamin_c: 41, water: 91.7, zinc: 0.56},
  },
  {
    id: "dish-demo-drink-nuoc-loc",
    nameVi: "Nước lọc",
    category: "do_uong",
    source: "usda_foundation" as FoodItem["source"],
    sourceId: "drink-nuoc-loc",
    demoOnly: true,
    servings: [{ label: "1 chai (500 ml)", grams: 500 }, { label: "1 ly nhỏ (250 ml)", grams: 250 }, { label: "1 ly vừa (350 ml)", grams: 350 }, { label: "1 ly lớn (500 ml)", grams: 500 }, { label: "100 g", grams: 100 }],
    nutrients: {calcium: 2, carbs: 0, energy: 0, fat: 0, fiber: 0, magnesium: 1, potassium: 0, protein: 0, sodium: 1},
  },
];
