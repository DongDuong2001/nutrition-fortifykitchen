"""cc-55: screen and overlay motion on the running app (demo build, 390 x 844).

- Route direction: a push (Hôm nay › a food) starts a view transition with m-vt-push, Back with m-vt-back; a tab
  starts none; /add starts none (its panel slides itself up from @starting-style) and Back out of it m-vt-sheet-down.
- /add: the panel (m-sheet) and its scrim are open; ✕ closes them (data-state="closed") and the route stays until the
  exit is over (still on /add 100 ms later, on Hôm nay after it); Hôm nay is drawn behind the panel.
- Sheets: open = data-state open with a transform transition (not keyframes); reopening mid-close reverses.
- Reduced motion: a sheet that opens has no transform at any point, and no view transition starts.
Writes frame strips to .screenshots/cc55/. Run with:
  ALIGN_BASE_URL=http://localhost:3106 npm run probe -- tests/probes/cc_55_motion.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/add/**
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc55"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
STRIPS = os.environ.get("STRIPS") == "1"
problems = []

# Records every view transition the page starts, with the classes on the page root at that moment
VT_SPY = """
window.__vts = [];
const start = Document.prototype.startViewTransition;
if (start) Document.prototype.startViewTransition = function (arg) {
  const t = start.call(this, arg);
  t.ready.then(() => {
    const names = [...document.getAnimations()].map(a => a.effect && a.effect.pseudoElement && a.animationName).filter(Boolean);
    window.__vts.push(names.join(' '));
  }).catch(() => window.__vts.push('skipped'));
  return t;
};
"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, reduced=False):
    ctx = browser.new_context(**PHONE, reduced_motion="reduce" if reduced else "no-preference")
    ctx.add_init_script(VT_SPY)
    pg = ctx.new_page()
    return ctx, pg


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(800)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.wait_for_timeout(500)


def vts(pg):
    return pg.evaluate("window.__vts.slice()")


def strip(pg, name, frames=6, every=50):
    """A frame strip: screenshots every `every` ms while a motion plays (the caller starts it right before)."""
    if not STRIPS:
        return
    for i in range(frames):
        pg.screenshot(path=str(SHOTS / f"{name}-{i * every:03d}ms.png"))
        pg.wait_for_timeout(every)


def routes(browser):
    ctx, pg = new_page(browser)
    open_today(pg)
    pg.evaluate("window.__vts = []")
    pg.locator("#mobile-add-fab").tap()
    strip(pg, "01-today-plus-to-add", frames=8)
    pg.wait_for_url("**/add**")
    panel = pg.locator('[data-add-panel]')
    panel.wait_for(state="visible")
    pg.wait_for_timeout(500)
    check(vts(pg) == [], f"+ → /add: no view transition, the panel slides itself ({vts(pg)})")
    check(panel.get_attribute("data-state") == "open", "/add: the panel is open")
    check("m-sheet" in (panel.get_attribute("class") or ""), "/add: the panel is an m-sheet")
    check(pg.locator('[data-add-behind] [data-align-group="home-page"]').count() > 0, "/add: Hôm nay is drawn behind the panel")
    # cc-55b: a light copy: none of Hôm nay's own sheets, pop-ups or sync status run behind the sheet
    behind = pg.evaluate("() => { const b = document.querySelector('[data-add-behind]'); return [b.dataset.addBehind, b.querySelectorAll('[role=dialog], .m-sheet, [data-sync-state]').length] }")
    check(behind == ["home", 0], f"/add: the backdrop is static, drawn in full when opened from Hôm nay, nothing of its own mounted ({behind})")

    pg.evaluate("window.__vts = []")
    pg.go_back()
    strip(pg, "02-back-from-add", frames=6)
    pg.wait_for_url(re.compile(r"/app"))
    pg.wait_for_timeout(500)
    check(any("m-vt-sheet-down" in v for v in vts(pg)), f"Back out of /add: the panel slides down ({vts(pg)})")

    # A food: push, then Back
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.wait_for_timeout(500)
    pg.evaluate("window.__vts = []")
    link = pg.locator('a[href^="/foods/"]').first
    link.tap()
    strip(pg, "03-food-detail-push", frames=8)
    pg.wait_for_url("**/foods/**")
    pg.wait_for_timeout(500)
    check(any("m-vt-from-right" in v for v in vts(pg)), f"a food: slides in from the right ({vts(pg)})")
    pg.evaluate("window.__vts = []")
    pg.go_back()
    strip(pg, "04-food-detail-back", frames=8)
    pg.wait_for_url("**/explore**")
    pg.wait_for_timeout(500)
    check(any("m-vt-to-right" in v for v in vts(pg)), f"Back from a food: the slide reverses ({vts(pg)})")

    # A tab: nothing
    pg.evaluate("window.__vts = []")
    pg.locator("nav a[href=\"/app\"]").first.dispatch_event("click")
    pg.wait_for_url(re.compile(r"/app"))
    pg.wait_for_timeout(500)
    check(vts(pg) == [], f"a tab: no transition ({vts(pg)})")
    ctx.close()


