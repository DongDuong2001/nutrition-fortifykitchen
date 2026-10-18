"""cc-52: Ngày tập ghi vào nhật ký. Production demo build, 390x844 (and a 1440 screenshot).

- First open (no choice saved): the "Bạn thuộc nhóm nào?" sheet, once per account. Choose Bự: salt rows 1,5 g, fast carbs
  45 g, the header total 10,5 g; a reload asks nothing.
- Tick salt 0–20: the portion sheet with Muối ăn pre-filled 1,5 g and Thêm vào Bữa phụ. Thêm ticks it ("✓ Đã ghi 1,5 g")
  and Hôm nay's Bữa phụ shows Muối ăn 1,5 g; closing the sheet leaves the item unticked.
- Untick: the entry goes with Hoàn tác (which ticks it again); the entry deleted on Hôm nay unticks the item.
- Tinh bột nhanh is grams of carbs (Bự 45 g): Red Bull resolves, 1,5 lon in half-can steps; mật mía ≈ 60 g; the
  Red Bull + mật mía mix pre-fills 1 lon + 23 g = 45 g carbs, logs two entries, and untick removes both.
- + Thêm món: "Nước dừa" (made in Món của tôi first; the demo catalogue has none) in Trước tập stays after a reload, only
  in Trước tập; it can be removed.
- Cài đặt › Hồ sơ › Bé: salt rows 1 g, header 7 g. A past day: no chip, no + Thêm món, ticks disabled.
- New controls are 44 px or more; no horizontal scroll.
Screenshots: .screenshots/cc-52-*.png
Run with: ALIGN_BASE_URL=http://localhost:3105 npm run probe -- tests/probes/cc_52_training.py
"""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed

_seed.training_asked(False)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
PREFS = "h1t_training_prefs_v1_demo"
CHECKLIST = "h1t_training_checklist_v1_demo"
MOBILE = '[data-align-container="training-mobile"]'
SALT0 = "Muối · phút 0–20"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def go(pg, route, wait=800):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def shot(pg, name):
    pg.wait_for_timeout(400)  # sheets slide in for 250 ms
    pg.screenshot(path=str(SHOTS / f"cc-52-{name}.png"))


def storage(pg, key):
    raw = pg.evaluate(f"() => localStorage.getItem('{key}')")
    return json.loads(raw) if raw else None


def dialog(pg, name):
    return pg.get_by_role("dialog", name=name)


def box(pg, name):
    return pg.locator(f"{MOBILE} input[type=checkbox][aria-label='{name}']")


def doses(pg, prefix):
    """The dose text of each mobile checklist row whose label starts with prefix."""
    return pg.evaluate(
        """([sel, prefix]) => [...document.querySelectorAll(sel + ' input[type=checkbox]')]
          .filter(i => (i.getAttribute('aria-label') || '').startsWith(prefix))
          .map(i => i.closest('label').lastElementChild.textContent.trim())""",
        [MOBILE, prefix],
    )


def row_text(pg, name):
    return box(pg, name).first.evaluate("el => el.closest('label').innerText")


def header_total(pg):
    return pg.locator(MOBILE).locator(".font-display.italic.font-bold").first.inner_text().replace("\n", " ").strip()


