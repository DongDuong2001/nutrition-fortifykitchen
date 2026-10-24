"""Job A (feat/hero-sources, overnight 23→24/10): press and hold a macro on the Hôm nay hero to see which foods make it up.

At 390 (touch, CDP touch events) and 1440 (mouse, plus right-click), demo build, the sample day:
- hold Đạm ~650 ms opens the sources sheet "Đạm hôm nay" with the day's foods; the hold does not also pick the macro (kcal view);
- a short tap still gives the kcal view; a finger that moves > 10 px opens nothing; the same for Tinh bột and Chất béo;
- Chất xơ: a tap opens its sheet, so does a hold; with a macro picked the "Món nào? ›" link opens the sheet;
- a past day has no hold; reduced motion works.
Screenshots: .screenshots/hero-sources/*.png (390×844 and 1440×900, never crops).
Run with: ALIGN_BASE_URL=http://localhost:3112 npm run probe -- tests/probes/hero_sources.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/home-hero.tsx components/home/home-screen.tsx components/home/nutrient-sources-sheet.tsx components/home/nutrient-column.tsx lib/hold.ts lib/use-hold.ts lib/nutrient-sources.ts
import datetime
import json
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
import _seed
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3112")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "hero-sources"
SHOTS.mkdir(parents=True, exist_ok=True)
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
SHEET = "[role=dialog]"
problems = []
# A coarse pointer at 390 makes the "Cài H1T MICRO" pop-up open by itself: mark it shown for this session
NO_INSTALL_POPUP = "try { sessionStorage.setItem('h1t_install_shown', '1'); } catch (e) {}"


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def centre(loc):
    b = loc.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def hold_touch(pg, cdp, loc, ms=650, move=None):
    x, y = centre(loc)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    if move:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x + move[0], "y": y + move[1]}]})
    pg.wait_for_timeout(ms)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    pg.wait_for_timeout(500)


def hold_mouse(pg, loc, ms=650):
    x, y = centre(loc)
    pg.mouse.move(x, y)
    pg.mouse.down()
    pg.wait_for_timeout(ms)
    pg.mouse.up()
    pg.wait_for_timeout(500)


def close_sheet(pg):
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)


def open_count(pg):
    """1 once the sheet is up (the chunk may still be loading: wait for it), 0 when nothing opened."""
    try:
        pg.locator(SHEET).filter(visible=True).first.wait_for(timeout=1500)
    except Exception:
        return 0
    return pg.locator(SHEET).filter(visible=True).count()


def num(text):
    digits = re.sub(r"[^0-9]", "", text)
    return int(digits) if digits else None


def run_phone(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    ctx.add_init_script(NO_INSTALL_POPUP)
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(SHOTS / "390-1-day.png"))
    hero = pg.locator(HERO).first
    big = hero.locator(".font-display").first
    day_kcal = num(big.inner_text())

    protein = hero.locator("button[data-hero-macro=protein]")
    hold_touch(pg, cdp, protein)
    check(open_count(pg) == 1, "390: holding Đạm opens the sources sheet")
    check("Đạm hôm nay" in pg.locator(SHEET).filter(visible=True).first.inner_text(), "390: the title is 'Đạm hôm nay'")
    sheet_text = pg.locator(SHEET).filter(visible=True).first.inner_text()
    check("% mục tiêu" in sheet_text and " g" in sheet_text, f"390: the share column is '% mục tiêu', amounts in g ({sheet_text[:80]!r})")
    rows = pg.locator("li[data-align-group=nutrient-sources]").count()
    check(rows >= 2, f"390: the sheet lists the day's foods ({rows - 1} rows)")
    pg.screenshot(path=str(SHOTS / "390-2-hold-protein.png"))
    close_sheet(pg)
    check(protein.get_attribute("aria-pressed") == "false" and num(big.inner_text()) == day_kcal, "390: the hold did not also toggle the kcal view")

    # a short tap still gives the kcal view, and then a "Món nào? ›" link opens the sheet
    protein.tap()
    pg.wait_for_timeout(500)
    check(protein.get_attribute("aria-pressed") == "true", "390: a short tap still picks the macro (kcal view)")
    link = hero.get_by_role("button", name=re.compile("Món nào"))
    check(link.count() == 1 and link.bounding_box()["height"] >= 44, "390: the 'Món nào? ›' link shows while a macro is picked (≥ 44 px)")
    pg.screenshot(path=str(SHOTS / "390-3-picked-link.png"))
    link.tap()
    pg.wait_for_timeout(600)
    check(open_count(pg) == 1 and "Đạm hôm nay" in pg.locator(SHEET).filter(visible=True).first.inner_text(), "390: the link opens the same sheet")
    close_sheet(pg)
    protein.tap()
    pg.wait_for_timeout(400)
    check(hero.get_by_role("button", name=re.compile("Món nào")).count() == 0, "390: no link when no macro is picked")

    # a finger that moves more than 10 px opens nothing (a scroll)
    hold_touch(pg, cdp, protein, move=(0, 30))
    check(open_count(pg) == 0, "390: moving the finger 30 px cancels the hold")
    for key, title in (("carbs", "Tinh bột hôm nay"), ("fat", "Chất béo hôm nay")):
        hold_touch(pg, cdp, hero.locator(f"button[data-hero-macro={key}]"))
        check(open_count(pg) == 1 and title in pg.locator(SHEET).filter(visible=True).first.inner_text(), f"390: holding {title.split(' hôm')[0]} opens '{title}'")
        close_sheet(pg)

    # Chất xơ: a tap opens it, so does a hold
    fiber = pg.locator("[data-nutrient-row=fiber]")
    fiber.tap()
    pg.wait_for_timeout(600)
    check(open_count(pg) == 1 and "Chất xơ hôm nay" in pg.locator(SHEET).filter(visible=True).first.inner_text(), "390: a tap on Chất xơ opens its sheet")
    close_sheet(pg)
    hold_touch(pg, cdp, fiber)
    check(open_count(pg) == 1, "390: a hold on Chất xơ opens its sheet")
    close_sheet(pg)
    pg.screenshot(path=str(SHOTS / "390-4-after.png"))

    # a past day: no hold on the macros
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    pg.goto(f"{BASE}/app?date={yesterday}", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    hold_touch(pg, cdp, pg.locator(HERO).first.locator("button[data-hero-macro=protein]"))
    check(open_count(pg) == 0, "390: a past day has no hold")
    ctx.close()

    # reduced motion
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, reduced_motion="reduce")
    ctx.add_init_script(NO_INSTALL_POPUP)
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    hold_touch(pg, cdp, pg.locator(HERO).first.locator("button[data-hero-macro=protein]"))
    check(open_count(pg) == 1, "390 reduced motion: the hold opens the sheet")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(SHOTS / "1440-1-day.png"))
    hero = pg.locator(HERO).first
    protein = hero.locator("button[data-hero-macro=protein]")
    hold_mouse(pg, protein)
    check(open_count(pg) == 1 and "Đạm hôm nay" in pg.locator(SHEET).filter(visible=True).first.inner_text(), "1440: a mouse hold opens 'Đạm hôm nay'")
    pg.screenshot(path=str(SHOTS / "1440-2-hold-protein.png"))
    close_sheet(pg)
    check(protein.get_attribute("aria-pressed") == "false", "1440: the hold did not pick the macro")
    protein.click(button="right")
    pg.wait_for_timeout(500)
    check(open_count(pg) == 1, "1440: a right-click opens it too")
    close_sheet(pg)
    protein.click()
    pg.wait_for_timeout(400)
    check(protein.get_attribute("aria-pressed") == "true", "1440: a click still picks the macro")
    pg.screenshot(path=str(SHOTS / "1440-3-picked-link.png"))
    hero.get_by_role("button", name=re.compile("Món nào")).click()
    pg.wait_for_timeout(600)
    check(open_count(pg) == 1, "1440: the link opens the sheet")
    close_sheet(pg)
    fiber = pg.locator("[data-nutrient-row=fiber]")
    hold_mouse(pg, fiber)
    check(open_count(pg) == 1 and "Chất xơ hôm nay" in pg.locator(SHEET).filter(visible=True).first.inner_text(), "1440: a hold on Chất xơ opens its sheet")
    ctx.close()


def run_tip(browser):
    """The hold tip names Tinh bột, Đạm and Chất béo only (Hao 24/10): a tap on Chất xơ already opens its foods."""
    _seed.onboarding(True)
    flags = {"tourDone": True, "seen": ["home-logged", "meal-add", "nutrient-sources"], "used": ["pull-refresh", "share-day", "meal-focus", "hero-macro"], "whatsNewSeen": "2026-10-23a"}
    seed = {"onboarding": flags, "installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    ctx.add_init_script(NO_INSTALL_POPUP + f"if (localStorage.getItem('h1t_settings_v1_demo') === null) localStorage.setItem('h1t_settings_v1_demo', {json.dumps(json.dumps(seed))});")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    card = pg.locator("[data-onboarding-card]")
    text = re.sub(r"\s+", " ", card.first.inner_text()) if card.count() else ""
    check("Giữ để xem món nào góp vào" in text and "Giữ Tinh bột, Đạm hay Chất béo ở thẻ đen là thấy những món nào góp vào số đó." in text, f"390: the hold tip says Tinh bột, Đạm, Chất béo ({text[:140]!r})")
    check("Chất xơ" not in text, "390: …and does not name Chất xơ")
    pg.screenshot(path=str(SHOTS / "390-6-hold-tip.png"))
    ctx.close()
    _seed.onboarding(False)


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run_phone(browser)
        run_desktop(browser)
        run_tip(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
