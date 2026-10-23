/**
 * Tài liệu (feat/documents): the coach's documents and rules, markdown text by file name, through the Go API (/documents,
 * /document-codes; apps/api/internal/documents, migration 000017). A coach (HLV) or an admin writes them and reads them directly;
 * every signed-in user sees the list, and a learner opens a document with an access code the coach made, which the browser keeps
 * for the tab in sessionStorage. The server decides who is a coach. Mock mode keeps documents and codes in this browser's
 * localStorage under the same rules, so the gates and the demo run without the API.
 */
import { apiFetch } from "./api-client";
import { isLiveMode } from "./api-mode";
import { canManageClients, type Role } from "./coaching-link";
import { codeFromBytes, randomBytes } from "./mock-coach-server";

export const MAX_DOCUMENT_BYTES = 1_000_000;
/** How long a code works (apps/api documents.CodeTTL). */
const CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A file name the API takes: letters, digits, "_", "-" and ".", no leading dot, no "..", at most 100 characters. */
export function isDocumentName(name: string): boolean {
  // shortcut: ASCII names only (AGENTS.md, 03-srs.md), widen the class here and in the API when a document gets a Vietnamese name
  return /^[\w-][\w.-]{0,99}$/.test(name) && !name.includes("..");
}

/** A typed code as the API compares it: any case, spaces and dashes ignored. */
export function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export interface DocumentMeta {
  name: string;
  /** ISO time of the last write */
  updatedAt: string | null;
}

