"""feat/glide part 1: a screen's push / back slide runs ONCE, on the navigation commit; nothing after it replays it.

`document.startViewTransition` is counted in the page (an init script). At 390 x 844, demo build:
- Khám phá → Giàu Calcium: exactly 1 view transition (it used to be 2: the push, then the screen's own deferred list render)
- the two Giàu tabs (router.replace ?loai=) and the Mỗi 100 g | Mỗi khẩu phần chips: 0 (they glide in place, they are not a screen change)
- Back from Giàu Calcium: exactly 1
- Hôm nay → Vi chất (a pushed screen) and Khám phá → a food page: exactly 1 each
- a bottom-nav tab: 0 (its glide is CSS on the page, never a snapshot)
- the root has no `data-vt` left and no ::view-transition is live a second after each change
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/glide_vt.py
"""
# PROBE_COVERS: components/route-transition.tsx lib/nav-direction.ts app/(app)/explore/rich/** app/(app)/(tabs)/** app/layout.tsx
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = {"width": 390, "height": 844}
problems = []

COUNT = """() => {
  window.__vt = { n: 0, log: [] };
  const orig = document.startViewTransition && document.startViewTransition.bind(document);
  if (!orig) return;
  document.startViewTransition = function (...args) {
    window.__vt.n += 1;
    window.__vt.log.push([Math.round(performance.now()), location.pathname + location.search]);
    return orig(...args);
  };
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def install(pg):
    # The wrapper has to be there before the page's own scripts run, and again after a full load
    pg.add_init_script(f"({COUNT})()")


def count(pg):
    return pg.evaluate("() => (window.__vt || { n: -1 }).n")


def settle(pg, ms=1100):
    pg.wait_for_timeout(ms)


def counted(pg, label, action, expected, ms=1100):
    pg.evaluate("() => { window.__vt.n = 0; window.__vt.log = []; }")
    action()
    settle(pg, ms)
    n = count(pg)
    check(n == expected, f"{label}: {n} view transition(s), expected {expected} ({pg.evaluate('() => window.__vt.log')})")
    left = pg.evaluate("() => [document.documentElement.dataset.vt || '', document.getAnimations({ subtree: true }).filter(a => a.effect && String(a.effect.pseudoElement || '').startsWith('::view-transition') && a.playState !== 'finished').map(a => a.effect.pseudoElement + ' ' + (a.animationName || '') + ' ' + a.playState)]")
    check(left[0] == "" and not left[1], f"{label}: nothing is left running a second later (data-vt {left[0]!r}, pseudo animations {left[1]})")


def run(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    install(pg)
    pg.goto(f"{BASE}/explore", wait_until="networkidle")
    pg.wait_for_timeout(800)

    tile = pg.locator("a[href='/explore/rich/calcium']").first
    counted(pg, "Khám phá → Giàu Calcium", lambda: tile.click(), 1)
    pg.locator("a[data-food-row]:visible").first.wait_for(timeout=10000)

    supp = pg.get_by_role("tab", name="Thực phẩm bổ sung", exact=True)
    food = pg.get_by_role("tab", name="Thực phẩm", exact=True)
    counted(pg, "Giàu tab Thực phẩm bổ sung", lambda: supp.click(), 0)
    counted(pg, "Giàu tab Thực phẩm", lambda: food.click(), 0)
    counted(pg, "Mỗi khẩu phần", lambda: pg.get_by_role("button", name="Mỗi khẩu phần").click(), 0)
    counted(pg, "Mỗi 100 g", lambda: pg.get_by_role("button", name="Mỗi 100 g").click(), 0)

    counted(pg, "Back from Giàu Calcium", lambda: pg.go_back(), 1)
    pg.locator("a[href='/explore/rich/calcium']").first.wait_for(timeout=10000)

    # Khám phá → a food page (a card of Gần đây or Yêu thích, else a row of a category)
    pg.goto(f"{BASE}/explore/tinh_bot", wait_until="networkidle")
    pg.wait_for_timeout(500)
    pg.goto(f"{BASE}/explore", wait_until="networkidle")
    pg.wait_for_timeout(500)
    first = pg.locator("a[href^='/foods/']:visible").first
    if first.count():
        counted(pg, "Khám phá → a food page", lambda: first.click(), 1)
    else:
        pg.locator("a[href='/explore/tinh_bot']").first.click()
        pg.locator("a[data-food-row]:visible").first.wait_for(timeout=10000)
        counted(pg, "category → a food page", lambda: pg.locator("a[data-food-row]:visible").first.click(), 1)

    # Hôm nay → a pushed screen (Vi chất; Hôm nay has no link to a food page, its rows open the entry sheet)
    pg.goto(f"{BASE}/app", wait_until="networkidle")
    pg.wait_for_timeout(900)
    counted(pg, "Hôm nay → Vi chất", lambda: pg.locator("a[href^='/micros']:visible").first.click(), 1)

    # A bottom-nav tab: no snapshot at all
    pg.goto(f"{BASE}/app", wait_until="networkidle")
    pg.wait_for_timeout(900)
    counted(pg, "bottom nav → Khám phá", lambda: pg.get_by_role("link", name="Khám phá").locator("visible=true").first.click(), 0)
    counted(pg, "bottom nav → Hôm nay", lambda: pg.get_by_role("link", name="Hôm nay").locator("visible=true").first.click(), 0)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
