/**
 * cc-68 (S5): asks the browser not to evict this site's data (the diary cache, the outbox) when the device runs low.
 * Safari clears a site's storage after 7 days without a visit; a persisted origin is exempt. Asked once per page, after
 * sign-in; the browser may say no (Chrome decides by use, Firefox asks), and nothing depends on the answer.
 */
let asked = false;

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (asked || typeof navigator === "undefined") return null;
  asked = true;
  try {
    const storage = navigator.storage;
    if (!storage?.persist) return null;
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return null;
  }
}

/** For tests. */
export function resetPersistRequest(): void {
  asked = false;
}
