import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { WEB } from "./probe-covers.mjs";

// Shared steps for gate:fast and gate:full: run a command with a label and its time, and own one `next start` server.

export const PORT = process.env.PORT || "3100";
export const BASE = `http://localhost:${PORT}`;

const fmt = (ms) => `${(ms / 1000).toFixed(0)} s`;

/** Runs a command in apps/web, prefixing its output with the label; resolves to { label, code, ms }. */
export function run(label, cmd, args, env = {}) {
  const started = Date.now();
  return new Promise((done) => {
    const child = spawn(cmd, args, {
      cwd: WEB,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    const prefix = (chunk) =>
      chunk
        .toString()
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `[${label}] ${l}\n`)
        .join("");
    child.stdout.on("data", (c) => process.stdout.write(prefix(c)));
    child.stderr.on("data", (c) => process.stdout.write(prefix(c)));
    child.on("close", (code) => {
      const ms = Date.now() - started;
      console.log(`[${label}] ${code === 0 ? "ok" : `FAILED (exit ${code})`} in ${fmt(ms)}`);
      done({ label, code: code ?? 1, ms });
    });
  });
}

const portOpen = () =>
  new Promise((ok) => {
    const sock = createConnection({ port: Number(PORT), host: "127.0.0.1" });
    sock.once("connect", () => (sock.destroy(), ok(true)));
    sock.once("error", () => ok(false));
  });

/** Starts `next start` on PORT for the current .next build; refuses when something already listens there. */
export async function startServer() {
  if (await portOpen()) {
    console.error(`Port ${PORT} is in use. Stop that server first (PORT=${PORT} npm run port:free).`);
    process.exit(1);
  }
  const server = spawn("npx", ["next", "start", "-p", PORT], {
    cwd: WEB,
    stdio: "ignore",
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });
  for (let i = 0; i < 150 && !(await portOpen()); i++) await new Promise((r) => setTimeout(r, 200));
  if (!(await portOpen())) {
    stopServer(server);
    console.error(`next start did not listen on ${PORT} within 30 s`);
    process.exit(1);
  }
  console.log(`[server] next start on ${BASE}`);
  return server;
}

export function stopServer(server) {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-server.pid, "SIGTERM"); // the whole group: npx and the next server under it
    }
  } catch {
    // already gone
  }
}

export function summary(title, results, started) {
  const width = Math.max(...results.map((r) => r.label.length));
  console.log(`\n${title}: ${fmt(Date.now() - started)} wall clock`);
  for (const r of results) console.log(`  ${r.label.padEnd(width)}  ${r.code === 0 ? "ok    " : "FAILED"}  ${fmt(r.ms)}`);
  const failed = results.filter((r) => r.code !== 0);
  console.log(failed.length ? `${title}: FAILED (${failed.map((r) => r.label).join(", ")})` : `${title}: all green`);
  return failed.length ? 1 : 0;
}
