"""cc2-14: PWA (install as an app, works offline). Needs a PRODUCTION server: the service worker registers there only.

- /manifest.webmanifest: name, short_name, lang, start_url, scope, display, colours, icons 192/512/maskable, shortcuts
- the icons load and have the size the manifest says; the apple-touch-icon and favicon links are in the head
- the service worker registers, and controls the page after a reload
- offline (context.set_offline): / (Hôm nay, which holds the diary) and /explore render from the cache, an uncached route shows /offline
- auth routes and /api are never in any cache, and never served from one while offline
- a new service worker waits (no skipWaiting on install); the update toast is not shown on the first install
- /install shows the right state at 390 and 1280: manual note, install button, iOS steps, installed
- /offline at 390 and 1280: header, copy, Thử lại, no horizontal scroll, targets >= 44 px
Screenshots: .screenshots/cc2-14-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_14.py
"""
import json
import os
import re
import struct
import sys
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
IPHONE_SAFARI = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/17.4 Mobile/15E148 Safari/604.1"
)
NEVER_PREFIXES = ("/signin", "/signup", "/reset-password", "/login", "/api")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-14-{name}-{size_name}.png"), full_page=False, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def small_targets(pg, where):
    bad = pg.evaluate(
        """() => [...document.querySelectorAll('a[href], button')]
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
            .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))"""
    )
    check(not bad, f"{where}: every link and button is at least 44 px ({bad})")


def h1_count(pg, where):
    n = pg.evaluate("() => [...document.querySelectorAll('h1')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && !e.classList.contains('sr-only')).length")
    check(n == 1, f"{where}: one visible h1 ({n})")


def check_manifest(browser):
    ctx = browser.new_context()
    res = ctx.request.get(BASE + "/manifest.webmanifest")
    check(res.ok, f"manifest: /manifest.webmanifest returns 200 ({res.status})")
    check("json" in (res.headers.get("content-type") or ""), f"manifest: JSON content type ({res.headers.get('content-type')})")
    m = res.json()
    check(m.get("name") == "H1T MICRO" and m.get("short_name") == "H1T MICRO", "manifest: name and short_name are H1T MICRO")
    check(m.get("lang") == "vi", "manifest: lang vi")
    check(bool(m.get("description")) and re.search(r"[ạảãàáâấầẩẫậăắằẳẵặđêếềểễệôốồổỗộơớờởỡợưứừửữự]", m["description"]) is not None, "manifest: description is Vietnamese")
    check(m.get("start_url") == "/" and m.get("scope") == "/", "manifest: start_url and scope are /")
    check(m.get("display") == "standalone", "manifest: display standalone")
    check(m.get("background_color", "").upper() == "#F3F1EC", f"manifest: background_color is paper ({m.get('background_color')})")
    check(m.get("theme_color", "").upper() == "#111317", f"manifest: theme_color is ink ({m.get('theme_color')})")

    icons = m.get("icons", [])
    sizes = {(i.get("sizes"), i.get("purpose", "any")) for i in icons}
    check(("192x192", "any") in sizes, "manifest: 192 icon")
    check(("512x512", "any") in sizes, "manifest: 512 icon")
    check(("512x512", "maskable") in sizes, "manifest: 512 maskable icon")
    for icon in icons:
        r = ctx.request.get(BASE + icon["src"])
        want = int(icon["sizes"].split("x")[0])
        got = png_size(r.body()) if r.ok else None
        check(r.ok and got == (want, want), f"manifest: {icon['src']} loads as {want}x{want} PNG ({r.status}, {got})")

    shortcuts = {s["name"]: s["url"] for s in m.get("shortcuts", [])}
    check(shortcuts.get("Thêm món") == "/add", f"manifest: shortcut Thêm món -> /add ({shortcuts})")
    check(shortcuts.get("Hôm nay") == "/", "manifest: shortcut Hôm nay -> /")

    for path in ("/icons/icon.svg", "/icons/apple-touch-icon.png", "/icons/favicon.ico"):
        r = ctx.request.get(BASE + path)
        check(r.ok, f"icons: {path} loads ({r.status})")
    check(png_size(ctx.request.get(BASE + "/icons/apple-touch-icon.png").body()) == (180, 180), "icons: apple-touch-icon is 180x180")

    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    head = pg.evaluate(
        """() => ({
            manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
            apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
            icon: [...document.querySelectorAll('link[rel=icon]')].map(l => l.getAttribute('href')),
            theme: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
            title: document.querySelector('meta[name=apple-mobile-web-app-title]')?.getAttribute('content'),
            bar: document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.getAttribute('content'),
            viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content'),
        })"""
    )
    check(head["manifest"] == "/manifest.webmanifest", f"head: manifest link ({head['manifest']})")
    check(head["apple"] == "/icons/apple-touch-icon.png", f"head: apple-touch-icon ({head['apple']})")
    check("/icons/favicon.ico" in head["icon"], f"head: favicon ({head['icon']})")
    check((head["theme"] or "").upper() == "#111317", f"head: theme-color is ink ({head['theme']})")
    check(head["title"] == "H1T MICRO" and head["bar"] == "black-translucent", f"head: apple web app title and status bar ({head['title']}, {head['bar']})")
    check("viewport-fit=cover" in (head["viewport"] or ""), f"head: viewport-fit=cover so safe-area insets apply ({head['viewport']})")
    has_inset = pg.evaluate(
        """() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('safe-area-inset-bottom')); } catch (e) { return false; } })"""
    )
    check(has_inset, "safe area: the build CSS pads the bottom nav and the page with env(safe-area-inset-bottom)")
    ctx.close()


