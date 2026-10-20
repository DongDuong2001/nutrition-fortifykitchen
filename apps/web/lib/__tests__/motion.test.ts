import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOUCH_LIFT_MS } from "../use-touch-drag";

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

  it("keyframes and transitions move only transform and opacity (grid rows for .m-expand and .m-row-exit, plus margin-top for .m-row-exit.m-gap-3)", () => {
    const frames = [...css.matchAll(/@keyframes ([a-z-]+) \{([\s\S]*?)\n\}/g)];
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/^\s*([a-z-]+):/gm)].map((m) => m[1]);
      for (const prop of props) expect([name, prop]).toEqual([name, expect.stringMatching(/^(transform|opacity)$/)]);
    }
    for (const [selector, body] of rules(motion)) {
      const props = decl(body, "transition").flatMap((t) => t.split(",").map((p) => p.trim().split(/\s+/)[0]));
      for (const prop of props) {
        // A closing row may also take back its column's gap (.m-gap-3, the tray cards): margin-top with the grid rows
        const allowed = /\.m-row-exit\.m-gap-3\b/.test(selector)
          ? /^(grid-template-rows|margin-top|none)$/
          : /\.m-(expand|row-exit)\b/.test(selector)
          ? /^(transform|opacity|grid-template-rows|none)$/
          : /^\.m-bar$/.test(selector)
            ? /^(transform|background-color|none)$/ // the fill's colour changes with its level while it grows
            : /^(transform|scale|translate|opacity|none)$/; // scale and translate are transforms of their own (press, a sheet under a sheet, the toast host riding up)
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
    for (const name of ["m-row-enter"]) {
      const rule = main.match(new RegExp(`\\n\\.${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect([name, rule]).toEqual([name, expect.stringMatching(/backwards;/)]);
    }
  });

  it("a day changed with the arrows eases in as a transition from @starting-style (12 px, 180 ms), not a restarting keyframe", () => {
    expect(main).toMatch(/--m-day: 180ms;/);
    expect(main).toMatch(/\.m-day-earlier,\s*\.m-day-later \{\s*transition:\s*transform var\(--m-day\) var\(--ease-out\),\s*opacity var\(--m-day\) var\(--ease-out\);/);
    expect(main).toMatch(/\.m-day-earlier \{\s*transform: translateX\(-12px\);\s*opacity: 0\.6;/);
    expect(main).toMatch(/\.m-day-later \{\s*transform: translateX\(12px\);\s*opacity: 0\.6;/);
  });
});

describe("press feedback", () => {
  it("scales buttons and pill links only; a row, card or full-width action tints", () => {
    expect(css).toMatch(/button:is\(:active, \[data-pressed\]\),\s*a\.inline-flex:is\(:active, \[data-pressed\]\) \{\s*transform: scale\(0\.97\);/);
    expect(css).toMatch(/button\.w-full:is\(:active, \[data-pressed\]\),[\s\S]*?\.m-tint:is\(:active, \[data-pressed\]\) \{\s*transform: none;\s*\}/);
    expect(css).toMatch(/transition:\s*transform var\(--m-press\) var\(--ease-out\),\s*scale var\(--m-press\) var\(--ease-out\);/);
  });

  it("a full-width pill (the main action) scales, no tint", () => {
    expect(css).toMatch(/button\.w-full\.rounded-full:not\(\[class\*="active:scale-"\]\):is\(:active, \[data-pressed\]\),[\s\S]*?\{\s*transform: scale\(0\.97\);/);
    expect(css).toMatch(/button\.w-full\.rounded-full::after,[\s\S]*?\{\s*content: none;/);
  });

  it("the tint is an overlay that fades (100 ms in, 150 ms out), not an instant background", () => {
    expect(css).not.toMatch(/background-image: linear-gradient\(var\(--color-press\)/);
    expect(css).toMatch(/\.m-tint::after \{[^}]*opacity: 0;[^}]*transition: opacity var\(--m-tint-out\) var\(--ease-out\);/);
    expect(css).toMatch(/\.m-tint:is\(:active, \[data-pressed\]\)::after \{\s*opacity: 1;\s*transition-duration: var\(--m-tint-in\);/);
    expect(css).toMatch(/--m-tint-in: 100ms;/);
    expect(css).toMatch(/--m-tint-out: 150ms;/);
  });

  it("iOS: no grey tap flash, and one passive touchstart listener so :active is matched", () => {
    expect(css).toMatch(/-webkit-tap-highlight-color: transparent;/);
    expect(readFileSync(path.join(ROOT, "components/touch-active.tsx"), "utf8")).toMatch(/addEventListener\("touchstart", noop, \{ passive: true \}\)/);
    expect(readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8")).toContain("<TouchActive />");
  });

  it("every active:scale-* element transitions `scale` (transition-press), never a utility that replaces it", () => {
    expect(css).toMatch(/@utility transition-press \{\s*transition-property: transform, scale,/);
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const f = path.join(dir, n);
        if (n === "node_modules" || n === "__tests__") return [];
        return statSync(f).isDirectory() ? files(f) : /\.tsx$/.test(n) ? [f] : [];
      });
    const offenders: string[] = [];
    for (const f of [...files(path.join(ROOT, "components")), ...files(path.join(ROOT, "app"))]) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // the press itself (active:scale-[0.97]), not the reduced-motion reset (motion-reduce:active:scale-100)
          if (!/(?<![\w:-])active:scale-\[/.test(line)) return;
          const press = /(?<![\w:-])transition-press(?![\w-])/.test(line);
          const replaces = /(?<![\w:-])(transition-(colors|opacity|transform|shadow|all)|transition-\[|duration-\d+)/.test(line);
          if (!press || replaces) offenders.push(`${path.relative(ROOT, f)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});

describe("cc-57 motion details", () => {
  it("the bar has its own 300 ms token and the dialog scrim uses the pop time", () => {
    expect(motion).toMatch(/--m-bar: 300ms;/);
    // cc-64 (R3): transform only, the colour snaps at a level boundary
    expect(main).toMatch(/\.m-bar \{[^}]*transition: transform var\(--m-bar\) var\(--ease-out\);/);
    expect(main).not.toMatch(/\.m-bar \{[^}]*background-color var\(--m-bar\)/);
    expect(main).toMatch(/\.m-scrim-dialog \{\s*transition-duration: var\(--m-pop-in\);/);
    expect(main).toMatch(/\.m-scrim-dialog\[data-state="closed"\] \{\s*transition-duration: var\(--m-pop-out\);/);
  });

  it("the chevron turns in pop-in to open and pop-out to close, like .m-expand", () => {
    expect(main).toMatch(/\.m-chevron \{\s*transition: transform var\(--m-pop-out\) var\(--ease-out\);/);
    expect(main).toMatch(/\[aria-expanded="true"\] \.m-chevron \{\s*transform: rotate\(180deg\);\s*transition-duration: var\(--m-pop-in\);/);
  });

  it("reduced motion: the closing rules keep to the 120 ms cap, and the toast countdown fades instead of freezing", () => {
    const closing = reduced.match(/\.m-sheet\[data-state="closed"\],\s*\.m-scrim\[data-state="closed"\][^{]*\{([^}]*)\}/)?.[1] ?? "";
    expect(closing).toMatch(/transition-duration: var\(--m-fade\);/);
    expect(reduced).toMatch(/\.m-countdown \{\s*animation-name: m-fade-out;/);
    expect(reduced).not.toMatch(/\.m-countdown \{\s*animation: none;/);
  });

  // cc-fluid-add
  it("reduced motion: nothing scales when pressed, in a rule outside every layer (utilities beat base, so only an unlayered rule wins)", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  :is(:active, [data-pressed]) {\n    scale: none;");
    expect(at).toBeGreaterThan(-1);
    // brace depth at that point is 0: not inside @layer base or any other block
    let depth = 0;
    for (const ch of css.slice(0, at)) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
    expect(depth).toBe(0);
    expect(css).toContain("@custom-variant active {");
    expect(css).toMatch(/@custom-variant active \{\s*&:is\(:active, \[data-pressed\]\)/);
  });

  it("/add and the portion sheet come up in 300 ms (m-quick); every other sheet keeps 350", () => {
    expect(css).toMatch(/\.m-sheet\.m-quick,\s*\.m-scrim\.m-quick \{\s*--m-sheet-in: 300ms;/);
    expect(motion).toMatch(/--m-sheet-in: 350ms;/);
    const add = readFileSync(path.join(ROOT, "components/add/add-screen.tsx"), "utf8");
    expect(add).toMatch(/m-sheet m-quick/);
    expect(add).toMatch(/m-scrim m-scrim-dialog m-quick/);
    expect(add).toMatch(/stacked\s+quick/);
  });

  it("the hold tint takes as long as the hold before a row lifts, and the lift is the 160 ms press transition", () => {
    expect(motion).toContain(`--m-hold: ${TOUCH_LIFT_MS}ms;`);
    expect(motion).toMatch(/button\.m-drag-lift\[data-touch-drag="pressing"\]::after \{[^}]*animation: m-hold-tint var\(--m-hold\) linear forwards;/);
    expect(motion).toMatch(/\.m-drag-lift \{\s*transition: transform var\(--m-press\) var\(--ease-out\);/);
    expect(motion).toMatch(/--m-press: 160ms;/);
  });

  it("a closing sheet and its scrim take no taps from the moment they start to go, except on a sheet's drag areas", () => {
    expect(css).toMatch(/\.m-sheet\[data-state="closed"\],\s*\.m-sheet\[data-state="closed"\] \* \{\s*pointer-events: none;/);
    expect(css).toMatch(/\.m-sheet\[data-state="closed"\] \[data-sheet-drag\],\s*\.m-sheet\[data-state="closed"\] \[data-sheet-drag\] \* \{\s*pointer-events: auto;/);
    expect(css).toMatch(/\.m-scrim\[data-state="closed"\] \{[^}]*pointer-events: none;/);
  });

  it("the tray card has no scale pop of its own, and the landing's phone no hover", () => {
    const tray = readFileSync(path.join(ROOT, "components/add/add-tray.tsx"), "utf8");
    expect(tray).not.toMatch(/data-align-group="tray-review" className="m-pop/);
    const phone = readFileSync(path.join(ROOT, "components/landing/floating-phone.tsx"), "utf8");
    expect(phone).not.toContain("hover:rotate-0");
    const audiences = readFileSync(path.join(ROOT, "components/landing/stacking-audiences.tsx"), "utf8");
    expect(audiences).toContain('matchMedia?.("(prefers-reduced-motion: reduce)")');
  });
});