def small_targets(pg, selector):
    return pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel)]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
          .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))""",
        selector,
    )


def no_overflow(pg, label):
    over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check(over <= 0, f"{label}: no horizontal scroll ({over})")


def first_open_and_bu(pg):
    go(pg, "/training", 1200)
    sheet = dialog(pg, "Bạn thuộc nhóm nào?")
    check(sheet.is_visible(), "first open: the Bự / Bé sheet")
    text = sheet.inner_text()
    check("Bé" in text and "Liều thấp" in text and "Bự" in text and "Liều cao" in text, "two choices: Bé (liều thấp), Bự (liều cao)")
    check("Muối 1 g mỗi 20 phút · tinh bột nhanh 30 g" in text and "Muối 1,5 g mỗi 20 phút · tinh bột nhanh 45 g" in text, "each choice names its doses")
    check(storage(pg, PREFS).get("asked") is True, "asked is saved for the account when the sheet opens")
    check(not small_targets(pg, '[role="dialog"] button'), f"sheet: 44 px targets ({small_targets(pg, '[role=dialog] button')})")
    shot(pg, "size-sheet-390")
    sheet.get_by_role("button", name=re.compile("^Bự")).click()
    pg.wait_for_timeout(500)
    check(dialog(pg, "Bạn thuộc nhóm nào?").count() == 0, "choosing closes the sheet")
    check(storage(pg, PREFS).get("size") == "bu", "Bự is saved")
    salts = doses(pg, "Muối · phút")
    check(salts == ["1,5 g"] * 3, f"Bự: the salt rows show 1,5 g ({salts})")
    check(doses(pg, "Tinh bột nhanh") == ["45 g"], f"Bự: fast carbs 45 g ({doses(pg, 'Tinh bột nhanh')})")
    check(doses(pg, "Chà là") == ["30 g"] and doses(pg, "Bột củ dền") == ["3 g"], "fixed doses stay as written")
    total = header_total(pg)
    check(total.startswith("10,5"), f"header total uses the same end: 10,5 g ({total})")
    check("6 g cả ngày + 4,5 g khi tập" in pg.locator(MOBILE).inner_text(), "header breakdown 6 g + 4,5 g")
    chip = pg.locator(f'{MOBILE} [data-tour="training-size"]')
    check(chip.inner_text().strip() == "Bự · đổi", f"the chip reads Bự · đổi ({chip.inner_text()})")
    check(not small_targets(pg, f'{MOBILE} [data-tour="training-size"], {MOBILE} [data-tour="training-add-item"]'), "chip and + Thêm món are 44 px")
    no_overflow(pg, "training")
    shot(pg, "bu-390")
    go(pg, "/training", 1200)
    check(dialog(pg, "Bạn thuộc nhóm nào?").count() == 0, "a reload asks nothing (once per account)")
    # The chip opens it again
    chip.click()
    check(dialog(pg, "Bạn thuộc nhóm nào?").is_visible(), "the chip opens the sheet")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)


def tick_and_log(pg):
    box(pg, SALT0).click()
    sheet = dialog(pg, SALT0)
    check(sheet.is_visible(), "tick salt: the portion sheet opens")
    text = sheet.inner_text()
    grams = sheet.get_by_label("Số gam").input_value()
    check("Muối ăn" in text and grams == "1,5", f"pre-filled Muối ăn 1,5 g ({grams})")
    check(sheet.get_by_role("button", name="Thêm vào Bữa phụ").count() == 1, "meal Bữa phụ")
    check(not box(pg, SALT0).is_checked(), "not ticked while the sheet is open")
    shot(pg, "portion-sheet-390")
    sheet.get_by_role("button", name="Thêm vào Bữa phụ").click()
    pg.wait_for_timeout(600)
    check(dialog(pg, SALT0).count() == 0, "Thêm closes the sheet")
    check(box(pg, SALT0).is_checked(), "the item is ticked")
    check("✓ Đã ghi 1,5 g" in row_text(pg, SALT0), f"note ✓ Đã ghi 1,5 g ({row_text(pg, SALT0)!r})")
    link = (storage(pg, CHECKLIST) or {}).get(today_key(pg), {}).get("logged", {}).get("intra-salt-0-20")
    check(bool(link and len(link.get("entryIds", [])) == 1), f"the tick keeps the entry id ({link})")
    shot(pg, "ticked-390")

    # Cancel leaves it unticked
    other = "Muối · phút 20–40"
    box(pg, other).click()
    check(dialog(pg, other).is_visible(), "another tick opens the sheet")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    check(not box(pg, other).is_checked(), "closing the sheet leaves the item unticked")

    return link["entryIds"][0] if link else None


def carbs(pg):
    """Tinh bột nhanh: 45 g of carbs for Bự (Hao 18/10). Red Bull resolves; mật mía pre-fills the grams that hold 45 g;
    the mix starts at 1 lon with mật mía topping up to 45 g, logs two entries, and untick removes both."""
    go(pg, "/training", 1000)
    box(pg, "Tinh bột nhanh").click()
    carb = dialog(pg, "Tinh bột nhanh")
    radios = carb.get_by_role("radio")
    check(radios.count() == 3 and all(radios.nth(i).is_enabled() for i in range(3)), f"fast carbs: three choices, all in the catalogue ({radios.count()})")
    check(carb.get_by_role("radio", name="Red Bull", exact=True).is_checked(), "Red Bull resolves and is picked first")
    text = carb.inner_text()
    check("1,5 lon" in text and "Tinh bột 41 / 45 g" in text, f"Red Bull: 1,5 lon for 45 g carbs, in half cans ({text[-120:]!r})")
    carb.get_by_role("button", name="Thêm nửa lon").click()
    check("2 lon" in carb.inner_text() and "Tinh bột 55 / 45 g" in carb.inner_text(), "half-can steps update the live total")
    carb.get_by_role("radio", name="Mật mía Golden Barrel").check()
    pg.wait_for_timeout(200)
    check(carb.get_by_label("Số gam").input_value() == "60" and "≈ 60 g mật mía · 45 g tinh bột" in carb.inner_text(), "mật mía: ≈ 60 g mật mía · 45 g tinh bột")
    shot(pg, "carb-mat-mia-390")
    carb.get_by_role("radio", name="Red Bull + mật mía").check()
    pg.wait_for_timeout(200)
    text = carb.inner_text()
    grams = carb.get_by_label("Số gam mật mía").input_value()
    check("1 lon" in text and grams == "23" and "Tinh bột 45 / 45 g" in text, f"Bự mix: 1 lon + 23 g mật mía = 45 g carbs ({grams}, {text[-80:]!r})")
    check(not small_targets(pg, '[role="dialog"] button'), "mix: 44 px targets")
    shot(pg, "carb-mix-390")
    carb.get_by_role("button", name="Thêm vào Bữa phụ").click()
    pg.wait_for_timeout(600)
    check(box(pg, "Tinh bột nhanh").is_checked() and "✓ Đã ghi 1 lon Red Bull + 23 g mật mía" in row_text(pg, "Tinh bột nhanh"), f"the mix ticks the item ({row_text(pg, 'Tinh bột nhanh')!r})")
    ids = storage(pg, CHECKLIST)[today_key(pg)]["logged"]["intra-carb"]["entryIds"]
    check(len(ids) == 2, f"two entries linked ({ids})")
    go(pg, "/app", 1000)
    text = pg.locator("body").inner_text()
    snack = text[text.find("BỮA PHỤ"):text.find("TỐI")]
    check("Red Bull" in snack and "Mật mía" in snack, f"Hôm nay: both in Bữa phụ ({snack!r})")
    go(pg, "/training", 1000)
    box(pg, "Tinh bột nhanh").click()
    pg.wait_for_timeout(400)
    check(not box(pg, "Tinh bột nhanh").is_checked() and pg.get_by_role("button", name="Hoàn tác").count() == 1, "untick: one Hoàn tác")
    pg.get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(500)
    present = pg.evaluate("(ids) => { const raw = localStorage.getItem('h1t_added_entries_v1_demo') || '[]'; return ids.filter((id) => raw.includes(id)).length }", ids)
    check(box(pg, "Tinh bột nhanh").is_checked() and present == 2, f"Hoàn tác brings both entries back and ticks it ({present})")
    box(pg, "Tinh bột nhanh").click()
    pg.wait_for_timeout(400)
    go(pg, "/app", 1000)
    text = pg.locator("body").inner_text()
    snack = text[text.find("BỮA PHỤ"):text.find("TỐI")]
    check("Red Bull" not in snack and "Mật mía" not in snack, f"untick removed both entries ({snack!r})")


def today_key(pg):
    return pg.evaluate("() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())")


def home_has_salt(pg):
    go(pg, "/app", 1000)
    text = pg.locator("body").inner_text()
    return "Muối ăn" in text, text


def flows(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    first_open_and_bu(pg)
    tick_and_log(pg)

    has, text = home_has_salt(pg)
    # Meal headers are set in capitals (CSS), so innerText has BỮA PHỤ; the food sits between it and TỐI
    snack = text[text.find("BỮA PHỤ"):text.find("TỐI")]
    check(has and "Muối ăn\n1,5 g" in snack, f"Hôm nay: Bữa phụ shows Muối ăn 1,5 g ({snack!r})")
    shot(pg, "home-bua-phu-390")

    # Untick: the entry goes, Hoàn tác brings it (and the tick) back
    go(pg, "/training", 1000)
    check(box(pg, SALT0).is_checked(), "still ticked on return")
    box(pg, SALT0).click()
    pg.wait_for_timeout(400)
    check(not box(pg, SALT0).is_checked(), "untick")
    undo = pg.get_by_role("button", name="Hoàn tác")
    check(undo.count() >= 1, "the usual Hoàn tác")
    undo.first.click()
    pg.wait_for_timeout(500)
    check(box(pg, SALT0).is_checked(), "Hoàn tác ticks it again")
    box(pg, SALT0).click()
    pg.wait_for_timeout(400)
    has, _ = home_has_salt(pg)
    check(not has, "untick removed Muối ăn from Hôm nay")

    # The linked entry deleted on Hôm nay: the item shows unticked
    go(pg, "/training", 1000)
    box(pg, SALT0).click()
    dialog(pg, SALT0).get_by_role("button", name="Thêm vào Bữa phụ").click()
    pg.wait_for_timeout(600)
    entry = storage(pg, CHECKLIST)[today_key(pg)]["logged"]["intra-salt-0-20"]["entryIds"][0]
    go(pg, f"/entry/{entry}", 800)
    pg.get_by_role("button", name="Xóa món này").click()
    pg.wait_for_timeout(800)
    go(pg, "/training", 1000)
    check(not box(pg, SALT0).is_checked(), "entry deleted on Hôm nay: the item shows unticked")

    carbs(pg)
    own_items(pg)
    settings_be(pg)
    past_day(pg)
    ctx.close()


def own_items(pg):
    # The demo catalogue has no Nước dừa: make it in Món của tôi (Tự nhập)
    go(pg, "/foods/new?meal=breakfast", 800)
    pg.get_by_role("button", name="Tự nhập").click()
    pg.locator("#cf-name").fill("Nước dừa")
    pg.locator("#cf-size").fill("250")
    pg.locator("#cf-kcal").fill("19")
    pg.get_by_role("button", name=re.compile("^Lưu và thêm vào")).click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=8000)
    pg.wait_for_timeout(500)
    # A food made in demo mode lives in this tab only: reach Ngày tập by the pill, not a reload
    pg.locator('[data-tour="training-pill"]:visible').first.click()
    pg.wait_for_url(re.compile(r".*/training"), timeout=8000)
    pg.wait_for_timeout(800)
    pg.locator(f'{MOBILE} [data-tour="training-add-item"]').click()
    sheet = dialog(pg, "Thêm món vào Trước tập")
    check(sheet.is_visible(), "+ Thêm món opens Thêm món vào Trước tập")
    sheet.get_by_role("searchbox").first.fill("Nước dừa") if sheet.get_by_role("searchbox").count() else sheet.locator("input").first.fill("Nước dừa")
    pg.wait_for_timeout(500)
    sheet.get_by_role("button", name=re.compile("Nước dừa")).first.click()
    pg.wait_for_timeout(300)
    check(sheet.get_by_role("button", name="Thêm vào Trước tập").is_visible(), "then the amount step")
    shot(pg, "own-amount-390")
    sheet.get_by_role("button", name="Thêm vào Trước tập").click()
    pg.wait_for_timeout(500)
    check(box(pg, "Nước dừa").count() == 1, "Nước dừa is on the list")
    # Its tick logs like the coach items (before the reload: the demo-made food is gone after one)
    box(pg, "Nước dừa").click()
    check(dialog(pg, "Nước dừa").is_visible() and "Thêm vào Bữa phụ" in dialog(pg, "Nước dừa").inner_text(), "ticking an own item opens the portion sheet")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    go(pg, "/training", 1000)
    pre, intra = pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel + ' h2')].map(h => h.closest('div').parentElement.innerText)""",
        MOBILE,
    )[:2]
    check("Nước dừa" in pre and "Nước dừa" not in intra, "after a reload it is still there, in Trước tập only")
    own = storage(pg, PREFS)["own"]
    check(len(own) == 1 and own[0]["phase"] == "pre-workout" and own[0]["name"] == "Nước dừa", f"saved per account ({own})")
    check(not small_targets(pg, f"{MOBILE} button[aria-label^='Bỏ ']"), "the remove button is 44 px")
    shot(pg, "own-item-390")
    pg.get_by_role("button", name="Bỏ Nước dừa khỏi danh sách").first.click()
    pg.wait_for_timeout(300)
    go(pg, "/training", 1000)
    check(box(pg, "Nước dừa").count() == 0, "removed, it stays gone")


