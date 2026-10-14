"""cc2-15: first run, sign-up to a logged first meal. Cleared storage, clock fixed at 18:00 Asia/Ho_Chi_Minh (Bữa tối).

- /signup -> /setup/profile -> /setup/goal -> /setup/done -> add sheet -> first meal on the diary
- tap count: setup (target <= 8 taps plus typing) and the first meal after setup (target <= 3 taps)
- step indicator (phone "Bước 1 / 2" and "Bước 2 / 2", desktop card "Bước 1/2"), one primary button per step
- inputs: birth year inputMode numeric + autocomplete bday-year, weight inputMode decimal
- inline validation on blur, Enter moves from the birth year to the weight, back keeps the typed values
- summary numbers match the coach's rules for the sample profile (HANDOFF.md: 30-35 kcal/kg, 1,6-2,2 g/kg protein)
- the summary has no bottom nav, one h1, no horizontal scroll, targets >= 44 px
Screenshots: .screenshots/cc2-15-{profile,goal,summary,first-meal}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_15.py
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-13T18:00:00+07:00"
WEIGHT = 70
# Expected from the coach's rules, not from the code: Giữ cân 30-35 kcal/kg, protein 1,6-2,2 g/kg
SUMMARY_ROWS = ["Năng lượng 2.100–2.450 kcal", "Đạm 112–154 g"]  # the list rows of /setup/done (cc2-15b)
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def path_of(pg):
    return urlparse(pg.url).path or "/"


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-15-{name}-{size_name}.png"), full_page=False, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def small_targets(pg, where):
    bad = pg.evaluate(
        """() => [...document.querySelectorAll('a[href], button')]
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
            .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))"""
    )
    check(not bad, f"{where}: every link and button is at least 44 px ({bad})")


def visible_h1(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('h1')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && !e.classList.contains('sr-only')).length"
    )


def visible_submit(pg):
    return pg.locator("form button[type=submit]:visible").count()


def checked_goal(pg):
    return pg.locator("[role=radio][aria-checked=true]:visible").first.inner_text().split("\n")[0].strip()


def first_run(browser, name, size):
    phone = size["width"] < 1024
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    taps = {"signup": 0, "setup": 0, "first_meal": 0}
    where = f"{name}"

    # 1. sign up (the magic link is outside the app: the setup opens from it)
    pg.goto(BASE + "/signup", wait_until="networkidle")
    pg.get_by_label("Email").fill("an@example.com")
    pg.get_by_role("button", name="Gửi liên kết đăng ký qua email").click()
    taps["signup"] += 1
    pg.wait_for_url("**/signin/check-email")
    pg.goto(BASE + "/setup/profile", wait_until="networkidle")
    pg.wait_for_timeout(500)

    # 2. profile step
    t = text(pg)
    check("Bước 1 / 2" in t, f"{where} profile: step indicator")
    check(visible_submit(pg) == 1, f"{where} profile: one primary button ({visible_submit(pg)})")
    check(visible_h1(pg) == 1, f"{where} profile: one h1")
    year = pg.locator("#setup-birth-year")
    weight = pg.locator("#setup-weight")
    check(year.get_attribute("inputmode") == "numeric" and year.get_attribute("autocomplete") == "bday-year",
          f"{where} profile: birth year inputMode numeric, autocomplete bday-year")
    check(weight.get_attribute("inputmode") == "decimal", f"{where} profile: weight inputMode decimal")
    check(year.input_value() == "2003" and weight.input_value() == "65", f"{where} profile: defaults 2003 and 65")
    check(pg.get_by_role("radio", name=re.compile("^Giữ cân")).first.get_attribute("aria-checked") == "true"
          if not phone else True, f"{where} profile: default goal Giữ cân")
    shot(pg, "profile", name)
    no_h_scroll(pg, f"{where} profile")
    small_targets(pg, f"{where} profile")

    # inline validation on blur, no submit needed
    year.fill("1899")
    year.press("Tab")
    check("1900" in text(pg), f"{where} validation: birth year error shows on blur")
    year.fill("2003")
    check("Nhập năm sinh" not in text(pg), f"{where} validation: error clears when the year is valid")
    weight.fill("20")
    weight.press("Tab")
    check("30 đến 300" in text(pg), f"{where} validation: weight error shows on blur")
    check(path_of(pg) == "/setup/profile", f"{where} validation: stays on the step")

    # Enter in the birth year moves to the weight
    year.focus()
    year.press("Enter")
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "setup-weight",
          f"{where} Enter: birth year moves focus to the weight")
    weight.fill(str(WEIGHT))

    # 3. to the goal step, and back keeps the values
    if phone:
        pg.get_by_role("button", name="Tiếp tục").click()
        taps["setup"] += 1
        pg.wait_for_url("**/setup/goal")
        t = text(pg)
        check("Bước 2 / 2" in t, f"{where} goal: step indicator")
        check(visible_submit(pg) == 1, f"{where} goal: one primary button ({visible_submit(pg)})")
        check(visible_h1(pg) == 1, f"{where} goal: one h1")
        check(checked_goal(pg) == "Giữ cân", f"{where} goal: default Giữ cân ({checked_goal(pg)})")
        shot(pg, "goal", name)
        no_h_scroll(pg, f"{where} goal")
        small_targets(pg, f"{where} goal")
        pg.get_by_role("radio", name=re.compile("^Tăng cơ")).click()
        pg.get_by_role("link", name="Quay lại").first.click()
        pg.wait_for_url("**/setup/profile")
        pg.wait_for_timeout(300)
        check(pg.locator("#setup-weight").input_value() == str(WEIGHT) and pg.locator("#setup-birth-year").input_value() == "2003",
              f"{where} back: the typed year and weight are kept")
        pg.get_by_role("button", name="Tiếp tục").click()
        pg.wait_for_url("**/setup/goal")
        pg.wait_for_timeout(300)
        check(checked_goal(pg) == "Tăng cơ", f"{where} back: the chosen goal is kept ({checked_goal(pg)})")
        pg.get_by_role("radio", name=re.compile("^Giữ cân")).click()
        check("2.100–2.450 kcal" in text(pg), f"{where} goal: the targets card follows the weight")
    else:
        shot(pg, "goal", name)
        pg.get_by_role("radio", name=re.compile("^Tăng cơ")).click()
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(300)
        check(pg.locator("#setup-weight").input_value() == str(WEIGHT), f"{where} reload: the typed weight is kept")
        check(checked_goal(pg) == "Tăng cơ", f"{where} reload: the chosen goal is kept ({checked_goal(pg)})")
        pg.get_by_role("radio", name=re.compile("^Giữ cân")).click()
        check("2.100–2.450 kcal" in text(pg), f"{where} goal: the targets card follows the weight")

    # 4. finish: Hoàn tất saves and shows the summary
    pg.get_by_role("button", name="Hoàn tất").locator("visible=true").first.click()
    taps["setup"] += 1
    pg.wait_for_url("**/setup/done")
    pg.wait_for_timeout(500)
    t = text(pg)
    for row in SUMMARY_ROWS:
        check(row in t, f"{where} summary: {row!r} (page: {t[:200]!r})")
    cta = pg.get_by_role("link", name="Bắt đầu ghi bữa đầu tiên")
    check(cta.count() == 1 and cta.get_attribute("href") == "/add?meal=dinner",
          f"{where} summary: one button to the add sheet for the meal of the clock (Bữa tối)")
    check(visible_h1(pg) == 1, f"{where} summary: one h1")
    check(pg.locator("nav[aria-label='Điều hướng chính']:visible").count() == 0, f"{where} summary: no navigation bar")
    shot(pg, "summary", name)
    no_h_scroll(pg, f"{where} summary")
    small_targets(pg, f"{where} summary")
    check(taps["setup"] <= 8, f"{where} setup taps: {taps['setup']} (target <= 8, plus typing)")

    # 5. first meal: summary button, a food, add
    cta.click()
    taps["first_meal"] += 1
    pg.wait_for_url("**/add?meal=dinner")
    pg.wait_for_timeout(500)
    pg.locator("[data-food-row]:visible").first.click()
    taps["first_meal"] += 1
    pg.wait_for_timeout(300)
    add = pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối"))
    check(add.count() >= 1, f"{where} first meal: the portion panel offers Thêm vào Bữa tối")
    shot(pg, "first-meal", name)
    add.locator("visible=true").first.click()
    taps["first_meal"] += 1
    pg.wait_for_url("**/diary")
    check(taps["first_meal"] <= 3, f"{where} first meal taps after setup: {taps['first_meal']} (target <= 3)")
    # state after the first meal: the summary is done, the user reads as a returning one
    pg.goto(BASE + "/setup/done", wait_until="networkidle")
    pg.wait_for_timeout(400)
    check(pg.get_by_role("link", name="Xem tổng quan").count() == 1,
          f"{where} after a meal: the summary offers Xem tổng quan, not a first meal")
    ctx.close()
    print(f"TAPS {name}: sign-up {taps['signup']}, setup {taps['setup']}, first meal after setup {taps['first_meal']}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, size in SIZES:
                first_run(browser, name, size)
        except Exception as error:  # a step could not run: report it with what was checked so far
            problems.append(f"probe stopped: {type(error).__name__}: {str(error).splitlines()[0]}")
        finally:
            browser.close()
    print("\n".join(notes))
    if problems:
        print("\nFAIL:")
        print("\n".join(problems))
        print(f"\n{len(notes)} ok, {len(problems)} FAIL")
        sys.exit(1)
    print(f"\n{len(notes)} ok, 0 FAIL")


if __name__ == "__main__":
    main()
