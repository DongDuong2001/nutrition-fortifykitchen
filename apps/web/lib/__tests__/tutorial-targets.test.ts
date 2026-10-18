import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TIPS } from "../tips";
import { TOUR_STEPS } from "../tour";
import { RELEASES } from "../releases";

// Tutorials stay in sync with the screens: every spotlight target of the tips, the first-run tour and the "Có gì mới"
// tours is a data-tour value some screen renders. A target is found when a component that sets data-tour (directly,
// or through a tourTarget / dataTour / id prop) names it as a string literal; "<x>-first" is the first row of a list
// whose dataTour is "<x>". The probes (cc_42, cc_46, cc_49) check on the running app that the hole lands on it.

const ROOT = path.resolve(__dirname, "../..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "node_modules" || name === "__tests__") return [];
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const literals = new Set<string>();
for (const file of [...tsxFiles(path.join(ROOT, "components")), ...tsxFiles(path.join(ROOT, "app"))]) {
  const source = readFileSync(file, "utf8");
  for (const m of source.matchAll(/"([a-z0-9-]+)"/g)) literals.add(m[1]);
}

const rendered = (target: string) => literals.has(target) || (target.endsWith("-first") && literals.has(target.slice(0, -6)));

const targets = [
  ...TIPS.map((t) => ({ where: `tip ${t.id}`, target: t.target })),
  ...TOUR_STEPS.flatMap((s) => [s.target].flat().map((target) => ({ where: `tour step ${s.id}`, target }))),
  ...RELEASES.flatMap((r) => (r.tour ?? []).flatMap((s) => [s.target, s.fallback].filter((t): t is string => !!t).map((target) => ({ where: `release ${r.id}: ${s.title}`, target })))),
];

describe("tutorial targets", () => {
  it("lists every tip, tour and release-tour target", () => {
    expect(targets.length).toBeGreaterThan(20);
  });

  it("covers the 18c and 18d tours and the sheet, stepper and offline tips", () => {
    const named = new Set(targets.map((t) => t.target));
    for (const t of ["sync-status", "header-actions", "home-food-list", "meal-pill", "nutrient-column", "nav-explore", "sheet-handle", "unit-stepper", "unit-toggle", "unit-size", "unit-amount"]) {
      expect(named.has(t), t).toBe(true);
    }
  });

  it.each(targets)("$where points at data-tour=\"$target\", which a screen renders", ({ target }) => {
    expect(rendered(target)).toBe(true);
  });
});
