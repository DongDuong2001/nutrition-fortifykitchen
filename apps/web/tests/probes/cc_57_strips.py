"""cc-57: feel-check frame strips. Mobile emulation 390 x 844, CPU throttled 4x, every animation slowed to 10% (CDP
Animation.setPlaybackRate 0.1), demo build. Each scenario saves frames (screenshots a fixed real time apart) and joins
them into .screenshots/cc57/strip-<NN-name>.png with the time under each frame. Checks print PASS / FAIL.

  01 tabs         Hôm nay > Tổng quan > Khám phá > Cài đặt > Hôm nay (the nav and header must not move)
  02 subtabs      Tổng quan: Tóm tắt > Năng lượng > Vi chất > Cơ thể > Tóm tắt (header and tab bar must not move)
  03 press chip   a chip held down, then let go          03 press CTA   the Thêm vào ... pill held down, then let go
  04 add open     + > /add                               04 add close   ✕
  05 grab         the /add sheet grabbed while it is still sliding open (must not snap to 0)
  06 day arrows   ‹ on Hôm nay                           07 pull        a pull to refresh (no React render while dragging)
  08 level bar    a fill growing from 0 (the real .m-bar with its transition)
Run with: ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/cc_57_strips.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/energy/** app/(app)/(tabs)/trends/micros/** app/(app)/foods/[id]/**
import base64
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc57"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
EVERY = 150  # real ms between frames (at 10% speed that is 15 ms of animation)
problems = []
strips = {}


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


class Rec:
    def __init__(self, pg, name):
        self.pg, self.name, self.frames = pg, name, []

    def snap(self, label=None, n=1, every=EVERY):
        for i in range(n):
            png = self.pg.screenshot(type="jpeg", quality=55)
            self.frames.append((label if label is not None else f"+{len(self.frames) * every} ms", png))
            if i < n - 1:
                self.pg.wait_for_timeout(every)

    def save(self):
        strips[self.name] = self.frames


def tap_nav(pg, href):
    pg.locator(f'nav[aria-label="Điều hướng chính"] a[href="{href}"]:visible').first.tap()


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(1200)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.locator('[role="dialog"]').wait_for(state="detached")
        pg.wait_for_timeout(500)


def y_of(pg, selector):
    return pg.evaluate("(s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null }", selector)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        open_today(pg)
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        cdp.send("Animation.enable")
        cdp.send("Animation.setPlaybackRate", {"playbackRate": 0.1})

        # 01 tabs
        r = Rec(pg, "01-tabs")
        moves = []
        for href, label in [("/trends", "Tổng quan"), ("/explore", "Khám phá"), ("/settings", "Cài đặt"), ("/app", "Hôm nay")]:
            nav_y = y_of(pg, 'nav[aria-label="Điều hướng chính"]')
            tap_nav(pg, href)
            r.snap(f"{label} +0", 1)
            pg.wait_for_timeout(EVERY)
            r.snap(f"{label} +{EVERY}", 1)
            pg.wait_for_timeout(400)
            moves.append(abs((y_of(pg, 'nav[aria-label="Điều hướng chính"]') or 0) - (nav_y or 0)))
        r.save()
        check(max(moves) < 0.5, f"tabs: the bottom nav does not move on a tab switch ({moves})")

        # 02 subtabs
        tap_nav(pg, "/trends")
        pg.wait_for_url("**/trends")
        pg.wait_for_timeout(900)
        r = Rec(pg, "02-subtabs")
        hdr = y_of(pg, "header")
        tabs_y = y_of(pg, 'nav[aria-label="Tổng quan"]')
        drift = []
        for href, label in [("/trends/energy", "Năng lượng"), ("/trends/micros", "Vi chất"), ("/trends/body", "Cơ thể"), ("/trends", "Tóm tắt")]:
            pg.locator(f'nav[aria-label="Tổng quan"] a[href="{href}"], nav[aria-label="Tổng quan"] a[href^="{href}?"]').locator("visible=true").first.tap()
            r.snap(f"{label} +0", 1)
            pg.wait_for_timeout(EVERY)
            cur = pg.locator(f'nav[aria-label="Tổng quan"] a[aria-current="page"]').first.inner_text()
            r.snap(f"{label} +{EVERY} (active: {cur})", 1)
            drift.append(abs((y_of(pg, "header") or 0) - (hdr or 0)) + abs((y_of(pg, 'nav[aria-label="Tổng quan"]') or 0) - (tabs_y or 0)))
            pg.wait_for_timeout(400)
        r.save()
        check(max(drift) < 0.5, f"subtabs: the header and the tab bar do not move ({drift})")

        # 03 press chip and CTA (mouse held down: :active stays)
        tap_nav(pg, "/explore")
        pg.wait_for_url("**/explore")
        pg.wait_for_timeout(900)
        r = Rec(pg, "03-press-chip")
        chip = pg.locator('[aria-label="Lọc món theo nhóm"] button:visible').nth(1)
        box = chip.bounding_box()
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        pg.mouse.down()
        r.snap("down +0", 1)
        pg.wait_for_timeout(500)
        mid = chip.evaluate("e => getComputedStyle(e).scale + '|' + getComputedStyle(e).transform")
        r.snap("down +500", 1)
        pg.wait_for_timeout(1200)
        held = chip.evaluate("e => (parseFloat(getComputedStyle(e).scale) || 1) * new DOMMatrix(getComputedStyle(e).transform).a")
        r.snap("held", 1)
        pg.mouse.move(5, 5)
        pg.mouse.up()
        r.snap("up +0", 1)
        r.save()
        check(held < 0.99, f"press chip: scales while held (scale {held:.3f})")
        check(mid != "none|none", f"press chip: already moving 500 ms into the (slowed) press ({mid})")

        pg.goto(BASE + "/foods/food-cha-la", wait_until="networkidle")
        pg.wait_for_timeout(900)
        cta = pg.locator('button:has-text("Thêm vào")').first
        r = Rec(pg, "03-press-cta")
        cta.scroll_into_view_if_needed()
        box = cta.bounding_box()
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        pg.mouse.down()
        r.snap("down +0", 1)
        pg.wait_for_timeout(600)
        r.snap("down +600", 1)
        pg.wait_for_timeout(1300)
        sc = cta.evaluate("e => (parseFloat(getComputedStyle(e).scale) || 1) * new DOMMatrix(getComputedStyle(e).transform).a")
        r.snap("held", 1)
        pg.mouse.move(5, 5)
        pg.mouse.up()
        r.snap("up +0", 1)
        r.save()
        check(sc < 0.99, f"press CTA: the full-width pill scales to 0.97 ({sc:.3f})")

        # 04 + and ✕
        open_today(pg)
        r = Rec(pg, "04-add-open")
        pg.locator("#mobile-add-fab").tap()
        r.snap("tap +0", 8)
        r.save()
        pg.wait_for_url("**/add**")
        pg.wait_for_timeout(4200)  # 350 ms at 10%
        r = Rec(pg, "04-add-close")
        pg.locator('[data-add-panel] button[aria-label="Đóng"]').tap()
        r.snap("✕ +0", 8)
        r.save()
        pg.wait_for_url("**/app**", timeout=8000)

        # 05 grab mid-open (slowed to 0.2% so the 24 px grabber stays under the finger while this script aims: the sheet is on the steep
        # part of its curve one frame into the slide, where it moves 8 px per ms of animation time, so 2% was marginal under load)
        open_today(pg)
        cdp.send("Animation.setPlaybackRate", {"playbackRate": 0.002})
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url("**/add**")
        pg.locator("[data-add-panel]").wait_for(state="visible")
        pg.wait_for_timeout(1500)
        r = Rec(pg, "05-grab-mid-open")
        pg.evaluate(
            """() => { window.__grab = {}; const y = () => new DOMMatrix(getComputedStyle(document.querySelector('[data-add-panel]')).transform).m42;
              document.addEventListener('pointerdown', () => { window.__grab.pre = y(); setTimeout(() => { window.__grab.post = y(); }, 0); }, { capture: true, once: true }); }"""
        )
        r.snap("before grab", 1)
        # A real touch (CDP), aimed at where the grabber is right now: the sheet keeps sliding while this script works
        hx, hy = pg.evaluate("() => { const r = document.querySelector('[data-sheet-handle]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": hx, "y": hy}]})
        pg.wait_for_timeout(300)
        held_y = pg.evaluate("() => new DOMMatrix(getComputedStyle(document.querySelector('[data-add-panel]')).transform).m42")
        r.snap("grabbed", 1)
        for k in range(1, 5):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": hx, "y": hy + k * 10}]})
        pg.wait_for_timeout(100)
        dragged = pg.evaluate("() => new DOMMatrix(getComputedStyle(document.querySelector('[data-add-panel]')).transform).m42")
        r.snap("dragged 40 px", 1)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        r.save()
        g = pg.evaluate("window.__grab")
        before, after = g["pre"], g["post"]
        check(before > 40 and abs(after - before) < 3 and abs(held_y - after) < 3, f"grab mid-open: the sheet stays where it was ({before:.0f} px before, {after:.0f} after the grab, {held_y:.0f} 300 ms later)")
        check(abs(dragged - (after + 40)) < 6, f"grab mid-open: it then follows the finger 1:1 ({after:.0f} → {dragged:.0f} px)")

        # 06 day arrows
        open_today(pg)
        cdp.send("Animation.setPlaybackRate", {"playbackRate": 0.1})
        r = Rec(pg, "06-day-arrows")
        pg.get_by_role("button", name="Ngày trước").first.tap()
        r.snap("‹ +0", 7)
        r.save()
        wrap = pg.evaluate("() => !!document.querySelector('.m-day-earlier')")
        check(wrap, "day arrows: the new day's wrapper carries m-day-earlier (a transition from @starting-style)")

        # 07 pull to refresh: no React render while dragging
        open_today(pg)
        pg.evaluate("window.__renders = 0; new MutationObserver((m) => { window.__renders += m.length; }).observe(document.querySelector('[data-align-group=\"home-page\"]'), { childList: true, subtree: true })")
        list_box = pg.locator("[data-entry-id]").first.bounding_box()
        x, y = 150, list_box["y"] + 10
        r = Rec(pg, "07-pull")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        for k in range(1, 9):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + k * 14}]})
            pg.wait_for_timeout(30)
        r.snap("pulled 112 px", 1)
        dragging = pg.evaluate("() => document.querySelector('.m-pull')?.hasAttribute('data-dragging')")
        renders = pg.evaluate("window.__renders")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        r.snap("let go +0", 2)
        r.save()
        check(dragging is True, "pull to refresh: the indicator has no transition while the finger is down (data-dragging)")
        check(renders == 0, f"pull to refresh: the list's DOM does not re-render while dragging ({renders} mutations)")

        # 08 level bar growth: the real fill, from translateX(-100%) to its value
        open_today(pg)
        r = Rec(pg, "08-level-bar")
        pg.evaluate(
            """() => { const f = document.querySelector('[role="progressbar"] .m-bar'); const to = f.style.transform;
              f.dataset.to = to; f.style.transition = 'none'; f.style.transform = 'translateX(-100%)'; f.getBoundingClientRect();
              f.style.transition = ''; f.style.transform = to; }"""
        )
        r.snap("0 → value +0", 7)
        r.save()
        zero = pg.evaluate("() => document.querySelectorAll('[role=\"progressbar\"] .m-bar').length === document.querySelectorAll('[role=\"progressbar\"]').length")
        check(zero, "level bar: every bar draws its fill (a bar at 0 is translateX(-100%), so 0 → value can grow)")

        # Join the frames
        if True:
            pg2 = browser.new_page(viewport={"width": 1600, "height": 700})
            for name, frames in strips.items():
                cells = "".join(
                    f'<figure><img src="data:image/jpeg;base64,{base64.b64encode(png).decode()}"><figcaption>{label}</figcaption></figure>' for label, png in frames
                )
                pg2.set_content(
                    "<style>body{margin:0;background:#111317;font:600 13px sans-serif;color:#fff}main{display:flex;gap:6px;padding:8px;width:max-content}"
                    "figure{margin:0;width:195px}img{width:195px;display:block;border-radius:6px}figcaption{text-align:center;padding-top:4px}"
                    f"h1{{font-size:15px;margin:8px}}</style><h1>{name} (4x CPU, animations at 10%)</h1><main>{cells}</main>"
                )
                pg2.wait_for_timeout(250)
                pg2.locator("body").screenshot(path=str(OUT / f"strip-{name}.png"))
                print("wrote", f"strip-{name}.png")
        browser.close()
    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)


if __name__ == "__main__":
    main()