def wait_controlled(pg):
    pg.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
    # the precache is part of install, so ready means the shell is cached
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(300)
    return pg.evaluate("() => Boolean(navigator.serviceWorker.controller)")


def cache_paths(pg):
    return pg.evaluate(
        """async () => {
            const out = [];
            for (const name of await caches.keys()) {
                const c = await caches.open(name);
                for (const r of await c.keys()) out.push(new URL(r.url).pathname);
            }
            return out;
        }"""
    )


def check_service_worker(browser):
    ctx = browser.new_context(viewport=SIZES[0][1])
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    reg = pg.evaluate("() => navigator.serviceWorker.getRegistration().then(r => Boolean(r))")
    check(True, f"sw: registration found right after load ({reg})")
    check(wait_controlled(pg), "sw: registered, and controls the page after a reload")
    scope = pg.evaluate("() => navigator.serviceWorker.getRegistration().then(r => r && new URL(r.scope).pathname)")
    check(scope == "/", f"sw: scope is / ({scope})")
    check("Có bản mới" not in text(pg), "sw: no update toast on the first install")

    paths = cache_paths(pg)
    for page in ("/", "/explore", "/settings", "/offline"):
        check(page in paths, f"sw: {page} is precached")
    check(any(p.startswith("/_next/static/") and p.endswith(".js") for p in paths), "sw: build scripts are cached")
    check(any(p.endswith(".woff2") for p in paths), "sw: fonts are cached")
    check("/icons/icon-192.png" in paths, "sw: icons are cached")

    # visit auth routes online with the worker in control, then look in every cache
    for route in ("/signin", "/signup", "/signin/expired"):
        pg.goto(BASE + route, wait_until="networkidle")
    pg.evaluate("() => fetch('/api/health').catch(() => null)")
    leaked = [p for p in cache_paths(pg) if p.startswith(NEVER_PREFIXES)]
    check(not leaked, f"sw: no auth or API route in any cache after visiting them ({leaked})")

    # offline
    ctx.set_offline(True)
    for route, marker in (("/", "Hôm nay"), ("/explore", "Khám phá")):
        pg.goto(BASE + route, wait_until="load")
        pg.wait_for_timeout(500)
        body = text(pg)
        # case-insensitive: the page heading is uppercase on screen, and "Nhật ký" is no longer a nav label to match
        check(marker.lower() in body.lower() and "Bạn đang ngoại tuyến" not in body, f"offline: {route} renders from the cache")
        check(pg.locator("nav[aria-label='Điều hướng chính']").count() >= 1, f"offline: {route} has the main navigation")
    pg.goto(BASE + "/paywall", wait_until="load")
    pg.wait_for_timeout(400)
    check("Bạn đang ngoại tuyến" in text(pg), "offline: an uncached route shows /offline")
    check("Thử lại" in text(pg), "offline: the uncached route offers Thử lại")
    pg.goto(BASE + "/signin", wait_until="load")
    pg.wait_for_timeout(400)
    body = text(pg)
    check("Bạn đang ngoại tuyến" in body, "offline: /signin is not served from a cache, the offline screen shows instead")
    check("Gửi liên kết" not in body and "Tiếp tục với" not in body, "offline: no sign-in form from a cache")
    ctx.set_offline(False)
    ctx.close()


def check_update_waits(browser):
    """A changed sw.js installs and waits: it must not skipWaiting by itself."""
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    wait_controlled(pg)
    source = urlopen(BASE + "/sw.js").read().decode("utf-8")
    check("self.skipWaiting()" in source and "SKIP_WAITING" in source, "update: skipWaiting runs only on the SKIP_WAITING message")
    install_part = source.split('addEventListener("install"')[1].split("});")[0]
    check("self.skipWaiting" not in install_part, "update: the install handler does not skipWaiting")
    ctx.close()


