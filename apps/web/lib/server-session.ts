/** Asks the server to re-issue (or clear) the httpOnly sb-access-token cookie from the current Supabase session. */
export async function syncServerSession(): Promise<void> {
  try {
    await fetch("/auth/session", { cache: "no-store", credentials: "same-origin" });
  } catch {
    // Offline: the cookie is re-issued by the next page request
  }
}

let refreshing: Promise<void> | null = null;

/**
 * The cookie lives as long as the access token (about 1 h) and only middleware.ts renews it, on a Next request. The
 * API is not one, so an API 401, the app coming back to the front and a 10 min timer call this. Calls that overlap
 * share one /auth/session request. Sign-in and sign-out use syncServerSession, so they never share a stale one.
 */
export function refreshServerSession(): Promise<void> {
  refreshing ??= syncServerSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}
