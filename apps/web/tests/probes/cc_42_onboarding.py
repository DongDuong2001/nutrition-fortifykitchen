"""cc-42: the first-meal tour, the first-visit tips, the add tray, the create-food modes and "Tùy chỉnh thành món của tôi".

Production demo build, 390x844 (and 1440x900 for the tips and the desktop tour). Every other probe starts with the tour and
tips off (_seed.py); this one turns them on with `_seed.onboarding(True)`.

- Tour at 390: Thêm bữa đầu tiên, 5 steps with a real add of phở, Hoàn tất sets tourDone; Bỏ qua hướng dẫn ends it for good;
  leaving the flow ends it silently (tourDone stays false); Để sau starts no tour
- Tour at 1440: the add modal is the target of steps 3 and 4
- Tips: one per screen at 390 and 1440, none on the second visit, none after "Tắt mọi mẹo", none for a used feature
- Tray: three foods ticked, one bar, Xem lại, one add, one undo for all three
- Tạo món: Tính từ nguyên liệu by default, Tự nhập with the amber notice, multi-select ingredient picker, request button (demo)
- Tùy chỉnh thành món của tôi: on a recipe dish only, pre-fills name and ingredients
- Keyboard: Esc closes a tip (Đã hiểu) and skips the tour; Tab stays in the card
- Cài đặt: Xem lại hướng dẫn with the Mới pill, the tips switch
- Share tip (home-share): at 3 foods today, not at 2, not on a past day, not after a share; round 44 px hole centred on the
  share button, arrow under it; Thử ngay opens the share sheet, Đã hiểu closes; a successful save marks share-day used
- Hôm nay: the meal pill's + Thêm is a text link (no background, border or radius; sky, Manrope 12 px, 13 px from lg, 700;
  hit area 44x44 that leaves the 24/36 px pill alone; 12 px from the kcal; focus ring, hover white, pressed opacity;
  hidden on a past day) (cc-44)
Screenshots: .screenshots/cc-42-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_42_onboarding.py
"""
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed

_seed.onboarding(True)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def ctx_page(browser, size):
    ctx = browser.new_context(viewport=size)
    return ctx, ctx.new_page()


def go(pg, route, wait=300):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def card(pg):
    return pg.locator("[data-onboarding-card]")


def wait_card(pg, timeout=4000):
    try:
        card(pg).first.wait_for(state="visible", timeout=timeout)
        return True
    except Exception:
        return False


def hint_check(pg, tag):
    """Steps 2 to 4: the hint is plain cobalt text with an arrow, no pill, no hover state, not focusable."""
    hint = card(pg).locator("span:has(svg)").last
    check(hint.count() == 1 and hint.locator("svg").count() == 1, f"{tag}: the hint has an arrow icon")
    bg = hint.evaluate("el => getComputedStyle(el).backgroundColor")
    check(bg in ("rgba(0, 0, 0, 0)", "transparent"), f"{tag}: the hint has no pill background ({bg})")
    focusable = card(pg).locator('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])').count()
    check(focusable == 1, f"{tag}: only Bỏ qua hướng dẫn is focusable in the card ({focusable})")
    check(hint.evaluate("el => el.getAttribute('tabindex') === null && el.tagName === 'SPAN'"), f"{tag}: the hint is a plain span")


def hole_check(pg, tag):
    """Step 3: the hole is round like the card and covers the search field and the first result, not the whole list."""
    hole = pg.locator("[data-onboarding-overlay] > div.border-sky").first
    radius = hole.evaluate("el => getComputedStyle(el).borderTopLeftRadius")
    check(radius == "18px", f"{tag}: the hole radius is the card's 18 px ({radius})")
    box = hole.bounding_box()
    field = pg.locator('[data-tour="food-search"]:visible').first.bounding_box()
    first = pg.locator('[data-tour="add-results-first"]:visible').first.bounding_box()
    check(box and field and first and box["y"] <= field["y"] and box["y"] + box["height"] >= first["y"] + first["height"], f"{tag}: the hole holds the search field and the first result")
    rows = pg.locator("button[data-food-row]:visible").count()
    last = pg.locator("button[data-food-row]:visible").last.bounding_box()
    check(rows < 2 or (last and box["y"] + box["height"] < last["y"] + last["height"]), f"{tag}: the hole stops at the first result, not the whole list ({rows} rows)")


def flags(pg):
    raw = pg.evaluate("() => localStorage.getItem('h1t_settings_v1_demo')")
    try:
        return (json.loads(raw) or {}).get("onboarding", {}) if raw else {}
    except Exception:
        return {}


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-42-{name}.png"))


