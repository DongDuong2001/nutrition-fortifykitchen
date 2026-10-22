/** Tùy chỉnh (feat/training-custom-minutes): any training time from 30 to 480 minutes, in 30-minute steps. */
export const CUSTOM_MINUTES_MIN = 30;
export const CUSTOM_MINUTES_MAX = 480;
export const CUSTOM_MINUTES_STEP = 30;
/** The id of the Tùy chỉnh chip (after 120 phút) on Ngày tập and in Hồ sơ */
export const CUSTOM_DURATION_ID = "custom";

/** A typed or stepped number of minutes, on the 30-minute steps between 30 and 480 (outside the range it is clamped). */
export function clampTrainingMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return CUSTOM_MINUTES_MIN;
  const stepped = Math.round(minutes / CUSTOM_MINUTES_STEP) * CUSTOM_MINUTES_STEP;
  return Math.min(CUSTOM_MINUTES_MAX, Math.max(CUSTOM_MINUTES_MIN, stepped));
}

/**
 * The minutes the API takes today (apps/api diary and profile: ErrInvalidTrainingMinutes): 0, 45, 60, 90, 120 and 240. Until Dong
 * allows 0 or 30–480 in 30-minute steps, another value stays on this device and is never sent, so nothing is refused and held.
 */
const SERVER_TRAINING_MINUTES = [0, 45, 60, 90, 120, 240];
export const serverAcceptsTrainingMinutes = (minutes: number): boolean => SERVER_TRAINING_MINUTES.includes(minutes);
