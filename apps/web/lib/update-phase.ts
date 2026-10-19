/**
 * cc-68 (S10, S15): the "Có bản mới" toast reloads the page when the new service worker takes over. A reload during a send
 * would cut a request off, and with writes still waiting the person is better off seeing them go first. The update is applied
 * only when nothing waits and nothing is being sent; until then the toast says it is waiting.
 */
export type UpdatePhase = "ready" | "waiting" | "blocked";

export function updatePhase(input: { tapped: boolean; busy: boolean; saving: boolean; offline: boolean; failed: number }): UpdatePhase {
  if (!input.tapped) return "ready";
  // Something is being sent: wait for it. Nothing is, yet writes wait on the person or on the network: say so
  return input.saving || (!input.offline && input.failed === 0) || !input.busy ? "waiting" : "blocked";
}

/** The update may take over now: the person tapped Tải lại, and nothing is waiting or being sent. */
export const canApplyUpdate = (input: { tapped: boolean; busy: boolean }): boolean => input.tapped && !input.busy;
