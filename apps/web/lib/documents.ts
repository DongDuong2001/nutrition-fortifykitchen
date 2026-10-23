/**
 * Tài liệu (feat/documents): the app's documents and rules, markdown kept in the Supabase bucket "documents" (lib/documents-server
 * on the server). Everyone may read them; a write needs the access code (ACCESS_CODE of the environment), which the browser keeps
 * for the tab in sessionStorage and sends in the x-access-code header. Pure helpers and the fetch calls of the screen.
 */

const DOCUMENTS_API = "/api/documents";
export const ACCESS_CODE_HEADER = "x-access-code";
export const MAX_DOCUMENT_BYTES = 1_000_000;

/** A file name the bucket takes as one object: letters, digits, "_", "-" and ".", no leading dot, no "..", at most 100 characters. */
export function isDocumentName(name: string): boolean {
  // shortcut: ASCII names only (AGENTS.md, 03-srs.md), widen the class when a document gets a Vietnamese name
  return /^[\w-][\w.-]{0,99}$/.test(name) && !name.includes("..");
}

export interface DocumentMeta {
  name: string;
  /** ISO time of the last write, when the store knows it */
  updatedAt: string | null;
}

const CODE_KEY = "h1t_documents_code";

/** The access code this tab was unlocked with, or null. */
export function getAccessCode(): string | null {
  try {
    return sessionStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function rememberAccessCode(code: string): void {
  try {
    sessionStorage.setItem(CODE_KEY, code);
  } catch {
    // Storage blocked (private mode): the code is asked again next time
  }
}

export function forgetAccessCode(): void {
  try {
    sessionStorage.removeItem(CODE_KEY);
  } catch {
    // Nothing to forget
  }
}

/** A refusal from the documents API, with the message it wrote for the screen. */
export class DocumentsError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function okOrThrow(res: Response): Promise<Response> {
  if (res.ok) return res;
  throw new DocumentsError(res.status, (await res.text()) || `Lỗi ${res.status}`);
}

/** What the screen says for a failed call: the API's message, or the network. */
export function documentsErrorText(error: unknown): string {
  return error instanceof DocumentsError ? error.message : "Không kết nối được máy chủ. Thử lại sau.";
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  return (await okOrThrow(await fetch(DOCUMENTS_API, { cache: "no-store" }))).json();
}

export async function readDocument(name: string): Promise<string> {
  return (await okOrThrow(await fetch(`${DOCUMENTS_API}?name=${encodeURIComponent(name)}`, { cache: "no-store" }))).text();
}

/** Resolves when `code` is the access code; throws a DocumentsError (401 wrong, 429 locked, 503 none set) otherwise. */
export async function verifyAccessCode(code: string): Promise<void> {
  await okOrThrow(await fetch(`${DOCUMENTS_API}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }));
}

/** Writes `text` as the document `name` (a new one, or over the old one). */
export async function saveDocument(name: string, text: string, code: string): Promise<void> {
  await okOrThrow(
    await fetch(`${DOCUMENTS_API}?name=${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { [ACCESS_CODE_HEADER]: code, "Content-Type": "text/plain; charset=utf-8" },
      body: text,
    })
  );
}
