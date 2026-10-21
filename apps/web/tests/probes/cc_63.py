"""cc-63: bugs from the break-ui and mobile-native passes.

Production demo build, 390x844 and 320x640.

- B6: nutrient rows and macro cells stay inside their boxes at 390 and 320 (screenshots of the nutrient column)
- B1: 100 g x 20, then 5000 g typed: the field is written back (250), "Tối đa 5.000 g" under it, the portion says 5.000 g
- B2: a food with an unknown energy reads "Chưa có kcal / 1 viên", never 0 kcal
- B3: the Khay bar is two rows (count, kcal, Xem lại / Thêm n món vào Bữa), with many foods and a big total nothing
  overflows or overlaps at 390 and 320, and the list clears the bar
- N1: no visible input under 16 px on /add, /foods/new, /settings/targets/macros
- N5: html and body have overscroll-behavior-y: none, Hôm nay's list keeps contain (from lg, V3 22/10)
Screenshots: .screenshots/cc-63-*.png
Run with: ALIGN_BASE_URL=http://localhost:3108 npm run probe -- tests/probes/cc_63.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/foods/new/** app/(app)/settings/account/** app/(app)/settings/targets/macros/**
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
SMALL = {"width": 320, "height": 640}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def go(pg, route, wait=400):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-63-{name}.png"))


def page(browser, size):
    ctx = browser.new_context(viewport=size)
    return ctx, ctx.new_page()


def b1_limit(browser):
    ctx, pg = page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("Ức gà")
    pg.wait_for_timeout(500)
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(700)
    grams = pg.locator('input[aria-label="Số gam"]:visible').first
    check(grams.count() == 1, "B1: the portion sheet has the gram field")
    grams.fill("100")
    plus = pg.get_by_role("button", name="Tăng nhân khẩu phần nhanh")
    for _ in range(19):
        plus.click()
    pg.wait_for_timeout(200)
    check("×20" in pg.inner_text("body"), "B1: N is 20")
    grams.fill("5000")
    pg.wait_for_timeout(300)
    body = pg.inner_text("body")
    check(grams.input_value() == "250", f"B1: the field is written back clamped ({grams.input_value()!r})")
    alert = pg.get_by_role("alert").filter(has_text="Tối đa 5.000 g")
    check(alert.count() == 1, "B1: inline role=alert 'Tối đa 5.000 g'")
    check("5.000 g" in body and "100.000 g" not in body and "20.000" not in body, "B1: 5.000 g everywhere, no 100.000 g")
    shot(pg, "b1-limit-390")
    ctx.close()


def b2_unknown_kcal(browser):
    ctx, pg = page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("Magnesium Bis")
    pg.wait_for_timeout(600)
    body = pg.inner_text("body")
    check("Chưa có kcal / 1 viên" in body, "B2: unknown energy reads 'Chưa có kcal / 1 viên'")
    check("0 kcal / 1 viên" not in body, "B2: never '0 kcal'")
    shot(pg, "b2-unknown-kcal-390")
    ctx.close()


def bar_metrics(pg):
    return pg.evaluate(
        """() => {
          const bar = [...document.querySelectorAll('[data-tray-bar]')].find((e) => e.getBoundingClientRect().width > 0);
          if (!bar) return null;
          const rect = (e) => e.getBoundingClientRect();
          const b = rect(bar);
          const rows = [...bar.children];
          const row1 = rows[0];
          const count = row1.firstElementChild;
          const review = row1.querySelector('button');
          const add = rows[1];
          const c = rect(count), r = rect(review), a = rect(add);
          const list = [...document.querySelectorAll('[data-add-scroll]')].find((e) => e.getBoundingClientRect().width > 0);
          return {
            bar: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, h: b.height },
            vw: document.documentElement.clientWidth,
            row1Overflow: count.scrollWidth > count.clientWidth + 0.5,
            row1ScrollOk: row1.scrollWidth <= row1.clientWidth + 0.5,
            overlap: !(c.right <= r.left + 0.5 || r.right <= c.left + 0.5),
            reviewH: r.height, reviewW: r.width,
            addH: a.height, addW: a.width, barInnerW: b.width,
            addScrollOk: add.scrollWidth <= add.clientWidth + 0.5,
            barScrollOk: bar.scrollWidth <= bar.clientWidth + 0.5,
            text: bar.innerText.replace(/\\n/g, ' | '),
            listBottom: list ? rect(list).bottom : null,
          };
        }"""
    )


def b3_bar(browser, size, label):
    ctx, pg = page(browser, size)
    go(pg, "/add?meal=breakfast")
    toggles = pg.locator("[data-tray-toggle]:visible")
    n = min(8, toggles.count())
    for i in range(n):
        toggles.nth(i).click()
        pg.wait_for_timeout(80)
    # a big total: open the review, give the first food 5000 g, close it
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(500)
    first = pg.locator('[data-tray-review] input[inputmode="decimal"]:visible').first
    if first.count():
        first.fill("5000")
        pg.wait_for_timeout(300)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)
    m = bar_metrics(pg)
    check(m is not None, f"B3 {label}: the Khay bar shows with {n} foods")
    if m:
        print("      bar:", m["text"])
        check(m["bar"]["left"] >= 0 and m["bar"]["right"] <= m["vw"] + 0.5, f"B3 {label}: the bar stays in the screen")
        check(not m["overlap"], f"B3 {label}: the count and Xem lại do not overlap")
        check(m["barScrollOk"] and m["addScrollOk"] and m["row1ScrollOk"], f"B3 {label}: scrollWidth <= clientWidth in the bar")
        check(m["reviewH"] >= 43.5 and m["reviewW"] >= 43.5, f"B3 {label}: Xem lại hit area is 44 px ({m['reviewW']:.0f}x{m['reviewH']:.0f})")
        check(abs(m["addH"] - 48) < 1 and m["addW"] > m["barInnerW"] - 20, f"B3 {label}: the add is full width, 48 px ({m['addW']:.0f}x{m['addH']:.0f})")
        check(f"Thêm {n} món vào Bữa sáng" in m["text"], f"B3 {label}: 'Thêm {n} món vào Bữa sáng'")
        check(m["listBottom"] is not None and m["listBottom"] <= m["bar"]["top"] + 0.5, f"B3 {label}: the list clears the bar ({m['listBottom']} <= {m['bar']['top']})")
    shot(pg, f"b3-khay-bar-{label}")
    ctx.close()


def b6_columns(browser, size, label):
    """Every nutrient row and macro cell fits its box with a supplement logged (999+% itself is covered by home.test.ts: no demo food reaches it)."""
    ctx, pg = page(browser, size)
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("Magnesium Bis")
    pg.wait_for_timeout(600)
    rows = pg.locator("button[data-food-row]:visible")
    if rows.count() == 0:
        print("[NOTE] no Magnesium Bis supplement in the demo catalogue; 999+% is covered by home.test.ts")
        ctx.close()
        return
    rows.first.click()
    pg.wait_for_timeout(700)
    pg.get_by_role("button", name="Thêm vào Bữa trưa").first.click()
    pg.wait_for_url("**/app*")
    pg.wait_for_timeout(900)
    column = pg.locator('[data-tour="nutrient-column"]').first
    over = pg.evaluate(
        """() => [...document.querySelectorAll('[data-align-group="home-nutrient"], [data-align-group="home-hero"].grid > div')]
          .filter(e => e.getBoundingClientRect().width > 0 && e.scrollWidth > e.clientWidth + 0.5)
          .map(e => (e.innerText || '').slice(0, 40))"""
    )
    check(not over, f"B6 {label}: no nutrient row or hero cell is wider than its box {over if over else ''}")
    if column.count():
        column.screenshot(path=str(SHOTS / f"cc-63-b6-nutrient-column-{label}.png"))
    shot(pg, f"b6-home-{label}")
    ctx.close()


def tray_key(browser):
    """A Sống / Chín swap keeps the tray card: the same element, and the focus stays on the button."""
    ctx, pg = page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("Gạo trắng")
    pg.wait_for_timeout(600)
    pg.locator("[data-tray-toggle]:visible").first.click()
    pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(600)
    card = pg.locator("[data-tray-review] li").first
    switch = card.get_by_role("group", name="Sống hoặc chín")
    if switch.count() == 0:
        print("[NOTE] the first food has no Sống | Chín switch; covered by tray.test.ts")
        ctx.close()
        return
    card.evaluate("el => { el.__probe = 'same'; }")
    other = "Đã nấu chín" if switch.get_by_role("button", name="Cân sống", exact=True).get_attribute("aria-pressed") == "true" else "Cân sống"
    before = card.inner_text()
    switch.get_by_role("button", name=other, exact=True).focus()
    switch.get_by_role("button", name=other, exact=True).press("Enter")
    pg.wait_for_timeout(500)
    same = pg.locator("[data-tray-review] li").first.evaluate("el => el.__probe === 'same'")
    focus = pg.evaluate("document.activeElement && document.activeElement.textContent")
    check(same, "tray key: the card is the same element after the swap (no remount)")
    check(focus and other in focus, f"tray key: the focus stays on the switch button ({focus!r})")
    check(pg.locator("[data-tray-review] li").first.inner_text() != before, "tray key: the card now shows the other state")
    ctx.close()


def n1_inputs(browser):
    ctx, pg = page(browser, PHONE)
    for route in ["/add?meal=lunch", "/foods/new", "/settings/targets/macros", "/settings/account"]:
        go(pg, route)
        small = pg.evaluate(
            """() => [...document.querySelectorAll('input, textarea')]
              .filter(e => !['checkbox','radio','hidden','range','file'].includes(e.type))
              .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
              .map(e => [e.id || e.getAttribute('aria-label') || e.name || e.type, parseFloat(getComputedStyle(e).fontSize)])
              .filter(([, px]) => px < 16)"""
        )
        check(not small, f"N1: every visible input on {route} is 16 px or more {small if small else ''}")
    ctx.close()


def n5_overscroll(browser):
    ctx, pg = page(browser, PHONE)
    go(pg, "/app")
    html = pg.evaluate("getComputedStyle(document.documentElement).overscrollBehaviorY")
    body = pg.evaluate("getComputedStyle(document.body).overscrollBehaviorY")
    check(html == "none" and body == "none", f"N5: html and body overscroll-behavior-y none ({html}, {body})")
    inner = pg.evaluate(
        "[...document.querySelectorAll('div')].filter(e => e.className.includes('lg:overscroll-y-contain')).length"  # V3: the page scrolls on a phone, the list card only from lg
    )
    check(inner >= 1, f"N5: Hôm nay's own list keeps overscroll-y contain ({inner})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    b1_limit(browser)
    b2_unknown_kcal(browser)
    b3_bar(browser, PHONE, "390")
    b3_bar(browser, SMALL, "320")
    b6_columns(browser, PHONE, "390")
    b6_columns(browser, SMALL, "320")
    tray_key(browser)
    n1_inputs(browser)
    n5_overscroll(browser)
    browser.close()

print("\nAll cc-63 checks passed" if not problems else f"\n{len(problems)} problem(s):\n- " + "\n- ".join(problems))
sys.exit(1 if problems else 0)