def targets_ok(pg, selector, label):
    """Every button and link inside `selector` is at least 44 px high (the + circle's 36 px disc sits in a 44 px button)."""
    small = pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel + ' button, ' + sel + ' a, ' + sel + ' input')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
          .filter(e => { const l = e.closest('label'); const h = Math.max(e.getBoundingClientRect().height, l ? l.getBoundingClientRect().height : 0); return h < 43.5; })
          .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))""",
        selector,
    )
    check(not small, f"{label}: every target is 44 px or more ({small})")


def overlap_free(pg, label):
    """The card never overlaps the highlighted hole, and the arrow side matches."""
    box = pg.evaluate(
        """() => { const c = document.querySelector('[data-onboarding-card]'); if (!c) return null;
          const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, side: c.dataset.placement,
            vw: innerWidth, vh: innerHeight }; }"""
    )
    if not box:
        check(False, f"{label}: card is on screen")
        return
    check(box["left"] >= 0 and box["right"] <= box["vw"] and box["top"] >= 0 and box["bottom"] <= box["vh"] + 1, f"{label}: card is inside the screen ({box})")


# ---------------------------------------------------------------- tour
def tour_phone(browser):
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/setup/done")
    check(pg.get_by_text("Thiết lập xong").count() >= 1, "setup done: Thiết lập xong")
    check(pg.get_by_text("Xem lại hướng dẫn trong Cài đặt › Ứng dụng").count() == 1, "setup done: replay hint")
    check(len(pg.locator("ol li").all()) == 3, "setup done: three steps")
    shot(pg, "main-390")
    pg.get_by_role("button", name="Thêm bữa đầu tiên").click()
    check(wait_card(pg), "tour step 1 shows")
    check("Bước 1/5" in card(pg).inner_text(), "step 1: Bước 1/5")
    check(pg.url == BASE + "/app", f"step 1 is on Hôm nay ({pg.url})")
    check(card(pg).get_by_role("button", name="Tiếp").count() == 1, "step 1: Tiếp")
    check(card(pg).get_by_role("button", name="Bỏ qua hướng dẫn").count() == 1, "step 1: Bỏ qua hướng dẫn")
    check(card(pg).get_attribute("aria-modal") == "true" and card(pg).get_attribute("role") == "dialog", "step 1: role dialog, aria-modal")
    check(pg.evaluate("() => document.activeElement && document.activeElement.hasAttribute('data-onboarding-card')"), "step 1: focus is on the card")
    overlap_free(pg, "step 1")
    targets_ok(pg, "[data-onboarding-card]", "step 1 card")
    check(pg.locator("h1:visible").count() == 1, "Hôm nay with the tour has one h1")
    shot(pg, "tour-1-390")
    # The scrim blocks taps outside the hole: a tap on the nav Cài đặt does nothing
    pg.mouse.click(350, 810)
    pg.wait_for_timeout(300)
    check(pg.url == BASE + "/app", "step 1: the scrim blocks a tap on the bar below")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(500)
    check("Bước 2/5" in card(pg).inner_text(), "step 2: Bước 2/5 after Tiếp")
    hint_check(pg, "step 2")
    check(card(pg).get_by_role("button", name="Tiếp").count() == 0, "step 2: no Tiếp, it waits for the real tap")
    shot(pg, "tour-2-390")
    # The hole lets the tap through to the real + button
    pg.locator("#mobile-add-fab").click()
    pg.wait_for_url("**/add*")
    pg.wait_for_timeout(700)
    check("Bước 3/5" in card(pg).inner_text(), "step 3: the add sheet opened by the real tap")
    check(pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first.input_value() == "phở", "step 3: the search starts with phở")
    hole_check(pg, "step 3")
    hint_check(pg, "step 3")
    shot(pg, "tour-3-390")
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(600)
    check("Bước 4/5" in card(pg).inner_text(), "step 4: a food was picked, the portion panel is the target")
    check("Chạm Thêm vào" in card(pg).inner_text(), f"step 4: the hint names the real button ({card(pg).inner_text()[-60:]!r})")
    hint_check(pg, "step 4")
    shot(pg, "tour-4-390")
    pg.locator('[data-tour="portion-add"]:visible').click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(900)
    check("Bước 5/5" in card(pg).inner_text(), "step 5: back on Hôm nay with the food")
    text = card(pg).inner_text()
    check(all(w in text for w in ("Thiếu", "Trung bình", "Gần đủ", "Đạt", "dưới 50%", "50–79%", "80–99%", "từ 100% trở lên")), "step 5: the colour legend")
    check(card(pg).get_by_role("button", name="Hoàn tất").count() == 1, "step 5: Hoàn tất")
    check(card(pg).get_by_role("button", name="Bỏ qua hướng dẫn").count() == 1, "step 5: Bỏ qua hướng dẫn")
    overlap_free(pg, "step 5")
    shot(pg, "tour-5-390")
    check("Phở bò" in pg.inner_text("body"), "the phở really was added to Hôm nay")
    card(pg).get_by_role("button", name="Hoàn tất").click()
    pg.wait_for_timeout(400)
    check(card(pg).count() == 0, "Hoàn tất closes the tour")
    check(flags(pg).get("tourDone") is True, f"Hoàn tất: tourDone is saved ({flags(pg)})")
    ctx.close()

    # Bỏ qua hướng dẫn: for good
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/setup/done")
    pg.get_by_role("button", name="Thêm bữa đầu tiên").click()
    wait_card(pg)
    card(pg).get_by_role("button", name="Bỏ qua hướng dẫn").click()
    pg.wait_for_timeout(300)
    check(card(pg).count() == 0 and flags(pg).get("tourDone") is True, "Bỏ qua hướng dẫn ends the tour for good")
    ctx.close()

    # Leaving the flow ends it silently
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/setup/done")
    pg.get_by_role("button", name="Thêm bữa đầu tiên").click()
    wait_card(pg)
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check(not flags(pg).get("tourDone"), "leaving mid-tour: tourDone stays false")
    check(not any("Bước " in t for t in [pg.inner_text("body")]), "leaving mid-tour: no tour card on the other screen")
    go(pg, "/app")
    check("Bước 1/5" not in pg.inner_text("body"), "leaving mid-tour: the tour does not come back")
    ctx.close()

    # Để sau: no tour
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/setup/done")
    pg.get_by_role("link", name="Để sau").click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(700)
    check("Bước 1/5" not in pg.inner_text("body"), "Để sau: no tour")
    ctx.close()


def tour_desktop(browser):
    ctx, pg = ctx_page(browser, DESKTOP)
    go(pg, "/setup/done")
    pg.get_by_role("button", name="Thêm bữa đầu tiên").click()
    check(wait_card(pg), "1440 tour step 1 shows")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(400)
    check("Bước 2/5" in card(pg).inner_text(), "1440 step 2")
    shot(pg, "tour-2-1440")
    pg.locator("#desktop-add-btn").click()
    pg.wait_for_url("**/add*")
    pg.wait_for_timeout(800)
    check("Bước 3/5" in card(pg).inner_text(), "1440 step 3: the add modal")
    hole_check(pg, "1440 step 3")
    shot(pg, "tour-3-1440")
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(600)
    check("Bước 4/5" in card(pg).inner_text(), "1440 step 4: the modal's portion panel")
    shot(pg, "tour-4-1440")
    ctx.close()


# ---------------------------------------------------------------- tips
TIP_SCREENS = [
    ("home-logged", "/app", "Sửa nhanh"),
    ("past-day", f"/app?date={YESTERDAY}", "Ngày đã qua"),
    ("add-tray", "/add?meal=lunch", "Chọn nhiều món cùng lúc"),
    ("food-detail", "/foods/food-cha-la", "Lưu món hay ăn"),
    ("compare", "/foods/compare?ids=food-cha-la,food-yen-mach", "Đọc bảng so sánh"),
    ("food-new", "/foods/new", "Món tự tính từ nguyên liệu có sẵn"),
    ("training", "/training", "Chọn thời lượng tập"),
    ("micros", "/micros", "Xem theo nhóm"),
    ("trends-micros", "/trends/micros", "Trung bình cả kỳ"),
    ("explore", "/explore", "Bù chất bạn còn thiếu"),
    ("overview", "/trends", "Theo dõi chỉ số cả tuần qua"),
    ("leaderboard", "/explore/leaderboard", "Bạn đang ẩn danh"),
]


def tips(browser, size, tag):
    for tip_id, route, title in TIP_SCREENS:
        ctx, pg = ctx_page(browser, size)
        go(pg, route, wait=200)
        shown = wait_card(pg, 5000)
        check(shown, f"{tag} tip {tip_id}: shows on the first visit to {route.split('?')[0]}")
        if shown:
            body = card(pg).inner_text()
            check(title in body and "Mẹo · lần đầu" in body, f"{tag} tip {tip_id}: copy ({title})")
            check(card(pg).get_by_role("button", name="Đã hiểu").count() == 1 and card(pg).get_by_role("button", name="Tắt mọi mẹo").count() == 1, f"{tag} tip {tip_id}: Đã hiểu and Tắt mọi mẹo")
            check(card(pg).get_attribute("aria-modal") == "true", f"{tag} tip {tip_id}: aria-modal")
            check(pg.locator("[data-onboarding-card]").count() == 1, f"{tag} tip {tip_id}: one card only")
            overlap_free(pg, f"{tag} tip {tip_id}")
            shot(pg, f"tip-{tip_id}-{tag}")
            card(pg).get_by_role("button", name="Đã hiểu").click()
            pg.wait_for_timeout(300)
            check(card(pg).count() == 0, f"{tag} tip {tip_id}: Đã hiểu closes it")
            check(tip_id in flags(pg).get("seen", []), f"{tag} tip {tip_id}: saved as seen")
            go(pg, route, wait=200)
            pg.wait_for_timeout(1200)
            check(card(pg).count() == 0 or tip_id == "home-logged", f"{tag} tip {tip_id}: not again on the second visit")
        ctx.close()


def tips_rules(browser):
    # Second Hôm nay visit: the next tip (one per visit), the first is not repeated
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/app", wait=200)
    wait_card(pg)
    first = card(pg).inner_text()
    card(pg).get_by_role("button", name="Đã hiểu").click()
    pg.wait_for_timeout(600)
    check(card(pg).count() == 0, "one tip per visit: nothing else after Đã hiểu")
    go(pg, "/app", wait=200)
    wait_card(pg)
    second = card(pg).inner_text() if card(pg).count() else ""
    check("Thêm vào bữa bất kỳ lúc nào" in second and "Sửa nhanh" not in second, f"next visit: the next tip, not the same ({second[:60]!r})")
    shot(pg, "tip-meal-add-390")
    card(pg).get_by_role("button", name="Tắt mọi mẹo").click()
    pg.wait_for_timeout(300)
    check(flags(pg).get("tipsOff") is True, "Tắt mọi mẹo saves tipsOff")
    go(pg, "/training", wait=200)
    pg.wait_for_timeout(1200)
    check(card(pg).count() == 0, "tips off: no tip on another screen")
    # Cài đặt turns them back on and forgets what was seen
    go(pg, "/settings")
    sw = pg.get_by_role("switch", name="Mẹo trên từng màn hình")
    check(sw.get_attribute("aria-checked") == "false", "Cài đặt: the tips switch is off")
    sw.click()
    pg.wait_for_timeout(300)
    check(flags(pg).get("tipsOff") is False and flags(pg).get("seen") == [], f"switch on: tips on and seen forgotten ({flags(pg)})")
    ctx.close()

    # A used feature: no tip. Tray add counts as used.
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/add?meal=lunch", wait=200)
    wait_card(pg)
    card(pg).get_by_role("button", name="Đã hiểu").click()
    pg.locator("[data-tray-toggle]:visible").first.click()
    check("tray-add" in flags(pg).get("used", []), "using the + circle records tray-add")
    ctx.close()
    ctx, pg = ctx_page(browser, PHONE)
    pg.add_init_script("localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({onboarding: {used: ['tray-add', 'training-minutes']}}))")
    go(pg, "/add?meal=lunch", wait=200)
    pg.wait_for_timeout(1200)
    check(card(pg).count() == 0, "a feature already used: no tip")
    go(pg, "/training", wait=200)
    pg.wait_for_timeout(1200)
    check(card(pg).count() == 0, "training minutes already used: no tip")
    ctx.close()

    # Selecting several foods on Hôm nay: the multi-select tip when the mode opens
    ctx, pg = ctx_page(browser, PHONE)
    pg.add_init_script("localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({onboarding: {seen: ['home-logged', 'meal-add', 'home-share']}}))")
    go(pg, "/app", wait=300)
    pg.get_by_role("button", name="Thêm tùy chọn").first.click() if pg.get_by_role("button", name="Thêm tùy chọn").count() else None
    opened = False
    for name in ("Chọn nhiều món", "Chọn nhiều"):
        loc = pg.get_by_text(name, exact=False).first
        if loc.count():
            try:
                loc.click(timeout=1500)
                opened = True
                break
            except Exception:
                pass
    if opened:
        ok = wait_card(pg, 4000)
        check(ok and "Chọn nhiều món" in card(pg).inner_text(), "multi-select tip shows when select mode opens")
        if ok:
            shot(pg, "tip-multi-select-390")
    else:
        print("[NOTE] could not open select mode from the UI; multi-select tip is covered by tips.test.ts")
    ctx.close()


# ---------------------------------------------------------------- tray
def tray(browser):
    _seed.onboarding(False)
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    toggles = pg.locator("[data-tray-toggle]:visible")
    check(toggles.count() >= 3, f"tray: each row has a + circle ({toggles.count()})")
    check(toggles.first.get_attribute("role") == "checkbox" and toggles.first.get_attribute("aria-checked") == "false", "tray: role checkbox, not checked")
    names = []
    for i in range(3):
        t = pg.locator("[data-tray-toggle]:visible").nth(i)
        names.append((t.get_attribute("aria-label") or "").split(": ", 1)[-1])
        t.click()
        pg.wait_for_timeout(150)
    check(pg.locator("[data-tray-bar]:visible").count() == 1, "tray: one bar")
    bar = pg.locator("[data-tray-bar]:visible").inner_text()
    label = pg.locator("[data-tray-bar]:visible").get_attribute("aria-label") or ""
    check(label.startswith("3 món · ") and label.endswith(" kcal") and "món · " in bar and "Xem lại" in bar and "Thêm vào Bữa trưa" in bar, f"tray: bar shows count, kcal, Xem lại, Thêm vào ({label!r}, {bar!r})")
    check(pg.locator('[data-tray-toggle]:visible[aria-checked="true"]').count() == 3, "tray: three circles are checked")
    # The tray survives a query and a filter
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("xyz không có")
    pg.wait_for_timeout(200)
    check(pg.locator("[data-tray-bar]:visible").count() == 1, "tray: survives a query")
    field.fill("")
    targets_ok(pg, "[data-tray-bar]", "tray bar")
    shot(pg, "tray-390")
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(300)
    sheet = pg.locator("[data-tray-review]")
    check(sheet.is_visible(), "review: the sheet opens")
    check(sheet.get_by_role("button", name="Bỏ khỏi khay").count() == 3, "review: a × on each item (Bỏ khỏi khay)")
    check(sheet.get_by_text("Tổng bữa ăn").count() == 1 and "đạm" in sheet.inner_text() and "tinh bột" in sheet.inner_text() and "chất béo" in sheet.inner_text(), "review: totals")
    check(pg.get_by_role("button", name="Thêm 3 món vào Bữa trưa").count() == 1 and pg.get_by_role("button", name="Chọn thêm món").count() == 1, "review: Thêm 3 món vào Bữa trưa and Chọn thêm món")
    check(pg.get_by_role("button", name="Thêm vào Bữa trưa, đổi bữa").count() == 1, "review: the meal chip")
    targets_ok(pg, "[data-tray-review]", "tray review")
    shot(pg, "tray-review-390")
    sheet.get_by_role("button", name="Bỏ khỏi khay").first.click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("button", name="Thêm 2 món vào Bữa trưa").count() == 1, "review: × removes one item")
    pg.get_by_role("button", name="Chọn thêm món").click()
    pg.wait_for_timeout(300)
    pg.locator("[data-tray-toggle]:visible").first.click()
    pg.wait_for_timeout(150)
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(200)
    count = pg.locator("[data-tray-review] li").count()
    pg.get_by_role("button", name=f"Thêm {count} món vào Bữa trưa").click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(600)
    toast = pg.get_by_role("status").filter(has_text="Đã thêm").first
    check(toast.is_visible() and f"Đã thêm {count} món vào Bữa trưa" in toast.inner_text(), f"tray add: one toast for {count} foods")
    body_before = pg.inner_text("body")
    toast.get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(400)
    body_after = pg.inner_text("body")
    check(body_after != body_before, "tray add: one Hoàn tác changes the day")
    check(pg.get_by_role("status").filter(has_text="Đã thêm").count() == 0, "tray add: the toast is gone after the undo")
    ctx.close()

    # Lưu & chọn tiếp: into the tray, search kept
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill("phở")
    pg.wait_for_timeout(300)
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Lưu & chọn tiếp").click()
    pg.wait_for_timeout(300)
    check(field.input_value() == "phở", "Lưu & chọn tiếp: the query is kept")
    check(pg.locator("[data-tray-bar]:visible").count() == 1 and (pg.locator("[data-tray-bar]:visible").get_attribute("aria-label") or "").startswith("1 món"), "Lưu & chọn tiếp: the food is in the tray")
    ctx.close()

    # So sánh left /add
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/add?meal=lunch")
    check(pg.get_by_role("button", name="So sánh").count() == 0, "So sánh is not on /add")
    go(pg, "/foods/food-cha-la")
    check(pg.get_by_role("button", name="So sánh").count() == 1, "So sánh is on the food detail page")
    ctx.close()
    _seed.onboarding(True)


# ---------------------------------------------------------------- create food
def create_food(browser):
    _seed.onboarding(False)
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/foods/new?meal=lunch")
    group = pg.get_by_role("group", name="Cách tạo món")
    recipe = group.get_by_role("button", name="Tính từ nguyên liệu")
    manual = group.get_by_role("button", name="Tự nhập")
    check(recipe.get_attribute("aria-pressed") == "true" and manual.get_attribute("aria-pressed") == "false", "create: Tính từ nguyên liệu is the default")
    check("Kcal và 22 vi chất tự tính từ dữ liệu trong app" in pg.inner_text("body"), "create: the helper line")
    shot(pg, "food-new-390")
    manual.click()
    pg.wait_for_timeout(300)
    notice = pg.get_by_role("note").filter(has_text="Tự nhập chỉ có kcal")
    check(notice.count() == 1 and "Vi chất để trống nếu bạn không nhập. Món sẽ có nhãn Tự nhập." in notice.inner_text(), "create: Tự nhập shows the amber notice")
    check(pg.get_by_text("+ Thêm vi chất (Sodium, Calcium, Iron…)").count() == 1, "create: the manual form keeps + Thêm vi chất")
    shot(pg, "food-new-manual-390")
    recipe.click()
    pg.wait_for_timeout(300)
    # Multi-select ingredient picker
    pg.get_by_role("button", name="+ Thêm nguyên liệu").click()
    pg.wait_for_timeout(400)
    dlg = pg.get_by_role("dialog").filter(has_text="Chọn nguyên liệu")
    check(dlg.count() == 1, "picker: Chọn nguyên liệu")
    toggles = dlg.locator("[data-tray-toggle]")
    toggles.nth(0).click()
    toggles.nth(1).click()
    pg.wait_for_timeout(200)
    bar = dlg.get_by_role("region", name="2 nguyên liệu")
    check(bar.count() == 1 and "Thêm vào món" in bar.inner_text(), "picker: bar with 2 nguyên liệu and Thêm vào món")
    check(dlg.get_by_text("Không tìm thấy nguyên liệu?").count() == 1 and dlg.get_by_role("button", name="Gửi yêu cầu thêm món").count() == 1, "picker: Không tìm thấy nguyên liệu? + Gửi yêu cầu thêm món (mock/demo)")
    shot(pg, "recipe-picker-390")
    dlg.get_by_role("button", name="Gửi yêu cầu thêm món").click()
    pg.wait_for_timeout(300)
    check(pg.get_by_text("Gõ tên nguyên liệu").count() >= 1, "picker: a request with no name asks for one (toast)")
    bar.get_by_role("button", name="Thêm vào món").click()
    pg.wait_for_timeout(400)
    check(pg.locator('input[aria-label^="Khối lượng"]').count() == 2, "picker: both ingredients are on the dish")
    check("Đủ dữ liệu" in pg.inner_text("body") or "Thêm nguyên liệu để xem" in pg.inner_text("body"), "recipe card: Đủ dữ liệu x/22 vi chất")
    ctx.close()
    _seed.onboarding(True)


def customise(browser):
    _seed.onboarding(False)
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/foods/food-cha-la")
    check(pg.get_by_role("link", name="Tùy chỉnh thành món của tôi").count() == 0 and pg.get_by_text("Tùy chỉnh thành món của tôi").count() == 0, "customise: no button on a food without a recipe")
    go(pg, "/foods/food-com-dau-do")
    btn = pg.get_by_text("Tùy chỉnh thành món của tôi")
    check(btn.count() == 1, "customise: the button is on a recipe dish")
    shot(pg, "customise-390")
    btn.click()
    pg.wait_for_url("**/foods/new*")
    pg.wait_for_timeout(600)
    name = pg.locator("#rb-name").input_value()
    check(name == "Cơm đậu đỏ (của tôi)", f"customise: name is pre-filled ({name!r})")
    amounts = [e.input_value() for e in pg.locator('input[aria-label^="Khối lượng"]').all()]
    check(amounts == ["100", "40"], f"customise: ingredient grams are pre-filled ({amounts})")
    check(pg.locator("#rb-cooked").input_value() == "380", "customise: the cooked weight is pre-filled")
    check("Đủ dữ liệu" in pg.inner_text("body"), "customise: the live card shows the 22-nutrient coverage")
    # Change the beans, save: the user's own version exists
    pg.locator('input[aria-label^="Khối lượng"]').nth(1).fill("60")
    shot(pg, "customise-form-390")
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_url("**/foods/recipe-*")
    pg.wait_for_timeout(500)
    shot(pg, "customise-saved-390")
    check("cơm đậu đỏ (của tôi)" in pg.inner_text("body").lower(), f"customise: the saved dish opens ({pg.url}, {pg.inner_text('body')[:120]!r})")
    ctx.close()
    _seed.onboarding(True)


# ---------------------------------------------------------------- keyboard and settings
def keyboard(browser):
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/training", wait=200)
    wait_card(pg)
    # Tab stays inside the card: every focus stop in 6 Tabs is inside it
    inside = True
    for _ in range(6):
        pg.keyboard.press("Tab")
        inside = inside and pg.evaluate("() => !!document.activeElement.closest('[data-onboarding-card]')")
    check(inside, "keyboard: Tab stays inside the tip card")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(card(pg).count() == 0 and "training" in flags(pg).get("seen", []), "keyboard: Esc is Đã hiểu")
    ctx.close()

    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/setup/done")
    pg.get_by_role("button", name="Thêm bữa đầu tiên").click()
    wait_card(pg)
    pg.keyboard.press("Enter")  # focus is on the card; Tab then Enter reaches Bỏ qua
    pg.keyboard.press("Tab")
    focused = pg.evaluate("() => document.activeElement.textContent.trim()")
    check(focused in ("Bỏ qua hướng dẫn", "Tiếp"), f"keyboard: Tab reaches the card's buttons ({focused!r})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(card(pg).count() == 0 and flags(pg).get("tourDone") is True, "keyboard: Esc skips the tour")
    ctx.close()


def settings(browser):
    ctx, pg = ctx_page(browser, PHONE)
    go(pg, "/settings")
    replay = pg.get_by_role("button", name="Xem lại hướng dẫn")
    check(replay.count() == 1 and "Mới" in replay.inner_text(), "Cài đặt: Xem lại hướng dẫn with the Mới pill")
    check(pg.get_by_role("switch", name="Mẹo trên từng màn hình").get_attribute("aria-checked") == "true", "Cài đặt: the tips switch is on")
    shot(pg, "settings-390")
    replay.click()
    pg.wait_for_url(BASE + "/app")
    check(wait_card(pg) and "Bước 1/5" in card(pg).inner_text(), "Xem lại hướng dẫn restarts the tour on Hôm nay")
    card(pg).get_by_role("button", name="Bỏ qua hướng dẫn").click()
    go(pg, "/settings")
    check("Mới" not in pg.get_by_role("button", name="Xem lại hướng dẫn").inner_text(), "Cài đặt: the Mới pill is gone after it was opened once")
    ctx.close()


SETTINGS_KEY = "h1t_settings_v1_demo"
NAMED_PROFILE = json.dumps({"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True})


def share_ctx(browser, foods, onboarding, named=True):
    """Hôm nay with `foods` sample foods left (the sample day has 7: item-1..item-7) and the given onboarding flags."""
    ctx = browser.new_context(viewport=PHONE, accept_downloads=True)
    gone = {f"item-{i}": {"deleted": True} for i in range(foods + 1, 8)}
    ctx.add_init_script(
        "try {"
        f"if (localStorage.getItem('h1t_sample_edits_v1_demo') === null) localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(json.dumps(gone))});"
        f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps({'onboarding': onboarding}))});"
        + (f"localStorage.setItem('h1t_profile_v1_demo', {json.dumps(NAMED_PROFILE)});" if named else "")
        + "} catch (e) {}"
    )
    return ctx, ctx.new_page()


SEEN_FIRST = ["home-logged", "meal-add"]


def share_tip(browser):
    # 3 foods today: the tip shows, with its copy, a round 44 px hole on the share button and the arrow under it
    ctx, pg = share_ctx(browser, 3, {"seen": SEEN_FIRST})
    go(pg, "/app", wait=200)
    check(wait_card(pg, 5000), "share tip: shows at 3 foods today")
    body = card(pg).inner_text()
    check("Mẹo · lần đầu" in body and "Chia sẻ ngày ăn của bạn" in body and "Chạm biểu tượng chia sẻ để tạo ảnh tóm tắt ngày: tên, Level, kcal và vi chất. Chia sẻ cho HLV hoặc đăng lên mạng xã hội nhanh chóng." in body, f"share tip: copy ({body[:80]!r})")
    names = [b.inner_text().strip() for b in card(pg).get_by_role("button").all()]
    check(names == ["Tắt mọi mẹo", "Đã hiểu", "Thử ngay"], f"share tip: buttons Tắt mọi mẹo, Đã hiểu, Thử ngay in that order ({names})")
    check("bg-blue" in (card(pg).get_by_role("button", name="Thử ngay").get_attribute("class") or "") and "bg-blue" not in (card(pg).get_by_role("button", name="Đã hiểu").get_attribute("class") or ""), "share tip: Thử ngay is the primary, Đã hiểu a text button")
    geo = pg.evaluate(
        """() => {
          const btn = document.querySelector("[data-tour='home-share']"), b = btn.getBoundingClientRect();
          const hole = [...document.querySelectorAll('[data-onboarding-overlay] > div')].find(d => d.className.includes('border-sky'));
          const h = hole.getBoundingClientRect(), hs = getComputedStyle(hole);
          const c = document.querySelector('[data-onboarding-card]'), arrow = c.querySelector(':scope > span').getBoundingClientRect();
          return { btnW: b.width, btnH: b.height, bx: b.left + b.width / 2, by: b.top + b.height / 2, hw: h.width, hh: h.height, hx: h.left + h.width / 2, hy: h.top + h.height / 2,
                   radius: hs.borderTopLeftRadius, border: hs.borderTopWidth, borderColor: hs.borderTopColor, ax: arrow.left + arrow.width / 2, placement: c.getAttribute('data-placement') };
        }"""
    )
    check(abs(geo["hw"] - 44) <= 0.5 and abs(geo["hh"] - 44) <= 0.5 and geo["border"] == "2px", f"share tip: the hole is 44 px with a 2 px ring ({geo['hw']}x{geo['hh']}, {geo['border']})")
    check(float(geo["radius"].replace("px", "")) >= 22, f"share tip: the hole is round ({geo['radius']})")
    check(abs(geo["hx"] - geo["bx"]) <= 2 and abs(geo["hy"] - geo["by"]) <= 2, f"share tip: the hole is centred on the share button ({geo['hx']:.1f},{geo['hy']:.1f} vs {geo['bx']:.1f},{geo['by']:.1f})")
    check(geo["placement"] == "below" and abs(geo["ax"] - geo["bx"]) <= 2, f"share tip: the arrow is centred under the button ({geo['ax']:.1f} vs {geo['bx']:.1f})")
    overlap_free(pg, "share tip")
    shot(pg, "tip-home-share-390")
    # Thử ngay: the tip closes, is saved as seen, and the share sheet opens (a name is set, so the image follows)
    card(pg).get_by_role("button", name="Thử ngay").click()
    pg.wait_for_timeout(400)
    check(card(pg).count() == 0, "share tip: Thử ngay closes the tip")
    check("home-share" in flags(pg).get("seen", []), "share tip: saved as seen")
    save = pg.get_by_role("button", name="Lưu ảnh")
    save.wait_for(state="visible", timeout=15000)
    check(pg.get_by_role("dialog").count() == 1, "share tip: Thử ngay opens the share sheet")
    with pg.expect_download():
        save.click()
    pg.wait_for_timeout(300)
    check("share-day" in flags(pg).get("used", []), f"a successful save records share-day as used ({flags(pg).get('used')})")
    ctx.close()

    # Thử ngay with no display name: the sheet asks for the name first
    ctx, pg = share_ctx(browser, 3, {"seen": SEEN_FIRST}, named=False)
    ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify({sex: 'male', birthYear: 2003, weightKg: 65.4, goal: 'maintain', periodMode: false, trainingMinutesDefault: 60, displayName: '', hintSeen: true})); } catch (e) {}")
    go(pg, "/app", wait=200)
    wait_card(pg, 5000)
    card(pg).get_by_role("button", name="Thử ngay").click()
    pg.get_by_label("Tên hiện trên ảnh").wait_for(state="visible", timeout=8000)
    check(True, "share tip: Thử ngay asks for the display name first when it is missing")
    ctx.close()

    # Đã hiểu only closes it
    ctx, pg = share_ctx(browser, 3, {"seen": SEEN_FIRST})
    go(pg, "/app", wait=200)
    wait_card(pg, 5000)
    card(pg).get_by_role("button", name="Đã hiểu").click()
    pg.wait_for_timeout(400)
    check(card(pg).count() == 0 and pg.get_by_role("dialog").count() == 0 and "home-share" in flags(pg).get("seen", []), "share tip: Đã hiểu just closes it and marks it seen")
    ctx.close()

    # Tắt mọi mẹo works as in the other tips
    ctx, pg = share_ctx(browser, 3, {"seen": SEEN_FIRST})
    go(pg, "/app", wait=200)
    wait_card(pg, 5000)
    card(pg).get_by_role("button", name="Tắt mọi mẹo").click()
    pg.wait_for_timeout(300)
    check(flags(pg).get("tipsOff") is True, "share tip: Tắt mọi mẹo saves tipsOff")
    ctx.close()

    # Not at 2 foods, not on a past day, not after a share
    for label, foods, onboarding, route in (
        ("2 foods", 2, {"seen": SEEN_FIRST}, "/app"),
        ("a past day", 3, {"seen": SEEN_FIRST + ["past-day"]}, f"/app?date={YESTERDAY}"),
        ("after a share", 3, {"seen": SEEN_FIRST, "used": ["share-day"]}, "/app"),
    ):
        ctx, pg = share_ctx(browser, foods, onboarding)
        go(pg, route, wait=200)
        pg.wait_for_timeout(1500)
        check(card(pg).count() == 0, f"share tip: not with {label}")
        ctx.close()


MEAL_ADD = "a[data-tour='meal-add']"


def meal_add_link(browser):
    """The + Thêm on a meal header is a text link: looks, hit area, row height, states (390 and 1440)."""
    for size, tag, row_h, add_fs in ((PHONE, "390", 24, "12px"), (DESKTOP, "1440", 36, "13px")):  # cc-44: the ink meal pill
        ctx, pg = ctx_page(browser, size)
        ctx.add_init_script("try { localStorage.setItem('h1t_onboarding_off', '1'); } catch (e) {}")
        go(pg, "/app")
        pg.locator("section[aria-label='Tổng kcal và dinh dưỡng đa lượng']").first.wait_for(state="visible", timeout=8000)
        links = pg.locator(MEAL_ADD + ":visible")
        check(links.count() >= 4, f"{tag} meal add: one + Thêm per meal ({links.count()})")
        link = links.first
        info = link.evaluate(
            """el => {
              const cs = getComputedStyle(el), before = getComputedStyle(el, '::before');
              const row = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect(), list = el.closest('section').getBoundingClientRect();
              const btn = el.parentElement.querySelector('button'), kcal = btn.querySelector('span:last-child').getBoundingClientRect();
              return {
                text: el.textContent.trim(), label: el.getAttribute('aria-label'), exp: el.getAttribute('data-export'),
                bg: cs.backgroundColor, borderW: cs.borderTopWidth, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
                color: cs.color, fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily,
                hitW: parseFloat(before.width), hitH: parseFloat(before.height),
                rowH: row.height, mid: (r.top + r.bottom) / 2, rowMid: (row.top + row.bottom) / 2,
                rightGap: list.right - r.right, kcalGap: r.left - kcal.right, kcalText: btn.querySelector('span:last-child').textContent.trim(),
              };
            }"""
        )
        check(info["text"] == "+ Thêm" and info["exp"] == "hide" and info["label"].startswith("Thêm vào Bữa"), f"{tag} meal add: text, data-export and label kept ({info['text']!r}, {info['label']!r}, {info['exp']!r})")
        check(info["bg"] == "rgba(0, 0, 0, 0)" and info["borderW"] == "0px" and info["radius"] == "0px" and info["shadow"] == "none", f"{tag} meal add: no background, border, radius or shadow ({info['bg']}, {info['borderW']}, {info['radius']}, {info['shadow']})")
        check(info["color"] == "rgb(158, 195, 255)" and info["fs"] == add_fs and info["fw"] == "700" and "Manrope" in info["ff"], f"{tag} meal add: sky Manrope {add_fs} 700 ({info['color']}, {info['fs']}, {info['fw']}, {info['ff'][:30]})")
        check(info["hitW"] >= 44 and info["hitH"] >= 44, f"{tag} meal add: hit area at least 44x44 ({info['hitW']}x{info['hitH']})")
        check(info["rowH"] == row_h, f"{tag} meal add: the meal pill is {row_h} px ({info['rowH']})")
        check(abs(info["mid"] - info["rowMid"]) <= 1, f"{tag} meal add: centred with the meal name ({info['mid']} vs {info['rowMid']})")
        check(abs(info["rightGap"] - 12) <= 1, f"{tag} meal add: right-aligned on the list's 12 px text edge ({info['rightGap']})")
        if info["kcalText"]:
            check(abs(info["kcalGap"] - 12) <= 1, f"{tag} meal add: 12 px from the kcal value ({info['kcalGap']})")
        # the invisible hit area: a point just inside the 44 px hit area above the link still reaches it (10 px on the
        # 24 px phone pill, 4 px on the 36 px desktop pill, cc-44)
        # (the first meal header sits at the top edge of the list's scroll box, which clips the overlay above it, so the
        # second one is used)
        box = links.nth(1).bounding_box()
        above = (44 - box["height"]) / 2 - 0.5
        top = pg.evaluate("([x, y]) => document.elementFromPoint(x, y)?.closest(\"a[data-tour='meal-add']\") !== null", [box["x"] + box["width"] / 2, box["y"] - above])
        check(top, f"{tag} meal add: a tap {above:.1f} px above the link still lands on it")
        # hover turns the text white (cc-44), pressed opacity
        link.hover()
        pg.wait_for_timeout(200)
        deco = link.evaluate("el => getComputedStyle(el).color")
        check(deco == "rgb(255, 255, 255)", f"{tag} meal add: hover turns white ({deco})")
        pg.mouse.down()
        pg.wait_for_timeout(300)
        op = link.evaluate("el => getComputedStyle(el).opacity")
        check(float(op) == 0.6, f"{tag} meal add: pressed opacity 0.6 ({op})")
        pg.mouse.move(5, 5)
        pg.mouse.up()
        pg.wait_for_timeout(300)
        check(pg.url.split("?")[0] == BASE + "/app", f"{tag} meal add: letting go elsewhere does not open /add ({pg.url})")
        # focus-visible ring: 2 px cobalt, offset 2
        link.evaluate("el => { el.setAttribute('tabindex', '0'); }")
        pg.keyboard.press("Tab")
        for _ in range(60):
            if pg.evaluate("() => document.activeElement && document.activeElement.matches(\"a[data-tour='meal-add']\")"):
                break
            pg.keyboard.press("Tab")
        ring = pg.evaluate("() => { const e = document.activeElement, cs = getComputedStyle(e); return { w: cs.outlineWidth, s: cs.outlineStyle, o: cs.outlineOffset, c: cs.outlineColor, ok: e.matches(\"a[data-tour='meal-add']\") }; }")
        check(ring["ok"] and ring["w"] == "2px" and ring["s"] == "solid" and ring["o"] == "2px" and ring["c"] == "rgb(158, 195, 255)", f"{tag} meal add: focus ring 2 px sky, offset 2 ({ring})")
        pg.screenshot(path=str(SHOTS / f"cc-42-meal-add-{tag}.png"))
        ctx.close()
        # a past day has none
        ctx, pg = ctx_page(browser, size)
        ctx.add_init_script("try { localStorage.setItem('h1t_onboarding_off', '1'); } catch (e) {}")
        go(pg, f"/app?date={YESTERDAY}")
        check(pg.locator(MEAL_ADD).count() == 0, f"{tag} meal add: hidden on a past day")
        ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # PROBE_ONLY=tray,create runs just those parts while a part is being fixed
        only = [x for x in os.environ.get("PROBE_ONLY", "").split(",") if x]
        parts = [
            ("tour", lambda: tour_phone(browser)),
            ("tourdesktop", lambda: tour_desktop(browser)),
            ("tips390", lambda: tips(browser, PHONE, "390")),
            ("tips1440", lambda: tips(browser, DESKTOP, "1440")),
            ("rules", lambda: tips_rules(browser)),
            ("tray", lambda: tray(browser)),
            ("create", lambda: create_food(browser)),
            ("customise", lambda: customise(browser)),
            ("keyboard", lambda: keyboard(browser)),
            ("settings", lambda: settings(browser)),
            ("sharetip", lambda: share_tip(browser)),
            ("mealadd", lambda: meal_add_link(browser)),
        ]
        for name, run in parts:
            if not only or name in only:
                run()
        browser.close()
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for m in problems:
            print(" -", m)
        sys.exit(1)
    print("\ncc_42_onboarding: all checks passed")


main()
