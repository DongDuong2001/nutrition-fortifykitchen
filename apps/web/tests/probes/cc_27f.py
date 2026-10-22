"""cc-27f: Hôm nay readability.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, demo mode, sizes 390x844 and 1440x900.
- Hero: sentence case label ("Cả ngày · 7 món"); every text 11 px or more; the kcal percent sits right after the
  target on the same line (the kcal number's 34 px, 10 px gap; V3 22/10); each macro reads amount then percent with an 8 px gap; on a
  past day the level word follows the kcal percent.
- Nutrient column: no caption; "Khoáng chất" and "Vitamin" are Saira 17 px section headers under an inset hairline (V3 22/10,
  no ink band), the meal header is a 44 px row; food rows and nutrient rows share the name size.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27f.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/page.tsx
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
        go(pg, f"/app?date={PAST}" if past else "/app")
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
        check(pct["fs"] == 34 and pct["st"] == "italic", f"{t}: percent 34 px Saira italic ({pct['fs']} {pct['st']})")
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

        # nutrient column: no caption, V3 section headers (Saira 17 px, no ink band) and a 44 px meal header row
        aside = pg.locator("aside[aria-label='Vi chất'] >> visible=true").first
        check(aside.locator("> p:not([data-level-summary])").count() == 0, f"{t}: no caption over the nutrient column")
        titles = aside.locator("h3").all_text_contents()  # drawn uppercase by CSS
        check(titles == ["Khoáng chất", "Vitamin"], f"{t}: group headers in normal case {titles}")
        band = pg.evaluate(
            """() => {
              const h3 = document.querySelector("aside[aria-label='Vi chất'] h3");
              const meal = document.querySelector("section[aria-label='Bữa sáng'] > div");
              const hs = getComputedStyle(h3);
              return { mealH: meal.getBoundingClientRect().height, fs: hs.fontSize, tt: hs.textTransform, bg: hs.backgroundColor, ink: !!document.querySelector('[data-ink-pill]') };
            }"""
        )
        check(band["fs"] == "17px" and band["tt"] == "uppercase", f"{t}: section header Saira 17 px uppercase ({band['fs']}, {band['tt']})")
        check(band["bg"] == "rgba(0, 0, 0, 0)" and not band["ink"], f"{t}: no ink band ({band['bg']}, ink pills {band['ink']})")
        check(abs(band["mealH"] - 44) <= 0.5 or (not phone and band["mealH"] >= 44), f"{t}: meal header row is 44 px ({band['mealH']})")

        # food rows and nutrient rows use the same name size
        sizes = pg.evaluate(
            """() => {
              const food = document.querySelector("section[aria-label='Bữa sáng'] button[aria-pressed][aria-label*=', '] span span");
              const nutri = document.querySelector("aside[aria-label='Vi chất'] [data-align-group=home-nutrient]:not([data-nutrient-row=fiber]) span span");
              return [getComputedStyle(food).fontSize, getComputedStyle(nutri).fontSize, getComputedStyle(food).fontWeight, getComputedStyle(nutri).fontWeight];
            }"""
        )
        check(sizes[0] == sizes[1] and sizes[2] == sizes[3], f"{t}: food and nutrient rows share the text size {sizes}")
        if phone:
            # V3-SPEC §3.1: the meals card is flexible, the vi chất card 180 px, 8 px apart, 12 px page margins
            g = pg.evaluate(
                """() => { const a = document.querySelector("aside[aria-label='Vi chất']").getBoundingClientRect(); const m = document.querySelector('[data-food-scroll]').getBoundingClientRect();
                  return { aw: a.width, gap: a.left - m.right, left: m.left, right: innerWidth - a.right }; }"""
            )
            check(abs(g["aw"] - 180) <= 0.5 and abs(g["gap"] - 8) <= 0.5 and abs(g["left"] - 12) <= 0.5 and abs(g["right"] - 12) <= 0.5, f"{t}: two cards 12 / flexible / 8 / 180 / 12 ({g})")
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
