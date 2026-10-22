import { BASE, run, startServer, stopServer, summary } from "./gate-lib.mjs";
import { changedFiles, selectProbes } from "./probe-covers.mjs";

// gate:fast, after each commit: typecheck, the unit tests related to the files changed vs origin/main, and only the
// probes whose PROBE_COVERS match the changed screens (smoke.py when none do), on a fresh demo build.
// GATE_FAST_MAX_PROBES (default 12) caps the probes; the rest wait for gate:full, and the list says which were left out.

const MAX_PROBES = Number(process.env.GATE_FAST_MAX_PROBES || 12);
const started = Date.now();
const changed = changedFiles();
console.log(`gate:fast: ${changed.length} file(s) changed vs origin/main`);

const results = [];
results.push(await run("typecheck", "npx", ["tsc", "--noEmit"]));
// DESIGN.md "Enforcement": the design lint (D-TYPE-06, D-COL-07, D-WRT-04, D-A11Y-02)
results.push(await run("lint:design", "node", ["scripts/lint-design.mjs"]));

const testable = changed.filter((f) => /\.(ts|tsx|js|mjs|jsx|css|json)$/.test(f) && !f.startsWith("tests/"));
const wholeSuite = changed.some((f) => /^(vitest\.config\.ts|lib\/__tests__\/setup-demo\.ts|package(-lock)?\.json|tsconfig\.json)$/.test(f));
if (wholeSuite) results.push(await run("vitest", "npx", ["vitest", "run"]));
else if (testable.length) results.push(await run("vitest related", "npx", ["vitest", "related", "--run", "--passWithNoTests", ...testable]));
else console.log("[vitest] no source files changed, skipped");

let picked = selectProbes(changed).map((p) => p.name);
if (!picked.length) {
  console.log("[probes] no PROBE_COVERS match, falling back to smoke.py");
  picked = ["smoke.py"];
} else if (picked.length > MAX_PROBES) {
  console.log(`[probes] ${picked.length} probes cover this change; running the ${MAX_PROBES} narrowest, gate:full runs the rest:`);
  console.log(`[probes] left for gate:full: ${picked.slice(MAX_PROBES).join(" ")}`);
  picked = picked.slice(0, MAX_PROBES);
}
console.log(`[probes] ${picked.join(" ")}`);

if (results.every((r) => r.code === 0)) {
  results.push(await run("build:demo", "npm", ["run", "build:demo"]));
  if (results.at(-1).code === 0) {
    const server = await startServer();
    try {
      results.push(await run("probes", "node", ["scripts/py.mjs", "tests/probes/run_all.py", ...picked], { ALIGN_BASE_URL: BASE }));
    } finally {
      stopServer(server);
    }
  }
} else console.log("[probes] skipped: typecheck or unit tests failed");

process.exit(summary("gate:fast", results, started));
