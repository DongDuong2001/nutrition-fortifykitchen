import { callEngine, outboxItems, syncOfflineOutbox } from "./api-client";
import { reasonSummary } from "./late-writes";

/** What is left after Đồng bộ rồi đăng xuất: how many writes are still here, and the plain reason (the commonest first). */
export interface SignOutLeft {
  left: number;
  reason: string;
}

/**
 * Hotfix 20/10: Đồng bộ rồi đăng xuất sends everything (writes refused for good included), reporting its progress, then counts what
 * is still here. `null` = nothing is left and the person can go. It never throws and never answers "nothing" for a run that
 * left writes behind, so the screen always has something to say.
 */
export async function syncBeforeSignOut(account: string | null, onProgress?: (progress: { done: number; total: number }) => void): Promise<SignOutLeft | null> {
  try {
    await syncOfflineOutbox({ retryHeld: true, onProgress });
  } catch {
    // Counted below: whatever is left is said
  }
  const items = outboxItems();
  let left = items.length;
  try {
    left = account ? await callEngine("unsyncedCount", account) : 0;
  } catch {
    // Keep the count of the list
  }
  if (left === 0) return null;
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  return { left, reason: reasonSummary(items, { online, now: Date.now() }) || "chưa gửi được" };
}
