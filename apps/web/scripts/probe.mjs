import { spawnSync } from "node:child_process";
import { resolve, relative } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: npm run probe -- tests/probes/<name>.py");
  process.exit(1);
}

const resolved = resolve(process.cwd(), target);
const rel = relative(process.cwd(), resolved);

if (!rel.startsWith("tests/probes/") || !rel.endsWith(".py")) {
  console.error(`Invalid probe file: ${target}. Probe scripts must be located in tests/probes/ and end with .py`);
  process.exit(1);
}

const res = spawnSync("python3", [resolved, ...process.argv.slice(3)], {
  stdio: "inherit",
  env: process.env,
});

process.exit(res.status ?? 0);
