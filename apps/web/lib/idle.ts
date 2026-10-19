/** Runs `fn` when the browser is idle (at most `timeout` ms later); setTimeout where requestIdleCallback is missing (Safari). */
export function whenIdle(fn: () => void, timeout = 3000): () => void {
  if (typeof window === "undefined") {
    fn();
    return () => {};
  }
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}

/** Gives the main thread back (scheduler.yield where there is one, else a macrotask), so a long loop does not hold up a tap. */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
