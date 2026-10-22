"""Tổng quan's four sub-tabs (Tóm tắt, Năng lượng, Vi chất, Cơ thể) never wrap.

At 390 and 360 px the four are equal columns of one line each, the text stays 13 px; at 320 px, where "Năng lượng" does not fit a
quarter of the track, the row scrolls sideways and still never wraps. Also at 390 with the root font at 150 %.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/overview_tabs.py
"""
# PROBE_COVERS: app/(app)/(tabs)/trends/** components/overview/overview-frame.tsx components/ui/segmented.tsx
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
problems = []
READ = """() => {
  const nav = document.querySelector('nav[aria-label="Tổng quan"]');
  const items = [...nav.querySelectorAll('a')].map((a) => a.querySelector('span'));
  return {
    labels: items.map((e) => e.innerText.trim()),
    lines: items.map((e) => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size; }),
    fs: items.map((e) => getComputedStyle(e).fontSize),
    widths: items.map((e) => Math.round(e.getBoundingClientRect().width)),
    scrolls: nav.scrollWidth > nav.clientWidth + 1,
    pageScrolls: document.documentElement.scrollWidth > window.innerWidth,
  };
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width, big in ((390, False), (360, False), (320, False), (390, True)):
            tag = f"{width}" + (" at 150 %" if big else "")
            ctx = browser.new_context(viewport={"width": width, "height": 844})
            pg = ctx.new_page()
            pg.goto(BASE + "/trends", wait_until="networkidle")
            if big:
                pg.evaluate("document.documentElement.style.fontSize = '24px'")
            pg.wait_for_timeout(500)
            r = pg.evaluate(READ)
            check(r["labels"] == ["Tóm tắt", "Năng lượng", "Vi chất", "Cơ thể"], f"{tag}: the four tabs ({r['labels']})")
            check(all(n == 1 for n in r["lines"]), f"{tag}: every label on one line ({r['lines']})")
            if not big:
                check(all(f == "13px" for f in r["fs"]), f"{tag}: 13 px text ({r['fs']})")
            check(not r["pageScrolls"], f"{tag}: the page does not scroll sideways")
            if width >= 360 and not big:
                check(not r["scrolls"], f"{tag}: four equal columns, no sideways scroll")
            pg.screenshot(path=os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "v3-cleanup", f"overview-tabs-{width}{'-text150' if big else ''}.png"), clip={"x": 0, "y": 0, "width": width, "height": 260})
            ctx.close()
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
