"""cc-27d: data sources on foods.

Production build, demo mode, 390x844 and 1440x900.
- /foods/[id] of a proxy food: amber "Ước tính" tag in the header; the source opens the "Nguồn dữ liệu" sheet with
  the amber notice and the rows Nguồn, Mã món gốc, Có dữ liệu, Độ khớp; "Xem tất cả nguồn dữ liệu" links to
  /settings/data-sources; Đóng and Esc close and focus returns to the source button.
- A USDA food: no tag, no notice; Mã món gốc is a link to FoodData Central in a new tab (rel noopener).
- /add: the tag per row (USDA, Nhãn, VN, Ước tính, Của tôi, Chưa rõ) shows on search results only.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27d.py
"""
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []
NOTICE = "Ước tính. Chưa có dữ liệu riêng của món này, nên đang dùng số của món tương tự. Số thật có thể khác một chút."


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def run(browser, size, tag):
    w = size["width"]
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))

    # proxy food
    pg.goto(BASE + "/foods/food-bun-bo-hue", wait_until="networkidle")
    pg.wait_for_timeout(400)
    header = pg.locator("header").first
    check(header.get_by_text("Ước tính", exact=True).count() == 1, f"{tag} proxy: the Ước tính tag is in the header")
    bg = header.get_by_text("Ước tính", exact=True).evaluate("e => getComputedStyle(e).backgroundColor")
    check(bg == "rgb(255, 244, 224)", f"{tag} proxy: the tag is amber (warning-bg) {bg}")
    src = header.get_by_role("button", name="Bảng TPDD Việt Nam")
    box = src.bounding_box()
    check(box["height"] >= 43.5, f"{tag} proxy: the source is a 44 px control ({box['height']:.0f})")
    src.click()
    dlg = pg.get_by_role("dialog", name="Nguồn dữ liệu")
    dlg.wait_for(state="visible", timeout=4000)
    text = re.sub(r"\s+", " ", dlg.inner_text())
    check(NOTICE in text, f"{tag} proxy: the amber notice")
    notice_bg = dlg.get_by_role("note").evaluate("e => getComputedStyle(e).backgroundColor")
    check(notice_bg == "rgb(255, 244, 224)", f"{tag} proxy: notice is amber {notice_bg}")
    for label in ["Nguồn", "Mã món gốc", "Có dữ liệu", "Độ khớp"]:
        check(dlg.locator("dt", has_text=re.compile(rf"^{label}$")).count() == 1, f"{tag} proxy: row {label}")
    check(re.search(r"\d+/22 vi chất · các chất còn lại hiện “—”", text) is not None, f"{tag} proxy: coverage row ({text[:200]})")
    check("Ước tính · món tương tự" in text and "Chính xác đúng món" in text and "Gần đúng cùng món, khác cách chế biến" in text, f"{tag} proxy: match row and its three levels")
    link = dlg.get_by_role("link", name="Xem tất cả nguồn dữ liệu")
    check(link.get_attribute("href") == "/settings/data-sources", f"{tag} proxy: link to all sources")
    check(link.bounding_box()["height"] >= 43.5, f"{tag} proxy: the link is 44 px")
    close = dlg.get_by_role("button", name="Đóng")
    check(close.bounding_box()["height"] >= 43.5, f"{tag} proxy: Đóng is 44 px")
    if size["width"] >= 1024:
        d = dlg.bounding_box()
        check(d["width"] <= 440 and d["x"] > 100, f"{tag} proxy: a centred dialog on desktop ({d['x']:.0f}, {d['width']:.0f})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27d-proxy-sheet-{w}.png"))
    check(len({round(b["x"]) for b in [e.bounding_box() for e in dlg.locator("[data-align-group=source-row]").all()]}) == 1, f"{tag} proxy: rows share their left edge")
    close.click()
    pg.wait_for_timeout(300)
    check(pg.get_by_role("dialog").count() == 0, f"{tag} proxy: Đóng closes")
    check(pg.evaluate("document.activeElement?.textContent?.trim()") == "Bảng TPDD Việt Nam", f"{tag} proxy: focus returns to the source")
    src.click()
    pg.get_by_role("dialog", name="Nguồn dữ liệu").wait_for(state="visible")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(pg.get_by_role("dialog").count() == 0, f"{tag} proxy: Esc closes")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27d-proxy-header-{w}.png"))

    # USDA food
    pg.goto(BASE + "/foods/food-cha-la", wait_until="networkidle")
    pg.wait_for_timeout(400)
    check(pg.locator("header").first.get_by_text("Ước tính", exact=True).count() == 0, f"{tag} USDA: no Ước tính tag")
    pg.locator("header").first.get_by_role("button", name="USDA").click()
    dlg = pg.get_by_role("dialog", name="Nguồn dữ liệu")
    dlg.wait_for(state="visible")
    check(dlg.get_by_role("note").count() == 0, f"{tag} USDA: no amber notice")
    id_link = dlg.get_by_role("link", name="FDC 168191")
    check(id_link.count() == 1, f"{tag} USDA: the original id is a link")
    check(id_link.get_attribute("href") == "https://fdc.nal.usda.gov/food-details/168191/nutrients", f"{tag} USDA: link target")
    check(id_link.get_attribute("target") == "_blank" and "noopener" in (id_link.get_attribute("rel") or ""), f"{tag} USDA: new tab, noopener")
    check("SR Legacy" in dlg.inner_text(), f"{tag} USDA: database named")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27d-usda-sheet-{w}.png"))
    pg.keyboard.press("Escape")

    # /add: tags on search results only
    pg.goto(BASE + "/add?meal=snack", wait_until="networkidle")
    pg.wait_for_timeout(500)
    root = pg.locator('[role="dialog"]:visible').first
    tags_before = root.locator("[data-food-row] >> text=/^(USDA|Nhãn|VN|Ước tính|Của tôi|Chưa rõ)$/").count()
    check(tags_before == 0, f"{tag} /add: no tags on the grouped list ({tags_before})")
    field = root.get_by_label("Tìm món")
    field.fill("bún bò")
    pg.wait_for_timeout(500)
    row = root.locator("[data-food-row]").filter(has_text="Bún bò Huế").first
    check(row.count() == 1, f"{tag} /add: search finds Bún bò Huế")
    check(row.get_by_text("Ước tính", exact=True).count() == 1, f"{tag} /add: proxy row says Ước tính")
    field.fill("phở")
    pg.wait_for_timeout(500)
    row = root.locator("[data-food-row]").filter(has_text="Phở bò").first
    check(row.get_by_text("VN", exact=True).count() == 1, f"{tag} /add: VN food row says VN")
    field.fill("chuối")
    pg.wait_for_timeout(500)
    row = root.locator("[data-food-row]").filter(has_text="Chuối").first
    check(row.get_by_text("USDA", exact=True).count() == 1, f"{tag} /add: USDA food row says USDA")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27d-add-search-{w}.png"))
    field.fill("củ dền")
    pg.wait_for_timeout(500)
    row = root.locator("[data-food-row]").filter(has_text="Bột củ dền").first
    if row.count():
        check(row.get_by_text("Của tôi", exact=True).count() == 1, f"{tag} /add: own food says Của tôi")
    check(not [e for e in errors if "preloaded using link preload" not in e], f"{tag}: no console errors {errors[:1]}")
    sc = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(sc <= 0, f"{tag}: no horizontal scroll ({sc})")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1440, "height": 900}, "1440")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
