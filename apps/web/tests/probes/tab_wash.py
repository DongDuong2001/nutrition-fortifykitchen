"""The colour wash at the top of the three tab roots (v3-cleanup item 9) and Tổng quan's teal active sub-tab.

On a phone, Hôm nay, Tổng quan and Khám phá draw one TabWash: aria-hidden, pointer-events none, absolute, 240 px tall, its gradient the
tab's colour at A, 0.4 A at 55 % and none at 100 % (Hôm nay cobalt 0.16, Tổng quan teal 0.18, Khám phá orange 0.28); the header
and the content paint over it. From 1024 px the wash is hidden. Cài đặt and the pushed screens have none. Tổng quan's active chip is
filled teal #007F96 with white text; the others are as they were.
The chip rows' side fades are a mask on the row (ChipScroller), not an overlay: Khám phá's row at 390 px does not overflow, so it has no mask
and the pixel at its right edge is the wash; at 360 px with 150 % text it overflows, so its right edge fades and, scrolled to the end, its
left edge fades instead. The add sheet's filter row (the sheet variant) has the same fades: at 360 px it overflows, so its right edge fades
(the left one once scrolled to the end); with the chips small enough to fit it has none.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/tab_wash.py
"""
# PROBE_COVERS: components/ui/tab-wash.tsx components/ui/app-header.tsx components/ui/segmented.tsx components/overview/overview-frame.tsx app/globals.css app/(app)/(tabs)/**
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright
from _header_paint import _pixel, expected

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
problems = []
# route, tone, the wash colour as rgb and its peak alpha
WASHED = [("/app", "home", (36, 87, 245), 0.16), ("/trends", "overview", (0, 195, 208), 0.18), ("/explore", "explore", (255, 141, 40), 0.28)]
BARE = ["/settings", "/settings/profile", "/explore/meals", "/foods/new", "/add"]
WASH = """() => {
  const w = document.querySelector('[data-tab-wash]');
  if (!w) return null;
  const c = getComputedStyle(w), r = w.getBoundingClientRect();
  const header = document.querySelector('header');
  const h = header.getBoundingClientRect();
  const top = document.elementFromPoint(h.left + h.width / 2, Math.min(h.top + 30, window.innerHeight - 1));
  return { display: c.display, position: c.position, events: c.pointerEvents, hidden: w.getAttribute('aria-hidden'), height: r.height, top: r.top + window.scrollY,
           image: c.backgroundImage, headerBg: getComputedStyle(header).backgroundColor, aboveWash: top !== w };
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        phone = browser.new_context(viewport={"width": 390, "height": 844}).new_page()
        phone.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
        for route, tone, color, peak in WASHED:
            phone.goto(BASE + route, wait_until="networkidle")
            phone.wait_for_timeout(500)
            w = phone.evaluate(WASH)
            check(w is not None, f"{route}: a wash is drawn")
            if not w:
                continue
            check(w["hidden"] == "true" and w["events"] == "none" and w["position"] == "absolute", f"{route}: aria-hidden, pointer-events none, absolute")
            check(round(w["height"]) == 240 and w["top"] == 0, f"{route}: 240 px tall at the top of the page ({w['height']}, {w['top']})")
            # Chrome resolves color-mix() to color(srgb r g b / alpha) stops: the colour at A, 0.4 A at 55 %, transparent at 100 %
            stops = re.findall(r"color\(srgb ([0-9.]+) ([0-9.]+) ([0-9.]+) / ([0-9.]+)\) (\d+)(px|%)", w["image"])
            check(len(stops) == 2, f"{route}: two coloured stops ({w['image'][:120]})")
            if len(stops) == 2:
                rgb = tuple(round(float(v) * 255) for v in stops[0][:3])
                check(rgb == color and abs(float(stops[0][3]) - peak) < 0.001 and stops[0][4] == "0", f"{route}: {color} at alpha {peak} at the top ({rgb}, {stops[0][3]})")
                check(abs(float(stops[1][3]) - 0.4 * peak) < 0.001 and stops[1][4] == "55" and stops[1][5] == "%", f"{route}: 0.4 of it at 55 % ({stops[1][3]} at {stops[1][4]}{stops[1][5]})")
            check(w["image"].rstrip(")").endswith("rgba(0, 0, 0, 0) 100%"), f"{route}: none at 100 %")
            check(w["headerBg"] == "rgba(0, 0, 0, 0)" and w["aboveWash"], f"{route}: the header is transparent and paints over the wash ({w['headerBg']})")
        for route in BARE:
            phone.goto(BASE + route, wait_until="networkidle")
            phone.wait_for_timeout(300)
            check(phone.locator("[data-tab-wash]").count() == 0, f"{route}: no wash")
        phone.goto(BASE + "/trends", wait_until="networkidle")
        chips = phone.evaluate("() => [...document.querySelectorAll('nav[aria-label=\"Tổng quan\"] a')].map((a) => { const s = a.querySelector('span'); const c = getComputedStyle(s); return [s.textContent.trim(), c.backgroundColor, c.color, a.getAttribute('aria-current')]; })")
        check(chips[0][1] == "rgb(0, 127, 150)" and chips[0][2] == "rgb(255, 255, 255)" and chips[0][3] == "page", f"the active chip is teal with white text ({chips[0]})")
        check(all(c[1] == "rgba(0, 0, 0, 0)" and c[2] == "rgb(99, 99, 102)" for c in chips[1:]), f"the others are unchanged ({chips[1:]})")
        # ---- the chip rows' fades (ChipScroller mask)
        ROW = "[role=group][aria-label='Lối tắt']"
        FADES = """(row) => { const c = getComputedStyle(row); const r = row.getBoundingClientRect();
          return { edges: row.dataset.fadeEdges ?? null, mask: c.maskImage || c.webkitMaskImage, right: r.right, top: r.top, height: r.height, over: row.scrollWidth > row.clientWidth + 1 }; }"""
        phone.goto(BASE + "/explore", wait_until="networkidle")
        phone.wait_for_timeout(500)
        row = phone.locator(ROW).first
        f = row.evaluate(FADES)
        check(not f["over"] and f["edges"] == "none" and f["mask"] == "none", f"/explore at 390: the row does not overflow, so no fade ({f})")
        y = f["top"] + f["height"] / 2
        shot = phone.screenshot(clip={"x": f["right"] - 3, "y": y, "width": 1, "height": 1})
        got, _ = _pixel(shot)
        want = expected("/explore", y)
        check(all(abs(got[i] - want[i]) <= 3 for i in range(3)), f"/explore at 390: the pixel at the row's right edge is the wash (rgb{got}, expected rgb{tuple(round(v) for v in want)})")
        big = browser.new_context(viewport={"width": 360, "height": 780}).new_page()
        big.goto(BASE + "/explore", wait_until="networkidle")
        big.evaluate("document.documentElement.style.fontSize = '24px'")
        big.wait_for_timeout(400)
        brow = big.locator(ROW).first
        f = brow.evaluate(FADES)
        check(f["over"] and f["edges"] == "right" and "linear-gradient" in f["mask"], f"/explore at 360, 150 % text: the row overflows and fades on the right only ({f['edges']})")
        brow.evaluate("(e) => { e.scrollLeft = e.scrollWidth; }")
        big.wait_for_timeout(300)
        f = brow.evaluate(FADES)
        check(f["edges"] == "left" and "linear-gradient" in f["mask"], f"/explore at 360, 150 % text, scrolled to the end: fades on the left only ({f['edges']})")
        # the add sheet's filter row (the sheet variant) fades like the page's row: right while it overflows, left once scrolled, none when it fits
        sheet = browser.new_context(viewport={"width": 360, "height": 780}).new_page()
        sheet.goto(BASE + "/add", wait_until="networkidle")
        sheet.wait_for_timeout(700)
        srow = sheet.locator("[data-add-panel] [role=group][aria-label='Lọc món theo nhóm']").first
        f = srow.evaluate(FADES)
        check(f["over"], f"the add sheet's filter row overflows at 360 ({f})")
        check(f["edges"] == "right" and "linear-gradient" in f["mask"], f"the add sheet's filter row at 360 fades on the right only ({f['edges']}, {f['mask'][:40]})")
        sheet.screenshot(path=os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "v3-cleanup", "add-filter-row-360-after.png"), clip={"x": 0, "y": 0, "width": 360, "height": 260})
        srow.evaluate("(e) => { e.scrollLeft = e.scrollWidth; }")
        sheet.wait_for_timeout(300)
        f = srow.evaluate(FADES)
        check(f["edges"] == "left" and "linear-gradient" in f["mask"], f"the add sheet's filter row scrolled to the end fades on the left only ({f['edges']})")
        # A row whose chips fit (all but two hidden): no fade
        srow.evaluate("(e) => { e.scrollLeft = 0; [...e.children].slice(2).forEach((c) => { c.style.display = 'none'; }); }")
        sheet.wait_for_timeout(400)
        f = srow.evaluate(FADES)
        check(not f["over"] and f["edges"] == "none" and f["mask"] == "none", f"the add sheet's filter row with the chips fitting has no fade ({f['edges']}, over={f['over']})")
        big.screenshot(path=os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "v3-cleanup", "explore-chip-row-360-text150-after.png"), clip={"x": 0, "y": 0, "width": 360, "height": 360})

        desk = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        for route, *_ in WASHED:
            desk.goto(BASE + route, wait_until="networkidle")
            desk.wait_for_timeout(300)
            d = desk.evaluate("() => { const w = document.querySelector('[data-tab-wash]'); return w ? getComputedStyle(w).display : 'none'; }")
            check(d == "none", f"{route} at 1440: the wash is hidden ({d})")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
