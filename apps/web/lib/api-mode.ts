/**
 * Where data and sign-in come from. "live" (NEXT_PUBLIC_API_MODE=live) uses Supabase Auth and the Go API;
 * anything else, the default, is the local mock: accounts and the diary stay in this browser. Mock mode keeps
 * every gate, probe and demo working without a backend.
 */
export function isLiveMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "live";
}
