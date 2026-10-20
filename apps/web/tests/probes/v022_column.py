"""v0.2.2: the Hôm nay nutrient column never covers a row, at 390x844, Levels 2 and 5 (and 1440x900 at Level 5).

Production demo build (DEMO_BUILD=1), clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh.
- The "x/N đạt" block and "Đủ 22 vi chất" sit below the scroll area, not over it (their top is at or under its bottom).
- No fade or mask on the scroll area, and every bar keeps its exact level colour at full opacity.
- At the top of the list no row is cut by the area's bottom edge (a row either ends above it or starts below it).
- Scrolled to the end, the last row is whole and above the block; the block is still not covered.
Screenshots: .screenshots/v022-home-L2-390.png, v022-home-L5-390.png (and the scrolled-to-end twins).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/v022_column.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
LEVEL_COLOURS = {  # cc-44: one palette on ink and on light surfaces
    "rgb(242, 69, 61)", "rgb(255, 176, 32)", "rgb(128, 216, 160)", "rgb(47, 196, 107)",
}
EMPTY = {"rgb(236, 234, 230)", "rgb(42, 44, 49)"}  # the light track and the ink track
problems = []

GEOMETRY = """() => {
  const aside = document.querySelector("aside[aria-label='Vi chất']");
  const area = [...aside.children].find(c => c.scrollHeight > 0 && getComputedStyle(c).overflowY === 'auto');
  const block = aside.querySelector('[data-level-summary]');
  const firstBar = area.querySelector('[role=progressbar]');
  const link = [...aside.querySelectorAll('a')].find(a => a.textContent.includes('Đủ 22 vi chất'));
  const a = area.getBoundingClientRect();
  const rows = [...area.querySelectorAll('[data-snap-row]')].map(r => r.getBoundingClientRect());
  const crossing = rows.filter(r => r.top < a.bottom - 0.5 && r.bottom > a.bottom + 0.5).length;
  const crossRows = [...area.querySelectorAll('[data-snap-row]')].filter(e => { const r = e.getBoundingClientRect(); return r.top < a.bottom - 0.5 && r.bottom > a.bottom + 0.5; }).map(e => e.innerText.slice(0, 30) + ' ' + JSON.stringify(e.getBoundingClientRect()) + ' area ' + a.bottom + ' maxH ' + area.style.maxHeight + ' sh ' + area.scrollHeight + ' ch ' + area.clientHeight);
  const bars = [...area.querySelectorAll('[role=progressbar]')];
  const fills = new Set();
  let faded = 0;
  for (const bar of bars) {
    fills.add(getComputedStyle(bar).backgroundColor);
    for (const seg of bar.children) {
      const cs = getComputedStyle(seg);
      fills.add(cs.backgroundColor);
      if (parseFloat(cs.opacity) !== 1) faded++;
    }
  }
  const cs = getComputedStyle(area);
  return {
    areaTop: a.top, areaBottom: a.bottom, scrollable: area.scrollHeight > area.clientHeight + 1,
    blockTop: block ? block.getBoundingClientRect().top : null,
    blockBottom: block ? block.getBoundingClientRect().bottom : null,
    inArea: block ? area.contains(block) : false,
    firstBarTop: firstBar ? firstBar.getBoundingClientRect().top : null,
    linkTop: link ? link.getBoundingClientRect().top : null,
    crossing, crossRows, fills: [...fills], faded,
    mask: cs.maskImage || cs.webkitMaskImage || 'none',
    lastRowBottom: rows.length ? Math.max(...rows.map(r => r.bottom)) : null,
    scrollTop: area.scrollTop, maxScroll: area.scrollHeight - area.clientHeight,
  };
}"""


def check(cond, msg):
    print(("ok: " if cond else "FAIL: ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, size, level, tag):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + f"/app?level={level}", wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(700)
    g = pg.evaluate(GEOMETRY)
    w = size["width"]
    check(g["mask"] in ("none", ""), f"{tag}: no fade or mask on the area ({g['mask']})")
    check(g["faded"] == 0, f"{tag}: every bar fill is at full opacity ({g['faded']} are not)")
    unknown = [c for c in g["fills"] if c not in LEVEL_COLOURS and c not in EMPTY]
    check(not unknown, f"{tag}: bars use only the level colours and the empty colour ({unknown})")
    # cc-61: the verdict heads the column, above the scrolling area (which starts at the first band)
    check((not g["inArea"]) and g["blockBottom"] <= g["areaTop"] + 0.5, f"{tag}: the x/N đạt verdict is the column header, above the area ({g['blockBottom']} vs {g['areaTop']})")
    check(g["linkTop"] is not None and g["linkTop"] >= g["areaBottom"] - 0.5, f"{tag}: Đủ 22 vi chất is below the area ({g['linkTop']} vs {g['areaBottom']})")
    check(g["crossing"] == 0, f"{tag}: at the top, no row is cut by the area's bottom edge ({g['crossing']} {g['crossRows']})")
    print(f"note: {tag} scrollable={g['scrollable']} area {g['areaTop']:.0f}-{g['areaBottom']:.0f}")
    pg.screenshot(path=os.path.join(SHOTS, f"v022-home-L{level}-{w}.png"))
    if g["scrollable"]:
        pg.evaluate("document.querySelector(\"aside[aria-label='Vi chất']\").querySelector('[class*=overflow-y-auto]').scrollTop = 1e6")
        pg.wait_for_timeout(300)
        e = pg.evaluate(GEOMETRY)
        check(e["lastRowBottom"] <= e["areaBottom"] + 0.5, f"{tag}: scrolled to the end, the last row is whole ({e['lastRowBottom']:.1f} <= {e['areaBottom']:.1f})")
        check(e["linkTop"] >= e["areaBottom"] - 0.5, f"{tag}: at the end the link is still below the area")
        pg.screenshot(path=os.path.join(SHOTS, f"v022-home-L{level}-end-{w}.png"))
    ctx.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        phone = {"width": 390, "height": 844}
        for level in (2, 5):
            run(browser, phone, level, f"390 L{level}")
        run(browser, {"width": 1440, "height": 900}, 5, "1440 L5")
        browser.close()
    if problems:
        print(f"\n{len(problems)} FAIL")
        sys.exit(1)
    print("\nAll v022 checks passed")


main()
