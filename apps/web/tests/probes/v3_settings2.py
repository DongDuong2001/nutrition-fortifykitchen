"""feat/v3-redesign: Cài đặt part 2 in the V3 layout (Mục tiêu, Đa lượng, Ngôn ngữ, Nhắc nhở, Nguồn dữ liệu, Có gì mới, Xóa tài khoản).

- Mục tiêu: a dot and a coloured value on every row, the big kcal, the two buttons.
- Đa lượng: Huỷ / Lưu in the header, − and + move the percent, the slider takes arrow keys, a preset marks itself pressed, the save still lands on Mục tiêu.
- Ngôn ngữ: only the options the app has (no "Theo điện thoại"), a choice is saved.
- Nhắc nhở: "Bật quyền thông báo" opens the pre-permission step first; "Để sau" goes back without asking the browser; "Bật thông báo" asks.
- Có gì mới: a section header and the tour note per release; Xóa tài khoản: Hủy first, the destructive button disabled until the word is typed.
"""
# PROBE_COVERS: app/(app)/settings/targets/** app/(app)/settings/language/** app/(app)/settings/notifications/** app/(app)/settings/data-sources/** app/(app)/settings/whats-new/** app/(app)/settings/delete-account/** components/settings/macro-targets-screen.tsx components/settings/targets-screen.tsx components/data-sources/** components/whats-new/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
NOW = "2026-10-15T10:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, w=390, h=844):
    ctx = browser.new_context(viewport={"width": w, "height": h})
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.locator("h1").first.wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(300)


def test_targets(browser):
    ctx, pg, errors = new_page(browser)
    go(pg, "/settings/targets")
    check(pg.locator("main section [aria-hidden='true'].rounded-full").count() >= 25, "targets: every row has a dot")
    check(pg.locator("main").inner_text().count("2.275") == 1, "targets: the kcal shows once")
    check(pg.get_by_role("link", name="Tùy chỉnh tỉ lệ đa lượng").count() == 1, "targets: primary button")
    check(pg.get_by_role("link", name="Sửa trong Hồ sơ").count() == 1, "targets: secondary button")
    check(not errors, f"targets: no console errors {errors[:2]}")
    ctx.close()


def test_macros(browser):
    ctx, pg, errors = new_page(browser)
    go(pg, "/settings/targets/macros")
    check(pg.locator("header a:has-text('Huỷ')").count() == 1, "macros: Huỷ on the leading side")
    check(pg.locator("header button:has-text('Lưu')").count() == 1, "macros: Lưu in the header")
    check(pg.locator("[role='group'][aria-label='Cách chia đa lượng'] button").count() == 3, "macros: three modes")
    pg.get_by_role("button", name="Cân bằng (25/55/20)").click()
    pg.get_by_role("button", name="Tăng cơ cao đạm (30/45/25)").click()
    check(pg.get_by_role("button", name="Tăng cơ cao đạm (30/45/25)").get_attribute("aria-pressed") == "true", "macros: the chosen preset is pressed")
    pct = pg.get_by_label("Tỉ lệ phần trăm đạm", exact=True)
    check(pct.input_value() == "30", "macros: preset sets 30")
    pg.get_by_role("button", name="Giảm tỉ lệ phần trăm đạm").click()
    check(pct.input_value() == "29", "macros: − steps down")
    check(pg.locator("main").inner_text().count("Tổng 99%") == 1, "macros: the total follows (99%)")
    check(pg.locator("header button:has-text('Lưu')").is_disabled(), "macros: Lưu is off while the total is not 100")
    pg.get_by_role("button", name="Tăng tỉ lệ phần trăm đạm").click()
    slider = pg.get_by_role("slider", name="Tỉ lệ đạm")
    slider.focus()
    pg.keyboard.press("ArrowRight")
    check(pct.input_value() == "31", "macros: the slider takes the arrow keys")
    pg.keyboard.press("ArrowLeft")
    check(slider.get_attribute("aria-valuenow") == "30", "macros: slider value")
    box = slider.bounding_box()
    pg.mouse.click(box["x"] + box["width"] * 0.5, box["y"] + box["height"] / 2)
    check(40 <= int(pct.input_value()) <= 45, f"macros: a tap on the track moves the value ({pct.input_value()})")
    pg.get_by_role("button", name="Tăng cơ cao đạm (30/45/25)").click()
    pg.locator("header button:has-text('Lưu')").click()
    pg.wait_for_url("**/settings/targets", timeout=5000)
    check(True, "macros: Lưu goes back to Mục tiêu")
    check(not errors, f"macros: no console errors {errors[:2]}")
    ctx.close()


