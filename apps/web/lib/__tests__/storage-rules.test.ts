import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// cc-68 S3: the outbox and today's list are never written through the idle writer (a crash in the idle window would
// lose them). These read the source, like dockerfile.test.ts: the rule is about what the code calls.
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("never through deferred-write", () => {
  it("the outbox modules do not use the idle writer at all", () => {
    for (const file of ["outbox.ts", "api-client.ts", "idb.ts", "day-cache.ts"]) {
      let source = "";
      try {
        source = read(file);
      } catch {
        continue;
      }
      expect(source, file).not.toMatch(/deferred-write|deferredWrites/);
    }
  });

  it("the diary store writes today's list at once, and only the sample edits wait for idle", () => {
    const source = read("diary-store.tsx");
    expect(source).not.toMatch(/deferredWrites\.schedule\([^)]*ADDED_ENTRIES_KEY/);
    expect(source).toMatch(/own\.setItem\(ADDED_ENTRIES_KEY/);
    expect(source).toMatch(/reportStorageFailure\(error\)/);
  });
});
