"""Overnight 22→23/10, PR 2: "Lưu ngày này thành mẫu" and "Lưu bữa này" keep every food on a device that did not log them itself.

Live-mode build only, like backend_sync.py (whose fake API and signed-in devices it reuses); it skips on the demo build of probe:all.
  A  device 1 logs two foods into Bữa sáng the way a person does (+ of the meal, pick, Thêm vào Bữa sáng)
  B  device 2 (same account, nothing stored, never opens +) opens Hôm nay: the day menu's Lưu ngày này thành mẫu says 2 món and the
     PUT /day-templates/<id> carries both foods; Bữa sáng's ⋯ › Lưu bữa này saves both foods too
  C  the same on device 2 right after the load, before the catalogue has come (GET /foods held back): both saves still carry both
     foods, and the save sheet's summary counts them
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/template_foods.py
"""
# PROBE_COVERS: components/home/** lib/diary-store.tsx lib/day-templates.ts lib/saved-meals.ts components/diary/meal-menu-sheet.tsx
import json
import re
import sys
import threading

from playwright.sync_api import sync_playwright
import backend_sync as bs  # exits 0 (skipped) unless LIVE_BUILD=1

problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def log_food(pg, name):
    bs.home(pg)
    pg.locator('a[data-tour="meal-add"]:visible').first.click()
    pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
    row = pg.locator("[data-food-row]:visible", has_text=name).first
    row.wait_for(timeout=20000)
    row.click()
    pg.get_by_role("button", name=re.compile("^Thêm vào Bữa")).locator("visible=true").first.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
    pg.wait_for_timeout(1200)


def save_day(pg, api, name):
    """Hôm nay › ⋯ › Lưu ngày này thành mẫu › Lưu mẫu. Returns the sheet's summary and the PUT body."""
    before = len(api.sent("PUT", "/day-templates/"))
    pg.get_by_role("button", name="Tùy chọn ngày").locator("visible=true").first.click()
    pg.wait_for_timeout(500)
    pg.get_by_role("dialog").locator("visible=true").first.get_by_role("button", name=re.compile("Lưu ngày này thành mẫu")).click()
    pg.wait_for_timeout(700)
    sheet = pg.get_by_role("dialog", name="Lưu ngày này thành mẫu")
    summary = sheet.locator("form > div").first.inner_text()
    sheet.locator("input#save-day-name").fill(name)
    sheet.get_by_role("button", name="Lưu mẫu").click()
    pg.wait_for_timeout(1500)
    puts = api.sent("PUT", "/day-templates/")[before:]
    return summary, (puts[-1][1] if puts else None)


def save_meal(pg, meal="Bữa sáng"):
    """Taps the meal on Hôm nay, its ⋯ › Lưu bữa này › Lưu. Returns the newest saved meal stored on the device."""
    pg.locator("[data-meal-slot] button, button", has_text=re.compile(f"^{meal.split()[-1].upper()}|^{meal}", re.I)).first
    header = pg.get_by_role("button", name=re.compile(f"^{meal}|{meal.split()[-1]}", re.I)).locator("visible=true").first
    header.click()
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name=f"Tùy chọn {meal}").locator("visible=true").first.click()
    pg.wait_for_timeout(500)
    menu = pg.get_by_role("dialog").locator("visible=true").first
    save = menu.get_by_role("button", name=re.compile("Lưu bữa này"))
    enabled = save.is_enabled()
    if enabled:
        save.click()
        pg.wait_for_timeout(400)
        pg.get_by_role("dialog").locator("visible=true").first.get_by_role("button", name=re.compile("^Lưu")).last.click()
        pg.wait_for_timeout(1000)
    stored = json.loads(pg.evaluate(f"() => localStorage.getItem('h1t_saved_meals_v1_{bs.EMAIL}') || '[]'"))
    return enabled, stored


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        api = bs.FakeApi()
        names = [f["name_vi"] for f in bs.FOODS]

        # ---- A: device 1 logs both foods ----
        ctx1, pg1, errors1 = bs.device(browser, api)
        for name in names:
            log_food(pg1, name)
        check(len(api.entries) == 2, f"A: the server has device 1's two entries ({len(api.entries)})")
        ctx1.close()

        # ---- B: device 2 never opens +: the catalogue comes at idle ----
        ctx2, pg2, errors2 = bs.device(browser, api)
        bs.home(pg2)
        pg2.wait_for_timeout(2500)
        summary, body = save_day(pg2, api, "Từ máy khác")
        items = [i["foodId"] for m in (body or {}).get("meals", []) for i in m["items"]]
        check("2 món" in summary, f"B: the save sheet counts both foods ({summary!r})")
        check(sorted(items) == sorted(f["id"] for f in bs.FOODS), f"B: Lưu ngày này thành mẫu keeps both foods ({items})")
        enabled, stored = save_meal(pg2)
        meal_items = [i["foodId"] for i in (stored[0]["items"] if stored else [])]
        check(enabled and sorted(meal_items) == sorted(f["id"] for f in bs.FOODS), f"B: Lưu bữa này keeps both foods ({enabled}, {meal_items})")
        pg2.screenshot(path=str(bs.SHOTS / "template-foods-device2.png"))
        check(not errors2, f"no page errors on device 2 ({errors2[:2]})")
        ctx2.close()

        # ---- C: device 3, the catalogue held back until the saves are done ----
        release = threading.Event()
        ctx3, pg3, errors3 = bs.device(browser, api)

        def held(route):
            if "/api/v1/foods" in route.request.url and not release.is_set():
                return route.fulfill(status=503, content_type="application/json", body='{"error":{"code":"UNAVAILABLE"}}')
            return api.handle(route)

        ctx3.unroute("**/api/v1/**")
        ctx3.route("**/api/v1/**", held)
        bs.home(pg3)
        pg3.wait_for_timeout(1500)
        summary, body = save_day(pg3, api, "Chưa có danh mục")
        items = [i["foodId"] for m in (body or {}).get("meals", []) for i in m["items"]]
        check("2 món" in summary, f"C: with no catalogue yet the save sheet still counts both foods ({summary!r})")
        check(sorted(items) == sorted(f["id"] for f in bs.FOODS), f"C: with no catalogue yet Lưu ngày này thành mẫu keeps both foods ({items})")
        enabled, stored = save_meal(pg3)
        meal_items = [i["foodId"] for i in (stored[0]["items"] if stored else [])]
        check(enabled and sorted(meal_items) == sorted(f["id"] for f in bs.FOODS), f"C: with no catalogue yet Lưu bữa này keeps both foods ({enabled}, {meal_items})")
        release.set()
        check(not errors3, f"no page errors on device 3 ({errors3[:2]})")
        ctx3.close()
        browser.close()

    if problems:
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    print("\ntemplate_foods: all checks passed")


if __name__ == "__main__":
    main()
