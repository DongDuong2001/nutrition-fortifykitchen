"""feat/homnay-readability (overnight 22→23/10, job 4): Hôm nay C3.

Demo build (the sample day) at 390, 360 and 360 @ 150 % text:
- the hero has three macros (Tinh bột, Đạm, Chất béo), each name on one line, no Chất xơ; kcal and its percent at 40 px;
- the nutrient column: x/N đạt with a 40 px cobalt count; a Chất xơ row above the first group, with "<x> g / <y> g", not counted in
  x/N (N stays the Level's count); tapping it opens the foods sheet titled Chất xơ;
- micro rows: the amount on its own line under the name;
- meal names cobalt; the Chia sẻ pill 34 px inside a 44 px button; nothing cut.
Screenshots: .screenshots/homnay-c3-<size>.png and homnay-c3-share-390.png (the share sheet's image).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/homnay_readability.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/** components/ui/app-header.tsx
import json
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
TEXT = "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '%d%%'; });"
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
COL = "aside[aria-label='Vi chất']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, width, text):
    tag = f"{width}" + ("" if text == 100 else f"-{text}")
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    if text != 100:
        ctx.add_init_script(TEXT % text)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    hero = pg.locator(HERO).first
    names = hero.locator(".grid > * > span:first-child").all_inner_texts()
    check(names == ["Tinh bột", "Đạm", "Chất béo"], f"{tag}: three hero macros ({names})")
    lines = pg.evaluate("""(sel) => [...document.querySelector(sel).querySelectorAll('.grid > * > span:first-child')].map((s) => Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight || 16)))""", HERO)
    check(all(n <= 1 for n in lines), f"{tag}: each macro name on one line ({lines})")
    big = pg.evaluate("(sel) => parseFloat(getComputedStyle(document.querySelector(sel + ' .font-display')).fontSize)", HERO)
    check(abs(big - 40 * text / 100) < 1, f"{tag}: the kcal is 40 px ({big})")
    col = pg.locator(COL).first
    summary = col.locator("[data-level-summary]").inner_text()
    m = re.search(r"(\d+)/(\d+)", summary)
    check(m is not None, f"{tag}: x/N đạt ({summary[:40]!r})")
    rows = col.locator("[data-align-group=home-nutrient]:not([data-extra]):not([data-nutrient-row=fiber])").count()
    if m:
        check(int(m.group(2)) == rows, f"{tag}: N is the Level's nutrients, Chất xơ not counted ({m.group(2)} = {rows} rows)")
    fiber = col.locator("[data-nutrient-row=fiber]")
    check(fiber.count() == 1 and "CHẤT XƠ" in fiber.inner_text().upper() and " g / " in fiber.inner_text(), f"{tag}: the Chất xơ row with amount / target ({fiber.inner_text()[:40] if fiber.count() else ''!r})")
    order = pg.evaluate("(sel) => { const c = document.querySelector(sel); const f = c.querySelector('[data-nutrient-row=fiber]'); const h = c.querySelector('h3'); return f && h ? f.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING : 0; }", COL)
    check(order != 0, f"{tag}: Chất xơ sits above the first group")
    under = pg.evaluate("(sel) => { const r = document.querySelector(sel + ' [data-nutrient-row]:not([data-nutrient-row=fiber])'); const s = r.querySelectorAll('span span'); return s.length >= 2 ? s[1].getBoundingClientRect().top > s[0].getBoundingClientRect().top : false; }", COL)
    check(under, f"{tag}: a micro row's amount is under its name")
    colour = pg.evaluate("() => getComputedStyle(document.querySelector('[data-testid=meal-header] span:nth-child(2)')).color")
    check(colour not in ("rgb(17, 19, 23)", "rgb(0, 0, 0)"), f"{tag}: meal names are cobalt ({colour})")
    share = pg.locator("button[data-tour=home-share]")
    sb = share.bounding_box()
    pb = share.locator("span").first.bounding_box()
    check(sb and sb["height"] >= 44 and pb and abs(pb["height"] - 34 * (text / 100 if text > 100 else 1)) <= 6, f"{tag}: Chia sẻ is a 34 px pill in a 44 px button ({pb and round(pb['height'])}/{sb and round(sb['height'])})")
    cut = pg.evaluate("(sels) => sels.flatMap((sel) => [...document.querySelectorAll(sel + ' *')]).filter((e) => e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent.trim().slice(0, 20))", [HERO, COL])
    check(not cut, f"{tag}: nothing cut in the hero or the column ({cut})")
    pg.screenshot(path=str(SHOTS / f"homnay-c3-{tag}.png"), full_page=True)
    if text == 100:
        fiber.click()
        pg.wait_for_timeout(700)
        check(pg.locator("#nutrient-sources-title").inner_text().strip() == "Chất xơ", "tapping Chất xơ opens its foods sheet")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(500)
        if width == 390:
            share.click()
            pg.wait_for_timeout(1500)
            pg.screenshot(path=str(SHOTS / "homnay-c3-share-390.png"))
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        for width, text in ((390, 100), (360, 100), (360, 150)):
            run(browser, width, text)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
