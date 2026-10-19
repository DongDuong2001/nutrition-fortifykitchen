import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// cc-68 S3: the outbox and today's list are never written through the idle writer (a crash in the idle window would
// lose them). These read the source, like dockerfile.test.ts: the rule is about what the code calls.
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("never through deferred-write", () => {
  it("nothing the diary keeps goes through an idle writer: lib/deferred-write is gone, and no module names it", () => {
    for (const file of ["outbox.ts", "api-client.ts", "idb.ts", "day-cache.ts", "sync-engine.ts", "history.ts", "diary-store.tsx"]) {
      let source = "";
      try {
        source = read(file);
      } catch {
        continue;
      }
      expect(source, file).not.toMatch(/deferred-write|deferredWrites/);
    }
  });

  it("the diary store writes its lists at once and tells a failed write to the person", () => {
    const source = read("diary-store.tsx");
    expect(source).toMatch(/persist\(ADDED_ENTRIES_KEY, edits\.added\)/);
    expect(source).toMatch(/own\.setItem\(key, JSON\.stringify\(value\)\)/);
    expect(source).toMatch(/reportStorageFailure\(error\)/);
    expect(() => read("deferred-write.ts")).toThrow();
  });
});
