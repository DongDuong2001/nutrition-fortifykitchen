import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// check:live-bundle: the live build (NEXT_PUBLIC_API_MODE=live, no DEMO_BUILD) must not ship the sample day or the mock
// foods to the browser. Builds into .next-live (a running demo server's .next is left alone), then looks for marker
// strings that exist only in lib/mock/ in every file under .next-live/static. Exits 1 when one is found.
// `--no-build` checks the last .next-live build again.

const DIST = ".next-live";
// Each marker is a literal that lives only in lib/mock/ (checked below, so a marker cannot go stale silently)
const MARKERS = [
  { marker: "Thứ Bảy, 10/10/2026 · Ngày tập", what: "sample day (lib/mock/sample-day.ts desktopDateLabel)" },
  // Not "ban@email.com": the sign-in field shows it as its placeholder, so it ships in every build (perf/live-bundle)
  { marker: '"item-4"', what: "sample day meals (lib/mock/sample-day.ts)" },
  { marker: "food-com-gao-lut", what: "mock foods (lib/mock/sample-foods.ts)" },
  { marker: "food-yogurt-kefir", what: "mock foods (lib/mock/sample-foods.ts, also named by lib/mock/recent-seed.ts)" },
];

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else out.push(full);
  }
  return out;
}

const mockText = files("lib/mock").map((f) => readFileSync(f, "utf8")).join("\n");
const stale = MARKERS.filter((m) => !mockText.includes(m.marker));
if (stale.length) {
  console.error(`Markers no longer in lib/mock/: ${stale.map((m) => m.marker).join(", ")}. Pick new ones.`);
  process.exit(1);
}
// A marker must exist only in lib/mock, or a live build that ships no sample data still reads as FOUND
const source = ["app", "components", "hooks", "lib"]
  .flatMap((dir) => files(dir))
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.startsWith(join("lib", "mock")) && !f.includes("__tests__"));
const shared = MARKERS.filter((m) => source.some((f) => readFileSync(f, "utf8").includes(m.marker)));
if (shared.length) {
  console.error(`Markers also used outside lib/mock/: ${shared.map((m) => m.marker).join(", ")}. Pick new ones.`);
  process.exit(1);
}

if (!process.argv.includes("--no-build")) {
  // next build points next-env.d.ts and tsconfig.json at the folder it builds into: they are put back after it
  const kept = ["next-env.d.ts", "tsconfig.json"].map((f) => [f, readFileSync(f, "utf8")]);
  const env = { ...process.env, NEXT_PUBLIC_API_MODE: "live", NEXT_DIST_DIR: DIST, DEMO_BUILD: "" };
  const res = spawnSync("npx", ["next", "build", "--webpack"], { stdio: "inherit", env, shell: process.platform === "win32" });
  for (const [f, text] of kept) writeFileSync(f, text);
  if (res.status !== 0) process.exit(res.status ?? 1);
}
if (!existsSync(join(DIST, "static"))) {
  console.error(`${DIST}/static not found: run without --no-build first.`);
  process.exit(1);
}

// The minifier writes a Latin-1 character as \xNN ("·" is \xb7, "à" \xe0) and keeps the others ("ứ"), so a marker with
// one is looked for in that form too (and as \u00NN): the sample day's "10/10/2026 · Ngày tập" never matched before
const hex = (c, width) => c.codePointAt(0).toString(16).padStart(width, "0");
const forms = (marker) => [
  ...new Set([
    marker,
    marker.replace(/[\u0080-\u00ff]/g, (c) => `\\x${hex(c, 2)}`),
    marker.replace(/[\u0080-\u00ff]/g, (c) => `\\u${hex(c, 4)}`),
  ]),
];

const shipped = files(join(DIST, "static")).filter((f) => /\.(js|css|html|json|txt)$/.test(f));
let found = 0;
for (const { marker, what } of MARKERS) {
  const hits = shipped.filter((f) => {
    const text = readFileSync(f, "utf8");
    return forms(marker).some((form) => text.includes(form));
  });
  found += hits.length ? 1 : 0;
  console.log(`${hits.length ? "FOUND" : "clean"}  ${what}: "${marker}"${hits.length ? ` in ${hits.length} file(s), e.g. ${hits[0]}` : ""}`);
}
console.log(found ? `check:live-bundle: ${found} of ${MARKERS.length} markers ship in the live build` : "check:live-bundle: clean");
process.exit(found ? 1 : 0);
