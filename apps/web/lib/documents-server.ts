/**
 * Where Tài liệu lives (feat/documents): the private Supabase Storage bucket "documents", read and written with the service role
 * key, so no browser ever holds a key to it (the route handlers in app/api/documents check the access code first). Server only.
 * Setup: a private bucket named "documents" in the Supabase project (Storage › New bucket), and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLiveMode } from "./api-mode";
import { isDocumentName, type DocumentMeta } from "./documents";

const BUCKET = "documents";

let cached: ReturnType<SupabaseClient["storage"]["from"]> | null | undefined;

/** The bucket, or null outside live mode (and when the project or the key is not configured). */
function bucket() {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = isLiveMode() && url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(BUCKET) : null;
  return cached;
}

// shortcut: outside live mode the documents live in this server's memory and go with a restart, so the gates and the demo run without Supabase
const memory = new Map<string, { text: string; updatedAt: string }>();

export async function listDocuments(): Promise<DocumentMeta[]> {
  const store = bucket();
  if (!store) return [...memory].map(([name, d]) => ({ name, updatedAt: d.updatedAt, size: new TextEncoder().encode(d.text).length }));
  const { data, error } = await store.list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  // A folder or Supabase's placeholder object is not a document
  return data.filter((f) => isDocumentName(f.name)).map((f) => ({ name: f.name, updatedAt: f.updated_at ?? null, size: typeof f.metadata?.size === "number" ? f.metadata.size : null }));
}

/** The document's text, or null when there is none by that name. */
export async function readDocument(name: string): Promise<string | null> {
  const store = bucket();
  if (!store) return memory.get(name)?.text ?? null;
  const { data, error } = await store.download(name);
  if (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
  return data.text();
}

export async function writeDocument(name: string, text: string): Promise<void> {
  const store = bucket();
  if (!store) {
    memory.set(name, { text, updatedAt: new Date().toISOString() });
    return;
  }
  const { error } = await store.upload(name, text, { upsert: true, contentType: "text/plain; charset=utf-8" });
  if (error) throw error;
}
