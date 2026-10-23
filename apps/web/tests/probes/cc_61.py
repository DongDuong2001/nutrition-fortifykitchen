"""cc-61 (audit M1, M2), 390x844 and 1440x900.

M1. Hôm nay: the "x/N đạt" micro verdict is the Vi chất column's header row, above the first group band (N covers
    minerals and vitamins; C3: above the Chất xơ section, which heads the bands), on a logged day and on an empty one. "Đủ 22 vi chất" stays at the foot.
M2. The portion panel draws the size-chip row ("Kích cỡ") only when the food has 2 or more sizes: Phở bò (Tô | Gam)
    shows the toggle and the stepper and no lone "Tô" chip (a food with several sizes keeps its chips: portion-panel.test.tsx).
Run with: ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/cc_61.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/**
import json
import os
import re
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
ASIDE = "aside[aria-label='Vi chất']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


COLUMN = """() => {
  const aside = [...document.querySelectorAll("aside[aria-label='Vi chất']")].find(a => a.getBoundingClientRect().width > 0);
  const verdicts = aside.querySelectorAll('[data-level-summary]');
  const v = verdicts[0];
  // C3 (homnay-c2.md item 2): the Chất xơ section sits above the first group band, so the verdict heads the first section
  const band = aside.querySelector('section');
  const bar = aside.querySelector('[role=progressbar]');
  const link = [...aside.querySelectorAll('a')].find(a => a.textContent.includes('Đủ 22 vi chất'));
  const r = (e) => e ? e.getBoundingClientRect() : null;
  return {
    count: verdicts.length,
    text: v ? v.innerText.replace(/\\s+/g, ' ').trim() : null,
    bandBottom: r(band).bottom, bandTop: r(band).top,
    top: v ? r(v).top : null, bottom: v ? r(v).bottom : null,
    barTop: bar ? r(bar).top : null,
    linkTop: link ? r(link).top : null,
    asideTop: r(aside).top, asideLeft: r(aside).left, asideRight: r(aside).right,
    left: v ? r(v).left : null, right: v ? r(v).right : null,
    inArea: v ? [...aside.children].some(ch => ch !== v && ch.contains(v)) : null,
  };
}"""


def day(browser, size, empty):
    ctx = browser.new_context(viewport=size)
    if empty:
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(NO_SAMPLE)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator(ASIDE + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(700)
    c = pg.evaluate(COLUMN)
    tag = f"{size['width']} {'empty day' if empty else 'logged day'}"
    check(c["count"] == 1, f"{tag}: one verdict ({c['count']})")
    check(c["text"] is not None and re.match(r"^\d+/\d+ đạt", c["text"]) is not None, f"{tag}: it reads x/N đạt ({c['text']!r})")
    check(c["bottom"] <= c["bandTop"] + 0.5 and c["bandTop"] - c["bottom"] <= 8, f"{tag}: right above the first section ({c['bottom']:.0f} -> {c['bandTop']:.0f})")
    check(c["top"] - c["asideTop"] < 12, f"{tag}: at the top of the column ({c['top'] - c['asideTop']:.0f} px down)")
    check(c["inArea"] is False, f"{tag}: outside the scrolling area, so it never scrolls away")
    h = c["bottom"] - c["top"]
    check(abs(h - round(h)) < 0.01, f"{tag}: a whole-pixel height ({h})")
    check(c["linkTop"] is not None and c["linkTop"] > c["bottom"], f"{tag}: Đủ 22 vi chất stays below it")
    check(abs(c["left"] - (c["asideLeft"] + 1)) <= 2 or c["left"] >= c["asideLeft"], f"{tag}: inside the column edges")
    if size is PHONE:
        check(c["linkTop"] is not None, f"{tag}: link drawn")
    ctx.close()


def pick(pg, query, row_text):
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(900)
    pg.locator("[data-add-panel] input").first.fill(query)
    pg.wait_for_timeout(500)
    pg.locator("[data-add-panel] button[data-food-row]").filter(has_text=row_text).first.tap()
    panel = pg.locator('[data-tour="portion-panel"]:visible').first
    panel.wait_for(state="visible")
    pg.wait_for_timeout(600)
    return panel


def panel_checks(browser):
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    panel = pick(pg, "phở bò", "Phở bò")
    chips = panel.get_by_role("group", name="Kích cỡ")
    check(chips.count() == 0, f"Phở bò: no size-chip row ({chips.count()})")
    check(panel.get_by_role("group", name="Đơn vị khẩu phần").count() == 1, "Phở bò: the Tô | Gam toggle is there")
    check(panel.get_by_text("Số lượng").count() >= 1, "Phở bò: the stepper is there")
    check(re.search(r"\d+\s*kcal", panel.inner_text()) is not None, "Phở bò: the kcal card is there")
    panel.get_by_role("button", name="Gam", exact=True).first.tap()
    pg.wait_for_timeout(300)
    panel.get_by_role("button", name="Tô", exact=True).first.tap()
    pg.wait_for_timeout(300)
    check(chips.count() == 0, "Phở bò: still no chip row after Gam and back to Tô")
    # Other unit foods: a chip row is never a lone chip
    rows = []
    for query, name in (("bún", "Bún"), ("phở", "Phở"), ("bánh mì", "Bánh mì"), ("đậu", "Đậu"), ("cơm", "Cơm"), ("trứng", "Trứng")):
        try:
            panel = pick(pg, query, name)
        except Exception:
            continue
        # Every unit tab of the food (Gam has no chips)
        toggle = panel.get_by_role("group", name="Đơn vị khẩu phần")
        tabs = toggle.get_by_role("button").all_inner_texts() if toggle.count() else [None]
        for tab in tabs:
            if tab == "Gam":
                continue
            if tab is not None:
                toggle.get_by_role("button", name=tab, exact=True).tap()
                pg.wait_for_timeout(250)
            chips = panel.get_by_role("group", name="Kích cỡ")
            n = chips.get_by_role("button").count() if chips.count() else 0
            rows.append((f"{name}/{tab}", n))
            check(n != 1, f"{name} {tab}: no lone size chip ({n})")
            if n >= 2:
                chips.get_by_role("button").last.tap()
                pg.wait_for_timeout(250)
                check(chips.get_by_role("button").last.get_attribute("aria-pressed") == "true", f"{name} {tab}: a chip still selects its size")
    print("note: chip counts", rows)
    # The demo catalogue has no món with 2+ sizes in unit mode; components/ui/__tests__/portion-panel.test.tsx covers the kept chips
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size in (PHONE, DESKTOP):
            for empty in (False, True):
                day(browser, size, empty)
        panel_checks(browser)
        browser.close()
    if problems:
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    print("\nall ok")


if __name__ == "__main__":
    main()