/** One access code as its coach sees it; the code itself is shown once, when it is made. */
export interface AccessCode {
  id: string;
  createdAt: string;
  expiresAt: string;
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

const MESSAGES: Record<number, string> = {
  400: "Tên tệp chỉ gồm chữ không dấu, số, gạch ngang, gạch dưới và dấu chấm.",
  401: "Phiên đăng nhập đã hết. Đăng nhập lại rồi thử lại.",
  403: "Mã truy cập không đúng, đã hết hạn hoặc đã bị thu hồi.",
  404: "Không có tài liệu này.",
  409: "Tài liệu vừa được người khác lưu. Bản nháp của bạn vẫn được giữ: chép lại phần sửa, đóng rồi mở lại để xem bản mới.",
  413: "Tệp quá lớn (tối đa 1 MB).",
};

/** A refusal from the API (or the mock), by HTTP status. */
export class DocumentsError extends Error {
  constructor(public readonly status: number) {
    super(MESSAGES[status] ?? "Máy chủ báo lỗi. Thử lại sau.");
  }
}

/** What the screen says for a failed call. */
export function documentsErrorText(error: unknown): string {
  return error instanceof DocumentsError ? error.message : "Không kết nối được máy chủ. Thử lại sau.";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new DocumentsError(res.status);
  return res.json();
}

const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export async function listDocuments(): Promise<DocumentMeta[]> {
  if (!isLiveMode()) return Object.entries(mockDocs()).map(([name, d]) => ({ name, updatedAt: d.updatedAt })).sort((a, b) => a.name.localeCompare(b.name));
  return (await api<{ items: DocumentMeta[] }>("/documents")).items;
}

/**
 * The coach's read: the text and the version (updatedAt) it was read at, which an edit sends back with its save. A learner gets
 * 403 (`role` is the mock's stand-in for the server's check).
 */
export async function readDocument(name: string, role: Role): Promise<{ content: string; updatedAt: string }> {
  if (!isLiveMode()) {
    if (!canManageClients(role)) throw new DocumentsError(403);
    const doc = mockDocs()[name];
    if (!doc) throw new DocumentsError(404);
    return doc;
  }
  return api(`/documents/${encodeURIComponent(name)}`);
}

/** A learner's read: the text, when `code` is a live access code (403 otherwise). The code goes in the body, never the URL. */
export async function openDocument(name: string, code: string): Promise<string> {
  if (!isLiveMode()) {
    if (!mockCodeValid(code)) throw new DocumentsError(403);
    const doc = mockDocs()[name];
    if (!doc) throw new DocumentsError(404);
    return doc.content;
  }
  return (await api<{ content: string }>(`/documents/${encodeURIComponent(name)}/open`, send("POST", { code }))).content;
}

/** Resolves when `code` is a live access code; a DocumentsError (403) otherwise. */
export async function checkAccessCode(code: string): Promise<void> {
  if (!isLiveMode()) {
    if (!mockCodeValid(code)) throw new DocumentsError(403);
    return;
  }
  await api("/document-codes/check", send("POST", { code }));
}

/**
 * The coach writes `content` as the document `name`. An edit passes `baseUpdatedAt`, the version it loaded: if someone saved in
 * between, nothing is written and a DocumentsError (409) says so. A new document or an upload leaves it out and creates or replaces.
 */
export async function saveDocument(name: string, content: string, role: Role, baseUpdatedAt?: string): Promise<void> {
  if (!isLiveMode()) {
    if (!canManageClients(role)) throw new DocumentsError(403);
    if (!isDocumentName(name)) throw new DocumentsError(400);
    if (new Blob([content]).size > MAX_DOCUMENT_BYTES) throw new DocumentsError(413);
    const docs = mockDocs();
    if (baseUpdatedAt !== undefined && docs[name]?.updatedAt !== baseUpdatedAt) throw new DocumentsError(docs[name] ? 409 : 404);
    writeMock(DOCS_KEY, { ...docs, [name]: { content, updatedAt: new Date().toISOString() } });
    return;
  }
  await api(`/documents/${encodeURIComponent(name)}`, send("PUT", { content, baseUpdatedAt }));
}

/**
 * The caller's live codes, newest first; a DocumentsError (403) for someone who may not make codes. Live mode asks the server;
 * `role` is the mock's stand-in for it (live mode shows every account as "user", coaching is not live yet).
 */
export async function listAccessCodes(role: Role): Promise<AccessCode[]> {
  if (!isLiveMode()) {
    if (!canManageClients(role)) throw new DocumentsError(403);
    const now = Date.now();
    return mockCodes().filter((c) => !c.revoked && Date.parse(c.expiresAt) > now).map(({ id, createdAt, expiresAt }) => ({ id, createdAt, expiresAt }));
  }
  return (await api<{ items: AccessCode[] }>("/document-codes")).items;
}

/** A new code for learners; `code` is its value, shown this once. */
export async function createAccessCode(role: Role): Promise<AccessCode & { code: string }> {
  if (!isLiveMode()) {
    if (!canManageClients(role)) throw new DocumentsError(403);
    const now = Date.now();
    const made = { id: crypto.randomUUID(), code: codeFromBytes(randomBytes(10)), createdAt: new Date(now).toISOString(), expiresAt: new Date(now + CODE_TTL_MS).toISOString(), revoked: false };
    writeMock(CODES_KEY, [made, ...mockCodes()]);
    return made;
  }
  return api("/document-codes", send("POST", {}));
}

export async function revokeAccessCode(id: string): Promise<void> {
  if (!isLiveMode()) {
    writeMock(CODES_KEY, mockCodes().map((c) => (c.id === id ? { ...c, revoked: true } : c)));
    return;
  }
  await api(`/document-codes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---- mock mode: this browser's localStorage, shared by the accounts on it (so a coach's code works for a learner here) ----

const DOCS_KEY = "h1t_mock_documents_v1";
const CODES_KEY = "h1t_mock_document_codes_v1";

interface MockCode extends AccessCode {
  code: string;
  revoked: boolean;
}

function readMock<T>(key: string, empty: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? empty;
  } catch {
    return empty;
  }
}

function writeMock(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the change lasts for this page view only
  }
}

const mockDocs = () => readMock<Record<string, { content: string; updatedAt: string }>>(DOCS_KEY, {});
const mockCodes = () => readMock<MockCode[]>(CODES_KEY, []);

function mockCodeValid(code: string): boolean {
  const typed = normalizeCode(code);
  return mockCodes().some((c) => c.code === typed && !c.revoked && Date.parse(c.expiresAt) > Date.now());
}
