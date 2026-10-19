import { currentAccountId, isAccountKey, isSigningOut } from "./auth-actions";
import { existingClient } from "./supabase-client";
import { onTab } from "./tab-sync";

/**
 * cc-68 (X1): two tabs, two accounts. The browser has one session cookie and one "who is signed in" key, so when tab B signs
 * in as someone else, tab A (still showing the first account's diary) would refetch and write with B's cookie, and the data
 * of the two accounts would mix both ways. A tab that finds the account is no longer the one it loaded for says so; the
 * diary then drops its state and reloads to the gate: no merge, no write.
 *
 * It looks when the key that names the account changes in another tab (the `storage` event), when the tab is shown or
 * focused again, when another tab says so (BroadcastChannel), and, when this page has a Supabase client already, on its
 * auth events (the SDK is not downloaded for this). `currentAccountId()` reads the key each time, so every write batch
 * (lib/sync-engine runOutbox) compares against the account it started for.
 */
export function watchAccount(
  provider: string | null,
  onMismatch: (now: string | null) => void,
  deps: { current?: () => string | null; skip?: () => boolean } = {}
): () => void {
  const current = deps.current ?? currentAccountId;
  const skip = deps.skip ?? isSigningOut;
  let fired = false;
  const check = () => {
    if (fired || skip()) return;
    const now = current();
    if (now === provider) return;
    fired = true;
    onMismatch(now);
  };
  const onStorage = (event: StorageEvent) => {
    if (isAccountKey(event.key)) check();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", onVisible);
  const offTab = onTab((message) => {
    if (message.type === "account") check();
  });
  let offAuth = () => {};
  try {
    const client = existingClient();
    if (client) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const email = session?.user?.email?.trim().toLowerCase();
        if (email && email !== provider && !skip() && !fired) {
          fired = true;
          onMismatch(email);
        } else if (event === "SIGNED_OUT") check();
      });
      offAuth = () => data.subscription.unsubscribe();
    }
  } catch {
    // No client to listen to: the storage key and the focus check still stand
  }
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", onVisible);
    offTab();
    offAuth();
  };
}
