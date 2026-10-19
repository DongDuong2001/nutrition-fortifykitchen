"""cc-08: profile and targets from the profile. Weight 65 -> 70 moves Today's kcal target and not the micros (cc-67: they are
the VN 2016 amounts for sex and age), a woman's iron is 17,4 mg and there is no period switch, reload keeps it, an invalid
weight shows the setup error.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc08.py
"""
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
WEIGHT_ERROR = "Nhập cân nặng từ 30 đến 300 kg"
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def body(pg):
    return pg.inner_text("body")


def visible(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def set_weight(pg, value):
    pg.goto(BASE + "/settings/profile/weight", wait_until="networkidle")
    pg.wait_for_selector("#weight-input", state="visible")
    pg.wait_for_timeout(300)
    pg.locator("#weight-input").fill(value)
    pg.get_by_role("button", name="Lưu").click()


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()

    # 1. profile page: rows as in the design, targets from the sample user
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "cc08-profile-390.png"), animations="disabled")
    # The targets live on /settings/targets (IA v2), read-only, from the profile
    pg.goto(BASE + "/settings/targets", wait_until="networkidle")
    pg.wait_for_timeout(300)
    check("1.950–2.275 kcal" in body(pg), "390 targets: sample targets show 1.950–2.275 kcal")
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    active_sex = pg.locator('[aria-labelledby="profile-sex-label"] button[aria-pressed="true"] >> visible=true').first
    check(active_sex.inner_text().strip() == "Nam", "390 profile: sex chip shows Nam")
    check(pg.get_by_role("switch", name="Gần/đang trong kỳ").count() == 0, "390 profile: no period switch")

    # 2. weight page: opens from the row, shows the saved weight with one decimal
    visible(pg, 'a[href="/settings/profile/weight"]').click()
    pg.wait_for_url("**/settings/profile/weight")
    pg.wait_for_selector("#weight-input", state="visible")
    pg.wait_for_timeout(300)
    check(pg.locator("#weight-input").input_value() == "65", "390 weight: input shows 65")
    pg.screenshot(path=os.path.join(SHOTS, "cc08-weight-390.png"), animations="disabled")

    # 3. invalid weight shows the setup error, nothing saved
    set_weight(pg, "29")
    pg.wait_for_timeout(300)
    check(WEIGHT_ERROR in body(pg), "390 weight: invalid weight shows the setup error text")
    check("/settings/profile/weight" in pg.url, "390 weight: stays on the weight page after an invalid value")

    # 4. 65 -> 70 kg: Today kcal and Micros potassium follow
    pg.locator("#weight-input").fill("70")
    pg.get_by_role("button", name="Lưu").click()
    pg.wait_for_url("**/settings/profile")
    pg.wait_for_timeout(400)
    check("70 kg" in body(pg), "390 profile: weight row shows 70 kg after save")
    pg.goto(BASE + "/settings/targets", wait_until="networkidle")
    pg.wait_for_timeout(300)
    check("2.100–2.450 kcal" in body(pg), "390 targets: kcal target moves to 2.100–2.450")

    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("2.100–2.450" in body(pg), "390 today: kcal target reads 2.100–2.450")

    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("/ 2.500 mg" in body(pg), "390 micros: potassium target stays 2.500 mg at 70 kg (VN 2016, nam 20–29)")

    # 5. woman in the period: iron target 28 mg on Micros
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    pg.locator('[aria-labelledby="profile-sex-label"] button:has-text("Nữ") >> visible=true').first.click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("switch", name="Gần/đang trong kỳ").count() == 0, "390 profile: no period switch for Nữ either")
    pg.screenshot(path=os.path.join(SHOTS, "cc08-profile-female-390.png"), animations="disabled")

    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("/ 17,4 mg" in body(pg), "390 micros: iron target reads 17,4 mg for a woman of 23")

    # 6. reload keeps everything
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("/ 17,4 mg" in body(pg), "390 micros: iron 17,4 mg kept after reload")
    check("/ 2.000 mg" in body(pg), "390 micros: a woman's potassium 2.000 mg kept after reload")
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    pg.wait_for_timeout(300)
    check("70 kg" in body(pg), "390 profile: 70 kg kept after reload")
    female = pg.locator('[aria-labelledby="profile-sex-label"] button:has-text("Nữ") >> visible=true').first
    check(female.get_attribute("aria-pressed") == "true", "390 profile: Nữ kept after reload")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "cc08-profile-1440.png"), animations="disabled")
    check("mục tiêu mỗi ngày" in body(pg).lower(), "1440 profile: targets card visible")
    ctx.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_phone(browser)
        run_desktop(browser)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