def settings_be(pg):
    go(pg, "/settings/profile", 1000)
    pg.get_by_role("button", name="Bé, liều thấp").first.click()
    pg.wait_for_timeout(300)
    check(storage(pg, PREFS).get("size") == "be", "Cài đặt › Hồ sơ saves Bé")
    shot(pg, "settings-row-390")
    go(pg, "/training", 1000)
    salts = doses(pg, "Muối · phút")
    check(salts == ["1 g"] * 3, f"Bé: the salt rows show 1 g ({salts})")
    check(header_total(pg).startswith("7"), f"Bé: header total 7 g ({header_total(pg)})")
    check(pg.locator(f'{MOBILE} [data-tour="training-size"]').inner_text().strip() == "Bé · đổi", "chip Bé · đổi")


def past_day(pg):
    yday = pg.evaluate("() => { const d = new Date(Date.now() - 86400000); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d) }")
    go(pg, f"/training?date={yday}", 1000)
    check(pg.locator(f'{MOBILE} [data-tour="training-size"]').count() == 0, "past day: no chip")
    check(pg.locator(f'{MOBILE} [data-tour="training-add-item"]').count() == 0, "past day: no + Thêm món")
    boxes = pg.locator(f"{MOBILE} input[type=checkbox]")
    check(boxes.count() == 0 or all(boxes.nth(i).is_disabled() for i in range(boxes.count())), "past day: ticks are view-only")


def desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    go(pg, "/training", 1200)
    sheet = dialog(pg, "Bạn thuộc nhóm nào?")
    if sheet.count():
        sheet.get_by_role("button", name=re.compile("^Bé")).click()
        pg.wait_for_timeout(400)
    check(pg.locator('[data-tour="training-size"]:visible').count() == 1, "1440: the chip next to the duration")
    check(pg.locator('[data-tour="training-add-item"]:visible').count() == 1, "1440: + Thêm món")
    shot(pg, "training-1440")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (flows, desktop):
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
