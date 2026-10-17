"""cc-44: white background, level colours and bar, English nutrient names, Hôm nay meal pills, desktop fixes.

Screenshots of the main routes at 390x844 and 1440x900 into .screenshots/cc-44-<route>-<w>.png (demo mode; the
empty day is a fresh account). CC44_TAG=<tag> adds the tag to the names (cc-44-<tag>-...), for work-in-progress shots.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_44.py
"""
import os
import sys
from pathlib import Path

import _demo
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("CC44_TAG", "")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = {"390": {"width": 390, "height": 844}, "1440": {"width": 1440, "height": 900}}
ROUTES = [
    ("home", "/"),
    ("micros", "/micros"),
    ("trends", "/trends"),
    ("explore", "/explore"),
    ("add", "/add"),
    ("settings", "/settings"),
]
ONLY = [r for r in os.environ.get("CC44_ONLY", "").split(",") if r]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def name(route, w):
    return f"cc-44-{TAG + '-' if TAG else ''}{route}-{w}.png"


# A new account that finished setup (as smoke.py's empty pass): no entries, no sample data
SAVED_PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"","hintSeen":true}'


def shoot(browser, route, path, w, demo=True):
    _demo.enable(demo)
    ctx = browser.new_context(viewport=SIZES[w])
    if not demo:
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_profile_v1', JSON.stringify({SAVED_PROFILE})); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + path, wait_until="networkidle")
    pg.wait_for_timeout(900)
    overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{route} @{w}: no horizontal overflow ({overflow})")
    pg.screenshot(path=str(SHOTS / name(route, w)))
    ctx.close()
    _demo.enable(True)


def share(browser, named):
    """The share image of the sample day at Level 2 ("5/14 đạt"; Lưu ảnh, no file sharing): saved PNG, 1080 wide, 972 CSS px high."""
    tag = "named" if named else "unnamed"
    ctx = browser.new_context(viewport=SIZES["390"], accept_downloads=True)
    profile = '{"sex":"male","birthYear":2003,"weightKg":65.4,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"%s","hintSeen":true}' % ("Học viên A" if named else "")
    ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % profile)
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    pg = ctx.new_page()
    pg.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
    pg.goto(BASE + "/?level=2", wait_until="networkidle")
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    dlg = pg.get_by_role("dialog")
    if not named:
        # No display name: the sheet asks for one first (lib/share-card: the image always has a name)
        field = dlg.get_by_label("Tên hiện trên ảnh")
        field.wait_for(state="visible", timeout=10000)
        pg.screenshot(path=str(SHOTS / name("share-unnamed-step", "390")))
        field.fill("Minh")
        dlg.get_by_role("button", name="Tiếp tục", exact=True).click()
    try:
        dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
    except Exception:
        pg.screenshot(path=str(SHOTS / name(f"share-{tag}-failed", "390")))
        check(False, f"share {tag}: the preview never showed")
        ctx.close()
        return
    with pg.expect_download() as info:
        dlg.get_by_role("button", name="Lưu ảnh").click()
    path = SHOTS / name(f"share-{tag}", "390")
    info.value.save_as(str(path))
    w, h = pg.evaluate(
        """async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }""",
        __import__("base64").b64encode(path.read_bytes()).decode(),
    )
    css_h = round(h * 390 / 1080)
    check(w == 1080, f"share {tag}: 1080 wide ({w})")
    # ShareC2 says 972; "Thiếu nhiều nhất: Vitamin D, Calcium" wraps to a second 18 px line in the 174 px column (OPEN_QUESTIONS cc-44)
    check(abs(css_h - 972) <= 1 or abs(css_h - 990) <= 1, f"share {tag}: 972 CSS px high, or 990 with the summary on two lines ({css_h}, PNG {h})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in SIZES:
            for route, path in ROUTES:
                if not ONLY or route in ONLY:
                    shoot(browser, route, path, w)
            if not ONLY or "home-empty" in ONLY:
                shoot(browser, "home-empty", "/", w, demo=False)
        if not ONLY or "share" in ONLY:
            share(browser, True)
            share(browser, False)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
