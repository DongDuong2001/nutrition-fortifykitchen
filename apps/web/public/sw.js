/* H1T MICRO service worker. Hand-written, no build step.
 *  - precaches the app shell and the build assets those pages reference
 *  - static assets (/_next/static, icons, fonts): cache first
 *  - page loads: network first, then the cache, then /offline
 *  - auth routes and the API: never cached (always the network)
 *  - an update waits until the page asks for it (SKIP_WAITING); it never takes over mid-edit.
 * Bump VERSION on a release that changes this file or the shell list. lib/pwa.ts holds the tested copy of routeFor. */
const VERSION = "2026-10-18.15";
const SHELL_CACHE = "h1t-shell-" + VERSION;
const STATIC_CACHE = "h1t-static-" + VERSION;
const PAGES = ["/", "/app", "/trends", "/explore", "/settings", "/offline"];
const ICONS = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon.ico"];
const NEVER = ["/signin", "/signup", "/reset-password", "/login", "/api"];
const FONT_FILE = /\.(?:woff2?|ttf|otf)$/i;
const STATIC_LIMIT = 300;
const SHELL_LIMIT = 80;

function under(pathname, prefix) {
  return pathname === prefix || pathname.indexOf(prefix + "/") === 0;
}

function routeFor(pathname, mode, method) {
  if (method !== "GET") return "pass";
  if (NEVER.some(function (p) { return under(pathname, p); })) return "never";
  if (pathname.indexOf("/_next/static/") === 0 || pathname.indexOf("/icons/") === 0 || FONT_FILE.test(pathname)) return "static";
  if (mode === "navigate") return "navigate";
  return "pass";
}

/** Build assets named in a page: scripts, styles and fonts, whether the slashes are escaped (RSC payload) or not. */
function assetsIn(text) {
  const found = text.replace(/\\\//g, "/").match(/\/_next\/static\/[A-Za-z0-9_\-./%~]+\.(?:js|css|woff2?)/g);
  return found || [];
}

async function precache() {
  const shell = await caches.open(SHELL_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  const assets = new Set(ICONS);

  await Promise.all(
    PAGES.map(async function (url) {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok || res.redirected) return;
        const copy = res.clone();
        const html = await res.text();
        await shell.put(url, copy);
        assetsIn(html).forEach(function (a) { assets.add(a); });
      } catch (e) {
        /* offline while installing: the page is cached on the next visit */
      }
    })
  );
  if (!(await shell.match("/offline"))) throw new Error("offline page not cached");

  // Fonts are named inside the stylesheets, so read those too.
  const sheets = Array.from(assets).filter(function (a) { return a.slice(-4) === ".css"; });
  await Promise.all(
    sheets.map(async function (sheet) {
      try {
        const css = await (await fetch(sheet)).text();
        const re = /url\(["']?([^"')]+\.(?:woff2?|ttf|otf))["']?\)/gi;
        let m;
        while ((m = re.exec(css))) assets.add(new URL(m[1], self.location.origin + sheet).pathname);
      } catch (e) {
        /* the font is cached on first use */
      }
    })
  );

  await Promise.all(
    Array.from(assets).map(function (a) {
      return statics.add(a).catch(function () {});
    })
  );
}

/** Drops the oldest entries past the limit; the entries named in keep are never dropped. */
async function trim(cache, limit, keep) {
  const keys = await cache.keys();
  const removable = keys.filter(function (r) { return !keep || keep.indexOf(new URL(r.url).pathname) === -1; });
  const allowed = limit - (keep ? keep.length : 0);
  for (let i = 0; i < removable.length - allowed; i++) await cache.delete(removable[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    trim(cache, STATIC_LIMIT);
  }
  return res;
}

async function offlinePage() {
  const page = await caches.match("/offline", { cacheName: SHELL_CACHE });
  return page || new Response("Ngoại tuyến", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function networkFirst(request, pathname) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    // A redirect cannot be replayed to a navigation from a cache, so only plain 200s are stored.
    if (res.ok && !res.redirected && res.type === "basic") {
      await cache.put(pathname, res.clone());
      trim(cache, SHELL_LIMIT, PAGES);
    }
    return res;
  } catch (e) {
    return (await cache.match(pathname)) || offlinePage();
  }
}

self.addEventListener("install", function (event) {
  // No skipWaiting here: an update waits until the person taps "Tải lại".
  event.waitUntil(precache());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(function (n) { return n.indexOf("h1t-") === 0 && n !== SHELL_CACHE && n !== STATIC_CACHE; })
          .map(function (n) { return caches.delete(n); })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const kind = routeFor(url.pathname, request.mode, request.method);
  if (kind === "static") {
    event.respondWith(cacheFirst(request));
  } else if (kind === "navigate") {
    event.respondWith(networkFirst(request, url.pathname));
  } else if (kind === "never" && request.mode === "navigate") {
    // Network only. When it fails the person sees /offline; the sign-in page itself is never served from a cache.
    event.respondWith(fetch(request).catch(offlinePage));
  }
});

if (typeof module !== "undefined" && module.exports) module.exports = { routeFor: routeFor, PAGES: PAGES, VERSION: VERSION };
