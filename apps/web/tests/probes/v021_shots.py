"""v0.2.1 review fixes: screenshots at 390 and a few behaviour checks, production build, demo mode.

- Hôm nay at Level 3: the extras band shows "—" (a day with one unknown entry is unknown); the column ends on a whole row (v022: tests/probes/v022_column.py).
- The source sheet of a food with no verified match: "Chưa rõ nguồn", the link reads "(chưa kiểm chứng)".
- The share sheet's name step: a name with no letter or digit is refused.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/v021_shots.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/foods/[id]/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems = []


def check(cond, msg):
    print(("ok: " if cond else "FAIL: ") + msg)
    if not cond:
        problems.append(msg)


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        size = {"width": 390, "height": 844}

        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        pg.goto(BASE + "/app?level=3", wait_until="networkidle")
        pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(600)
        extras = pg.evaluate("[...document.querySelectorAll('[data-extra]')].map(e => e.innerText.replace(/\\s+/g, ' ').trim())")
        check(len(extras) == 6 and all(t.endswith("—") for t in extras), f"Level 3: every extra is — when an entry lacks it ({extras})")
        pg.screenshot(path=os.path.join(SHOTS, "v021-home-L3-390.png"))
        scroller = pg.locator("aside[aria-label='Vi chất'] > div").first
        scroller.evaluate("el => { el.scrollTop = el.scrollHeight; }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, "v021-home-L3-end-390.png"))
        ctx.close()

        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        pg.goto(BASE + "/foods/food-cha-la", wait_until="networkidle")
        pg.wait_for_timeout(500)
        pg.get_by_role("button", name="USDA").first.click()
        dlg = pg.get_by_role("dialog", name="Nguồn dữ liệu")
        dlg.wait_for(state="visible", timeout=5000)
        text = dlg.inner_text()
        check("Chưa rõ nguồn" in text, "source sheet: a food with no verified match says Chưa rõ nguồn")
        check("chưa kiểm chứng" in text, "source sheet: the source link says chưa kiểm chứng")
        check("Chính xác · đúng món" not in text.split("Độ khớp")[1].split("\n")[1] if "Độ khớp" in text else False, "source sheet: not read as exact")
        pg.screenshot(path=os.path.join(SHOTS, "v021-source-sheet-390.png"))
        ctx.close()

        ctx = browser.new_context(viewport=size)
        ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        pg.goto(BASE + "/app?level=2", wait_until="networkidle")
        pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
        pg.get_by_role("button", name="Chia sẻ ngày này").click()
        dlg = pg.get_by_role("dialog")
        field = dlg.get_by_label("Tên hiện trên ảnh")
        field.wait_for(state="visible", timeout=5000)
        field.fill("...")
        pg.wait_for_timeout(300)
        check(dlg.get_by_role("button", name="Tiếp tục", exact=True).is_disabled(), "share name step: Tiếp tục is off for a name with no letter or digit")
        check("ít nhất một chữ cái hoặc chữ số" in dlg.inner_text(), "share name step: a name with no letter or digit is refused")
        pg.screenshot(path=os.path.join(SHOTS, "v021-share-name-390.png"))
        ctx.close()

        # Hôm nay today at Level 2, and its share image: the four level colours (Hao, 16/10)
        named = '{"sex":"male","birthYear":2003,"weightKg":65.4,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"Học viên A","hintSeen":true}'
        ctx = browser.new_context(viewport=size, accept_downloads=True)
        ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % named)
        ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        pg.goto(BASE + "/app?level=2", wait_until="networkidle")
        pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(600)
        pg.screenshot(path=os.path.join(SHOTS, "v021-home-today-L2-390.png"))
        fills = pg.evaluate(
            """() => [...document.querySelectorAll('[role=progressbar]')].filter(b => b.getBoundingClientRect().width > 0).flatMap(b => [...b.children].map(c => getComputedStyle(c).backgroundColor))"""
        )
        lit = {c for c in fills if c not in ("rgb(42, 44, 49)", "rgb(230, 225, 215)")}
        check(len(lit) >= 2 and not any(c in lit for c in ("rgb(154, 160, 166)",)), f"today uses several level colours ({sorted(lit)})")
        pg.get_by_role("button", name="Chia sẻ ngày này").click()
        dlg = pg.get_by_role("dialog")
        dlg.get_by_role("img").wait_for(state="visible", timeout=20000)
        with pg.expect_download() as info:
            dlg.get_by_role("button", name="Lưu ảnh").click()
        info.value.save_as(os.path.join(SHOTS, "v021-share-image-today-L2.png"))
        pg.screenshot(path=os.path.join(SHOTS, "v021-share-sheet-390.png"))
        ctx.close()
        browser.close()
    if problems:
        print(f"\n{len(problems)} FAIL")
        sys.exit(1)
    print("\nAll v021 checks passed")


main()
