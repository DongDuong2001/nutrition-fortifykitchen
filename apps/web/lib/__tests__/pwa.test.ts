import { readFileSync } from "node:fs";
import path, { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  INK_COLOR,
  PAPER_COLOR,
  PRECACHE_PAGES,
  STANDALONE_HOME_SCRIPT,
  installView,
  isIosDevice,
  isIosSafari,
  isNeverCached,
  routeFor,
  shouldRegisterServiceWorker,
} from "../pwa";
import { canApplyUpdate, updatePhase } from "../update-phase";

describe("routeFor", () => {
  it("never caches auth routes and the API, for pages and for fetches", () => {
    for (const p of ["/signin", "/signin/check-email", "/signin/expired", "/signup", "/reset-password", "/auth/callback", "/auth/session", "/join/ABC123", "/api/me", "/api"]) {
      expect(routeFor(p, "navigate", "GET"), p).toBe("never");
      expect(routeFor(p, "cors", "GET"), p).toBe("never");
    }
  });

  it("matches a prefix on a path boundary only", () => {
    expect(isNeverCached("/signing")).toBe(false);
    expect(isNeverCached("/apiary")).toBe(false);
    expect(isNeverCached("/authors")).toBe(false);
    expect(isNeverCached("/joint")).toBe(false);
    expect(routeFor("/signing", "navigate", "GET")).toBe("navigate");
  });

  it("serves build assets, icons and fonts cache first", () => {
    for (const p of [
      "/_next/static/chunks/app-1a2b.js",
      "/_next/static/css/x.css",
      "/_next/static/media/saira.woff2",
      "/icons/icon-192.png",
      "/fonts/a.ttf",
    ]) {
      expect(routeFor(p, "no-cors", "GET"), p).toBe("static");
    }
  });

  it("treats page loads as network first, including the app shell", () => {
    for (const p of [...PRECACHE_PAGES, "/entry/abc", "/foods/oat"]) {
      expect(routeFor(p, "navigate", "GET"), p).toBe("navigate");
    }
  });

  it("leaves everything else to the browser", () => {
    expect(routeFor("/", "cors", "GET")).toBe("pass"); // a client-side fetch, not a page load
    expect(routeFor("/manifest.webmanifest", "cors", "GET")).toBe("pass");
    expect(routeFor("/", "navigate", "POST")).toBe("pass");
    expect(routeFor("/_next/static/chunks/a.js", "cors", "POST")).toBe("pass");
  });
});

describe("a service-worker update never reloads while the outbox is busy (cc-68)", () => {
  const idle = { tapped: true, busy: false, saving: false, offline: false, failed: 0 };

  it("is only applied when the person tapped Tải lại and nothing waits or is being sent", () => {
    expect(canApplyUpdate({ tapped: false, busy: false })).toBe(false);
    expect(canApplyUpdate({ tapped: true, busy: true })).toBe(false);
    expect(canApplyUpdate({ tapped: true, busy: false })).toBe(true);
  });

  it("the toast says what it is doing: ready before the tap, waiting while a send runs, blocked when writes wait on the person or the network", () => {
    expect(updatePhase({ ...idle, tapped: false, busy: true })).toBe("ready");
    expect(updatePhase(idle)).toBe("waiting");
    expect(updatePhase({ ...idle, busy: true, saving: true })).toBe("waiting");
    // Waiting out a backoff, online, nothing refused: it will go by itself
    expect(updatePhase({ ...idle, busy: true })).toBe("waiting");
    // Refused writes, or no network: nothing will clear it without the person
    expect(updatePhase({ ...idle, busy: true, failed: 2 })).toBe("blocked");
    expect(updatePhase({ ...idle, busy: true, offline: true })).toBe("blocked");
  });

  it("the update offer reads the sync summary before it asks the worker to take over", () => {
    const source = readFileSync(path.resolve(__dirname, "../../components/pwa/update-offer.tsx"), "utf8");
    expect(source).toMatch(/canApplyUpdate\(\{ tapped, busy \}\)/);
    // The tap itself only asks for a send; SKIP_WAITING is posted from the effect that waits for an idle outbox
    expect(source.indexOf("SKIP_WAITING")).toBeGreaterThan(source.indexOf("canApplyUpdate"));
  });
});

