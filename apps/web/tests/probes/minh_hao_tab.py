"""feat/minh-hao-tab: the "Đồ ăn của Minh Hào" chip on /add and its carousel in Khám phá (demo build, 390 and 1280).

A  /add with the demo rows (source fortify_kitchen, "(mẫu demo)" in the name): the chip is right after Tất cả (so before Yêu thích), 44 px
   tall; picking it lists exactly those rows and no other, and no shortcut cards; the chip row keeps its height and the chips keep
   their places (no layout shift); searching inside it narrows the same rows ("tôm" → Tôm thẻ); a row opens the portion sheet with no
   Thành phần (plain foods, never ingredients or dish parts); Tab walks the chips in order (Tất cả, Đồ ăn của Minh Hào, Yêu thích).
B  The same screen without the demo rows (a non-demo build's catalogue has none): no chip, and nothing else changes (Tất cả, Yêu thích).
C  Khám phá with the demo rows: the carousel "Đồ ăn của Minh Hào" sits above "Món giàu vi chất", one card per food with its name, the
   kcal of its FIRST portion ("1 phần lẻ (150 g sống) · 204 kcal" = 150 g of 136 kcal per 100 g) and the Fortify Kitchen tag; a card opens
   its food page; "Xem tất cả" opens /explore/minh-hao with every row (the same kcal as the cards); Tab goes Xem tất cả, then the cards in order.
D  Khám phá without the demo rows: no carousel.
Screenshots: .screenshots/minh-hao-{add-chip,explore,explore-list}-<w>.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/minh_hao_tab.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/explore/** app/(app)/(tabs)/explore/** components/add/** components/explore/** hooks/use-food-browse.ts lib/fortify-kitchen.ts lib/food-categories.ts lib/mock/sample-foods.ts
import os
import re
import sys
from pathlib import Path

import _demo
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
CHIP = "Đồ ăn của Minh Hào"
# name → kcal of its first portion (kcal per 100 g × the portion's grams ÷ 100, rounded half up): lib/mock/sample-foods.ts
EXPECTED = {
    "Ức gà nấu chậm Minh Hào (mẫu demo)": ("1 phần lẻ (150 g sống)", int(136 * 150 / 100 + 0.5)),
    "Tôm thẻ nấu chậm Minh Hào (mẫu demo)": ("1 phần lẻ (150 g sống)", int(87 * 150 / 100 + 0.5)),
    "Mì Ý sốt cà Minh Hào (mẫu demo)": ("1 phần", int(102.2 * 370.9 / 100 + 0.5)),
}
SAVED_PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"Probe"}'
# A signed-in mock account with no sample data (lib/auth-mock.ts): without it a non-demo visit goes to /signin
MOCK_ACCOUNT = '{"current":"probe@example.com","accounts":{"probe@example.com":{"hash":null,"providers":["google"]}}}'
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def chips(pg):
    group = pg.locator("[role=group][aria-label='Lọc món theo nhóm']:visible").first
    group.wait_for(timeout=15000)
    return group


def chip_names(pg):
    return [t.strip() for t in chips(pg).locator("button").all_inner_texts()]


def chip(pg, name):
    return chips(pg).get_by_role("button", name=name, exact=True)


def rows(pg):
    pg.wait_for_timeout(400)
    loc = pg.locator("[data-food-row]:visible")
    return [loc.nth(i).inner_text().split("\n")[0].strip() for i in range(loc.count())]


def open_add(pg):
    pg.goto(f"{BASE}/add", wait_until="networkidle")
    try:
        chips(pg)
    except Exception:
        pg.screenshot(path=str(SHOTS / "minh-hao-add-failed.png"))
        print(f"[DEBUG] /add never showed the chips; url {pg.url}; text: {pg.inner_text('body')[:300]!r}")
        raise
    pg.wait_for_timeout(600)


def part_a(browser, w, size):
    _demo.enable(True)
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    open_add(pg)
    names = chip_names(pg)
    check(len(names) >= 3 and names[:3] == ["Tất cả", CHIP, "Yêu thích"], f"A {w}: the chip is right after Tất cả ({names[:4]})")
    c = chip(pg, CHIP)
    check(c.bounding_box()["height"] >= 44, f"A {w}: the chip is 44 px tall ({c.bounding_box()['height']})")
    check(c.get_attribute("aria-pressed") == "false", f"A {w}: the chip starts off")
    before = [chip(pg, n).bounding_box() for n in names[:3]]
    group_h = chips(pg).bounding_box()["height"]

    c.click()
    pg.wait_for_timeout(300)
    check(c.get_attribute("aria-pressed") == "true" and chip(pg, "Tất cả").get_attribute("aria-pressed") == "false", f"A {w}: picking the chip turns it on and Tất cả off")
    listed = rows(pg)
    check(sorted(listed) == sorted(EXPECTED), f"A {w}: only the Minh Hào rows are listed ({listed})")
    check(pg.get_by_text("Gần đây", exact=True).locator("visible=true").count() == 0, f"A {w}: no shortcut cards over the filtered list")
    after = [chip(pg, n).bounding_box() for n in names[:3]]
    same = all(abs(a["x"] - b["x"]) < 1 and abs(a["y"] - b["y"]) < 1 and abs(a["height"] - b["height"]) < 1 and abs(a["width"] - b["width"]) < 1 for a, b in zip(before, after))
    check(same and abs(chips(pg).bounding_box()["height"] - group_h) < 1, f"A {w}: the chip row does not move or change size when the chip is picked")
    pg.screenshot(path=str(SHOTS / f"minh-hao-add-chip-{w}.png"))

    # Search inside the chip works like the other groups
    pg.locator("input[type=search]:visible, input[inputmode=search]:visible, [role=searchbox]:visible").first.fill("tôm")
    pg.wait_for_timeout(500)
    listed = rows(pg)
    check(listed == ["Tôm thẻ nấu chậm Minh Hào (mẫu demo)"], f"A {w}: searching tôm inside the chip narrows to the Tôm thẻ row ({listed})")
    pg.locator("input[type=search]:visible, input[inputmode=search]:visible, [role=searchbox]:visible").first.fill("")
    pg.wait_for_timeout(500)
    check(len(rows(pg)) == len(EXPECTED), f"A {w}: clearing the search brings the three rows back")

    # A row opens the portion sheet: a plain food, so no Thành phần (never ingredients or dish parts)
    pg.locator("[data-food-row]:visible").first.click()
    pg.wait_for_timeout(1800)  # the Thành phần chunk of a dish loads on the press: give it the time it needs to show up
    body = pg.inner_text("body")
    check("Minh Hào (mẫu demo)" in body, f"A {w}: a row opens its portion sheet")
    check("thành phần" not in body.lower(), f"A {w}: the portion sheet shows no Thành phần for a Fortify Kitchen food")
    check(pg.locator("[data-tour=dish-parts]").count() == 0, f"A {w}: no dish parts element")
    ctx.close()

    # Control: a real dish of the demo catalogue does show its Thành phần the same way, so the checks above can fail
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    open_add(pg)
    pg.locator("input[type=search]:visible, input[inputmode=search]:visible, [role=searchbox]:visible").first.fill("phở bò")
    pg.wait_for_timeout(500)
    pg.locator("[data-food-row]:visible").first.click()
    pg.wait_for_timeout(1800)
    check(pg.locator("[data-tour=dish-parts]").count() >= 1, f"A {w}: control, Phở bò does show Thành phần")
    ctx.close()

    # Keyboard: Tab walks the chips in order
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    open_add(pg)
    chip(pg, "Tất cả").focus()
    order = []
    for _ in range(3):
        order.append(pg.evaluate("document.activeElement && document.activeElement.textContent.trim()"))
        pg.keyboard.press("Tab")
    check(order == ["Tất cả", CHIP, "Yêu thích"], f"A {w}: Tab order of the chips ({order})")
    ctx.close()


def empty_context(browser, size):
    """A non-demo account (the demo rows are not in its catalogue); the saved profile keeps it out of the setup screens, as smoke.py's empty pass does."""
    ctx = browser.new_context(viewport=size)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_profile_v1_probe@example.com', JSON.stringify({SAVED_PROFILE})); }} catch (e) {{}}")
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_mock_auth_v1', {MOCK_ACCOUNT!r}); }} catch (e) {{}}")
    return ctx


