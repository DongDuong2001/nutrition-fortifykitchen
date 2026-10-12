import { spawnSync } from "node:child_process";

// One place that finds a working Python 3. On Windows `python3` is often the Microsoft Store stub (it prints a
// message and runs nothing), so every candidate is asked for its version and must answer "Python 3.x".
const CANDIDATES = ["python3", "python", "py"];

const works = (cmd) => {
  const res = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return res.status === 0 && /^Python 3/.test(`${res.stdout ?? ""}${res.stderr ?? ""}`);
};

export function resolvePython() {
  return CANDIDATES.find(works) ?? null;
}

/** Runs a Python script with the resolved interpreter and returns its exit code. */
export function runPython(scriptPath, args = []) {
  const python = resolvePython();
  if (!python) {
    console.error("No Python 3 found (tried python3, python, py). Install Python 3 and Playwright.");
    return 1;
  }
  const res = spawnSync(python, [scriptPath, ...args], { stdio: "inherit", env: process.env });
  return res.status ?? 1;
}
