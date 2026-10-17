import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// A project dir named /app collides with the /app route; see cc-48 ("/" was built as Hôm nay in production)
describe("Dockerfile", () => {
  it("never builds or runs the app in /app", () => {
    const dockerfile = readFileSync(path.resolve(__dirname, "../../Dockerfile"), "utf8");
    const workdirs = [...dockerfile.matchAll(/^\s*WORKDIR\s+(\S+)/gim)].map((m) => m[1].replace(/\/+$/, ""));
    expect(workdirs.length).toBeGreaterThan(0);
    expect(workdirs.filter((dir) => dir === "/app")).toEqual([]);
  });
});
