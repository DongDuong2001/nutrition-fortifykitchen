"""cc_tutorials: the "Có gì mới" releases and tours, and the one-time tips (hotfix/tutorials, cc-53 units, cc-53b portions).

Production demo build at 390x844. Tour, tips and "Có gì mới" are on here (`_seed.onboarding(True)`, `_seed.whats_new(True)`).
- Several unseen releases: an account that saw 18b gets 21b, 21a, 20b, 20a, 19b, 19a, 18f, 18e, 18d and 18c in one sheet (newest first, grouped);
  Thử ngay runs the joined tour oldest first, capped at the newest 8: 21c alone is 8 steps now (feat/ngay-mau added the ⋯ of the day and the Chép ngày mẫu pill),
  and one of them (So sánh món) is in the portion panel, so the 7 on Hôm nay are preceded by 21b's first step (Một con số, the kcal target). Every older tour is cut by the cap
  (the older steps' own checks are in lib/__tests__/releases.test.ts). The counter reads n/8; Xong ends it,
  entries unchanged
- An account that saw 18c gets 21b, 21a, 20b, 20a, 19b, 19a, 18f, 18e and 18d, with Thử ngay
- A step whose target is gone is skipped; a target that leaves the page mid-step moves the tour on (no stuck ring)
- cc-53b: Cài đặt › Có gì mới lists 18d's corrected copy with no tour, and 18f with Xem hướng dẫn. The portion sheet's
  tips show once each: Trứng ghi theo quả on an egg, Cân sống hay đã nấu chín on rice, then Nhân khẩu phần nhanh, and
  Chỉnh từng món trong khay on the tray; on a food page the ×N tip shows once. The unit stepper tip stays for a
  supplement (Bột củ dền)
- On a phone, the first sheet opened shows the drag-down tip once
Screenshots: .screenshots/cc-tutorials-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_tutorials.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/foods/[id]/** app/(app)/settings/whats-new/**
import json
import os
import re
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
RELEASE = "2026-10-21c"
# Every tip that existed before 18c: a returning user has seen them
OLD_TIPS = [
    "unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "add-tray", "add-shortlists", "haptics",
    "food-detail", "compare", "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard",
]
RETURNING = {"tourDone": True, "seen": OLD_TIPS, "whatsNewSeen": "2026-10-18b"}
# The newest 8 of the joined tour: cc-73b's 21b first step (the kcal target) and 21c's seven that are on Hôm nay: V3's meal +, Ngày tập pill and
# Khám phá tab, Đồ ăn của Minh Hào (the Khám phá tab), Đổi nguyên liệu (Thành phần, a meal's + on Hôm nay), and feat/ngay-mau's two (the ⋯ of
# the day, the Chép ngày mẫu pill, which is the meal headers when the day has food); So sánh món is in the portion panel, and everything older
# is cut by the cap (21c alone is 8 steps)
STEPS = [
    ("Một con số", ["home-hero"]),
    ("Thêm vào từng bữa", ["meal-add", "nav-add"]),
    ("Ngày tập", ["training-pill", "day-date"]),
    ("Nhóm món có màu", ["nav-explore"]),
    ("Đồ ăn của Minh Hào", ["nav-explore"]),
    ("Đổi nguyên liệu", ["meal-add", "nav-add"]),
    ("Lưu cả ngày thành mẫu", ["day-menu", "home-hero"]),
    ("Chép ngày mẫu", ["day-template-pill", "meal-pill"]),
]
# The item titles of 21b, 21a, 20b, 20a, 19b and 19a (cc-73b, follow-ups, overnight, cc-70, cc-68, cc-67), each of which must fit on one line in the sheet
TITLES_1910 = [
    "Mục tiêu rõ ràng hơn", "Vi chất theo chuẩn DRI",
    "Bấm chữ H1T MICRO để về Hôm nay", "Vuốt ngang để tắt thông báo",
    "Bấm vào ngày để mở lịch", "Xóa bữa không cần hỏi lại", "Chữ to theo máy bạn",
    "Giữ rồi kéo món sang bữa khác",
    "Quên ghi hôm qua? Ghi bù được rồi", "Mất mạng vẫn ghi được", "Nhìn góc trên là biết đã lưu chưa", "Điện thoại, máy tính thấy y nhau", "Đăng xuất không lo mất món",
    "Tìm món gọn hơn", "Trái cây chỉ tính phần ăn được", "Phở thêm thịt? Chỉnh được", "Mục tiêu vi chất theo khuyến nghị",
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
    check("Khẩu phần theo gam" in text and text.index("Khẩu phần theo gam") < text.index("Ngày tập ghi vào nhật ký"), "…and cc-53b's 18f above that")
    check("Quên ghi hôm qua? Ghi bù được rồi" in text and "Tìm món gọn hơn" in text and "Giữ rồi kéo món sang bữa khác" in text and text.index("Thêm món mượt hơn") < text.index("Danh sách Giàu … có hai thẻ") < text.index("Mục tiêu rõ ràng hơn") < text.index("Bấm chữ H1T MICRO để về Hôm nay") < text.index("Bấm vào ngày để mở lịch") < text.index("Giữ rồi kéo món sang bữa khác") < text.index("Quên ghi hôm qua? Ghi bù được rồi") < text.index("Tìm món gọn hơn") < text.index("Khẩu phần theo gam"), "…and 21c, 21b, the follow-ups' 21a, the overnight 20b, cc-70's 20a, cc-68's 19b and cc-67's 19a on top")
    check("Thực phẩm bổ sung\n" not in text + "\n" and "Đồng bộ ổn định hơn" not in text, "…not 18b or 18, which were seen")
    check(sheet(pg).locator("section").count() == 11, "eleven groups, one per release")
    try_now = sheet(pg).get_by_role("button", name="Thử ngay (1 phút)")
    check(try_now.count() == 1, "Thử ngay (1 phút): the unseen releases have a tour")
    shot(pg, "sheet")
    try_now.click()
    pg.wait_for_timeout(700)


def tour(browser):
    ctx, pg = new_page(browser, RETURNING)
    go(pg, "/app", 300)
    before = entries(pg)
    start_tour(pg)
    check(sheet(pg).count() == 0, "Thử ngay closes the sheet")
    check(flags(pg).get("whatsNewSeen") == RELEASE, "the newest release (21c) is marked seen")
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
        # design-floor: Bỏ qua on every step, the last one included
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
    # Steps whose target is gone are skipped. Step 1 (Một con số) points at the hero only: with no hero, step 2 (a meal's +) shows
    ctx, pg = new_page(browser, RETURNING)
    start_tour(pg)
    check("Mới · 1/8" in step_text(pg), "skip: on step 1")
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"home-hero\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name="Tiếp").click()
    # Each missing step waits the spotlight's give-up time before it is skipped
    for _ in range(30):
        pg.wait_for_timeout(500)
        if "Mới · 2/8" in step_text(pg):
            break
    check("Mới · 2/8" in step_text(pg), f"skip: step 1 has no target, so step 2 shows ({step_text(pg)[:30]!r})")
    check(pg.locator("[data-onboarding-overlay]").count() == 1, "skip: one overlay, no ring left behind")
    check(ring_holds(pg, ["meal-add", "nav-add"]) is not None, "skip: the ring is on a meal's +")
    # A target that leaves the page mid-step moves the tour on (the ring is not left on an empty spot): with the meal +s and the bar's +
    # gone, step 2 has nothing: step 3 (the Ngày tập pill) shows
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"meal-add\"], [data-tour=\"nav-add\"]').forEach(el => el.remove())")
    for _ in range(30):
        pg.wait_for_timeout(500)
        if "Mới · 3/8" in step_text(pg):
            break
    check("Mới · 3/8" in step_text(pg), f"gone mid-step: step 2 is skipped and the Ngày tập pill shows ({step_text(pg)[:30]!r})")
    check(ring_holds(pg, ["training-pill", "day-date"]) is not None, "gone mid-step: the ring is on the Ngày tập pill")
    shot(pg, "skipped")
    # With the pill, the date, the Khám phá tab, the ⋯ and the meal headers gone too, the last six steps have no target: the tour ends
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"training-pill\"], [data-tour=\"day-date\"], [data-tour=\"nav-explore\"], [data-tour=\"dish-parts\"], [data-tour=\"explore-minh-hao\"], [data-tour=\"day-menu\"], [data-tour=\"day-template-pill\"], [data-tour=\"meal-pill\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name=re.compile("^(Tiếp|Xong)$")).click()
    for _ in range(40):
        pg.wait_for_timeout(500)
        if card(pg).count() == 0:
            break
    pg.wait_for_timeout(500)
    check(card(pg).count() == 0 and pg.locator("[data-onboarding-overlay]").count() == 0, f"skip: the last steps have no target left, the tour ends ({step_text(pg)[:30]!r})")
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
    # design-floor (V3 22/10): one tip per 24 h. This walk-through meets several tips in one sitting, so the last tip's
    # time moves back a day; cc_42_onboarding checks the 24 h rule itself.
    pg.evaluate("""() => {
      const v = JSON.parse(localStorage.getItem('%s') || '{}');
      if (v.onboarding) { v.onboarding.tipShownAt = Date.now() - 25 * 3600 * 1000; localStorage.setItem('%s', JSON.stringify(v)); }
    }""" % (SETTINGS_KEY, SETTINGS_KEY))


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
    tab = pg.get_by_role("button", name="Muỗng", exact=True)
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
    check("Giữ rồi kéo món sang bữa khác" in text and "Quên ghi hôm qua? Ghi bù được rồi" in text and "Tìm món gọn hơn" in text and "Khẩu phần theo gam" in text and "Ngày tập ghi vào nhật ký" in text and "Ghi theo lon, viên, phần" in text and "Gần đây và Hay ăn" not in text, "seen 18c: 21b's, 21a's, 20b's, 20a's, 19b's, 19a's, 18f's, 18e's and 18d's items only")
    wrapped = sheet(pg).locator("li p.font-bold").evaluate_all(
        "(els, titles) => els.filter((p) => titles.includes(p.textContent.trim()) && p.getBoundingClientRect().height > 30).map((p) => p.textContent.trim())", TITLES_1910
    )
    check(not wrapped, f"seen 18c: each 21b, 21a, 20b, 20a, 19b and 19a item title fits on one line at 390 px (wrapped: {wrapped})")
    check(sheet(pg).get_by_role("button", name="Thử ngay (1 phút)").count() == 1, "seen 18c: Thử ngay (21b's, 21a's, 20b's, 20a's, 19b's, 19a's and 18f's steps are on Hôm nay)")
    shot(pg, "seen-18c")
    sheet(pg).get_by_role("button", name="Để sau").click()
    pg.wait_for_timeout(500)
    check(flags(pg).get("whatsNewSeen") == RELEASE, "seen 18c: Để sau marks 21c seen")
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
    check(pg.locator('section[aria-labelledby="release-2026-10-20a"]').get_by_role("button", name="Xem hướng dẫn").count() == 1, "units: 20a has Xem hướng dẫn")
    check(pg.locator('section[aria-labelledby="release-2026-10-19b"]').get_by_role("button", name="Xem hướng dẫn").count() == 1, "units: 19b has Xem hướng dẫn")
    check(pg.locator('section[aria-labelledby="release-2026-10-19a"]').get_by_role("button", name="Xem hướng dẫn").count() == 1, "units: 19a has Xem hướng dẫn")
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
