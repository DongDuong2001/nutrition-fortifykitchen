import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// cc-51 Part B: every motion class (.m-*) has a prefers-reduced-motion rule, and no animation moves width, height,
// top or left (the row collapse animates grid-template-rows, on purpose).
const ROOT = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
const motion = css.slice(css.indexOf("cc-51 motion"));
const reduced = motion.slice(motion.indexOf("@media (prefers-reduced-motion: reduce)"));
const classes = [...new Set([...motion.slice(0, motion.indexOf("@media (prefers-reduced-motion: reduce)")).matchAll(/^\.(m-[a-z-]+)/gm)].map((m) => m[1]))];

describe("motion classes", () => {
  it("finds the motion classes", () => {
    expect(classes).toEqual(expect.arrayContaining(["m-row-enter", "m-row-exit", "m-flip", "m-sheet-enter", "m-sheet-exit", "m-bar", "m-tab-enter", "m-day-earlier", "m-day-later", "m-pull", "m-spin"]));
  });

  it.each(classes.filter((c) => c !== "m-collapsed"))(".%s has a reduced-motion rule", (name) => {
    expect(reduced).toMatch(new RegExp(`\\.${name}[\\s,{]`));
  });

  it("keyframes and transitions move only transform and opacity (grid-template-rows for the collapse)", () => {
    const frames = [...css.matchAll(/@keyframes ([a-z-]+) \{([\s\S]*?)\n\}/g)];
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/^\s*([a-z-]+):/gm)].map((m) => m[1]);
      for (const prop of props) expect([name, prop]).toEqual([name, expect.stringMatching(/^(transform|opacity)$/)]);
    }
    const transitions = [...motion.matchAll(/transition:\s*([^;]+);/g)].flatMap((m) => m[1].split(",").map((t) => t.trim().split(/\s+/)[0]));
    for (const prop of transitions) expect(prop).toMatch(/^(transform|opacity|grid-template-rows|none)$/);
  });

  it("no inline style or class in the app animates width, height, top or left", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const f = path.join(dir, n);
        if (n === "node_modules" || n === "__tests__") return [];
        return statSync(f).isDirectory() ? files(f) : /\.(tsx|css)$/.test(n) ? [f] : [];
      });
    const offenders = [...files(path.join(ROOT, "components")), ...files(path.join(ROOT, "app"))].filter((f) =>
      /transition-\[(width|height|top|left)|transition(Property)?:\s*["']?(width|height|top|left)\b|transition-(width|height)\b/.test(readFileSync(f, "utf8"))
    );
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

describe("enter animations on wrappers", () => {
  it("fill backwards, never both or forwards (a lasting fill puts sheets under the bottom nav)", () => {
    for (const name of ["m-row-enter", "m-tab-enter", "m-day-earlier", "m-day-later"]) {
      const rule = motion.match(new RegExp(`\\n\\.${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect([name, rule]).toEqual([name, expect.stringMatching(/backwards;/)]);
    }
  });
});
