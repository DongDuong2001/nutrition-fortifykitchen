"""cc-45 review: the Hôm nay hero's macro cells with target grams ("133/254 g", AG 17/10) keep the cc-44 rules.

At 390 and 1440, today and a past day (where macros run over target, "118/104 g"): each cell's grams line is one line
box, amount then percent 8 px apart, and the line ends inside its cell (no overflow into the next column); the four
bars share one grid (same widths, same top). Prints each cell's widths so a tight fit shows up before it breaks.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_45_hero.py
"""
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
PAST = "2026-10-14"
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


CELLS_JS = """(sel) => {
  const hero = [...document.querySelectorAll(sel)].find(h => h.getBoundingClientRect().width > 0);
  const grid = hero.querySelectorAll('[data-align-group=home-hero]')[3];
  return [...grid.children].map(c => {
    const line = c.children[1];
    const [a, b] = [line.children[0], line.children[1]];
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), rc = c.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(line);
    // 12 and 15 px text on one baseline: boxes that overlap vertically are one line
    let lines = 0, bottom = -Infinity;
    for (const r of [...range.getClientRects()].filter(r => r.width > 0).sort((p, q) => p.top - q.top)) {
      if (r.top >= bottom - 1) lines++;
      bottom = Math.max(bottom, r.bottom);
    }
    const bar = c.lastElementChild.getBoundingClientRect();
    return { amount: a.textContent.trim(), pct: b.textContent.trim(), cell: rc.width, used: rb.right - rc.left,
      gap: rb.left - ra.right, overflow: rb.right - rc.right, lines,
      amountPx: parseFloat(getComputedStyle(a).fontSize), pctPx: parseFloat(getComputedStyle(b).fontSize),
      barW: Math.round(bar.width), barTop: Math.round(bar.top) };
  });
}"""


with sync_playwright() as p:
    browser = p.chromium.launch()
    for w, h in [(390, 844), (1440, 900)]:
        for past in (False, True):
            ctx = browser.new_context(viewport={"width": w, "height": h})
            pg = ctx.new_page()
            pg.clock.set_fixed_time(NOW)
            pg.goto(BASE + (f"/app?date={PAST}" if past else "/app"), wait_until="networkidle")
            pg.locator(HERO).first.wait_for(state="visible", timeout=15000)
            pg.evaluate("document.fonts.ready")
            t = f"@{w} {'past' if past else 'today'}"
            cells = pg.evaluate(CELLS_JS, HERO)
            for c in cells:
                print(f"  {t} {c['amount']!r} {c['pct']!r}: cell {c['cell']:.1f}, used {c['used']:.1f}, gap {c['gap']:.1f}, {c['amountPx']}/{c['pctPx']} px")
            check(len(cells) == 4 and all(c["lines"] == 1 for c in cells), f"{t}: each grams line is one line {[c['lines'] for c in cells]}")
            check(all(abs(c["gap"] - 8) <= 1.5 for c in cells), f"{t}: amount then percent 8 px apart {[round(c['gap'], 1) for c in cells]}")
            check(all(c["overflow"] <= 0.5 for c in cells), f"{t}: no line runs past its cell {[round(c['overflow'], 1) for c in cells]}")
            check(len({c["barW"] for c in cells}) == 1 and len({c["barTop"] for c in cells}) == 1, f"{t}: four bars on one grid {[(c['barW'], c['barTop']) for c in cells]}")
            check(all(c["amountPx"] >= 11 for c in cells), f"{t}: grams 11 px or more")
            ctx.close()
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
