"""fix/training-close-motion (overnight 22→23/10, job 8): closing Ngày tập slides back, it does not cut.

At 390 (demo build, normal motion): Hôm nay › the Ngày tập pill › the header's back (✕) plays one view transition marked
data-vt="back" (a history Back, the push slide in reverse), not skipped; the same for Đủ 22 vi chất, which had the same back link.
Opened straight from a link (no Hôm nay before it), the back link still starts one view transition (a Back, not a cut).
On main both back links were a plain link to /app: a push to a tab, so no view transition at all.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/training_close_vt.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/micros/** components/ui/app-header.tsx lib/nav-direction.ts components/route-transition.tsx
import json
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
VT = """
(() => {
  try { localStorage.setItem('h1t_settings_v1_demo', %s); } catch (e) {}
  window.__vt = [];
  const orig = document.startViewTransition;
  if (!orig) return;
  document.startViewTransition = function (...args) {
    window.__vt.push({ vt: document.documentElement.dataset.vt || null });
    const r = orig.apply(this, args);
    const skip = r.skipTransition.bind(r);
    r.skipTransition = () => { window.__vt.push({ skip: true }); return skip(); };
    return r;
  };
})();
""" % json.dumps(SETTINGS)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def closes_back(browser, name, link_prefix):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(VT)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    pg.locator(f"a[href^='{link_prefix}']:visible").first.click()
    pg.wait_for_url(re.compile(link_prefix), timeout=8000)
    pg.wait_for_timeout(1500)
    pg.evaluate("window.__vt = []")
    pg.locator("header [aria-label^='Quay lại']:visible").first.click()
    pg.wait_for_url(re.compile(r"/app"), timeout=8000)
    pg.wait_for_timeout(1200)
    log = pg.evaluate("window.__vt")
    starts = [e for e in log if "vt" in e]
    check(len(starts) == 1 and starts[0]["vt"] == "back" and not any(e.get("skip") for e in log), f"{name}: the header back slides back ({log})")
    ctx.close()


def direct(browser, name, url):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(VT)
    pg = ctx.new_page()
    pg.goto(BASE + url, wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.evaluate("window.__vt = []")
    pg.locator("header [aria-label^='Quay lại']:visible").first.click()
    pg.wait_for_url(re.compile(r"/app"), timeout=8000)
    pg.wait_for_timeout(1200)
    log = pg.evaluate("window.__vt")
    check(len([e for e in log if "vt" in e]) == 1 and not any(e.get("skip") for e in log), f"{name} opened from a link: its back link still animates ({log})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        closes_back(browser, "Ngày tập", "/training")
        closes_back(browser, "Đủ 22 vi chất", "/micros")
        direct(browser, "Ngày tập", "/training")
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
