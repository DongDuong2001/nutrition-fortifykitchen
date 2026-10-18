"""cc_tutorials: the "Có gì mới" releases and tours, and the one-time tips (hotfix/tutorials with cc-53's units).

Production demo build at 390x844. Tour, tips and "Có gì mới" are on here (`_seed.onboarding(True)`, `_seed.whats_new(True)`).
- Several unseen releases: an account that saw 18b gets 18e, 18d and 18c in one sheet (newest first, grouped); Thử ngay
  runs the joined tour oldest first, at most 8 steps: 18c (5) + 18d (3) + 18e (3) is 11, so 18c keeps its first two
  (header sync status, or the header actions when there is none as in demo; the food list). 18d's steps live on a
  food's portion area, not on Hôm nay, so they are left out; cc-52's 18e steps fall back to the Ngày tập pill. The
  counter reads n/5; Xong ends it, entries unchanged
- An account that saw 18c gets 18e and 18d; 18e's steps are on Hôm nay (the pill), so the sheet has Thử ngay
- A step whose target is gone is skipped; a target that leaves the page mid-step moves the tour on (no stuck ring)
- cc-53: Cài đặt › Có gì mới lists 18d (exact copy) with Xem hướng dẫn; the unit-toggle tip shows once on a food page
  (Chuối) and is followed by the stepper tip, never by itself again; unit-toggle, unit-size and unit-amount render
- The ×N stepper tip (data-tour="unit-stepper") shows once for an egg (Trứng gà) and for a supplement (Bột củ dền)
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
RELEASE = "2026-10-18e"
# Every tip that existed before 18c: a returning user has seen them
OLD_TIPS = [
    "unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "add-tray", "add-shortlists", "haptics",
    "food-detail", "unit-toggle", "compare", "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard",
]
RETURNING = {"tourDone": True, "seen": OLD_TIPS, "whatsNewSeen": "2026-10-18b"}
# 18c's first two steps (the 8-step cap drops its last three), then cc-52's 18e on the Ngày tập pill (18d is not on Hôm nay)
STEPS = [
    ("Món chưa lưu", ["sync-status", "header-actions"]),
    ("Kéo xuống để tải lại", ["home-food-list", "meal-pill"]),
    ("Nhóm Bự / Bé", ["training-size", "training-pill"]),
    ("Đánh dấu để ghi", ["training-checklist", "training-pill"]),
    ("+ Thêm món", ["training-add-item", "training-pill"]),
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
    check("Ghi theo quả, viên" in text and "Trứng, trái cây và thực phẩm bổ sung có nút ×N" in text, "the sheet lists 18c (Ghi theo quả, viên)")
    check("Ghi món theo cách bạn quen" in text and text.index("Ghi món theo cách bạn quen") < text.index("Gần đây và Hay ăn"), "…and 18d above it (newest first)")
    check("Ngày tập ghi vào nhật ký" in text and text.index("Ngày tập ghi vào nhật ký") < text.index("Ghi món theo cách bạn quen"), "…and cc-52's 18e on top")
    check("Thực phẩm bổ sung\n" not in text + "\n" and "Đồng bộ ổn định hơn" not in text, "…not 18b or 18, which were seen")
    check(sheet(pg).locator("section").count() == 3, "three groups, one per release")
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
    check(flags(pg).get("whatsNewSeen") == RELEASE, "the newest release (18e) is marked seen")
    for i, (title, targets) in enumerate(STEPS):
        ok = visible(card(pg))
        text = step_text(pg)
        check(ok and f"Mới · {i + 1}/5" in text and title in text, f"step {i + 1}: Mới · {i + 1}/5, {title} ({text[:40]!r})")
        check(card(pg).get_attribute("aria-label") == f"Hướng dẫn bước {i + 1} trên 5", f"step {i + 1}: aria-label")
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
    check(pg.evaluate("() => sessionStorage.getItem('h1t_wn_tour_v1')") is None, "the tour is over (18d's steps are not on Hôm nay)")
    go(pg, "/app", 1500)
    check(card(pg).count() == 0 and sheet(pg).count() == 0, "nothing comes back after a reload")
    ctx.close()


def skipped(browser):
    # A step whose target is gone is skipped: no food list and no meal pill -> step 1 goes straight to step 3
    ctx, pg = new_page(browser, RETURNING)
    start_tour(pg)
    check("Mới · 1/5" in step_text(pg), "skip: on step 1")
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"home-food-list\"], [data-tour=\"meal-pill\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(2500)
    check("Mới · 3/5" in step_text(pg), f"skip: step 2 has no target, so step 3 shows ({step_text(pg)[:30]!r})")
    check(ring_holds(pg, ["training-pill"]) == "training-pill", "skip: step 3's ring is on the Ngày tập pill")
    check(pg.locator("[data-onboarding-overlay]").count() == 1, "skip: one overlay, no ring left behind")
    shot(pg, "skipped")
    # A target that leaves the page mid-step moves the tour on (the ring is not left on an empty spot); steps 4 and 5
    # point at the same pill, so the tour ends
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"training-pill\"]').forEach(el => el.remove())")
    pg.wait_for_timeout(2500)
    check(card(pg).count() == 0 and pg.locator("[data-onboarding-overlay]").count() == 0, f"gone mid-step: the pill left the page, the steps after it have no target, the tour ends ({step_text(pg)[:30]!r})")
    ctx.close()


def open_food(pg, query, name):
    go(pg, "/add?meal=lunch", 800)
    field = pg.locator('[data-tour="food-search"] input:visible, input[type="search"]:visible').first
    field.fill(query)
    pg.wait_for_timeout(600)
    pg.locator("button[data-food-row]:visible").filter(has_text=name).first.click()
    pg.wait_for_timeout(400)


def stepper_tip(pg, label):
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and "Tăng giảm số lượng" in text and "Mẹo · lần đầu" in text, f"{label}: the ×N stepper tip shows ({text[:40]!r})")
    on = ring_holds(pg, ["unit-stepper"])
    check(on == "unit-stepper", f"{label}: the ring is on the stepper")
    return ok


def stepper(browser):
    # An egg (Dong's unit portions): picking Trứng gà selects 1 quả, the stepper shows, and its tip with it
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "trứng gà", "Trứng gà")
    check(pg.locator('[data-tour="unit-stepper"]:visible').count() >= 1, "egg: the stepper is on screen")
    if stepper_tip(pg, "egg"):
        shot(pg, "stepper-egg")
        card(pg).get_by_role("button", name="Đã hiểu").click()
        pg.wait_for_timeout(300)
    check("quantity-stepper" in flags(pg).get("seen", []), "egg: saved as seen")
    check(card(pg).count() == 0, "egg: Đã hiểu closes it")
    before_amount = pg.locator('[data-tour="unit-amount"]:visible').first.input_value()
    pg.get_by_role("button", name="Tăng số lượng").first.click()
    pg.wait_for_timeout(200)
    after_amount = pg.locator('[data-tour="unit-amount"]:visible').first.input_value()
    check(after_amount != before_amount, f"egg: + changes the amount ({before_amount} -> {after_amount}); the tip did not block it")
    check("quantity-step" in flags(pg).get("used", []), "egg: stepping marks the stepper used")
    open_food(pg, "trứng gà", "Trứng gà")
    pg.wait_for_timeout(1500)
    check(card(pg).count() == 0, "egg: never again")
    ctx.close()

    # A supplement: Bột củ dền by the spoon (1 muỗng)
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "củ dền", "Bột củ dền")
    tab = pg.get_by_role("tab", name="Muỗng")
    (tab.first if tab.count() else pg.get_by_role("button", name="1 muỗng").first).click()
    pg.wait_for_timeout(300)
    check(pg.locator('[data-tour="unit-stepper"]:visible').count() >= 1, "supplement: the stepper is on screen by the spoon")
    if stepper_tip(pg, "supplement"):
        shot(pg, "stepper-supplement")
        card(pg).get_by_role("button", name="Đã hiểu").click()
        pg.wait_for_timeout(300)
    check("quantity-stepper" in flags(pg).get("seen", []), "supplement: saved as seen")
    ctx.close()


def drag(browser):
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE, "seen": OLD_TIPS + ["quantity-stepper"]}, touch=True)
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


def only_18d(browser):
    ctx, pg = new_page(browser, {**RETURNING, "whatsNewSeen": "2026-10-18c"})
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "seen 18c: Có gì mới opens")
    text = sheet(pg).inner_text()
    check("Ngày tập ghi vào nhật ký" in text and "Ghi món theo cách bạn quen" in text and "Gần đây và Hay ăn" not in text, "seen 18c: 18e's and 18d's items only")
    check(sheet(pg).get_by_role("button", name="Thử ngay (1 phút)").count() == 1, "seen 18c: Thử ngay (18e's steps fall back to the Ngày tập pill; 18d's are on a food page)")
    shot(pg, "only-18d")
    sheet(pg).get_by_role("button", name="Để sau").click()
    pg.wait_for_timeout(500)
    check(flags(pg).get("whatsNewSeen") == RELEASE, "seen 18c: Để sau marks 18e seen")
    ctx.close()
    # (A new account never sees it: cc_46.py new_account)


def units(browser):
    # cc-53: the 18d release in Cài đặt › Có gì mới
    ctx, pg = new_page(browser, {**RETURNING, "whatsNewSeen": RELEASE})
    go(pg, "/settings/whats-new", 800)
    main_text = pg.locator("main").inner_text()
    check("Ghi món theo cách bạn quen" in main_text, "units: the 18d item is listed")
    check("Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam. Cơm, mì, yến mạch mở sẵn ở Gam." in main_text, "units: its body is the exact copy")
    check(pg.locator('section[aria-labelledby="release-2026-10-18d"]').get_by_role("button", name="Xem hướng dẫn").count() == 1, "units: 18d has Xem hướng dẫn")
    shot(pg, "whats-new-history")
    ctx.close()

    # cc-53: the unit-toggle tip on a food page, once; the stepper tip comes after it, on the next visit
    ctx, pg = new_page(browser, {"tourDone": True, "seen": ["food-detail"], "whatsNewSeen": RELEASE})
    go(pg, "/foods/food-chuoi", 1200)
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and "Ghi món theo cách bạn quen" in text, f"units: the unit-toggle tip shows on Chuối ({text[:40]!r})")
    check("Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam." in text, "units: tip body")
    check(ring_holds(pg, ["unit-toggle"]) == "unit-toggle", "units: the ring is on the unit toggle")
    shot(pg, "unit-toggle")
    if ok:
        card(pg).get_by_role("button", name="Đã hiểu").click()
        pg.wait_for_timeout(400)
    check(card(pg).count() == 0, "units: Đã hiểu closes it")
    go(pg, "/foods/food-chuoi", 1500)
    nxt = step_text(pg)
    check("Ghi món theo cách bạn quen" not in nxt, "units: the unit-toggle tip never shows again")
    check(nxt == "" or "Tăng giảm số lượng" in nxt, f"units: the next visit may show the stepper tip only ({nxt[:30]!r})")
    ctx.close()

    # cc-53: the unit targets render on a food page
    ctx, pg = new_page(browser, {"tourDone": True, "seen": OLD_TIPS + ["quantity-stepper"], "whatsNewSeen": RELEASE})
    go(pg, "/foods/food-chuoi", 800)
    for t in ("unit-toggle", "unit-size", "unit-amount", "unit-stepper"):
        check(pg.locator(f'[data-tour="{t}"]').count() >= 1, f"units: data-tour={t} renders")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (tour, only_18d, skipped, stepper, units, drag):
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
