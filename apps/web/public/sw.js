/* H1T MICRO service worker. Hand-written, no build step.
 *  - precaches the app shell and the build assets those pages reference
 *  - static assets (/_next/static, icons, fonts): cache first
 *  - page loads: network first (3 s, then the cached copy), then the cache, then /offline
 *  - auth routes and the API: never cached (always the network)
 *  - an update waits until the page asks for it (SKIP_WAITING); it never takes over mid-edit.
 *  - Background Sync (Android Chrome; iOS has none): the diary's outbox in IndexedDB is sent from here when the network
 *    comes back while the app is closed (cc-68). It only ever removes a write the server has; every other outcome is left
 *    to the page, which owns retries and holds.
 * Bump VERSION on a release that changes this file or the shell list. lib/pwa.ts holds the tested copy of routeFor. */
const VERSION = "2026-10-21.8";
const SHELL_CACHE = "h1t-shell-" + VERSION;
const STATIC_CACHE = "h1t-static-" + VERSION;
const PAGES = ["/", "/app", "/trends", "/explore", "/settings", "/offline"];
const ICONS = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon.ico"];
const NEVER = ["/signin", "/signup", "/reset-password", "/login", "/auth", "/join", "/api"];
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

/**
 * Auth pages: the network only, never a cache. The request navigation preload already started is used instead of a second
 * fetch (a second one would run the middleware twice); when the network fails the person sees /offline.
 */
async function networkOnly(request, preload) {
  try {
    const early = preload ? await preload : undefined;
    return early || (await fetch(request));
  } catch (e) {
    return offlinePage();
  }
}

/** A page load that has not answered in this long is served from the cache (when there is a copy) while the network goes on. */
const NAVIGATION_TIMEOUT_MS = 3000;

/**
 * Page loads: the network, raced against a 3 s clock. A slow network shows the cached page and still refreshes the
 * cache behind it; with no copy the load waits for the network. `preload` is event.preloadResponse (navigation
 * preload: the browser starts the request while this worker boots), used instead of a second fetch.
 */
