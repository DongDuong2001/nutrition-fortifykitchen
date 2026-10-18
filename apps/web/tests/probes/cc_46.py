"""cc-46: "Có gì mới" after a release: the sheet opens by itself once, an optional 3-step tour, and Cài đặt › Có gì mới.

Production demo build, 390x844 (and 1440x900 for the dialog). Tour, tips and "Có gì mới" are on here
(`_seed.onboarding(True)`, `_seed.whats_new(True)`); every other probe keeps them off.

- Shows once on /app; Để sau and Esc hide it and mark the release seen; a reload shows nothing
- A new account (setup finished) never sees it
- Waits while a tip is open, opens after Đã hiểu
- An account that has seen nothing gets the newest release only (2026-10-18e, cc-52, Ngày tập ghi vào nhật ký): its 3-step tour
  falls back to the Ngày tập pill on Hôm nay, so the sheet has Thử ngay and runs it on /app; cc_tutorials.py covers several unseen
  releases in one sheet and their joined tour. The 17/10 tour is started from
  Cài đặt › Có gì mới › Xem hướng dẫn (the last one) -> 3 steps -> Xong; a long press moves step 1 and opens the select bar (step 2); step 3 points at Cài đặt with
  select mode off; Bỏ qua and Esc end it; the entries never change
- /settings/whats-new lists the five 18/10 releases (18e cc-52, 18d cc-53, 18c, 18b, 18) and 17/10, newest first, and replays the tour on /app
- 44 px targets, screen-reader names, reduced motion fades, 480 px centred dialog at 1440
Screenshots: .screenshots/cc-46-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_46.py
"""
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

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
SETTINGS_KEY = "h1t_settings_v1_demo"
RELEASE = "2026-10-18e"
HOME_TIPS = ["home-logged", "meal-add", "home-share"]
# Newest first: cc-52 (2026-10-18e), cc-53 (2026-10-18d), cc-51 (2026-10-18c), Thực phẩm bổ sung và Gia vị (2026-10-18b), then cc-49 (2026-10-18)
ITEMS = ["Ngày tập ghi vào nhật ký", "Mở và đóng màn hình mượt hơn"]  # cc-55 adds the second
ITEMS_1810D = ["Ghi món theo cách bạn quen"]
ITEMS_1810C = ["Gần đây và Hay ăn", "Như hôm qua", "Chạm vi chất để xem nguồn", "Rung khi chạm", "Kéo xuống để tải lại", "Món của tôi được lưu", "Ghi thực phẩm bổ sung theo viên", "Ghi theo quả, viên"]
ITEMS_1810B = ["Thực phẩm bổ sung", "Gia vị", "Thêm cà phê"]
ITEMS_1810 = ["Đồng bộ ổn định hơn"]
ITEMS_1710 = ["Trang chủ mới", "Chọn nhiều món", "Mục tiêu đa lượng", "Bữa ăn dễ đọc hơn", "Thanh vi chất 4 màu", "Ảnh chia sẻ rõ hơn"]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, size=PHONE, onboarding=None, **kwargs):
    ctx = browser.new_context(viewport=size, **kwargs)
    if onboarding is not None:
        ctx.add_init_script(
            f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps({'onboarding': onboarding}))});"
        )
    return ctx, ctx.new_page()


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def sheet(pg):
    return pg.get_by_role("dialog", name="Có gì mới")


def card(pg):
    return pg.locator("[data-onboarding-card]")


def replay_1710(pg):
    """Xem hướng dẫn of the 17/10 release (18c has one too, above it)."""
    return pg.locator('section[aria-labelledby="release-2026-10-17"]').get_by_role("button", name="Xem hướng dẫn")


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
    pg.screenshot(path=str(SHOTS / f"cc-46-{name}.png"))


