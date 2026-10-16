import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

/**
 * Creates a browser-compatible Supabase client using @supabase/ssr.
 * Singleton-safe for React components and client hooks.
 */
export function createClient() {
  if (typeof window !== "undefined" && clientInstance) {
    return clientInstance;
  }
  const isLive = process.env.NEXT_PUBLIC_API_MODE === "live";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isLive && (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("dummy-project"))) {
    throw new Error(
      "Missing required NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for live mode. Please check your .env.local configuration."
    );
  }

  const client = createBrowserClient(
    supabaseUrl || "https://dummy-project.supabase.co",
    supabaseAnonKey || "dummy-anon-key"
  );
  if (typeof window !== "undefined") {
    clientInstance = client;
  }
  return client;
}
