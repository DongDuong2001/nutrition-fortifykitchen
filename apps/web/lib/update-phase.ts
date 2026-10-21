/**
 * cc-68 (S10, S15): the "Có bản mới" toast reloads the page when the new service worker takes over. A reload during a send
 * would cut a request off, and with writes still waiting the person is better off seeing them go first. The update is applied
 * only when nothing waits and nothing is being sent; until then the toast says it is waiting.
 *
 * fix/polish-1020: the person need not tap. The toast shows for UPDATE_TOAST_MS and goes; the update is applied when the app goes
 * to the background (the person is not looking: a reload costs nothing) or, failing that, by the next cold open (a waiting worker
 * takes over when the app has been closed). Either way never while writes wait.
 */
export type UpdatePhase = "ready" | "waiting" | "blocked" | "editing";

/** How long the "Có bản mới" toast stays when nobody taps it. */
export const UPDATE_TOAST_MS = 10000;

export function updatePhase(input: { tapped: boolean; busy: boolean; saving: boolean; offline: boolean; failed: number; editing?: boolean }): UpdatePhase {
  if (!input.tapped) return "ready";
  // Nothing waits to be sent, but a tray, an open portion sheet or a form holds something a reload would lose: the person finishes first
  if (input.editing && !input.busy) return "editing";
  // Something is being sent: wait for it. Nothing is, yet writes wait on the person or on the network: say so
  return input.saving || (!input.offline && input.failed === 0) || !input.busy ? "waiting" : "blocked";
}

/**
 * The update may take over now: the person tapped Tải lại, or the app is in the background, and nothing is waiting or being sent
 * (the outbox) and nothing is in hand that a reload would lose (`editing`: lib/unsaved-work: a tray, a portion sheet, a form).
 */
export const canApplyUpdate = (input: { tapped: boolean; inBackground?: boolean; busy: boolean; editing?: boolean }): boolean =>
  (input.tapped || input.inBackground === true) && !input.busy && input.editing !== true;

/**
 * A tab whose page still runs the old code after the new worker took over (another tab applied the update) reloads itself, never
 * mid-edit: only while it is in the background and nothing is waiting, being sent, or held.
 */
export const shouldReloadStaleTab = (input: { stale: boolean; hidden: boolean; busy: boolean; editing: boolean }): boolean =>
  input.stale && input.hidden && !input.busy && !input.editing;

/** The toast is on screen: until it has been up UPDATE_TOAST_MS, and for as long as a tap on Tải lại is waiting on writes. */
export const updateToastVisible = (input: { tapped: boolean; expired: boolean }): boolean => input.tapped || !input.expired;

/**
 * The new worker has taken over this page: does it reload now? Only with nothing waiting in the outbox and nothing in hand. A tap on
 * Tải lại reloads at once, in front or not (the person asked). Anything else (the app started the update on its own when it went to the
 * background, or another tab did) reloads only while the page is hidden, never under a person who came back in the meantime; the
 * reload then waits for the next time it is hidden or the next cold open.
 */
export const reloadAfterTakeover = (input: { by: "tap" | "background" | null; hidden: boolean; busy: boolean; editing: boolean }): boolean =>
  !input.busy && !input.editing && (input.by === "tap" || input.hidden);