def targets_ok(pg, selector, label):
    small = pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel + ' button, ' + sel + ' a')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
          .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))""",
        selector,
    )
    check(not small, f"{label}: every target is 44 px or more ({small})")


# cc-49/51 tips on Hôm nay (Chưa lưu, kéo xuống, chạm vi chất) are seen too, so the sheet is not waiting for a tip
SEEN_TIPS = {"tourDone": True, "seen": HOME_TIPS + ["unsaved", "pull-refresh", "nutrient-sources", "haptics", "add-shortlists"]}


def once(browser):
    ctx, pg = new_page(browser, onboarding=SEEN_TIPS)
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "opens by itself on /app")
    text = sheet(pg).inner_text()
    check("Cập nhật 18/10\n" in text + "\n" and "18/10/2026" not in text and "CÓ GÌ MỚI" in text.upper(), "header: Cập nhật 18/10 and Có gì mới")
    check("Trang chủ mới" not in text and "Đồng bộ ổn định hơn" not in text, "only the newest release's items (not 17/10, not the first 18/10)")
    pg.wait_for_timeout(200)
    focus = pg.evaluate("() => { const a = document.activeElement; return a && a.tagName + '|' + a.textContent.trim() + '|' + getComputedStyle(a).outlineStyle }")
    check(focus == "H2|Có gì mới|none", f"initial focus on the heading, no ring ({focus})")
    check(all(t in text for t in ITEMS), "the release's items")
    check(sheet(pg).get_by_role("button", name="Thử ngay (1 phút)").count() == 1, "Thử ngay: 18e's tour falls back to the Ngày tập pill on Hôm nay")
    check(sheet(pg).get_by_role("button", name="Để sau").count() == 1, "Để sau")
    check(sheet(pg).get_by_role("button", name="Đóng").count() == 1, "close button named Đóng")
    check(sheet(pg).get_attribute("aria-modal") == "true", "aria-modal")
    title = sheet(pg).locator("h2")
    style = title.evaluate("el => { const s = getComputedStyle(el); return [s.fontStyle, s.textTransform].join(' ') }")
    check(style == "italic uppercase", f"title is italic uppercase ({style})")
    tile = sheet(pg).locator("li span[aria-hidden]").first.bounding_box()
    check(tile and round(tile["width"]) == 36 and round(tile["height"]) == 36, f"icon tile 36 px ({tile})")
    targets_ok(pg, '[role="dialog"]', "sheet")
    check(card(pg).count() == 0, "no tip at the same time")
    pg.wait_for_timeout(300)
    shot(pg, "sheet-390")
    pg.keyboard.press("Shift+Tab")
    check(pg.evaluate("() => !!document.activeElement.closest('[role=dialog]')"), "Shift+Tab from the heading stays in the sheet")
    sheet(pg).get_by_role("button", name="Để sau").click()
    pg.wait_for_timeout(500)
    check(sheet(pg).count() == 0, "Để sau closes it")
    check(flags(pg).get("whatsNewSeen") == RELEASE, f"the release is marked seen ({flags(pg).get('whatsNewSeen')})")
    go(pg, "/app", 1500)
    check(sheet(pg).count() == 0, "hidden after close: a reload shows nothing")
    ctx.close()

    # Esc closes it too and marks it seen
    ctx, pg = new_page(browser, onboarding=SEEN_TIPS)
    go(pg, "/app", 1200)
    visible(sheet(pg))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    check(sheet(pg).count() == 0 and flags(pg).get("whatsNewSeen") == RELEASE, "Esc closes it and marks it seen")
    ctx.close()


def new_account(browser):
    ctx, pg = new_page(browser, onboarding={"tourDone": False})
    go(pg, "/setup/profile", 500)
    pg.locator("#setup-display-name").fill("Học viên A")
    pg.get_by_role("button", name=re.compile("^(Tiếp tục|Hoàn tất)$")).locator("visible=true").first.click()
    pg.wait_for_timeout(500)
    if "/setup/goal" in pg.url:
        pg.get_by_role("button", name="Hoàn tất").locator("visible=true").first.click()
    pg.wait_for_url(re.compile(r".*/setup/done$"), timeout=8000)
    check(flags(pg).get("whatsNewSeen") == RELEASE, "setup marks the latest release seen")
    go(pg, "/app", 2000)
    check(sheet(pg).count() == 0, "a new account never sees it")
    ctx.close()


def waits_for_tip(browser):
    ctx, pg = new_page(browser, onboarding={"tourDone": True})
    go(pg, "/app", 300)
    check(visible(card(pg), 4000), "a tip opens first")
    pg.wait_for_timeout(1200)
    check(sheet(pg).count() == 0, "Có gì mới waits while the tip is open")
    card(pg).get_by_role("button", name="Đã hiểu").click()
    check(visible(sheet(pg), 3000), "opens once the tip is closed")
    check(card(pg).count() == 0, "no tip on top of it")
    ctx.close()


def tour(browser):
    ctx, pg = new_page(browser, onboarding={**SEEN_TIPS, "whatsNewSeen": RELEASE})
    go(pg, "/app", 1200)
    before = entries(pg)
    rows = pg.locator("button[aria-pressed]").count()
    go(pg, "/settings/whats-new")
    replay_1710(pg).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=5000)
    check(visible(card(pg)), "Xem hướng dẫn starts the 17/10 tour")
    check(sheet(pg).count() == 0, "the sheet is closed")
    check("Mới · 1/3" in card(pg).inner_text() and "Giữ để chọn nhiều món" in card(pg).inner_text(), "step 1: Mới · 1/3, Giữ để chọn nhiều món")
    check(card(pg).get_attribute("aria-label") == "Hướng dẫn bước 1 trên 3", "step 1: aria-label Hướng dẫn bước 1 trên 3")
    check(card(pg).get_attribute("role") == "dialog", "step 1: role dialog")
    ring = pg.locator("[data-onboarding-overlay] > div.border-sky").first
    check(ring.evaluate("el => getComputedStyle(el).borderTopWidth") == "2px", "a 2 px sky ring")
    check("0.7" in ring.evaluate("el => getComputedStyle(el).boxShadow"), f"70 % ink scrim ({ring.evaluate('el => getComputedStyle(el).boxShadow')[:60]})")
    radius = card(pg).evaluate("el => getComputedStyle(el).borderTopLeftRadius")
    check(radius == "16px", f"card radius 16 px ({radius})")
    targets_ok(pg, "[data-onboarding-card]", "tour card")
    shot(pg, "tour1-390")
    # A long press on the first food moves the tour on and opens the select bar
    row = pg.locator('[data-tour="home-food-list"]:visible').first.bounding_box()
    pg.mouse.move(row["x"] + row["width"] / 2, row["y"] + row["height"] / 2)
    pg.mouse.down()
    pg.wait_for_timeout(1000)
    pg.mouse.up()
    pg.wait_for_timeout(600)
    check("Mới · 2/3" in card(pg).inner_text() and "Đổi bữa hoặc xóa" in card(pg).inner_text(), "long press moves to step 2")
    check("Chọn Chuyển bữa để đổi bữa, Xóa để xóa. Luôn có nút hoàn tác." in card(pg).inner_text(), "step 2 body names Chuyển bữa")
    check(pg.locator('[data-tour="select-bar"]:visible').count() == 1, "step 2: the select bar is open")
    hole = ring.bounding_box()
    bar = pg.locator('[data-tour="select-bar"]:visible').first.bounding_box()
    check(hole and bar and hole["y"] <= bar["y"] + 1 and hole["y"] + hole["height"] >= bar["y"] + bar["height"] - 1, "step 2: the ring holds the select bar")
    shot(pg, "tour2-390")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(600)
    check("Mới · 3/3" in card(pg).inner_text() and "Mục tiêu đa lượng" in card(pg).inner_text(), "step 3: Mục tiêu đa lượng")
    check(pg.locator('[data-tour="select-bar"]:visible').count() == 0, "step 3: select mode is off")
    nav = pg.locator('[data-tour="nav-settings"]:visible').first.bounding_box()
    hole = ring.bounding_box()
    check(nav and hole and hole["x"] <= nav["x"] + 1 and hole["x"] + hole["width"] >= nav["x"] + nav["width"] - 1, "step 3: the ring is on the Cài đặt tab")
    check(card(pg).get_by_role("button", name="Xong").count() == 1 and card(pg).get_by_role("button", name="Tiếp").count() == 0, "step 3: Xong")
    shot(pg, "tour3-390")
    card(pg).get_by_role("button", name="Xong").click()
    pg.wait_for_timeout(500)
    check(card(pg).count() == 0, "Xong ends the tour")
    check(pg.url.endswith("/app"), "still on /app")
    check(pg.locator("button[aria-pressed]").count() == rows, "the same food rows")
    check(entries(pg) == before, "entries unchanged")
    ctx.close()

    # Tiếp without a long press points at the first meal pill; Bỏ qua ends; Esc ends
    ctx, pg = new_page(browser, onboarding={**SEEN_TIPS, "whatsNewSeen": RELEASE})
    go(pg, "/settings/whats-new")
    replay_1710(pg).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=5000)
    check(visible(card(pg)), "replay starts on /app")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(500)
    pill = pg.locator('[data-tour="meal-pill"]:visible').first.bounding_box()
    hole = pg.locator("[data-onboarding-overlay] > div.border-sky").first.bounding_box()
    check(pill and hole and hole["y"] <= pill["y"] + 1 and hole["y"] + hole["height"] >= pill["y"] + pill["height"] - 1, "step 2 without a long press: the first meal pill")
    card(pg).get_by_role("button", name="Bỏ qua").click()
    pg.wait_for_timeout(400)
    check(card(pg).count() == 0, "Bỏ qua ends the tour")
    go(pg, "/settings/whats-new")
    replay_1710(pg).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=5000)
    visible(card(pg))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check(card(pg).count() == 0, "Esc ends the tour")
    go(pg, "/app", 1500)
    check(card(pg).count() == 0 and sheet(pg).count() == 0, "nothing comes back after a reload")
    ctx.close()


def training_tour(browser):
    """cc-52: Thử ngay runs the 18d tour on /app; its targets live on Ngày tập, so every step rings the Ngày tập pill."""
    ctx, pg = new_page(browser, onboarding=SEEN_TIPS)
    go(pg, "/app", 1200)
    visible(sheet(pg))
    before = entries(pg)
    sheet(pg).get_by_role("button", name="Thử ngay (1 phút)").click()
    titles = ["Nhóm Bự / Bé", "Đánh dấu để ghi", "+ Thêm món"]
    for i, title in enumerate(titles, start=1):
        check(visible(card(pg)) and f"Mới · {i}/3" in card(pg).inner_text() and title in card(pg).inner_text(), f"18d step {i}: {title}")
        pill = pg.locator('[data-tour="training-pill"]:visible').first.bounding_box()
        hole = pg.locator("[data-onboarding-overlay] > div.border-sky").first.bounding_box()
        check(pill and hole and hole["x"] <= pill["x"] + 1 and hole["x"] + hole["width"] >= pill["x"] + pill["width"] - 1, f"18d step {i}: the ring is on the Ngày tập pill")
        if i == 1:
            shot(pg, "tour-18d-390")
        card(pg).get_by_role("button", name="Xong" if i == 3 else "Tiếp").click()
        pg.wait_for_timeout(500)
    check(card(pg).count() == 0 and pg.url.endswith("/app") and entries(pg) == before, "Xong ends the 18d tour on /app; entries unchanged")
    ctx.close()


def history(browser):
    ctx, pg = new_page(browser, onboarding={**SEEN_TIPS, "whatsNewSeen": RELEASE})
    go(pg, "/settings")
    row = pg.get_by_role("link", name=re.compile("Có gì mới"))
    check(row.count() == 1, "Cài đặt has a Có gì mới row")
    row.click()
    pg.wait_for_url(re.compile(r".*/settings/whats-new$"), timeout=5000)
    pg.wait_for_timeout(400)
    text = pg.locator("main").inner_text()
    check(text.count("Cập nhật 18/10") == 5 and all(t in text for t in ITEMS + ITEMS_1810D + ITEMS_1810C + ITEMS_1810B + ITEMS_1810), "the history lists the five 18/10 releases and their items")
    check(text.index("Ngày tập ghi vào nhật ký") < text.index("Ghi món theo cách bạn quen") < text.index("Kéo xuống để tải lại") < text.index("Thực phẩm bổ sung") < text.index("Đồng bộ ổn định hơn"), "…newest first: 18e, 18d, 18c, 18b, 18")
    check("Cập nhật 17/10" in text and "17/10/2026" not in text and all(t in text for t in ITEMS_1710), "the history lists the release (Cập nhật 17/10) and its items")
    check(text.index("Cập nhật 18/10") < text.index("Cập nhật 17/10"), "newest first")
    check(pg.get_by_role("button", name="Xem hướng dẫn").count() == 4, "Xem hướng dẫn on 18e, 18d, 18c and 17/10")
    targets_ok(pg, "main", "history")
    shot(pg, "history-390")
    replay_1710(pg).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=5000)
    check(visible(card(pg)) and "Mới · 1/3" in card(pg).inner_text(), "Xem hướng dẫn replays the tour on /app")
    ctx.close()


def desktop(browser):
    ctx, pg = new_page(browser, DESKTOP, onboarding=SEEN_TIPS)
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "1440: opens")
    pg.wait_for_timeout(300)
    box = sheet(pg).bounding_box()
    check(box and round(box["width"]) == 480, f"1440: a 480 px dialog ({box and box['width']})")
    check(box and abs(box["x"] + box["width"] / 2 - 720) <= 2 and abs(box["y"] + box["height"] / 2 - 450) <= 2, "1440: centred")
    shot(pg, "sheet-1440")
    ctx.close()


def reduced_motion(browser):
    ctx, pg = new_page(browser, onboarding=SEEN_TIPS, reduced_motion="reduce")
    go(pg, "/app", 1200)
    visible(sheet(pg))
    # cc-55: Có gì mới moves like every sheet (m-sheet, a transition on data-state)
    name = sheet(pg).evaluate("el => getComputedStyle(el).transitionProperty")
    check(name == "opacity", f"reduced motion: fade only ({name})")
    ctx.close()
    ctx, pg = new_page(browser, onboarding=SEEN_TIPS)
    go(pg, "/app", 1200)
    visible(sheet(pg))
    anim = sheet(pg).evaluate("el => { const s = getComputedStyle(el); return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction].join(' ') }")
    check(anim == "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)", f"slides up 350 ms on the drawer curve ({anim})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (once, new_account, waits_for_tip, tour, training_tour, history, desktop, reduced_motion):
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
