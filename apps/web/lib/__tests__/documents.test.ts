import { describe, expect, it } from "vitest";
import { isDocumentName } from "../documents";

describe("isDocumentName", () => {
  it("takes plain file names", () => {
    for (const name of ["AGENTS.md", "03-srs.md", "rules", "a_b-c.v2.txt"]) expect(isDocumentName(name), name).toBe(true);
  });

  it("refuses paths, hidden files, blanks and long names", () => {
    for (const name of ["", ".env", "..", "a/b.md", "a\\b.md", "a..b", "tên.md", "a b.md", "x".repeat(101)]) expect(isDocumentName(name), name).toBe(false);
  });
});
