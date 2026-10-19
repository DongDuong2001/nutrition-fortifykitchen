"""cc-62: sheet release physics at 390x844, with real touches (CDP Input.dispatchTouchEvent), on the /add panel and on a
Sheet (the ⋯ menu of a meal on Hôm nay).
- a slow 60 px drag stays open
- a fast flick closes (the /add route pops; the menu sheet is gone)
- drag down, then flick back up: stays open
- a sheet sliding away is grabbed again: it opens again and stays (the /add route does not pop)
- the title block drags too (the menu sheet's title)
- the scrim fades with the drag (its opacity under 1 while the finger is down)
- motion is loaded only after the first touch on a sheet (no "sheet-spring" chunk before)
Frames of a flick and release: docs/screenshots/cc-62/strip-flick.png (and the single frames in .screenshots/cc-62/).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_62_sheet.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/**
import base64
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401
from _home import wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
ROOT = Path(__file__).resolve().parent.parent.parent
SHOTS = ROOT / ".screenshots" / "cc-62"
DOCS = ROOT.parent.parent / "docs" / "screenshots" / "cc-62"
SHOTS.mkdir(parents=True, exist_ok=True)
DOCS.mkdir(parents=True, exist_ok=True)
SETTINGS_KEY = "h1t_settings_v1_demo"
PHONE = {"width": 390, "height": 844}
PANEL = "[data-add-panel]"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


class Finger:
    def __init__(self, pg, cdp):
        self.pg = pg
        self.cdp = cdp

    def slow(self, rate):
        """Every animation at `rate` of its speed (CDP), so a touch lands on a sheet that is still sliding where it was measured."""
        self.cdp.send("Animation.enable")
        self.cdp.send("Animation.setPlaybackRate", {"playbackRate": rate})

    def _send(self, kind, points):
        self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": points})

    def down(self, x, y):
        self._send("touchStart", [{"x": x, "y": y}])

    def move(self, x, y):
        self._send("touchMove", [{"x": x, "y": y}])

    def up(self):
        self._send("touchEnd", [])

    def glide(self, x, y0, y1, steps, pause):
        for i in range(1, steps + 1):
            self.move(x, y0 + (y1 - y0) * i / steps)
            self.pg.wait_for_timeout(pause)


def phone(browser):
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True, device_scale_factor=2)
    seed = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(seed))});")
    pg = ctx.new_page()
    return ctx, pg, Finger(pg, ctx.new_cdp_session(pg))


def handle_point(pg, scope):
    box = pg.locator(f"{scope} [data-sheet-handle]").first.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def state(pg, scope):
    return pg.locator(scope).first.get_attribute("data-state")


def open_add(pg):
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.locator(PANEL).first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)


def check_add_panel(browser):
    ctx, pg, f = phone(browser)
    requests = []
    pg.on("request", lambda r: requests.append(r.url))
    open_add(pg)
    check(not any("sheet-spring" in u for u in requests), "/add: the spring chunk is not loaded before a touch")

    x, y = handle_point(pg, PANEL)
    # Slow 60 px, then still for a moment: stays open
    f.down(x, y)
    f.glide(x, y, y + 60, steps=15, pause=60)
    opacity = pg.evaluate("() => getComputedStyle(document.querySelector('.m-scrim')).opacity")
    check(float(opacity) < 1, f"/add: the scrim fades with the drag (opacity {opacity})")
    f.up()
    pg.wait_for_timeout(900)
    check("/add" in pg.url and state(pg, PANEL) == "open", "/add: a slow 60 px drag stays open")
    check(any("sheet-spring" in u for u in requests), "/add: the spring chunk loads after the first touch")

    # Down 250 px slowly, then a quick flick back up: stays open
    f.down(x, y)
    f.glide(x, y, y + 250, steps=12, pause=40)
    f.glide(x, y + 250, y + 190, steps=3, pause=16)
    f.up()
    pg.wait_for_timeout(900)
    check("/add" in pg.url and state(pg, PANEL) == "open", "/add: drag down then flick up stays open")

    # A flick down, grabbed again while it slides: it comes back and the route stays. Animations run at a tenth of
    # their speed here, or the sheet moves past the measured point before the touch lands (a finger follows it)
    f.slow(0.1)
    f.down(x, y)
    f.glide(x, y, y + 90, steps=3, pause=16)
    f.up()
    pg.wait_for_timeout(300)
    gx, gy = handle_point(pg, PANEL)
    check(gy > y + 60, f"/add: sliding away after the flick (handle at {gy:.0f}, was {y:.0f})")
    f.down(gx, gy)
    f.glide(gx, gy, gy - 40, steps=8, pause=40)
    f.glide(gx, gy - 40, gy - 40, steps=8, pause=25)
    f.up()
    f.slow(1)
    pg.wait_for_timeout(2000)
    check("/add" in pg.url and state(pg, PANEL) == "open", "/add: grabbed while closing, it opens again and the route stays")
    _, back_y = handle_point(pg, PANEL)
    check(abs(back_y - y) < 3, f"/add: and it settles back at the top ({back_y:.0f} vs {y:.0f})")

    ctx.close()


def check_flick(browser):
    """A fast flick closes /add, in a fresh page (no slowed timeline); frames of the release for the PR."""
    ctx, pg, f = phone(browser)
    open_add(pg)
    x, y = handle_point(pg, PANEL)
    # The spring loads on the first touch: one small drag first, so the flick below is the spring, not the CSS release
    f.down(x, y)
    f.glide(x, y, y + 10, steps=2, pause=30)
    f.up()
    pg.wait_for_timeout(800)
    frames = []
    f.down(x, y)
    f.glide(x, y, y + 70, steps=3, pause=16)
    f.up()
    for i in range(8):
        path = SHOTS / f"flick-{i:02d}.png"
        pg.screenshot(path=str(path))
        frames.append(path)
        pg.wait_for_timeout(25)
    pg.wait_for_timeout(1200)
    check("/add" not in pg.url, f"/add: a fast flick closes it (now {pg.url})")
    ctx.close()
    return frames


def check_menu_sheet(browser):
    ctx, pg, f = phone(browser)
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_home(pg)
    dialog = '[role="dialog"]'

    def open_menu():
        menu = pg.locator("button[aria-label='Tùy chọn Bữa sáng']:visible")
        # The ⋯ shows while the meal is picked out ("Xem riêng" is a toggle: tapped again, it shows the whole day)
        if menu.count() == 0:
            pg.locator("button[aria-label='Xem riêng bữa sáng']:visible").first.click()
            menu.first.wait_for(state="visible", timeout=4000)
        menu.first.click()
        pg.locator(dialog).first.wait_for(state="visible", timeout=4000)
        pg.wait_for_timeout(500)

    def sheet_open():
        return pg.locator(f"{dialog}[data-state='open']").count() == 1

    open_menu()
    x, y = handle_point(pg, dialog)
    f.down(x, y)
    f.glide(x, y, y + 60, steps=15, pause=60)
    f.up()
    pg.wait_for_timeout(900)
    check(sheet_open(), "menu sheet: a slow 60 px drag stays open")

    title = pg.locator(f"{dialog} h2").first.bounding_box()
    tx, ty = title["x"] + 20, title["y"] + title["height"] / 2
    f.down(tx, ty)
    f.glide(tx, ty, ty + 80, steps=3, pause=16)
    f.up()
    pg.wait_for_timeout(1200)
    check(pg.locator(dialog).count() == 0, "menu sheet: a flick on the title closes it")

    # Grabbed back while closing (animations slowed, as on /add; last, the slowed timeline stays slow for this page)
    open_menu()
    f.slow(0.1)
    f.down(x, y)
    f.glide(x, y, y + 70, steps=3, pause=16)
    f.up()
    pg.wait_for_timeout(300)
    gx, gy = handle_point(pg, dialog)
    f.down(gx, gy)
    f.glide(gx, gy, gy - 40, steps=8, pause=40)
    f.glide(gx, gy - 40, gy - 40, steps=8, pause=25)
    f.up()
    f.slow(1)
    pg.wait_for_timeout(1200)
    check(sheet_open(), "menu sheet: grabbed while closing, it opens again")

    ctx.close()


def strip(browser, frames):
    pg = browser.new_page(viewport={"width": 1700, "height": 600})
    cells = "".join(
        f'<figure><img src="data:image/png;base64,{base64.b64encode(p.read_bytes()).decode()}"><figcaption>+{i * 25 + i * 30} ms</figcaption></figure>'
        for i, p in enumerate(frames)
    )
    pg.set_content(
        "<style>body{margin:0;background:#111317;font:600 14px sans-serif;color:#fff}"
        "main{display:flex;gap:6px;padding:8px;width:max-content}figure{margin:0}"
        "img{width:195px;display:block;border-radius:6px}figcaption{text-align:center;padding-top:4px}"
        "h1{font-size:15px;margin:8px}</style><h1>cc-62: /add flick and release at 390 px (frames about 55 ms apart)</h1>"
        f"<main>{cells}</main>"
    )
    pg.wait_for_timeout(300)
    pg.locator("body").screenshot(path=str(DOCS / "strip-flick.png"))
    pg.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_add_panel(browser)
        frames = check_flick(browser)
        check_menu_sheet(browser)
        strip(browser, frames)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
