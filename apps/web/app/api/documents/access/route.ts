import { accessRefused, checkAccess } from "@/lib/access-code";

// Tài liệu (feat/documents): the check behind the "Mã truy cập" sheet. 204 when `code` is ACCESS_CODE, else the refusal and its message.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : null;
  const access = checkAccess(req, code);
  return access === "ok" ? new Response(null, { status: 204 }) : accessRefused(access);
}
