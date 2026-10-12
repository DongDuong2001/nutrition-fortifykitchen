import { relative, resolve } from "node:path";
import { runPython } from "./python.mjs";

// Runs a Python gate script (tests/*.py, tests/probes/*.py) with whichever Python 3 this machine has.
// Used by test:align, test:hydration and probe:all so none of them calls `python3` directly.
const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/py.mjs tests/<name>.py [args]");
  process.exit(1);
}

const resolved = resolve(process.cwd(), target);
const rel = relative(process.cwd(), resolved).split("\\").join("/");
if (!rel.startsWith("tests/") || !rel.endsWith(".py")) {
  console.error(`Invalid script: ${target}. Only tests/**/*.py can be run.`);
  process.exit(1);
}

process.exit(runPython(resolved, process.argv.slice(3)));
