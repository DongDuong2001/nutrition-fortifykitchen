/**
 * Where data and sign-in come from. "live" (NEXT_PUBLIC_API_MODE=live) uses Supabase Auth and the Go API;
 * anything else, the default, is the local mock: accounts and the diary stay in this browser. Mock mode keeps
 * every gate, probe and demo working without a backend.
 */
export function isLiveMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "live";
}

/** True when the API lives on another origin than the page. The session cookie is host-only, so it is not sent there. */
export function apiOriginDiffers(apiUrl: string, pageOrigin: string): boolean {
  try {
    return new URL(apiUrl, pageOrigin).origin !== pageOrigin;
  } catch {
    return false;
  }
}

/** Live mode only: one console warning at startup when the API is on another origin. Client only. */
export function warnIfApiCrossOrigin(apiUrl: string): void {
  if (!isLiveMode() || typeof window === "undefined") return;
  if (apiOriginDiffers(apiUrl, window.location.origin)) {
    console.warn("API khác domain: cookie đăng nhập sẽ không được gửi");
  }
}
