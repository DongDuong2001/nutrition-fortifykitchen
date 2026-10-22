"""The "Tìm món" search field has one focus indicator: the wrapper's ring (border-cobalt + ring-2 ring-cobalt).

Production demo build. /add (a sheet on the phone, a dialog on desktop) and /explore, at 390x844 and 1280x800, the
field focused by keyboard (Tab) and by tap or click: the inner input has no outline and no box-shadow ring, and the
wrapper label has the ring. Screenshots go to tests/probes/out/search-ring-<route>-<width>-<how>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/v022b_search_ring.py
"""
# PROBE_COVERS: app/(app)/(tabs)/explore/** app/(app)/add/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
OUT = os.path.join(os.path.dirname(__file__), "out")
SEARCH = 'input[aria-label="Tìm món"] >> visible=true'
problems = []

STYLE = """() => {
  const input = document.activeElement;
  const label = input.closest('label');
  if (!label) return { isSearch: false, inputOutlineStyle: '', inputOutlineWidth: '', inputShadow: '', labelShadow: '', labelBorder: '' };
  const i = getComputedStyle(input), l = getComputedStyle(label);
  return {
    isSearch: input.getAttribute('aria-label') === 'Tìm món',
    inputOutlineStyle: i.outlineStyle, inputOutlineWidth: i.outlineWidth, inputShadow: i.boxShadow,
    labelShadow: l.boxShadow, labelBorder: l.borderTopColor,
  };
}"""


def check(cond, msg):
    print(("ok: " if cond else "FAIL: ") + msg)
    if not cond:
        problems.append(msg)


def verify(pg, tag):
    s = pg.evaluate(STYLE)
    check(s["isSearch"], f"{tag}: the search field has focus")
    check(s["inputOutlineStyle"] == "none" or s["inputOutlineWidth"] in ("0px", "0"), f"{tag}: the input has no outline ({s['inputOutlineStyle']} {s['inputOutlineWidth']})")
    check(s["inputShadow"] == "none", f"{tag}: the input has no box-shadow ring ({s['inputShadow']})")
    check(s["labelShadow"] != "none", f"{tag}: the wrapper has the ring ({s['labelShadow'][:60]})")
    # V3: neither field has a border any more (the + sheet's is grey, Khám phá's white on the page); the ring is cobalt
    check("rgb(36, 87, 245)" in s["labelShadow"], f"{tag}: the ring is cobalt ({s['labelShadow'][:80]})")


def run(browser, size, route, name):
    w = size["width"]
    # keyboard
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.locator(SEARCH).first.wait_for(state="visible", timeout=8000)
    # cc-51: Gần đây and Hay ăn add up to 32 focusable buttons before the field on /add
    for _ in range(300):
        pg.keyboard.press("Tab")
        if pg.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label') === 'Tìm món'"):
            break
    verify(pg, f"{name} {w} keyboard")
    pg.screenshot(path=os.path.join(OUT, f"search-ring-{name}-{w}-keyboard.png"))
    ctx.close()
    # tap or click
    ctx = browser.new_context(viewport=size, has_touch=w < 800)
    pg = ctx.new_page()
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    field = pg.locator(SEARCH).first
    field.wait_for(state="visible", timeout=8000)
    box = field.bounding_box()
    if w < 800:
        pg.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    else:
        field.click()
    pg.wait_for_timeout(200)
    verify(pg, f"{name} {w} {'tap' if w < 800 else 'click'}")
    pg.screenshot(path=os.path.join(OUT, f"search-ring-{name}-{w}-tap.png"))
    ctx.close()


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size in ({"width": 390, "height": 844}, {"width": 1280, "height": 800}):
            run(browser, size, "/add", "add")
            run(browser, size, "/explore", "explore")
        browser.close()
    if problems:
        print(f"\n{len(problems)} FAIL")
        sys.exit(1)
    print("\nAll search-ring checks passed")


main()
