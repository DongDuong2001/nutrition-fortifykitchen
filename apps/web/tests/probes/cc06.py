"""cc-06: Today rows open Edit entry, one toast with Hoàn tác, no Next dev Issue badge, Micros header stays put.
Run with: ALIGN_BASE_URL=http://localhost:3101 PATH=/usr/bin:$PATH npm run probe -- tests/probes/cc06.py
"""
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def meal_text(pg, slot):
    return pg.locator(f'[id$="meal-{slot}"] >> visible=true').first.inner_text()


def button(pg, label):
    return pg.locator("button >> visible=true").filter(has_text=label).first


def issue_badge(pg):
    # Next dev badge: data-error is "true" when the page has an Issue
    return pg.evaluate(
        """() => { const o = []; document.querySelectorAll('nextjs-portal').forEach(h => {
            const b = h.shadowRoot && h.shadowRoot.querySelector('[data-next-badge]');
            if (b) o.push(b.getAttribute('data-error')); }); return o; }"""
    )


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, vp in (("390", PHONE), ("1440", DESKTOP)):
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            problems_console = []
            pg.on(
                "console",
                lambda m: problems_console.append(m.text[:200])
                if m.type in ("error", "warning") and "preloaded using link preload" not in m.text
                else None,
            )

            # 1. no Issue badge and no console problems on four pages
            for route in ("/", "/micros", "/add?meal=snack", "/entry/item-1"):
                pg.goto(BASE + route, wait_until="networkidle")
                pg.wait_for_timeout(1200)
                check("true" not in issue_badge(pg), f"{name}: no Next Issue badge on {route}")
            check(not problems_console, f"{name}: no console warnings or errors ({problems_console[:2]})")

            # 2. tap the Yến mạch row on Today, edit to 90 g, save, totals updated
            pg.goto(BASE + "/", wait_until="networkidle")
            pg.wait_for_timeout(500)
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc06-today-390.png"), animations="disabled")
            else:
                pg.screenshot(path=os.path.join(SHOTS, "cc06-today-1440.png"), animations="disabled")
            row = pg.locator('a[href="/entry/item-1"] >> visible=true').first
            box = row.bounding_box()
            check(box is not None and box["height"] >= 44, f"{name}: Yến mạch row is at least 44 px ({box and box['height']})")
            row.click()
            pg.wait_for_url("**/entry/item-1")
            pg.wait_for_timeout(300)
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc06-entry-chips-390.png"), animations="disabled")
            check(pg.locator('fieldset button >> visible=true').count() == 5, f"{name}: five inline meal chips")
            pg.locator('input[aria-label="Số gam"] >> visible=true').first.fill("90")
            button(pg, "Lưu thay đổi").click()
            pg.wait_for_url(re.compile(r".*/(?.*)?$"))
            pg.wait_for_timeout(400)
            check("Yến mạch · 90 g" in meal_text(pg, "breakfast"), f"{name}: row shows 90 g")
            check("573 kcal" in meal_text(pg, "breakfast"), f"{name}: breakfast 573 kcal")
            check("1.155" in pg.inner_text("body"), f"{name}: day total 1.155")

            # 3. delete: exactly one toast, Hoàn tác restores
            pg.locator('a[href="/entry/item-2"] >> visible=true').first.click()
            pg.wait_for_url("**/entry/item-2")
            button(pg, "Xóa món này").click()
            pg.wait_for_url(re.compile(r".*/(?.*)?$"))
            pg.wait_for_timeout(300)
            toasts = pg.locator('[role=status] >> visible=true')
            check(toasts.count() == 1, f"{name}: one toast after delete ({toasts.count()})")
            check("Yogurt kefir" not in meal_text(pg, "breakfast"), f"{name}: deleted row gone")
            button(pg, "Hoàn tác").click()
            pg.wait_for_timeout(300)
            check("Yogurt kefir · 200 ml" in meal_text(pg, "breakfast"), f"{name}: Hoàn tác restores")
            check(pg.locator('[role=status] >> visible=true').count() == 0, f"{name}: toast gone after Hoàn tác")

            # 4. Micros: header and chip bar stay put while the body scrolls (phone)
            if name == "390":
                pg.goto(BASE + "/micros", wait_until="networkidle")
                pg.wait_for_timeout(600)
                measure = """() => {
                    const h = document.querySelector('[data-align-container="micros-page"] header');
                    const chip = [...document.querySelectorAll('[data-align-container="micros-page"] button')].find(b => b.textContent.includes('Khoáng chất'));
                    return { headerTop: h.getBoundingClientRect().top, headerBottom: h.getBoundingClientRect().bottom,
                             chipTop: chip.getBoundingClientRect().top };
                }"""
                before = pg.evaluate(measure)
                pg.evaluate("() => { document.querySelector('[data-align-container=\"micros-page\"] .overflow-y-auto').scrollTop = 700; }")
                pg.wait_for_timeout(500)
                after = pg.evaluate(measure)
                check(abs(after["headerTop"]) < 1, f"390: Micros header stays at the top ({after['headerTop']})")
                # The header folds on scroll (cc-17), so the chip bar moves up with it; the gap under the header must stay the same
                gap_before = before["chipTop"] - before["headerBottom"]
                gap_after = after["chipTop"] - after["headerBottom"]
                check(abs(gap_after - gap_before) < 1, f"390: chip bar stays under the header after it folds (gap {gap_before:.1f} → {gap_after:.1f})")
                pg.screenshot(path=os.path.join(SHOTS, "cc06-micros-stuck-390.png"), animations="disabled")
            ctx.close()
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
