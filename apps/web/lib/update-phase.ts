/**
 * cc-68 (S10, S15): the "Có bản mới" toast reloads the page when the new service worker takes over. A reload during a send
 * would cut a request off, and with writes still waiting the person is better off seeing them go first. The update is applied
 * only when nothing waits and nothing is being sent; until then the toast says it is waiting.
 *
 * fix/polish-1020: the person need not tap. The toast shows for UPDATE_TOAST_MS and goes; the update is applied when the app goes
 * to the background (the person is not looking: a reload costs nothing) or, failing that, by the next cold open (a waiting worker
 * takes over when the app has been closed). Either way never while writes wait.
 */
export type UpdatePhase = "ready" | "waiting" | "blocked";

/** How long the "Có bản mới" toast stays when nobody taps it. */
export const UPDATE_TOAST_MS = 5000;

export function updatePhase(input: { tapped: boolean; busy: boolean; saving: boolean; offline: boolean; failed: number }): UpdatePhase {
  if (!input.tapped) return "ready";
  // Something is being sent: wait for it. Nothing is, yet writes wait on the person or on the network: say so
  return input.saving || (!input.offline && input.failed === 0) || !input.busy ? "waiting" : "blocked";
}

/** The update may take over now: the person tapped Tải lại, or the app is in the background, and nothing is waiting or being sent. */
export const canApplyUpdate = (input: { tapped: boolean; inBackground?: boolean; busy: boolean }): boolean =>
  (input.tapped || input.inBackground === true) && !input.busy;

/** The toast is on screen: until it has been up UPDATE_TOAST_MS, and for as long as a tap on Tải lại is waiting on writes. */
export const updateToastVisible = (input: { tapped: boolean; expired: boolean }): boolean => input.tapped || !input.expired;