async function networkFirst(request, pathname, preload, event) {
  const cache = await caches.open(SHELL_CACHE);
  const fromNetwork = (async function () {
    const early = preload ? await preload : undefined;
    const res = early || (await fetch(request));
    // A redirect cannot be replayed to a navigation from a cache, so only plain 200s are stored.
    if (res.ok && !res.redirected && res.type === "basic") {
      await cache.put(pathname, res.clone());
      trim(cache, SHELL_LIMIT, PAGES);
    }
    return res;
  })();
  try {
    const timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, NAVIGATION_TIMEOUT_MS); });
    const first = await Promise.race([fromNetwork, timeout]);
    if (first) return first;
    const copy = await cache.match(pathname);
    if (copy) {
      // The network keeps going: its answer refreshes the cache for the next load
      const rest = fromNetwork.catch(function () {});
      if (event && event.waitUntil) event.waitUntil(rest);
      return copy;
    }
    return await fromNetwork;
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
      // The browser starts a page's request while this worker wakes up (event.preloadResponse in the fetch handler)
      if (self.registration && self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(function () {});
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* ---- Background Sync: the outbox (IndexedDB "h1t", store "outbox", one record per write) ---- */
const OUTBOX_TAG = "h1t-outbox";
const DRAIN_LOCK = "h1t-outbox-drain";
const SENDING_FRESH_MS = 30000;
const REQUEST_MS = 20000;

function idbWait(request) {
  return new Promise(function (resolve, reject) {
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

/** The database as the page made it, or null: opening one that is not there must not create it. */
function openOutboxDb() {
  return new Promise(function (resolve) {
    try {
      const request = indexedDB.open("h1t");
      request.onupgradeneeded = function () { request.transaction.abort(); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
    } catch (e) {
      resolve(null);
    }
  });
}

/* Hotfix 20/10: a diary write carries made_at, when the user made it (never the time of this send): the server judges the day by it.
   lib/late-writes madeAtMs holds the tested copy: madeAt (an entry sent again: its own time), else a plausible createdAt, else the
   write's day at 23:00 Ho Chi Minh time; never later than now. */
function madeAtOfItem(item) {
  const plausible = function (t) { return typeof t === "number" && isFinite(t) && t > Date.UTC(2020, 0, 1); };
  const day = item.date || item.day || "";
  const dayEnd = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(day + "T23:00:00+07:00") : NaN;
  const t = plausible(item.madeAt) ? item.madeAt : plausible(item.createdAt) ? item.createdAt : dayEnd;
  return isNaN(t) ? null : new Date(Math.min(t, Date.now())).toISOString();
}

function stampOutboxItem(item, method, path) {
  const diary = /^\/(days|entries)\//.test(path);
  const madeAt = diary ? madeAtOfItem(item) : null;
  if (method === "DELETE") return { path: madeAt ? path + (path.indexOf("?") >= 0 ? "&" : "?") + "made_at=" + encodeURIComponent(madeAt) : path, body: undefined };
  const payload = madeAt ? Object.assign({}, item.payload, { made_at: madeAt }) : item.payload;
  return { path: path, body: JSON.stringify(payload) };
}

async function sendOutboxItem(meta, item) {
  const method = item.method || "POST";
  const stamped = stampOutboxItem(item, method, item.path || "/days/" + item.date + "/entries");
  const send = function () {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_MS) : null;
    return fetch(meta.apiBase + stamped.path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: stamped.body,
      credentials: "include",
      signal: controller ? controller.signal : undefined,
    }).finally(function () { if (timer) clearTimeout(timer); });
  };
  let res = await send();
  if (res.status === 401) {
    // The cookie lasts about an hour: the same renewal the page makes, once
    await fetch("/auth/session", { cache: "no-store", credentials: "same-origin" }).catch(function () {});
    res = await send();
  }
  return res.status;
}

/**
 * Sends what waits for the account the page last loaded for (the record "sync-meta" in store "kv"), in order, one entry's writes
 * after another, and removes each write the server has. A write that is held, parked, waiting out a backoff, being sent by a page, or
 * about a recipe the server has no row for is left alone, and so is everything behind it for the same entry. Returns how many
 * were sent and whether the network failed (the browser then tries again later).
 */
async function drainOutbox() {
  const db = await openOutboxDb();
  if (!db) return { sent: 0, offline: false };
  try {
    if (!db.objectStoreNames.contains("outbox") || !db.objectStoreNames.contains("kv")) return { sent: 0, offline: false };
    const meta = await idbWait(db.transaction("kv").objectStore("kv").get("sync-meta"));
    if (!meta || !meta.account || typeof meta.apiBase !== "string") return { sent: 0, offline: false };
    const all = await idbWait(db.transaction("outbox").objectStore("outbox").getAll());
    const mine = all.filter(function (i) { return i.scope === meta.account; }).sort(function (a, b) { return (a.seq || 0) - (b.seq || 0); });
    const blocked = new Set();
    let sent = 0;
    let offline = false;
    for (const item of mine) {
      const now = Date.now();
      const recipe = item.payload && typeof item.payload.food_id === "string" && item.payload.food_id.indexOf("recipe-") === 0;
      const sending = item.state === "sending" && now - (item.lastAttemptAt || 0) < SENDING_FRESH_MS;
      if (blocked.has(item.id) || item.held || item.parked || recipe || sending || (item.nextAttemptAt && item.nextAttemptAt > now)) {
        blocked.add(item.id);
        continue;
      }
      let status = 0;
      try {
        status = await sendOutboxItem(meta, item);
      } catch (e) {
        status = 0;
      }
      const method = item.method || "POST";
      if ((status >= 200 && status < 300) || (status === 404 && method === "DELETE")) {
        await idbWait(db.transaction("outbox", "readwrite").objectStore("outbox").delete(item.key));
        sent++;
        continue;
      }
      blocked.add(item.id);
      if (status === 0) {
        offline = true;
        break;
      }
    }
    if (sent > 0) {
      try {
        const channel = new BroadcastChannel("h1t-sync");
        channel.postMessage({ from: "sw", message: { type: "outbox", scope: meta.account } });
        channel.postMessage({ from: "sw", message: { type: "diary", scope: meta.account } });
        channel.close();
      } catch (e) {
        /* the pages read the outbox again when they next look */
      }
    }
    return { sent: sent, offline: offline };
  } finally {
    db.close();
  }
}

/** One drainer at a time, with the page: the same Web Lock lib/sync-engine takes. */
function drainWithLock() {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks || typeof locks.request !== "function") return drainOutbox();
  return locks.request(DRAIN_LOCK, { ifAvailable: true }, function (lock) {
    return lock ? drainOutbox() : { sent: 0, offline: false };
  });
}

self.addEventListener("sync", function (event) {
  if (event.tag !== OUTBOX_TAG) return;
  event.waitUntil(
    drainWithLock().then(function (result) {
      // No answer at all: let the browser try again when the network is back
      if (result && result.offline) throw new Error("outbox: offline");
    })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const kind = routeFor(url.pathname, request.mode, request.method);
  if (kind === "static") {
    event.respondWith(cacheFirst(request));
  } else if (kind === "navigate") {
    event.respondWith(networkFirst(request, url.pathname, event.preloadResponse, event));
  } else if (kind === "never" && request.mode === "navigate") {
    // Network only. When it fails the person sees /offline; the sign-in page itself is never served from a cache.
    event.respondWith(networkOnly(request, event.preloadResponse));
  }
});

if (typeof module !== "undefined" && module.exports) module.exports = { routeFor: routeFor, PAGES: PAGES, VERSION: VERSION, networkFirst: networkFirst, NAVIGATION_TIMEOUT_MS: NAVIGATION_TIMEOUT_MS, networkOnly: networkOnly, drainOutbox: drainOutbox, drainWithLock: drainWithLock, OUTBOX_TAG: OUTBOX_TAG };
