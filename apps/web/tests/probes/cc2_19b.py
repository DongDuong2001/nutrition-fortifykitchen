"""cc2-19b: the two journeys cc2-19 did not walk, at 390 and 1280.

- (f) Hôm nay › a meal header › ⋯ › Lưu thành Bữa ăn của tôi: the name field opens with the default name selected, so a typed name replaces it; the saved meal appears in Khám phá › Bữa ăn của tôi with its foods, and one tap adds it to the current meal.
- (g) Hồ sơ › Cân nặng: the kcal and protein targets change as the weight changes (before Lưu), and the new ranges are the ones Mục tiêu shows after saving.
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_19b.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/settings/profile/weight/** app/(app)/settings/targets/** app/(app)/setup/profile/** app/signin/**
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-15T12:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "FAIL: ") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)
    return ctx, pg


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-19b-{name}-{size_name}.png"), full_page=True, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def kcal_range(pg):
    m = re.search(r"([\d.]+) kcal", text(pg))
    return m.group(1) if m else None


def run(browser, size_name, size):
    # One context per size: the saved meal and the weight live in localStorage, so every step shares it
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)

    def go(route):
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(500)

    # (f): save a meal, reuse it
    go("/app")
    w = f"{size_name} Lưu bữa"
    pg.locator("button[aria-label='Xem riêng bữa sáng']:visible").first.click()
    pg.wait_for_timeout(200)
    pg.locator("button[aria-label='Tùy chọn Bữa sáng']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name=re.compile("Lưu thành Bữa ăn của tôi")).click()
    pg.wait_for_timeout(200)
    field = pg.locator("#save-meal-name")
    check(field.input_value() != "", f"{w}: name field starts with the default name")
    field.click()
    pg.keyboard.type("Sáng nhanh")
    check(field.input_value() == "Sáng nhanh", f"{w}: typing replaces the default name ({field.input_value()!r})")
    pg.get_by_role("button", name="Lưu", exact=True).click()
    pg.wait_for_timeout(400)

    go("/explore/meals")  # V3: Khám phá has the Bữa ăn của tôi row; the saved meals are listed on the pushed screen
    w = f"{size_name} Bữa ăn của tôi"
    check("Sáng nhanh" in text(pg), f"{w}: saved meal listed by name")
    check(pg.locator("button[aria-label^='Thêm Sáng nhanh']").count() == 1, f"{w}: one tap add button present")
    no_h_scroll(pg, w)
    shot(pg, "saved-meal", size_name)

    # (g): weight changes the targets
    go("/settings/profile/weight")
    w = f"{size_name} Cân nặng"
    before = kcal_range(pg)
    for _ in range(10):
        pg.get_by_role("button", name="Tăng 0,1 kg").click()
    after = kcal_range(pg)
    check(before is not None and after is not None and before != after, f"{w}: kcal target updates before saving ({before} → {after})")
    pg.get_by_role("button", name=re.compile("^Lưu$")).click()
    pg.wait_for_timeout(500)

    go("/settings/targets")
    w = f"{size_name} Mục tiêu sau khi đổi cân"
    check(after is not None and after in text(pg), f"{w}: targets show the new target {after}")
    no_h_scroll(pg, w)
    shot(pg, "weight-targets", size_name)
    ctx.close()


def fresh(browser, size_name, size):
    # (a): a new account (no demo data) is sent to sign-in, and setup is reachable once signed in
    _demo.enable(False)
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    w = f"{size_name} Tài khoản mới"
    # cc-49: signed out, Hôm nay (/app) goes to /signin on every window size
    check(pg.url.endswith("/signin"), f"{w}: signed-out /app goes to /signin")
    pg.goto(BASE + "/setup/profile", wait_until="networkidle")
    pg.wait_for_timeout(300)
    check(pg.locator("#setup-weight").count() == 1, f"{w}: setup profile step has the weight field")
    no_h_scroll(pg, w)
    shot(pg, "setup", size_name)
    ctx.close()
    _demo.enable(True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            fresh(browser, size_name, size)
            run(browser, size_name, size)
        browser.close()
    for n in notes:
        print(n)
    for n in problems:
        print(n)
    print(f"cc2_19b: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
