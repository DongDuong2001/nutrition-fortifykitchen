"""cc_tutorials: the "Có gì mới" releases and tours, and the one-time tips (hotfix/tutorials, cc-53 units, cc-53b portions).

Production demo build at 390x844. Tour, tips and "Có gì mới" are on here (`_seed.onboarding(True)`, `_seed.whats_new(True)`).
- Several unseen releases: an account that saw 18b gets 18f, 18e, 18d and 18c in one sheet (newest first, grouped);
  Thử ngay runs the joined tour oldest first, capped at 8: 18c's first two (header sync status, or the header actions
  when there is none as in demo; the food list), cc-52's 18e three on the Ngày tập pill, then cc-53b's 18f three
  (+ Thêm, the food list, the meal pill). 18d has no tour (cc-53b retired it). The counter reads n/8; Xong ends it,
  entries unchanged
- An account that saw 18c gets 18f, 18e and 18d, with Thử ngay
- A step whose target is gone is skipped; a target that leaves the page mid-step moves the tour on (no stuck ring)
- cc-53b: Cài đặt › Có gì mới lists 18d's corrected copy with no tour, and 18f with Xem hướng dẫn. The portion sheet's
  tips show once each: Trứng ghi theo quả on an egg, Cân sống hay đã nấu chín on rice, then Nhân khẩu phần nhanh, and
  Chỉnh từng món trong khay on the tray; on a food page the ×N tip shows once. The unit stepper tip stays for a
  supplement (Bột củ dền)
- On a phone, the first sheet opened shows the drag-down tip once
Screenshots: .screenshots/cc-tutorials-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_tutorials.py
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed

_seed.onboarding(True)
_seed.whats_new(True)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
TOUCH = {"has_touch": True, "is_mobile": True}
SETTINGS_KEY = "h1t_settings_v1_demo"
RELEASE = "2026-10-18f"
# Every tip that existed before 18c: a returning user has seen them
OLD_TIPS = [
    "unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "add-tray", "add-shortlists", "haptics",
    "food-detail", "compare", "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard",
]
RETURNING = {"tourDone": True, "seen": OLD_TIPS, "whatsNewSeen": "2026-10-18b"}
# 18c's first two (the cap drops its last three), cc-52's 18e on the Ngày tập pill, then cc-53b's 18f on Hôm nay
STEPS = [
    ("Món chưa lưu", ["sync-status", "header-actions"]),
    ("Kéo xuống để tải lại", ["home-food-list", "meal-pill"]),
    ("Nhóm Bự / Bé", ["training-size", "training-pill"]),
    ("Đánh dấu để ghi", ["training-checklist", "training-pill"]),
    ("+ Thêm món", ["training-add-item", "training-pill"]),
    ("Ghi theo gam", ["meal-add", "nav-add"]),
    ("Sống hay chín", ["home-food-list", "meal-pill"]),
    ("Khay xem lại", ["meal-pill"]),
]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, onboarding, touch=False):
    ctx = browser.new_context(viewport=PHONE, **(TOUCH if touch else {}))
    # The install pop-up (it opens by itself on a phone) is done, so the first sheet is the one the probe opens
    seed = {"onboarding": onboarding, "installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    ctx.add_init_script(
        f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(seed))});"
    )
    return ctx, ctx.new_page()


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def sheet(pg):
    return pg.get_by_role("dialog", name="Có gì mới")


def card(pg):
    return pg.locator("[data-onboarding-card]")


def visible(locator, timeout=3000):
    try:
        locator.first.wait_for(state="visible", timeout=timeout)
        return True
    except Exception:
        return False


def flags(pg):
    raw = pg.evaluate(f"() => localStorage.getItem('{SETTINGS_KEY}')")
    try:
        return (json.loads(raw) or {}).get("onboarding", {}) if raw else {}
    except Exception:
        return {}


def entries(pg):
    return pg.evaluate(
        "() => Object.keys(localStorage).filter(k => /entries|sample_edits|archive/.test(k)).sort().map(k => k + '=' + localStorage.getItem(k)).join('\\n')"
    )


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-tutorials-{name}.png"))


def ring_holds(pg, targets):
    """The ring is around the first of `targets` that is on screen (the hole is clamped to the screen)."""
    hole = pg.locator("[data-onboarding-overlay] > div.border-sky").first.bounding_box()
    for t in targets:
        loc = pg.locator(f'[data-tour="{t}"]:visible')
        for i in range(loc.count()):
            box = loc.nth(i).bounding_box()
            if not box or box["width"] == 0:
                continue
            top = max(0, box["y"])
            bottom = min(PHONE["height"], box["y"] + box["height"])
            if hole and hole["x"] <= box["x"] + 1 and hole["x"] + hole["width"] >= box["x"] + box["width"] - 1 and hole["y"] <= top + 1 and hole["y"] + hole["height"] >= bottom - 1:
                return t
    return None


def step_text(pg):
    return card(pg).inner_text() if card(pg).count() else ""


def start_tour(pg):
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "a returning user: Có gì mới opens by itself on Hôm nay")
    text = sheet(pg).inner_text()
    check("Ghi theo viên" in text and "Thực phẩm bổ sung có nút + và − để ghi 2, 3 viên." in text, "the sheet lists 18c (Ghi theo viên)")
    check("Ghi theo lon, viên, phần" in text and text.index("Ghi theo lon, viên, phần") < text.index("Gần đây và Hay ăn"), "…and 18d above it (newest first)")
    check("Ngày tập ghi vào nhật ký" in text and text.index("Ngày tập ghi vào nhật ký") < text.index("Ghi theo lon, viên, phần"), "…and cc-52's 18e above that")
    check("Khẩu phần theo gam" in text and text.index("Khẩu phần theo gam") < text.index("Ngày tập ghi vào nhật ký"), "…and cc-53b's 18f on top")
    check("Thực phẩm bổ sung\n" not in text + "\n" and "Đồng bộ ổn định hơn" not in text, "…not 18b or 18, which were seen")
    check(sheet(pg).locator("section").count() == 4, "four groups, one per release")
    try_now = sheet(pg).get_by_role("button", name="Thử ngay (1 phút)")
    check(try_now.count() == 1, "Thử ngay (1 phút): 18c has a tour")
    shot(pg, "sheet")
    try_now.click()
    pg.wait_for_timeout(700)


def tour(browser):
    ctx, pg = new_page(browser, RETURNING)
    go(pg, "/app", 300)
    before = entries(pg)
    start_tour(pg)
    check(sheet(pg).count() == 0, "Thử ngay closes the sheet")
    check(flags(pg).get("whatsNewSeen") == RELEASE, "the newest release (18f) is marked seen")
    for i, (title, targets) in enumerate(STEPS):
        ok = visible(card(pg))
        text = step_text(pg)
        check(ok and f"Mới · {i + 1}/8" in text and title in text, f"step {i + 1}: Mới · {i + 1}/8, {title} ({text[:40]!r})")
        check(card(pg).get_attribute("aria-label") == f"Hướng dẫn bước {i + 1} trên 8", f"step {i + 1}: aria-label")
        on = ring_holds(pg, targets)
        check(on is not None, f"step {i + 1}: the ring is on {' or '.join(targets)} ({on})")
        cbox = card(pg).bounding_box()
        check(cbox and cbox["x"] >= 15 and cbox["x"] + cbox["width"] <= PHONE["width"] - 15 and cbox["y"] >= 0 and cbox["y"] + cbox["height"] <= PHONE["height"], f"step {i + 1}: the card is on screen")
        shot(pg, f"step{i + 1}")
        last = i == len(STEPS) - 1
        button = card(pg).get_by_role("button", name="Xong" if last else "Tiếp")
        check(button.count() == 1, f"step {i + 1}: {'Xong' if last else 'Tiếp'}")
        if not last:
            check(card(pg).get_by_role("button", name="Bỏ qua").count() == 1, f"step {i + 1}: Bỏ qua")
        button.click()
        pg.wait_for_timeout(700)
    check(card(pg).count() == 0, "Xong ends the tour")
    check(pg.url.endswith("/app"), "still on Hôm nay")
    check(entries(pg) == before, "the entries never change")
    check(pg.evaluate("() => sessionStorage.getItem('h1t_wn_tour_v1')") is None, "the tour is over")
    go(pg, "/app", 1500)
    check(card(pg).count() == 0 and sheet(pg).count() == 0, "nothing comes back after a reload")
    ctx.close()


def skipped(browser):
    # Steps whose target is gone are skipped: no Ngày tập pill -> step 2 goes straight to step 6
    ctx, pg = new_page(browser, RETURNING)
    start_tour(pg)
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(700)
    check("Mới · 2/8" in step_text(pg), "skip: on step 2")
    pg.evaluate("() => document.querySelectorAll('[data-tour^=\"training-\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name="Tiếp").click()
    # Each missing step waits the spotlight's give-up time before it is skipped: three in a row
    for _ in range(20):
        pg.wait_for_timeout(500)
        if "Mới · 6/8" in step_text(pg):
            break
    check("Mới · 6/8" in step_text(pg), f"skip: steps 3 to 5 have no target, so step 6 shows ({step_text(pg)[:30]!r})")
    check(pg.locator("[data-onboarding-overlay]").count() == 1, "skip: one overlay, no ring left behind")
    # A target that leaves the page mid-step moves the tour on (the ring is not left on an empty spot)
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"meal-add\"], [data-tour=\"nav-add\"]').forEach(el => el.remove())")
    pg.wait_for_timeout(1200)
    check("Mới · 7/8" in step_text(pg), f"gone mid-step: step 6's + Thêm left the page, step 7 shows ({step_text(pg)[:30]!r})")
    check(ring_holds(pg, ["home-food-list", "meal-pill"]) is not None, "gone mid-step: the ring is on the food list")
    shot(pg, "skipped")
    # With the food list and the meal pills gone too, Tiếp after step 7 ends the tour
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"meal-pill\"], [data-tour=\"home-food-list\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(2500)
    check(card(pg).count() == 0 and pg.locator("[data-onboarding-overlay]").count() == 0, f"skip: 18f's last step has no target left, the tour ends ({step_text(pg)[:30]!r})")
    ctx.close()


def open_food(pg, query, name):
    go(pg, "/add?meal=lunch", 800)
    field = pg.locator('[data-tour="food-search"] input:visible, input[type="search"]:visible').first
    field.fill(query)
    pg.wait_for_timeout(600)
    pg.locator("button[data-food-row]:visible").filter(has_text=name).first.click()
    pg.wait_for_timeout(400)


def tip(pg, label, title, target):
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and title in text and "Mẹo · lần đầu" in text, f"{label}: the {title} tip shows ({text[:50]!r})")
    check(ring_holds(pg, [target]) == target, f"{label}: the ring is on {target}")
    return ok


def got_it(pg):
    card(pg).get_by_role("button", name="Đã hiểu").click()
    pg.wait_for_timeout(300)


def portion_tips(browser):
    # cc-53b: an egg in the portion sheet: Quả | Gam's tip, once, and using the toggle settles it
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "trứng gà", "Trứng gà")
    if tip(pg, "egg", "Trứng ghi theo quả", "egg-mode"):
        shot(pg, "tip-egg")
        got_it(pg)
    check("egg-mode" in flags(pg).get("seen", []), "egg: saved as seen")
    pg.get_by_role("button", name="Gam", exact=True).click()
    pg.wait_for_timeout(200)
    check("egg-mode" in flags(pg).get("used", []), "egg: the toggle marks it used")
    # Rice: Sống | Chín first, the ×N tip on the next sheet
    open_food(pg, "cơm trắng", "Cơm trắng")
    if tip(pg, "rice", "Cân sống hay đã nấu chín", "cook-state"):
        shot(pg, "tip-cook")
        got_it(pg)
    open_food(pg, "cơm trắng", "Cơm trắng")
    if tip(pg, "rice again", "Nhân khẩu phần nhanh", "portion-multiply"):
        shot(pg, "tip-multiply")
        got_it(pg)
    pg.get_by_role("button", name="Tăng nhân khẩu phần nhanh").first.click()
    pg.wait_for_timeout(200)
    check("portion-multiply" in flags(pg).get("used", []), "×N: stepping marks it used")
    open_food(pg, "cơm trắng", "Cơm trắng")
    pg.wait_for_timeout(1200)
    check(card(pg).count() == 0, "rice: no tip a third time")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    # The tray: its row tip
    go(pg, "/add?meal=lunch", 800)
    toggles = pg.locator("[data-tray-toggle]:visible")
    toggles.nth(0).click()
    toggles.nth(1).click()
    pg.get_by_role("button", name="Xem lại").click()
    if tip(pg, "tray", "Chỉnh từng món trong khay", "tray-row"):
        shot(pg, "tip-tray")
        got_it(pg)
    check("tray-row" in flags(pg).get("seen", []), "tray: saved as seen")
    ctx.close()

    # A supplement keeps its unit, and the unit stepper's tip: Bột củ dền by the spoon (1 muỗng)
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "củ dền", "Bột củ dền")
    tab = pg.get_by_role("tab", name="Muỗng")
    (tab.first if tab.count() else pg.get_by_role("button", name="1 muỗng").first).click()
    pg.wait_for_timeout(300)
    check(pg.locator('[data-tour="unit-stepper"]:visible').count() >= 1, "supplement: the stepper is on screen by the spoon")
    if tip(pg, "supplement", "Tăng giảm số lượng", "unit-stepper"):
        shot(pg, "stepper-supplement")
        got_it(pg)
    check("quantity-stepper" in flags(pg).get("seen", []), "supplement: saved as seen")
    before = pg.locator('[data-tour="unit-amount"]:visible').first.input_value()
    pg.get_by_role("button", name="Tăng số lượng").first.click()
    pg.wait_for_timeout(200)
    check(pg.locator('[data-tour="unit-amount"]:visible').first.input_value() != before, "supplement: + changes the amount; the tip did not block it")
    check("quantity-step" in flags(pg).get("used", []), "supplement: stepping marks the stepper used")
    ctx.close()


def drag(browser):
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE, "seen": OLD_TIPS + ["quantity-stepper", "cook-state", "egg-mode", "portion-multiply", "tray-row"]}, touch=True)
    go(pg, "/app", 1500)
    check(card(pg).count() == 0, "drag: no tip on Hôm nay before a sheet opens")
    pg.get_by_role("button", name="Tùy chọn ngày").first.tap()
    pg.wait_for_timeout(300)
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and "Kéo xuống để đóng" in text, f"drag: the first sheet shows the drag-down tip ({text[:40]!r})")
    check(ring_holds(pg, ["sheet-handle"]) == "sheet-handle", "drag: the ring is on the grabber")
    check(pg.locator("[data-onboarding-card]").count() == 1, "drag: one card only")
    shot(pg, "drag")
    if ok:
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        check(card(pg).count() == 0 and pg.locator('[role="dialog"]').count() >= 1, "drag: Esc closes the tip, the sheet stays open")
    check("sheet-drag" in flags(pg).get("seen", []), "drag: saved as seen")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Tùy chọn ngày").first.tap()
    pg.wait_for_timeout(1500)
    check(card(pg).count() == 0, "drag: the next sheet shows no tip")
    ctx.close()


def seen_18c(browser):
    ctx, pg = new_page(browser, {**RETURNING, "whatsNewSeen": "2026-10-18c"})
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "seen 18c: Có gì mới opens")
    text = sheet(pg).inner_text()
    check("Khẩu phần theo gam" in text and "Ngày tập ghi vào nhật ký" in text and "Ghi theo lon, viên, phần" in text and "Gần đây và Hay ăn" not in text, "seen 18c: 18f's, 18e's and 18d's items only")
    check(sheet(pg).get_by_role("button", name="Thử ngay (1 phút)").count() == 1, "seen 18c: Thử ngay (18e's and 18f's steps are on Hôm nay)")
    shot(pg, "seen-18c")
    sheet(pg).get_by_role("button", name="Để sau").click()
    pg.wait_for_timeout(500)
    check(flags(pg).get("whatsNewSeen") == RELEASE, "seen 18c: Để sau marks 18f seen")
    ctx.close()
    # (A new account never sees it: cc_46.py new_account)


def units(browser):
    # Cài đặt › Có gì mới: 18d's corrected copy, no tour; 18f with Xem hướng dẫn
    ctx, pg = new_page(browser, {**RETURNING, "whatsNewSeen": RELEASE})
    go(pg, "/settings/whats-new", 800)
    main_text = pg.locator("main").inner_text()
    check("Red Bull ghi theo lon, thực phẩm bổ sung theo viên, món Việt theo phần. Chọn cỡ rồi chỉnh số lượng." in main_text, "units: 18d's corrected body")
    check(pg.locator('section[aria-labelledby="release-2026-10-18d"]').get_by_role("button", name="Xem hướng dẫn").count() == 0, "units: 18d has no tour now")
    check(pg.locator('section[aria-labelledby="release-2026-10-18f"]').get_by_role("button", name="Xem hướng dẫn").count() == 1, "units: 18f has Xem hướng dẫn")
    shot(pg, "whats-new-history")
    ctx.close()

    # A food page: the ×N tip once (the unit toggle tip is retired: Chuối goes by grams)
    ctx, pg = new_page(browser, {"tourDone": True, "seen": ["food-detail"], "whatsNewSeen": RELEASE})
    go(pg, "/foods/food-chuoi", 1200)
    if tip(pg, "food page", "Nhân khẩu phần nhanh", "portion-multiply"):
        shot(pg, "tip-food-page")
        got_it(pg)
    go(pg, "/foods/food-chuoi", 1500)
    check("Nhân khẩu phần nhanh" not in step_text(pg), "food page: the ×N tip never shows again")
    ctx.close()

    # The targets render: the gram ones on Chuối, the unit ones on Bún đậu
    ctx, pg = new_page(browser, {"tourDone": True, "seen": OLD_TIPS + ["quantity-stepper", "portion-multiply"], "whatsNewSeen": RELEASE})
    go(pg, "/foods/food-chuoi", 800)
    for t in ("portion-multiply", "portion-grams-input"):
        check(pg.locator(f'[data-tour="{t}"]').count() >= 1, f"Chuối: data-tour={t} renders")
    check(pg.locator('[data-tour="unit-toggle"]').count() == 0, "Chuối: no unit toggle")
    go(pg, "/foods/food-bun-dau", 800)
    for t in ("unit-toggle", "unit-amount", "unit-stepper"):
        check(pg.locator(f'[data-tour="{t}"]').count() >= 1, f"Bún đậu: data-tour={t} renders")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (tour, seen_18c, skipped, portion_tips, units, drag):
            print(f"\n=== {part.__name__} ===")
            try:
                part(browser)
            except Exception as e:  # a crash is a failure, the rest still runs
                check(False, f"{part.__name__} crashed: {e}")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