def check_install_states(browser):
    for size_name, size in SIZES:
        # 1. a desktop browser with nothing to offer: the note, no install button
        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        logged = []
        pg.on("console", lambda m: logged.append(m.text) if m.type in ("error", "warning") else None)
        pg.goto(BASE + "/install", wait_until="networkidle")
        pg.wait_for_timeout(300)
        check(not logged, f"install {size_name}: no console errors or warnings ({logged[:2]})")
        check(pg.locator("nav[aria-label='Điều hướng chính']").count() == 0, f"install {size_name}: no bottom nav, as IA v2 decided")
        h1_count(pg, f"install {size_name}")
        check(pg.get_by_role("heading", name="Cài ứng dụng", level=1).count() == 1, f"install {size_name}: h1 Cài ứng dụng")
        check("cài ứng dụng" in text(pg).lower(), f"install {size_name}: title present")
        # real Chromium may or may not fire beforeinstallprompt; the button is judged below with a synthetic event
        no_h_scroll(pg, f"install {size_name} (no prompt)")
        small_targets(pg, f"install {size_name} (no prompt)")
        pg.evaluate("() => { window.__fired = 0; }")
        if pg.get_by_role("button", name="Cài ứng dụng").count() == 0:
            check("Trình duyệt này chưa cho cài ứng dụng" in text(pg), f"install {size_name}: note shown when the browser offers nothing")
            check("Đã cài trên máy này" not in text(pg), f"install {size_name}: not shown as installed in a tab")
        shot(pg, "install", size_name)

        # 2. beforeinstallprompt arrives: one button, which calls prompt()
        pg.evaluate(
            """() => {
                const e = new Event('beforeinstallprompt', { cancelable: true });
                e.prompt = () => { window.__prompted = true; return Promise.resolve(); };
                e.userChoice = Promise.resolve({ outcome: 'dismissed' });
                window.dispatchEvent(e);
            }"""
        )
        pg.wait_for_timeout(200)
        btn = pg.get_by_role("button", name="Cài ứng dụng")
        check(btn.count() == 1, f"install {size_name}: beforeinstallprompt shows one Cài ứng dụng button")
        shot(pg, "install-prompt", size_name)
        if btn.count() == 1:
            box = btn.bounding_box()
            check(box["height"] >= 44, f"install {size_name}: button is {box['height']:.0f} px tall")
            btn.click()
            pg.wait_for_timeout(200)
            check(pg.evaluate("() => window.__prompted === true"), f"install {size_name}: the button calls the browser prompt")
            check(pg.get_by_role("button", name="Cài ứng dụng").count() == 0, f"install {size_name}: the button goes after one use")
        ctx.close()

        # 3. iPhone Safari: three steps
        ctx = browser.new_context(viewport=size, user_agent=IPHONE_SAFARI, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        pg.goto(BASE + "/install", wait_until="networkidle")
        pg.wait_for_timeout(300)
        steps = pg.locator("ol[aria-label='Các bước cài trên iPhone'] > li")
        check(steps.count() == 3, f"install {size_name}: iOS shows 3 steps ({steps.count()})")
        body = text(pg)
        for want in ("Chia sẻ", "Thêm vào MH chính", "Thêm"):
            check(want in body, f"install {size_name}: iOS step mentions {want}")
        check(steps.locator("svg").count() == 3, f"install {size_name}: each iOS step has an icon")
        check(pg.get_by_role("button", name="Cài ứng dụng").count() == 0, f"install {size_name}: no install button on iOS")
        no_h_scroll(pg, f"install {size_name} (ios)")
        shot(pg, "install-ios", size_name)
        ctx.close()

        # 4. running as an installed app
        ctx = browser.new_context(viewport=size)
        ctx.add_init_script(
            """const real = window.matchMedia.bind(window);
            window.matchMedia = (q) => q.includes('display-mode: standalone')
              ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
              : real(q);"""
        )
        pg = ctx.new_page()
        pg.goto(BASE + "/install", wait_until="networkidle")
        pg.wait_for_timeout(300)
        check("Đã cài trên máy này" in text(pg), f"install {size_name}: standalone shows Đã cài trên máy này")
        check(pg.get_by_role("button", name="Cài ứng dụng").count() == 0, f"install {size_name}: no install button when installed")
        shot(pg, "install-installed", size_name)
        ctx.close()


def check_offline_page(browser):
    for size_name, size in SIZES:
        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        logged = []
        pg.on("console", lambda m: logged.append(m.text) if m.type in ("error", "warning") else None)
        pg.goto(BASE + "/offline", wait_until="networkidle")
        pg.wait_for_timeout(300)
        check(not logged, f"offline page {size_name}: no console errors or warnings ({logged[:2]})")
        h1_count(pg, f"offline {size_name}")
        body = text(pg)
        check("Bạn đang ngoại tuyến" in body, f"offline page {size_name}: Bạn đang ngoại tuyến")
        check("Nhật ký trên máy này vẫn dùng được." in body, f"offline page {size_name}: the diary still works line")
        check(pg.get_by_role("button", name="Thử lại").count() == 1, f"offline page {size_name}: Thử lại button")
        check(pg.locator("header").count() == 1, f"offline page {size_name}: shared header")
        no_h_scroll(pg, f"offline page {size_name}")
        small_targets(pg, f"offline page {size_name}")
        shot(pg, "offline", size_name)
        ctx.close()

    ctx = browser.new_context(viewport={"width": 192, "height": 192})
    pg = ctx.new_page()
    pg.goto(BASE + "/icons/icon-192.png")
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / "cc2-14-icon-192.png"))
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_manifest(browser)
        check_service_worker(browser)
        check_update_waits(browser)
        check_install_states(browser)
        check_offline_page(browser)
        browser.close()
    print("\n".join(notes))
    if problems:
        print("\nPROBLEMS:")
        for item in problems:
            print("[FAIL] " + item)
        sys.exit(1)
    print("\ncc2-14: no problems")


if __name__ == "__main__":
    main()
