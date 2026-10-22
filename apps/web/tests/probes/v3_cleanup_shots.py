"""v3-cleanup: before / after screenshots of the controls that were under 44 px at 200 % text, and of the sheets that lost
their footer Đóng (the Level explainer's is checked in cc_28c.py).

For /app, /settings/profile, /trends and /trends/body at 390x844, at 1440x900 and at 390 with the root font at 32 px
(200 %): .screenshots/v3-cleanup/<screen>-<390|1440|text200>-<tag>.png. The sheets reachable from Hôm nay (the nutrient sources, the
calendar, the day menu) are opened at 390 and checked for exactly one control named
Đóng (the leading Close) and no second one at the foot.
SHOTS_TAG=before|after names the files (default "after"). SHOTS_ONLY=pairs saves the tab roots, /trends/energy and /targets at 390 in light, each next
to its canvas render in ~/Documents/HITMicro/design/v3/renders (when that folder exists): <name>-390-light-vs-canvas.png.
The app has no dark column yet (V3-SPEC's dark map is one :root block later), so there is no dark shot.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/v3_cleanup_shots.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/settings/profile/** app/(app)/(tabs)/trends/** components/calendar-sheet.tsx components/home/** components/sync/** components/coaching/** components/diary/meal-menu-sheet.tsx components/settings/profile-cards.tsx components/overview/**
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("SHOTS_TAG", "after")
NOW = "2026-10-15T10:00:00+07:00"
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "v3-cleanup"
OUT.mkdir(parents=True, exist_ok=True)
SHOTS_DIR = OUT.parent
# the screen, its route and the control the shot is centred on
SCREENS = [
    ("app", "/app", "[data-meal-header] button[aria-label^='Xem riêng']"),
    ("profile", "/settings/profile", "button[aria-label='45 phút'], [aria-label='45 phút']"),
    ("trends", "/trends", "[aria-label^='T6 09/10']"),
    ("trends-body", "/trends/body", "[aria-label^='T6 09/10']"),
]
SIZES = [("390", {"width": 390, "height": 844}, False), ("1440", {"width": 1440, "height": 900}, False), ("text200", {"width": 390, "height": 844}, True)]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def settle(pg, big):
    if big:
        pg.evaluate("document.documentElement.style.fontSize = '32px'")
    pg.wait_for_timeout(600)


def screens(browser):
    for slug, route, focus in SCREENS:
        for name, size, big in SIZES:
            ctx = browser.new_context(viewport=size)
            pg = ctx.new_page()
            pg.clock.set_fixed_time(NOW)
            pg.goto(BASE + route, wait_until="networkidle")
            settle(pg, big)
            target = pg.locator(focus).first
            if target.count():
                target.evaluate("e => e.scrollIntoView({ block: 'center' })")
                pg.wait_for_timeout(300)
                box = target.bounding_box()
                # the hit area counts a ::before that grows the box (hit-44), as design-floor D-CTL-01 does
                hit = target.evaluate(
                    "e => { const s = getComputedStyle(e, '::before'); const g = s.content !== 'none' && s.position === 'absolute'; "
                    "return e.getBoundingClientRect().width - (g ? (parseFloat(s.left) || 0) + (parseFloat(s.right) || 0) : 0); }"
                )
                print(f"{slug} {name}: {focus.split(',')[0]} box {box['width']:.0f}x{box['height']:.0f}, hit area {hit:.0f} wide")
            else:
                print(f"[SKIP] {slug} {name}: {focus} not on the page")
            pg.screenshot(path=str(OUT / f"{slug}-{name}-{TAG}.png"))
            ctx.close()


RENDERS = Path.home() / "Documents" / "HITMicro" / "design" / "v3" / "renders"
PAIRS = [("home", "/app", "V3HomNayB"), ("overview", "/trends", "V3TongQuan"), ("explore", "/explore", "V3KhamPhaB"), ("energy", "/trends/energy", "V3TrendsEnergy"), ("targets", "/settings/targets", "V3Targets")]


def side_by_side(browser, app_png, render, out):
    """The app shot on the left, the canvas render on the right, at the same height."""
    html = OUT / "_pair.html"
    html.write_text(
        '<body style="margin:0;display:flex;gap:16px;align-items:flex-start;background:#888">'
        f'<img src="{app_png.as_uri()}" style="height:844px"><img src="{render.as_uri()}" style="height:844px"></body>'
    )
    pg = browser.new_page(viewport={"width": 1000, "height": 844})
    pg.goto(html.as_uri())
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(out))
    pg.close()
    html.unlink()


def pairs(browser):
    for name, route, render in PAIRS:
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(800)
        shot = OUT / f"{name}-390-light.png"
        pg.screenshot(path=str(shot))
        ctx.close()
        if (RENDERS / f"{render}.png").exists():
            side_by_side(browser, shot, RENDERS / f"{render}.png", OUT / f"{name}-390-light-vs-canvas.png")
        else:
            print(f"[SKIP] {name}: no canvas render {render}.png")
    # the share image at 150 % text (made by share_micros.py)
    img = SHOTS_DIR / "share-mixed-L0-text150.png"
    if img.exists() and (RENDERS / "V3ShareB.png").exists():
        side_by_side(browser, img, RENDERS / "V3ShareB.png", OUT / "share-text150-vs-canvas.png")


def one_close(pg, dlg, label):
    """The sheet has its leading Close and nothing else named Đóng; shot saved."""
    buttons = dlg.get_by_role("button", name="Đóng")
    check(buttons.count() == 1, f"{label}: one control named Đóng ({buttons.count()})")
    pg.screenshot(path=str(OUT / f"sheet-{label}-390-{TAG}.png"))
    buttons.first.click()
    pg.wait_for_timeout(450)
    check(pg.get_by_role("dialog").count() == 0, f"{label}: the leading Close closes it")


def sheets(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app?level=2", wait_until="networkidle")
    pg.wait_for_timeout(800)

    pg.locator("button[data-align-group=home-nutrient]").first.click()
    dlg = pg.get_by_role("dialog")
    dlg.wait_for(state="visible", timeout=4000)
    pg.wait_for_timeout(450)
    one_close(pg, dlg, "nutrient-sources")

    # the calendar (the date in the header) and the day menu (⋯), when this screen shows them
    for label, opener, name in (
        ("calendar", pg.get_by_role("button", name="Chọn ngày"), "Chọn ngày"),
        ("day-menu", pg.get_by_role("button", name="Tùy chọn ngày"), None),
    ):
        if opener.count() == 0:
            print(f"[SKIP] {label}: no opener on this screen at 390")
            continue
        opener.first.click()
        dlg = pg.get_by_role("dialog")
        dlg.wait_for(state="visible", timeout=4000)
        pg.wait_for_timeout(450)
        one_close(pg, dlg, label)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        only = os.environ.get("SHOTS_ONLY")
        if only == "pairs":
            pairs(browser)
        else:
            if only != "sheets":
                screens(browser)
            if only != "screens":
                sheets(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s); screenshots in {OUT}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