def add_close(browser):
    ctx, pg = new_page(browser)
    open_today(pg)
    pg.locator("#mobile-add-fab").tap()
    panel = pg.locator('[data-add-panel]')
    panel.wait_for(state="visible")
    pg.wait_for_timeout(500)
    pg.evaluate("window.__vts = []")
    pg.locator('[data-add-panel] button[aria-label="Đóng"]').tap()
    pg.wait_for_timeout(80)
    check("/add" in pg.url and panel.get_attribute("data-state") == "closed", f"✕: the panel closes and stays mounted through its exit ({pg.url})")
    pg.wait_for_url(re.compile(r"/app"), timeout=3000)
    pg.wait_for_timeout(400)
    check(vts(pg) == [], f"✕: no second animation after the route pops ({vts(pg)})")
    ctx.close()


def sheets(browser):
    ctx, pg = new_page(browser)
    open_today(pg)
    pg.locator('button[aria-label^="Chọn ngày"]:visible').first.tap()
    dialog = pg.locator('[role="dialog"]').first
    dialog.wait_for(state="visible")
    strip(pg, "05-calendar-open", frames=8)
    st = dialog.evaluate("el => { const s = getComputedStyle(el); return [el.dataset.state, s.transitionProperty, s.animationName].join('|') }")
    check(st.startswith("open|transform") and st.endswith("|none"), f"calendar sheet: a transform transition, no keyframes ({st})")
    pg.wait_for_timeout(400)
    pg.keyboard.press("Escape")
    # cc-57: Esc on a keyboard closes at once, with no slide (a keyboard action never waits for an animation)
    pg.wait_for_timeout(60)
    check(pg.locator('.m-sheet').count() == 0, "calendar sheet: Esc unmounts it at once (no exit animation)")

    # Reopen mid-close: the sheet comes back from where it is (a transition, so no jump to the bottom)
    pg.locator('button[aria-label^="Chọn ngày"]:visible').first.tap()
    dialog.wait_for(state="visible")
    pg.wait_for_timeout(450)
    # The scrim closes with the slide (Esc does not: it is instant since cc-57)
    pg.mouse.click(10, 20)
    pg.wait_for_timeout(30)
    pg.locator('button[aria-label^="Chọn ngày"]:visible').first.tap()
    ys = []
    for _ in range(4):
        ys.append(pg.evaluate("() => { const el = document.querySelector('.m-sheet'); return new DOMMatrix(getComputedStyle(el).transform).m42 }"))
        pg.wait_for_timeout(40)
    h = pg.evaluate("() => document.querySelector('.m-sheet').offsetHeight")
    # A keyframe would start again from the very bottom (h); a transition goes back up from where the sheet was
    check(0 <= ys[0] < h - 1 and ys[-1] < ys[0], f"reopened mid-close: reverses from where it was ({[round(y) for y in ys]} of {h} px)")
    pg.wait_for_timeout(500)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    # The meal switcher on /add
    pg.locator("#mobile-add-fab").tap()
    pg.get_by_role("button", name="Đổi bữa").wait_for(state="visible")
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Đổi bữa").tap()
    strip(pg, "07-meal-switcher-open", frames=8)
    pg.wait_for_timeout(300)
    pg.keyboard.press("Escape")
    strip(pg, "08-meal-switcher-close", frames=6)
    pg.wait_for_timeout(300)
    check(pg.locator('[aria-labelledby="meal-switcher-title"]').count() == 0, "meal switcher: unmounted after its exit")
    ctx.close()


def reduced(browser):
    ctx, pg = new_page(browser, reduced=True)
    open_today(pg)
    pg.locator('button[aria-label^="Chọn ngày"]:visible').first.tap()
    samples = []
    for _ in range(6):
        samples.append(pg.evaluate("() => { const el = document.querySelector('.m-sheet'); return el ? getComputedStyle(el).transform : 'gone' }"))
        pg.wait_for_timeout(30)
    check(all(s in ("none", "gone") for s in samples), f"reduced motion: the sheet never moves ({set(samples)})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    pg.evaluate("window.__vts = []")
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.locator('a[href^="/foods/"]').first.tap()
    pg.wait_for_url("**/foods/**")
    pg.wait_for_timeout(400)
    check(vts(pg) == [], f"reduced motion: no view transition ({vts(pg)})")
    ctx.close()


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chromium")
        for part in (routes, add_close, sheets, reduced):
            print(f"\n=== {part.__name__} ===")
            try:
                part(browser)
            except Exception as e:  # a crash is a failure, the rest still runs
                check(False, f"{part.__name__} crashed: {str(e).splitlines()[0]}")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    raise SystemExit(1 if problems else 0)


if __name__ == "__main__":
    main()
