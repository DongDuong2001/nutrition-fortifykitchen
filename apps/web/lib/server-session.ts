/** Asks the server to re-issue (or clear) the httpOnly sb-access-token cookie from the current Supabase session. */
export async function syncServerSession(): Promise<void> {
  try {
    await fetch("/auth/session", { cache: "no-store", credentials: "same-origin" });
  } catch {
    // Offline: the cookie is re-issued by the next page request
  }
}
