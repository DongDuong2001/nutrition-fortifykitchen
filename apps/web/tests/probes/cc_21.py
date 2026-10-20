"""cc-21 (audit-ag16 fixes): profile, reminders and training ticks stay with their account, the form error is announced, grams read in Vietnamese.

Production build, clock fixed at 18:00 Asia/Ho_Chi_Minh (Bữa tối), sizes 390 and 1280.
- A signs in, sets the birth year to 1995 (Cài đặt > Hồ sơ) and breakfast to 06:45 (Thông báo), ticks a training item
  for today, and signs out (Tài khoản > Đăng xuất). Each value is stored under A's own key; the old global keys stay empty.
- B signs in on the same browser: no profile, so the tab routes go to /setup/profile; B has no keys of A's.
- A signs in again: 1995, 06:45 and the tick are back.
- A birth year of 1800 on /settings/profile is announced: the input's aria-describedby is the id of the role=alert error,
  and it is removed once the year is valid.
- Grams typed on /foods/food-cha-la reach the diary as "2,5 g" and "1.000 g" (not "2.5 g" or "1000 g").
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_21.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/foods/[id]/** app/(app)/settings/account/** app/(app)/settings/notifications/** app/(app)/settings/profile/** app/(app)/setup/profile/** app/signin/**
import hashlib
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (cc-42: tour done, tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-13T18:00:00+07:00"
TODAY = "2026-10-13"
PASSWORD = "Abcdef12"
A, B = "a@example.com", "b@example.com"
GLOBAL_KEYS = ["h1t_profile_v1", "h1t_settings_v1", "h1t_training_checklist_v1"]
PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":""}'
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)


def stored(pg, key):
    return pg.evaluate("(k) => localStorage.getItem(k)", key)


def new_page(browser, size):
    digest = hashlib.sha256(PASSWORD.encode()).hexdigest()
    accounts = {e: {"hash": digest, "providers": ["password"]} for e in (A, B)}
    store = json.dumps({"current": None, "accounts": accounts})
    ctx = browser.new_context(viewport=size)
    ctx.add_init_script(
        f"try {{ if (localStorage.getItem('h1t_mock_auth_v1') === null) localStorage.setItem('h1t_mock_auth_v1', {json.dumps(store)}); }} catch (e) {{}}"
    )
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def sign_in(pg, email):
    go(pg, "/signin")
    pg.locator('input[type="email"]').fill(email)
    pg.locator('input[type="password"]').first.fill(PASSWORD)
    pg.locator('button[type="submit"]').first.click()
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(600)


def sign_out_ui(pg):
    go(pg, "/settings/account")
    pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
    pg.wait_for_url("**/signin")
    pg.wait_for_timeout(300)


def sign_out_mock(pg):
    # Same write as mockSignOut (lib/auth-mock.ts). B has no profile yet, so Cài đặt is behind setup and cannot be reached.
    pg.evaluate(
        "() => { const s = JSON.parse(localStorage.getItem('h1t_mock_auth_v1')); s.current = null; localStorage.setItem('h1t_mock_auth_v1', JSON.stringify(s)); }"
    )
    go(pg, "/signin")


def birth_year_error(pg):
    year = pg.locator("#profile-birth-year")
    year.fill("1800")
    year.press("Enter")
    pg.wait_for_timeout(400)
    alert = pg.locator('[role="alert"]').locator("visible=true").first
    alert_text = alert.inner_text() if alert.count() else ""
    alert_id = alert.get_attribute("id") if alert.count() else None
    described = pg.locator("#profile-birth-year").get_attribute("aria-describedby") if pg.locator("#profile-birth-year").count() else None
    return alert_text, alert_id, described


def run(browser, name, size):
    ctx, pg = new_page(browser, size)

    # A: sign in, set the data through the screens. A's first profile is a setup step (the setup flow is not under
    # test here), written under A's own key so the screens below have a profile to edit.
    sign_in(pg, A)
    pg.evaluate("([k, v]) => localStorage.setItem(k, v)", [f"h1t_profile_v1_{A}", PROFILE])
    go(pg, "/settings/profile")
    pg.get_by_text("Năm sinh", exact=True).locator("visible=true").first.click()
    pg.wait_for_timeout(300)
    alert_text, alert_id, described = birth_year_error(pg)
    check(alert_text != "" and described == alert_id and alert_id is not None,
          f"{name} form: a birth year of 1800 is announced (role=alert '{alert_text[:40]}', aria-describedby={described}, id={alert_id})")
    year = pg.locator("#profile-birth-year")
    year.fill("1995")
    check(year.get_attribute("aria-describedby") is None, f"{name} form: the description is removed once the year is valid")
    year.press("Enter")
    pg.wait_for_timeout(400)

    go(pg, "/settings/notifications")
    breakfast = pg.locator('input[type="time"]').locator("visible=true").first
    breakfast.fill("06:45")
    pg.wait_for_timeout(300)

    go(pg, "/training")
    # cc-52: a new account is asked Bự or Bé first (closed here); Bột củ dền has no catalogue food outside demo, so
    # its tick is a plain tick (the others open the portion sheet)
    if pg.get_by_role("dialog", name="Bạn thuộc nhóm nào?").count():
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(400)
    box = pg.locator("input[aria-label='Bột củ dền (Dalahouse)']").locator("visible=true").first
    box.check()
    pg.wait_for_timeout(300)
    ticked_a = pg.locator('input[type="checkbox"]:checked').count()
    check(ticked_a >= 1, f"{name} accounts: A ticks a training item ({ticked_a} ticked)")

    a_profile = stored(pg, f"h1t_profile_v1_{A}") or ""
    a_settings = stored(pg, f"h1t_settings_v1_{A}") or ""
    a_ticks = stored(pg, f"h1t_training_checklist_v1_{A}") or ""
    check('"birthYear":1995' in a_profile, f"{name} accounts: A's profile is under A's key")
    check("06:45" in a_settings, f"{name} accounts: A's reminder time is under A's key")
    check(TODAY in a_ticks, f"{name} accounts: A's ticks are under A's key")
    leaked = [k for k in GLOBAL_KEYS if stored(pg, k) is not None]
    check(leaked == [], f"{name} accounts: no global copy of the profile, settings or ticks ({leaked})")
    sign_out_ui(pg)

    # B: same browser, no profile of its own
    sign_in(pg, B)
    go(pg, "/settings/notifications")
    check("/setup/profile" in pg.url, f"{name} accounts: B has no profile, so a tab route goes to /setup/profile ({pg.url[len(BASE):]})")
    check(stored(pg, f"h1t_profile_v1_{B}") is None, f"{name} accounts: B has no profile of its own yet")
    check(stored(pg, f"h1t_profile_v1_{A}") == a_profile, f"{name} accounts: A's profile is untouched by B")
    check(stored(pg, f"h1t_settings_v1_{A}") == a_settings, f"{name} accounts: A's reminders are untouched by B")
    check(stored(pg, f"h1t_training_checklist_v1_{A}") == a_ticks, f"{name} accounts: A's ticks are untouched by B")
    sign_out_mock(pg)

    # A again: the data is back
    sign_in(pg, A)
    go(pg, "/settings/profile")
    check("1995" in text(pg), f"{name} accounts: A signs back in and the birth year 1995 is there")
    go(pg, "/settings/notifications")
    check(pg.locator('input[type="time"]').locator("visible=true").first.input_value() == "06:45",
          f"{name} accounts: A's breakfast time 06:45 is there")
    go(pg, "/training")
    check(pg.locator('input[type="checkbox"]:checked').count() == ticked_a, f"{name} accounts: A's tick is there")

    # Grams: the diary keeps the label in Vietnamese format
    for grams, label in [("2.5", "2,5 g"), ("1000", "1.000 g")]:
        go(pg, "/foods/food-cha-la")
        # cc-53: the food page's portion area; grams are typed on its Gam tab
        gam = pg.get_by_role("button", name="Gam", exact=True).locator("visible=true")
        if gam.count() and gam.first.get_attribute("aria-pressed") != "true":
            gam.first.click()
        pg.get_by_label("Số gam", exact=True).locator("visible=true").first.fill(grams)
        pg.wait_for_timeout(200)
        pg.get_by_role("button", name=re.compile("^Thêm vào Bữa")).locator("visible=true").first.click()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(500)
        t = text(pg)
        check(label in t and f"{grams} g" not in t, f"{name} grams: {grams} typed is saved as '{label}' in the diary")

    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, size in SIZES:
                run(browser, name, size)
        except Exception as error:
            problems.append(f"probe stopped: {type(error).__name__}: {' | '.join(str(error).splitlines()[:3])}")
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
