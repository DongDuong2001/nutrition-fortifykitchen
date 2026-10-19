"""cc2-15b: a new account starts empty, the sample data lives behind demo mode.

Production build, cleared storage, clock fixed at 18:00 Asia/Ho_Chi_Minh (Bữa tối). No _demo helper: this probe drives the switch itself.
- empty account: Hôm nay, Tổng quan (3 tabs), Khám phá, the add sheet show no sample data, each empty state shows its one line
- setup -> /setup/done: the list rows match the coach's rules (HANDOFF.md) for 70 kg, Giữ cân, 60 min of training
- first meal logged -> Hôm nay shows it, Tổng quan is in the under-3-days state, no longer the empty one
- ?demo=1 brings the sample day, history and Gần đây back (and stays on), ?demo=0 removes them again
Screenshots: .screenshots/cc2-15b-{diary,overview,explore,summary}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_15b.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/micros/** app/(app)/add/** app/(app)/setup/profile/** app/signin/**
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (cc-42: tour done, tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-13T18:00:00+07:00"
WEIGHT = 70
# cc2-15c: without a saved profile every tab route goes to /setup/profile, so the empty-state checks start with one
PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":""}'
# Expected from the coach's rules, not from the code: 70 kg, Giữ cân 30-35 kcal/kg, protein 1,6-2,2 g/kg, fat 0,5-1 g/kg,
# carbs = (energy min - protein mid x 4 - fat mid x 9) / 4 = (2.100 - 133 x 4 - 52,5 x 9) / 4, salt 4-6 g + 1-1,5 g per 20 min x 3
SUMMARY_ROWS = [
    ("Năng lượng", "2.100–2.450 kcal"),
    ("Đạm", "112–154 g"),
    ("Chất béo", "35–70 g"),
    ("Tinh bột", "274 g"),
    ("Muối", "7–10,5 g"),
]
# The foods of the sample day (lib/mock/sample-day.ts). The probe logs another food, so these never come from the real entry.
SAMPLE_FOODS = ["Yến mạch", "Yogurt kefir", "Chuối", "Cơm gạo lứt", "Thịt bò nạc", "Chà là", "Bột củ dền"]
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)


def sign_in_magic(pg, email):
    # cc-19 exception (approved by reviewer 13/10 20:58): outside demo mode the mock store has no account until someone signs
    # in. The magic-link request signs the email in (lib/auth-actions.ts requestMagicLink), so this is the sign-in the probe needs.
    go(pg, "/signin")
    pg.locator('input[type="email"]').fill(email)
    pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").click()
    pg.wait_for_url("**/signin/check-email")


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-15b-{name}-{size_name}.png"), full_page=False, animations="disabled")


def clean(pg, where):
    t = text(pg)
    bad = [w for w in ("NaN", "undefined", "Infinity") if re.search(rf"\b{w}\b", t)]
    check(not bad, f"{where}: no {bad or 'NaN / undefined'} in the text")
    check(not any(f in t for f in SAMPLE_FOODS), f"{where}: no sample food on the page")


def setup(pg, phone):
    go(pg, "/setup/profile")
    pg.locator("#setup-weight").fill(str(WEIGHT))
    pg.locator("#setup-display-name").fill("Học viên A")
    if phone:
        pg.get_by_role("button", name="Tiếp tục").click()
        pg.wait_for_url("**/setup/goal")
    pg.get_by_role("radio", name=re.compile("^Giữ cân")).click()
    pg.get_by_role("button", name="Hoàn tất").locator("visible=true").first.click()
    pg.wait_for_url("**/setup/done")
    pg.wait_for_timeout(500)


def run(browser, name, size):
    phone = size["width"] < 1024
    ctx = browser.new_context(viewport=size)
    # cc-68 (X8): an old unscoped profile is deleted, not adopted: the account's own key holds the profile
    ctx.add_init_script(f"try {{ if (localStorage.getItem('h1t_profile_v1_ban@email.com') === null) localStorage.setItem('h1t_profile_v1_ban@email.com', JSON.stringify({PROFILE})); }} catch (e) {{}}")
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.clock.set_fixed_time(NOW)
    where = name
    sign_in_magic(pg, "ban@email.com")  # the empty account below is signed in (cc-19 exception)

    # Empty account, before setup
    go(pg, "/app")
    t = text(pg)
    check("Chưa có món nào hôm nay" in t, f"{where} home: 'Chưa có món nào hôm nay'")
    check(pg.get_by_role("button", name="Chép hôm qua").count() == 0, f"{where} diary: no Chép hôm qua without a yesterday")
    plus = pg.locator('a[aria-label^="Thêm vào"]:visible')
    check(plus.count() == 4, f"{where} home: one Thêm vào link per meal ({plus.count()})")
    clean(pg, f"{where} diary")
    shot(pg, "diary", name)

    for route in ("/trends", "/trends/micros"):  # cc2-31b: Tóm tắt is /trends
        go(pg, route)
        t = text(pg)
        check("Chưa có ngày nào được ghi" in t, f"{where} {route}: 'Chưa có ngày nào được ghi'")
        link = pg.get_by_role("link", name="Thêm bữa đầu tiên")
        check(link.count() == 1 and link.get_attribute("href") == "/add?meal=dinner",
              f"{where} {route}: one link Thêm bữa đầu tiên to the add sheet for Bữa tối")
        check("Chưa đủ dữ liệu" not in t, f"{where} {route}: not the under-3-days state")
        clean(pg, f"{where} {route}")
        if route == "/trends":
            shot(pg, "overview", name)
    go(pg, "/trends/body")
    t = text(pg)
    check("Dữ liệu mẫu" not in t and "Chưa có số cân" in t, f"{where} /trends/body: no sample weights, 'Chưa có số cân'")

    go(pg, "/explore")
    t = text(pg)
    for line in ("Món bạn vừa ghi sẽ hiện ở đây.", "Chưa có món yêu thích", "Chưa có Bữa ăn của tôi", "Chưa có món nào"):
        check(line in t, f"{where} explore: {line!r}")
    clean(pg, f"{where} explore")
    shot(pg, "explore", name)

    go(pg, "/add?meal=dinner")
    t = text(pg)
    check("Gần đây" not in t, f"{where} add: no Gần đây section without recents")
    search = pg.get_by_label("Tìm món").locator("visible=true").first
    quick = pg.get_by_text("Chỉ thêm kcal").locator("visible=true").first
    check(search.bounding_box()["y"] < quick.bounding_box()["y"], f"{where} add: search comes first")

    # Setup -> summary
    setup(pg, phone)
    t = text(pg)
    # cc-42: /setup/done is the "Thiết lập xong" board: the energy target in one sentence, the three tour steps, the buttons.
    # The other rows (đạm, chất béo, tinh bột, muối) are in Cài đặt › Mục tiêu mỗi ngày (cc_16 checks them).
    energy = dict(SUMMARY_ROWS)["Năng lượng"]
    check(f"Mục tiêu của bạn: {energy} mỗi ngày" in t, f"{where} summary: the energy target {energy}")
    check("thiết lập xong" in t.lower() and "thêm món và chọn khẩu phần" in t.lower() and "biết chất nào còn thiếu" in t.lower(), f"{where} summary: the board and its three steps")
    cta = pg.get_by_role("button", name="Thêm bữa đầu tiên")
    check(cta.count() == 1, f"{where} summary: one primary button Thêm bữa đầu tiên")
    check(pg.get_by_role("link", name="Để sau").count() == 1, f"{where} summary: Để sau stays")
    check("Xem lại hướng dẫn trong Cài đặt › Ứng dụng" in t, f"{where} summary: where to replay the tour")
    over = pg.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")
    check(over <= 1, f"{where} summary: fits the screen without scrolling ({over}px over)")
    shot(pg, "summary", name)

    # First meal
    cta.click()  # the tour is off in probes (_seed.py), so this opens the add sheet for the meal of the clock
    pg.wait_for_url("**/add?meal=dinner")
    pg.wait_for_timeout(500)
    rows = pg.locator("[data-food-row]:visible")
    row, food = None, ""
    for i in range(rows.count()):
        name_i = rows.nth(i).inner_text().split("\n")[0].strip()
        if name_i and name_i not in SAMPLE_FOODS:
            row, food = rows.nth(i), name_i
            break
    check(row is not None, f"{where} add: a food that is not in the sample day")
    row.click()
    pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối")).locator("visible=true").first.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
    pg.wait_for_timeout(500)
    t = text(pg)
    check(food in t, f"{where} diary: the first meal ({food}) is listed")
    check("Chưa có món nào hôm nay" not in t, f"{where} home: the empty line is gone")
    go(pg, "/trends")
    t = text(pg)
    check("Chưa đủ dữ liệu" in t and "Chưa có ngày nào được ghi" not in t,
          f"{where} overview: the under-3-days state with one logged day")
    clean(pg, f"{where} overview after a meal")

    # Demo mode
    go(pg, "/app?demo=1")
    t = text(pg)
    check("Yến mạch" in t and "Chưa có món nào hôm nay" not in t, f"{where} ?demo=1: the sample day is back")
    go(pg, "/explore")
    t = text(pg)
    check("Yogurt kefir" in t and food not in t, f"{where} ?demo=1: its own Gần đây (sample foods), not the real recent ({food})")
    go(pg, "/trends/body")
    check("Dữ liệu mẫu" in text(pg), f"{where} ?demo=1: sample weights are back")
    check(pg.evaluate("localStorage.getItem('h1t_demo_v1')") == "1", f"{where} ?demo=1: the flag is saved")
    go(pg, "/app?demo=0")
    t = text(pg)
    check(not any(f in t for f in SAMPLE_FOODS), f"{where} ?demo=0: no sample food")
    check(pg.evaluate("localStorage.getItem('h1t_demo_v1')") is None, f"{where} ?demo=0: the flag is cleared")
    go(pg, "/explore")
    check("Yến mạch" not in text(pg) and food in text(pg), f"{where} ?demo=0: Gần đây is the real one again, no sample foods")
    go(pg, "/app")
    check(food in text(pg), f"{where} ?demo=0: the real meal ({food}) is still in Hôm nay")
    real = [e for e in errors if "status of 404" not in e]
    check(not real, f"{where}: no console or page errors ({real[:2]})")
    ctx.close()

    # A fresh account in demo mode: Gần đây is seeded with the sample foods
    fresh = browser.new_context(viewport=size)
    fp = fresh.new_page()
    fp.clock.set_fixed_time(NOW)
    go(fp, "/explore?demo=1")
    check("Yogurt kefir" in text(fp), f"{where} fresh ?demo=1: Gần đây is seeded with the sample foods")
    go(fp, "/explore?demo=0")
    check("Yogurt kefir" not in text(fp), f"{where} fresh ?demo=0: Gần đây is empty again")
    fresh.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, size in SIZES:
                run(browser, name, size)
        except Exception as error:
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
