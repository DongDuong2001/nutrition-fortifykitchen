"""cc2-16: edge cases, at 390 and 1280.

- the day changes at midnight while the app is open: the date label moves on, yesterday's entry leaves today and
  shows under yesterday
- a very long food name: two lines with the full name in the title, the detail shows it in full, no horizontal scroll
- an unknown nutrient is a dash, never 0
- offline: the diary says so and keeps working
Screenshots: .screenshots/cc2-16-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_16.py
"""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on by default; the account contexts below turn it off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
EMAIL = "edge@example.com"
LONG_NAME = "Cơm gạo lứt trộn rau củ quả và đậu hũ chiên giòn sốt tương hạt nêm tự làm rất rất rất là dài để thử"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(s):
    return re.sub(r"\s+", " ", s)


def entry(entry_id, name, added_at, kcal=500):
    return {
        "id": entry_id, "foodId": "food-edge", "foodName": name, "grams": 100, "displayQty": "100 g",
        "mealSlot": "lunch", "calories": kcal, "protein": 20, "carbs": 60, "fat": 10, "fiber": 3,
        "nutrients": {}, "addedAt": added_at,
    }


def account_context(browser, size, entries):
    """A signed-in mock account with a saved profile and the given entries (demo mode off)."""
    _demo.enable(False)
    ctx = browser.new_context(viewport=size)
    _demo.enable(True)
    profile = {"sex": "male", "birthYear": 2003, "weightKg": 65, "goal": "maintain", "periodMode": False,
               "trainingMinutesDefault": 60, "displayName": ""}
    store = {"current": EMAIL, "accounts": {EMAIL: {"hash": None, "providers": ["magic_link"]}}}
    ctx.add_init_script(
        "try {"
        f"localStorage.setItem('h1t_mock_auth_v1', {json.dumps(json.dumps(store))});"
        f"localStorage.setItem('h1t_profile_v1', {json.dumps(json.dumps(profile))});"
        f"if (localStorage.getItem('h1t_added_entries_v1_{EMAIL}') === null) localStorage.setItem('h1t_added_entries_v1_{EMAIL}', {json.dumps(json.dumps(entries))});"
        "} catch (e) {}"
    )
    return ctx


def midnight(browser):
    ctx = account_context(browser, SIZES[0][1], [entry("e1", "Cơm trưa hôm qua", "2026-10-12T05:00:00.000Z", 520)])
    pg = ctx.new_page()
    pg.clock.install(time="2026-10-12T23:59:20+07:00")
    pg.goto(BASE + "/diary", wait_until="networkidle")
    pg.wait_for_timeout(500)
    t = squash(pg.inner_text("body"))
    check("Hôm nay 12/10" in t and "Cơm trưa hôm qua" in t, f"midnight: before 00:00 the entry is today ({t[:120]!r})")
    pg.clock.run_for(60_000)
    pg.wait_for_timeout(600)
    t = squash(pg.inner_text("body"))
    check("Hôm nay 13/10" in t, "midnight: the date label moves to 13/10 without a reload")
    check("Cơm trưa hôm qua" not in t and "Chưa có món hôm nay" in t, f"midnight: yesterday's entry left today ({t[:160]!r})")
    pg.goto(BASE + "/diary?date=2026-10-12", wait_until="networkidle")
    pg.wait_for_timeout(500)
    t = squash(pg.inner_text("body"))
    check("Cơm trưa hôm qua" in t, "midnight: the entry shows under 12/10")
    saved = pg.evaluate(f"localStorage.getItem('h1t_day_archive_v1_{EMAIL}')")
    check(saved is not None and "2026-10-12" in saved, "midnight: the archive is saved")
    ctx.close()


def long_name(browser, size_name, size):
    ctx = account_context(browser, size, [])
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/new?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(500)
    pg.fill("#cf-name", LONG_NAME)
    pg.fill("#cf-size", "100")
    pg.fill("#cf-kcal", "300")
    pg.fill("#cf-pro", "10")
    pg.fill("#cf-carbs", "40")
    pg.fill("#cf-fat", "8")
    pg.get_by_role("button", name=re.compile("Lưu và thêm")).click()
    pg.wait_for_url("**/diary", timeout=8000)
    pg.wait_for_timeout(600)
    w = f"{size_name} long name"
    row = pg.locator("a[href^='/entry/']").first
    span = row.locator("span[title]").first
    check(LONG_NAME in (span.get_attribute("title") or ""), f"{w}: the diary row keeps the full name in title")
    h = row.bounding_box()["height"]
    check(h <= 100, f"{w}: the diary row stays compact ({h:.0f} px)")
    over = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    check(not over, f"{w}: no horizontal scroll in Nhật ký")
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-16-longname-diary-{size_name}.png"), full_page=True)

    row.click()
    pg.wait_for_url("**/entry/**", timeout=8000)
    pg.wait_for_timeout(500)
    t = squash(pg.inner_text("body"))
    check(LONG_NAME in t, f"{w}: the entry detail shows the full name")
    over = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    check(not over, f"{w}: no horizontal scroll in the entry detail")
    pg.screenshot(path=str(SHOTS / f"cc2-16-longname-entry-{size_name}.png"), full_page=True)
    ctx.close()


def unknown_is_dash(browser):
    ctx = browser.new_context(viewport=SIZES[0][1])
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/food-pho-bo", wait_until="networkidle")
    pg.wait_for_timeout(600)
    t = squash(pg.inner_text("body"))
    zero = re.findall(r"(?<![\d.,])0 (?:µg|mg)\b", t)
    check(not zero, f"unknown nutrient: no '0 µg' or '0 mg' on a food with gaps ({zero[:3]})")
    check("—" in t, "unknown nutrient: a dash is shown")
    ctx.close()


def offline(browser):
    ctx = browser.new_context(viewport=SIZES[0][1])
    pg = ctx.new_page()
    pg.goto(BASE + "/diary", wait_until="networkidle")
    pg.wait_for_timeout(500)
    ctx.set_offline(True)
    pg.evaluate("window.dispatchEvent(new Event('offline'))")
    pg.wait_for_timeout(300)
    t = squash(pg.inner_text("body"))
    check("Đang ngoại tuyến" in t, "offline: the diary says it is offline")
    ctx.set_offline(False)
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    pg.wait_for_timeout(300)
    check("Đang ngoại tuyến" not in squash(pg.inner_text("body")), "offline: the notice goes when the network is back")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        midnight(browser)
        for size_name, size in SIZES:
            long_name(browser, size_name, size)
        unknown_is_dash(browser)
        offline(browser)
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-16: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
