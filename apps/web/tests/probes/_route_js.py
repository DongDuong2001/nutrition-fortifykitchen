"""The JS a route loads on a cold visit (390 x 844 phone, demo build): requests and gzip bytes until the network is idle, per route.
Next 16's webpack build prints no First Load JS column, so this is the route table for a PR note. Not a probe (probe:all skips names that start with _).
Run with: ALIGN_BASE_URL=http://localhost:3123 python3 tests/probes/_route_js.py
"""
import gzip
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _demo  # noqa: E402,F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
ROUTES = ["/app", "/add", "/explore"]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for route in ROUTES:
            ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            ctx.add_init_script("try { localStorage.setItem('h1t_onboarding_off', '1'); localStorage.setItem('h1t_whats_new_off', '1') } catch (e) {}")
            pg = ctx.new_page()
            sizes = {}

            def on_response(r):
                if r.request.resource_type == "script":
                    try:
                        sizes[r.url] = len(gzip.compress(r.body(), 6))
                    except Exception:
                        pass

            pg.on("response", on_response)
            pg.goto(BASE + route, wait_until="networkidle")
            pg.wait_for_timeout(1500)
            total = sum(sizes.values())
            print(f"{route:10s} {len(sizes):3d} scripts  {total / 1024:7.1f} kB gzip")
            ctx.close()
        browser.close()


main()
