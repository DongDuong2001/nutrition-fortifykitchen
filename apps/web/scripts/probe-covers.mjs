import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Picks the probes that cover a change, for gate:fast.
// Each probe in tests/probes/ has a "# PROBE_COVERS: <glob> <glob> …" line (paths relative to apps/web). A changed file
// covers a probe when the file itself, or a page or layout that imports it (directly or through other files), matches
// one of the probe's globs. A layout counts for every page under it. A changed probe always runs; a changed _helper.py
// runs the probes that import it.

export const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROBES = join(WEB, "tests/probes");
const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];
const SKIP_DIRS = new Set(["node_modules", ".next", "tests", "public", ".screenshots"]);

export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
      if (glob[i + 1] === "/") i++;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const slashes = (p) => p.replace(/\\/g, "/");

/** Files changed against origin/main (committed on this branch, staged, unstaged and untracked), relative to apps/web. */
export function changedFiles(base = "origin/main") {
  const git = (...args) => execFileSync("git", args, { cwd: WEB, encoding: "utf8" });
  const top = git("rev-parse", "--show-toplevel").trim();
  const mergeBase = git("merge-base", base, "HEAD").trim();
  const names = [
    ...git("diff", "--name-only", mergeBase).split("\n"),
    ...git("ls-files", "--others", "--exclude-standard").split("\n").map((f) => slashes(relative(top, join(WEB, f)))),
  ];
  // git writes forward slashes on every OS; path.relative writes backslashes on Windows, where the prefix then matched nothing
  const webPrefix = slashes(relative(top, WEB)) + "/";
  return [...new Set(names.filter((f) => f.startsWith(webPrefix)).map((f) => f.slice(webPrefix.length)))].filter((f) =>
    existsSync(join(WEB, f)),
  );
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_EXT.some((e) => name.endsWith(e)) && !name.endsWith(".d.ts")) out.push(relative(WEB, full));
  }
  return out;
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = join(dirname(from), spec);
  else return null;
  for (const cand of [base, ...SOURCE_EXT.map((e) => base + e), ...SOURCE_EXT.map((e) => join(base, "index" + e))]) {
    const full = join(WEB, cand);
    if (existsSync(full) && statSync(full).isFile()) return relative(WEB, full);
  }
  return null;
}

const IMPORT_RE = /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|@import\s+["']([^"']+)["']/g;

/** importer -> imported, for every source file outside tests/ and node_modules/. */
export function importGraph() {
  const graph = new Map();
  for (const file of walk(WEB)) {
    const text = readFileSync(join(WEB, file), "utf8");
    const deps = new Set();
    for (const m of text.matchAll(IMPORT_RE)) {
      const dep = resolveImport(file, m[1] ?? m[2] ?? m[3] ?? m[4]);
      if (dep) deps.add(dep);
    }
    graph.set(file, deps);
  }
  return graph;
}

/** The changed files plus every source file that imports one of them, and every page under a changed layout. */
export function affectedFiles(changed, graph = importGraph()) {
  const importers = new Map();
  for (const [file, deps] of graph) for (const dep of deps) (importers.get(dep) ?? importers.set(dep, []).get(dep)).push(file);
  const seen = new Set(changed);
  const queue = [...changed];
  while (queue.length) for (const next of importers.get(queue.pop()) ?? []) if (!seen.has(next)) seen.add(next), queue.push(next);
  const pages = [...graph.keys()].filter((f) => /^app\/.*page\.tsx$/.test(f) || f === "app/page.tsx");
  for (const file of [...seen]) {
    if (!/^app\/(.*\/)?(layout|template|loading|error|not-found)\.tsx$/.test(file)) continue;
    const dir = dirname(file) + "/";
    for (const page of pages) if (dir === "app/" || page.startsWith(dir)) seen.add(page);
  }
  return seen;
}

/** Every runnable probe with its PROBE_COVERS globs and the _helpers it imports. */
export function probeCovers() {
  return readdirSync(PROBES)
    .filter((n) => n.endsWith(".py") && !n.startsWith("_") && n !== "run_all.py")
    .sort()
    .map((name) => {
      const text = readFileSync(join(PROBES, name), "utf8");
      const line = text.match(/^#\s*PROBE_COVERS:(.*)$/m);
      const helpers = [...text.matchAll(/^(?:import|from)\s+(_\w+)/gm)].map((m) => `tests/probes/${m[1]}.py`);
      return { name, globs: line ? line[1].trim().split(/\s+/).filter(Boolean) : null, helpers };
    });
}

/** The probes a change needs, narrowest coverage first; [] when nothing matches (the caller falls back to smoke.py). */
export function selectProbes(changed) {
  const affected = [...affectedFiles(changed)];
  const picked = [];
  for (const probe of probeCovers()) {
    const self = `tests/probes/${probe.name}`;
    const direct = changed.includes(self) || probe.helpers.some((h) => changed.includes(h));
    const hits = (probe.globs ?? []).map(globToRegExp).filter((re) => affected.some((f) => re.test(f)));
    if (direct || hits.length) picked.push({ ...probe, direct });
  }
  return picked.sort((a, b) => Number(b.direct) - Number(a.direct) || (a.globs?.length ?? 99) - (b.globs?.length ?? 99) || a.name.localeCompare(b.name));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // `node scripts/probe-covers.mjs [file …]` prints what gate:fast would pick (default: the files changed vs origin/main)
  const changed = process.argv.length > 2 ? process.argv.slice(2) : changedFiles();
  const missing = probeCovers().filter((p) => !p.globs);
  if (missing.length) console.log(`no PROBE_COVERS line: ${missing.map((p) => p.name).join(", ")}`);
  console.log(`changed: ${changed.length} file(s)`);
  for (const p of selectProbes(changed)) console.log(`${p.name}${p.direct ? " (probe changed)" : ""}`);
}
