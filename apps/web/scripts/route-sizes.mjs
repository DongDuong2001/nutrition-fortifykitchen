// First-load JS per route (Next 16 no longer prints it): loads each route from a running production server, sums the
// gzipped size of every <script src> chunk in its HTML from .next/static, and prints a table. Port from ALIGN_BASE_URL.
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const BASE = process.env.ALIGN_BASE_URL || "http://localhost:3100";
const ROUTES = ["/signin", "/landing", "/app", "/add", "/foods/food-cha-la", "/entry/item-1", "/micros", "/trends", "/explore", "/settings", "/settings/profile", "/training"];
const root = path.resolve(import.meta.dirname, "..");
const kb = (n) => (n / 1024).toFixed(1);

const rows = [];
for (const route of ROUTES) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...new Set([...html.matchAll(/<script src="\/_next\/([^"]+\.js)"/g)].map((m) => m[1]))];
  const sizes = srcs.map((src) => [src, gzipSync(readFileSync(path.join(root, ".next", decodeURIComponent(src)))).length]);
  const bytes = sizes.reduce((sum, [, n]) => sum + n, 0);
  rows.push([route, srcs.length, kb(bytes)]);
  // SIZES_VERBOSE=1: every chunk of each route, to see what grew
  if (process.env.SIZES_VERBOSE) for (const [src, n] of sizes) console.error(`${route}\t${src.replace(/-[0-9a-f]{16}\.js$/, ".js")}\t${n}`);
}
console.log("| Route | Chunks | First-load JS (gzip kB) |\n|---|---|---|");
for (const [route, n, size] of rows) console.log(`| ${route} | ${n} | ${size} |`);
