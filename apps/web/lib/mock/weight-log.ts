import { shiftIsoDate } from "../day-history";

export interface WeightLogEntry {
  /** YYYY-MM-DD */
  date: string;
  kg: number;
}

/**
 * Sample weight log: 30 daily weigh-ins, oldest first, going from 65,8 kg to the sample profile's 65 kg.
 * Index 0 is 29 days before today, the last is today. Sample data until the weight log API exists.
 */
const SAMPLE_KG = [
  65.8, 65.9, 65.7, 65.8, 65.6, 65.7, 65.5, 65.6, 65.7, 65.4, 65.5, 65.3, 65.4, 65.5, 65.2, 65.3, 65.4, 65.1,
  65.2, 65.3, 65.0, 65.1, 65.2, 64.9, 65.0, 65.1, 64.9, 65.0, 65.1, 65.0,
];

/** The sample weight log for the 30 days ending `todayIso`. */
export function weightLogSample(todayIso: string): WeightLogEntry[] {
  return SAMPLE_KG.map((kg, i) => ({ date: shiftIsoDate(todayIso, i - (SAMPLE_KG.length - 1)), kg }));
}