def test_language(browser):
    ctx, pg, errors = new_page(browser)
    go(pg, "/settings/language")
    check("Theo điện thoại" not in pg.locator("main").inner_text(), "language: no 'Theo điện thoại'")
    check(pg.get_by_role("radio").count() == 6, "language: six radios (the options the app has)")
    pg.get_by_role("radio", name="English").click()
    check(pg.get_by_role("radio", name="English").get_attribute("aria-checked") == "true", "language: a choice is checked")
    pg.reload(wait_until="networkidle")
    check(pg.get_by_role("radio", name="English").get_attribute("aria-checked") == "true", "language: and kept")
    check(not errors, f"language: no console errors {errors[:2]}")
    ctx.close()


def test_notifications(browser):
    ctx, pg, errors = new_page(browser)
    pg.add_init_script(
        "window.__asked = 0; window.Notification = function(){}; window.Notification.permission = 'default';"
        "window.Notification.requestPermission = () => { window.__asked++; return Promise.resolve('granted'); };"
    )
    go(pg, "/settings/notifications")
    pg.get_by_role("button", name="Bật quyền thông báo").click()
    pg.get_by_role("heading", name="Nhận nhắc ghi bữa ăn").wait_for(state="visible", timeout=4000)
    check(pg.evaluate("window.__asked") == 0, "notifications: the browser is not asked before the step is answered")
    pg.get_by_role("button", name="Để sau").click()
    check(pg.get_by_role("button", name="Bật quyền thông báo").count() == 1, "notifications: Để sau goes back to the list")
    check(pg.evaluate("window.__asked") == 0, "notifications: Để sau never asks the browser")
    pg.get_by_role("button", name="Bật quyền thông báo").click()
    pg.get_by_role("button", name="Bật thông báo", exact=True).click()
    pg.wait_for_timeout(300)
    check(pg.evaluate("window.__asked") == 1, "notifications: Bật thông báo asks the browser once")
    check("Đã bật quyền thông báo" in pg.locator("main").inner_text(), "notifications: the answer shows on the list")
    check(pg.get_by_role("switch").count() == 5, "notifications: five switches")
    check(not errors, f"notifications: no console errors {errors[:2]}")
    ctx.close()


def test_whats_new_and_sources(browser):
    ctx, pg, errors = new_page(browser)
    go(pg, "/settings/whats-new")
    check(pg.locator("header").inner_text().count("Cập nhật gần nhất") == 1, "whats-new: the latest date under the title")
    check(pg.get_by_text("bước trên Hôm nay. Bạn bỏ qua được ở mọi bước.").count() >= 1, "whats-new: the tour note")
    go(pg, "/settings/data-sources")
    check(pg.locator("article").count() == 5, "data-sources: four sources and the reading guide")
    ctx.close()


def test_delete(browser):
    ctx, pg, errors = new_page(browser)
    go(pg, "/settings/delete-account")
    destroy = pg.get_by_role("button", name="Xóa tài khoản")
    check(destroy.is_disabled(), "delete: the destructive button starts disabled")
    boxes = [pg.get_by_role("link", name="Hủy").bounding_box(), destroy.bounding_box()]
    check(boxes[0]["y"] < boxes[1]["y"], "delete: Hủy comes before the destructive button")
    bg = pg.get_by_role("link", name="Hủy").evaluate("e => getComputedStyle(e).backgroundColor")
    dbg = destroy.evaluate("e => getComputedStyle(e).backgroundColor")
    check(bg != dbg and dbg == "rgb(255, 255, 255)", f"delete: the destructive button is not the filled one ({dbg})")
    pg.get_by_label("Gõ Xóa để xác nhận").fill("Xóa")
    check(destroy.is_enabled(), "delete: the word the screen asks for unlocks it")
    check(not errors, f"delete: no console errors {errors[:2]}")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for t in (test_targets, test_macros, test_language, test_notifications, test_whats_new_and_sources, test_delete):
            try:
                t(browser)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{t.__name__}: {e}")
        browser.close()
    for n in notes:
        print(n)
    for p in problems:
        print("FAIL: " + p, file=sys.stderr)
    if problems:
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
