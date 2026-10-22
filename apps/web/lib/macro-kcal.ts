import { KCAL_PER_GRAM } from "./period";

/**
 * kcal per macro on the Hôm nay hero (feat/hero-macro-kcal): a tapped Tinh bột, Đạm or Chất béo shows the kcal from it and its
 * share of the kcal shown. Whole kcal, as the hero writes kcal. The three need not add up to the total (alcohol, rounding,
 * foods with no macro data), and nothing forces them to.
 */
export type HeroMacro = keyof typeof KCAL_PER_GRAM;

export const HERO_MACRO_LABEL: Record<HeroMacro, string> = { carbs: "Tinh bột", protein: "Đạm", fat: "Chất béo" };

/** The kcal from `grams` of a macro, whole; null when the grams are unknown. */
export function macroKcal(macro: HeroMacro, grams: number | null): number | null {
  return grams === null || !Number.isFinite(grams) ? null : Math.round(grams * KCAL_PER_GRAM[macro]);
}

/** The macro's share of the kcal shown, a whole percent; null when either is unknown or nothing was eaten. */
export function macroKcalShare(kcal: number | null, totalKcal: number | null): number | null {
  if (kcal === null || totalKcal === null || !(totalKcal > 0)) return null;
  return Math.round((kcal / totalKcal) * 100);
}

/** A tap on a macro: it is picked, or cleared when it was the one picked. */
export const toggleMacro = (current: HeroMacro | null, tapped: HeroMacro): HeroMacro | null => (current === tapped ? null : tapped);
