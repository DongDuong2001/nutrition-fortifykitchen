"""feat/documents: Tài liệu (Cài đặt › Hỗ trợ › Tài liệu). HLV Khánh writes, a learner reads with the coach's code.

Demo build (mock mode: documents and codes live in this browser's localStorage, one context so the coach and the learner
share them). At 390 and 1280:
- Cài đặt has the Tài liệu row; /documents shows its header and the list (or Chưa có tài liệu);
- the coach (?as=coach) has Thêm tài liệu, Tải lên tệp and the code card: Thêm tài liệu with a name and text saves it (toast
  "Đã lưu probe-rules.md"), a row opens the editor and an edit is saved; Tạo mã mới shows a 10-symbol code once;
- a learner (?as=user0) has no editor, no upload and no code card: Nhập mã truy cập (≥ 44 px) refuses an empty and a wrong code,
  takes the coach's code in lower case, and a row then opens the protected reader: the text is there, there is no textarea, it
  cannot be selected (user-select none), a copy event is cancelled, the reader's watermark is on it and it blurs on window blur;
- a reload keeps the learner unlocked; the coach revokes the code (toast "Đã thu hồi mã") and the learner's next open is refused in
  place and locks the tab again.
Screenshots: .screenshots/documents-{coach,code,reader}-<width>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/documents.py
"""
# PROBE_COVERS: app/(app)/documents/** components/documents/** lib/documents.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
DOC = "probe-rules.md"
FIRST = "# Quy tắc\n\nDòng 1\n"
EDITED = "# Quy tắc\n\nDòng 1\nDòng 2\n"
CARD = "section[aria-labelledby='documents-codes-title']"
LIST = "section[aria-label='Danh sách tài liệu']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def dialog(pg, title_id):
    return pg.locator(f"[role=dialog]:has(#{title_id})").last


def go(pg, persona):
    pg.goto(f"{BASE}/documents?as={persona}", wait_until="networkidle")
    pg.wait_for_timeout(900)


