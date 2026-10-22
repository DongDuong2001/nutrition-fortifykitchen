"""feat/ngay-mau (Hao 22/10, prompts/overnight-1022-job4-ngay-mau.md, Part A): Ngày ăn mẫu.

At 390 and 1280, in the demo account: Hôm nay's ⋯ saves the day as a template (summary, name from the training state, tag, toast); Khám phá
› Của bạn counts it and /explore/ngay-mau lists it; the editor renames it and drops a food (a draft, not saved), then Lưu keeps the name;
on an empty day the "Chép ngày mẫu" pill opens the picker (Hôm qua first, then the template), Chép vào copies every entry through the diary's
copy (the same entries and kcal as the template, one toast), Hoàn tác leaves the day empty again; Hôm qua copies the same way; the pill's × hides
it for that day only (a next day shows it again); the template's Xóa mẫu asks first and the picker then has only Hôm qua and the empty-state line.
Screenshots: .screenshots/ngay-mau/<screen>-<width>.png (save sheet, list, editor, empty day, picker, toast), to hold next to design/v3/ngay-mau/renders.
Run with: ALIGN_BASE_URL=http://localhost:3131 npm run probe -- tests/probes/ngay_mau.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/explore/ngay-mau/** components/home/** components/templates/** components/explore/**
import json
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3131")
NOW = "2026-10-15T10:00:00+07:00"
NEXT_DAY = "2026-10-16T10:00:00+07:00"
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "ngay-mau"
SHOTS.mkdir(parents=True, exist_ok=True)
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
SAMPLE_EDITS_KEY = "h1t_sample_edits_v1_demo"
PILL_KEY = "h1t_template_pill_hidden_v1_demo"
TEMPLATES_KEY = "h1t_day_templates_v1_demo"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def flat(text):
    return re.sub(r"\s+", " ", text).strip()


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def home(pg):
    go(pg, "/app")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(300)


def hero_label(pg):
    return flat(pg.locator(HERO + " h2 >> visible=true").first.inner_text())


def hero_kcal(pg):
    m = re.search(r"([\d.]+)\s*/\s*[\d.]+\s*kcal", pg.locator(HERO + " >> visible=true").first.inner_text())
    return m.group(1) if m else None


def day_state(pg):
    """("Cả ngày · 7 món", "1.041")"""
    return hero_label(pg), hero_kcal(pg)


def shot(pg, name, tag, full=False):
    pg.screenshot(path=str(SHOTS / f"{name}-{tag}.png"), full_page=full)


def targets_ok(locator, what):
    box = locator.first.bounding_box()
    check(box is not None and box["height"] >= 43.5 and box["width"] >= 43.5, f"{what} is a 44 px target ({box and (round(box['width']), round(box['height']))})")


def edges_ok(pg, group, what):
    """AGENTS.md alignment rule: the visible members of a data-align-group share their left and right edges within 1 px."""
    boxes = pg.evaluate(
        """(g) => [...document.querySelectorAll(`[data-align-group="${g}"]`)].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.right * 10) / 10]; })""",
        group,
    )
    ok = len(boxes) >= 2 and all(abs(b[0] - boxes[0][0]) <= 1 and abs(b[1] - boxes[0][1]) <= 1 for b in boxes)
    check(ok, f"{what}: edges of {group} match ({boxes[:6]})")


def toast_text(pg):
    return flat(pg.locator("[role=status].m-toast-host").first.inner_text())


def empty_the_day(pg):
    deleted = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
    pg.evaluate(f"() => localStorage.setItem('{SAMPLE_EDITS_KEY}', {json.dumps(deleted)})")
    home(pg)


def run(browser, width, height):
    tag = str(width)
    ctx = browser.new_context(viewport={"width": width, "height": height})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)

    # ---- save today as a template ----
    home(pg)
    full_state = day_state(pg)
    check(re.match(r"Cả ngày · \d+ món", full_state[0]) is not None, f"{tag}: the demo day has food ({full_state})")
    pg.get_by_role("button", name="Tùy chọn ngày").locator("visible=true").first.click()
    pg.wait_for_timeout(500)
    menu = pg.get_by_role("dialog").locator("visible=true").first
    items = flat(menu.inner_text())
    check("Lưu ngày này thành mẫu" in items and "Chọn nhiều món" in items, f"{tag}: the day's ⋯ offers Lưu ngày này thành mẫu ({items[:80]!r})")
    check(pg.locator("[data-tour='day-menu-save']:visible").count() == 1, f"{tag}: the save item is a tour target")
    menu.get_by_role("button", name=re.compile("Lưu ngày này thành mẫu")).click()
    pg.wait_for_timeout(700)

    save = pg.get_by_role("dialog", name="Lưu ngày này thành mẫu")
    check(save.count() == 1, f"{tag}: the save sheet opens")
    body = flat(save.inner_text())
    m = re.search(r"(\d+) món · ([\d.]+) kcal", body)
    check(m is not None, f"{tag}: the save sheet says N món · X kcal ({body[:90]!r})")
    saved_count, saved_kcal = (m.group(1), m.group(2)) if m else ("0", "0")
    check(saved_kcal == full_state[1], f"{tag}: the summary kcal is the day's ({saved_kcal} vs hero {full_state[1]})")
    check(save.locator("input#save-day-name").input_value() == "Ngày tập", f"{tag}: the name starts as Ngày tập on a training day")
    check(re.search(r"Sáng", body) is not None and "Mẫu nằm trong Khám phá › Của bạn › Ngày ăn mẫu" in body, f"{tag}: the meals and the hint are listed")
    tags = save.get_by_role("button", name=re.compile("^(Ngày tập|Ngày nghỉ|Khác)$"))
    check(tags.count() == 3 and tags.nth(0).get_attribute("aria-pressed") == "true", f"{tag}: three tags, Ngày tập picked")
    targets_ok(tags, f"{tag}: a tag")
    targets_ok(save.get_by_role("button", name="Lưu mẫu"), f"{tag}: Lưu mẫu")
    edges_ok(pg, "save-day", f"{tag} save sheet")
    shot(pg, "NMSave", tag)
    save.get_by_role("button", name="Lưu mẫu").click()
    pg.wait_for_timeout(700)
    check(save.count() == 0 or not save.first.is_visible(), f"{tag}: the sheet closes after Lưu mẫu")
    toast = toast_text(pg)
    check(f"Đã lưu Ngày tập · {saved_count} món · {saved_kcal} kcal" in toast, f"{tag}: the save toast ({toast!r})")
    shot(pg, "NMSaveToast", tag)

    # ---- Khám phá › Của bạn, the list, the editor ----
    go(pg, "/explore")
    yours = flat(pg.locator("section[aria-labelledby=explore-yours]").inner_text())
    check("Ngày ăn mẫu · 1 mẫu" in yours, f"{tag}: Của bạn has Ngày ăn mẫu · 1 mẫu ({yours[:140]!r})")
    row = pg.locator("section[aria-labelledby=explore-yours] a[href='/explore/ngay-mau']")
    check(row.count() == 1, f"{tag}: the Ngày ăn mẫu row opens its list")
    row.first.click()
    pg.wait_for_url(re.compile(r".*/explore/ngay-mau$"), timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.locator("h1:visible").count() == 1 and flat(pg.locator("h1:visible").first.inner_text()).lower() == "ngày ăn mẫu", f"{tag}: the list has one h1, Ngày ăn mẫu")
    cards = pg.locator("a[href^='/explore/ngay-mau/']:visible")
    check(cards.count() == 1, f"{tag}: one template card ({cards.count()})")
    card = flat(cards.first.inner_text())
    check("Ngày tập" in card and f"{saved_count} món · {saved_kcal} kcal" in card and "%" in card, f"{tag}: the card has the name, tag, N món · X kcal and a level % ({card!r})")
    check(pg.locator("a:visible", has_text="Tạo ngày ăn mẫu").count() == 1, f"{tag}: + Tạo ngày ăn mẫu")
    shot(pg, "NMList", tag, full=True)
    cards.first.click()
    pg.wait_for_url(re.compile(r".*/explore/ngay-mau/[^/]+$"), timeout=8000)
    pg.wait_for_timeout(900)
    check(pg.locator("h1:visible").count() == 1 and flat(pg.locator("h1:visible").first.inner_text()).lower() == "ngày tập", f"{tag}: the editor's h1 is the template's name")
    editor = flat(pg.inner_text("main")).lower()  # the section headers are upper-cased by CSS
    for text in ["Tên mẫu", "Nhãn", "Các bữa", "Tổng", "Áp dụng cho hôm nay", "Xóa mẫu"]:
        check(text.lower() in editor, f"{tag}: the editor has {text}")
    check("tự áp dụng" not in editor, f"{tag}: no Tự áp dụng section in Part A")
    edges_ok(pg, "template-editor", f"{tag} editor")
    edges_ok(pg, "template-meal-head", f"{tag} editor")
    edges_ok(pg, "template-meal-item", f"{tag} editor")
    shot(pg, "NMEditor", tag, full=True)
    # The last control of the page is the red Xóa mẫu
    last = pg.locator("main button:visible").last
    check(flat(last.inner_text()) == "Xóa mẫu", f"{tag}: Xóa mẫu is the last control ({flat(last.inner_text())!r})")
    color = last.evaluate("e => getComputedStyle(e).color")
    check(color.replace(" ", "") in ("rgb(233,21,45)",), f"{tag}: Xóa mẫu is red ({color})")
    targets_ok(last, f"{tag}: Xóa mẫu")

    # Drop a food in the draft (not saved), then rename and save
    rows_before = pg.locator("button[data-align-group='template-meal-item']:visible").count()
    pg.locator("button[data-align-group='template-meal-item']:visible").first.click()
    pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Bỏ khỏi mẫu").click()
    pg.wait_for_timeout(500)
    rows_after = pg.locator("button[data-align-group='template-meal-item']:visible").count()
    check(rows_after == rows_before - 1, f"{tag}: a food leaves the draft ({rows_before} -> {rows_after})")
    go(pg, "/explore/ngay-mau")
    check(f"{saved_count} món" in flat(pg.locator("a[href^='/explore/ngay-mau/']:visible").first.inner_text()), f"{tag}: leaving the editor without Lưu keeps the template as it was")
    pg.locator("a[href^='/explore/ngay-mau/']:visible").first.click()
    pg.wait_for_timeout(900)
    pg.locator("#tpl-name").fill("Tập nặng")
    pg.get_by_role("button", name="Lưu", exact=True).click()
    pg.wait_for_url(re.compile(r".*/explore/ngay-mau$"), timeout=8000)
    pg.wait_for_timeout(700)
    check("tập nặng" in flat(pg.inner_text("main")).lower(), f"{tag}: Lưu keeps the new name")
    check("Đã lưu Tập nặng" in toast_text(pg), f"{tag}: Lưu says so ({toast_text(pg)!r})")

    # ---- an empty day: the pill and the picker ----
    empty_the_day(pg)
    check(day_state(pg)[0] == "Cả ngày · 0 món", f"{tag}: the day is empty ({day_state(pg)})")
    pill = pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true")
    check(pill.count() == 1, f"{tag}: the Chép ngày mẫu pill is on the empty day")
    check(pg.locator("[data-tour='day-template-pill']:visible").count() == 1, f"{tag}: the pill is a tour target")
    targets_ok(pill, f"{tag}: the pill")
    hide = pg.get_by_role("button", name="Ẩn gợi ý ngày ăn mẫu hôm nay").locator("visible=true")
    targets_ok(hide, f"{tag}: the pill's ×")
    check(pg.get_by_role("button", name="Chép hôm qua").count() == 0, f"{tag}: no Chép hôm qua button of its own")
    shot(pg, "NMEmpty", tag, full=True)

    pill.first.click()
    pg.wait_for_timeout(700)
    picker = pg.get_by_role("dialog", name="Chọn ngày ăn mẫu")
    check(picker.count() == 1, f"{tag}: the pill opens Chọn ngày ăn mẫu")
    radios = picker.get_by_role("radio")
    names = [flat(r.inner_text()) for r in radios.all()]
    check(len(names) == 2 and names[0].lower().startswith("hôm qua") and names[1].lower().startswith("tập nặng"), f"{tag}: Hôm qua first, then the template ({[n[:20] for n in names]})")
    check(radios.nth(0).get_attribute("aria-checked") == "true", f"{tag}: the first card starts picked")
    yesterday_card = names[0]
    ym = re.search(r"(\d+) món · ([\d.]+) kcal", yesterday_card)
    yesterday_count, yesterday_kcal = (ym.group(1), ym.group(2)) if ym else ("0", "0")
    edges_ok(pg, "template-picker", f"{tag} picker")
    shot(pg, "NMPicker", tag)

    # The template
    radios.nth(1).click()
    pg.wait_for_timeout(300)
    check(radios.nth(1).get_attribute("aria-checked") == "true" and radios.nth(0).get_attribute("aria-checked") == "false", f"{tag}: picking a card checks only it")
    template_card = flat(radios.nth(1).inner_text())
    check(f"{saved_count} món · {saved_kcal} kcal" in template_card, f"{tag}: the card says what it adds ({template_card[:60]!r})")
    apply_button = picker.get_by_role("button", name=re.compile(r"^Chép vào "))
    check(re.match(r"Chép vào Hôm nay \d\d/\d\d$", flat(apply_button.inner_text())) is not None, f"{tag}: the button says Chép vào <day> ({flat(apply_button.inner_text())!r})")
    apply_button.click()
    pg.wait_for_timeout(900)
    copied = day_state(pg)
    check(copied == (f"Cả ngày · {saved_count} món", saved_kcal), f"{tag}: the copy added the template's foods and kcal ({copied} vs {saved_count} món, {saved_kcal})")
    toast = toast_text(pg)
    check(f"Đã chép Tập nặng · {saved_count} món" in toast and "Hoàn tác" in toast, f"{tag}: one toast with Hoàn tác ({toast!r})")
    check(pg.get_by_role("button", name="Chép ngày mẫu").count() == 0, f"{tag}: the pill goes once the day has food")
    shot(pg, "NMToast", tag)
    pg.get_by_role("button", name="Hoàn tác").locator("visible=true").first.click()
    pg.wait_for_timeout(900)
    check(day_state(pg) == ("Cả ngày · 0 món", "0"), f"{tag}: Hoàn tác leaves the day empty again ({day_state(pg)})")
    check(pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true").count() == 1, f"{tag}: the pill is back on the empty day")

    # Hôm qua, the old Chép hôm qua
    pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true").first.click()
    pg.wait_for_timeout(700)
    picker.get_by_role("radio").nth(0).click()
    picker.get_by_role("button", name=re.compile(r"^Chép vào ")).click()
    pg.wait_for_timeout(900)
    copied = day_state(pg)
    check(copied == (f"Cả ngày · {yesterday_count} món", yesterday_kcal), f"{tag}: Hôm qua copies the card's foods and kcal ({copied} vs {yesterday_count} món, {yesterday_kcal})")
    toast = toast_text(pg)
    check(re.search(r"Đã chép \d+ bữa từ hôm qua", toast) is not None and "Hoàn tác" in toast, f"{tag}: the Hôm qua toast keeps its words ({toast!r})")
    pg.get_by_role("button", name="Hoàn tác").locator("visible=true").first.click()
    pg.wait_for_timeout(900)
    check(day_state(pg) == ("Cả ngày · 0 món", "0"), f"{tag}: Hoàn tác leaves the day empty after Hôm qua too")

    # ---- the × hides the pill for that day only ----
    pg.get_by_role("button", name="Ẩn gợi ý ngày ăn mẫu hôm nay").locator("visible=true").first.click()
    pg.wait_for_timeout(600)
    check(pg.get_by_role("button", name="Chép ngày mẫu").count() == 0, f"{tag}: × hides the pill")
    line = pg.get_by_text("Chưa có món nào hôm nay").locator("visible=true")
    box = line.first.bounding_box() if line.count() else None
    check(box is not None and box["height"] >= 11, f"{tag}: the plain empty line shows instead ({box})")
    stored = json.loads(pg.evaluate(f"() => localStorage.getItem('{PILL_KEY}') || '[]'"))
    check(stored == ["2026-10-15"], f"{tag}: the hidden day is stored by date ({stored})")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("button", name="Chép ngày mẫu").count() == 0, f"{tag}: it stays hidden after a reload")
    pg.clock.set_fixed_time(NEXT_DAY)
    home(pg)
    check(pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true").count() == 1, f"{tag}: the next day shows the pill again")
    pg.clock.set_fixed_time(NOW)

    # ---- delete the template: it asks first; the picker then has Hôm qua and the empty-state line ----
    go(pg, "/explore/ngay-mau")
    pg.locator("a[href^='/explore/ngay-mau/']:visible").first.click()
    pg.wait_for_timeout(900)
    pg.get_by_role("button", name="Xóa mẫu", exact=True).click()
    pg.wait_for_timeout(600)
    confirm = pg.get_by_role("dialog").locator("visible=true").first
    check("sẽ bị xóa" in flat(confirm.inner_text()), f"{tag}: Xóa mẫu asks first ({flat(confirm.inner_text())[:80]!r})")
    confirm.get_by_role("button", name="Hủy").click()
    pg.wait_for_timeout(500)
    check(re.search(r"/explore/ngay-mau/[^/]+$", pg.url) is not None, f"{tag}: Hủy keeps the template")
    pg.get_by_role("button", name="Xóa mẫu", exact=True).click()
    pg.wait_for_timeout(600)
    pg.get_by_role("dialog").locator("visible=true").first.get_by_role("button", name="Xóa mẫu").click()
    pg.wait_for_url(re.compile(r".*/explore/ngay-mau$"), timeout=8000)
    pg.wait_for_timeout(800)
    check("Chưa có ngày ăn mẫu" in pg.inner_text("main"), f"{tag}: the list is empty after the delete")
    stored_templates = pg.evaluate(f"() => localStorage.getItem('{TEMPLATES_KEY}')")
    check(stored_templates == "[]", f"{tag}: the stored list is empty ({stored_templates})")
    go(pg, "/explore")
    check("Ngày ăn mẫu · 0 mẫu" in flat(pg.locator("section[aria-labelledby=explore-yours]").inner_text()), f"{tag}: Của bạn counts 0 mẫu")
    pg.evaluate(f"() => localStorage.removeItem('{PILL_KEY}')")
    home(pg)
    pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true").first.click()
    pg.wait_for_timeout(700)
    picker = pg.get_by_role("dialog", name="Chọn ngày ăn mẫu")
    text = flat(picker.inner_text())
    check(picker.get_by_role("radio").count() == 1 and "Chưa có ngày ăn mẫu. Ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu." in text, f"{tag}: no template: Hôm qua and the empty-state line ({text[:120]!r})")
    shot(pg, "NMPickerEmpty", tag)

    check(not errors, f"{tag}: no page errors ({errors[:2]})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run(browser, 390, 844)
        run(browser, 1280, 900)
        browser.close()
    if problems:
        print(f"ngay_mau: {len(problems)} problem(s)", file=sys.stderr)
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
