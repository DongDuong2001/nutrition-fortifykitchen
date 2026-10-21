"""fix/rich-tabs: the "Giàu …" lists split into Thực phẩm and Thực phẩm bổ sung.

On Giàu Vitamin D and Giàu Calcium, at 390 and 1280:
- Two tabs (role tab, aria-selected, 44 px tall), Thực phẩm selected by default; its rows hold no bo_sung food, and the
  Mỗi 100 g | Mỗi khẩu phần chips are there.
- Thực phẩm bổ sung (?loai=bo-sung): only bo_sung rows, no basis chips, the subtitle "<unit> mỗi lần dùng", and no
  row meta in grams ("· 1 g"): the serving as it is called ("1 viên"). The demo catalogue has no supplement with
  Vitamin D: that tab shows its own empty text (no "tự tạo món mới" hint); Calcium must list some.
- Open a supplement, go back: still on Thực phẩm bổ sung (?loai survives back), with no scroll jump to the top of a
  scrolled list when switching tabs.
Screenshots: .screenshots/rich-tabs-<nutrient>-<tab>-<w>.png
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/rich_tabs.py
"""
# PROBE_COVERS: app/(app)/explore/rich/** lib/rich-in.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def rows(pg):
    pg.wait_for_timeout(300)
    loc = pg.locator("a[data-food-row] >> visible=true")
    return [(loc.nth(i).get_attribute("data-category"), loc.nth(i).inner_text()) for i in range(loc.count())]


def tab(pg, name):
    return pg.get_by_role("tab", name=name, exact=True).locator("visible=true").first


def run(browser, w, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    for nutrient, title in (("vitamin_d", "Vitamin D"), ("calcium", "Calcium")):
        tag = f"{w} {title}"
        pg.goto(f"{BASE}/explore/rich/{nutrient}", wait_until="networkidle")
        pg.locator("a[data-food-row] >> visible=true").first.wait_for(timeout=15000)
        food, supp = tab(pg, "Thực phẩm"), tab(pg, "Thực phẩm bổ sung")
        check(pg.locator("[role=tablist]:visible").count() == 1, f"{tag}: one tablist")
        check(food.get_attribute("aria-selected") == "true" and supp.get_attribute("aria-selected") == "false", f"{tag}: Thực phẩm is the default tab")
        check(min(food.bounding_box()["height"], supp.bounding_box()["height"]) >= 44, f"{tag}: tabs are 44 px tall")
        listed = rows(pg)
        check(len(listed) > 0, f"{tag} Thực phẩm: {len(listed)} rows")
        check(all(c != "bo_sung" for c, _ in listed), f"{tag} Thực phẩm: no supplement ({[t.splitlines()[0] for c, t in listed if c == 'bo_sung'][:3]})")
        check(pg.get_by_role("button", name="Mỗi 100 g").locator("visible=true").count() == 1, f"{tag} Thực phẩm: the basis chips are there")
        pg.screenshot(path=str(SHOTS / f"rich-tabs-{nutrient}-food-{w}.png"), full_page=True)

        # Scrolled down a little: the tab's router.replace (scroll: false) does not send the page to the top. Tapping the
        # tab already on runs the same replace with a list as long; the other tab may be shorter, so the page can only
        # keep what is still there to scroll
        pg.mouse.wheel(0, 120)
        pg.wait_for_timeout(200)
        before = pg.evaluate("window.scrollY")
        food.evaluate("(el) => el.click()")  # a real tap; Playwright's click would scroll the tab into view first
        pg.wait_for_timeout(300)
        check(pg.evaluate("window.scrollY") == before, f"{tag}: the tab replace keeps the scroll ({before} → {pg.evaluate('window.scrollY')})")
        supp.evaluate("(el) => el.click()")
        pg.wait_for_url(re.compile(r"\?loai=bo-sung$"), timeout=5000)
        pg.wait_for_timeout(300)
        after, room = pg.evaluate("[window.scrollY, document.documentElement.scrollHeight - window.innerHeight]")
        check(after >= min(before, room) - 1, f"{tag}: switching tabs keeps the scroll it can ({before} → {after}, room {room})")
        check(tab(pg, "Thực phẩm bổ sung").get_attribute("aria-selected") == "true", f"{tag}: Thực phẩm bổ sung selected")
        listed = rows(pg)
        if not listed:
            # The demo catalogue has no supplement with Vitamin D: the tab's own empty text, without the "tự tạo" hint
            body = pg.inner_text("body")
            check(nutrient == "vitamin_d", f"{tag} Thực phẩm bổ sung: rows listed")
            check(f"Chưa có thực phẩm bổ sung nào có dữ liệu {title}." in body and "tự tạo món mới" not in body, f"{tag} Thực phẩm bổ sung: empty text")
            pg.screenshot(path=str(SHOTS / f"rich-tabs-{nutrient}-supplement-{w}.png"), full_page=True)
            tab(pg, "Thực phẩm").click()
            pg.wait_for_timeout(300)
            continue
        check(len(listed) > 0, f"{tag} Thực phẩm bổ sung: {len(listed)} rows")
        check(all(c == "bo_sung" for c, _ in listed), f"{tag} Thực phẩm bổ sung: supplements only ({[c for c, _ in listed if c != 'bo_sung'][:3]})")
        check(pg.get_by_role("button", name="Mỗi 100 g").locator("visible=true").count() == 0, f"{tag} Thực phẩm bổ sung: no basis chips")
        body = pg.inner_text("body")
        check("mỗi lần dùng" in body, f"{tag} Thực phẩm bổ sung: subtitle says mỗi lần dùng")
        grams = [t.splitlines()[1] for _, t in listed if len(t.splitlines()) > 1 and re.search(r"· \d+(,\d+)? g$", t.splitlines()[1])]
        check(not grams, f"{tag} Thực phẩm bổ sung: the serving, never N g, in the row meta ({grams[:3]})")
        pg.evaluate("window.scrollTo(0, 0)")
        pg.screenshot(path=str(SHOTS / f"rich-tabs-{nutrient}-supplement-{w}.png"), full_page=True)

        # Back from a supplement's page returns to the same tab
        pg.locator("a[data-food-row] >> visible=true").first.click()
        pg.wait_for_url("**/foods/**", timeout=10000)
        pg.go_back(wait_until="networkidle")
        pg.wait_for_timeout(400)
        check(pg.url.endswith("?loai=bo-sung"), f"{tag}: back from a food keeps ?loai=bo-sung ({pg.url})")
        check(tab(pg, "Thực phẩm bổ sung").get_attribute("aria-selected") == "true", f"{tag}: back from a food shows Thực phẩm bổ sung")
        tab(pg, "Thực phẩm").click()
        pg.wait_for_timeout(300)
        check("?loai" not in pg.url, f"{tag}: Thực phẩm drops the param ({pg.url})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, size in SIZES:
            run(browser, w, size)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
