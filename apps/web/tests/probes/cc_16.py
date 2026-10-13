"""cc-16: Cài đặt, Hồ sơ and Mục tiêu mỗi ngày (IA v2 step 3).

Cài đặt has the profile card, Mục tiêu row, Ứng dụng, Pro, Tài khoản and the danger zone. Hồ sơ has the body and
goal cards (birth year as a FormRow once opened) and links to targets. Mục tiêu is read-only and shows the coach
values from lib/targets.ts with the VN 2016 values marked *. Rows in one card share left and right edges.
Checks at 390 and 1280; screenshots to .screenshots/cc-16-*.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_16.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 900}
EDGE_TOLERANCE = 1.0

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def edges_by_card(pg, group):
    # Rows are compared inside their own card (section). Two columns on desktop do not have to line up.
    return pg.evaluate(
        """(group) => Array.from(document.querySelectorAll(`[data-align-group="${group}"]`)).map((el) => {
            const card = el.closest('section') || el.parentElement;
            const r = el.getBoundingClientRect();
            const c = card.getBoundingClientRect();
            return {
                card: card.getAttribute('aria-label') || card.getAttribute('aria-labelledby') || card.id || card.textContent.slice(0, 20),
                left: r.left, right: r.right, width: r.width, cardLeft: c.left, cardRight: c.right,
            };
        })""",
        group,
    )


def check_edges(pg, group, label):
    items = [e for e in edges_by_card(pg, group) if e["width"] > 0]
    check(len(items) >= 1, f"{label}: {group} has {len(items)} members")
    by_card = {}
    for e in items:
        by_card.setdefault(e["card"], []).append(e)
        check(
            e["left"] >= e["cardLeft"] - EDGE_TOLERANCE and e["right"] <= e["cardRight"] + EDGE_TOLERANCE,
            f"{label}: {group} row sits inside its card ({e['card']!r})",
        )
    for card, rows in by_card.items():
        if len(rows) < 2:
            continue
        lefts = [e["left"] for e in rows]
        rights = [e["right"] for e in rows]
        check(max(lefts) - min(lefts) <= EDGE_TOLERANCE, f"{label}: {group} left edges within 1 px in {card!r}")
        check(max(rights) - min(rights) <= EDGE_TOLERANCE, f"{label}: {group} right edges within 1 px in {card!r}")


def no_horizontal_scroll(pg, label):
    overflow = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{label}: no horizontal scroll (overflow {overflow})")


def small_targets(pg, label):
    small = pg.evaluate(
        """() => Array.from(document.querySelectorAll('main a, main button')).filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.height < 44 || r.width < 44);
        }).map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40))"""
    )
    check(not small, f"{label}: every tap target in main is 44 px ({small[:3]})")


def page_errors(pg, label):
    errors = []
    pg.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    return errors


def open_page(browser, size, path):
    context = browser.new_context(viewport=size)
    pg = context.new_page()
    errors = page_errors(pg, path)
    pg.goto(BASE + path)
    pg.wait_for_load_state("networkidle")
    return context, pg, errors


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in (("390", PHONE), ("1280", DESKTOP)):
            label = size_name

            # Cài đặt (the tab)
            context, pg, errors = open_page(browser, size, "/settings")
            pg.wait_for_selector("h1:has-text('Cài đặt')")
            body = pg.inner_text("main")
            for text in ["Hồ sơ của bạn", "Mục tiêu mỗi ngày", "Ngôn ngữ", "Nhắc nhở", "Thêm vào màn hình chính", "Tài khoản", "Vùng nguy hiểm", "Xoá tài khoản"]:
                check(text in body, f"{label} /settings shows {text!r}")
            check("Nam · sinh 2003 · 65 kg · Giữ cân" in body, f"{label} /settings profile sub reads Nam · sinh 2003 · 65 kg · Giữ cân")
            check("1.950–2.275 kcal · đạm 104–143 g" in body, f"{label} /settings targets sub reads kcal and đạm")
            check(pg.locator("a[href='/settings/profile']").count() >= 1, f"{label} /settings links to /settings/profile")
            check(pg.locator("a[href='/settings/targets']").count() >= 1, f"{label} /settings links to /settings/targets")
            check(pg.locator("a[href='/settings/delete-account']").count() >= 1, f"{label} /settings links to delete-account")
            check_edges(pg, "settings-row", f"{label} /settings")
            no_horizontal_scroll(pg, f"{label} /settings")
            small_targets(pg, f"{label} /settings")
            check(not errors, f"{label} /settings has no console errors ({errors[:2]})")
            pg.screenshot(path=os.path.join(SHOTS, f"cc-16-settings-{size_name}.png"), full_page=True)
            context.close()

            # Hồ sơ (pushed)
            context, pg, errors = open_page(browser, size, "/settings/profile")
            pg.wait_for_selector("h1:has-text('Hồ sơ')")
            body = pg.inner_text("main")
            check("Giới tính" in body and "Cân nặng" in body and "Năm sinh" in body, f"{label} /settings/profile shows sex, birth year and weight")
            check("Mục tiêu" in body and "Ngày tập mặc định" in body, f"{label} /settings/profile shows goal and training default")
            check(pg.locator("a[href='/settings/targets']").count() >= 1, f"{label} /settings/profile links to /settings/targets")
            check(pg.locator("a[href='/settings/profile/weight']").count() >= 1, f"{label} /settings/profile links to the weight page")
            back = pg.get_attribute("a[aria-label='Quay lại']", "href")
            check(back == "/settings", f"{label} /settings/profile back goes to /settings ({back})")
            # Birth year: opening the row shows a labelled input, and typing a valid year keeps it
            pg.click("button:has-text('Năm sinh'), a:has-text('Năm sinh')")
            field = pg.locator("#profile-birth-year")
            check(field.count() == 1, f"{label} birth year opens an input")
            label_for = pg.evaluate("() => { const l = document.querySelector('label[for=\"profile-birth-year\"]'); return l ? l.textContent.trim() : null; }")
            check(label_for == "Năm sinh", f"{label} birth year label is linked to its input ({label_for})")
            check_edges(pg, "profile-row", f"{label} /settings/profile")
            no_horizontal_scroll(pg, f"{label} /settings/profile")
            small_targets(pg, f"{label} /settings/profile")
            check(not errors, f"{label} /settings/profile has no console errors ({errors[:2]})")
            pg.screenshot(path=os.path.join(SHOTS, f"cc-16-profile-{size_name}.png"), full_page=True)
            context.close()

            # Mục tiêu mỗi ngày (read-only)
            context, pg, errors = open_page(browser, size, "/settings/targets")
            pg.wait_for_selector("h1:has-text('Mục tiêu mỗi ngày')")
            body = pg.inner_text("main")
            for text in ["1.950–2.275 kcal", "Giữ cân: 30–35 kcal/kg × 65 kg", "104–143 g", "33–65 g", "254 g", "30–40 g", "7–10,5 g", "5.200–6.500 mg", "1.200–1.500 mg", "600–750 mg", "8 mg", "12 mg", "Vitamin A", "650 µg", "Selen", "34 µg"]:
                check(text in body, f"{label} /settings/targets shows {text!r}")
            check("* Khuyến nghị dinh dưỡng Việt Nam 2016" in body, f"{label} /settings/targets has the VN 2016 footnote")
            check(pg.locator("main input, main select, main textarea").count() == 0, f"{label} /settings/targets has no inputs (read-only)")
            check(pg.locator("a[href='/settings/profile']:has-text('Sửa trong Hồ sơ')").count() == 1, f"{label} /settings/targets has one 'Sửa trong Hồ sơ' link")
            check_edges(pg, "targets-row", f"{label} /settings/targets")
            no_horizontal_scroll(pg, f"{label} /settings/targets")
            small_targets(pg, f"{label} /settings/targets")
            check(not errors, f"{label} /settings/targets has no console errors ({errors[:2]})")
            pg.screenshot(path=os.path.join(SHOTS, f"cc-16-targets-{size_name}.png"), full_page=True)
            context.close()

        browser.close()

    for line in notes:
        print(line)
    for line in problems:
        print("FAIL: " + line)
    print(f"cc-16: {len(notes)} ok, {len(problems)} FAIL")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
