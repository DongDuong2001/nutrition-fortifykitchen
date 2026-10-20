"""cc-27c: /micros header collapses into a compact 60 px bar once its summary has scrolled away.

Production build, demo mode, 390x844 (the list scrolls inside the page) and 1280x800 (the page scrolls).
- At the top: the full header (summary, trends link) shows and the compact bar is hidden.
- Scrolled: the compact bar is 56 to 64 px, holds back (44 px), "VI CHẤT", the date label, "8/22" and "đã đạt";
  the group chips are sticky directly under it; exactly one visible h1.
- No layout jump: a card's position plus the scroll offset stays constant through the switch.
- Back at the top the full header is back; no horizontal scroll.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27c.py
"""
# PROBE_COVERS: app/(app)/micros/**
import json
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []

BAR = """() => {
  const bars = [...document.querySelectorAll('[data-micros-compact]')].filter(b => b.offsetParent !== null || getComputedStyle(b).position === 'absolute' && b.getClientRects().length);
  const bar = bars.find(b => b.getBoundingClientRect().width > 0);
  if (!bar) return null;
  const r = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const back = bar.querySelector('a');
  const br = back.getBoundingClientRect();
  return { state: bar.dataset.microsCompact, visible: cs.visibility === 'visible', top: r.top, bottom: r.bottom, height: r.height, text: bar.innerText.replace(/\\s+/g, ' ').trim(), back: [br.width, br.height], ink: cs.backgroundColor };
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def chips_top(pg):
    return pg.evaluate(
        """() => { const b = [...document.querySelectorAll('button[aria-pressed]')].filter(x => x.textContent.includes('Vitamin') && x.getBoundingClientRect().width > 0)[0];
                   const bar = b.closest('.sticky'); const r = bar.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }"""
    )


def visible_h1(pg):
    return pg.evaluate("[...document.querySelectorAll('h1')].filter(h => { const r = h.getBoundingClientRect(); const cs = getComputedStyle(h); return r.width > 0 && cs.visibility === 'visible' && !h.closest('[inert]'); }).length")


def phone(browser):
    t = "390"
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_selector("text=Thiếu nhiều nhất")
    pg.wait_for_timeout(400)
    list_sel = json.dumps('[data-align-container="micros-page"] .overflow-y-auto')
    bar = pg.evaluate(BAR)
    check(bar is not None and bar["state"] == "hidden" and not bar["visible"], f"{t}: compact bar is hidden at the top ({bar and bar['state']})")
    check("Thiếu nhiều nhất" in pg.inner_text("body") and "Xu hướng 7 và 30 ngày" in pg.inner_text("body"), f"{t}: the full header shows at the top")
    check(visible_h1(pg) == 1, f"{t}: one visible h1 at the top ({visible_h1(pg)})")
    pg.screenshot(path=os.path.join(SHOTS, "cc-27c-top-390.png"))

    header_sel = json.dumps('[data-align-container="micros-page"] .overflow-y-auto header')
    header_h = pg.evaluate(f"document.querySelector({header_sel}).getBoundingClientRect().height")
    # no jump: the card's top plus the scroll offset stays the same through the switch
    sums = []
    for s in range(max(0, int(header_h) - 100), int(header_h) + 60, 8):
        pg.evaluate(f"document.querySelector({list_sel}).scrollTop = {s}")
        pg.wait_for_timeout(60)
        y = pg.evaluate("document.querySelector('#group-minerals').getBoundingClientRect().top")
        sums.append(round(y + pg.evaluate(f"document.querySelector({list_sel}).scrollTop"), 1))
    check(max(sums) - min(sums) <= 1.5, f"{t}: the list does not jump when the bar appears ({min(sums)}..{max(sums)})")

    pg.evaluate(f"document.querySelector({list_sel}).scrollTop = 700")
    pg.wait_for_timeout(300)
    bar = pg.evaluate(BAR)
    check(bar and bar["state"] == "shown" and bar["visible"], f"{t}: compact bar shows when scrolled")
    if bar:
        check(56 <= bar["height"] <= 64, f"{t}: compact bar is about 60 px ({bar['height']})")
        check(abs(bar["top"]) <= 1, f"{t}: bar is at the top ({bar['top']})")
        check("VI CHẤT" in bar["text"].upper() and "/22" in bar["text"] and "đã đạt" in bar["text"], f"{t}: bar content {bar['text']!r}")
        check(re.search(r"(Hôm nay|Hôm qua|Thứ)\s", bar["text"]) is not None, f"{t}: bar has the date label")
        check(bar["back"][0] >= 44 and bar["back"][1] >= 44, f"{t}: back is 44 px {bar['back']}")
    c = chips_top(pg)
    check(bar and abs(c["top"] - bar["bottom"]) <= 1.5, f"{t}: chips are stuck under the bar (chips {c['top']:.1f}, bar bottom {bar['bottom'] if bar else None})")
    check(visible_h1(pg) == 1, f"{t}: one visible h1 when compact ({visible_h1(pg)})")
    full = pg.evaluate("document.body.scrollWidth - window.innerWidth")
    check(full <= 0, f"{t}: no horizontal scroll ({full})")
    pg.screenshot(path=os.path.join(SHOTS, "cc-27c-compact-390.png"))
    # a chip tap lands its group below the sticky bars
    pg.get_by_role("button", name=re.compile(r"^Khoáng chất · ")).click()
    pg.wait_for_timeout(1200)
    top = pg.evaluate("document.querySelector('#group-minerals').getBoundingClientRect().top")
    check(top >= (bar["bottom"] if bar else 60) + 40, f"{t}: a tapped chip puts its group under the sticky bars ({top:.0f})")
    pg.evaluate(f"document.querySelector({list_sel}).scrollTop = 0")
    pg.wait_for_timeout(300)
    bar = pg.evaluate(BAR)
    check(bar and bar["state"] == "hidden", f"{t}: the full header is back at the top")
    ctx.close()


def desktop(browser):
    t = "1280"
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_selector("[data-align-container='micros-desktop']")
    pg.wait_for_timeout(400)
    bar = pg.evaluate(BAR)
    check(bar and bar["state"] == "hidden", f"{t}: compact bar hidden at the top")
    pg.screenshot(path=os.path.join(SHOTS, "cc-27c-top-1280.png"))
    sums = []
    for s in range(0, 400, 20):
        pg.evaluate(f"window.scrollTo(0, {s})")
        pg.wait_for_timeout(60)
        y = pg.evaluate("document.querySelector('#desktop-group-vitamins').getBoundingClientRect().top")
        sums.append(round(y + s, 1))
    check(max(sums) - min(sums) <= 1.5, f"{t}: the page does not jump when the bar appears ({min(sums)}..{max(sums)})")
    pg.evaluate("window.scrollTo(0, 600)")
    pg.wait_for_timeout(300)
    bar = pg.evaluate(BAR)
    check(bar and bar["state"] == "shown" and bar["visible"], f"{t}: compact bar shows when scrolled")
    if bar:
        check(56 <= bar["height"] <= 64 and abs(bar["top"]) <= 1, f"{t}: bar is 60 px at the top ({bar['height']}, {bar['top']})")
        check("VI CHẤT" in bar["text"].upper() and "/22" in bar["text"], f"{t}: bar content {bar['text']!r}")
        c = chips_top(pg)
        check(abs(c["top"] - bar["bottom"]) <= 1.5, f"{t}: chips are sticky under the bar ({c['top']:.1f} vs {bar['bottom']:.1f})")
    check(visible_h1(pg) == 1, f"{t}: one visible h1 when compact ({visible_h1(pg)})")
    check(pg.evaluate("document.documentElement.scrollWidth - window.innerWidth") <= 0, f"{t}: no horizontal scroll")
    pg.screenshot(path=os.path.join(SHOTS, "cc-27c-compact-1280.png"))
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(300)
    bar = pg.evaluate(BAR)
    check(bar and bar["state"] == "hidden", f"{t}: the full header is back at the top")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    phone(browser)
    desktop(browser)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
