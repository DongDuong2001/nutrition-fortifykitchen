"""feat/template-builder (overnight 22→23/10, job 6): a Ngày ăn mẫu built meal by meal, without logging anything.

At 390 (demo build): Khám phá › Ngày ăn mẫu › + Tạo ngày ăn mẫu → the editor of "Ngày ăn mẫu mới" with the five meals empty
("Chưa có món", a 44 px + named "Thêm vào <bữa>"); + of Bữa sáng → the + sheet says it adds to the template, a food's Thêm puts it
in the draft (Hôm nay's diary does not change) and comes back to the editor with the meal's kcal and the total; tapping the food
changes its portion; Lưu lists the new day; Áp dụng cho hôm nay copies it into today. A second run leaves a new draft with Back:
nothing is listed. Screenshots: .screenshots/template-builder-{empty,added,list}.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/template_builder.py
"""
# PROBE_COVERS: app/(app)/explore/ngay-mau/** components/templates/** components/add/** lib/template-draft.ts lib/day-templates.ts
import json
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def diary_count(pg):
    """The foods logged today on this device (the demo diary)."""
    return pg.evaluate("""() => { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i);
      if (k && k.startsWith('h1t_added_entries')) { try { n += (JSON.parse(localStorage.getItem(k)) || []).length; } catch (e) {} } } return n; }""")


