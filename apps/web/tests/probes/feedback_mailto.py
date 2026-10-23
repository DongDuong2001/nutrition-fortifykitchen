"""feat/feedback-mailto (overnight 22→23/10, job 2): Góp ý & hỗ trợ.

Demo build. Three entry points reach Gửi qua… with the right subject:
- Cài đặt › HỖ TRỢ › Góp ý & hỗ trợ (Mới until opened) › the type sheet › Báo lỗi → "[H1T MICRO] Báo lỗi"; ‹ goes back to the types;
- the food page's Báo sai số liệu → straight to Gửi qua…, "[H1T MICRO] Sai số liệu: <food>";
- + › a search with no match › Yêu cầu thêm món → "[H1T MICRO] Yêu cầu thêm món: <search words>".
Gửi qua… has the Gmail and mailto links (to, subject, body encoded), Sao chép địa chỉ email, and the body never holds the email.
Esc closes the sheet; every row is ≥ 44 px; nothing is cut at 360 px with 150 % text (the empty-search buttons included).
Screenshots at 390, 360 and 360 @ 150 %: .screenshots/feedback-{settings,types,send,food,empty}-<size>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/feedback_mailto.py
"""
# PROBE_COVERS: app/(app)/(tabs)/settings/** app/(app)/foods/** app/(app)/add/** components/feedback/** components/settings/** components/foods/food-empty-state.tsx lib/feedback.ts
import json
import os
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
TEXT = "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '%d%%'; });"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, width, text=100):
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    if text != 100:
        ctx.add_init_script(TEXT % text)
    return ctx, ctx.new_page()


def dialog(pg):
    return pg.locator("[role=dialog]:has(#feedback-title)").last


def subject(pg):
    href = dialog(pg).get_by_role("link", name="Gmail").get_attribute("href") or ""
    q = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
    return q.get("su", [""])[0], q.get("body", [""])[0], q.get("to", [""])[0]


def cut(pg, scope):
    return pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel + ' *')].filter((e) => e.children.length === 0 && e.textContent.trim() && e.clientWidth > 1 && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent.trim().slice(0, 30))""",
        scope,
    )


def run(browser, width, text):
    tag = f"{width}" + ("" if text == 100 else f"-{text}")
    ctx, pg = new_page(browser, width, text)
    # 1. Cài đặt
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(800)
    row = pg.get_by_role("button", name="Góp ý & hỗ trợ")
    check(row.count() == 1, f"{tag}: Cài đặt has Góp ý & hỗ trợ")
    check("Mới" in row.inner_text(), f"{tag}: with Mới before it is opened")
    check(pg.locator("section[aria-label='Hỗ trợ']").get_by_text("Nguồn dữ liệu").count() == 1, f"{tag}: Nguồn dữ liệu sits in HỖ TRỢ")
    pg.screenshot(path=str(SHOTS / f"feedback-settings-{tag}.png"), full_page=True)
    row.click()
    dialog(pg).wait_for(state="visible")
    pg.wait_for_timeout(500)
    for name in ("Báo lỗi", "Sai số liệu", "Yêu cầu thêm món", "Góp ý", "Khiếu nại"):
        b = dialog(pg).get_by_role("button", name=name, exact=False).first
        bb = b.bounding_box()
        check(bb is not None and bb["height"] >= 44, f"{tag}: {name} row is ≥ 44 px ({bb and round(bb['height'])})")
    pg.screenshot(path=str(SHOTS / f"feedback-types-{tag}.png"))
    dialog(pg).get_by_role("button", name="Báo lỗi").first.click()
    pg.wait_for_timeout(600)
    su, body, to = subject(pg)
    check(su == "[H1T MICRO] Báo lỗi", f"{tag}: Cài đặt › Báo lỗi subject ({su!r})")
    check(to == "kermythemenace@gmail.com" and "@" not in body, f"{tag}: sent to the support address; the body has no email")
    mailto = dialog(pg).get_by_role("link", name="Ứng dụng Mail").get_attribute("href") or ""
    check(mailto.startswith("mailto:kermythemenace@gmail.com?subject=") and "+" not in mailto, f"{tag}: the mailto link is encoded with %20")
    check(dialog(pg).get_by_role("button", name="Sao chép địa chỉ email").count() == 1, f"{tag}: Sao chép địa chỉ email")
    check(not cut(pg, "[role=dialog]"), f"{tag}: nothing cut in Gửi qua… ({cut(pg, '[role=dialog]')})")
    pg.screenshot(path=str(SHOTS / f"feedback-send-{tag}.png"))
    dialog(pg).get_by_role("button", name="Quay lại").click()
    pg.wait_for_timeout(600)
    check(dialog(pg).get_by_role("button", name="Khiếu nại").count() == 1, f"{tag}: ‹ goes back to the types")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)
    check(pg.locator("[role=dialog]:visible").count() == 0, f"{tag}: Esc closes the sheet")
    check("Mới" not in pg.get_by_role("button", name="Góp ý & hỗ trợ").inner_text(), f"{tag}: Mới goes once it was opened")

    # 2. The food page
    pg.goto(BASE + "/foods/food-uc-ga", wait_until="networkidle")
    pg.wait_for_timeout(800)
    link = pg.get_by_role("button", name="Báo sai số liệu")
    lb = link.bounding_box()
    check(lb is not None and lb["height"] >= 44, f"{tag}: Báo sai số liệu has a 44 px tap area ({lb})")
    name = pg.locator("h1").first.inner_text().strip()
    link.scroll_into_view_if_needed()
    pg.screenshot(path=str(SHOTS / f"feedback-food-{tag}.png"))
    link.click()
    dialog(pg).wait_for(state="visible")
    pg.wait_for_timeout(600)
    su, _, _ = subject(pg)
    check(su.startswith("[H1T MICRO] Sai số liệu: ") and name.lower()[:6] in su.lower(), f"{tag}: food page → Sai số liệu with the food ({su!r}, {name!r})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)

    # 3. An empty search
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    pg.locator("[data-add-panel] input").first.fill("bánh đúc nóng xyz")
    pg.wait_for_timeout(900)
    req = pg.get_by_role("button", name="Yêu cầu thêm món")
    check(req.count() == 1 and pg.get_by_role("link", name="Tự nhập").count() == 1, f"{tag}: an empty search offers Tự nhập and Yêu cầu thêm món")
    check(pg.get_by_role("link", name="Tạo món mới").count() == 0, f"{tag}: no second Tạo món mới under them")
    check(not cut(pg, "[data-add-panel]"), f"{tag}: nothing cut in the empty search ({cut(pg, '[data-add-panel]')})")
    pg.screenshot(path=str(SHOTS / f"feedback-empty-{tag}.png"))
    req.click()
    dialog(pg).wait_for(state="visible")
    pg.wait_for_timeout(600)
    su, _, _ = subject(pg)
    check(su == "[H1T MICRO] Yêu cầu thêm món: bánh đúc nóng xyz", f"{tag}: empty search → Yêu cầu thêm món with the words ({su!r})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        for width, text in ((390, 100), (360, 100), (360, 150)):
            run(browser, width, text)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
