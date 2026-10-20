"""cc-27f: lists console messages that mention localhost (warnings and errors) per route, so their source can be reported.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27_console.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/add/** app/(app)/foods/[id]/** app/(app)/foods/compare/** app/(app)/micros/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
ROUTES = ["/app", "/micros", "/add?meal=snack", "/foods/food-cha-la", "/trends", "/settings", "/explore", "/foods/compare?ids=food-cha-la,food-yen-mach"]
found = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for route in ROUTES:
        pg = browser.new_page(viewport={"width": 390, "height": 844})
        pg.on("console", lambda m, r=route: found.append((r, m.type, m.text[:200])) if "localhost" in m.text.lower() else None)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(500)
        pg.close()
    browser.close()
for item in found:
    print(item)
print(f"{len(found)} console messages mention localhost")
sys.exit(0)
