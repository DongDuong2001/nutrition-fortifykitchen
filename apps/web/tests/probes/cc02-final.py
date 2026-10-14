"""cc-02 final checks: search clear button, empty /add state, Chà là micros, filter chips,
recents opening the panel, unit-aware amounts on Today, and the onboarding flow.
Run with: ALIGN_BASE_URL=http://localhost:3101 PATH=/usr/bin:$PATH npm run probe -- tests/probes/cc02-final.py
"""
import os
import re
import sys

from playwright.sync_api import sync_playwright, expect
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
problems = []
notes = []


def visible(loc):
    return loc.locator(":visible")


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def search_box(pg):
    return pg.locator('input[type="search"]:visible').first


def row(pg, text):
    return pg.locator("[data-food-row]:visible").filter(has_text=text).first


def panel_visible(pg):
    return pg.locator('[data-align-container="portion-panel"]:visible').count() > 0


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1 + 2 + 5 at both widths
        for name, vp in (("390", PHONE), ("1440", DESKTOP)):
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            pg.goto(BASE + "/add?meal=snack", wait_until="networkidle")
            pg.wait_for_timeout(400)

            # opens with no food selected
            if name == "390":
                check(not panel_visible(pg), "390: /add opens with no portion panel")
            else:
                check(not panel_visible(pg), "1440: /add opens with no portion panel")
                check(pg.get_by_text("Chọn một món để xem khẩu phần").is_visible(), "1440: empty pane text shows")

            # one × in the search box: our button only, native cancel hidden
            search_box(pg).fill("chuoi")
            pg.wait_for_timeout(150)
            ours = pg.locator('button[aria-label="Xóa tìm kiếm"]:visible').count()
            check(ours == 1, f"{name}: exactly one × in the search box (found {ours})")
            # the browser's cancel button is hidden by a stylesheet rule on the search input's class
            hidden_rule = pg.evaluate(
                """() => { let found = false;
                    const walk = (rules) => { for (const r of rules) {
                        if (r.selectorText && r.selectorText.includes('webkit-search-cancel-button') && r.style.appearance === 'none') found = true;
                        if (r.cssRules) walk(r.cssRules); } };
                    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
                    return found; }"""
            )
            check(hidden_rule, f"{name}: native clear button hidden by a stylesheet rule")
            search_box(pg).fill("")

            # recents: Yến mạch 60 g opens the panel at 60 g
            filter_group = pg.locator('[role=group][aria-label="Món gần đây"]:visible')
            recent = filter_group.get_by_role("button", name="Yến mạch 60 g", exact=True)
            recent.click()
            pg.wait_for_timeout(200)
            check(panel_visible(pg), f"{name}: recent Yến mạch 60 g opens the panel")
            at60 = pg.evaluate("() => [...document.querySelectorAll('input')].some(i => i.offsetParent !== null && i.value === '60')")
            check(at60, f"{name}: panel shows 60 g")
            check(search_box(pg).input_value() == "", f"{name}: recent tap leaves the search box empty")

            if name == "390":
                # the left fade shows only once the filter row is scrolled
                visible_fade = "[...document.querySelectorAll('[data-fade=left]')].find(e => e.offsetParent !== null)"
                fade_before = pg.evaluate(f"() => getComputedStyle({visible_fade}).opacity")
                pg.evaluate("""() => {
                    const chip = [...document.querySelectorAll('[data-chip-id="dam"]')].find(e => e.offsetParent !== null);
                    const row = chip.parentElement;
                    row.scrollLeft = 200;
                    row.dispatchEvent(new Event('scroll'));
                }""")
                pg.wait_for_timeout(300)
                fade_after = pg.evaluate(f"() => getComputedStyle({visible_fade}).opacity")
                check(float(fade_before) < 0.5 and float(fade_after) > 0.5,
                      f"390: left fade shows only after scrolling (before {fade_before}, after {fade_after})")

            if name == "1440":
                # every filter chip visible and inside the viewport
                chips = pg.locator('[role=group][aria-label="Lọc món theo nhóm"]:visible button')
                n = chips.count()
                check(n == 11, f"1440: 11 filter chips (Tất cả + Yêu thích + 9 categories), found {n}")
                off = []
                for i in range(n):
                    box = chips.nth(i).bounding_box()
                    if box is None or box["x"] < 0 or box["x"] + box["width"] > DESKTOP["width"]:
                        off.append(i)
                check(not off, f"1440: every filter chip inside the viewport (off: {off})")
                # cc-03 brought the Yêu thích chip back, right after Tất cả
                check(pg.locator('[role=group][aria-label="Lọc món theo nhóm"]:visible')
                      .get_by_role("button", name="Yêu thích", exact=True).count() == 1,
                      "1440: Yêu thích chip shown")

                # Chà là 30 g: iron 0,3 mg and Vitamin B6 in the micros list
                pg.locator('input[type="search"]:visible').first.fill("chà là")
                pg.wait_for_timeout(150)
                row(pg, "Chà là").click()
                pg.wait_for_timeout(250)
                body = pg.inner_text("body")
                check("0,3 mg" in body, "1440: Chà là 30 g shows 0,3 mg")
                check("Vitamin B6" in body, "1440: Chà là shows Vitamin B6")
                check("pyridoxine" not in body.lower(), "1440: no raw 'pyridoxine' label")
                pg.screenshot(path=os.path.join(SHOTS, "cc02-final-add-chala-1440.png"), animations="disabled")

            if name == "390":
                # /add open state for the record
                pg.goto(BASE + "/add?meal=snack", wait_until="networkidle")
                pg.wait_for_timeout(300)
                pg.screenshot(path=os.path.join(SHOTS, "cc02-final-add-open-390.png"), animations="disabled")

            if errors:
                problems.append(f"{name}: console errors {errors[:2]}")
            ctx.close()

        # English B-vitamin keys never reach the UI (Micros lists the Vietnamese catalogue names)
        ctx = browser.new_context(viewport=DESKTOP)
        pg = ctx.new_page()
        pg.goto(BASE + "/micros", wait_until="networkidle")
        pg.wait_for_timeout(300)
        micros_text = pg.inner_text("body")
        english = re.findall(r"pyridoxine|thiamin|riboflavin|niacin|pantothenic|cobalamin|folate", micros_text, re.I)
        check(not english, f"1440: Micros shows no English B-vitamin keys (found {english[:3]})")
        ctx.close()

        # 6. Today: no decimals on hero or meal kcal
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/diary", wait_until="networkidle")
        pg.wait_for_timeout(400)
        body = pg.inner_text("body")
        decimal_kcal = re.findall(r"\d+,\d+\s*kcal", body)
        check(not decimal_kcal, f"390: Today kcal has no decimals (found {decimal_kcal[:3]})")
        decimal_rest = re.findall(r"còn\s+\d+,\d+", body)
        check(not decimal_rest, f"390: Today 'còn' has no decimals (found {decimal_rest[:3]})")
        pg.screenshot(path=os.path.join(SHOTS, "cc02-final-today-390.png"), animations="disabled")
        ctx.close()

        # 7. onboarding flow still reaches / (Tổng quan)
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/signup", wait_until="networkidle")
        pg.get_by_label("Email").fill("ban@email.com")
        pg.get_by_role("button", name="Gửi liên kết đăng ký qua email").click()
        expect(pg).to_have_url(BASE + "/signin/check-email")
        pg.get_by_role("link", name="Mở thẳng liên kết đăng nhập (bản thử)").click()
        expect(pg).to_have_url(BASE + "/setup/profile")
        pg.get_by_role("button", name="Tiếp tục").click()
        expect(pg).to_have_url(BASE + "/setup/goal")
        pg.get_by_role("button", name="Hoàn tất").click()
        expect(pg).to_have_url(BASE + "/setup/done")
        pg.get_by_role("link", name="Để sau").click()
        expect(pg).to_have_url(BASE + "/")
        check(True, "onboarding flow reaches /")
        ctx.close()

        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
