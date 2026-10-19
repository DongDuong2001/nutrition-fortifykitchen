"""cc-57: where the time goes between a tap on + and the /add sheet's first moved frame (390 x 844, 4x CPU, demo build).
Marks (ms after the pointerdown): click event, history.pushState (the route change starts), the sheet in the DOM, the
sheet's first frame with a different translateY. Run with:
  ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/cc_57_plus.py
"""
import os

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
SPY = """
window.__t = { };
const mark = (k) => { if (window.__t[k] === undefined) window.__t[k] = Math.round(performance.now() - window.__t.down); };
document.addEventListener('pointerdown', () => { window.__t.down = performance.now(); }, { capture: true, once: true });
document.addEventListener('click', () => mark('click'), { capture: true });
const push = history.pushState; history.pushState = function () { mark('push'); return push.apply(this, arguments); };
const iv = setInterval(() => {
  if (window.__t.down === undefined) return;
  const el = [...document.querySelectorAll('[data-sheet-route]')].find((x) => x.getClientRects().length);
  if (el) {
    mark('sheetInDom');
    const y = new DOMMatrix(getComputedStyle(el).transform).m42;
    if (window.__t.y0 === undefined) window.__t.y0 = y;
    else if (y !== window.__t.y0) { mark('firstMove'); clearInterval(iv); }
  }
}, 1);
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    rows = []
    for i in range(5):
        ctx = browser.new_context(**PHONE)
        ctx.add_init_script(SPY)
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
        pg.wait_for_timeout(1500)
        later = pg.get_by_role("button", name="Để sau")
        if later.count():
            later.first.tap()
            pg.locator('[role="dialog"]').wait_for(state="detached")
            pg.wait_for_timeout(400)
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        pg.evaluate("window.__t = {}")
        pg.evaluate(SPY.replace("window.__t = { };", "window.__t = {};"))
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url("**/add**")
        pg.wait_for_timeout(900)
        rows.append(pg.evaluate("({...window.__t})"))
        ctx.close()
    browser.close()
for r in rows:
    print({k: v for k, v in r.items() if k not in ("down", "y0")})