describe("shouldRegisterServiceWorker", () => {
  it("registers in production only, and only where service workers exist", () => {
    expect(shouldRegisterServiceWorker("production", true)).toBe(true);
    expect(shouldRegisterServiceWorker("development", true)).toBe(false);
    expect(shouldRegisterServiceWorker("test", true)).toBe(false);
    expect(shouldRegisterServiceWorker("production", false)).toBe(false);
    expect(shouldRegisterServiceWorker(undefined, true)).toBe(false);
  });
});

describe("install state", () => {
  it("picks the view in order: installed, prompt, ios, manual", () => {
    expect(installView({ standalone: true, canPrompt: true, ios: true })).toBe("installed");
    expect(installView({ standalone: false, canPrompt: true, ios: false })).toBe("prompt");
    expect(installView({ standalone: false, canPrompt: false, ios: true })).toBe("ios");
    expect(installView({ standalone: false, canPrompt: false, ios: false })).toBe("manual");
  });

  const SAFARI_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
  const CHROME_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1";
  const MAC_SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
  const ANDROID_CHROME =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

  it("recognises iOS devices, iPadOS included, and Safari among them", () => {
    expect(isIosDevice(SAFARI_IPHONE)).toBe(true);
    expect(isIosDevice(MAC_SAFARI, 5)).toBe(true); // iPad asking for the desktop site
    expect(isIosDevice(MAC_SAFARI, 0)).toBe(false);
    expect(isIosDevice(ANDROID_CHROME)).toBe(false);
    expect(isIosSafari(SAFARI_IPHONE)).toBe(true);
    expect(isIosSafari(CHROME_IPHONE)).toBe(false);
  });
});

describe("public/sw.js", () => {
  const source = readFileSync(join(__dirname, "..", "..", "public", "sw.js"), "utf8");
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    self: { addEventListener() {}, location: { origin: "http://x" } },
  };
  runInNewContext(source, sandbox);
  const sw = sandbox.module.exports as { routeFor: typeof routeFor; PAGES: string[]; VERSION: string };

  it("makes the same routing decision as lib/pwa.ts", () => {
    const paths = [
      "/", "/explore", "/settings", "/offline", "/entry/1", "/signin", "/signin/expired", "/signup",
      "/reset-password", "/api/x", "/login", "/signing", "/_next/static/a.js", "/icons/icon-512.png", "/m.woff2",
      "/manifest.webmanifest", "/auth", "/auth/callback", "/join/ABC123", "/joining", "/add", "/settings/whats-new",
    ];
    for (const path of paths) {
      for (const mode of ["navigate", "cors", "no-cors"]) {
        for (const method of ["GET", "POST"]) {
          expect(sw.routeFor(path, mode, method), `${method} ${mode} ${path}`).toBe(routeFor(path, mode, method));
        }
      }
    }
  });

  it("precaches the same pages and carries a version for the cache name", () => {
    expect(sw.PAGES).toEqual([...PRECACHE_PAGES]);
    expect(sw.VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe("manifest colours", () => {
  it("are the paper and ink tokens", () => {
    const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf8").toLowerCase();
    expect(css).toContain(`--color-page: ${PAPER_COLOR.toLowerCase()}`);
    expect(css).toContain(`--color-ink: ${INK_COLOR.toLowerCase()}`);
  });
});

describe("STANDALONE_HOME_SCRIPT", () => {
  function run(pathname: string, search: string, standalone: { media?: boolean; ios?: boolean }) {
    const replaced: string[] = [];
    const root = { style: { visibility: "" } };
    const window = {
      matchMedia: (q: string) => ({ matches: q === "(display-mode: standalone)" && standalone.media === true }),
      navigator: { standalone: standalone.ios },
      location: { pathname, search, replace: (to: string) => replaced.push(to) },
    };
    runInNewContext(STANDALONE_HOME_SCRIPT, { window, document: { documentElement: root } });
    return { replaced, hidden: root.style.visibility === "hidden" };
  }

  it("sends an installed app on / to Hôm nay, query kept, hidden until it leaves", () => {
    expect(run("/", "", { media: true })).toEqual({ replaced: ["/app"], hidden: true });
    expect(run("/", "?date=2026-10-15", { ios: true })).toEqual({ replaced: ["/app?date=2026-10-15"], hidden: true });
  });

  it("leaves the link page in a browser tab, and every other route", () => {
    expect(run("/", "", {})).toEqual({ replaced: [], hidden: false });
    expect(run("/app", "", { media: true })).toEqual({ replaced: [], hidden: false });
    expect(run("/settings", "", { ios: true })).toEqual({ replaced: [], hidden: false });
  });
});
