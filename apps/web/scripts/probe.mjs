import { relative, resolve } from "node:path";
import { runPython } from "./python.mjs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: npm run probe -- tests/probes/<name>.py");
  process.exit(1);
}

const resolved = resolve(process.cwd(), target);
// Forward slashes, so the check below also holds on Windows
const rel = relative(process.cwd(), resolved).split("\\").join("/");

if (!rel.startsWith("tests/probes/") || !rel.endsWith(".py")) {
  console.error(`Invalid probe file: ${target}. Probe scripts must be located in tests/probes/ and end with .py`);
  process.exit(1);
}

process.exit(runPython(resolved, process.argv.slice(3)));
