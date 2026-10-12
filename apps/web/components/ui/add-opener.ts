/** Remembers which control opened /add, so focus can return to it. Storage may be blocked. */
export function rememberAddOpener(id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("last_add_opener_id", id);
  } catch {
    // Storage unavailable: focus falls back to the default opener.
  }
}
