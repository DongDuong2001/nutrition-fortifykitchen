import { beforeEach, describe, expect, it } from "vitest";
import { DocumentsError, checkAccessCode, createAccessCode, isDocumentName, listAccessCodes, normalizeCode, readDocument, revokeAccessCode, saveDocument } from "../documents";

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

// Mock mode (the test setup has no NEXT_PUBLIC_API_MODE=live): documents and codes in localStorage
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

  it("a coach's code unlocks writes in any case; a wrong or revoked one does not", async () => {
    const { id, code } = await createAccessCode("coach");
    expect(await status(checkAccessCode(code.toLowerCase()))).toBe(200);
    expect(await status(saveDocument("rules.md", "# Quy tắc", "WRONGCODE2"))).toBe(403);
    expect(await status(saveDocument("../x", "x", code))).toBe(400);
    await saveDocument("rules.md", "# Quy tắc", code);
    expect((await readDocument("rules.md")).content).toBe("# Quy tắc");
    await revokeAccessCode(id);
    expect(await status(checkAccessCode(code))).toBe(403);
    expect(await listAccessCodes("coach")).toEqual([]);
    expect(await status(readDocument("other.md"))).toBe(404);
  });

  it("an edit saved over a version someone else replaced is refused (409); an upload replaces", async () => {
    const { code } = await createAccessCode("coach");
    await saveDocument("rules.md", "v1", code);
    const loaded = await readDocument("rules.md");
    await new Promise((r) => setTimeout(r, 2));
    await saveDocument("rules.md", "v2 by someone else", code);
    expect(await status(saveDocument("rules.md", "my edit", code, loaded.updatedAt))).toBe(409);
    expect((await readDocument("rules.md")).content).toBe("v2 by someone else");
    const fresh = await readDocument("rules.md");
    await saveDocument("rules.md", "my edit", code, fresh.updatedAt);
    expect((await readDocument("rules.md")).content).toBe("my edit");
  });
});
