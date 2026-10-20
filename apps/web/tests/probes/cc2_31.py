"""cc2-31a: nav tabs, at 390 and 1280.

- the nav lists Hôm nay (/) · Tổng quan (/trends) · Khám phá (/explore) · Cài đặt (/settings), in that order; Nhật ký is no longer a tab
- phone: [+] (#mobile-add-fab) sits between Tổng quan and Khám phá; sidebar: "Thêm món" is present
- each link goes to its href and is the only active item afterwards
- the active tab: / and /micros → Hôm nay, /trends and its sub-tabs → Tổng quan, /explore → Khám phá, /settings → Cài đặt
- Tổng quan sub-tabs (cc2-31b): /trends = Tóm tắt, /trends/energy = Năng lượng, /trends/micros = Vi chất, /trends/body = Cơ thể
- every checked route answers 200 (no 404) and has no horizontal scroll
Screenshots: .screenshots/cc2-31-nav-390.png, cc2-31-sidebar-1280.png, cc2-31-trends-390.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_31.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/energy/** app/(app)/(tabs)/trends/micros/** app/(app)/micros/** app/page.tsx
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
TABS = [("Hôm nay", "/app"), ("Tổng quan", "/trends"), ("Khám phá", "/explore"), ("Cài đặt", "/settings")]
# route → the only tab that may be active there
ACTIVE = [
    ("/app", "Hôm nay"),
    ("/micros", "Hôm nay"),
    ("/trends", "Tổng quan"),
    ("/trends/energy", "Tổng quan"),
    ("/trends/micros", "Tổng quan"),
    ("/trends/body", "Tổng quan"),
    ("/explore", "Khám phá"),
    ("/settings", "Cài đặt"),
]
# Tổng quan sub-tabs: the route → the one sub-tab that must be current there (cc2-31b: Tóm tắt is /trends)
SUBTABS = [
    ("/trends", "Tóm tắt"),
    ("/trends/energy", "Năng lượng"),
    ("/trends/micros", "Vi chất"),
    ("/trends/body", "Cơ thể"),
]
NAV = 'nav[aria-label="Điều hướng chính"]:visible'
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def path_of(pg):
    return urlparse(pg.url).path or "/"


def go(pg, route):
    resp = pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(400)
    return resp.status if resp else None


def active_tabs(pg):
    """Labels of the nav items marked aria-current=page in the visible nav."""
    return [a.strip() for a in pg.locator(f'{NAV} a[aria-current="page"]').all_inner_texts()]


def no_h_scroll(pg, where):
    scroll_w, inner_w = pg.evaluate(
        "() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]"
    )
    check(scroll_w <= inner_w, f"{where}: no horizontal scroll ({scroll_w} <= {inner_w})")


def probe_nav(pg, name):
    status = go(pg, "/app")
    check(status == 200, f"{name}: / answers 200 (got {status})")
    check(pg.locator(NAV).count() == 1, f"{name}: one visible main nav (found {pg.locator(NAV).count()})")
    links = pg.locator(f"{NAV} a").evaluate_all(
        "els => els.map(e => [e.textContent.trim(), e.getAttribute('href')]).filter(([t]) => t)"
    )
    check(links == [[t, h] for t, h in TABS], f"{name}: nav links are {TABS} in order (got {links})")
    for label, _ in TABS:
        h = pg.locator(f'{NAV} a:has-text("{label}")').first.bounding_box()["height"]
        check(h >= 44, f"{name}: '{label}' is at least 44 px tall ({h:.0f})")
    x = {label: pg.locator(f'{NAV} a:has-text("{label}")').first.bounding_box()["x"] for label, _ in TABS}
    if name == "390":
        fab = pg.locator("#mobile-add-fab >> visible=true").bounding_box()
        check(fab is not None, "390: [+] is visible")
        if fab:
            check(
                x["Hôm nay"] < x["Tổng quan"] < fab["x"] < x["Khám phá"] < x["Cài đặt"],
                f"390: [+] sits between Tổng quan and Khám phá (x: {x}, fab {fab['x']:.0f})",
            )
    else:
        check(pg.locator("#desktop-add-btn >> visible=true").count() == 1, "1280: 'Thêm món' button is in the sidebar")
    no_h_scroll(pg, f"{name} /")
    pg.screenshot(path=str(SHOTS / ("cc2-31-nav-390.png" if name == "390" else "cc2-31-sidebar-1280.png")))


def probe_active(pg, name):
    for route, label in ACTIVE:
        status = go(pg, route)
        check(status == 200, f"{name}: {route} answers 200 (got {status})")
        actives = active_tabs(pg)
        check(actives == [label], f"{name}: {route} has only '{label}' active (got {actives})")
        no_h_scroll(pg, f"{name} {route}")


def probe_subtabs(pg, name):
    for route, label in SUBTABS:
        status = go(pg, route)
        check(status == 200, f"{name}: {route} answers 200, not 404 (got {status})")
        current = pg.locator('nav[aria-label="Tổng quan"] a[aria-current="page"]:visible').all_inner_texts()
        check(current == [label], f"{name}: {route} has '{label}' as the only Tổng quan sub-tab current (got {current})")
        if route == "/trends" and name == "390":
            pg.screenshot(path=str(SHOTS / "cc2-31-trends-390.png"))


def probe_click(pg, name):
    for label, route in TABS:
        go(pg, "/micros")
        pg.locator(f'{NAV} a:has-text("{label}")').first.click()
        pg.wait_for_url(lambda u, r=route: (urlparse(u).path or "/") == r, timeout=8000)
        pg.wait_for_timeout(300)
        actives = active_tabs(pg)
        check(actives == [label], f"{name}: tapping '{label}' lands on {route} with it active (got {actives})")


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, size in SIZES:
            ctx = browser.new_context(viewport=size)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            for probe in (probe_nav, probe_active, probe_subtabs, probe_click):
                try:
                    probe(pg, name)
                except Exception as err:  # a missing control must show up as a failed check, not a crash
                    check(False, f"{name}: {probe.__name__} stopped: {str(err).splitlines()[0][:160]}")
            check(not errors, f"{name}: no uncaught page errors ({errors[:2]})")
            ctx.close()
        browser.close()

    for n in notes:
        print("  " + n)
    for pr in problems:
        print("  FAIL: " + pr)
    if problems:
        print(f"[FAIL] cc2-31a: {len(problems)} problems, {len(notes)} ok")
        sys.exit(1)
    print(f"ALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