def new_context(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    return ctx


def open_new(pg):
    pg.goto(BASE + "/explore/ngay-mau", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.get_by_role("button", name=re.compile("Tạo ngày ăn mẫu")).click()
    pg.wait_for_url(re.compile(r"/explore/ngay-mau/[0-9a-f-]{36}"), timeout=8000)
    pg.wait_for_timeout(600)


def run(browser):
    ctx = new_context(browser)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    logged = diary_count(pg)
    open_new(pg)
    check(pg.locator("#tpl-name").input_value() == "Ngày ăn mẫu mới", "the draft is named Ngày ăn mẫu mới")
    check(pg.get_by_text("Chưa có món").count() == 5, f"all five meals are empty ({pg.get_by_text('Chưa có món').count()})")
    plus = pg.get_by_role("link", name="Thêm vào Bữa sáng")
    box = plus.bounding_box()
    check(box is not None and box["width"] >= 44 and box["height"] >= 44, f"each meal has a 44 px + ({box})")
    pg.screenshot(path=str(SHOTS / "template-builder-empty.png"))

    plus.click()
    pg.wait_for_url(re.compile(r"/add\?.*mau="), timeout=8000)
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(500)
    head = pg.locator("#dlg-title, [data-add-panel] [aria-haspopup=listbox]").first.inner_text()
    check("Ngày ăn mẫu mới" in head and "Bữa sáng" in head, f"the + sheet says which template and meal it adds to ({head!r})")
    check(pg.get_by_text("Vào ngày ăn mẫu, không ghi vào nhật ký").count() >= 1, "…and that it does not log anything")
    check(pg.get_by_role("link", name="Tạo món mới").count() == 0, "no Tạo món mới in template mode (it would log to the diary)")
    check(pg.get_by_text("Chỉ ghi kcal").count() == 0, "no Chỉ ghi kcal in template mode")
    pg.locator("[data-add-panel] input").first.fill("gà")
    pg.wait_for_timeout(800)
    pg.locator("[data-add-panel] button[data-food-row]:visible").first.click()
    pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible")
    check(pg.get_by_role("link", name="Xem chi tiết →").count() == 0 and pg.locator("[role=dialog]").get_by_role("button", name="So sánh").count() == 0, "the portion has no Xem chi tiết or So sánh in template mode")
    pg.locator('[data-testid="portion-add"]:visible').first.click()
    pg.wait_for_url(re.compile(r"/explore/ngay-mau/"), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.get_by_text("Chưa có món").count() == 4, "back in the editor (not on an empty + page): Bữa sáng has the food")
    # The Khay: two foods into Bữa trưa in one go
    pg.get_by_role("link", name="Thêm vào Bữa trưa").click()
    pg.wait_for_url(re.compile(r"/add\?.*mau="), timeout=8000)
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(500)
    toggles = pg.locator("[data-add-panel] [data-tray-toggle]:visible")
    toggles.nth(0).click()
    toggles.nth(1).click()
    pg.wait_for_timeout(300)
    pg.locator('[data-testid="tray-add"]').click()
    pg.wait_for_timeout(600)
    review_add = pg.locator("[role=dialog] button:has-text('Thêm')").last
    if review_add.count():
        review_add.click()
    pg.wait_for_url(re.compile(r"/explore/ngay-mau/"), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.locator("section[aria-label='Bữa trưa'] button[aria-haspopup=dialog]").count() == 2, "the Khay added two foods to Bữa trưa")
    # review 12:40: the toast names the meal only and fits the screen (it ran past 390 px with the template's name in it)
    toast = pg.locator("[role=status]", has_text="Đã thêm").first
    fit = toast.evaluate("(e) => { const r = e.getBoundingClientRect(); return { text: e.innerText.trim(), right: r.right, vw: innerWidth, over: [...e.querySelectorAll('*')].some((c) => c.scrollWidth > c.clientWidth + 1) } }") if toast.count() else None
    check(fit is not None and fit["text"].startswith("Đã thêm 2 món vào Bữa trưa") and fit["right"] <= fit["vw"] and not fit["over"], f"the toast says Đã thêm 2 món vào Bữa trưa and fits ({fit})")
    check(diary_count(pg) == logged, f"still nothing in the diary ({diary_count(pg)} = {logged})")
    check(diary_count(pg) == logged, f"nothing went into the diary ({diary_count(pg)} = {logged})")
    total_before = pg.locator("#tpl-total ~ * .font-display").first.inner_text()
    pg.screenshot(path=str(SHOTS / "template-builder-added.png"))

    # Change the portion
    pg.locator("section[aria-label='Bữa sáng'] button[aria-haspopup=dialog]").first.click()
    pg.locator("#tpl-item-title").wait_for(state="visible")
    field = pg.locator("[role=dialog] input[inputmode=decimal]:visible, [role=dialog] input[type=number]:visible").first
    if field.count():
        field.fill("300")
    else:
        # An egg (the first "gà" result) has a size and a count, no grams field: a bigger size is a new portion
        pg.locator("[role=dialog]:visible").last.get_by_role("button", name=re.compile(r"^Lớn")).first.click()
    pg.get_by_role("button", name="Lưu khẩu phần").click()
    pg.wait_for_timeout(600)
    total_after = pg.locator("#tpl-total ~ * .font-display").first.inner_text()
    check(total_after != total_before, f"a new portion changes the total live ({total_before} → {total_after})")

    # Lưu lists it, Áp dụng copies it
    pg.get_by_role("button", name="Lưu").first.click()
    pg.wait_for_url(re.compile(r"/explore/ngay-mau$"), timeout=8000)
    pg.wait_for_timeout(600)
    check(pg.get_by_role("link", name=re.compile("^Ngày ăn mẫu mới")).count() == 1, "Lưu lists the new day")
    pg.screenshot(path=str(SHOTS / "template-builder-list.png"))
    pg.get_by_role("link", name=re.compile("^Ngày ăn mẫu mới")).click()
    pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Áp dụng cho hôm nay").click()
    pg.wait_for_url(re.compile(r"/app"), timeout=8000)
    pg.wait_for_timeout(800)
    check(diary_count(pg) > logged, "Áp dụng cho hôm nay copies the built day into today")
    ctx.close()

    # Leaving without Lưu keeps nothing
    ctx = new_context(browser)
    pg = ctx.new_page()
    open_new(pg)
    pg.go_back()
    pg.wait_for_timeout(800)
    check(pg.get_by_role("link", name=re.compile("^Ngày ăn mẫu mới")).count() == 0, "Back from a new draft lists nothing")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
