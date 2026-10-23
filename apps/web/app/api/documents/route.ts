import { NextResponse } from "next/server";
import { accessRefused, checkAccess } from "@/lib/access-code";
import { MAX_DOCUMENT_BYTES, isDocumentName } from "@/lib/documents";
import { listDocuments, readDocument, writeDocument } from "@/lib/documents-server";

// Tài liệu (feat/documents): the list and the text of each document, and the write behind the access code (lib/access-code).
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE } });
const storeFailed = (error: unknown) => text(`Kho tài liệu báo lỗi: ${error instanceof Error ? error.message : String(error)}`, 502);

/** The list (no query), or one document's text (?name=). */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name");
  try {
    if (name === null) return NextResponse.json(await listDocuments(), { headers: NO_STORE });
    if (!isDocumentName(name)) return text("Tên tệp không hợp lệ", 400);
    const body = await readDocument(name);
    return body === null ? text("Không có tài liệu này", 404) : text(body);
  } catch (error) {
    return storeFailed(error);
  }
}

/** Writes one document (?name=; the body is its text) when the x-access-code header holds the access code. */
export async function PUT(req: Request) {
  const access = checkAccess(req);
  if (access !== "ok") return accessRefused(access);
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!isDocumentName(name)) return text("Tên tệp không hợp lệ", 400);
  if (Number(req.headers.get("content-length")) > MAX_DOCUMENT_BYTES) return text("Tệp quá lớn (tối đa 1 MB)", 413);
  const body = await req.text();
  if (Buffer.byteLength(body) > MAX_DOCUMENT_BYTES) return text("Tệp quá lớn (tối đa 1 MB)", 413);
  try {
    await writeDocument(name, body);
    return new Response(null, { status: 204 });
  } catch (error) {
    return storeFailed(error);
  }
}
