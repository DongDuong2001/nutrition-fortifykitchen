/**
 * The motion tokens that JavaScript needs (feat/glide), mirrored in the :root of app/globals.css; lib/__tests__/motion.test.ts
 * holds the two to each other. The rest of the motion language (press, sheets, rows, push and Back) is CSS only.
 * - Switch glide (components/ui/switch-glide): content that changes in place (a chip, a tab) fades out in 80 ms, then the
 *   new content enters 16 px off to its side, 200 ms.
 * - Tab glide (EnterGlide): a bottom-nav tab or a Tổng quan sub-tab enters 12 px off, 200 ms; the old screen does not move.
 * - Reduced motion: a 120 ms cross-fade, nothing slides.
 */
export const SWITCH_OUT_MS = 80;
export const SWITCH_IN_MS = 200;
export const SWITCH_SHIFT_PX = 16;
export const TAB_IN_MS = 200;
export const TAB_SHIFT_PX = 12;
export const REDUCED_MS = 120;

/** The app's --ease-out, for the Web Animations API (CSS reads the variable). */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Which side new content comes from: +1 the right (the new chip or tab is later in the row), -1 the left, 0 the same place (a fade only). */
export function glideDirection(from: number, to: number): -1 | 0 | 1 {
  if (to === from) return 0;
  return to > from ? 1 : -1;
}
