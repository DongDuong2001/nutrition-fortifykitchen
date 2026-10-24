"""Job C (feat/my-foods-crud, overnight 23→24/10): Món ăn của tôi: Sửa món and Xóa món, at 390 and 1440 (demo build).

create → ⋯ → Sửa món (the form is filled in, a change is saved and shows in the list) → ⋯ → Xóa món (no confirm: the toast says
Đã xóa <món> with Hoàn tác, the row goes, Hoàn tác brings it back) → Xóa món on the food page (goes back, the row stays gone) →
a food held by a Bữa ăn đã lưu asks first ("Món này đang có trong n bữa đã lưu hoặc ngày ăn mẫu") and still has the toast.
Screenshots: .screenshots/own-foods/*.png (390×844 and 1440×900).
Run with: ALIGN_BASE_URL=http://localhost:3106 npm run probe -- tests/probes/own_foods_crud.py
"""
# PROBE_COVERS: app/(app)/explore/** app/(app)/foods/** components/foods/** components/diary-toast.tsx lib/own-foods.ts lib/own-food-actions.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3106")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "own-foods"
SHOTS.mkdir(parents=True, exist_ok=True)
NOW = "2026-10-12T18:00:00+07:00"  # dinner by the clock
NAME = "Bánh IT probe"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def toast(pg):
    t = pg.locator("[role=status]").filter(has_text=re.compile("Đã xóa"))
    return re.sub(r"\s+", " ", t.first.inner_text()) if t.count() else ""


def rows(pg):
    return pg.locator("[data-food-row]").filter(has_text=NAME).count()


def open_own_list(pg, size):
    """Client-side: a custom food of the demo lives in memory only, so no reload."""
    pg.locator("a[data-tour=nav-explore]:visible").first.click()
    pg.wait_for_url(re.compile(r".*/explore$"), timeout=8000)
    pg.wait_for_timeout(500)
    link = pg.locator("a[href='/explore/cua_toi']:visible").first
    link.scroll_into_view_if_needed()
    link.click()
    pg.wait_for_url(re.compile(r".*/explore/cua_toi$"), timeout=8000)
    pg.wait_for_timeout(500)


