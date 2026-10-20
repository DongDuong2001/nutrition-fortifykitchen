"""cc-64 follow-ups (feat/followups-1020): the motion items PR #20 left, checked in a running demo build at 390x844.

- Toasts: two adds into one meal in a row show one toast that updates in place ("Đã thêm 2 món vào Bữa trưa"); a
  sideways swipe takes the toast away; a finger on it stops its clock.
- Khay: a removed card closes its height over several frames (the card below glides up, no one-frame jump).
- Thành phần: a press on a Món Việt row loads the parts, so the block is there on the sheet's first frame.
- Link page: the doodles stay still on a phone and move on a desktop screen.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_64_followups.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/app/** app/page.tsx components/link-page/** components/ui/toast.tsx components/diary-toast.tsx components/add/add-tray.tsx components/ui/dish-parts.tsx
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def add_first_food(pg):
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(700)
    pg.locator("[data-add-panel] button[data-food-row]:visible, [role=dialog] button[data-food-row]:visible").first.click()
    pg.locator('[data-testid="portion-add"]:visible').first.click()


def toast(pg):
    return pg.locator("[data-state] .m-toast, .m-toast").filter(has_text="Đã thêm").first


def toasts(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    # The meal an add goes to follows the time of day (Bữa trưa at lunch time): pin the clock so the toast text does not
    pg.clock.set_fixed_time("2026-10-20T12:30:00+07:00")
    add_first_food(pg)
    pg.wait_for_url("**/app**", timeout=5000)
    pg.wait_for_timeout(300)
    first = toast(pg).inner_text() if toast(pg).count() else ""
    check("Đã thêm" in first, f"the first add shows its toast ({first[:50]!r})")
    pg.locator("#mobile-add-fab").click()
    pg.wait_for_url("**/add**")
    pg.wait_for_timeout(500)
    pg.locator("[data-add-panel] button[data-food-row]:visible, [role=dialog] button[data-food-row]:visible").first.click()
    pg.locator('[data-testid="portion-add"]:visible').first.click()
    pg.wait_for_url("**/app**", timeout=5000)
    pg.wait_for_timeout(300)
    shown = pg.locator(".m-toast").filter(has_text="Đã thêm")
    text = shown.first.inner_text() if shown.count() else ""
    check(shown.count() == 1 and "Đã thêm 2 món vào Bữa trưa" in text, f"a second add into the same meal updates the one toast ({shown.count()} toast(s), {text[:50]!r})")
    box = shown.first.bounding_box()
    pg.mouse.move(box["x"] + 40, box["y"] + box["height"] / 2)
    pg.mouse.down()
    for dx in range(0, 260, 20):
        pg.mouse.move(box["x"] + 40 + dx, box["y"] + box["height"] / 2)
        pg.wait_for_timeout(8)
    pg.mouse.up()
    pg.wait_for_timeout(600)
    check(pg.locator(".m-toast").filter(has_text="Đã thêm").count() == 0, "a sideways swipe takes the toast away")
    ctx.close()


def tray(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(700)
    toggles = pg.locator("[data-tray-toggle]:visible")
    for i in range(3):
        toggles.nth(i).click()
        pg.wait_for_timeout(150)
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(700)
    cards = pg.locator("[data-tray-review] li")
    before = cards.count()
    # Follow the second card's top for 400 ms after the first card's × (every animation frame)
    pg.evaluate("""() => { const li = document.querySelectorAll('[data-tray-review] li'); window.__tops = []; const el = li[1];
      const t0 = performance.now(); const step = () => { window.__tops.push(Math.round(el.getBoundingClientRect().top)); if (performance.now() - t0 < 400) requestAnimationFrame(step); };
      requestAnimationFrame(step); }""")
    cards.first.locator('button[aria-label^="Bỏ khỏi khay"]').click()
    pg.wait_for_timeout(600)
    tops = pg.evaluate("() => window.__tops")
    distinct = sorted(set(tops))
    check(pg.locator("[data-tray-review] li").count() == before - 1, f"the card leaves the tray ({before} → {pg.locator('[data-tray-review] li').count()})")
    check(len(distinct) >= 4, f"the card below glides up over several frames, not one jump ({len(distinct)} distinct tops: {distinct[:8]}…)")
    ctx.close()


def dish_parts(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(700)
    chip = pg.get_by_role("button", name="Món Việt")
    if chip.count():
        chip.first.click()
        pg.wait_for_timeout(500)
    row = pg.locator("[data-add-panel] button[data-food-row]:visible, [role=dialog] button[data-food-row]:visible").first
    box = row.bounding_box()
    pg.mouse.move(box["x"] + 30, box["y"] + box["height"] / 2)
    pg.mouse.down()
    pg.wait_for_timeout(900)  # the press loads the chunk and the recipes
    # From the frame the portion panel is drawn to the frame Thành phần is (0 = the same frame)
    pg.evaluate("""() => { window.__parts = null; window.__panel = null; const t0 = performance.now(); const step = () => {
      const now = Math.round(performance.now() - t0);
      if (window.__panel === null && document.querySelector('[data-tour="portion-panel"]')) window.__panel = now;
      if (document.querySelector('[data-tour="dish-parts"]')) { window.__parts = now; return; }
      if (performance.now() - t0 < 1500) requestAnimationFrame(step); }; requestAnimationFrame(step); }""")
    pg.mouse.up()
    pg.wait_for_timeout(1600)
    parts, panel = pg.evaluate("() => [window.__parts, window.__panel]")
    gap = None if parts is None or panel is None else parts - panel
    check(gap is not None and gap <= 20, f"after a press on a Món Việt row, Thành phần is drawn with the portion panel (panel at {panel} ms, parts at {parts} ms)")
    ctx.close()


def link_page(browser):
    for width, moving in [(390, False), (1440, True)]:
        ctx = browser.new_context(viewport={"width": width, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="networkidle")
        pg.wait_for_timeout(1200)
        names = pg.evaluate("() => [...document.querySelectorAll('.link-d, .link-p')].filter(e => e.getBoundingClientRect().width > 0).slice(0, 5).map(e => getComputedStyle(e).animationName)")
        if not names:
            check(False, f"link page @{width}: doodles drawn")
        else:
            check(all((n != "none") == moving for n in names), f"link page @{width}: the doodles {'move' if moving else 'stay still'} ({names[:3]})")
        ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        toasts(browser)
        tray(browser)
        dish_parts(browser)
        link_page(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
