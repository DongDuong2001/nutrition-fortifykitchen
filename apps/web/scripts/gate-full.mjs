import { BASE, run, startServer, stopServer, summary } from "./gate-lib.mjs";

// gate:full, at the end of each part and before a PR: typecheck and the unit tests, build:demo once, one server, then
// test:align, test:hydration and probe:all in parallel against it, then stop it. smoke.py runs inside probe:all, and
// hydration.py is skipped there because test:hydration runs it. Last, check:live-bundle: a live build into .next-live
// ships no sample day or sample food (perf/live-bundle); it runs after the probes so its build does not slow them.

const started = Date.now();
const results = [];
results.push(await run("typecheck", "npx", ["tsc", "--noEmit"]));
results.push(await run("vitest", "npx", ["vitest", "run"]));
results.push(await run("build:demo", "npm", ["run", "build:demo"]));

if (results.every((r) => r.code === 0)) {
  const server = await startServer();
  const env = { ALIGN_BASE_URL: BASE };
  try {
    results.push(
      ...(await Promise.all([
        run("test:align", "npm", ["run", "test:align"], env),
        run("test:hydration", "npm", ["run", "test:hydration"], env),
        run("probe:all", "npm", ["run", "probe:all"], { ...env, PROBE_SKIP: "hydration.py" }),
      ])),
    );
  } finally {
    stopServer(server);
  }
} else console.log("[server] not started: typecheck, unit tests or build failed");
results.push(await run("check:live-bundle", "npm", ["run", "check:live-bundle"]));

process.exit(summary("gate:full", results, started));