def part_b(browser, w, size):
    _demo.enable(False)
    ctx = empty_context(browser, size)
    pg = ctx.new_page()
    open_add(pg)
    names = chip_names(pg)
    check(CHIP not in names and names[:2] == ["Tất cả", "Yêu thích"], f"B {w}: no chip when the catalogue has no such row ({names[:4]})")
    check(pg.get_by_text(CHIP).count() == 0, f"B {w}: no Đồ ăn của Minh Hào anywhere on /add")
    ctx.close()
    _demo.enable(True)


def card_texts(pg):
    section = pg.locator("section[aria-label='Đồ ăn của Minh Hào']")
    cards = section.locator("ul > li a")
    return section, cards


def part_c(browser, w, size):
    _demo.enable(True)
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(f"{BASE}/explore", wait_until="networkidle")
    section, cards = card_texts(pg)
    section.wait_for(timeout=15000)
    check(section.count() == 1, f"C {w}: the Đồ ăn của Minh Hào carousel is there")
    rich = pg.locator("section[aria-label='Món giàu vi chất']")
    check(section.bounding_box()["y"] < rich.bounding_box()["y"], f"C {w}: it sits above Món giàu vi chất")
    check(cards.count() == len(EXPECTED), f"C {w}: one card per food ({cards.count()})")
    seen = {}
    for i in range(cards.count()):
        text = cards.nth(i).inner_text()
        lines = [t.strip() for t in text.split("\n") if t.strip()]
        name, meta = lines[0], lines[1] if len(lines) > 1 else ""
        seen[name] = meta
        check("Fortify Kitchen" in text, f"C {w}: {name} carries the Fortify Kitchen tag")
        check(cards.nth(i).bounding_box()["width"] >= 150, f"C {w}: {name} card width is the carousel's")
    for name, (label, kcal) in EXPECTED.items():
        check(seen.get(name) == f"{label} · {kcal} kcal", f"C {w}: {name} → {seen.get(name)!r} (expected {label} · {kcal} kcal, the first portion)")
    link = section.get_by_role("link", name="Xem tất cả")
    check(link.count() == 1 and link.bounding_box()["height"] >= 44, f"C {w}: Xem tất cả is a 44 px link")
    pg.screenshot(path=str(SHOTS / f"minh-hao-explore-{w}.png"))

    # Tab goes Xem tất cả, then the cards in order
    link.focus()
    order = []
    for _ in range(1 + cards.count()):
        order.append(pg.evaluate("document.activeElement && (document.activeElement.querySelector('span') || document.activeElement).textContent.trim()"))
        pg.keyboard.press("Tab")
    check(order == ["Xem tất cả", *list(seen)], f"C {w}: Tab order ({order})")

    # A card opens its food page
    cards.first.click()
    pg.wait_for_url(re.compile(r"/foods/demo-fk-"), timeout=10000)
    page_text = pg.inner_text("body")
    check("minh hào (mẫu demo)" in page_text.lower(), f"C {w}: a card opens its food page ({pg.url}; {page_text[:160]!r})")
    check("thành phần" not in pg.inner_text("body").lower(), f"C {w}: the food page lists no ingredients or parts")

    # Xem tất cả: the list screen
    pg.goto(f"{BASE}/explore", wait_until="networkidle")
    section, _ = card_texts(pg)
    section.get_by_role("link", name="Xem tất cả").click()
    pg.wait_for_url("**/explore/minh-hao", timeout=10000)
    pg.locator("[data-food-row]:visible").first.wait_for(timeout=10000)
    body = pg.inner_text("body")
    check(CHIP.lower() in body.lower() and "3 món" in body, f"C {w}: the list screen is titled Đồ ăn của Minh Hào with 3 món ({body[:160]!r})")
    listed = rows(pg)
    check(sorted(listed) == sorted(EXPECTED), f"C {w}: the list holds every row ({listed})")
    values = pg.locator("[data-food-row]:visible").all_inner_texts()
    for name, (_, kcal) in EXPECTED.items():
        row = next((t for t in values if t.startswith(name)), "")
        check(f"{kcal}" in row.replace("\n", " "), f"C {w}: the list shows {name} at {kcal} kcal")
    pg.screenshot(path=str(SHOTS / f"minh-hao-explore-list-{w}.png"), full_page=True)
    ctx.close()


def part_d(browser, w, size):
    _demo.enable(False)
    ctx = empty_context(browser, size)
    pg = ctx.new_page()
    pg.goto(f"{BASE}/explore", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check(pg.locator("section[aria-label='Món giàu vi chất']").count() == 1, f"D {w}: Khám phá is up")
    check(pg.locator("section[aria-label='Đồ ăn của Minh Hào']").count() == 0, f"D {w}: no carousel when the catalogue has none")
    ctx.close()
    _demo.enable(True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, size in SIZES:
            part_a(browser, w, size)
            part_b(browser, w, size)
            part_c(browser, w, size)
            part_d(browser, w, size)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