def run(browser, width):
    tag = str(width)
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=1, is_mobile=width < 1024, has_touch=width < 1024)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    # 1. Cài đặt › Tài liệu
    pg.goto(BASE + "/settings?as=user0", wait_until="networkidle")
    row = pg.locator("section[aria-label='Hỗ trợ']").get_by_role("link", name="Tài liệu")
    check(row.count() == 1, f"{tag}: Cài đặt › Hỗ trợ has the Tài liệu row")
    row.click()
    pg.wait_for_url("**/documents")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("heading", name="Tài liệu").count() >= 1, f"{tag}: /documents has its header")

    # 2. The coach adds a document, edits it, makes a code
    go(pg, "coach")
    check(pg.get_by_role("button", name="Tải lên tệp").count() == 1, f"{tag}: the coach can upload")
    pg.get_by_role("button", name="Thêm tài liệu").click()
    editor = dialog(pg, "documents-document-title")
    editor.wait_for(state="visible")
    editor.locator("#documents-new-name").fill(DOC)
    editor.locator("#documents-editor").fill(FIRST)
    editor.get_by_role("button", name="Lưu").click()
    pg.get_by_text(f"Đã lưu {DOC}").wait_for(state="visible")
    check(True, f"{tag}: Thêm tài liệu saves {DOC}")
    pg.locator(LIST).get_by_role("button", name=DOC).click()
    area = dialog(pg, "documents-document-title").locator("#documents-editor")
    area.wait_for(state="visible")
    check(area.input_value() == FIRST, f"{tag}: the coach's editor holds the text")
    area.fill(EDITED)
    dialog(pg, "documents-document-title").get_by_role("button", name="Lưu").click()
    pg.get_by_text(f"Đã lưu {DOC}").last.wait_for(state="visible")
    pg.wait_for_timeout(500)
    card = pg.locator(CARD)
    card.get_by_role("button", name="Tạo mã mới").click()
    shown = card.get_by_label("Mã truy cập mới")
    shown.wait_for(state="visible")
    code = shown.inner_text().strip()
    check(re.fullmatch(r"[A-HJ-NP-Z2-9]{10}", code) is not None, f"{tag}: the new code is 10 symbols ({code})")
    pg.screenshot(path=str(SHOTS / f"documents-coach-{tag}.png"), full_page=True)

    # 3. A learner: no writing tools; the code
    go(pg, "user0")
    check(pg.get_by_role("button", name="Thêm tài liệu").count() == 0 and pg.get_by_role("button", name="Tải lên tệp").count() == 0, f"{tag}: a learner cannot add or upload")
    check(pg.locator(CARD).count() == 0, f"{tag}: a learner has no code card")
    unlock = pg.get_by_role("button", name="Nhập mã truy cập")
    bb = unlock.bounding_box()
    check(bb is not None and bb["height"] >= 44, f"{tag}: Nhập mã truy cập is ≥ 44 px ({bb and round(bb['height'])})")
    # Tapping a row while locked asks for the code, then opens that row
    pg.locator(LIST).get_by_role("button", name=DOC).click()
    sheet = dialog(pg, "documents-code-title")
    sheet.wait_for(state="visible")
    pg.wait_for_timeout(400)
    sheet.get_by_role("button", name="Mở khóa").click()
    check(sheet.get_by_text("Nhập mã truy cập").count() >= 1, f"{tag}: an empty code is refused")
    sheet.locator("#documents-code").fill("WRONGCODE2")
    sheet.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_timeout(400)
    check(sheet.get_by_text("Mã truy cập không đúng").count() == 1, f"{tag}: a wrong code is refused")
    pg.screenshot(path=str(SHOTS / f"documents-code-{tag}.png"))
    sheet.locator("#documents-code").fill(code.lower())
    sheet.get_by_role("button", name="Mở khóa").click()

    # 4. The protected reader
    reader = dialog(pg, "documents-document-title")
    protected = reader.locator("[data-protected]")
    protected.wait_for(state="visible")
    check("Dòng 2" in protected.inner_text(), f"{tag}: the learner reads the coach's edited text")
    check(reader.locator("textarea").count() == 0, f"{tag}: the learner has no editor")
    check(protected.evaluate("e => getComputedStyle(e).userSelect") == "none", f"{tag}: the text cannot be selected")
    cancelled = protected.evaluate("e => { const ev = new ClipboardEvent('copy', { bubbles: true, cancelable: true }); e.dispatchEvent(ev); return ev.defaultPrevented; }")
    check(cancelled, f"{tag}: a copy is cancelled")
    check(protected.get_by_text(re.compile(r"·")).count() > 0, f"{tag}: the reader's watermark is on the text")
    pg.evaluate("window.dispatchEvent(new Event('blur'))")
    pg.wait_for_timeout(200)
    check("blur-md" in (protected.locator("> div").first.get_attribute("class") or ""), f"{tag}: the text blurs when the window loses focus")
    pg.evaluate("window.dispatchEvent(new Event('focus'))")
    pg.wait_for_timeout(400)
    check("blur-md" not in (protected.locator("> div").first.get_attribute("class") or ""), f"{tag}: the text is clear again when the window is back")
    pg.screenshot(path=str(SHOTS / f"documents-reader-{tag}.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    # 5. A reload keeps the unlock; a revoked code locks it again
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(pg.get_by_text("Đã mở khóa. Chạm một tài liệu để đọc.").count() == 1, f"{tag}: still unlocked after a reload")
    go(pg, "coach")
    pg.locator(CARD).get_by_role("button", name=re.compile("^Thu hồi")).first.click()
    pg.get_by_text("Đã thu hồi mã").wait_for(state="visible")
    check(True, f"{tag}: Thu hồi says Đã thu hồi mã")
    go(pg, "user0")
    pg.locator(LIST).get_by_role("button", name=DOC).click()
    reader = dialog(pg, "documents-document-title")
    reader.get_by_text("Không mở được tài liệu").wait_for(state="visible")
    check(reader.get_by_text("đã bị thu hồi").count() == 1, f"{tag}: a revoked code is refused in place")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check(pg.get_by_role("button", name="Nhập mã truy cập").count() == 1, f"{tag}: the tab is locked again")

    check(not errors, f"{tag}: no page errors ({errors[:2]})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        run(browser, width)
    browser.close()

print(f"{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
