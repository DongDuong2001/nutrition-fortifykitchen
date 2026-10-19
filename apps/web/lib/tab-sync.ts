/**
 * cc-68 (S8): tabs of one browser tell each other what changed. One BroadcastChannel; without it (an old browser, a
 * test) nothing is sent and each tab keeps working on its own, as before.
 *  - "outbox": a tab changed the outbox of `scope`; the others read it again from storage
 *  - "diary": a tab changed the diary of `scope` (a sync brought new days); the others reload their state
 *  - "account": the signed-in account changed (sign-in, sign-out); the others check theirs
 *  - "wipe": a tab signed out and wiped the local data of `scope`
 */
export type TabMessage =
  | { type: "outbox"; scope: string }
  | { type: "diary"; scope: string }
  | { type: "account"; account: string | null }
  | { type: "wipe"; scope: string };

export const TAB_CHANNEL = "h1t-sync";
/** This tab, so it can ignore what it sent itself (a BroadcastChannel never delivers to its own instance, but a test double may). */
export const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface Envelope {
  from: string;
  message: TabMessage;
}

let channel: BroadcastChannel | null | undefined;
const listeners = new Set<(message: TabMessage) => void>();

function open(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    if (typeof BroadcastChannel === "undefined") return (channel = null);
    channel = new BroadcastChannel(TAB_CHANNEL);
    channel.onmessage = (event: MessageEvent<Envelope>) => {
      const data = event.data;
      if (!data || data.from === TAB_ID || !data.message) return;
      for (const fn of [...listeners]) fn(data.message);
    };
  } catch {
    channel = null;
  }
  return channel;
}

/** Tells the other tabs. */
export function postTab(message: TabMessage): void {
  try {
    open()?.postMessage({ from: TAB_ID, message } satisfies Envelope);
  } catch {
    // Closed channel: the other tabs find out on their next sync
  }
}

/** Runs `fn` for what other tabs send. Returns the unsubscribe. */
export function onTab(fn: (message: TabMessage) => void): () => void {
  open();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** For tests: forget the channel and the listeners. */
export function resetTabSync(): void {
  try {
    if (channel) channel.close();
  } catch {
    // Already closed
  }
  channel = undefined;
  listeners.clear();
}
