import type { LevelStep } from "./level-copy";

/**
 * When the Level-up celebration (components/coaching/level-up.tsx) may start: there is a promotion (lib/coaching-link levelUp), the
 * person is on Hôm nay with nothing in hand that it would cover (lib/unsaved-work), "Có gì mới" and its tour are closed, and Hôm nay
 * has no sheet open and is not choosing foods. Then it still asks lib/interruption (claimLevelUp) for its place in the app open.
 */
export interface LevelUpGate {
  step: LevelStep | null;
  onHome: boolean;
  unsavedWork: boolean;
  whatsNewOpen: boolean;
  busy: boolean;
}

export function levelUpReady(g: LevelUpGate): boolean {
  return g.step !== null && g.onHome && !g.unsavedWork && !g.whatsNewOpen && !g.busy;
}
