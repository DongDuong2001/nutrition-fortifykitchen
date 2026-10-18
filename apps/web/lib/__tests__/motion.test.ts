import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// cc-51 Part B, extended by cc-55: the motion classes (.m-*) in globals.css. Each has a prefers-reduced-motion rule
// (no movement, opacity only); only transform and opacity move (grid-template-rows for .m-expand and .m-row-exit);
// no blur, no will-change; the curves are the three tokens, never the bare CSS keywords; exits are shorter than enters.
const ROOT = path.resolve(__dirname, "../..");
const source = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
// The rules only: comments may name what the rules avoid
const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
const motion = css.slice(css.indexOf("--m-press:") - "\n:root {\n  ".length);
const reducedAt = motion.indexOf("@media (prefers-reduced-motion: reduce)");
const main = motion.slice(0, reducedAt);
const reduced = motion.slice(reducedAt);
// Classes that only name something (view-transition names, the collapse modifier) have no motion of their own
const NAMES_ONLY = ["m-collapsed", "m-vt-nav", "m-vt-sheet", "m-dialog"];
const classes = [...new Set([...main.matchAll(/^\.(m-[a-z-]+)/gm)].map((m) => m[1]))];

/** Every rule of a stylesheet slice as [selector, body], @media and @starting-style flattened. */
function rules(text: string): [string, string][] {
  return [...text.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
}
const decl = (body: string, prop: string) => [...body.matchAll(new RegExp(`(?:^|;|\\s)${prop}:\\s*([^;]+);`, "g"))].map((m) => m[1].trim());

describe("motion classes", () => {
  it("finds the motion classes, old and new", () => {
    expect(classes).toEqual(
      expect.arrayContaining([
        "m-sheet", "m-scrim", "m-pop", "m-fade", "m-toast", "m-countdown", "m-expand", "m-chevron",
        "m-row-enter", "m-row-exit", "m-flip", "m-bar", "m-day-earlier", "m-day-later", "m-pull", "m-spin",
      ])
    );
  });

  it.each(classes.filter((c) => !NAMES_ONLY.includes(c)))(".%s has a reduced-motion rule", (name) => {
    expect(reduced).toMatch(new RegExp(`\\.${name}[\\s,{.\\[]`));
  });

  it("reduced motion: nothing moves; what fades takes 120 ms at most", () => {
    for (const [selector, body] of rules(reduced)) {
      for (const t of decl(body, "transform")) expect([selector, t]).toEqual([selector, "none"]);
      for (const t of decl(body, "transition")) expect([selector, t]).toEqual([selector, expect.stringMatching(/^(none|opacity var\(--m-fade\) var\(--ease-out\))$/)]);
    }
    expect(motion).toMatch(/--m-fade: 120ms;/);
  });

  it("keyframes and transitions move only transform and opacity (grid rows for .m-expand and .m-row-exit)", () => {
    const frames = [...css.matchAll(/@keyframes ([a-z-]+) \{([\s\S]*?)\n\}/g)];
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/^\s*([a-z-]+):/gm)].map((m) => m[1]);
      for (const prop of props) expect([name, prop]).toEqual([name, expect.stringMatching(/^(transform|opacity)$/)]);
    }
    for (const [selector, body] of rules(motion)) {
      const props = decl(body, "transition").flatMap((t) => t.split(",").map((p) => p.trim().split(/\s+/)[0]));
      for (const prop of props) {
        const allowed = /\.m-(expand|row-exit)\b/.test(selector) ? /^(transform|opacity|grid-template-rows|none)$/ : /^(transform|opacity|none)$/;
        expect([selector, prop]).toEqual([selector, expect.stringMatching(allowed)]);
      }
      for (const prop of decl(body, "transition-property").flatMap((t) => t.split(",").map((p) => p.trim()))) {
        expect([selector, prop]).toEqual([selector, expect.stringMatching(/^(transform|opacity)$/)]);
      }
    }
  });

  it("no motion class blurs or keeps will-change", () => {
    expect(motion).not.toMatch(/backdrop-filter|filter:|will-change/);
  });

  it("curves are the tokens: no bare ease, ease-in or ease-out, never ease-in", () => {
    const bare = /(^|[\s:,(])(ease|ease-in|ease-out|ease-in-out)(?=[\s;,)])/m;
    expect(css.replace(/var\(--ease-[a-z-]+\)/g, "")).not.toMatch(bare);
    expect(css).toMatch(/--ease-out: cubic-bezier\(0\.23, 1, 0\.32, 1\);/);
    expect(css).toMatch(/--ease-in-out: cubic-bezier\(0\.77, 0, 0\.175, 1\);/);
    expect(css).toMatch(/--ease-drawer: cubic-bezier\(0\.32, 0\.72, 0, 1\);/);
  });

  it("an exit is shorter than its enter; only sheets go over 300 ms", () => {
    const ms = (name: string) => Number(motion.match(new RegExp(`--m-${name}: (\\d+)ms;`))?.[1]);
    expect(ms("pop-out")).toBeLessThan(ms("pop-in"));
    expect(ms("sheet-out")).toBeLessThan(ms("sheet-in"));
    for (const name of ["press", "pop-in", "row", "push"]) expect([name, ms(name)]).toEqual([name, expect.any(Number)]);
    for (const name of ["press", "pop-in", "row", "push"]) expect(ms(name)).toBeLessThanOrEqual(300);
    expect(ms("sheet-in")).toBeLessThanOrEqual(350);
  });

  it("interruptible overlays are transitions on data-state that enter from @starting-style, not keyframes", () => {
    for (const name of ["m-sheet", "m-scrim", "m-pop", "m-fade", "m-toast", "m-expand"]) {
      const own = rules(main).filter(([s]) => new RegExp(`^\\.${name}(\\[|$)`).test(s));
      expect([name, own.some(([, b]) => /transition/.test(b))]).toEqual([name, true]);
      expect([name, own.some(([, b]) => /animation/.test(b))]).toEqual([name, false]);
      expect([name, own.some(([s]) => s.includes('[data-state="closed"]'))]).toEqual([name, true]);
    }
    const starting = [...main.matchAll(/@starting-style \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
    for (const name of ["m-sheet", "m-scrim", "m-pop", "m-fade", "m-toast", "m-expand"]) expect(starting).toContain(`.${name}`);
  });

  it("no inline style or class in the app animates width, height, top or left, or transitions all", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const f = path.join(dir, n);
        if (n === "node_modules" || n === "__tests__") return [];
        return statSync(f).isDirectory() ? files(f) : /\.(tsx|css)$/.test(n) ? [f] : [];
      });
    const all = [...files(path.join(ROOT, "components")), ...files(path.join(ROOT, "app"))];
    const layout = all.filter((f) =>
      /transition-\[(width|height|top|left)|transition(Property)?:\s*["']?(width|height|top|left)\b|transition-(width|height)\b/.test(readFileSync(f, "utf8"))
    );
    expect(layout.map((f) => path.relative(ROOT, f))).toEqual([]);
    const transitionAll = all.filter((f) => /transition-all|transition:\s*all/.test(readFileSync(f, "utf8")));
    expect(transitionAll.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

describe("enter animations on wrappers", () => {
  it("fill backwards, never both or forwards (a lasting fill puts sheets under the bottom nav)", () => {
    for (const name of ["m-row-enter", "m-day-earlier", "m-day-later"]) {
      const rule = main.match(new RegExp(`\\n\\.${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect([name, rule]).toEqual([name, expect.stringMatching(/backwards;/)]);
    }
  });
});

describe("press feedback", () => {
  it("scales buttons and pill links only; a row, card or full-width action tints", () => {
    expect(css).toMatch(/button:active,\s*a\.inline-flex:active \{\s*transform: scale\(0\.97\);/);
    expect(css).toMatch(/button\.w-full:active,[\s\S]*?\.m-tint:active \{\s*transform: none;\s*background-image/);
    expect(css).toMatch(/transition: transform var\(--m-press\) var\(--ease-out\);/);
  });
});