def run(browser, tag, size):
    ctx = browser.new_context(viewport=size, device_scale_factor=1)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/foods/new?mode=nutrition", wait_until="networkidle")
    pg.wait_for_timeout(1500)

    # 1. create
    pg.fill("#cf-name", NAME)
    pg.fill("#cf-size", "100")
    pg.fill("#cf-kcal", "250")
    pg.fill("#cf-pro", "5")
    pg.get_by_role("button", name=re.compile("Lưu và thêm vào")).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=8000)
    pg.wait_for_timeout(800)

    # 2. save the dinner as a Bữa ăn đã lưu, so this food is held by one (the confirm of Xóa món)
    pg.locator("button[aria-label='Xem riêng bữa tối']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.locator("button[aria-label='Tùy chọn Bữa tối']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name=re.compile("Lưu bữa này")).click()
    pg.wait_for_timeout(300)
    pg.locator("#save-meal-name").fill("Tối IT probe")
    pg.get_by_role("button", name="Lưu", exact=True).click()
    pg.wait_for_timeout(600)

    open_own_list(pg, size)
    check(rows(pg) == 1, f"{tag}: the food is in Món ăn của tôi")
    menu = pg.get_by_role("button", name=f"Tùy chọn cho {NAME}")
    box = menu.bounding_box()
    check(menu.count() == 1 and box and box["width"] >= 44 and box["height"] >= 44, f"{tag}: the row's ⋯ is a 44 px button ({box and (round(box['width']), round(box['height']))})")
    pg.screenshot(path=str(SHOTS / f"{tag}-1-list.png"))

    # 3. Sửa món
    menu.click()
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / f"{tag}-2-menu.png"))
    check(pg.get_by_role("link", name="Sửa món").count() == 1 and pg.get_by_role("button", name="Xóa món").count() == 1, f"{tag}: the ⋯ menu has Sửa món and Xóa món")
    pg.get_by_role("link", name="Sửa món").click()
    pg.wait_for_url(re.compile(r".*/foods/new\?edit="), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.locator("#cf-name").input_value() == NAME and pg.locator("#cf-size").input_value() == "100", f"{tag}: Sửa món is filled in: name and portion")
    check(pg.locator("#cf-kcal").input_value() == "250" and pg.locator("#cf-pro").input_value() == "5", f"{tag}: …and the values ({pg.locator('#cf-kcal').input_value()}, {pg.locator('#cf-pro').input_value()})")
    check(pg.get_by_text("Tính từ nguyên liệu").count() == 0, f"{tag}: no choice of how to create it")
    pg.screenshot(path=str(SHOTS / f"{tag}-3-edit.png"))
    pg.fill("#cf-kcal", "300")
    pg.get_by_role("button", name="Lưu thay đổi").click()
    pg.wait_for_url(re.compile(r".*/explore/cua_toi$"), timeout=8000)
    pg.wait_for_timeout(600)
    row = pg.locator("[data-food-row]").filter(has_text=NAME).first
    check("300" in row.inner_text(), f"{tag}: the list shows the new kcal ({re.sub(r'\\s+', ' ', row.inner_text())!r})")
    check(rows(pg) == 1, f"{tag}: still one row (same food, not a copy)")
    # A value the person did not touch is still what it was after a save (review 24/10: Sửa món used to round and drift)
    pg.get_by_role("button", name=f"Tùy chọn cho {NAME}").click()
    pg.wait_for_timeout(500)
    pg.get_by_role("link", name="Sửa món").click()
    pg.wait_for_url(re.compile(r".*/foods/new\?edit="), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.locator("#cf-kcal").input_value() == "300" and pg.locator("#cf-pro").input_value() == "5", f"{tag}: edited again, the saved 300 and the untouched 5 are as they were ({pg.locator('#cf-kcal').input_value()}, {pg.locator('#cf-pro').input_value()})")
    pg.get_by_role("button", name="Lưu thay đổi").click()
    pg.wait_for_url(re.compile(r".*/explore/cua_toi$"), timeout=8000)
    pg.wait_for_timeout(600)

    # 4. Xóa món on a food a Bữa ăn đã lưu holds: asks first
    pg.get_by_role("button", name=f"Tùy chọn cho {NAME}").click()
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Xóa món").click()
    pg.wait_for_timeout(600)
    dialog = pg.locator("[role=dialog]").filter(visible=True).first
    dtext = re.sub(r"\s+", " ", dialog.inner_text())
    check("Món này đang có trong 1 bữa đã lưu hoặc ngày ăn mẫu. Các lần đã ghi trong nhật ký vẫn giữ nguyên." in dtext, f"{tag}: a saved meal holds it, so it asks ({dtext[:120]!r})")
    pg.screenshot(path=str(SHOTS / f"{tag}-4-confirm.png"))
    pg.get_by_role("button", name="Hủy").click()
    pg.wait_for_timeout(500)
    check(rows(pg) == 1, f"{tag}: Hủy leaves the food")
    pg.get_by_role("button", name=f"Tùy chọn cho {NAME}").click()
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Xóa món").click()
    pg.wait_for_timeout(600)
    dialog = pg.locator("[role=dialog]").filter(visible=True).first
    dialog.get_by_role("button", name="Xóa món").click()
    pg.wait_for_timeout(700)
    check(rows(pg) == 0, f"{tag}: the row is gone")
    check(toast(pg) == f"Đã xóa {NAME} Hoàn tác", f"{tag}: the toast says Đã xóa <món> with Hoàn tác ({toast(pg)!r})")
    pg.screenshot(path=str(SHOTS / f"{tag}-5-deleted.png"))
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(600)
    check(rows(pg) == 1, f"{tag}: Hoàn tác puts the food back in the list")

    # 5. Xóa món on the food page: no confirm for a food nothing holds? (this one is held: confirm again), then back and gone
    pg.locator("[data-food-row]").filter(has_text=NAME).first.click()
    pg.wait_for_url(re.compile(r".*/foods/"), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.get_by_role("link", name="Sửa món").count() == 1 and pg.get_by_role("button", name="Xóa món").count() == 1, f"{tag}: the food page has Sửa món and Xóa món")
    pg.screenshot(path=str(SHOTS / f"{tag}-6-food-page.png"), full_page=True)
    pg.get_by_role("button", name="Xóa món").click()
    pg.wait_for_timeout(600)
    pg.locator("[role=dialog]").filter(visible=True).first.get_by_role("button", name="Xóa món").click()
    pg.wait_for_url(re.compile(r".*/explore/cua_toi$"), timeout=8000)
    pg.wait_for_timeout(800)
    check(rows(pg) == 0 and "Không tìm thấy" not in pg.inner_text("body"), f"{tag}: the food page deleted it and went back; no 'not found' screen")
    pg.wait_for_timeout(9000)
    check(toast(pg) == "" and rows(pg) == 0, f"{tag}: after 8 s the toast is gone and the food stays deleted")

    ctx.close()


def run_free(browser, tag, size):
    """A food nothing holds goes at once, with no question: the toast, and Hoàn tác."""
    ctx = browser.new_context(viewport=size, device_scale_factor=1)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/foods/new?mode=nutrition", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.fill("#cf-name", NAME)
    pg.fill("#cf-size", "100")
    pg.fill("#cf-kcal", "250")
    pg.get_by_role("button", name=re.compile("Lưu và thêm vào")).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=8000)
    pg.wait_for_timeout(800)
    open_own_list(pg, size)
    pg.get_by_role("button", name=f"Tùy chọn cho {NAME}").click()
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Xóa món").click()
    pg.wait_for_timeout(700)
    check(pg.locator("[role=dialog]").filter(visible=True).count() == 0, f"{tag} free: nothing holds it, so no question")
    check(rows(pg) == 0 and toast(pg) == f"Đã xóa {NAME} Hoàn tác", f"{tag} free: gone at once, with the toast ({toast(pg)!r})")
    pg.screenshot(path=str(SHOTS / f"{tag}-7-free-delete.png"))
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(600)
    check(rows(pg) == 1, f"{tag} free: Hoàn tác brings it back")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        for tag, size in (("390", {"width": 390, "height": 844}), ("1440", {"width": 1440, "height": 900})):
            run(browser, tag, size)
            run_free(browser, tag, size)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
