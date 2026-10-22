// The live build's stand-ins for lib/mock/* (perf/live-bundle). next.config.ts swaps each sample module for the file of
// the same name here when NEXT_PUBLIC_API_MODE=live, so the sample day, the sample foods and their history never ship to
// the browser. Live mode never has a demo (lib/demo.ts), so it read nothing but these values before: each stub keeps the
// real module's exports and what it gives outside demo mode. lib/__tests__/live-stubs.test.ts holds them to that.
import type { MockDayData } from "../sample-day";

export type { MockDayData, MockFoodItem, MockMacroStat, MockMeal, MockMicroStat } from "../sample-day";

/**
 * The sample day with nothing logged (lib/day-history blankDay(SAMPLE_DAY)), which is all a live day starts from: the
 * meals, the macro and micro rows, their targets and labels. Without the sample's email and its desktop date label
 * (lib/date withRuntimeDate writes today's).
 */
export const SAMPLE_DAY: MockDayData & { calories: { consumed: number } } = {
  "date": "2026-10-10",
  "dateLabel": "Hôm nay 10/10",
  "user": {
    "sex": "male",
    "weightKg": 65,
    "birthYear": 2003,
    "email": "",
    "goal": "maintain",
    "goalLabel": "Giữ cân",
    "trainingMinutes": 60
  },
  "calories": {
    "consumed": 0,
    "targetMin": 2275,
    "targetMax": 2275,
    "remaining": 2275,
    "percentage": 0
  },
  "nutrients": {
    "energy": null,
    "water": null,
    "alcohol": null,
    "caffeine": null,
    "oxalate": null,
    "phytate": null,
    "carbs": null,
    "net_carbs": null,
    "fiber": null,
    "insoluble_fiber": null,
    "soluble_fiber": null,
    "starch": null,
    "sugars": null,
    "added_sugars": null,
    "fat": null,
    "monounsaturated_fat": null,
    "polyunsaturated_fat": null,
    "omega3": null,
    "ala": null,
    "dha": null,
    "epa": null,
    "omega6": null,
    "saturated_fat": null,
    "trans_fat": null,
    "cholesterol": null,
    "protein": null,
    "cystine": null,
    "histidine": null,
    "isoleucine": null,
    "leucine": null,
    "lysine": null,
    "methionine": null,
    "phenylalanine": null,
    "threonine": null,
    "tryptophan": null,
    "tyrosine": null,
    "valine": null
  },
  "macros": [
    {
      "key": "protein",
      "label": "Đạm",
      "consumed": null,
      "targetMin": 143,
      "unit": "g",
      "displayValue": "— / 143 g",
      "percentage": null
    },
    {
      "key": "carbs",
      "label": "Tinh bột",
      "consumed": null,
      "targetMin": 280,
      "unit": "g",
      "displayValue": "— / 280 g",
      "percentage": null
    },
    {
      "key": "fat",
      "label": "Chất béo",
      "consumed": null,
      "targetMin": 65,
      "unit": "g",
      "displayValue": "— / 65 g",
      "percentage": null
    },
    {
      "key": "fiber",
      "label": "Chất xơ",
      "consumed": null,
      "targetMin": 32,
      "unit": "g",
      "displayValue": "— / 32 g",
      "percentage": null
    }
  ],
  "meals": [
    {
      "id": "meal-1",
      "slot": "breakfast",
      "name": "Bữa sáng",
      "kcal": 0,
      "items": []
    },
    {
      "id": "meal-2",
      "slot": "lunch",
      "name": "Bữa trưa",
      "kcal": 0,
      "items": []
    },
    {
      "id": "meal-3",
      "slot": "preworkout",
      "name": "Trước tập",
      "kcal": 0,
      "items": []
    },
    {
      "id": "meal-4",
      "slot": "dinner",
      "name": "Bữa tối",
      "kcal": 0,
      "items": []
    },
    {
      "id": "meal-5",
      "slot": "snack",
      "name": "Bữa phụ",
      "kcal": 0,
      "items": []
    }
  ],
  "minerals": [
    {
      "key": "sodium",
      "name": "Sodium",
      "group": "mineral",
      "consumed": null,
      "targetMin": 2750,
      "targetMax": 4130,
      "unit": "mg",
      "displayValue": "— / 2.750–4.130 mg",
      "percentage": null,
      "isCoachRule": true
    },
    {
      "key": "iron",
      "name": "Iron",
      "group": "mineral",
      "consumed": null,
      "targetMin": 8,
      "unit": "mg",
      "displayValue": "— / 8 mg",
      "percentage": null,
      "isCoachRule": true
    },
    {
      "key": "zinc",
      "name": "Zinc",
      "group": "mineral",
      "consumed": null,
      "targetMin": 11,
      "unit": "mg",
      "displayValue": "— / 11 mg",
      "percentage": null,
      "isCoachRule": true
    },
    {
      "key": "phosphorus",
      "name": "Phosphorus",
      "group": "mineral",
      "consumed": null,
      "targetMin": 700,
      "unit": "mg",
      "displayValue": "— / 700 mg",
      "percentage": null,
      "isCoachRule": false
    },
    {
      "key": "selenium",
      "name": "Selenium",
      "group": "mineral",
      "consumed": null,
      "targetMin": 55,
      "unit": "µg",
      "displayValue": "— / 55 µg",
      "percentage": null,
      "isCoachRule": false
    },
    {
      "key": "copper",
      "name": "Copper",
      "group": "mineral",
      "consumed": null,
      "targetMin": 0.9,
      "unit": "mg",
      "displayValue": "— / 0,9 mg",
      "percentage": null,
      "isCoachRule": false
    },
    {
      "key": "potassium",
      "name": "Potassium",
      "group": "mineral",
      "consumed": null,
      "targetMin": 3400,
      "unit": "mg",
      "displayValue": "— / 3.400 mg",
      "percentage": null,
      "isCoachRule": true
    },
    {
      "key": "magnesium",
      "name": "Magnesium",
      "group": "mineral",
      "consumed": null,
      "targetMin": 400,
      "unit": "mg",
      "displayValue": "— / 400 mg",
      "percentage": null,
      "isCoachRule": true
    },
    {
      "key": "calcium",
      "name": "Calcium",
      "group": "mineral",
      "consumed": null,
      "targetMin": 1000,
      "unit": "mg",
      "displayValue": "— / 1.000 mg",
      "percentage": null,
      "isCoachRule": true,
      "targetSource": "coach"
    },
    {
      "key": "manganese",
      "name": "Manganese",
      "group": "mineral",
      "consumed": null,
      "targetMin": 2.3,
      "unit": "mg",
      "displayValue": "— / 2,3 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    }
  ],
  "vitamins": [
    {
      "key": "b12",
      "name": "Vitamin B12",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 2.4,
      "unit": "µg",
      "displayValue": "— / 2,4 µg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "b2",
      "name": "Vitamin B2",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 1.3,
      "unit": "mg",
      "displayValue": "— / 1,3 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "b3",
      "name": "Vitamin B3",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 16,
      "unit": "mg",
      "displayValue": "— / 16 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "b6",
      "name": "Vitamin B6",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 1.3,
      "unit": "mg",
      "displayValue": "— / 1,3 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "b5",
      "name": "Vitamin B5",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 5,
      "unit": "mg",
      "displayValue": "— / 5 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "vitamin_a",
      "name": "Vitamin A",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 900,
      "unit": "µg",
      "displayValue": "— / 900 µg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "b1",
      "name": "Vitamin B1",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 1.2,
      "unit": "mg",
      "displayValue": "— / 1,2 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "folate",
      "name": "Folate",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 400,
      "unit": "µg",
      "displayValue": "— / 400 µg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "vitamin_k",
      "name": "Vitamin K",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 120,
      "unit": "µg",
      "displayValue": "— / 120 µg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "vitamin_e",
      "name": "Vitamin E",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 15,
      "unit": "mg",
      "displayValue": "— / 15 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "vitamin_c",
      "name": "Vitamin C",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 90,
      "unit": "mg",
      "displayValue": "— / 90 mg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    },
    {
      "key": "vitamin_d",
      "name": "Vitamin D",
      "group": "vitamin",
      "consumed": null,
      "targetMin": 15,
      "unit": "µg",
      "displayValue": "— / 15 µg",
      "percentage": null,
      "isCoachRule": false,
      "targetSource": "dri"
    }
  ],
  "microsSummary": {
    "achieved": 0,
    "total": 22,
    "mineralsAchieved": 0,
    "mineralsTotal": 10,
    "vitaminsAchieved": 0,
    "vitaminsTotal": 12,
    "mostLacking": [
      "Vitamin D",
      "Vitamin E"
    ]
  }
};
