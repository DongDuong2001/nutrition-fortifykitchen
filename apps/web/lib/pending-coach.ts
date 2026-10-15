/**
 * A coach code that has been typed (onboarding) or opened (/join/<code>) but not used yet. It waits in
 * sessionStorage, so it survives sign-up and setup, and is cleared as soon as it has been used. Client only.
 */
const KEY = "h1t-pending-coach-code";

export function readPendingCoachCode(): string {
  try {
    return (typeof window !== "undefined" ? window.sessionStorage?.getItem(KEY) : null) ?? "";
  } catch {
    return "";
  }
}

export function writePendingCoachCode(code: string): void {
  try {
    if (typeof window === "undefined") return;
    if (code.trim() === "") window.sessionStorage?.removeItem(KEY);
    else window.sessionStorage?.setItem(KEY, code.trim());
  } catch {
    // Storage unavailable: the code is not remembered between screens.
  }
}

export function clearPendingCoachCode(): void {
  writePendingCoachCode("");
}
