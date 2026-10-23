/**
 * The access code that unlocks writes to Tài liệu (feat/documents). Server only: it reads ACCESS_CODE of the environment and
 * compares in constant time. An address that fails MAX_FAILURES times waits LOCK_MS, so a short code cannot be guessed quickly.
 */
import { timingSafeEqual } from "node:crypto";
import { ACCESS_CODE_HEADER } from "./documents";

export const MAX_FAILURES = 10;
export const LOCK_MS = 15 * 60_000;
/** Past this many addresses the stale ones are dropped, so a scan from many addresses cannot grow the map for ever. */
export const MAX_TRACKED = 10_000;

// shortcut: the failures live in this server process (one instance), upgrade to the API's rate limiter when documents move to the Go API
const failures = new Map<string, { n: number; at: number }>();

export type AccessResult = "ok" | "wrong" | "locked" | "unset";

/** True when `given` is `expected`. No code set lets nobody in. */
export function codeMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The verdict for one request: `code` (the x-access-code header by default) against ACCESS_CODE. `expected` and `now` are for tests. */
export function checkAccess(req: Request, code: string | null = req.headers.get(ACCESS_CODE_HEADER), expected = process.env.ACCESS_CODE, now = Date.now()): AccessResult {
  if (!expected) return "unset";
  // The CDN's header first, as the API's rate limiter does (CF-Connecting-IP cannot be set by the visitor)
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const recent = failures.get(ip);
  const counted = recent && now - recent.at < LOCK_MS ? recent.n : 0;
  if (counted >= MAX_FAILURES) return "locked";
  if (codeMatches(code, expected)) {
    failures.delete(ip);
    return "ok";
  }
  if (failures.size >= MAX_TRACKED) for (const [address, f] of failures) if (now - f.at >= LOCK_MS) failures.delete(address);
  failures.set(ip, { n: counted + 1, at: now });
  return "wrong";
}

const REFUSALS: Record<Exclude<AccessResult, "ok">, [status: number, text: string]> = {
  wrong: [401, "Mã truy cập không đúng"],
  locked: [429, "Sai mã quá nhiều lần. Thử lại sau 15 phút."],
  unset: [503, "Máy chủ chưa đặt mã truy cập (ACCESS_CODE)"],
};

/** The response for a refused request, with the message the screen shows. */
export function accessRefused(result: Exclude<AccessResult, "ok">): Response {
  const [status, text] = REFUSALS[result];
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
