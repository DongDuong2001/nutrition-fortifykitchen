import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { blankDay } from "../day-history";
import { setDemoActive } from "../demo";

// perf/live-bundle: a live build swaps each sample module of lib/mock for its stand-in in lib/mock/live (next.config.ts).
// Live mode never has a demo, so a stand-in must give what the real module gives outside demo mode, with the same
// exports, and hold none of the sample data the live-bundle check looks for.
const WEB = path.resolve(__dirname, "../..");
const LIVE = path.join(WEB, "lib/mock/live");
const STUBS = readdirSync(LIVE).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""));

const load = async (name: string) => [await import(`../mock/${name}.ts`), await import(`../mock/live/${name}.ts`)] as const;

describe("lib/mock/live", () => {
  it("next.config.ts swaps exactly these modules", () => {
    const config = readFileSync(path.join(WEB, "next.config.ts"), "utf8");
    const listed = /mock\[\\\\\/\]\(([^)]+)\)\$/.exec(config)?.[1].split("|") ?? [];
    expect(listed.sort()).toEqual([...STUBS].sort());
  });

  it.each(STUBS)("%s has the real module's exports", async (name) => {
    const [real, stub] = await load(name);
    expect(Object.keys(stub).sort()).toEqual(Object.keys(real).sort());
  });

  it("the day template is the sample day with nothing logged, without the sample's email and desktop date label", async () => {
    const [real, stub] = await load("sample-day");
    const blank = blankDay(real.SAMPLE_DAY);
    delete blank.desktopDateLabel;
    expect(stub.SAMPLE_DAY).toEqual({ ...blank, user: { ...blank.user, email: "" } });
    expect(blankDay(stub.SAMPLE_DAY)).toEqual(stub.SAMPLE_DAY);
  });

  it("outside demo mode the real modules give what the stand-ins give", async () => {
    setDemoActive(false);
    const [history, historyStub] = await load("history");
    for (const daysAgo of [1, 2, 7, 29, 30]) expect(historyStub.historyItems(daysAgo)).toEqual(history.historyItems(daysAgo));
    expect(historyStub.HISTORY_DAYS).toBe(history.HISTORY_DAYS);
    const [weights, weightsStub] = await load("weight-log");
    expect(weightsStub.weightLogSample("2026-10-21")).toEqual(weights.weightLogSample("2026-10-21"));
    for (const name of ["sample-foods", "dish-demo-foods", "recent-seed"]) {
      const [, stub] = await load(name);
      for (const value of Object.values(stub)) expect(value).toEqual([]);
    }
    setDemoActive(true);
  });

  it("no stand-in holds a marker of check:live-bundle", () => {
    const script = readFileSync(path.join(WEB, "scripts/check-live-bundle.mjs"), "utf8");
    const markers = [...script.matchAll(/marker: (?:"([^"]+)"|'([^']+)')/g)].map((m) => m[1] ?? m[2]);
    expect(markers.length).toBeGreaterThanOrEqual(4);
    for (const name of STUBS) {
      const text = readFileSync(path.join(LIVE, `${name}.ts`), "utf8");
      for (const marker of markers) expect(text).not.toContain(marker);
    }
  });
});
