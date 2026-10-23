import { beforeEach, describe, expect, it } from "vitest";
import {
  DocumentsError,
  checkAccessCode,
  createAccessCode,
  isDocumentName,
  listAccessCodes,
  normalizeCode,
  openDocument,
  readDocument,
  revokeAccessCode,
  saveDocument,
} from "../documents";

describe("isDocumentName", () => {
  it("takes plain file names", () => {
    for (const name of ["AGENTS.md", "03-srs.md", "rules", "a_b-c.v2.txt"]) expect(isDocumentName(name), name).toBe(true);
  });

  it("refuses paths, hidden files, blanks and long names", () => {
    for (const name of ["", ".env", "..", "a/b.md", "a\\b.md", "a..b", "tên.md", "a b.md", "x".repeat(101)]) expect(isDocumentName(name), name).toBe(false);
  });
});

describe("normalizeCode", () => {
  it("ignores case, spaces and dashes, as the API does", () => {
    expect(normalizeCode(" abcd-efgh 23 ")).toBe("ABCDEFGH23");
  });
});

// Mock mode (the test setup has no NEXT_PUBLIC_API_MODE=live): documents and codes in localStorage, under the server's rules
describe("mock documents and access codes", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as Storage;
  });

  const status = (p: Promise<unknown>) => p.then(() => 200, (e: unknown) => (e instanceof DocumentsError ? e.status : -1));

  it("only a coach or an admin makes and lists codes", async () => {
    expect(await status(createAccessCode("user"))).toBe(403);
    expect(await status(listAccessCodes("user"))).toBe(403);
    const made = await createAccessCode("coach");
    expect(made.code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect((await listAccessCodes("admin")).map((c) => c.id)).toEqual([made.id]);
  });

  it("only a coach or an admin writes and reads without a code", async () => {
    expect(await status(saveDocument("rules.md", "# Quy tắc", "user"))).toBe(403);
    expect(await status(saveDocument("../x", "x", "coach"))).toBe(400);
    await saveDocument("rules.md", "# Quy tắc", "coach");
    expect((await readDocument("rules.md", "coach")).content).toBe("# Quy tắc");
    expect(await status(readDocument("rules.md", "user"))).toBe(403);
  });

  it("a learner opens a document with a coach's code in any case; a wrong or revoked code opens nothing", async () => {
    await saveDocument("rules.md", "# Quy tắc", "coach");
    const { id, code } = await createAccessCode("coach");
    expect(await status(checkAccessCode(code.toLowerCase()))).toBe(200);
    expect(await openDocument("rules.md", code.toLowerCase())).toBe("# Quy tắc");
    expect(await status(openDocument("rules.md", "WRONGCODE2"))).toBe(403);
    expect(await status(openDocument("none.md", code))).toBe(404);
    await revokeAccessCode(id);
    expect(await status(openDocument("rules.md", code))).toBe(403);
    expect(await listAccessCodes("coach")).toEqual([]);
  });

  it("an edit saved over a version someone else replaced is refused (409); an upload replaces", async () => {
    await saveDocument("rules.md", "v1", "coach");
    const loaded = await readDocument("rules.md", "coach");
    await new Promise((r) => setTimeout(r, 2));
    await saveDocument("rules.md", "v2 by someone else", "admin");
    expect(await status(saveDocument("rules.md", "my edit", "coach", loaded.updatedAt))).toBe(409);
    expect((await readDocument("rules.md", "coach")).content).toBe("v2 by someone else");
    const fresh = await readDocument("rules.md", "coach");
    await saveDocument("rules.md", "my edit", "coach", fresh.updatedAt);
    expect((await readDocument("rules.md", "coach")).content).toBe("my edit");
  });
});
