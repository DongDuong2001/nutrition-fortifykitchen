"""The colour wash at the top of the three tab roots (v3-cleanup item 9) and Tổng quan's teal active sub-tab.

On a phone, Hôm nay, Tổng quan and Khám phá draw one TabWash: aria-hidden, pointer-events none, absolute, 240 px tall, its gradient the
tab's colour at A, 0.4 A at 55 % and none at 100 % (Hôm nay cobalt 0.16, Tổng quan teal 0.18, Khám phá orange 0.28); the header
and the content paint over it. From 1024 px the wash is hidden. Cài đặt and the pushed screens have none. Tổng quan's active chip is
filled teal #007F96 with white text; the others are as they were.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/tab_wash.py
"""
# PROBE_COVERS: components/ui/tab-wash.tsx components/ui/app-header.tsx components/ui/segmented.tsx components/overview/overview-frame.tsx app/globals.css app/(app)/(tabs)/**
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

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
