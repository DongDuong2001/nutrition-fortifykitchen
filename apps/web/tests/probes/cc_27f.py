"""cc-27f: Hôm nay readability.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, demo mode, sizes 390x844 and 1440x900.
- Hero: sentence case label ("Cả ngày · 7 món"); every text 11 px or more; the kcal percent sits right after the
  target on the same line (the kcal number's 32 px, 10 px gap, cc-44); each macro reads amount then percent with an 8 px gap; on a
  past day the level word follows the kcal percent.
- Nutrient column: no caption; "Khoáng chất" and "Vitamin" are the meal headers' ink pills (24 px phone, cc-44), and the
  first pill is level with the first meal pill; food rows and nutrient rows share the name size.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27f.py
"""
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
PAST = "2026-10-14"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(400)


SMALL_TEXT_JS = """(sel) => {
  const root = document.querySelector(sel);
  const bad = [];
  for (const el of root.querySelectorAll('*')) {
    if (!Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    if (el.closest('.sr-only')) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 11) bad.push([el.textContent.trim().slice(0, 30), px]);
  }
  return bad;
}"""


def run(browser, size, tag):
    w = size["width"]
    phone = w < 1024
    for past in (False, True):
        t = f"{tag} {'past' if past else 'today'}"
        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        go(pg, f"/?date={PAST}" if past else "/")
        hero = pg.locator(HERO + " >> visible=true").first
        label = hero.locator("h2").inner_text()
        check(re.fullmatch(r"Cả ngày · \d+ món", label) is not None, f"{t}: hero label in sentence case ({label!r})")
        check(pg.evaluate(SMALL_TEXT_JS, HERO) == [], f"{t}: every hero text is 11 px or more {pg.evaluate(SMALL_TEXT_JS, HERO)}")

        # kcal line: the percent follows the target on the same line, the kcal number's size, 10 px gap (cc-44)
        geo = pg.evaluate(
            """(sel) => {
              const hero = document.querySelector(sel);
              const row = hero.querySelectorAll('[data-align-group=home-hero]')[1];
              const spans = [...row.children].map(e => ({ t: e.textContent.trim(), r: e.getBoundingClientRect(), fs: parseFloat(getComputedStyle(e).fontSize), st: getComputedStyle(e).fontStyle }));
              return spans;
            }""",
            HERO,
        )
        target = next(s for s in geo if "kcal" in s["t"] and "/" in s["t"])
        pct = next(s for s in geo if re.fullmatch(r"\d+%|<1%", s["t"]))
        gap = pct["r"]["left"] - target["r"]["right"]
        check(abs(pct["r"]["top"] + pct["r"]["height"] - (target["r"]["top"] + target["r"]["height"])) < 10, f"{t}: kcal percent on the target's line")
        check(abs(gap - 10) <= 1, f"{t}: 10 px between target and percent ({gap:.1f} px)")
        check(pct["fs"] == 32 and pct["st"] == "italic", f"{t}: percent 32 px Saira italic ({pct['fs']} {pct['st']})")
        if past:
            word = [s for s in geo if s["t"] in ("Thiếu", "Trung bình", "Gần đủ", "Đạt")]
            check(len(word) == 1 and word[0]["r"]["left"] >= pct["r"]["right"] - 1, f"{t}: the level word follows the percent ({[s['t'] for s in geo]})")
        else:
            check(not [s for s in geo if s["t"] in ("Thiếu", "Trung bình", "Gần đủ", "Đạt")], f"{t}: no level word on today")

        # macros: amount then percent, 8 px apart (cc-44)
        macro = pg.evaluate(
            """(sel) => {
              const hero = document.querySelector(sel);
              const cells = [...hero.querySelectorAll('[data-align-group=home-hero]')[3].children];
              return cells.map(c => { const line = c.children[1]; const a = line.children[0].getBoundingClientRect(); const b = line.children[1].getBoundingClientRect();
                return { amount: line.children[0].textContent.trim(), pct: line.children[1].textContent.trim(), gap: b.left - a.right, order: a.left < b.left }; });
            }""",
            HERO,
        )
        check(len(macro) == 4 and all(m["order"] and abs(m["gap"] - 8) <= 1.5 for m in macro), f"{t}: macro amount then percent, 8 px gap {[(m['amount'], m['pct'], round(m['gap'], 1)) for m in macro]}")

        # nutrient column: no caption, ink pills like the meal headers (cc-44)
        aside = pg.locator("aside[aria-label='Vi chất'] >> visible=true").first
        check(aside.locator("> p:not([data-level-summary])").count() == 0, f"{t}: no caption over the nutrient column")
        titles = aside.locator("h3").all_text_contents()  # the pill draws them uppercase (cc-44)
        check(titles == ["Khoáng chất", "Vitamin"], f"{t}: group bands in normal case {titles}")
        band = pg.evaluate(
            """() => {
              const h3 = document.querySelector("aside[aria-label='Vi chất'] h3 > span");
              const meal = document.querySelector("section[aria-label='Bữa sáng'] > div > div");
              const a = h3.getBoundingClientRect(), b = meal.getBoundingClientRect();
              const cs = getComputedStyle(h3.querySelector('span')), ms = getComputedStyle(meal.querySelector('button span'));
              const hs = getComputedStyle(h3), mp = getComputedStyle(meal);
              return { aTop: a.top, bTop: b.top, aH: a.height, bH: b.height, bg: [hs.backgroundColor, mp.backgroundColor], fw: [cs.fontWeight, ms.fontWeight], fs: [cs.fontSize, ms.fontSize], pl: [hs.paddingLeft, mp.paddingLeft] };
            }"""
        )
        check(abs(band["aTop"] - band["bTop"]) <= 1, f"{t}: first nutrient pill level with the first meal pill ({band['aTop']:.1f} vs {band['bTop']:.1f})")
        check(band["bg"][0] == band["bg"][1], f"{t}: same pill background {band['bg']}")
        check(band["fw"][0] == band["fw"][1] and band["fs"][0] == band["fs"][1] and band["pl"][0] == band["pl"][1], f"{t}: same weight, size and padding {band['fw']} {band['fs']} {band['pl']}")
        if phone:
            check(abs(band["aH"] - 24) <= 0.5 and abs(band["bH"] - 24) <= 0.5, f"{t}: pills are 24 px ({band['aH']}, {band['bH']})")

        # food rows and nutrient rows use the same name size
        sizes = pg.evaluate(
            """() => {
              const food = document.querySelector("section[aria-label='Bữa sáng'] button[aria-pressed][aria-label*=', '] span span");
              const nutri = document.querySelector("aside[aria-label='Vi chất'] [data-align-group=home-nutrient] span span");
              return [getComputedStyle(food).fontSize, getComputedStyle(nutri).fontSize, getComputedStyle(food).fontWeight, getComputedStyle(nutri).fontWeight];
            }"""
        )
        check(sizes[0] == sizes[1] and sizes[2] == sizes[3], f"{t}: food and nutrient rows share the text size {sizes}")
        if phone:
            sc = pg.evaluate("document.documentElement.scrollHeight - window.innerHeight")
            check(sc <= 0, f"{t}: no page scroll ({sc})")
        os.makedirs(SHOTS, exist_ok=True)
        pg.screenshot(path=os.path.join(SHOTS, f"cc-27f-home-{w}-{'past' if past else 'today'}.png"))
        ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1440, "height": 900}, "1440")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
