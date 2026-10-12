import {
  NUTRIENT_CATALOG,
  calculateNutrientPercentage,
  type NutrientDefinition,
  type NutrientGroup,
  type TargetSource,
} from "./nutrients";
import { formatAmount } from "./format";
import { type MockDayData } from "./mock/sample-day";

/** One Vi chất row: the catalog nutrient with its amount and target for a day. Shared by Vi chất and its detail page. */
export interface NutrientRowData {
  definition: NutrientDefinition;
  consumed: number | null;
  targetMin: number | null;
  targetMax?: number;
  percentage: number | null;
  formattedAmount: string;
  targetSource: TargetSource;
  isProvisional: boolean;
}

export function buildNutrientRows(data: MockDayData | null): Record<NutrientGroup, NutrientRowData[]> {
  const result: Record<NutrientGroup, NutrientRowData[]> = {
    general: [],
    carbs: [],
    lipids: [],
    protein: [],
    vitamins: [],
    minerals: [],
  };

  if (!data) return result;

  const consumedMap: Record<string, { consumed: number | null; targetMin: number | null; targetMax?: number }> = {};

  // 1. General: Energy
  consumedMap["energy"] = {
    consumed: data.calories.consumed,
    targetMin: data.calories.targetMin,
    targetMax: data.calories.targetMax,
  };

  // 2. Macros: protein, carbs, fat, fiber
  data.macros.forEach((m) => {
    if (m.key === "protein") {
      consumedMap["protein"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "carbs") {
      consumedMap["carbs"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "fat") {
      consumedMap["fat"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "fiber") {
      consumedMap["fiber"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    }
  });

  // 3. Minerals
  data.minerals.forEach((min) => {
    consumedMap[min.key] = {
      consumed: min.consumed,
      targetMin: min.targetMin,
      targetMax: min.targetMax,
    };
  });

  // 4. Vitamins
  data.vitamins.forEach((vit) => {
    consumedMap[vit.key] = {
      consumed: vit.consumed,
      targetMin: vit.targetMin,
      targetMax: vit.targetMax,
    };
  });

  // 5. Extended nutrients (amino acids, fat breakdown, sugars, water, etc.)
  if (data.nutrients) {
    Object.entries(data.nutrients).forEach(([k, v]) => {
      if (consumedMap[k]) {
        if (consumedMap[k].consumed === null) {
          consumedMap[k].consumed = v;
        }
      } else {
        consumedMap[k] = {
          consumed: v,
          targetMin: null,
        };
      }
    });
  }

  // Assemble according to catalog order
  for (const def of NUTRIENT_CATALOG) {
    const stat = consumedMap[def.id];
    const consumed = stat ? stat.consumed : null;
    const targetMin = stat ? stat.targetMin : null;
    const targetMax = stat ? stat.targetMax : undefined;

    let percentage: number | null = null;
    if (def.targetSource !== "none" && targetMin !== null) {
      percentage = calculateNutrientPercentage(consumed, targetMin);
    }

    let formattedAmount = "—";
    if (consumed !== null) {
      formattedAmount = `${formatAmount(consumed, def.unit)} ${def.unit}`;
    }

    const isProvisional = def.targetSource === "coach-provisional" || def.targetSource === "vn2016";

    result[def.group].push({
      definition: def,
      consumed,
      targetMin,
      targetMax,
      percentage,
      formattedAmount,
      targetSource: def.targetSource,
      isProvisional,
    });
  }

  return result;
}
