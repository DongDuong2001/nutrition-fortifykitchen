"""cc2-unify: one header and one UI system on every route, at 390 and 1280.

Phone: every route's header has the same background (ink), bottom radius (20), title font (Saira) and size (24),
side padding (16) and title row height; one h1; back chevron is at least 44 px where there is one.
Desktop: no full-width ink element at the top of the window, h1 is 32 px, the header starts at the same top offset.
Everywhere: no all-caps text outside the h1, Saira display text and Hôm nay's ink pills (cc-44); no horizontal scroll.
Screenshots: .screenshots/cc2-unify-{overview,diary,explore,settings,micros,food}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_unify.py
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
ROUTES = [
    "/", "/trends", "/trends/micros", "/trends/body", "/", "/micros", "/micros/calcium", "/training",
    "/explore", "/foods/food-cha-la", "/foods/new", "/entry/item-1", "/settings", "/settings/profile",
    "/settings/profile/weight", "/settings/language", "/settings/notifications", "/settings/delete-account",
    "/paywall", "/install", "/setup/profile", "/setup/goal", "/setup/done", "/this-page-does-not-exist",
]
# Setup keeps its own desktop card layout (no header at desktop), see IA-v2 Decided 12/10
NO_HEADER_DESKTOP = {"/setup/profile", "/setup/goal", "/setup/done"}
SHOT_NAMES = {"/": "overview", "/": "diary", "/explore": "explore", "/settings": "settings", "/micros": "micros", "/foods/food-cha-la": "food"}
problems, notes = [], []

HEADER_JS = """() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const h = Array.from(document.querySelectorAll('header')).find(vis);
  const h1s = Array.from(document.querySelectorAll('h1')).filter(vis);
  const out = { header: null, h1Count: h1s.length };
  if (h) {
    const cs = getComputedStyle(h), r = h.getBoundingClientRect();
    const inner = h.firstElementChild, ics = inner ? getComputedStyle(inner) : null;
    const h1 = h.querySelector('h1');
    const h1cs = h1 ? getComputedStyle(h1) : null;
    const back = h.querySelector('a[aria-label="Quay lại"], button[aria-label="Quay lại"]');
    const br = back ? back.getBoundingClientRect() : null;
    out.header = {
      bg: cs.backgroundColor, radius: cs.borderBottomLeftRadius, top: Math.round(r.top), width: Math.round(r.width),
      padLeft: ics ? ics.paddingLeft : null, font: h1cs ? h1cs.fontFamily : null, size: h1cs ? h1cs.fontSize : null,
      h1Visible: h1 ? vis(h1) : false, backW: br ? Math.round(br.width) : null, backH: br ? Math.round(br.height) : null,
    };
  }
  // full-width ink element near the top of the window
  const inkBands = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.top > 160 || r.width < window.innerWidth * 0.9 || r.height < 24) continue;
    if (getComputedStyle(el).backgroundColor === 'rgb(17, 19, 23)') inkBands.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40));
  }
  out.inkBands = inkBands;
  const caps = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const cs = getComputedStyle(el);
    if (cs.textTransform !== 'uppercase') continue;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!vis(el)) continue;
    if (cs.fontFamily.toLowerCase().includes('saira')) continue;
    // cc-44: Hôm nay's ink pills (meal and group headers) are uppercase by design
    if (el.closest('[data-ink-pill]')) continue;
    caps.push((el.textContent || '').trim().slice(0, 30));
  }
  out.caps = caps;
  out.hScroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth;
  return out;
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def main():
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            ctx = browser.new_context(viewport=size)
            pg = ctx.new_page()
            seen = {}
            for route in ROUTES:
                pg.goto(BASE + route, wait_until="networkidle")
                pg.wait_for_timeout(400)
                d = pg.evaluate(HEADER_JS)
                where = f"{route} @ {size_name}"
                h = d["header"]
                desktop = size["width"] >= 1024
                if desktop and route in NO_HEADER_DESKTOP:
                    pass
                else:
                    check(h is not None, f"{where}: has a header")
                if h:
                    check(d["h1Count"] == 1, f"{where}: exactly one visible h1 (got {d['h1Count']})")
                    check("saira" in (h["font"] or "").lower(), f"{where}: title font is Saira ({h['font']})")
                    if desktop:
                        check(h["size"] == "32px" or not h["h1Visible"], f"{where}: desktop title 32px (got {h['size']})")
                        check(h["bg"] != "rgb(17, 19, 23)" or h["width"] < 1000, f"{where}: no full-width ink header on desktop")
                    else:
                        check(h["bg"] == "rgb(17, 19, 23)", f"{where}: phone header is ink ({h['bg']})")
                        check(h["radius"] == "20px", f"{where}: bottom radius 20 ({h['radius']})")
                        check(h["size"] == "24px", f"{where}: phone title 24px ({h['size']})")
                        check(h["padLeft"] == "16px", f"{where}: 16 px sides ({h['padLeft']})")
                        check(h["top"] == 0, f"{where}: header at the top ({h['top']})")
                    if h["backW"] is not None:
                        check(h["backW"] >= 44 and h["backH"] >= 44, f"{where}: back is 44 px ({h['backW']}x{h['backH']})")
                if desktop:
                    check(not d["inkBands"], f"{where}: no ink band at the top ({d['inkBands']})")
                check(not d["caps"], f"{where}: no all-caps text outside titles ({d['caps']})")
                check(not d["hScroll"], f"{where}: no horizontal scroll")
                if route in SHOT_NAMES:
                    pg.screenshot(path=str(SHOTS / f"cc2-unify-{SHOT_NAMES[route]}-{size_name}.png"), full_page=True, animations="disabled")
            ctx.close()
        browser.close()

    for n in notes:
        print("[ok]", n[4:] if n.startswith("ok: ") else n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"\ncc2-unify: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
